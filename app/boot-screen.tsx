"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureRun, loadProgress, saveProgress, signMessage, type RunState } from "./lib/gameCrypto";

// the boot screen IS the game: challenge dialogs spawn at server-given
// positions while the user watches the "install" progress. Progress is
// persisted so refreshes resume with an accurate time estimate.
const POLL_MS = 1000;

type Challenge = { seq: number; targetX: number; targetY: number };

export function BootScreen({ onComplete }: { onComplete: (code: string) => void }) {
	const [phase, setPhase] = useState<"starting" | "waiting" | "challenge" | "minted" | "error">("starting");
	const [progress, setProgress] = useState(loadProgress());
	const [challenge, setChallenge] = useState<Challenge | null>(null);
	const [nextRevealAt, setNextRevealAt] = useState<number | null>(null);
	const [error, setError] = useState("");
	const [respondError, setRespondError] = useState("");
	const privateKeyRef = useRef<CryptoKey | null>(null);
	const runRef = useRef<RunState | null>(null);
	const challengeRef = useRef<Challenge | null>(null);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const started = await ensureRun();
				if (!started) {
					// this browser is already on the guest list
					setPhase("minted");
					return;
				}
				runRef.current = started.run;
				privateKeyRef.current = started.privateKey;
				setProgress({ completed: started.run.completed, required: started.run.required, respondedSeqs: started.run.respondedSeqs, updatedAt: Date.now() });
				if (started.run.code) {
					setPhase("minted");
					onComplete(started.run.code);
					return;
				}
				if (!cancelled) setPhase("waiting");
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Boot failed");
					setPhase("error");
				}
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// 1 Hz poll — the server reveals challenges only inside their window
	useEffect(() => {
		if (phase !== "waiting" && phase !== "challenge") return;
		const id = setInterval(async () => {
			try {
				const fingerprint = runRef.current?.fingerprint ?? "";
				const state = (await fetch(`/api/game/state?fingerprint=${encodeURIComponent(fingerprint)}`, { credentials: "include" }).then((r) => r.json())) as {
					challenge: Challenge | null;
					nextRevealAt: number | null;
					run: { completed: number; required: number; code: string | null; respondedSeqs: number[] } | null;
				};
				setNextRevealAt(state.nextRevealAt);
				if (state.run?.code && runRef.current) {
					runRef.current.code = state.run.code;
					setPhase("minted");
					onComplete(state.run.code);
					return;
				}
				if (state.run) {
					const next = { completed: state.run.completed, required: state.run.required, respondedSeqs: state.run.respondedSeqs, updatedAt: Date.now() };
					setProgress(next);
					saveProgress(next);
				}
				if (state.challenge) {
					challengeRef.current = state.challenge;
					setChallenge(state.challenge);
					setPhase("challenge");
				} else {
					setChallenge(null);
					setPhase("waiting");
				}
			} catch {
				// transient network errors are fine, keep polling
			}
		}, POLL_MS);
		return () => clearInterval(id);
	}, [phase, onComplete]);

	const respond = useCallback(
		async (x: number, y: number) => {
			const challenge = challengeRef.current;
			const run = runRef.current;
			const privateKey = privateKeyRef.current;
			if (!challenge || !run || !privateKey) return;
			const message = `dupontdoku-game:${run.runId}:${challenge.seq}:${x}:${y}`;
			const signature = await signMessage(privateKey, message);
			const res = await fetch("/api/game/respond", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fingerprint: run.fingerprint, seq: challenge.seq, x, y, signature }),
				credentials: "include",
			});
			if (res.ok) {
				setRespondError("");
				const data = (await res.json()) as { completed: number; required?: number; code?: string };
				const next = {
					completed: data.completed,
					required: data.required ?? progress.required,
					respondedSeqs: [...progress.respondedSeqs, challenge.seq],
					updatedAt: Date.now(),
				};
				setProgress(next);
				saveProgress(next);
				if (data.code) {
					run.code = data.code;
					setPhase("minted");
					onComplete(data.code);
				} else {
					setChallenge(null);
					setPhase("waiting");
				}
			} else {
				// show WHY the click didn't count instead of silently discarding it
				const text = await res.text();
				setRespondError(`${res.status}: ${text}`);
				setChallenge(null);
				setPhase("waiting");
			}
		},
		[progress.respondedSeqs, progress.required, onComplete],
	);

	const remainingMs = Math.max(0, (progress.required ?? 10) - progress.completed) * 6 * 60 * 1000;
	const remainingLabel = formatRemaining(remainingMs);
	// clock countdown: the interval callback reads the clock and stores the
	// remaining time — setState is never called synchronously in the effect body
	// (the first update fires via timeout so the render stays pure)
	const [remainingMsToReveal, setRemainingMsToReveal] = useState<number | null>(null);
	useEffect(() => {
		if (phase !== "waiting" || !nextRevealAt) return;
		const update = () => setRemainingMsToReveal(Math.max(0, nextRevealAt - Date.now()));
		const timeout = setTimeout(update, 0);
		const id = setInterval(update, 1000);
		return () => {
			clearTimeout(timeout);
			clearInterval(id);
		};
	}, [phase, nextRevealAt]);

	if (phase === "error") {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center bg-black font-mono text-[#cccccc]">
				<p>Boot failed: {error}</p>
				<p className="mt-2 opacity-60">Reload to try again.</p>
			</div>
		);
	}

	if (phase === "minted") {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center bg-black font-mono text-[#cccccc]">
				<p>Update complete. Rebooting…</p>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full overflow-hidden bg-black font-mono text-[#cccccc]">
			<div className="absolute top-1/2 left-1/2 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#555] bg-[#0b0b0b]/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-sm">
				<p className="mb-2 text-[13px]">
					{phase === "challenge" ? "Update ready to install…" : "Installing updates…"}
				</p>
				<div className="h-3 w-full border border-[#555] bg-[#111]">
					<div
						// grayscale bar: filled = light, empty = near-black
						className="h-full bg-[#cccccc] transition-all duration-500"
						style={{ width: `${Math.min(100, (progress.completed / (progress.required ?? 10)) * 100)}%` }}
					/>
				</div>
				<p className="mt-2 text-[11px] opacity-70">
					{progress.completed}/{progress.required ?? 10} — estimated time remaining: {remainingLabel}
				</p>
				{/* fixed-height status slots so the panel never re-centers mid-game
				    (a layout shift would move the dialog after the server sent its
				    position, desyncing the click coordinates) */}
				<p className="mt-1 h-4 text-[10px] opacity-50">
					{remainingMsToReveal !== null && <>{`Next update in ${formatRemaining(remainingMsToReveal)}`}</>}
				</p>
				<p className="h-4 text-[10px] text-[#ff8080]">
					{respondError && <>Click rejected: {respondError}</>}
				</p>
			</div>
			{phase === "challenge" && challenge && (
				<ChallengeDialog challenge={challenge} onRespond={respond} />
			)}
		</div>
	);
}

function ChallengeDialog({
	challenge,
	onRespond,
}: {
	challenge: Challenge;
	onRespond: (x: number, y: number) => void | Promise<void>;
}) {
	// server gives 0..1 viewport coords — map to pixels, clamp so the box stays visible
	const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
	const vh = typeof window !== "undefined" ? window.innerHeight : 768;
	const width = 220;
	const height = 110;
	const left = Math.min(Math.max(challenge.targetX * vw - width / 2, 4), vw - width - 4);
	const top = Math.min(Math.max(challenge.targetY * vh - height / 2, 4), vh - height - 4);

	return (
		<div
			className="border border-accent-border bg-chrome rounded-md shadow-[0_14px_40px_rgba(0,0,0,0.35)] absolute w-55"
			style={{ left, top }}
			onClick={(e) => {
				// the server compares against viewport-space coords, so the click
				// must be mapped relative to the whole window, not the dialog
				void onRespond(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
			}}
		>
				<div className="flex items-center gap-1 rounded-md bg-chrome-deep px-1.5 py-1 font-bold text-ink">
					<span className="flex-1">System Update</span>
					<button className="grid h-4 w-5 place-items-center rounded border border-accent-border bg-accent-soft/70 text-[10px] font-bold leading-none text-ink hover:bg-accent hover:border-accent hover:text-white" aria-label="Close">
					<span className="text-[13px] leading-none">✕</span>
				</button>
			</div>
			<div className="p-3 text-[11px]">
				<p className="mb-1">Click OK to install this update.</p>
				<button
					className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] font-bold mt-2 px-4 hover:bg-accent-soft active:translate-y-px"
					onClick={(e) => {
						e.stopPropagation();
						void onRespond(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
					}}
				>
					OK
				</button>
			</div>
		</div>
	);
}

function formatRemaining(ms: number): string {
	if (ms <= 0) return "any moment";
	const totalMin = Math.ceil(ms / 60000);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}
