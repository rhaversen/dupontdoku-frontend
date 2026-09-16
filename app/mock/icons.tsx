/* Original pixel-art icons for the /mock pages. All hand-drawn here — no
	 third-party artwork, so every mock is license-clean and swappable later. */

export function CassetteIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="1" y="3" width="14" height="10" fill="#2b2b2b" />
			<rect x="2" y="4" width="12" height="8" fill="#4a4a4a" />
			<rect x="3" y="5" width="10" height="4" fill="#d8c8a8" />
			<rect x="4" y="6" width="2" height="2" fill="#111" />
			<rect x="10" y="6" width="2" height="2" fill="#111" />
			<rect x="6" y="6" width="4" height="2" fill="#8a6a4c" />
			<rect x="4" y="11" width="2" height="1" fill="#e8e8e8" />
			<rect x="10" y="11" width="2" height="1" fill="#e8e8e8" />
		</svg>
	);
}

export function TicketIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="1" y="4" width="14" height="8" fill="#e8a33d" />
			<rect x="1" y="4" width="14" height="1" fill="#ffd98a" />
			<rect x="1" y="11" width="14" height="1" fill="#b5752a" />
			<rect x="5" y="4" width="1" height="8" fill="#b5752a" strokeDasharray="1 1" />
			<rect x="2" y="6" width="2" height="1" fill="#7a4e14" />
			<rect x="7" y="6" width="6" height="1" fill="#7a4e14" />
			<rect x="7" y="9" width="6" height="1" fill="#7a4e14" />
		</svg>
	);
}

export function FilmIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="2" y="2" width="12" height="12" fill="#1a1a1a" />
			<rect x="3" y="3" width="10" height="10" fill="#4a7fc1" />
			<rect x="4" y="4" width="8" height="3" fill="#8fc1e8" />
			<rect x="4" y="9" width="8" height="3" fill="#5a94d4" />
			<rect x="0" y="3" width="2" height="1" fill="#000" />
			<rect x="0" y="6" width="2" height="1" fill="#000" />
			<rect x="0" y="9" width="2" height="1" fill="#000" />
			<rect x="0" y="12" width="2" height="1" fill="#000" />
			<rect x="14" y="3" width="2" height="1" fill="#000" />
			<rect x="14" y="6" width="2" height="1" fill="#000" />
			<rect x="14" y="9" width="2" height="1" fill="#000" />
			<rect x="14" y="12" width="2" height="1" fill="#000" />
		</svg>
	);
}

export function LetterIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="1" y="3" width="14" height="10" fill="#f2efe6" />
			<rect x="1" y="3" width="14" height="1" fill="#fff" />
			<rect x="1" y="12" width="14" height="1" fill="#b8b4a8" />
			<path d="M1 3 L8 9 L15 3" fill="none" stroke="#8a8478" strokeWidth="1" />
			<rect x="2" y="11" width="12" height="1" fill="#d8d4c8" />
		</svg>
	);
}

export function CameraIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="1" y="5" width="14" height="8" fill="#55504a" />
			<rect x="1" y="5" width="14" height="1" fill="#8a8478" />
			<rect x="5" y="3" width="6" height="2" fill="#55504a" />
			<circle cx="8" cy="9" r="3" fill="#2c2a26" />
			<circle cx="8" cy="9" r="2" fill="#4a7fc1" />
			<circle cx="7" cy="8" r="0.5" fill="#bfe0ff" />
			<rect x="12" y="6" width="2" height="1" fill="#e8a33d" />
		</svg>
	);
}

export function NoteIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="3" y="2" width="10" height="12" fill="#fbf9f2" />
			<rect x="3" y="2" width="1" height="12" fill="#d8d4c8" />
			<rect x="5" y="4" width="6" height="1" fill="#8a8478" />
			<rect x="5" y="6" width="6" height="1" fill="#8a8478" />
			<rect x="5" y="8" width="6" height="1" fill="#8a8478" />
			<rect x="5" y="10" width="4" height="1" fill="#8a8478" />
			<rect x="3" y="2" width="10" height="1" fill="#e8a33d" />
		</svg>
	);
}

export function StarIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<path
				d="M8 1 L10 6 L15 6 L11 9 L13 14 L8 11 L3 14 L5 9 L1 6 L6 6 Z"
				fill="#ffd94a"
				stroke="#b5752a"
				strokeWidth="1"
			/>
		</svg>
	);
}

export function CalendarIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="2" y="3" width="12" height="11" fill="#fbf9f2" />
			<rect x="2" y="3" width="12" height="3" fill="#c14a3d" />
			<rect x="2" y="3" width="12" height="1" fill="#e87a6a" />
			<rect x="4" y="1" width="1" height="3" fill="#55504a" />
			<rect x="11" y="1" width="1" height="3" fill="#55504a" />
			<rect x="4" y="8" width="2" height="2" fill="#4a7fc1" />
			<rect x="7" y="8" width="2" height="2" fill="#8a8478" />
			<rect x="10" y="8" width="2" height="2" fill="#8a8478" />
			<rect x="4" y="11" width="2" height="2" fill="#8a8478" />
			<rect x="7" y="11" width="2" height="2" fill="#e8a33d" />
			<rect x="10" y="11" width="2" height="2" fill="#8a8478" />
		</svg>
	);
}

export function GlobeIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<circle cx="8" cy="8" r="6.5" fill="#3a7fb8" />
			<path d="M4 5 Q7 3 10 5 Q13 6 12 8 Q9 7 7 9 Q4 10 4 8 Z" fill="#5aa85a" />
			<path d="M9 10 Q11 9 12 10 Q11 13 9 12 Z" fill="#5aa85a" />
			<circle cx="8" cy="8" r="6.5" fill="none" stroke="#1c4a6a" />
		</svg>
	);
}

export function KeyIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<circle cx="5" cy="5" r="3.5" fill="none" stroke="#e8a33d" strokeWidth="2" />
			<path d="M7 8 L13 14" stroke="#e8a33d" strokeWidth="2" />
			<path d="M10 11 L11 10 M12 13 L13 12" stroke="#e8a33d" strokeWidth="2" />
		</svg>
	);
}

export function GuitarIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<rect x="10" y="1" width="1" height="6" fill="#4a3524" />
			<rect x="9" y="1" width="3" height="2" fill="#2c1f14" />
			<circle cx="6" cy="10" r="5" fill="#c9973a" />
			<circle cx="6" cy="10" r="4" fill="#a5752a" />
			<circle cx="6" cy="10" r="1.5" fill="#2c1f14" />
			<rect x="4" y="6" width="4" height="1" fill="#e8c98a" />
			<rect x="5" y="13" width="2" height="2" fill="#4a3524" />
		</svg>
	);
}

export function FlowerIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			{[
				[7, 2], [10, 4], [11, 7], [10, 10], [7, 12], [4, 10], [3, 7], [4, 4],
			].map(([x, y], i) => (
				<rect key={i} x={x} y={y} width="3" height="3" fill="#c14a3d" />
			))}
			<circle cx="8" cy="7.5" r="2.2" fill="#c9973a" />
			<rect x="7" y="12" width="2" height="3" fill="#5a6e34" />
			<rect x="9" y="12" width="3" height="1" fill="#5a6e34" />
		</svg>
	);
}

export function LeafIcon({ size = 32 }: { size?: number }) {
	return (
		<svg className="pix" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
			<path d="M3 13 Q3 4 13 3 Q13 12 5 13 Z" fill="#6b7a3a" />
			<path d="M4 12 Q7 8 12 4" stroke="#4a5526" strokeWidth="1" fill="none" />
			<rect x="2" y="13" width="3" height="1" fill="#4a3524" />
		</svg>
	);
}
