"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Track = {
	id: string;
	name: string;
	artists: string[];
	albumImage: string | null;
	durationMs: number;
	spotifyUrl: string;
};

type WebPlaybackState = {
	track_window: { current_track: { uri: string; id: string | null } };
	paused: boolean;
	position: number;
	duration: number;
};

declare global {
	interface Window {
		Spotify?: {
			Player: new (opts: {
				name: string;
				getOAuthToken: (cb: (token: string) => void) => void;
				volume?: number;
			}) => SpotifyPlayer;
		};
		onSpotifyWebPlaybackSDKReady?: () => void;
	}
}

type SpotifyPlayer = {
	connect: () => Promise<boolean>;
	disconnect: () => void;
	addListener: {
		(event: "ready", cb: (state: { device_id: string }) => void): void;
		(event: "not_ready", cb: (state: { device_id: string }) => void): void;
		(event: "player_state_changed", cb: (state: WebPlaybackState | null) => void): void;
		(event: string, cb: (state: unknown) => void): void;
	};
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	togglePlay: () => Promise<void>;
	seek: (ms: number) => Promise<void>;
	setVolume: (v: number) => Promise<void>;
	getCurrentState: () => Promise<WebPlaybackState | null>;
};

function loadPlaybackSdk(): Promise<void> {
	return new Promise((resolve) => {
		if (window.Spotify) return resolve();
		const prev = window.onSpotifyWebPlaybackSDKReady;
		window.onSpotifyWebPlaybackSDKReady = () => {
			prev?.();
			resolve();
		};
		if (!document.getElementById("spotify-sdk")) {
			const script = document.createElement("script");
			script.id = "spotify-sdk";
			script.src = "https://sdk.scdn.co/spotify-player.js";
			document.head.appendChild(script);
		}
	});
}

function formatTime(seconds: number) {
	const s = Math.max(0, Math.floor(seconds));
	const m = Math.floor(s / 60);
	return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// event names for the desktop-window based auth flow: the player asks the
// desktop to open the auth window, and the auth window announces the result
export const SPOTIFY_CONNECTED_EVENT = "dupontdoku:spotify-connected";
export const SPOTIFY_AUTH_FAILED_EVENT = "dupontdoku:spotify-auth-failed";
export const SPOTIFY_AUTH_OPEN_EVENT = "dupontdoku:spotify-auth-open";
export const SPOTIFY_AUTH_CLOSE_EVENT = "dupontdoku:spotify-auth-close";

// one deterministic state machine drives everything:
//   idle      — no token; visitor hasn't connected their account
//   loading   — fetching token / spinning up the SDK player
//   ready     — device registered with Spotify, playback possible
//   authNeeded — login required or the account lacks Premium
type Phase = "idle" | "loading" | "ready" | "authNeeded";

async function isConnected(): Promise<boolean> {
	try {
		const res = await fetch("/api/spotify-auth/status");
		return ((await res.json()) as { connected: boolean }).connected;
	} catch {
		return false;
	}
}

// Spotify's /authorize answers with an instant redirect back to our callback
// when the visitor already granted the app — that roundtrip runs hidden in an
// iframe on our own origin. Spotify's login page itself is frame-blocked
// (x-frame-options: deny), so when interaction is needed nothing loads and
// this times out; the caller then shows the visible auth window instead.
function silentSpotifyAuth(timeoutMs = 3000): Promise<boolean> {
	return new Promise((resolve) => {
		const iframe = document.createElement("iframe");
		iframe.style.display = "none";
		let done = false;
		const finish = (result: boolean) => {
			if (done) return;
			done = true;
			window.removeEventListener("message", onMessage);
			iframe.remove();
			resolve(result);
		};
		const onMessage = (e: MessageEvent) => {
			let payload: { type?: string } | null = null;
			try {
				payload =
					typeof e.data === "string"
						? (JSON.parse(e.data) as { type?: string })
						: (e.data as { type?: string });
			} catch {
				return;
			}
			if (payload?.type === SPOTIFY_CONNECTED_EVENT) finish(true);
			if (payload?.type === SPOTIFY_AUTH_FAILED_EVENT) finish(false);
		};
		window.addEventListener("message", onMessage);
		iframe.src = "/api/spotify-auth/auth";
		document.body.appendChild(iframe);
		setTimeout(() => finish(false), timeoutMs);
	});
}

export function SpotifyPlayer() {
	const [tracks, setTracks] = useState<Track[] | null>(null);
	const [artistName, setArtistName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [current, setCurrent] = useState(0);
	const [phase, setPhase] = useState<Phase>("idle");
	const [playing, setPlaying] = useState(false);
	// position/duration come from the SDK state, interpolated between events
	const [positionMs, setPositionMs] = useState(0);
	const [durationMs, setDurationMs] = useState(0);
	const [volume, setVolume] = useState(0.8);

	const playerRef = useRef<SpotifyPlayer | null>(null);
	const deviceIdRef = useRef<string | null>(null);
	// bumped when the user (dis)connects so the player setup re-runs
	const [session, setSession] = useState(0);
	const connectRef = useRef(false);
	// true while the user drags the seek slider; pauses interpolation
	const scrubbingRef = useRef(false);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/spotify")
			.then((res) => res.json())
			.then((data: { tracks?: Track[]; artistName?: string; error?: string }) => {
				if (cancelled) return;
				if (data.error) setError(data.error);
				else {
					setTracks((data.tracks ?? []).map((t) => ({ ...t, previewUrl: undefined })) as Track[]);
					setArtistName(data.artistName ?? "");
				}
			})
			.catch(() => {
				if (!cancelled) setError("Failed to load Spotify catalog");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// the auth window fires this once the OAuth callback completes; re-run the
	// player setup — if this browser is now connected we get a token
	useEffect(() => {
		const onConnected = () => setSession((n) => n + 1);
		window.addEventListener(SPOTIFY_CONNECTED_EVENT, onConnected);
		return () => window.removeEventListener(SPOTIFY_CONNECTED_EVENT, onConnected);
	}, []);

	// single effect owning the SDK lifecycle, keyed on `session`
	useEffect(() => {
		let cancelled = false;
		let player: SpotifyPlayer | null = null;

		const setup = async () => {
			setPhase("loading");
			const res = await fetch("/api/spotify-auth/playback-token");
			if (res.status === 204 || !res.ok) {
				if (!cancelled) setPhase("idle");
				return;
			}
			const { token } = (await res.json()) as { token: string };
			if (cancelled) return;

			await loadPlaybackSdk();
			if (cancelled || !window.Spotify) return;

			player = new window.Spotify.Player({
				name: "Dupontdoku XP",
				getOAuthToken: (cb) => {
					fetch("/api/spotify-auth/playback-token")
						.then((r) => (r.ok ? r.json() : Promise.reject(new Error("no token"))))
						.then((d: { token: string }) => cb(d.token))
						.catch(() => {});
				},
				volume,
			});
			playerRef.current = player;

			player.addListener("ready", ({ device_id }) => {
				if (cancelled) return;
				deviceIdRef.current = device_id;
				setPhase("ready");
			});
			player.addListener("not_ready", () => {
				if (!cancelled) setPhase("loading");
			});
			player.addListener("player_state_changed", (state) => {
				if (cancelled) return;
				if (!state) {
					// null state = playback moved off this device
					setPlaying(false);
					return;
				}
				setPlaying(!state.paused);
				if (!scrubbingRef.current) {
					setPositionMs(state.position);
					setDurationMs(state.duration);
				}
				const uri = state.track_window.current_track.id;
				if (uri) {
					const idx = (tracks ?? []).findIndex((t) => t.id === uri);
					if (idx >= 0) setCurrent(idx);
				}
			});
			player.addListener("initialization_error", () => {
				if (!cancelled) setPhase("authNeeded");
			});
			player.addListener("authentication_error", () => {
				if (!cancelled) setPhase("authNeeded");
			});
			player.addListener("account_error", () => {
				// login fine but no Premium — full playback impossible here
				if (!cancelled) setPhase("authNeeded");
			});

			await player.connect();
			// connect() resolves before `ready`; a late-cancelled player must
			// not linger, so disconnect on unmount
		};

		void setup().catch(() => {
			if (!cancelled) setPhase("idle");
		});

		return () => {
			cancelled = true;
			player?.pause().catch(() => {});
			playerRef.current?.disconnect();
			playerRef.current = null;
			deviceIdRef.current = null;
			setPlaying(false);
			setPositionMs(0);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session]);

	// interpolate position between SDK state events while playing
	useEffect(() => {
		if (!playing || scrubbingRef.current) return;
		const id = setInterval(() => {
			setPositionMs((p) => Math.min(p + 250, durationMs));
		}, 250);
		return () => clearInterval(id);
	}, [playing, durationMs]);

	// connect flow, fully invisible when possible: status check, then a hidden
	// iframe OAuth roundtrip; the auth window only appears if Spotify actually
	// needs the user to click through its login page
	const connectSpotify = useCallback(async () => {
		if (connectRef.current) return;
		connectRef.current = true;
		try {
			if (await isConnected()) {
				setSession((n) => n + 1);
				return;
			}
			if (await silentSpotifyAuth()) {
				setSession((n) => n + 1);
				return;
			}
			window.dispatchEvent(new Event(SPOTIFY_AUTH_OPEN_EVENT));
		} finally {
			connectRef.current = false;
		}
	}, []);

	const playTrack = useCallback(
		async (index: number) => {
			const t = tracks?.[index];
			const deviceId = deviceIdRef.current;
			const player = playerRef.current;
			if (!t || !player || !deviceId) return;
			setCurrent(index);
			setPositionMs(0);
			setDurationMs(t.durationMs);

			const token = await new Promise<string | null>((resolve) => {
				const res = fetch("/api/spotify-auth/playback-token")
					.then((r) => (r.ok ? r.json() : Promise.resolve(null)))
					.then((d: { token: string } | null) => d?.token ?? null)
					.catch(() => null);
				resolve(res);
			});
			if (!token) {
				setPhase("authNeeded");
				return;
			}

			const doPlay = () =>
				fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
					method: "PUT",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ uris: [`spotify:track:${t.id}`] }),
				});

			let res = await doPlay();
			if (res.status === 404) {
				// device registration can lag behind the ready event — retry once
				await new Promise((r) => setTimeout(r, 700));
				res = await doPlay();
			}
			if (!res.ok) setPhase("authNeeded");
		},
		[tracks],
	);

	const togglePlay = useCallback(async () => {
		const player = playerRef.current;
		if (!player) {
			if (phase === "idle") void connectSpotify();
			return;
		}
		const state = await player.getCurrentState();
		if (!state) {
			// SDK connected but nothing queued yet — start the current track
			await playTrack(current);
			return;
		}
		await player.togglePlay();
	}, [phase, current, playTrack, connectSpotify]);

	const stop = useCallback(async () => {
		await playerRef.current?.pause().catch(() => {});
		setPlaying(false);
		setPositionMs(0);
	}, []);

	const skip = useCallback(
		(delta: number) => {
			if (!tracks) return;
			const next = Math.min(Math.max(current + delta, 0), tracks.length - 1);
			if (next === current) return;
			if (playing && phase === "ready") {
				void playTrack(next);
			} else {
				setCurrent(next);
				setPositionMs(0);
			}
		},
		[current, tracks, playing, phase, playTrack],
	);

	const seekTo = useCallback((seconds: number) => {
		setPositionMs(seconds * 1000);
		void playerRef.current?.seek(Math.round(seconds * 1000)).catch(() => {});
	}, []);

	// keep volume in sync with the SDK player
	useEffect(() => {
		void playerRef.current?.setVolume(volume).catch(() => {});
	}, [volume]);

	if (error) {
		return (
			<div className="xp-inset h-48 overflow-auto rounded-sm p-3 text-[11px]">
				<p className="mb-2 font-bold">Unable to load Spotify catalog:</p>
				<p>{error}</p>
				<p className="mt-2 opacity-70">
					Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in dupontdoku-backend/.env
					(Client Credentials flow) and SPOTIFY_ARTIST_NAME if it differs from
					&quot;Dupont&quot;.
				</p>
			</div>
		);
	}

	if (!tracks) {
		return <div className="xp-inset h-64 rounded-sm p-3 text-[11px]">Loading Spotify catalog...</div>;
	}

	if (tracks.length === 0) {
		return (
			<div className="xp-inset rounded-sm p-3 text-[11px]">
				No Spotify tracks found for artist &quot;{artistName || "Dupont"}&quot;.
			</div>
		);
	}

	const track = tracks[current];
	const statusLabel =
		phase === "ready"
			? "full playback — connected"
			: phase === "loading"
				? "connecting player..."
				: phase === "authNeeded"
					? "connect a Premium account to play"
					: "connect Spotify to play";

	return (
		<div>
			<div className="flex items-center gap-3">
				{track.albumImage && (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={track.albumImage} alt={track.name} className="xp-inset h-16 w-16 rounded-sm object-cover" />
				)}
				<div className="min-w-0 flex-1">
					<div className="truncate text-[12px] font-bold">{track.name}</div>
					<div className="truncate text-[11px] opacity-70">{track.artists.join(", ")}</div>
					<div className="truncate text-[10px] opacity-50">{statusLabel}</div>
				</div>
			</div>
			<div className="mt-2 flex items-center gap-2">
				<button className="xp-btn px-2 text-[12px]" onClick={() => skip(-1)} aria-label="Previous track" disabled={current === 0}>
					⏮
				</button>
				<button className="xp-btn px-3 text-[12px]" onClick={() => void togglePlay()} aria-label={playing ? "Pause" : "Play"}>
					{playing ? "⏸" : "▶"}
				</button>
				<button className="xp-btn px-2 text-[12px]" onClick={() => void stop()} aria-label="Stop">
					⏹
				</button>
				<button className="xp-btn px-2 text-[12px]" onClick={() => skip(1)} aria-label="Next track" disabled={current >= tracks.length - 1}>
					⏭
				</button>
				<label className="ml-1 flex items-center gap-1 text-[10px] opacity-70" title="Volume">
					🔊
					<input
						type="range"
						min={0}
						max={1}
						step={0.05}
						value={volume}
						onChange={(e) => setVolume(Number(e.target.value))}
						className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-white accent-[#3772d6]"
						style={{ border: "1px solid #7f9db9" }}
						aria-label="Volume"
					/>
				</label>
			</div>
			<div className="mt-1.5 flex items-center gap-2">
				<span className="w-8 text-right text-[10px] tabular-nums opacity-60">{formatTime(positionMs / 1000)}</span>
				<input
					type="range"
					min={0}
					max={Math.max(1, durationMs / 1000)}
					step={0.1}
					value={Math.min(positionMs / 1000, durationMs / 1000)}
					onPointerDown={() => {
						scrubbingRef.current = true;
					}}
					onChange={(e) => setPositionMs(Number(e.target.value) * 1000)}
					onPointerUp={(e) => {
						seekTo(Number((e.target as HTMLInputElement).value));
						scrubbingRef.current = false;
					}}
					onKeyUp={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
					className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white accent-[#3772d6]"
					style={{ border: "1px solid #7f9db9" }}
					aria-label="Seek"
				/>
				<span className="w-8 text-[10px] tabular-nums opacity-60">{formatTime(durationMs / 1000)}</span>
			</div>
			{(phase === "idle" || phase === "authNeeded") && (
				<div className="mt-2 rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
					<div className="font-bold">Play the full tracks right here</div>
					<div className="mt-0.5">
						Connect your own Spotify account (Premium required for full playback).
						Each visitor uses their own account — nobody shares tokens.
					</div>
					<button className="xp-btn mt-1.5 px-3" onClick={() => void connectSpotify()}>
						Connect Spotify
					</button>
				</div>
			)}
			<div className="mt-2 flex flex-col gap-0.5">
				{tracks.map((t, i) => {
					const isCurrent = i === current;
					return (
						<button
							key={t.id + i}
							className={`flex items-center gap-2 rounded px-2 py-1 text-left text-[11px] ${
								isCurrent ? "bg-[#316ac5] text-white" : "hover:bg-[#316ac5] hover:text-white"
							}`}
							onClick={() => (isCurrent && playing ? void togglePlay() : void playTrack(i))}
						>
							<span className="w-4 text-center opacity-90">{isCurrent && playing ? "⏸" : "▶"}</span>
							<span className="flex-1 truncate">
								{t.name}
								{isCurrent && playing && <span className="ml-1 opacity-70">(playing)</span>}
							</span>
							<span className={`text-[10px] ${isCurrent ? "" : "opacity-60"}`}>{formatTime(t.durationMs / 1000)}</span>
						</button>
					);
				})}
			</div>
			<div className="mt-2 flex items-center justify-between rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
				<span>
					{tracks.length} tracks{artistName ? ` from ${artistName}` : ""}
				</span>
				{phase !== "idle" && (
					<button
						className="text-[#0000cc] underline"
						onClick={async () => {
							playerRef.current?.disconnect();
							playerRef.current = null;
							await fetch("/api/spotify-auth/disconnect", { method: "POST" });
							setPhase("idle");
							setPlaying(false);
							setPositionMs(0);
						}}
					>
						Disconnect Spotify
					</button>
				)}
			</div>
		</div>
	);
}
