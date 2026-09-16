import {
	CassetteIcon,
	FilmIcon,
	NoteIcon,
	StarIcon,
	GuitarIcon,
	FlowerIcon,
	LeafIcon,
} from "../icons";

const TOUR = [
	["Oct 03", "Copenhagen", "Vega"],
	["Oct 11", "Berlin", "Lido"],
	["Oct 18", "Amsterdam", "Paradiso"],
	["Nov 01", "London", "KOKO"],
];

export default function FolkMock() {
	return (
		<div className="t-folk relative h-full overflow-auto">
			<div className="grain" />
			<div className="page">
				<p className="text-[12px]" style={{ fontFamily: "Verdana, sans-serif" }}>
					<span className="blink" style={{ color: "var(--rust)" }}>
						✦ new
					</span>{" "}
					<span style={{ color: "var(--olive)" }}>
						welcome to the official dupontdoku homepage — kick off your shoes
					</span>{" "}
					<span className="blink" style={{ color: "var(--rust)" }}>
						✦ new
					</span>
				</p>

				<div className="flex items-center justify-center gap-3">
					<LeafIcon size={26} />
					<h1 className="headline">Dupontdoku</h1>
					<FlowerIcon size={26} />
				</div>
				<p className="sub">~*~ lo-fi synth &amp; campfire strings ~ est. 2019, Aarhus DK ~*~</p>

				<hr className="wood-rule" />

				<div className="marquee-wrap">
					<span className="marquee">
						❧ new single drops friday ❧ unreleased demos on soundcloud this week only ❧
						type &quot;dupont&quot; anywhere on the page for a secret ❧ sign the guestbook
						before you go ❧
					</span>
				</div>

				<div className="panel">
					<h2>♫ Now playing — from the parlour</h2>
					<div className="flex items-center gap-4">
						<CassetteIcon size={52} />
						<div className="flex-1">
							<p className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>
								DUPONT — Lake Highland Sessions
							</p>
							<p className="text-[11px] italic" style={{ color: "var(--olive)" }}>
								side A · 03:42 · recorded on a 4-track in a barn
							</p>
							<div
								className="mt-2 h-4 border-2"
								style={{ borderColor: "var(--rust)", background: "var(--paper-dark)" }}
							>
								<div className="h-full w-2/5" style={{ background: "var(--mustard)" }} />
							</div>
							<div className="mt-2 flex gap-1.5">
								{["|◀", "▶", "■", "▶|"].map((b) => (
									<span
										key={b}
										className="text-[11px] px-2 py-0.5"
										style={{
											fontFamily: "Verdana, sans-serif",
											background: "var(--cream)",
											border: "2px outset #c8b890",
											color: "var(--ink)",
										}}
									>
										{b}
									</span>
								))}
							</div>
						</div>
						<GuitarIcon size={44} />
					</div>
					<p className="mt-3 text-[12px]">
						<a href="https://open.spotify.com/artist/dupont">♫ listen on Spotify</a> ·{" "}
						<a href="https://soundcloud.com/dupont0k/sets/unreleased">
							♫ barn-session demos (unreleased)
						</a>
					</p>
				</div>

				<div className="panel">
					<h2>✈ Tour dates — autumn 2025</h2>
					<table className="w-full border-collapse text-[12px]">
						<tbody>
							{TOUR.map(([date, city, venue], i) => (
								<tr key={date} style={{ background: i % 2 ? "var(--paper-dark)" : "transparent" }}>
									<td className="px-2 py-1.5 font-bold" style={{ color: "var(--rust)" }}>
										{date}
									</td>
									<td className="px-2 py-1.5">{city}</td>
									<td className="px-2 py-1.5 italic">{venue}</td>
									<td className="px-2 py-1.5 text-right">
										<a href="#">[tickets]</a>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="mt-2 text-[11px] italic" style={{ color: "var(--olive)" }}>
						bring an instrument, we always play one song with the room.
					</p>
				</div>

				<div className="panel">
					<h2>✉ About / readme.txt</h2>
					<pre
						className="text-[11.5px] leading-relaxed whitespace-pre-wrap"
						style={{ fontFamily: '"Courier New", monospace', color: "var(--ink)" }}
					>{`genre....: lo-fi synth & folk-rock
formed...: 2019, aarhus DK

psst... type the name of this site
anywhere on the page.

contact..: booking@dupontdoku.example`}</pre>
				</div>

				<div className="flex items-center justify-center gap-4 flex-wrap">
					<button className="stitch-btn">✎ Sign the guestbook</button>
					<span className="stamp">sincerely, dupont ✦</span>
				</div>

				<hr className="wood-rule" />

				<div className="flex items-center justify-center gap-3 flex-wrap text-[11px]">
					<span style={{ fontFamily: "Verdana, sans-serif", color: "var(--olive)" }}>
						visitor number:
					</span>
					<span className="counter">
						{["0", "0", "8", "2", "4", "7"].map((d, i) => (
							<span key={i}>{d}</span>
						))}
					</span>
				</div>

				<div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
					<span className="badge">▦ best viewed with coffee</span>
					<span className="badge">♫ acoustic versions inside</span>
					<span className="badge">✓ hand-stamped html</span>
					<span className="badge">▦ folk-friendly</span>
				</div>

				<div
					className="mt-4 flex items-center justify-center gap-2 text-[10px]"
					style={{ fontFamily: "Verdana, sans-serif", color: "var(--olive)" }}
				>
					<FilmIcon size={14} />
					<span>© 2025 dupontdoku · made with ♥ and a typewriter</span>
					<NoteIcon size={14} />
				</div>

				<div className="mt-2 flex justify-center">
					<StarIcon size={20} />
				</div>
			</div>
		</div>
	);
}
