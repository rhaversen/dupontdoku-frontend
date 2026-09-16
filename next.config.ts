import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5175";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{ source: "/api/spotify", destination: `${BACKEND_URL}/api/spotify` },
			{ source: "/api/spotify-auth/:path*", destination: `${BACKEND_URL}/api/spotify-auth/:path*` },
			{ source: "/api/instagram", destination: `${BACKEND_URL}/api/instagram` },
		];
	},
};

export default nextConfig;
