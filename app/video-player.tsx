"use client";

import { useEffect, useRef, useState } from "react";

export type Video = {
	id: string;
	title: string;
	subtitle: string;
};

type YTPlayer = {
	playVideo: () => void;
	pauseVideo: () => void;
	seekTo: (seconds: number, allowSeekAhead: boolean) => void;
	getCurrentTime: () => number;
	getDuration: () => number;
	getPlayerState: () => number;
	loadVideoById: (id: string) => void;
	destroy: () => void;
};

declare global {
	interface Window {
		YT?: {
			Player: new (
				el: HTMLElement,
				opts: {
					videoId: string;
					playerVars?: Record<string, string | number>;
					events?: {
						onReady?: () => void;
						onStateChange?: (e: { data: number }) => void;
					};
				},
			) => YTPlayer;
		};
		onYouTubeIframeAPIReady?: () => void;
	}
}

const STATE_PLAYING = 1;
const STATE_ENDED = 0;

function loadYouTubeApi(): Promise<void> {
	return new Promise((resolve) => {
		if (window.YT?.Player) return resolve();
		const prev = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			prev?.();
			resolve();
		};
		if (!document.getElementById("yt-iframe-api")) {
			const script = document.createElement("script");
			script.id = "yt-iframe-api";
			script.src = "https://www.youtube.com/iframe_api";
			document.head.appendChild(script);
		}
	});
}

function formatTime(seconds: number) {
	const s = Math.max(0, Math.floor(seconds));
	const m = Math.floor(s / 60);
	return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function VideoPlayer({ videos }: { videos: Video[] }) {
	const [current, setCurrent] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [ready, setReady] = useState(false);
	const playerRef = useRef<YTPlayer | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const seekTimer = useRef<number | null>(null);

	useEffect(() => {
		let destroyed = false;
		loadYouTubeApi().then(() => {
			if (destroyed || !containerRef.current) return;
			const video = videos[current];
			playerRef.current = new window.YT!.Player(containerRef.current, {
				videoId: video.id,
				playerVars: {
					controls: 0,
					disablekb: 1,
					modestbranding: 1,
					rel: 0,
					playsinline: 1,
				},
				events: {
					onReady: () => setReady(true),
					onStateChange: (e) => {
						setPlaying(e.data === STATE_PLAYING);
						if (e.data === STATE_PLAYING && playerRef.current) {
							setDuration(playerRef.current.getDuration());
						}
						if (e.data === STATE_ENDED && current < videos.length - 1) {
							select(current + 1);
						}
					},
				},
			});
		});
		return () => {
			destroyed = true;
			playerRef.current?.destroy();
			playerRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!playing) return;
		let raf = 0;
		let lastSync = 0;
		const tick = () => {
			const player = playerRef.current;
			if (player) {
				const now = performance.now();
				// resync against the real player at most every 500ms,
				// interpolate locally in between so the UI stays smooth
				if (now - lastSync > 500) {
					lastSync = now;
					setTime(player.getCurrentTime());
					const d = player.getDuration();
					if (d) setDuration(d);
				} else {
					setTime((t) => t + 1 / 60);
				}
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [playing]);

	function select(index: number) {
		setCurrent(index);
		setTime(0);
		playerRef.current?.loadVideoById(videos[index].id);
	}

	function togglePlay() {
		const player = playerRef.current;
		if (!player) return;
		// optimistic: reflect the intent immediately, onStateChange reconciles later
		setPlaying(player.getPlayerState() !== STATE_PLAYING);
		if (player.getPlayerState() === STATE_PLAYING) {
			player.pauseVideo();
		} else {
			player.playVideo();
		}
	}

	function seekRatio(ratio: number) {
		// optimistic: UI follows the slider instantly, the actual seek is
		// debounced so dragging doesn't spam the player
		setTime(ratio * duration);
		if (seekTimer.current !== null) window.clearTimeout(seekTimer.current);
		seekTimer.current = window.setTimeout(() => {
			seekTimer.current = null;
			playerRef.current?.seekTo(ratio * duration, true);
		}, 100);
	}

	const video = videos[current];
	const progress = duration > 0 ? time / duration : 0;

	return (
		<div>
			<div className="xp-inset relative aspect-video overflow-hidden rounded-sm bg-black p-0">
				<div ref={containerRef} className="h-full w-full" />
				{(!ready || !playing) && (
					<button
						className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/10"
						onClick={togglePlay}
						aria-label={playing ? "Pause" : "Play"}
					>
						<span
							className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 bg-black/50 text-2xl text-white transition-transform ${ready ? "scale-100" : "scale-90 opacity-60"}`}
						>
							{playing ? "⏸" : "▶"}
						</span>
					</button>
				)}
			</div>

			<div className="mt-2 rounded bg-[#e6e3d3] p-1.5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
				<div className="flex items-center gap-2">
					<button className="xp-btn px-3 text-[12px]" onClick={togglePlay}>
						{playing ? "⏸" : "▶"}
					</button>
					<button
						className="xp-btn px-3 text-[12px]"
						onClick={() => seekRatio(Math.max(0, time - 10))}
						aria-label="Back 10 seconds"
					>
						⏪
					</button>
					<button
						className="xp-btn px-3 text-[12px]"
						onClick={() => seekRatio(Math.min(1, (time + 10) / (duration || 1)))}
						aria-label="Forward 10 seconds"
					>
						⏩
					</button>
					<span className="w-24 text-center text-[11px] tabular-nums">
						{formatTime(time)} / {formatTime(duration)}
					</span>
					<input
						type="range"
						min={0}
						max={1}
						step={0.001}
						value={progress}
						onChange={(e) => seekRatio(Number(e.target.value))}
						className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white accent-[#3772d6]"
						aria-label="Seek"
					/>
				</div>
				<div className="mt-1.5 truncate text-[11px]">
					<span className="font-bold">{video.title}</span>
					<span className="opacity-60"> — {video.subtitle}</span>
				</div>
			</div>

			<div className="mt-2 flex flex-col gap-0.5">
				{videos.map((v, i) => (
					<button
						key={v.id}
						className={`flex items-center gap-2 rounded px-2 py-1 text-left text-[11px] ${
							i === current
								? "bg-[#316ac5] text-white"
								: "hover:bg-[#316ac5] hover:text-white"
						}`}
						onClick={() => select(i)}
					>
						<span className="opacity-70">{i === current && playing ? "▶" : "🎵"}</span>
						<span className="flex-1 truncate">{v.title}</span>
						<span className={`text-[10px] ${i === current ? "" : "opacity-60"}`}>{v.subtitle}</span>
					</button>
				))}
			</div>
		</div>
	);
}
