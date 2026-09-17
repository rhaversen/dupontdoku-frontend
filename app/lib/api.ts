export type TourDate = {
	id: string;
	eventDate: string;
	city: string;
	venue: string;
	ticketUrl: string;
	notes: string;
	sortOrder: number;
};

export type BlogPost = {
	id: string;
	title: string;
	body: string;
	slug: string;
	published: boolean;
};

export type VideoItem = {
	id: string;
	youtubeId: string;
	title: string;
	subtitle: string;
	sortOrder: number;
};

export type LinkItem = {
	id: string;
	label: string;
	url: string;
	icon: string;
	location: "start" | "desktop" | "window";
	category: string;
	sortOrder: number;
};

export type SiteConfig = {
	welcomeMessage: string;
	contactEmail: string;
	heroText: string;
	footerNote: string;
	generalTicketUrl: string;
};

export type CurrentUser = {
	id: string;
	name: string;
};

export type Guest = {
	id: string;
	name: string;
	durationMs: number;
	createdAt: string;
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, { credentials: "include", ...init });
	if (!res.ok) {
		throw new Error(`${res.status} ${res.statusText}`);
	}
	return res.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
	return {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}

function crud<T>(path: string) {
	return {
		getAll: () => getJson<T[]>(path),
		create: (data: Record<string, unknown>) => getJson<T>(path, jsonInit("POST", data)),
		update: (id: string, data: Record<string, unknown>) => getJson<T>(`${path}/${id}`, jsonInit("PATCH", data)),
		remove: (id: string) => getJson<{ ok: boolean }>(`${path}/${id}`, { method: "DELETE" }),
	};
}

export const api = {
	getConfig: () => getJson<SiteConfig>("/api/config"),
	patchConfig: (patch: Partial<SiteConfig>) => getJson<SiteConfig>("/api/config", jsonInit("PATCH", patch)),
	getTourDates: () => getJson<TourDate[]>("/api/tour-dates"),
	getBlogPosts: () => getJson<BlogPost[]>("/api/blog-posts"),
	getVideos: () => getJson<VideoItem[]>("/api/videos"),
	getLinks: () => getJson<LinkItem[]>("/api/links"),

	tourDates: crud<TourDate>("/api/tour-dates"),
	blogPosts: crud<BlogPost>("/api/blog-posts"),
	videos: crud<VideoItem>("/api/videos"),
	links: crud<LinkItem>("/api/links"),

	me: () => getJson<{ authenticated: boolean; user?: CurrentUser }>("/api/auth/me"),
	register: (name: string, password: string, inviteCode: string) =>
		getJson<CurrentUser>("/api/auth/register", jsonInit("POST", { name, password, inviteCode })),
	login: (name: string, password: string) =>
		getJson<CurrentUser>("/api/auth/login", jsonInit("POST", { name, password })),
	logout: () => getJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

	gameGuests: () => getJson<Guest[]>("/api/game/guests"),
	gameMe: () => getJson<{ guest: { name: string; durationMs: number } | null }>("/api/game/me"),
};
