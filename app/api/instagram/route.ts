import { NextResponse } from "next/server";

type Post = {
	id: string;
	permalink: string;
	mediaUrl: string;
	mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
	caption: string;
	timestamp: string;
};

let cache: { at: number; posts: Post[] } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchPosts(): Promise<Post[]> {
	const token = process.env.INSTAGRAM_ACCESS_TOKEN;
	if (!token) {
		throw Object.assign(new Error("INSTAGRAM_ACCESS_TOKEN is not set"), { status: 501 });
	}

	const fields = "id,permalink,media_url,media_type,caption,timestamp";
	const url = `https://graph.instagram.com/me/media?fields=${fields}&access_token=${token}`;

	const posts: Post[] = [];
	let next: string | null = url;
	while (next && posts.length < 50) {
		const res = await fetch(next, { next: { revalidate: 600 } });
		if (!res.ok) {
			throw Object.assign(new Error(`Instagram API error ${res.status}`), { status: 502 });
		}
		const data = (await res.json()) as {
			data?: Post[];
			paging?: { next?: string };
		};
		posts.push(...(data.data ?? []));
		next = data.paging?.next ?? null;
	}
	return posts;
}

export async function GET() {
	if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
		return NextResponse.json({ posts: cache.posts });
	}

	try {
		const posts = await fetchPosts();
		cache = { at: Date.now(), posts };
		return NextResponse.json({ posts });
	} catch (err) {
		const status = (err as { status?: number }).status ?? 500;
		return NextResponse.json({ error: (err as Error).message }, { status });
	}
}
