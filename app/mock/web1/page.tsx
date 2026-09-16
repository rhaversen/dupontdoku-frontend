import { CassetteIcon, FilmIcon, NoteIcon, StarIcon } from "../icons";

const TOUR = [
	["Oct 03", "Copenhagen", "Vega"],
	["Oct 11", "Berlin", "Lido"],
	["Oct 18", "Amsterdam", "Paradiso"],
	["Nov 01", "London", "KOKO"],
];

export default function Web1Mock() {
	return (
		<div className="t-web1 relative h-full w-full min-h-full overflow-auto">
			<div className="starfield" />
			<div className="page">
				<p className="text-[12px] font-bold" style={{ fontFamily: "Verdana, sans-serif" }}>
					<span className="blink" style={{ color: "#ff6666" }}>
						*** NEW ***
					</span>{" "}
					<span style={{ color: "#66ff66" }}>
						welcome 2 da official dupontdoku homepage!!!11
					</span>{" "}
					<span className="blink" style={{ color: "#ff6666" }}>
						*** NEW ***
					</span>
				</p>

				<h1 className="headline">DUPONTDOKU</h1>
				<p className="sub">~*~ lo-fi synth 4 ur soul ~ est. 2019 aarhus dk ~*~</p>

				<hr className="rainbow-rule" />

				<div className="marquee-wrap">
					<span className="marquee">
						★ NEW SINGLE DROPS FRIDAY ★ unreleased demos on soundcloud this week only ★
						type &quot;dupont&quot; anywhere on the page 4 a secret ★ sign da guestbook ★
					</span>
				</div>

				<div className="panel">
					<h2>♫ NOW PLAYING</h2>
					<div className="flex items-center gap-3">
						<CassetteIcon size={48} />
						<div className="flex-1">
							<p className="text-[#ffffcc] text-[13px] font-bold">DUPONT — Lake Highland Sessions</p>
							<p className="text-[#66ffcc] text-[11px]">side A · 03:42 · MIDI quality :)</p>
							<div className="mt-2 h-4 border-2 inset" style={{ borderColor: "#8888cc", background: "#000033" }}>
								<div className="h-full w-2/5" style={{ background: "linear-gradient(90deg, #ff9900, #ffff66)" }} />
							</div>
							<div className="mt-2 flex gap-1">
								{["|◀", "▶", "■", "▶|"].map((b) => (
									<span
										key={b}
										className="text-[11px] px-2 py-0.5"
										style={{
											fontFamily: "Verdana, sans-serif",
											background: "linear-gradient(#5577dd, #223399)",
											border: "2px outset #88aaff",
											color: "#fff",
										}}
									>
										{b}
									</span>
								))}
							</div>
						</div>
					</div>
					<p className="mt-2 text-[12px]">
						<a href="https://open.spotify.com/artist/dupont">▶ listen on Spotify</a> ·{" "}
						<a href="https://soundcloud.com/dupont0k/sets/unreleased">▶ unreleased demos</a>
					</p>
				</div>

				<div className="panel">
					<h2>★ TOUR DATES 2025</h2>
					<table className="w-full border-collapse text-[12px]">
						<tbody>
							{TOUR.map(([date, city, venue], i) => (
								<tr key={date} style={{ background: i % 2 ? "#000044" : "#000055" }}>
									<td className="px-2 py-1 font-bold" style={{ color: "#ffcc00" }}>{date}</td>
									<td className="px-2 py-1">{city}</td>
									<td className="px-2 py-1">{venue}</td>
									<td className="px-2 py-1 text-right">
										<a href="#">[tickets]</a>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="panel">
					<h2>✉ ABOUT / README.TXT</h2>
					<pre className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: '"Courier New", monospace', color: "#66ffcc" }}>{`genre....: lo-fi synth / bedroom pop
formed...: 2019, aarhus DK

psst... type the name of this site
anywhere on the page.

contact..: booking@dupontdoku.example`}</pre>
				</div>

				<div className="flex items-center justify-center gap-4 flex-wrap">
					<button className="guestbook-btn">✎ Sign da Guestbook!!</button>
				</div>

				<hr className="rainbow-rule" />

				<div className="flex items-center justify-center gap-3 flex-wrap text-[11px]">
					<span style={{ fontFamily: "Verdana, sans-serif", color: "#8888cc" }}>
						ur visitor number:
					</span>
					<span className="counter">
						{["0", "0", "8", "2", "4", "7"].map((d, i) => (
							<span key={i}>{d}</span>
						))}
					</span>
				</div>

				<div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
					<span className="badge">▦ best viewed 800×600</span>
					<span className="badge">♫ midi on</span>
					<span className="badge">✓ netscape enhanced</span>
					<span className="badge">▦ 56k friendly</span>
				</div>

				<div className="mt-4 flex items-center justify-center gap-2 text-[10px]" style={{ fontFamily: "Verdana, sans-serif", color: "#6666aa" }}>
					<FilmIcon size={14} />
					<span>© 2025 dupontdoku · made with ♥ and notepad</span>
					<NoteIcon size={14} />
				</div>

				<div className="mt-2 flex justify-center">
					<StarIcon size={20} />
				</div>
			</div>
		</div>
	);
}
