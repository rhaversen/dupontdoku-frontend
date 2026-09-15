"use client";

import { useCallback, useEffect, useState } from "react";
import { VideoPlayer, type Video } from "./video-player";

type Point = { x: number; y: number };

type SectionId = "welcome" | "music" | "tour" | "tickets" | "about" | "instagram" | "videos";

type IgPost = {
	id: string;
	permalink: string;
	mediaUrl: string;
	mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
	caption: string;
	timestamp: string;
};

const SECTIONS: Record<SectionId, { icon: string; title: string }> = {
	welcome: { icon: "🏁", title: "Welcome" },
	music: { icon: "🎵", title: "Music - Windows Media Player" },
	tour: { icon: "🌍", title: "Tour Dates" },
	tickets: { icon: "🎫", title: "Buy Tickets" },
	about: { icon: "📄", title: "About Dupontdoku" },
	instagram: { icon: "📷", title: "Instagram - dupont0k" },
	videos: { icon: "🎬", title: "Videos - Media Player" },
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

const MENU: { id: SectionId; label: string }[] = [
	{ id: "music", label: "Music" },
	{ id: "tour", label: "Tour" },
	{ id: "tickets", label: "Tickets" },
	{ id: "about", label: "About" },
	{ id: "instagram", label: "Instagram" },
	{ id: "videos", label: "Videos" },
];

function DraggableWindow({
	section,
	onClose,
	onOpenSection,
	onFocus,
	z,
	initial,
}: {
	section: SectionId;
	onClose: () => void;
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
			if ((e.target as HTMLElement).closest("button")) return;
			e.currentTarget.setPointerCapture(e.pointerId);
			setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
		},
		[pos],
	);

	const onTitlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!offset) return;
			setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
		},
		[offset],
	);

	const endDrag = useCallback(() => setOffset(null), []);

	return (
		<div
			className="absolute flex flex-col"
			style={{
				left: pos.x,
				top: pos.y,
				width: section === "instagram" ? 460 : section === "videos" ? 520 : 400,
				zIndex: z,
			}}
			onPointerDown={onFocus}
		>
			<div className="xp-window">
				<div
					className="xp-title"
					onPointerDown={onTitlePointerDown}
					onPointerMove={onTitlePointerMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
				>
					<span className="mr-1">{meta.icon}</span>
					<span className="flex-1 truncate">{meta.title}</span>
					<button className="xp-title-btn min" aria-label="Minimize">
						<span className="-mt-1">_</span>
					</button>
					<button className="xp-title-btn max" aria-label="Maximize">
						<span className="text-[10px]">▢</span>
					</button>
					<button className="xp-title-btn close ml-1" aria-label="Close" onClick={onClose}>
						<span className="text-[14px]">✕</span>
					</button>
				</div>
				<div className="flex items-center gap-4 border-b border-[#d5d2c8] bg-[#ece9d8] px-2 py-0.5 text-[11px]">
					{MENU.map((m) => (
						<button
							key={m.id}
							className="rounded px-2 py-0.5 hover:bg-[#316ac5] hover:text-white"
							onClick={() => onOpenSection(m.id)}
						>
							{m.label}
						</button>
					))}
				</div>
				<div className="p-3">
					<SectionContent section={section} />
				</div>
			</div>
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

function SectionContent({ section }: { section: SectionId }) {
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
		case "videos":
			return <VideoPlayer videos={VIDEOS} />;
		case "about":
			return (
				<div className="xp-inset h-48 overflow-auto rounded-sm p-2 font-mono text-[11px] whitespace-pre-wrap">
					{`DUPONTDOKU - README.TXT

Genre: lo-fi synth / bedroom pop
Formed: 2019, Aarhus DK

Contact: booking@dupontdoku.example
`}
				</div>
			);
		default:
			return (
				<div>
					<div className="flex gap-3">
						<div className="text-3xl leading-none">🏁</div>
						<p className="flex-1">
						Welcome to Dupontdoku XP. Use the Start menu to explore music, tour dates
						and tickets.
					</p>
				</div>
				<div className="xp-inset mt-3 rounded-sm p-2 font-mono text-[11px]">
					C:\&gt; echo hello, world_
				</div>
				<div className="mt-3 flex justify-end">
					<button className="xp-btn px-4">OK</button>
					</div>
				</div>
			);
	}
}

export default function Home() {
	const [startOpen, setStartOpen] = useState(false);
	const [open, setOpen] = useState<SectionId[]>(["welcome"]);
	const [clock, setClock] = useState("");

	useEffect(() => {
		const tick = () =>
			setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
		tick();
		const id = setInterval(tick, 10_000);
		return () => clearInterval(id);
	}, []);

	const openSection = (id: SectionId) => {
		setOpen((prev) => (prev.includes(id) ? prev : [...prev, id]));
		setStartOpen(false);
	};

	const focusSection = (id: SectionId) => {
		setOpen((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((s) => s !== id), id]));
	};

	const startItems: SectionId[] = ["music", "videos", "tour", "tickets", "about", "instagram"];

	return (
		<div className="relative h-full w-full overflow-hidden">
			{open.map((id, i) => (
				<DraggableWindow
					key={id}
					section={id}
					initial={{ x: 60 + i * 28, y: 40 + i * 28 }}
					z={i + 1}
					onClose={() => setOpen((prev) => prev.filter((s) => s !== id))}
					onOpenSection={openSection}
					onFocus={() => focusSection(id)}
				/>
			))}

			<div className="absolute bottom-0 left-0 right-0">
				<div className="xp-taskbar flex items-center gap-1.5 pr-1">
					<button className="xp-start-btn" onClick={() => setStartOpen((v) => !v)}>
						<span>🪟</span> start
					</button>
					<div className="flex flex-1 items-center gap-1">
						{open.map((id) => (
							<div key={id} className="xp-task-btn">
								{SECTIONS[id].icon} {SECTIONS[id].title.split(" - ")[0]}
							</div>
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
							{startItems.map((id) => (
								<button
									key={id}
									className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#316ac5] hover:text-white"
									onClick={() => openSection(id)}
								>
									<span className="text-lg">{SECTIONS[id].icon}</span>
									{SECTIONS[id].title.split(" - ")[0]}
								</button>
							))}
						</div>
						<div className="mx-1 border-t border-[#d5d2c8]" />
						<div className="flex items-center justify-between bg-linear-to-r from-[#e6e3d3] to-[#ece9d8] p-1.5">
							<button className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#316ac5] hover:text-white">
								<span className="text-lg">🔑</span> Log Off
							</button>
							<button className="flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#316ac5] hover:text-white">
								<span className="text-lg">⏻</span> Turn Off Computer
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
