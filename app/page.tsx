"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { VideoPlayer } from "./video-player";
import {
	SpotifyPlayer,
	SPOTIFY_CONNECTED_EVENT,
	SPOTIFY_AUTH_OPEN_EVENT,
	SPOTIFY_AUTH_CLOSE_EVENT,
} from "./spotify-player";
import AuthWindow from "./auth-window";
import { BootScreen } from "./boot-screen";
import { GuestlistPanel } from "./guestlist-desktop";
import { useAuth } from "./lib/auth";
import { api, type SiteConfig, type TourDate, type BlogPost, type VideoItem, type LinkItem, type Guest } from "./lib/api";
import { CrudEditor, ConfigEditor, TabbedEditors, type FieldDef } from "./editors";

type Point = { x: number; y: number };

type WinState = {
	id: SectionId;
	minimized: boolean;
	maximized: boolean;
	// last placed/dragged position, kept so a window returns to its spot
	pos?: Point;
};

type SectionId = "home" | "media" | "news" | "guestlist" | "admin" | "spotifyAuth";

const SECTIONS: Record<SectionId, { icon: string; title: string }> = {
	home: { icon: "/icons/48/welcome.png", title: "Home" },
	media: { icon: "/icons/48/music.png", title: "Media Player" },
	news: { icon: "/icons/48/readme.png", title: "News - Notepad" },
	guestlist: { icon: "/icons/48/guestlist.png", title: "Guest List" },
	admin: { icon: "/icons/48/guestlist.png", title: "Content Manager" },
	spotifyAuth: { icon: "/icons/48/music.png", title: "Connect Spotify - Internet Explorer" },
};

const TOUR_FIELDS: FieldDef[] = [
	{ key: "eventDate", label: "Date" },
	{ key: "city", label: "City" },
	{ key: "venue", label: "Venue" },
	{ key: "ticketUrl", label: "Ticket URL (per show)", optional: true },
	{ key: "sortOrder", label: "Sort", type: "number", default: 0 },
];

const BLOG_FIELDS: FieldDef[] = [
	{ key: "title", label: "Title" },
	{ key: "body", label: "Body", type: "textarea" },
	{ key: "published", label: "Published", type: "checkbox", default: true },
];

const VIDEO_FIELDS: FieldDef[] = [
	{ key: "youtubeId", label: "YouTube ID" },
	{ key: "title", label: "Title" },
	{ key: "subtitle", label: "Subtitle", optional: true },
	{ key: "sortOrder", label: "Sort", type: "number", default: 0 },
];

const LINK_FIELDS: FieldDef[] = [
	{ key: "label", label: "Label" },
	{ key: "url", label: "URL" },
	{ key: "icon", label: "Icon path", optional: true },
	{ key: "location", label: "Location", type: "select", options: ["start", "desktop", "window"], default: "start" },
	{ key: "category", label: "Category", type: "select", options: ["music", "social", "press", "other"], default: "other" },
	{ key: "sortOrder", label: "Sort", type: "number", default: 0 },
];

const CONFIG_FIELDS: FieldDef[] = [
	{ key: "bio", label: "Bio", type: "textarea" },
	{ key: "contactEmail", label: "Contact email" },
	{ key: "generalTicketUrl", label: "General ticket URL" },
	{ key: "footerNote", label: "Footer note" },
];

const DESKTOP_WINDOW_WIDTHS: Partial<Record<SectionId, number>> = {
	home: 620,
	media: 520,
	news: 380,
	guestlist: 380,
	admin: 520,
	spotifyAuth: 460,
};

// a single window boots the desktop; everything else is opened on demand
const DEFAULT_OPEN: SectionId[] = ["home"];

// random desktop spot for manually opened windows, clamped to stay on screen
const TASKBAR_H = 48;

// area the top-left corner may land in so a window of the given size fits
// entirely on screen above the taskbar
function randomSpot(width: number, height: number): Point {
	const maxX = Math.max(0, window.innerWidth - width);
	const maxY = Math.max(0, window.innerHeight - TASKBAR_H - height);
	return { x: Math.round(Math.random() * maxX), y: Math.round(Math.random() * maxY) };
}

function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);
	return isMobile;
}

function DraggableWindow({
	section,
	minimized,
	maximized,
	onClose,
	onMinimize,
	onToggleMax,
	onOpenSection,
	onFocus,
	focused,
	z,
	initial,
	onPosCommit,
	widthOverride,
	mobile = false,
}: {
	section: SectionId;
	minimized: boolean;
	maximized: boolean;
	onClose: () => void;
	onMinimize: () => void;
	onToggleMax: () => void;
	onOpenSection: (id: SectionId) => void;
	onFocus: () => void;
	focused: boolean;
	z: number;
	initial?: Point;
	onPosCommit?: (pos: Point) => void;
	widthOverride?: number;
	mobile?: boolean;
}) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const [pos, setPos] = useState<Point>(initial ?? { x: 0, y: 0 });
	const posRef = useRef<Point>(initial ?? { x: 0, y: 0 });
	const [offset, setOffset] = useState<Point | null>(null);
	const placedRef = useRef(Boolean(initial));
	const meta = SECTIONS[section];

	// measure the real extents after layout, then pick a random spot that
	// keeps the whole window on screen
	useLayoutEffect(() => {
		if (mobile || placedRef.current) return;
		placedRef.current = true;
		const el = rootRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const spot = randomSpot(rect.width, rect.height);
		posRef.current = spot;
		setPos(spot);
		onPosCommit?.(spot);
	}, [mobile, onPosCommit]);

	const onTitlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			// only start a drag from the title bar itself, not its buttons
			if (mobile || (e.target as HTMLElement).closest("button")) return;
			if (maximized) return;
			e.currentTarget.setPointerCapture(e.pointerId);
			setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
			onFocus();
		},
		[pos, maximized, mobile, onFocus],
	);

	const onTitlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!offset) return;
			// clamp so the dragged window never leaves the screen
			const el = rootRef.current;
			const w = el ? el.offsetWidth : 0;
			const h = el ? el.offsetHeight : 0;
			const x = Math.min(Math.max(e.clientX - offset.x, 0), Math.max(0, window.innerWidth - w));
			const y = Math.min(Math.max(e.clientY - offset.y, 0), Math.max(0, window.innerHeight - TASKBAR_H - h));
			posRef.current = { x, y };
			setPos({ x, y });
		},
		[offset],
	);

	// persist on drag end so a later minimize/restore reopens in place
	const endDrag = useCallback(() => {
		setOffset(null);
		onPosCommit?.(posRef.current);
	}, [onPosCommit]);

	if (minimized) return null;

	// mobile layout: static flex-list card — full width, no dragging, and the
	// window controls are hidden so windows can only be switched, not closed
	if (mobile) {
		return (
			<div className="border border-accent-border bg-chrome rounded-md shadow-[0_14px_40px_rgba(0,0,0,0.35)] relative flex w-full flex-col overflow-hidden rounded-t-xl" onPointerDown={onFocus}>
				<div className="flex cursor-default items-center gap-1.5 bg-chrome-deep px-2.5 py-1.5 font-bold text-ink">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={meta.icon} alt="" className="mr-1 h-4 w-4" />
					<span className="flex-1 truncate">{meta.title}</span>
				</div>
				<div className="bg-surface m-1.5 max-h-[65vh] min-h-0 overflow-auto p-4 text-[12px] leading-relaxed rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
					<SectionContent section={section} onOpenSection={onOpenSection} />
				</div>
			</div>
		);
	}

	return (
		<div
			ref={rootRef}
			className="absolute flex flex-col"
			style={{
				left: maximized ? 0 : pos.x,
				top: maximized ? 0 : pos.y,
				width: maximized ? "100%" : (widthOverride ?? DESKTOP_WINDOW_WIDTHS[section] ?? 400),
				height: maximized ? "calc(100% - 32px)" : "auto",
				maxHeight: maximized ? undefined : "calc(100% - 48px)",
				zIndex: z,
			}}
			onPointerDown={onFocus}
		>
			<div className={`bg-chrome border border-accent-border rounded-xl shadow-[0_14px_40px_rgba(0,0,0,0.35)] ${focused ? "shadow-[0_20px_50px_rgba(0,0,0,0.5)]" : ""} flex h-full flex-col overflow-hidden`}>
				<div
					className={`flex cursor-default items-center gap-1.5 bg-chrome-deep px-2.5 py-1.5 select-none font-bold text-ink border-b border-b-accent-border/60`}
					onPointerDown={onTitlePointerDown}
					onPointerMove={onTitlePointerMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
					onDoubleClick={onToggleMax}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={meta.icon} alt="" className="mr-1 h-4 w-4" />
					<span className={`h-1.5 w-1.5 rounded-full ${focused ? "bg-accent" : "bg-accent-border/50"}`} />
					<span className="flex-1 truncate">{meta.title}</span>
					<button className="grid h-5 w-5 place-items-center rounded-md border border-accent-border/70 bg-accent-soft/70 text-ink hover:bg-accent-soft active:translate-y-px" aria-label="Minimize" onPointerDown={(e) => { e.preventDefault(); onMinimize(); }}>
						<svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true"><path d="M1 7h8" stroke="currentColor" strokeWidth="1.5" /></svg>
					</button>
					<button className="grid h-5 w-5 place-items-center rounded-md border border-accent-border/70 bg-accent-soft/70 text-ink hover:bg-accent-soft active:translate-y-px" aria-label={maximized ? "Restore" : "Maximize"} onPointerDown={(e) => { e.preventDefault(); onToggleMax(); }}>
						<svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
							{maximized ? (
								<><path d="M3 3h5v5" stroke="currentColor" strokeWidth="1.2" fill="none" /><path d="M1.5 7V1.5H7" stroke="currentColor" strokeWidth="1.2" fill="none" /></>
							) : (
								<rect x="1.5" y="1.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
							)}
						</svg>
					</button>
					<button className="grid h-5 w-5 place-items-center rounded-md border border-accent-border/70 bg-accent-soft/70 text-ink hover:bg-accent hover:border-accent hover:text-white active:translate-y-px" aria-label="Close" onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
						<svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
					</button>
				</div>
				<div className="bg-surface m-1.5 mt-1.5 min-h-0 flex-1 overflow-auto p-3 text-[12px] leading-relaxed rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
					<SectionContent section={section} onOpenSection={onOpenSection} />
				</div>
			</div>
		</div>
	);
}

function HomeWindow({
	config,
	onOpenSection,
}: {
	config: SiteConfig | null;
	onOpenSection: (id: SectionId) => void;
}) {
	const [links, setLinks] = useState<LinkItem[]>([]);
	const [dates, setDates] = useState<TourDate[] | null>(null);

	useEffect(() => {
		api.getLinks()
			.then((list) => setLinks(list.filter((l) => l.location === "window")))
			.catch(() => setLinks([]));
		api.getTourDates()
			.then((list) => setDates([...list].sort((a, b) => a.sortOrder - b.sortOrder)))
			.catch(() => setDates([]));
	}, []);

	const exploreLinks: { id: SectionId; label: string }[] = [
		{ id: "media", label: "Play the music" },
		{ id: "news", label: "Read the news" },
		{ id: "guestlist", label: "See the guest list" },
	];
	const upcoming = (dates ?? []).slice(0, 4);

	return (
		<div className="flex h-full flex-col">
			<div className="bg-accent-soft/70 border-b border-b-accent-border/40 px-3 py-2 text-ink">
				<div className="flex items-baseline gap-2">
					<div className="text-base font-bold italic">Dupont</div>
					<div className="text-[10px] opacity-60">Denmark · folk-rock</div>
				</div>
			</div>
			<div className="mt-2 min-h-48 flex-1 overflow-auto">
				<div className="rounded-lg border border-accent-border bg-surface p-3 leading-relaxed whitespace-pre-wrap">
					{config?.bio || ""}
				</div>
				<div className="mt-2 rounded-lg border border-accent-border bg-surface shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
					<div className="border-b border-b-accent-border/60 bg-chrome px-2.5 py-1 text-[11px] font-bold">Upcoming shows</div>
					<div className="p-2">
						{dates === null ? (
							<p className="text-[12px] opacity-60">Loading…</p>
						) : upcoming.length === 0 ? (
							<p className="text-[12px] opacity-70">No dates announced yet — check back soon.</p>
						) : (
							<div className="flex flex-col">
								{upcoming.map((d) => (
									<div key={d.id} className="flex items-baseline gap-2 rounded-md px-1 py-0.5 text-[12px] hover:bg-accent/10">
										<span className="w-20 shrink-0 tabular-nums opacity-60">{d.eventDate}</span>
										<span className="w-24 shrink-0 truncate font-bold" title={d.city}>{d.city}</span>
										<span className="flex-1 truncate" title={d.venue}>{d.venue}</span>
										<a
											className="shrink-0 text-[11px] font-bold text-accent hover:text-accent-dark hover:underline"
											href={d.ticketUrl || config?.generalTicketUrl || "#"}
											target="_blank"
											rel="noopener noreferrer"
										>
											Tickets →
										</a>
									</div>
								))}
								{dates.length > upcoming.length && (
									<p className="px-1 pt-1 text-[11px] opacity-60">+ {dates.length - upcoming.length} more dates announced</p>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
			<div className="mt-2 pt-2">
				<div className="mb-1 text-[10px] font-bold uppercase opacity-50">Apps</div>
				<div className="flex flex-col">
					{exploreLinks.map((l) => (
						<button
							key={l.id}
							className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[12px] hover:bg-accent/10"
							onClick={() => onOpenSection(l.id)}
						>
							<span className="w-4 text-center">▸</span> {l.label}
						</button>
					))}
				</div>
				{links.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1 pt-2">
						{links.map((l) => (
							<a key={l.id} className="rounded-full border border-accent-border bg-chrome px-2 py-0.5 text-[10px] no-underline shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-accent-soft" href={l.url} target="_blank" rel="noopener noreferrer">
								{l.icon && (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={l.icon} alt="" className="mr-1 inline h-3.5 w-3.5" />
								)}
								{l.label}
							</a>
						))}
					</div>
				)}
			</div>
			<div className="mt-2 flex items-center gap-2 pt-1.5">
				{config?.contactEmail && (
					<a className="text-[11px] text-accent underline hover:text-accent-dark" href={`mailto:${config.contactEmail}`}>
						📧 {config.contactEmail}
					</a>
				)}
				{config?.footerNote && (
					<span className="ml-auto rounded-full border border-accent-border/60 bg-chrome/70 px-2 py-0.5 text-[11px] opacity-80">{config.footerNote}</span>
				)}
			</div>
		</div>
	);
}

function MediaPlayerWindow() {
	const [tab, setTab] = useState<"music" | "videos">("music");

	return (
		<div className="flex h-full flex-col">
			<div className="flex gap-1">
				<button
					className={`border border-accent-border rounded-md px-2 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] text-[11px] ${tab === "music" ? "bg-accent-soft font-bold" : "bg-chrome opacity-80 hover:opacity-100 hover:bg-accent-soft"}`}
					onClick={() => setTab("music")}
				>
					Music
				</button>
				<button
					className={`border border-accent-border rounded-md px-2 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] text-[11px] ${tab === "videos" ? "bg-accent-soft font-bold" : "bg-chrome opacity-80 hover:opacity-100 hover:bg-accent-soft"}`}
					onClick={() => setTab("videos")}
				>
					Videos
				</button>
			</div>
			<div className="min-h-0 flex-1 pt-2">
				{tab === "music" ? <SpotifyPlayer /> : <VideosPane />}
			</div>
		</div>
	);
}
function VideosPane() {
	const [videos, setVideos] = useState<VideoItem[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		api.getVideos()
			.then((list) => setVideos([...list].sort((a, b) => a.sortOrder - b.sortOrder)))
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load videos"));
	}, []);

	if (error) return <p className="text-[12px] text-red-700">{error}</p>;
	if (!videos) return <p className="text-[12px] opacity-60">Loading…</p>;
	if (videos.length === 0) return <p className="text-[12px] opacity-70">No videos yet.</p>;

	return (
		<VideoPlayer
			videos={videos.map((v) => ({ id: v.youtubeId, title: v.title, subtitle: v.subtitle }))}
		/>
	);
}

function NewsWindow() {
	const [posts, setPosts] = useState<BlogPost[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		api.getBlogPosts()
			.then((list) => setPosts(list.filter((p) => p.published)))
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load news"));
	}, []);

	if (error) return <p className="text-[12px] text-red-700">{error}</p>;
	if (!posts) return <p className="text-[12px] opacity-60">Loading…</p>;
	if (posts.length === 0) return <p className="text-[12px] opacity-70">No news yet.</p>;

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 overflow-auto border border-accent-border bg-surface rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] p-3">
				<div className="flex flex-col gap-3 text-[12px] leading-relaxed">
					{posts.map((p) => (
						<article key={p.id}>
							<h3 className="font-bold text-accent-dark">{p.title}</h3>
							<div className="whitespace-pre-wrap">{p.body}</div>
						</article>
					))}
				</div>
			</div>
			<div className="mt-3 flex items-center gap-2 pt-2">
				<span className="rounded-full border border-accent-border/60 bg-chrome/70 px-2 py-0.5 text-[11px] opacity-80">Press &amp; announcements</span>
			</div>
		</div>
	);
}

function formatDuration(ms: number): string {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	return h > 0
		? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
		: `${m}:${String(s).padStart(2, "0")}`;
}

function GuestlistWindow() {
	const [guests, setGuests] = useState<Guest[] | null>(null);
	const [error, setError] = useState("");
	const [me, setMe] = useState<{ name: string; durationMs: number } | null>(null);

	useEffect(() => {
		api.gameGuests()
			.then((list) => setGuests([...list].sort((a, b) => a.durationMs - b.durationMs)))
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load the guest list"));
		api.gameMe()
			.then((res) => setMe(res.guest))
			.catch(() => setMe(null));
	}, []);

	if (error) return <p className="text-[12px] text-red-700">{error}</p>;
	if (!guests) return <p className="text-[12px] opacity-60">Loading…</p>;

	return (
		<div className="flex h-full flex-col text-[12px]">
			{me && (
				<div className="mb-2 border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] p-2 text-[11px]">
					You&apos;re on the list, <span className="font-bold">{me.name}</span> — time {formatDuration(me.durationMs)}.
				</div>
			)}
			<p className="mb-1.5 text-[11px] opacity-70">
				Everyone who has beaten the hidden challenge. Fastest at the top.
			</p>
			<div className="min-h-0 flex-1 overflow-auto border border-accent-border bg-surface rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
				{guests.length === 0 ? (
					<p className="p-2 opacity-60">The list is empty — nobody has made it yet.</p>
				) : (
					<table className="w-full border-collapse text-left">
						<thead>
							<tr>
								<th className="border-b border-b-accent-border bg-chrome px-2 py-1.5 text-[11px] font-bold">#</th>
								<th className="border-b border-b-accent-border bg-chrome px-2 py-1.5 text-[11px] font-bold">Name</th>
								<th className="border-b border-b-accent-border bg-chrome px-2 py-1.5 text-[11px] font-bold">Time</th>
								<th className="border-b border-b-accent-border bg-chrome px-2 py-1.5 text-[11px] font-bold">Added</th>
							</tr>
						</thead>
						<tbody>
							{guests.map((g, i) => {
								const isMe = me?.name === g.name && me.durationMs === g.durationMs;
								return (
									<tr key={g.id} className={isMe ? "bg-accent-soft font-bold" : "hover:bg-accent/10 rounded-md"}>
										<td className="px-2 py-1.5 opacity-60">{i + 1}</td>
										<td className="px-2 py-1.5">
											{g.name}
											{isMe && <span className="ml-1 text-[10px] font-bold">(you)</span>}
										</td>
										<td className="px-2 py-1.5 tabular-nums">{formatDuration(g.durationMs)}</td>
										<td className="px-2 py-1.5 opacity-60">
											{new Date(g.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

function AdminWindow() {
	const { user, loading } = useAuth();

	if (loading) return <p className="text-[12px] opacity-60">Loading…</p>;
	if (!user) {
		return (
			<div className="flex h-full flex-col">
				<p className="mb-2 text-[12px]">Log in to edit site content.</p>
				<AuthWindow />
			</div>
		);
	}

	return (
		<TabbedEditors
			tabs={[
				{
					label: "Settings",
					content: (
						<ConfigEditor
							fields={CONFIG_FIELDS}
							fetchConfig={() => api.getConfig()}
							saveConfig={(patch) => api.patchConfig(patch)}
						/>
					),
				},
				{
					label: "Tour dates",
					content: (
						<CrudEditor
							title="Tour dates"
							fields={TOUR_FIELDS}
							fetchItems={() => api.getTourDates()}
							createItem={(data) => api.tourDates.create(data)}
							updateItem={(id, data) => api.tourDates.update(id, data)}
							deleteItem={(id) => api.tourDates.remove(id)}
						/>
					),
				},
				{
					label: "News",
					content: (
						<CrudEditor
							title="Blog posts"
							fields={BLOG_FIELDS}
							fetchItems={() => api.getBlogPosts()}
							createItem={(data) => api.blogPosts.create(data)}
							updateItem={(id, data) => api.blogPosts.update(id, data)}
							deleteItem={(id) => api.blogPosts.remove(id)}
						/>
					),
				},
				{
					label: "Videos",
					content: (
						<CrudEditor
							title="Videos"
							fields={VIDEO_FIELDS}
							fetchItems={() => api.getVideos()}
							createItem={(data) => api.videos.create(data)}
							updateItem={(id, data) => api.videos.update(id, data)}
							deleteItem={(id) => api.videos.remove(id)}
						/>
					),
				},
				{
					label: "Links",
					content: (
						<CrudEditor
							title="Links"
							fields={LINK_FIELDS}
							fetchItems={() => api.getLinks()}
							createItem={(data) => api.links.create(data)}
							updateItem={(id, data) => api.links.update(id, data)}
							deleteItem={(id) => api.links.remove(id)}
						/>
					),
				},
			]}
		/>
	);
}

function SpotifyAuthFrame() {
	// This window is only shown after the silent connect flow failed, i.e.
	// Spotify requires the user to click through its login page (which blocks
	// framing, so it must be a popup). The button opens that popup; when the
	// OAuth callback posts the result we notify the player and close.
	const [waiting, setWaiting] = useState(false);
	const popupRef = useRef<Window | null>(null);

	const closeAll = useCallback(() => {
		popupRef.current?.close();
		window.dispatchEvent(new Event(SPOTIFY_AUTH_CLOSE_EVENT));
	}, []);

	const openLogin = useCallback(() => {
		const popup = window.open("/api/spotify-auth/auth", "dupontdoku-spotify-auth", "width=480,height=720");
		if (!popup) {
			// popup blocked — fall back to a full-page navigation; a client-side
			// route change would not follow the OAuth redirect properly
			// eslint-disable-next-line @next/next/no-location-assign-relative-destination
			window.location.assign("/api/spotify-auth/auth");
			return;
		}
		popupRef.current = popup;
		setWaiting(true);
	}, []);

	useEffect(() => {
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
			if (payload?.type === SPOTIFY_CONNECTED_EVENT) {
				// tell the player to fetch a token, then close this window
				window.dispatchEvent(new Event(SPOTIFY_CONNECTED_EVENT));
				closeAll();
			}
		};
		window.addEventListener("message", onMessage);
		// if the user closes the popup without logging in, restore the button
		const poll = setInterval(() => {
			if (popupRef.current?.closed) setWaiting(false);
		}, 500);
		return () => {
			window.removeEventListener("message", onMessage);
			clearInterval(poll);
		};
	}, [closeAll]);

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center gap-2 border-b border-b-accent-border/60 bg-accent-soft/60 px-2 py-1 text-[11px]">
				<span className="rounded-full border border-accent-border/60 bg-surface px-2 py-0.5 font-bold text-accent-dark">Spotify</span>
				<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-2 py-0.5 hover:bg-accent-soft active:translate-y-px" onClick={closeAll}>
					Close
				</button>
			</div>
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src="/icons/48/music.png" alt="" className="h-12 w-12" />
				<div className="text-[13px] font-bold">Connect your Spotify account</div>
				<p className="max-w-64 text-[11px] leading-snug opacity-70">
					Full-track playback uses your own Spotify Premium account. A Spotify login
					window will open — this site never sees your password.
				</p>
				<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-4 py-1 text-[12px] font-bold hover:bg-accent-soft active:translate-y-px" onClick={openLogin}>
					{waiting ? "Waiting for login…" : "Open Spotify login"}
				</button>
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
	const [config, setConfig] = useState<SiteConfig | null>(null);

	useEffect(() => {
		api.getConfig()
			.then(setConfig)
			.catch(() => setConfig(null));
	}, []);

	switch (section) {
		case "media":
			return <MediaPlayerWindow />;
		case "news":
			return <NewsWindow />;
		case "guestlist":
			return <GuestlistWindow />;
		case "admin":
			return <AdminWindow />;
		case "spotifyAuth":
			return <SpotifyAuthFrame />;
		default:
			return <HomeWindow config={config} onOpenSection={onOpenSection} />;
	}
}
export default function Home() {
	const isMobile = useIsMobile();
	const [startOpen, setStartOpen] = useState(false);
	const [powerState, setPowerState] = useState<"on" | "booting" | "guestlist">("on");
	const [bootCode, setBootCode] = useState<string | null>(null);
	// taskbar/stack order: append-only, ordered by time opened
	const [wins, setWins] = useState<WinState[]>(
		DEFAULT_OPEN.map((id) => ({ id, minimized: false, maximized: false })),
	);
	// paint order, separate from the taskbar stack
	const [zOrder, setZOrder] = useState<SectionId[]>([...DEFAULT_OPEN]);
	const [clock, setClock] = useState("");
	const [startLinks, setStartLinks] = useState<LinkItem[]>([]);

	const bringToFront = useCallback((id: SectionId) => {
		setZOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((w) => w !== id), id]));
	}, []);

	const openSection = useCallback((id: SectionId) => {
		setWins((prev) =>
			prev.some((w) => w.id === id)
				? prev.map((w) => (w.id === id ? { ...w, minimized: false } : w))
				: [...prev, { id, minimized: false, maximized: false }],
		);
		bringToFront(id);
		setStartOpen(false);
	}, [bringToFront]);

	const commitPos = useCallback((id: SectionId, pos: Point) => {
		setWins((prev) => prev.map((w) => (w.id === id ? { ...w, pos } : w)));
	}, []);

	useEffect(() => {
		const tick = () =>
			setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
		tick();
		const id = setInterval(tick, 10_000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		api.getLinks()
			.then((list) => setStartLinks(list.filter((l) => l.location === "start")))
			.catch(() => setStartLinks([]));
	}, []);

	// a winner's browser carries a signed guest cookie — any refresh lands
	// straight on the guestlist desktop
	useEffect(() => {
		fetch("/api/game/me", { credentials: "include" })
			.then((r) => r.json())
			.then((data: { guest: { name: string } | null }) => {
				if (data.guest) setPowerState("guestlist");
			})
			.catch(() => { });
	}, []);

	// the Spotify player asks the desktop to open the auth window
	// (instead of a browser popup)
	useEffect(() => {
		const onAuthOpen = () => openSection("spotifyAuth");
		const onAuthClose = () => {
			setWins((prev) => prev.filter((w) => w.id !== "spotifyAuth"));
		};
		window.addEventListener(SPOTIFY_AUTH_OPEN_EVENT, onAuthOpen);
		window.addEventListener(SPOTIFY_AUTH_CLOSE_EVENT, onAuthClose);
		return () => {
			window.removeEventListener(SPOTIFY_AUTH_OPEN_EVENT, onAuthOpen);
			window.removeEventListener(SPOTIFY_AUTH_CLOSE_EVENT, onAuthClose);
		};
	}, [openSection]);

	// taskbar keeps its open-order; clicking a non-minimized taskbar button
	// minimizes it, anything else focuses (and un-minimizes) it
	const taskbarClick = (id: SectionId, minimized: boolean) => {
		if (minimized) {
			openSection(id);
			return;
		}
		if (zOrder[zOrder.length - 1] === id) {
			setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
		} else {
			bringToFront(id);
		}
	};

	const minimizeSection = (id: SectionId) => {
		setWins((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
	};

	const toggleMaxSection = (id: SectionId) => {
		setWins((prev) => prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
	};

	const closeSection = (id: SectionId) => {
		setWins((prev) => prev.filter((w) => w.id !== id));
		setZOrder((prev) => prev.filter((w) => w !== id));
	};

	const desktopLinks = startLinks.filter((l) => l.location === "desktop");

	if (powerState === "booting") {
		return (
			<BootScreen
				onComplete={(code) => {
					setBootCode(code);
					setPowerState("guestlist");
				}}
			/>
		);
	}

	if (powerState === "guestlist") {
		return (
			<div className="relative h-full w-full overflow-hidden" style={{ zoom: "var(--desktop-scale)" }}>
				<div className="absolute top-2 left-2">
					<DesktopIcon icon="/icons/48/guestlist.png" label="Guest List" onOpen={() => {}} />
				</div>
				<div className="absolute top-16 left-1/2 w-105 -translate-x-1/2 rounded-xl border border-accent-border bg-chrome shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden">
					<div className="flex items-center gap-1.5 border-b border-b-accent-border/60 bg-chrome-deep px-2.5 py-1.5 font-bold text-ink">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/icons/16/guestlist.png" alt="" className="mr-1 h-4 w-4" />
						<span className="flex-1 truncate">Guest List</span>
					</div>
					<div className="bg-surface m-1.5 p-3 text-[12px] leading-relaxed rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]">
						<GuestlistPanel code={bootCode ?? ""} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="relative h-full w-full overflow-hidden"
			style={{ zoom: "var(--desktop-scale)" }}
		>
			<div className="absolute top-2 left-2 flex flex-col gap-1">
				<DesktopIcon icon="/icons/48/welcome.png" label="Home" onOpen={() => openSection("home")} />
				<DesktopIcon icon="/icons/48/music.png" label="Media Player" onOpen={() => openSection("media")} />
				<DesktopIcon icon="/icons/48/readme.png" label="News" onOpen={() => openSection("news")} />
				<DesktopIcon icon="/icons/48/guestlist.png" label="Guest List" onOpen={() => openSection("guestlist")} />
				{desktopLinks.map((l) => (
					<DesktopIcon key={l.id} icon={l.icon || "/icons/48/readme.png"} label={l.label} href={l.url} />
				))}
			</div>

			{isMobile ? (
				// small screens: windows become a non-draggable flex list
				<div className="absolute inset-x-0 bottom-8 top-0 flex flex-col gap-2 overflow-y-auto p-2">
					{wins.filter((w) => !w.minimized).map((w) => (
						<DraggableWindow
							key={w.id}
							section={w.id}
							minimized={false}
							maximized={false}
							mobile
							z={0}
							focused={false}
							onClose={() => closeSection(w.id)}
							onMinimize={() => minimizeSection(w.id)}
							onToggleMax={() => toggleMaxSection(w.id)}
							onOpenSection={openSection}
							onFocus={() => bringToFront(w.id)}
						/>
					))}
				</div>
			) : (
				// desktop: defaults strip left-to-right; windows opened manually
				// land on a random stored spot; dragging is free from the start
				wins.filter((w) => !w.minimized).map((w) => (
					<DraggableWindow
						key={w.id}
						section={w.id}
						minimized={false}
						maximized={w.maximized}
						initial={w.pos}
						onPosCommit={(pos) => commitPos(w.id, pos)}
						z={zOrder.indexOf(w.id) + 1}
						focused={zOrder[zOrder.length - 1] === w.id}
						onClose={() => closeSection(w.id)}
						onMinimize={() => minimizeSection(w.id)}
						onToggleMax={() => toggleMaxSection(w.id)}
						onOpenSection={openSection}
						onFocus={() => bringToFront(w.id)}
					/>
				))
			)}

			<div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[96%]">
				<div className="flex items-center gap-1.5 rounded-full border border-accent-border bg-chrome/85 px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
					<button
						className={`grid h-8 w-8 place-items-center rounded-full border border-accent-border text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${startOpen ? "bg-accent text-white" : "bg-chrome hover:bg-accent-soft active:translate-y-px"}`}
						onClick={() => setStartOpen((v) => !v)}
						aria-label="Start"
					>
						🪟
					</button>
					<div className="h-5 w-px bg-accent-border/60" />
					<div className="flex items-center gap-1">
						{wins.map((w) => {
							const isActive = !w.minimized && zOrder[zOrder.length - 1] === w.id;
							return (
								<button
									key={w.id}
									className={`flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors max-w-42 truncate text-[11px] ${isActive ? "border-accent-border bg-accent-soft font-bold text-ink" : "border-transparent bg-white/40 hover:bg-accent-soft"} ${w.minimized ? "opacity-60" : ""}`}
									onClick={() => taskbarClick(w.id, w.minimized)}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={SECTIONS[w.id].icon} alt="" className="h-3.5 w-3.5" />
									{SECTIONS[w.id].title.split(" - ")[0]}
								</button>
							);
						})}
					</div>
					<TaskbarAuth onOpenAdmin={() => openSection("admin")} />
					<div className="rounded-full bg-accent-soft/60 px-3 py-1 text-[11px]">
						<span className="tabular-nums">{clock}</span>
					</div>
				</div>
			</div>

			{startOpen && (
				<div className="absolute bottom-14 left-1/2 w-96 -translate-x-1/2 rounded-xl border border-accent-border bg-chrome shadow-[0_24px_60px_rgba(0,0,0,0.4)] overflow-hidden">
					<div className="flex items-center gap-2 bg-accent px-3 py-2 text-white">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/icons/16/welcome.png" alt="" className="h-5 w-5" />
						<span className="text-sm font-bold">Dupontdoku</span>
					</div>
					<div className="bg-surface">
						<div className="p-1.5">
							<button
								className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/10"
								onClick={() => openSection("admin")}
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src="/icons/16/guestlist.png" alt="" className="h-5 w-5" /> Content Manager
							</button>
						</div>
						<div className="mx-3 my-1 border-t border-t-accent-border/40" />
						<div className="p-1">
							{(() => {
								// group the start links by category with headings
								const groups: Record<string, LinkItem[]> = {};
								for (const l of startLinks) {
									(groups[l.category] ??= []).push(l);
								}
								const headings: Record<string, string> = {
									music: "Music",
									social: "Social",
									press: "Press",
									other: "",
								};
								return Object.entries(groups).map(([cat, items]) => (
									<div key={cat}>
										{headings[cat] !== undefined && headings[cat] !== "" && (
											<div className="px-2 pt-1 text-[10px] font-bold uppercase opacity-50">{headings[cat]}</div>
										)}
										{items.map((l) => (
											<a
												key={l.id}
												className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/10"
												href={l.url}
												target="_blank"
												rel="noopener noreferrer"
											>
												{l.icon ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img src={l.icon} alt="" className="h-5 w-5" />
												) : (
													<span className="h-5 w-5" />
												)}
												{l.label} <span className="ml-auto opacity-60">↗</span>
											</a>
										))}
									</div>
								));
							})()}
						</div>
						<div className="mx-3 my-1 border-t border-t-accent-border/40" />
						<div className="flex items-center justify-between p-1.5">
							<button
								className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/10"
								onClick={() => {
									setWins((prev) => prev.map((w) => ({ ...w, minimized: true })));
									setStartOpen(false);
								}}
							>
								<span className="text-lg">🔑</span> Log Off
							</button>
							<button
								className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent/10"
								onClick={() => {
									setWins([]);
									setStartOpen(false);
									// "turning off" actually boots into the hidden game
									setPowerState("booting");
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

function DesktopIcon({
	icon,
	label,
	onOpen,
	href,
}: {
	icon: string;
	label: string;
	onOpen?: () => void;
	href?: string;
}) {
	const content = (
		<>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={icon} alt="" className="h-9 w-9" />
			<span className="border border-transparent px-1 text-[11px] leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{label}</span>
		</>
	);
	if (href) {
		return (
			<a className="flex w-20 flex-col items-center gap-1 border border-transparent bg-transparent p-2 text-center focus:outline-none cursor-default hover:bg-white/15 rounded-lg backdrop-blur-[2px]" href={href} target="_blank" rel="noopener noreferrer">
				{content}
			</a>
		);
	}
	return (
		<button className="flex w-20 flex-col items-center gap-1 border border-transparent bg-transparent p-2 text-center focus:outline-none cursor-default hover:bg-white/15 rounded-lg backdrop-blur-[2px]" onClick={onOpen}>
			{content}
		</button>
	);
}

function TaskbarAuth({ onOpenAdmin }: { onOpenAdmin: () => void }) {
	const { user } = useAuth();
	return (
		<button
			className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-2 py-0.5 text-[11px] opacity-60"
			onClick={onOpenAdmin}
			title={user ? `Logged in as ${user.name}` : "Not logged in"}
		>
			<span>{user ? "👤" : "🔒"}</span>
		</button>
	);
}
