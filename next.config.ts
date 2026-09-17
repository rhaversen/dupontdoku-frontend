import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5175";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{ source: "/api/spotify", destination: `${BACKEND_URL}/api/spotify` },
			{ source: "/api/spotify-auth/:path*", destination: `${BACKEND_URL}/api/spotify-auth/:path*` },
			{ source: "/api/instagram", destination: `${BACKEND_URL}/api/instagram` },
			{ source: "/api/auth/:path*", destination: `${BACKEND_URL}/api/auth/:path*` },
			{ source: "/api/config", destination: `${BACKEND_URL}/api/config` },
			{ source: "/api/tour-dates", destination: `${BACKEND_URL}/api/tour-dates` },
			{ source: "/api/blog-posts", destination: `${BACKEND_URL}/api/blog-posts` },
			{ source: "/api/videos", destination: `${BACKEND_URL}/api/videos` },
			{ source: "/api/links", destination: `${BACKEND_URL}/api/links` },
			{ source: "/api/game/:path*", destination: `${BACKEND_URL}/api/game/:path*` },
		];
	},
};

export default nextConfig;
