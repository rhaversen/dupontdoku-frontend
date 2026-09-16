const MOCKS = [
	{
		href: "/mock/mac",
		name: "Beige Classic Mac-ish",
		desc: "Striped title bars, greige face, 1px black borders, chunky drop-shadow windows, menubar per window.",
		swatches: ["#d4d0c8", "#8d9b90", "#111111", "#ffffff"],
	},
	{
		href: "/mock/amiga",
		name: "Amiga / Workbench",
		desc: "Blue backdrop, orange accents, heavy 2px bevels, uppercase mono type, zero rounding.",
		swatches: ["#0055aa", "#ff8800", "#b0b0b0", "#ffffff"],
	},
	{
		href: "/mock/next",
		name: "NeXT / Unix minimal",
		desc: "Dark diagonal-striped desktop, gray bevel windows, green phosphor terminals, dock-ish taskbar.",
		swatches: ["#5a5a5a", "#2e2e34", "#9fe89f", "#c8c8c8"],
	},
	{
		href: "/mock/folk",
		name: "Web 1.0 Folk (rec.)",
		desc: "2000s personal-homepage DNA — marquee, hit counter, badges, guestbook — reskinned for folk rock: kraft paper, typewriter serif, rust/olive palette.",
		swatches: ["#e8dcc4", "#a54a2a", "#6b7a3a", "#c9973a"],
	},
    {
		href: "/mock/web1",
		name: "Web 1.0 Geocities",
		desc: "No window metaphor — starfield tiling, Impact headlines, marquee, hit counter, ridge borders, badges.",
		swatches: ["#000033", "#ffcc00", "#66ffcc", "#ff8800"],
	},
	{
		href: "/mock/fict",
		name: "Fictional 90s OS (rec.)",
		desc: "Keeps the desktop/taskbar metaphor, reskinned in plum + amber with beveled chrome and original pixel icons.",
		swatches: ["#6b2d5c", "#e8a33d", "#d6d2c4", "#4a1d40"],
	},
];

function Swatch({ colors }: { colors: string[] }) {
	return (
		<span className="inline-flex">
			{colors.map((c) => (
				<span
					key={c}
					className="inline-block h-5 w-5 border border-black/40"
					style={{ background: c }}
				/>
			))}
		</span>
	);
}

export default function MockIndex() {
	return (
		<div className="t-fict h-full overflow-auto">
			<div className="mx-auto max-w-xl p-8">
				<h1 className="mb-1 text-xl font-bold text-white">Style mock directory</h1>
				<p className="mb-6 text-[12px] text-white/70">
					Five takes on “2000s computer without Windows”. Same content in each — pick a
					favorite and we&apos;ll build it out for real.
				</p>
				<div className="flex flex-col gap-3">
					{MOCKS.map((m) => (
						<a
							key={m.href}
							href={m.href}
							className="mock-window !static !flex-row items-center gap-4 p-3 !bg-[#d6d2c4]"
						>
							<Swatch colors={m.swatches} />
							<span className="flex-1">
								<span className="block font-bold text-[13px]">{m.name}</span>
								<span className="block text-[11px] opacity-80">{m.desc}</span>
							</span>
							<span className="mock-btn">Open →</span>
						</a>
					))}
				</div>
				<p className="mt-6 text-[11px] text-white/60">
					All icon artwork on these pages is original inline SVG — nothing copied.
				</p>
			</div>
		</div>
	);
}
