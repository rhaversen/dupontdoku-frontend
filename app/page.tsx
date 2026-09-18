"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoPlayer } from "./video-player";
import {
	SpotifyPlayer,
	SPOTIFY_CONNECTED_EVENT,
	SPOTIFY_AUTH_OPEN_EVENT,
	SPOTIFY_AUTH_CLOSE_EVENT,
} from "./spotify-player";
import AuthWindow from "./auth-window";
import ThemePicker from "./theme-picker";
import { BootScreen } from "./boot-screen";
import { GuestlistDesktop } from "./guestlist-desktop";
import { useAuth } from "./lib/auth";
import { api, type SiteConfig, type TourDate, type BlogPost, type VideoItem, type LinkItem, type Guest } from "./lib/api";
import { CrudEditor, ConfigEditor, TabbedEditors, type FieldDef } from "./editors";

type Point = { x: number; y: number };

type WinState = {
	id: SectionId;
	minimized: boolean;
	maximized: boolean;
	// fixed position per window: slot index in open order
	slot: number;
	// stored position for manually opened windows (random spot on the desktop)
	manualPos?: Point;
};

type SectionId =
	| "welcome"
	| "music"
	| "tour"
	| "about"
	| "videos"
	| "news"
	| "guestlist"
	| "admin"
	| "spotifyAuth";

const SECTIONS: Record<SectionId, { icon: string; title: string }> = {
	welcome: { icon: "/icons/48/welcome.png", title: "Welcome" },
	music: { icon: "/icons/48/music.png", title: "Music - Windows Media Player" },
	tour: { icon: "/icons/48/tour.png", title: "Tour Dates" },
	about: { icon: "/icons/48/readme.png", title: "README.TXT - Notepad" },
	videos: { icon: "/icons/48/videos.png", title: "Videos - Media Player" },
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
	{ key: "notes", label: "Notes", optional: true },
	{ key: "sortOrder", label: "Sort", type: "number", default: 0 },
];

const BLOG_FIELDS: FieldDef[] = [
	{ key: "title", label: "Title" },
	{ key: "slug", label: "Slug" },
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
	{ key: "welcomeMessage", label: "Welcome message", type: "textarea" },
	{ key: "heroText", label: "Bio (README)", type: "textarea" },
	{ key: "contactEmail", label: "Contact email" },
	{ key: "generalTicketUrl", label: "General ticket URL" },
	{ key: "footerNote", label: "Footer note" },
];

const DESKTOP_WINDOW_WIDTHS: Partial<Record<SectionId, number>> = {
	videos: 520,
	spotifyAuth: 460,
	tour: 460,
	news: 380,
	about: 360,
	music: 420,
	admin: 520,
	guestlist: 380,
};

// arranged so the default open windows form a tidy cascade
// only these open by default: welcome, links (README/about) and tour dates
const DEFAULT_OPEN: SectionId[] = ["welcome", "tour", "about"];

// horizontal strip layout for the default windows: side by side on the same
// height, evenly spaced inside the viewport. The available width is measured
// (accounting for the desktop zoom) so the strip can never spill off-screen;
// window widths shrink proportionally if needed.
const ROW_ORIGIN = { x: 170, y: 40 };
const ROW_GAP = 16;
const ROW_MARGIN_RIGHT = 24;
const MIN_WINDOW_WIDTH = 280;

function useDesktopLayout() {
	const [viewport, setViewport] = useState({ w: 1280, h: 800 });
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const measure = () => {
			setViewport({ w: window.innerWidth, h: window.innerHeight });
			const raw = getComputedStyle(document.documentElement).getPropertyValue("--desktop-scale");
			const parsed = Number.parseFloat(raw);
			setScale(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
		};
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);

	// CSS-pixel space inside the zoomed container = viewport / scale
	const available = Math.max(400, viewport.w / scale - ROW_ORIGIN.x - ROW_MARGIN_RIGHT);

	const widths = DEFAULT_OPEN.map((id) => DESKTOP_WINDOW_WIDTHS[id] ?? 400);
	const naturalTotal = widths.reduce((a, b) => a + b, 0) + ROW_GAP * (widths.length - 1);
	// shrink all windows proportionally when the natural total overflows
	const shrink = naturalTotal > available ? (available - ROW_GAP * (widths.length - 1)) / widths.reduce((a, b) => a + b, 0) : 1;
	const fitted = widths.map((w) => Math.max(MIN_WINDOW_WIDTH, Math.round(w * shrink)));

	// distribute whatever space is left as even gaps between the windows
	const total = fitted.reduce((a, b) => a + b, 0);
	const gap = widths.length > 1 ? Math.max(8, (available - total) / (widths.length - 1)) : 0;

	const positions: Record<string, Point> = {};
	const windowWidths: Record<string, number> = {};
	let x = ROW_ORIGIN.x;
	DEFAULT_OPEN.forEach((id, i) => {
		positions[id] = { x: Math.round(x), y: ROW_ORIGIN.y };
		windowWidths[id] = fitted[i];
		x += fitted[i] + gap;
	});

	return { positions, windowWidths, scale };
}

// random desktop spot for manually opened windows, clamped to stay on screen
function randomPosition(): Point {
	const maxW = typeof window !== "undefined" ? window.innerWidth : 1280;
	const maxH = typeof window !== "undefined" ? window.innerHeight : 800;
	const x = Math.random() * Math.max(80, maxW - 480) + 60;
	const y = Math.random() * Math.max(60, maxH - 420) + 30;
	return { x: Math.round(x), y: Math.round(y) };
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
	widthOverride?: number;
	mobile?: boolean;
}) {
	const [pos, setPos] = useState<Point>(initial ?? { x: 80, y: 60 });
	const [offset, setOffset] = useState<Point | null>(null);
	const meta = SECTIONS[section];

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
			setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
		},
		[offset],
	);

	const endDrag = useCallback(() => setOffset(null), []);

	if (minimized) return null;

	// mobile layout: static flex-list card — full width, no dragging, and the
	// window controls are hidden so windows can only be switched, not closed
	if (mobile) {
		return (
			<div className="xp-window relative flex w-full flex-col" onPointerDown={onFocus}>
				<div className="xp-title cursor-default">
					<span className="xp-title-icon mr-1">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={meta.icon} alt="" className="h-4 w-4" />
					</span>
					<span className="flex-1 truncate">{meta.title}</span>
				</div>
				<div className="max-h-[65vh] min-h-0 overflow-auto p-3">
					<SectionContent section={section} onOpenSection={onOpenSection} />
				</div>
			</div>
		);
	}

	return (
		<div
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
			<div className={`xp-window flex h-full flex-col ${focused ? "focused" : ""}`}>
				<div
					className={`xp-title ${focused ? "" : "inactive"}`}
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
					<button className="xp-title-btn min" aria-label="Minimize" onPointerDown={(e) => { e.preventDefault(); onMinimize(); }}>
						<span className="-mt-1">_</span>
					</button>
					<button className="xp-title-btn max" aria-label="Maximize" onPointerDown={(e) => { e.preventDefault(); onToggleMax(); }}>
						<span className="text-[10px]">▢</span>
					</button>
					<button className="xp-title-btn close ml-1" aria-label="Close" onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
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

function TourWindow({ config }: { config: SiteConfig | null }) {
	const [dates, setDates] = useState<TourDate[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		api.getTourDates()
			.then((list) => setDates([...list].sort((a, b) => a.sortOrder - b.sortOrder)))
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load tour dates"));
	}, []);

	if (error) return <p className="text-[12px] text-red-700">{error}</p>;
	if (!dates) return <p className="text-[12px]">Loading…</p>;
	if (dates.length === 0) return <p className="text-[12px] opacity-70">No dates announced yet — check back soon.</p>;

	return (
		<div className="flex h-full flex-col">
			<div className="xp-toolbar -mx-3 -mt-3 mb-2">
				<span className="xp-toolbar-btn font-bold">📅 Tour Dates</span>
				<span className="ml-auto pr-1 text-[10px] opacity-60">Dupont — Denmark</span>
			</div>
			<div className="xp-inset min-h-0 flex-1 overflow-auto rounded-sm">
				<table className="w-full border-collapse text-left">
					<thead>
						<tr>
							<th className="border border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 text-left font-normal">Date</th>
							<th className="border border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 text-left font-normal">City</th>
							<th className="border border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 text-left font-normal">Venue</th>
						</tr>
					</thead>
					<tbody>
						{dates.map((d) => (
							<tr key={d.id} className="hover:bg-[#cde5ff]">
								<td className="px-2 py-1">{d.eventDate}</td>
								<td className="px-2 py-1">{d.city}</td>
								<td className="px-2 py-1">
									{d.venue}
									{d.notes ? <span className="ml-1 opacity-60">{d.notes}</span> : null}
									{d.ticketUrl && (
										<a
											className="ml-2 text-[11px] text-[#0000cc] underline"
											href={d.ticketUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											Tickets →
										</a>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="xp-statusbar mt-2">
				<span className="xp-status-cell">{dates.length} dates found</span>
				{config?.generalTicketUrl && (
					<a
						className="xp-btn ml-auto px-3 py-0.5 no-underline"
						href={config.generalTicketUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Get Tickets →
					</a>
				)}
			</div>
			{config?.contactEmail && (
				<a className="mt-1.5 text-right text-[10px] text-[#0000cc] underline" href={`mailto:${config.contactEmail}`}>
					Questions? {config.contactEmail}
				</a>
			)}
		</div>
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
	if (!posts) return <p className="text-[12px]">Loading…</p>;
	if (posts.length === 0) return <p className="text-[12px] opacity-70">No news yet.</p>;

	return (
		<div className="flex h-full flex-col">
			<div className="xp-toolbar -mx-3 -mt-3 mb-2">
				<span className="xp-toolbar-btn font-bold">📰 News</span>
				<span className="ml-auto pr-1 text-[10px] opacity-60">{posts.length} posts</span>
			</div>
			<div className="xp-inset min-h-0 flex-1 overflow-auto rounded-sm p-2">
				<div className="flex flex-col gap-3 font-mono text-[11px]">
					{posts.map((p) => (
						<article key={p.id}>
							<h3 className="font-bold">{p.title}</h3>
							<div className="whitespace-pre-wrap">{p.body}</div>
						</article>
					))}
				</div>
			</div>
			<div className="xp-statusbar mt-2">
				<span className="xp-status-cell">Press & announcements</span>
			</div>
		</div>
	);
}

function VideosWindow() {
	const [videos, setVideos] = useState<VideoItem[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		api.getVideos()
			.then((list) => setVideos([...list].sort((a, b) => a.sortOrder - b.sortOrder)))
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load videos"));
	}, []);

	if (error) return <p className="text-[12px] text-red-700">{error}</p>;
	if (!videos) return <p className="text-[12px]">Loading…</p>;
	if (videos.length === 0) return <p className="text-[12px] opacity-70">No videos yet.</p>;

	return (
		<VideoPlayer
			videos={videos.map((v) => ({ id: v.youtubeId, title: v.title, subtitle: v.subtitle }))}
		/>
	);
}

function AboutWindow({ config }: { config: SiteConfig | null }) {
	const [links, setLinks] = useState<LinkItem[]>([]);

	useEffect(() => {
		api.getLinks()
			.then((list) => setLinks(list.filter((l) => l.location === "window")))
			.catch(() => setLinks([]));
	}, []);

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-48 flex-1 overflow-auto bg-white p-2 font-mono text-[11px] whitespace-pre-wrap">
				{[
					"README.TXT",
					"",
					config?.heroText || "",
					"",
					`Contact: ${config?.contactEmail || "—"}`,
				]
					.join("\n")
					.trim()}
			</div>
			{links.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1">
					{links.map((l) => (
						<a
							key={l.id}
							className="xp-btn text-center no-underline"
							href={l.url}
							target="_blank"
							rel="noopener noreferrer"
						>
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
	if (!guests) return <p className="text-[12px]">Loading…</p>;

	return (
		<div className="flex h-full flex-col text-[12px]">
			{me && (
				<div className="mb-2 rounded bg-[#e6e3d3] p-1.5 text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.15)]">
					You&apos;re on the list, <span className="font-bold">{me.name}</span> — time {formatDuration(me.durationMs)}.
				</div>
			)}
			<p className="mb-1 text-[11px] opacity-70">
				Everyone who has beaten the hidden challenge. Fastest at the top.
			</p>
			<div className="xp-inset min-h-0 flex-1 overflow-auto rounded-sm bg-white">
				{guests.length === 0 ? (
					<p className="p-2 opacity-60">The list is empty — nobody has made it yet.</p>
				) : (
					<table className="w-full border-collapse text-left">
						<thead>
							<tr>
								<th className="border-b border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 font-normal">#</th>
								<th className="border-b border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 font-normal">Name</th>
								<th className="border-b border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 font-normal">Time</th>
								<th className="border-b border-[#d5d2c8] bg-[#ece9d8] px-2 py-1 font-normal">Added</th>
							</tr>
						</thead>
						<tbody>
							{guests.map((g, i) => {
								const isMe = me?.name === g.name && me.durationMs === g.durationMs;
								return (
									<tr key={g.id} className="hover:bg-[#cde5ff]">
										<td className="px-2 py-1 opacity-60">{i + 1}</td>
										<td className="px-2 py-1">
											{g.name}
											{isMe && <span className="ml-1 text-[10px] font-bold text-[#316ac5]">(you)</span>}
										</td>
										<td className="px-2 py-1 tabular-nums">{formatDuration(g.durationMs)}</td>
										<td className="px-2 py-1 opacity-60">
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

	if (loading) return <p className="text-[12px]">Loading…</p>;
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
			<div className="flex items-center gap-2 border-b border-[#d5d2c8] bg-[#ece9d8] px-2 py-0.5 text-[11px]">
				<span className="rounded-sm border border-[#7f9db9] bg-white px-2 py-0.5">Spotify</span>
				<button className="xp-btn px-2 py-0.5" onClick={closeAll}>
					Close
				</button>
			</div>
			<div className="flex flex-1 flex-col items-center justify-center gap-3 bg-white p-4 text-center">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src="/icons/48/music.png" alt="" className="h-12 w-12" />
				<div className="text-[13px] font-bold">Connect your Spotify account</div>
				<p className="max-w-64 text-[11px] leading-snug opacity-70">
					Full-track playback uses your own Spotify Premium account. A Spotify login
					window will open — this site never sees your password.
				</p>
				<button className="xp-btn px-4 py-1 text-[12px]" onClick={openLogin}>
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
		case "music":
			return <SpotifyPlayer />;
		case "tour":
			return <TourWindow config={config} />;
		case "news":
			return <NewsWindow />;
		case "videos":
			return <VideosWindow />;
		case "about":
			return <AboutWindow config={config} />;
		case "guestlist":
			return <GuestlistWindow />;
		case "admin":
			return <AdminWindow />;
		case "spotifyAuth":
			return <SpotifyAuthFrame />;
		default:
			return <WelcomeWindow config={config} onOpenSection={onOpenSection} />;
	}
}

// XP "Welcome to Windows"-style landing: blue banner, bio, big task links
function WelcomeWindow({
	config,
	onOpenSection,
}: {
	config: SiteConfig | null;
	onOpenSection: (id: SectionId) => void;
}) {
	const [links, setLinks] = useState<LinkItem[]>([]);

	useEffect(() => {
		api.getLinks()
			.then((list) => setLinks(list.filter((l) => l.location === "window" && l.category === "social")))
			.catch(() => setLinks([]));
	}, []);

	return (
		<div className="flex h-full flex-col">
			<div className="rounded-sm bg-linear-to-r from-[#0058e6] via-[#3f8cf3] to-[#0058e6] p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
				<div className="flex items-center gap-2">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src="/icons/48/welcome.png" alt="" className="h-9 w-9 drop-shadow" />
					<div className="text-lg font-bold italic" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}>
						Dupont
					</div>
					<div className="ml-auto text-[10px] opacity-80">Denmark</div>
				</div>
			</div>
			<div className="xp-inset mt-2 flex-1 overflow-auto rounded-sm p-2 text-[11px] leading-snug">
				{config?.welcomeMessage || "Welcome."}
			</div>
			<div className="mt-2 border-t border-[#d5d2c8] pt-2">
				<div className="mb-1 text-[10px] font-bold uppercase opacity-50">Explore</div>
				<div className="flex flex-col">
					<button className="xp-welcome-link text-left text-[12px]" onClick={() => onOpenSection("music")}>
						<span className="w-4 text-center">▸</span> Play the music
					</button>
					<button className="xp-welcome-link text-left text-[12px]" onClick={() => onOpenSection("tour")}>
						<span className="w-4 text-center">▸</span> See tour dates
					</button>
					<button className="xp-welcome-link text-left text-[12px]" onClick={() => onOpenSection("videos")}>
						<span className="w-4 text-center">▸</span> Watch the videos
					</button>
					<button className="xp-welcome-link text-left text-[12px]" onClick={() => onOpenSection("news")}>
						<span className="w-4 text-center">▸</span> Read the news
					</button>
				</div>
				{links.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1 border-t border-[#d5d2c8] pt-2">
						{links.map((l) => (
							<a key={l.id} className="xp-btn text-[10px] no-underline" href={l.url} target="_blank" rel="noopener noreferrer">
								{l.label}
							</a>
						))}
					</div>
				)}
			</div>
			{config?.footerNote && <div className="xp-statusbar mt-2 -mx-3 -mb-3">{config.footerNote}</div>}
		</div>
	);
}

export default function Home() {
	const isMobile = useIsMobile();
	const [startOpen, setStartOpen] = useState(false);
	const [powerState, setPowerState] = useState<"on" | "booting" | "guestlist">("on");
	const [bootCode, setBootCode] = useState<string | null>(null);
	// taskbar/stack order: append-only, ordered by time opened
	const [wins, setWins] = useState<WinState[]>(
		DEFAULT_OPEN.map((id, slot) => ({ id, minimized: false, maximized: false, slot })),
	);
	// paint order, separate from the taskbar stack
	const [zOrder, setZOrder] = useState<SectionId[]>([...DEFAULT_OPEN]);
	const nextSlotRef = useRef(DEFAULT_OPEN.length);
	const [clock, setClock] = useState("");
	const [startLinks, setStartLinks] = useState<LinkItem[]>([]);

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

	const bringToFront = useCallback((id: SectionId) => {
		setZOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((w) => w !== id), id]));
	}, []);

	const openSection = useCallback((id: SectionId) => {
		setWins((prev) =>
			prev.some((w) => w.id === id)
				? prev.map((w) => (w.id === id ? { ...w, minimized: false } : w))
				: [
					...prev,
					{
						id,
						minimized: false,
						maximized: false,
						slot: nextSlotRef.current++,
						// only windows opened after load get a random spot;
						// defaults keep their row slot
						manualPos: randomPosition(),
					},
				],
		);
		bringToFront(id);
		setStartOpen(false);
	}, [bringToFront]);

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
	const layout = useDesktopLayout();

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
		return <GuestlistDesktop code={bootCode ?? ""} />;
	}

	return (
		<div
			className="relative h-full w-full overflow-hidden"
			style={{ zoom: "var(--desktop-scale)" }}
		>
			<div className="absolute top-2 left-2 flex flex-col gap-1">
				<DesktopIcon icon="/icons/48/readme.png" label="README.TXT" onOpen={() => openSection("about")} />
				<DesktopIcon icon="/icons/48/music.png" label="Music" onOpen={() => openSection("music")} />
				<DesktopIcon icon="/icons/48/videos.png" label="Videos" onOpen={() => openSection("videos")} />
				<DesktopIcon icon="/icons/48/tour.png" label="Tour Dates" onOpen={() => openSection("tour")} />
				<DesktopIcon icon="/icons/48/guestlist.png" label="Guest List" onOpen={() => openSection("guestlist")} />
				<DesktopIcon icon="/icons/48/readme.png" label="News" onOpen={() => openSection("news")} />
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
						initial={w.manualPos ?? layout.positions[w.id] ?? { x: 170, y: 40 }}
						widthOverride={layout.windowWidths[w.id]}
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

			<div className="absolute bottom-0 left-0 right-0">
				<div className="xp-taskbar flex items-center gap-1.5 pr-1">
					<button className="xp-start-btn" onClick={() => setStartOpen((v) => !v)}>
						<span>🪟</span> start
					</button>
					<div className="flex flex-1 items-center gap-1">
						{wins.map((w) => {
							const isActive = !w.minimized && zOrder[zOrder.length - 1] === w.id;
							return (
								<button
									key={w.id}
									className={`xp-task-btn ${isActive ? "active" : ""} ${w.minimized ? "opacity-70" : ""}`}
									onClick={() => taskbarClick(w.id, w.minimized)}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={SECTIONS[w.id].icon} alt="" className="mr-1 inline h-3.5 w-3.5" />
									{SECTIONS[w.id].title.split(" - ")[0]}
								</button>
							);
						})}
					</div>
					<TaskbarAuth onOpenAdmin={() => openSection("admin")} />
					<ThemePicker />
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
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src="/icons/16/welcome.png" alt="" className="h-5 w-5" /> Welcome
							</button>
							<button
								className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#316ac5] hover:text-white"
								onClick={() => openSection("admin")}
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src="/icons/16/guestlist.png" alt="" className="h-5 w-5" /> Content Manager
							</button>
						</div>
						<div className="mx-1 border-t border-[#d5d2c8]" />
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
												className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#316ac5] hover:text-white"
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
			<img src={icon} alt="" className="h-9 w-9 drop-shadow-[1px_1px_2px_rgba(0,0,0,0.6)]" />
			<span
				className="icon-label rounded px-1 text-[11px] leading-tight text-white"
				style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.9)" }}
			>
				{label}
			</span>
		</>
	);
	const cls =
		"flex w-20 flex-col items-center gap-1 rounded p-2 text-center focus:outline-none cursor-default";
	if (href) {
		return (
			<a className={`${cls} xp-desktop-icon`} href={href} target="_blank" rel="noopener noreferrer">
				{content}
			</a>
		);
	}
	return (
		<button className={`${cls} xp-desktop-icon`} onClick={onOpen}>
			{content}
		</button>
	);
}

function TaskbarAuth({ onOpenAdmin }: { onOpenAdmin: () => void }) {
	const { user } = useAuth();
	return (
		<button
			className="xp-task-btn"
			onClick={onOpenAdmin}
			title={user ? `Logged in as ${user.name}` : "Not logged in"}
		>
			<span>{user ? "👤" : "🔒"}</span>
		</button>
	);
}
