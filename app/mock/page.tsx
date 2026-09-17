const MOCKS = [
	{
		href: "/",
		name: "Windows XP",
		desc: "The default theme. Use the theme dropdown in the taskbar tray to switch skin in place — same page, same windows, same data.",
		swatches: ["#ece9d8", "#0058e6", "#3f93ff", "#245edb"],
	},
	{
		href: "/mock/folk",
		name: "Web 1.0 Folk (static mock)",
		desc: "2000s personal-homepage DNA — reskinned for folk rock: kraft paper, typewriter serif, rust/olive palette.",
		swatches: ["#e8dcc4", "#a54a2a", "#6b7a3a", "#c9973a"],
	},
	{
		href: "/mock/web1",
		name: "Web 1.0 Geocities (static mock)",
		desc: "No window metaphor — starfield tiling, Impact headlines, marquee, hit counter, ridge borders, badges.",
		swatches: ["#000033", "#ffcc00", "#66ffcc", "#ff8800"],
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
		<div className="t-folk h-full overflow-auto">
			<div className="mx-auto max-w-xl p-8">
				<h1 className="mb-1 text-2xl font-bold">Style directory</h1>
				<p className="mb-6 text-[13px] opacity-80">
					Desktop themes (XP, Mac, Amiga, NeXT, Fictional 90s OS) are selected from
					the theme dropdown in the main page&apos;s taskbar tray — no separate pages
					anymore. Only the two web-page-style mocks remain here.
				</p>
				<div className="flex flex-col gap-3">
					{MOCKS.map((m) => (
						<a key={m.href} href={m.href} className="panel block no-underline">
							<span className="flex items-center gap-4">
								<Swatch colors={m.swatches} />
								<span className="flex-1">
									<span className="block text-[13px] font-bold">{m.name}</span>
									<span className="block text-[11px] opacity-80">{m.desc}</span>
								</span>
								<span className="stitch-btn text-[12px]">Open →</span>
							</span>
						</a>
					))}
				</div>
				<p className="mt-6 text-[11px] opacity-70">
					All icon artwork across these pages is original inline SVG — nothing copied.
				</p>
			</div>
		</div>
	);
}
