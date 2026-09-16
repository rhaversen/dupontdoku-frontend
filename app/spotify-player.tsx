"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Track = {
	id: string;
	name: string;
	artists: string[];
	albumImage: string | null;
	durationMs: number;
	spotifyUrl: string;
	previewUrl: string | null;
};

type WebPlaybackTrack = {
	name: string;
	artists: Array<{ name: string }>;
	album: { images: Array<{ url: string }> };
};

type WebPlaybackState = {
	track_window: { current_track: WebPlaybackTrack };
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
	addListener: {
		(event: "ready", cb: (state: { device_id: string }) => void): void;
		(event: "player_state_changed", cb: (state: WebPlaybackState) => void): void;
		(event: string, cb: (state: unknown) => void): void;
	};
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	seek: (ms: number) => Promise<void>;
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

const POPUP_POLL_MS = 500;

// event names for the desktop-window based auth flow
export const SPOTIFY_CONNECTED_EVENT = "dupontdoku:spotify-connected";
export const SPOTIFY_AUTH_OPEN_EVENT = "dupontdoku:spotify-auth-open";
export const SPOTIFY_AUTH_CLOSE_EVENT = "dupontdoku:spotify-auth-close";

// the OAuth callback page posts this payload when the flow completes
export interface SpotifyConnectedMessage {
	type: typeof SPOTIFY_CONNECTED_EVENT;
	displayName: string;
}

export function SpotifyPlayer() {
	const [tracks, setTracks] = useState<Track[] | null>(null);
	const [artistName, setArtistName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [current, setCurrent] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [time, setTime] = useState(0);
	// "premium": full playback via Web Playback SDK, "link": not connected
	const [playbackMode, setPlaybackMode] = useState<"loading" | "premium" | "link">("loading");
	const [deviceReady, setDeviceReady] = useState(false);
	const [needsLogin, setNeedsLogin] = useState(false);
	// true once the backend reports an OAuth token — the user completed login
	const [authed, setAuthed] = useState(false);
	// shown instead of the popup when the user is logged in but playback fails
	const [playbackBlocked, setPlaybackBlocked] = useState(false);
	const [popupOpen, setPopupOpen] = useState(false);
	// bump when the user returns from Spotify login so we retry token fetch
	const [loginAttempt, setLoginAttempt] = useState(0);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playerRef = useRef<SpotifyPlayer | null>(null);
	const deviceIdRef = useRef<string | null>(null);
	const tokenRef = useRef<string | null>(null);
	const popupRef = useRef<Window | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/spotify")
			.then((res) => res.json())
			.then((data: { tracks?: Track[]; artistName?: string; error?: string }) => {
				if (cancelled) return;
				if (data.error) setError(data.error);
				else {
					setTracks(data.tracks ?? []);
					setArtistName(data.artistName ?? "");
				}
			})
			.catch(() => !cancelled && setError("Failed to load Spotify catalog"));
		return () => {
			cancelled = true;
		};
	}, []);

	// listen for the "connected" message from the auth window (popup or desktop iframe)
	useEffect(() => {
		const onMessage = (e: MessageEvent) => {
			let payload: SpotifyConnectedMessage | null = null;
			try {
				payload = typeof e.data === "string" ? (JSON.parse(e.data) as SpotifyConnectedMessage) : (e.data as SpotifyConnectedMessage);
			} catch {
				return;
			}
			if (payload?.type === SPOTIFY_CONNECTED_EVENT) {
				setPopupOpen(false);
				setLoginAttempt((n) => n + 1);
			}
		};
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	// The playback-token endpoint returns a Premium user's OAuth token after
	// they log in via the backend's Spotify auth flow.
	useEffect(() => {
		let cancelled = false;
		const setupPlayer = async () => {
			try {
				setPlaybackMode("loading");
				setNeedsLogin(false);
				const res = await fetch("/api/spotify-auth/playback-token");
				// 204 = this browser has not connected its own Spotify account
				if (!res.ok || res.status === 204) {
					if (!cancelled) {
						setPlaybackMode("link");
						setNeedsLogin(true);
					}
					return;
				}
				const data = (await res.json()) as { token: string };
				if (cancelled) return;
				setAuthed(true);
				tokenRef.current = data.token;
				await loadPlaybackSdk();
				if (cancelled || !window.Spotify) return;
				const player = new window.Spotify.Player({
					name: "Dupontdoku XP",
					getOAuthToken: (cb) => {
						// refresh the token when the SDK asks for one
						fetch("/api/spotify-auth/playback-token")
							.then((r) => (r.ok ? r.json() : Promise.reject()))
							.then((d: { token: string }) => cb(d.token))
							.catch(() => {});
					},
					volume: 0.8,
				});
				playerRef.current = player;
				player.addListener("ready", ({ device_id }) => {
					deviceIdRef.current = device_id;
					setDeviceReady(true);
					setPlaybackMode("premium");
				});
				player.addListener("player_state_changed", (state) => {
					if (!state) return;
					setPlaying(!state.paused);
					setTime(state.position / 1000);
				});
				player.addListener("initialization_error", () => {
					setPlaybackMode("link");
					if (authed) setPlaybackBlocked(true);
				});
				player.addListener("authentication_error", () => {
					setPlaybackMode("link");
					setNeedsLogin(true);
				});
				player.addListener("account_error", () => {
					// account lacks Spotify Premium — login was fine, playback is not
					setPlaybackMode("link");
					setPlaybackBlocked(true);
				});
				await player.connect();
			} catch {
				if (!cancelled) setPlaybackMode("link");
			}
		};
		void setupPlayer();
		return () => {
			cancelled = true;
			playerRef.current?.pause().catch(() => {});
			audioRef.current?.pause();
		};
	}, [loginAttempt]);

	const openAuthPopup = useCallback(() => {
		// ask the desktop to open the auth window instead of a browser popup;
		// page.tsx listens for this and opens "Connect Spotify - Internet Explorer"
		window.dispatchEvent(new MessageEvent(SPOTIFY_AUTH_OPEN_EVENT));
	}, []);

	const track = tracks?.[current];
	const canPlayFull = playbackMode === "premium" && deviceReady;
	const canPreview = Boolean(track?.previewUrl);
	// ticking counter for the equalizer animation — updates only while playing
	const [tick, setTick] = useState(0);
	// true while the user is dragging the progress slider
	const [scrubbing, setScrubbing] = useState(false);
	const [scrubValue, setScrubValue] = useState(0);

	useEffect(() => {
		if (!playing) return;
		const id = setInterval(() => setTick((t) => t + 1), 120);
		return () => clearInterval(id);
	}, [playing]);

	// progress: position advances locally; the SDK events / audio element re-sync
	const activeDurationSec =
		playbackMode === "premium" ? (track?.durationMs ?? 0) / 1000 : track?.previewUrl ? 30 : (track?.durationMs ?? 0) / 1000;

	useEffect(() => {
		if (!playing || scrubbing) return;
		const step = playbackMode === "premium" ? 0.25 : 1 / 60;
		const id = setInterval(() => {
			setTime((t) => {
				if (playbackMode === "premium" && track && t + step > track.durationMs / 1000) {
					// the next player_state_changed event (track end) takes over
					return t;
				}
				if (playbackMode !== "premium" && t + step >= 30) {
					setPlaying(false);
					return 0;
				}
				return t + step;
			});
		}, playbackMode === "premium" ? 250 : 1000 / 60);
		return () => clearInterval(id);
	}, [playing, playbackMode, scrubbing, track]);

	const playBackendPreview = useCallback((t: Track, atSeconds = 0) => {
		audioRef.current?.pause();
		const audio = new Audio(t.previewUrl!);
		audioRef.current = audio;
		audio.currentTime = atSeconds;
		setPlaying(true);
		audio.play().catch(() => setPlaying(false));
		audio.onended = () => setPlaying(false);
	}, []);

	const playFullTrack = useCallback(async (t: Track): Promise<boolean> => {
		const deviceId = deviceIdRef.current;
		const token = tokenRef.current;
		if (!deviceId || !token) return false;

		const doPlay = () =>
			fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ uris: [`spotify:track:${t.id}`] }),
			});

		let res = await doPlay();
		if (res.status === 404) {
			// device registration lags behind the ready event — retry once
			await new Promise((r) => setTimeout(r, 700));
			res = await doPlay();
			if (!res.ok) return false;
		} else if (!res.ok && res.status !== 404) {
			return false;
		}

		// Spotify can return 204 yet keep playing the old track (device went
		// inactive, or the request raced the previous one). Verify that the
		// current track actually changed; if not, wake the device and retry.
		const verify = async (): Promise<boolean> => {
			const state = await fetch("https://api.spotify.com/v1/me/player?market=DK", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!state.ok || state.status === 204) return false;
			const s = (await state.json()) as { item?: { id?: string } };
			return s.item?.id === t.id;
		};

		await new Promise((r) => setTimeout(r, 400));
		if (!(await verify())) {
			// wake/transfer playback to our device explicitly, then replay
			await fetch("https://api.spotify.com/v1/me/player", {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ device_ids: [deviceId], play: false }),
			});
			await new Promise((r) => setTimeout(r, 300));
			res = await doPlay();
			if (!res.ok) return false;
			await new Promise((r) => setTimeout(r, 400));
			if (!(await verify())) return false;
		}

		setPlaying(true);
		setTime(0);
		return true;
	}, []);

	async function play(index: number) {
		const t = tracks?.[index];
		if (!t) return;
		setCurrent(index);
		setTime(0);
		if (canPlayFull) {
			const ok = await playFullTrack(t);
			if (ok) return;
			// play request failed even after retry — fall through to preview
		}
		if (t.previewUrl) {
			playBackendPreview(t);
			return;
		}
		if (authed) {
			// logged in but the SDK can't play (e.g. no Premium) — explain
			// instead of re-opening the login popup every click
			setPlaybackBlocked(true);
			return;
		}
		// not logged in — open the login popup
		openAuthPopup();
	}

	async function togglePlay() {
		if (playbackMode === "premium") {
			if (playing) {
				await playerRef.current!.pause();
				setPlaying(false);
			} else {
				await playerRef.current!.resume();
				setPlaying(true);
			}
			return;
		}
		const audio = audioRef.current;
		if (audio) {
			if (playing) {
				audio.pause();
				setPlaying(false);
			} else {
				await audio.play();
				setPlaying(true);
			}
		} else if (track) {
			await play(current);
		}
	}

	function seekTo(seconds: number) {
		setTime(seconds);
		if (playbackMode === "premium") {
			void playerRef.current?.seek(Math.round(seconds * 1000)).catch(() => {});
		} else if (audioRef.current && track?.previewUrl) {
			audioRef.current.currentTime = seconds;
		}
	}

	async function stop() {
		await playerRef.current?.pause().catch(() => {});
		audioRef.current?.pause();
		setPlaying(false);
		setTime(0);
	}

	function skip(delta: number) {
		const next = Math.min(Math.max(current + delta, 0), (tracks?.length ?? 1) - 1);
		if (next !== current) play(next);
		else stop();
	}

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

	const modeLabel =
		playbackMode === "premium"
			? deviceReady
				? "full playback — connected"
				: "connecting player..."
			: canPreview
				? "30s previews"
				: "connect Spotify to play";

	return (
		<div>
			<div className="flex items-center gap-3">
				{track?.albumImage && (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={track.albumImage}
						alt={track.name}
						className="xp-inset h-16 w-16 rounded-sm object-cover"
					/>
				)}
				<div className="min-w-0 flex-1">
					<div className="truncate text-[12px] font-bold">{track?.name}</div>
					<div className="truncate text-[11px] opacity-70">{track?.artists.join(", ")}</div>
					<div className="truncate text-[10px] opacity-50">{modeLabel}</div>
				</div>
			</div>
			<div className="mt-2 flex items-center gap-2">
				<button className="xp-btn px-2 text-[12px]" onClick={() => skip(-1)} aria-label="Previous track" disabled={current === 0}>
					⏮
				</button>
				<button className="xp-btn px-3 text-[12px]" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
					{playing ? "⏸" : "▶"}
				</button>
				<button className="xp-btn px-2 text-[12px]" onClick={stop} aria-label="Stop">
					⏹
				</button>
				<button className="xp-btn px-2 text-[12px]" onClick={() => skip(1)} aria-label="Next track" disabled={current >= tracks.length - 1}>
					⏭
				</button>
				<div className="h-5 w-16 rounded-sm border border-[#7f9db9] bg-white p-0.5">
					<div className="flex h-full gap-0.5">
						{Array.from({ length: 10 }).map((_, i) => {
							const level = playing
								? (Math.sin(tick * 0.35 + i * 0.9) * 0.5 + 0.5) * 11 + 4
								: 13;
							return (
								<div
									key={i}
									className={`w-1 ${i < Math.min(15, level) ? "bg-[#3772d6]" : "bg-[#c8d8f0]"}`}
								/>
							);
						})}
					</div>
				</div>
			</div>
			<div className="mt-1.5 flex items-center gap-2">
				<span className="w-8 text-right text-[10px] tabular-nums opacity-60">
					{formatTime(scrubbing ? scrubValue : time)}
				</span>
				<input
					type="range"
					min={0}
					max={Math.max(1, activeDurationSec)}
					step={0.1}
					value={scrubbing ? scrubValue : Math.min(time, activeDurationSec)}
					onPointerDown={() => {
						setScrubbing(true);
						setScrubValue(time);
					}}
					onChange={(e) => setScrubValue(Number(e.target.value))}
					onPointerUp={(e) => {
						seekTo(Number((e.target as HTMLInputElement).value));
						setScrubbing(false);
					}}
					onKeyUp={(e) => {
						seekTo(Number((e.target as HTMLInputElement).value));
					}}
					className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white accent-[#3772d6]"
					style={{ border: "1px solid #7f9db9" }}
					aria-label="Seek"
				/>
				<span className="w-8 text-[10px] tabular-nums opacity-60">
					{formatTime(activeDurationSec)}
				</span>
			</div>
			{playbackBlocked && playbackMode === "link" && (
				<div className="mt-2 rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
					<div className="font-bold">Spotify playback unavailable</div>
					<div className="mt-0.5">
						Your account is connected, but full-track playback requires Spotify Premium.
						Use the Connect Spotify button in the Start menu to listen in the Spotify app.
					</div>
				</div>
			)}
			{needsLogin && playbackMode === "link" && (
				<div className="mt-2 rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
					<div className="font-bold">Play the full tracks right here</div>
					<div className="mt-0.5">
						Connect your own Spotify account (Premium required for full playback).
						Each visitor uses their own account — nobody shares tokens.
					</div>
					<button className="xp-btn mt-1.5 px-3" onClick={openAuthPopup} disabled={popupOpen}>
						{popupOpen ? "Waiting for login…" : "Connect Spotify"}
					</button>
					<button
						className="xp-btn mt-1.5 ml-1 px-3"
						onClick={() => setLoginAttempt((n) => n + 1)}
					>
						I&apos;ve connected — retry
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
							onClick={() => (isCurrent && playing ? togglePlay() : play(i))}
						>
							<span className="w-4 text-center opacity-90">
								{isCurrent && playing ? "⏸" : "▶"}
							</span>
							<span className="flex-1 truncate">
								{t.name}
								{isCurrent && playing && <span className="ml-1 opacity-70">(playing)</span>}
							</span>
							<span className={`text-[10px] ${isCurrent ? "" : "opacity-60"}`}>
								{formatTime(t.durationMs / 1000)}
							</span>
						</button>
					);
				})}
			</div>
			<div className="mt-2 flex items-center justify-between rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
				<span>
					{tracks.length} tracks{artistName ? ` from ${artistName}` : ""}
				</span>
				{authed && (
					<button
						className="text-[#0000cc] underline"
						onClick={async () => {
							await fetch("/api/spotify-auth/disconnect", { method: "POST" });
							setLoginAttempt((n) => n + 1);
						}}
					>
						Disconnect Spotify
					</button>
				)}
			</div>
		</div>
	);
}
