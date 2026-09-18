"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { signMessage, ensureRun } from "./lib/gameCrypto";
import { api, type Guest } from "./lib/api";

// guest-list flow used inside the desktop Guest List window: redeem the boot
// code, then register name/email. The signing key lives in this browser's
// IndexedDB, so only the winning browser can confirm.
export function GuestlistPanel({ code, onDone }: { code?: string; onDone?: () => void }) {
	const [guests, setGuests] = useState<Guest[] | null>(null);
	const [me, setMe] = useState<{ name: string; durationMs: number } | null>(null);
	const [done, setDone] = useState(false);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [nonce, setNonce] = useState<string | null>(null);

	const loadGuests = useCallback(() => {
		api.gameGuests()
			.then(setGuests)
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
		api.gameMe()
			.then((res) => setMe(res.guest))
			.catch(() => setMe(null));
	}, []);

	useEffect(() => {
		loadGuests();
	}, [loadGuests]);

	const redeem = useCallback(async () => {
		setError("");
		setBusy(true);
		try {
			const res = await fetch("/api/game/redeem", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code }),
				credentials: "include",
			});
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { nonce: string };
			setNonce(data.nonce);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Redeem failed");
		} finally {
			setBusy(false);
		}
	}, [code]);

	const confirm = useCallback(
		async (e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!nonce) return;
			setError("");
			setBusy(true);
			try {
				const form = new FormData(e.currentTarget);
				const name = String(form.get("name") ?? "");
				const email = String(form.get("email") ?? "");
				const signature = await signMessageKey(`dupontdoku-redeem:${nonce}`);
				const res = await fetch("/api/game/confirm", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ code, nonce, name, email, signature }),
					credentials: "include",
				});
				if (!res.ok) throw new Error(await res.text());
				setDone(true);
				loadGuests();
				onDone?.();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Confirm failed");
			} finally {
				setBusy(false);
			}
		},
		[code, nonce, loadGuests, onDone],
	);

	if (me || done) {
		return (
			<div className="flex h-full flex-col text-[12px]">
				<div className="mb-2 rounded bg-[#e6e3d3] p-1.5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
					<p className="font-bold">You&apos;re on the list — see you at the show.</p>
					{me && <p className="text-[11px]">Challenge completed in {formatDuration(me.durationMs)}.</p>}
				</div>
				<GuestTable guests={guests} />
			</div>
		);
	}

	return (
		<div className="text-[12px]">
			{!nonce ? (
				<>
					{code ? (
						<>
							<p className="mb-2">
								Your boot completion code: <span className="font-mono font-bold">{code}</span>
							</p>
							<button className="xp-btn px-4" disabled={busy} onClick={() => void redeem()}>
								{busy ? "…" : "Claim guest spot"}
							</button>
						</>
					) : (
						<p className="opacity-80">Welcome back.</p>
					)}
				</>
			) : (
				<form className="flex flex-col gap-2" onSubmit={(e) => void confirm(e)}>
					<input name="name" required placeholder="Your name" className="xp-inset rounded-sm px-1 py-0.5" />
					<input name="email" required type="email" placeholder="Your email" className="xp-inset rounded-sm px-1 py-0.5" />
					<button type="submit" className="xp-btn px-4" disabled={busy}>
						{busy ? "…" : "Add me to the guest list"}
					</button>
				</form>
			)}
			{error && <p className="mt-2 text-red-700">{error}</p>}
			<GuestTable guests={guests} />
		</div>
	);
}

function GuestTable({ guests }: { guests: Guest[] | null }) {
	if (!guests || guests.length === 0) return null;
	return (
		<div className="mt-3">
			<p className="mb-1 font-bold">Current guests</p>
			<table className="w-full border-collapse text-left text-[11px]">
				<tbody>
					{guests.map((g) => (
						<tr key={g.id}>
							<td className="border border-[#d5d2c8] px-2 py-0.5">{g.name}</td>
							<td className="border border-[#d5d2c8] px-2 py-0.5 opacity-70">
								completed in {formatDuration(g.durationMs)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function formatDuration(ms: number): string {
	const totalMin = Math.round(ms / 60000);
	if (totalMin < 60) return `${totalMin}m`;
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	if (h < 24) return `${h}h ${m}m`;
	const days = Math.floor(h / 24);
	return `${days}d ${h % 24}h`;
}

async function signMessageKey(message: string): Promise<string> {
	const started = await ensureRun();
	if (!started) throw new Error("No signing key");
	return signMessage(started.privateKey, message);
}
