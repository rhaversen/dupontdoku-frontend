"use client";

import { useCallback, useEffect, useState } from "react";
import { VideoPlayer, type Video } from "./video-player";

type Point = { x: number; y: number };

type WinState = { id: SectionId; minimized: boolean; maximized: boolean };

type SectionId =
	| "welcome"
	| "music"
	| "tour"
	| "tickets"
	| "about"
	| "instagram"
	| "videos"
	| "secret";

type IgPost = {
	id: string;
	permalink: string;
	mediaUrl: string;
	mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
	caption: string;
	timestamp: string;
};

const SECTIONS: Record<SectionId, { icon: string; title: string }> = {
	welcome: { icon: "/icons/48/welcome.png", title: "Welcome" },
	music: { icon: "/icons/48/music.png", title: "Music - Windows Media Player" },
	tour: { icon: "/icons/48/tour.png", title: "Tour Dates" },
	tickets: { icon: "/icons/48/tickets.png", title: "Buy Tickets" },
	about: { icon: "/icons/48/readme.png", title: "README.TXT - Notepad" },
	instagram: { icon: "/icons/48/instagram.png", title: "Instagram - dupont0k" },
	videos: { icon: "/icons/48/videos.png", title: "Videos - Media Player" },
	secret: { icon: "/icons/48/guestlist.png", title: "guestlist.exe" },
};

const LINKS = {
	spotify: "https://open.spotify.com/artist/dupont",
	unreleased: "https://soundcloud.com/dupont0k/sets/unreleased",
	presave: "https://distrokid.com/hyperfollow/dupont/next",
	doku: "https://dupont.doku",
	sessions: "https://www.youtube.com/@dupontsessions",
	articles: "https://gaaffa.dk/dupont",
	email: "booking@dupontdoku.example",
};

const VIDEOS: Video[] = [
	{
		id: "OK3GRe_lx0w",
		title: "DUPONT - Lake Highland Sessions",
		subtitle: "Lake Highland Sessions",
	},
	{
		id: "g5xP14Fdg_E",
		title: "Dupont : Sofasessions i 18b - 2025",
		subtitle: "18b Nørregade",
	},
	{
		id: "NWflq55NZf8",
		title: "Dupont - Night terrors",
		subtitle: "KarriereKanonen 2024, DR P3",
	},
];

const DESKTOP_ICONS: { id: SectionId; label: string }[] = [
	{ id: "about", label: "README.TXT" },
	{ id: "music", label: "Music" },
	{ id: "videos", label: "Videos" },
	{ id: "tour", label: "Tour Dates" },
	{ id: "tickets", label: "Tickets" },
	{ id: "instagram", label: "Instagram" },
];

const START_LINKS: { icon: string; label: string; href: string }[] = [
	{ icon: "/icons/48/music.png", label: "Spotify", href: LINKS.spotify },
	{ icon: "/icons/48/tickets.png", label: "Pre-save the new single", href: LINKS.presave },
	{ icon: "/icons/48/guestlist.png", label: "Unreleased music", href: LINKS.unreleased },
	{ icon: "/icons/48/videos.png", label: "Sessions on YouTube", href: LINKS.sessions },
	{ icon: "/icons/48/readme.png", label: "Articles", href: LINKS.articles },
	{ icon: "/icons/48/tour.png", label: "dupont.doku", href: LINKS.doku },
];

function DraggableWindow({
	section,
	minimized,
	maximized,
	onClose,
	onMinimize,
	onToggleMax,
	onOpenSection,
	onFocus,
	z,
	initial,
}: {
	section: SectionId;
	minimized: boolean;
	maximized: boolean;
	onClose: () => void;
	onMinimize: () => void;
	onToggleMax: () => void;
	onOpenSection: (id: SectionId) => void;
	onFocus: () => void;
	z: number;
	initial?: Point;
}) {
	const [pos, setPos] = useState<Point>(initial ?? { x: 80, y: 60 });
	const [offset, setOffset] = useState<Point | null>(null);
	const meta = SECTIONS[section];

	const onTitlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest("button") || maximized) return;
			e.currentTarget.setPointerCapture(e.pointerId);
			setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
		},
		[pos, maximized],
	);

	const onTitlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!offset) return;
			setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
		},
		[offset],
	);

	const endDrag = useCallback(() => setOffset(null), []);

	if (minimized) return null;

	return (
		<div
			className="absolute flex flex-col"
			style={{
				left: maximized ? 0 : pos.x,
				top: maximized ? 0 : pos.y,
				width: maximized
					? "100%"
					: section === "instagram"
						? 460
						: section === "videos"
							? 520
							: 400,
				height: maximized ? "calc(100% - 32px)" : undefined,
				zIndex: z,
			}}
			onPointerDown={onFocus}
		>
			<div className="xp-window flex h-full flex-col">
				<div
					className="xp-title"
					onPointerDown={onTitlePointerDown}
					onPointerMove={onTitlePointerMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
					onDoubleClick={onToggleMax}
				>
					<span className="xp-title-icon mr-1">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={meta.icon} alt="" className="h-4 w-4" />
					</span>
					<span className="flex-1 truncate">{meta.title}</span>
					<button className="xp-title-btn min" aria-label="Minimize" onClick={onMinimize}>
						<span className="-mt-1">_</span>
					</button>
					<button className="xp-title-btn max" aria-label="Maximize" onClick={onToggleMax}>
						<span className="text-[10px]">▢</span>
					</button>
					<button className="xp-title-btn close ml-1" aria-label="Close" onClick={onClose}>
						<span className="text-[14px]">✕</span>
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-auto p-3">
					<SectionContent section={section} onOpenSection={onOpenSection} />
				</div>
			</div>
		</div>
	);
}

const SOLUTION = [
	[1, 2, 3, 4],
	[3, 4, 1, 2],
	[2, 1, 4, 3],
	[4, 3, 2, 1],
];

const PUZZLE = [
	[1, 0, 0, 4],
	[0, 0, 1, 0],
	[0, 1, 0, 0],
	[4, 0, 0, 1],
];

function GuestlistGame({ onOpenSection }: { onOpenSection: (id: SectionId) => void }) {
	const [grid, setGrid] = useState(() => PUZZLE.map((row) => [...row]));
	const [entered, setEntered] = useState(false);
	const solved = grid.every((row, r) => row.every((v, c) => v === SOLUTION[r][c]));

	const cycle = (r: number, c: number) => {
		if (PUZZLE[r][c] !== 0) return;
		setGrid((prev) => {
			const next = prev.map((row) => [...row]);
			next[r][c] = (next[r][c] + 1) % 5;
			return next;
		});
	};

	if (entered) {
		return (
			<div className="xp-inset rounded-sm p-3 text-[11px]">
				<p className="font-bold">You&apos;re on the list!</p>
				<p className="mt-1">
					Show this code at the door for a free guestlist spot (+1):
				</p>
				<p className="my-2 rounded-sm border border-[#7f9db9] bg-white py-2 text-center font-mono text-base tracking-[0.3em]">
					DUPONT-4EVER
				</p>
				<p className="opacity-70">
					While you wait: <a className="text-[#0000cc] underline" href={LINKS.presave} target="_blank" rel="noopener noreferrer">pre-save the new single</a>.
				</p>
			</div>
		);
	}

	if (!solved) {
		return (
			<div>
				<p className="mb-2 text-[11px]">
					Solve the dupontdoku to unlock the guestlist. Click a cell to cycle 1-4. Each
					row, column and 2×2 box needs 1-4 exactly once.
				</p>
				<div className="xp-inset inline-grid grid-cols-4 gap-0 rounded-sm bg-white p-1">
					{grid.map((row, r) =>
						row.map((v, c) => (
							<button
								key={`${r}-${c}`}
								onClick={() => cycle(r, c)}
								className={`flex h-11 w-11 items-center justify-center font-mono text-base ${
									PUZZLE[r][c] !== 0
										? "cursor-default text-[#316ac5]"
										: "hover:bg-[#cde5ff]"
									} ${c === 1 ? "border-r-2 border-r-[#7f9db9]" : ""} ${
									r === 1 ? "border-b-2 border-b-[#7f9db9]" : ""
								}`}
							>
								{v !== 0 ? v : ""}
							</button>
						)),
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<p className="text-[12px] font-bold">🎉 You solved it — welcome to the hidden gem.</p>
			<form
				className="flex flex-col gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					setEntered(true);
				}}
			>
				<input required placeholder="Your name" className="xp-inset rounded-sm px-1 py-0.5 text-[12px]" />
				<input
					required
					type="email"
					placeholder="Your email"
					className="xp-inset rounded-sm px-1 py-0.5 text-[12px]"
				/>
				<select className="xp-inset rounded-sm px-1 py-0.5 text-[12px]">
					<option>Copenhagen - Vega</option>
					<option>Berlin - Lido</option>
					<option>Amsterdam - Paradiso</option>
					<option>London - KOKO</option>
				</select>
				<button type="submit" className="xp-btn px-4">
					Claim free guestlist ticket
				</button>
			</form>
			<div className="xp-inset rounded-sm p-2">
				<p className="mb-1 text-[11px] font-bold">What&apos;s new</p>
				<p className="text-[11px]">
					New single drops Friday. Unreleased demos are rotating on SoundCloud this week
					only.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-1 text-[11px]">
								<button className="xp-btn" onClick={() => onOpenSection("tour")}>
					<img src="/icons/16/tour.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Tour dates
					</button>
					<button className="xp-btn" onClick={() => onOpenSection("instagram")}>
						<img src="/icons/16/instagram.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Concert photos
					</button>
					<a className="xp-btn text-center" href={LINKS.spotify} target="_blank" rel="noopener noreferrer">
						<img src="/icons/16/music.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Spotify
					</a>
					<a className="xp-btn text-center" href={LINKS.unreleased} target="_blank" rel="noopener noreferrer">
						<img src="/icons/16/guestlist.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Unreleased music
					</a>
					<a className="xp-btn text-center" href={LINKS.presave} target="_blank" rel="noopener noreferrer">
						<img src="/icons/16/tickets.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Pre-save
					</a>
					<a className="xp-btn text-center" href={LINKS.sessions} target="_blank" rel="noopener noreferrer">
						<img src="/icons/16/videos.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Sessions (YouTube)
					</a>
					<a className="xp-btn text-center" href={LINKS.doku} target="_blank" rel="noopener noreferrer">
						<img src="/icons/16/readme.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> dupont.doku
					</a>
					<a className="xp-btn text-center" href={LINKS.articles} target="_blank" rel="noopener noreferrer">
						<img src="/icons/16/tour.png" alt="" className="mr-1 inline h-3.5 w-3.5" /> Articles
					</a>
			</div>
			<a className="text-[11px] text-[#0000cc] underline" href={`mailto:${LINKS.email}`}>
				Get in touch: {LINKS.email}
			</a>
		</div>
	);
}

function InstagramGallery() {
	const [posts, setPosts] = useState<IgPost[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/instagram")
			.then((res) => res.json())
			.then((data: { posts?: IgPost[]; error?: string }) => {
				if (cancelled) return;
				if (data.error) setError(data.error);
				else setPosts(data.posts ?? []);
			})
			.catch(() => !cancelled && setError("Failed to load Instagram feed"));
		return () => {
			cancelled = true;
		};
	}, []);

	if (error) {
		return (
			<div className="xp-inset h-48 overflow-auto rounded-sm p-3 text-[11px]">
				<p className="mb-2 font-bold">Unable to load Instagram feed:</p>
				<p>{error}</p>
				<p className="mt-2 opacity-70">
					Set INSTAGRAM_ACCESS_TOKEN in .env.local (Basic Display API, @dupont0k).
				</p>
			</div>
		);
	}

	if (!posts) {
		return (
			<div className="xp-inset h-64 rounded-sm p-3 text-[11px]">Loading @dupont0k feed...</div>
		);
	}

	return (
		<div>
			<div className="xp-inset grid max-h-64 grid-cols-3 gap-1 overflow-auto rounded-sm p-1">
				{posts.map((post) => (
					<a
						key={post.id}
						href={post.permalink}
						target="_blank"
						rel="noopener noreferrer"
						title={post.caption ?? "View on Instagram"}
						className="group relative block aspect-square overflow-hidden bg-[#ece9d8]"
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={post.mediaUrl}
							alt={post.caption?.slice(0, 80) ?? "Instagram post"}
							className="h-full w-full object-cover"
							loading="lazy"
						/>
						{post.mediaType !== "IMAGE" && (
							<span className="absolute top-0.5 right-0.5 bg-black/50 px-1 text-[9px] text-white">
								{post.mediaType === "VIDEO" ? "▶" : "▣"}
							</span>
						)}
					</a>
				))}
				{posts.length === 0 && (
					<div className="col-span-3 p-4 text-center text-[11px] opacity-70">
						No posts found.
					</div>
				)}
			</div>
			<div className="mt-3 flex items-center justify-between rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
				<span>{posts.length} posts from @dupont0k</span>
				<a
					className="text-[#0000cc] underline"
					href="https://www.instagram.com/dupont0k/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Open Profile ↗
				</a>
			</div>
		</div>
	);
}

function SectionContent({
	section,
	onOpenSection,
}: {
	section: SectionId;
	onOpenSection: (id: SectionId) => void;
}) {
	switch (section) {
		case "music":
			return (
				<div className="flex flex-col gap-1">
					{[
						"01. Teal Horizon",
						"02. Dial-Up Dreams",
						"03. Bevel & Bass",
						"04. Screensaver",
						"05. 56k Romance",
					].map((track, i) => (
						<div
							key={track}
							className="flex items-center justify-between rounded px-2 py-1 hover:bg-[#316ac5] hover:text-white"
						>
							<span>{track}</span>
							<span className="text-[10px] opacity-60">3:5{i}</span>
						</div>
					))}
					<div className="mt-3 flex items-center gap-2">
						<button className="xp-btn px-3 text-[12px]">▶</button>
						<button className="xp-btn px-3 text-[12px]">⏸</button>
						<button className="xp-btn px-3 text-[12px]">⏹</button>
						<div className="h-5 flex-1 rounded-sm border border-[#7f9db9] bg-white p-0.5">
							<div className="flex h-full gap-0.5">
								{Array.from({ length: 40 }).map((_, i) => (
									<div
										key={i}
										className={`w-1 ${i < 13 ? "bg-[#3772d6]" : "bg-[#c8d8f0]"}`}
									/>
								))}
							</div>
						</div>
					</div>
					<div className="mt-3 flex items-center justify-between rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
						<span>Now Playing: 01. Teal Horizon</span>
						<span className="opacity-60">1:22 / 3:50</span>
					</div>
				</div>
			);
		case "tour":
			return (
				<div>
					<table className="w-full border-collapse text-left">
					<thead>
						<tr>
							<th className="border border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 text-left font-normal">Date</th>
							<th className="border border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 text-left font-normal">City</th>
							<th className="border border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 text-left font-normal">Venue</th>
						</tr>
					</thead>
					<tbody>
						{[
							["Oct 03", "Copenhagen", "Vega"],
							["Oct 11", "Berlin", "Lido"],
							["Oct 18", "Amsterdam", "Paradiso"],
							["Nov 01", "London", "KOKO"],
						].map(([date, city, venue]) => (
							<tr key={date} className="hover:bg-[#cde5ff]">
								<td className="px-2 py-1">{date}</td>
								<td className="px-2 py-1">{city}</td>
								<td className="px-2 py-1">{venue}</td>
							</tr>
						))}
					</tbody>
					</table>
					<div className="mt-3 flex items-center justify-between rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
						<span>4 dates found</span>
						<button className="xp-btn px-3 py-0.5">Get Tickets →</button>
					</div>
				</div>
			);
		case "tickets":
			return (
				<form
					className="flex flex-col gap-2"
					onSubmit={(e) => e.preventDefault()}
				>
					<label className="flex items-center justify-between gap-2">
						Show:
						<select className="xp-inset w-48 rounded-sm px-1 py-0.5">
							<option>Copenhagen - Vega</option>
							<option>Berlin - Lido</option>
							<option>Amsterdam - Paradiso</option>
							<option>London - KOKO</option>
						</select>
					</label>
					<label className="flex items-center justify-between gap-2">
						Qty:
						<input
							type="number"
							min={1}
							defaultValue={2}
							className="xp-inset w-16 rounded-sm px-1 py-0.5"
						/>
					</label>
				<div className="mt-1 flex justify-end gap-2">
						<button type="reset" className="xp-btn px-4">
							Cancel
						</button>
						<button type="submit" className="xp-btn px-4">
							Buy Tickets
						</button>
					</div>
				</form>
			);
		case "instagram":
			return <InstagramGallery />;
		case "secret":
			return <GuestlistGame onOpenSection={onOpenSection} />;
		case "videos":
			return <VideoPlayer videos={VIDEOS} />;
		case "about":
			return (
				<div className="flex h-full flex-col">
					<div className="min-h-48 flex-1 overflow-auto bg-white p-2 font-mono text-[11px] whitespace-pre-wrap">
						{`DUPONTDOKU - README.TXT

Genre: lo-fi synth / bedroom pop
Formed: 2019, Aarhus DK

psst... type the name of this site anywhere on the page.

Contact: booking@dupontdoku.example
`}
					</div>
				</div>
			);
		default:
			return (
				<div>
					<div className="flex gap-3">
						<div className="text-3xl leading-none">
							<img src="/icons/16/welcome.png" alt="" className="inline h-9 w-9" />
						</div>
						<p className="flex-1">
						Welcome to Dupontdoku XP. Click the icons on the desktop to explore music,
						tour dates, tickets and more.
					</p>
				</div>
				<div className="xp-inset mt-3 rounded-sm p-2 font-mono text-[11px]">
					C:\&gt; echo hello, world_
				</div>
				<p className="mt-2 text-[10px] opacity-50">there is a hidden gem on this desktop…</p>
				<div className="mt-3 flex justify-end">
					<button className="xp-btn px-4">OK</button>
					</div>
				</div>
			);
	}
}

export default function Home() {
	const [startOpen, setStartOpen] = useState(false);
	const [wins, setWins] = useState<WinState[]>([{ id: "welcome", minimized: false, maximized: false }]);
	const [clock, setClock] = useState("");

	useEffect(() => {
		const tick = () =>
			setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
		tick();
		const id = setInterval(tick, 10_000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		let buf = "";
		const onKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
			buf = (buf + e.key.toLowerCase()).slice(-6);
			if (buf === "dupont") {
				setWins((prev) =>
					prev.some((w) => w.id === "secret")
						? prev.map((w) => (w.id === "secret" ? { ...w, minimized: false } : w))
						: [...prev, { id: "secret", minimized: false, maximized: false }],
				);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const openSection = (id: SectionId) => {
		setWins((prev) =>
			prev.some((w) => w.id === id)
				? prev.map((w) => (w.id === id ? { ...w, minimized: false } : w))
				: [...prev, { id, minimized: false, maximized: false }],
		);
		setStartOpen(false);
	};

	const focusSection = (id: SectionId) => {
		setWins((prev) =>
			prev[prev.length - 1]?.id === id
				? prev
				: [...prev.filter((w) => w.id !== id), prev.find((w) => w.id === id)!],
		);
	};

	const minimizeSection = (id: SectionId) => {
		setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
	};

	const toggleMaxSection = (id: SectionId) => {
		setWins((prev) => prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
	};

	const closeSection = (id: SectionId) => {
		setWins((prev) => prev.filter((w) => w.id !== id));
	};

	return (
		<div className="relative h-full w-full overflow-hidden">
			<div className="absolute top-2 left-2 flex flex-col gap-1">
				{DESKTOP_ICONS.map(({ id, label }) => (
					<button
						key={id}
						className="flex w-20 flex-col items-center gap-1 rounded p-2 text-center hover:bg-[#316ac5]/40 focus:bg-[#316ac5]/60 focus:outline-none"
						onDoubleClick={() => openSection(id)}
					>
						<img
							src={SECTIONS[id].icon}
							alt=""
							className="h-9 w-9 drop-shadow-[1px_1px_2px_rgba(0,0,0,0.6)]"
						/>
						<span
							className="rounded px-1 text-[11px] leading-tight text-white"
							style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.9)" }}
						>
							{label}
						</span>
					</button>
				))}
			</div>

			{wins.map((w, i) => (
				<DraggableWindow
					key={w.id}
					section={w.id}
					minimized={w.minimized}
					maximized={w.maximized}
					initial={{ x: 140 + i * 28, y: 40 + i * 28 }}
					z={i + 1}
					onClose={() => closeSection(w.id)}
					onMinimize={() => minimizeSection(w.id)}
					onToggleMax={() => toggleMaxSection(w.id)}
					onOpenSection={openSection}
					onFocus={() => focusSection(w.id)}
				/>
			))}

			<div className="absolute bottom-0 left-0 right-0">
				<div className="xp-taskbar flex items-center gap-1.5 pr-1">
					<button className="xp-start-btn" onClick={() => setStartOpen((v) => !v)}>
						<span>🪟</span> start
					</button>
					<div className="flex flex-1 items-center gap-1">
						{wins.map((w) => (
							<button
								key={w.id}
								className={`xp-task-btn ${w.minimized ? "opacity-70" : ""}`}
								onClick={() =>
									w.minimized
										? openSection(w.id)
										: wins[wins.length - 1]?.id === w.id
											? minimizeSection(w.id)
											: focusSection(w.id)
								}
							>
								<img src={SECTIONS[w.id].icon} alt="" className="mr-1 inline h-3.5 w-3.5" />
						{SECTIONS[w.id].title.split(" - ")[0]}
							</button>
						))}
					</div>
					<div className="xp-tray flex h-full items-center gap-2 text-[11px]">
						<span title="Volume">🔊</span>
						<span title="Network">📶</span>
						<span className="xp-tray-clock tabular-nums">{clock}</span>
					</div>
				</div>
			</div>

			{startOpen && (
				<div className="absolute bottom-8.5 left-0 flex w-96 overflow-hidden rounded-r-lg border border-[#0831d9] shadow-[3px_-3px_10px_rgba(0,0,0,0.45)]">
					<div className="flex w-9 items-end justify-center bg-linear-to-t from-[#1e50c8] via-[#245edb] to-[#3f8cf3] pb-3">
						<span
							className="text-sm font-bold italic text-white"
							style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
						>
							Dupontdoku
						</span>
					</div>
					<div className="flex-1 bg-[#ece9d8]">
						<div className="p-1">
							<button
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-bold hover:bg-[#316ac5] hover:text-white"
								onClick={() => openSection("welcome")}
							>
								<img src="/icons/16/welcome.png" alt="" className="h-5 w-5" /> Welcome
							</button>
							<button
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#316ac5] hover:text-white"
								onClick={() => openSection("secret")}
							>
								<img src="/icons/16/guestlist.png" alt="" className="h-5 w-5" /> guestlist.exe
							</button>
						</div>
						<div className="mx-1 border-t border-[#d5d2c8]" />
						<div className="p-1">
							{START_LINKS.map(({ icon, label, href }) => (
								<a
									key={label}
									className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#316ac5] hover:text-white"
									href={href}
									target="_blank"
									rel="noopener noreferrer"
								>
									<img src={icon} alt="" className="h-5 w-5" />
									{label} <span className="ml-auto opacity-60">↗</span>
								</a>
							))}
							<a
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#316ac5] hover:text-white"
								href={`mailto:${LINKS.email}`}
							>
								<span className="flex h-5 w-5 items-center justify-center text-[13px]">✉️</span> Get
						in touch
							</a>
						</div>
						<div className="mx-1 border-t border-[#d5d2c8]" />
						<div className="flex items-center justify-between bg-linear-to-r from-[#e6e3d3] to-[#ece9d8] p-1.5">
							<button
								className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#316ac5] hover:text-white"
								onClick={() => {
									setWins((prev) => prev.map((w) => ({ ...w, minimized: true })));
									setStartOpen(false);
								}}
							>
								<span className="text-lg">🔑</span> Log Off
							</button>
							<button
								className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#316ac5] hover:text-white"
								onClick={() => {
									setWins([]);
									setStartOpen(false);
								}}
							>
								<span className="text-lg">⏻</span> Turn Off Computer
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
