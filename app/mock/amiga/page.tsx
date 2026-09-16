import {
	CassetteIcon,
	TicketIcon,
	FilmIcon,
	NoteIcon,
	CameraIcon,
	CalendarIcon,
	GlobeIcon,
} from "../icons";

const TOUR = [
	["03-OCT", "COPENHAGEN", "VEGA"],
	["11-OCT", "BERLIN", "LIDO"],
	["18-OCT", "AMSTERDAM", "PARADISO"],
	["01-NOV", "LONDON", "KOKO"],
];

export default function AmigaMock() {
	return (
		<div className="t-amiga relative h-full w-full overflow-hidden">
			{/* desktop icons */}
			<div className="absolute top-3 left-3 flex flex-col gap-4">
				{[
					{ icon: <NoteIcon size={32} />, label: "README" },
					{ icon: <CassetteIcon size={32} />, label: "MUSIC" },
					{ icon: <FilmIcon size={32} />, label: "VIDEOS" },
					{ icon: <CalendarIcon size={32} />, label: "TOUR" },
					{ icon: <TicketIcon size={32} />, label: "TICKETS" },
					{ icon: <CameraIcon size={32} />, label: "PHOTOS" },
				].map(({ icon, label }) => (
					<div key={label} className="flex flex-col items-center gap-0.5 w-[74px]">
						<span className="border-2 border-t-white border-l-white border-b-black border-r-black bg-[#b0b0b0] p-[3px]">
							{icon}
						</span>
						<span className="bg-[#ff8800] border-2 border-t-white border-l-white border-b-black border-r-black text-[10px] px-1 leading-tight">
							{label}
						</span>
					</div>
				))}
			</div>

			{/* README window */}
			<div className="mock-window" style={{ left: 150, top: 36, width: 390 }}>
				<div className="mock-title">
					<span className="t">README.TXT</span>
					<span className="glyphs">
						<span className="glyph">▔</span>
						<span className="glyph">□</span>
						<span className="glyph">✕</span>
					</span>
				</div>
				<div className="mock-body p-2">
					<div className="inset p-3 text-[12px] leading-relaxed whitespace-pre-wrap">{`DUPONTDOKU - README.TXT
=======================
GENRE...: LO-FI SYNTH / BEDROOM POP
FORMED..: 2019, AARHUS DK

PSST... TYPE THE NAME OF THIS
SITE ANYWHERE ON THE PAGE.

CONTACT: BOOKING@DUPONTDOKU.EXAMPLE`}</div>
					<div className="mt-2 flex justify-end gap-1">
						<button className="mock-btn">OK</button>
						<button className="mock-btn">CANCEL</button>
					</div>
				</div>
			</div>

			{/* MUSIC window */}
			<div className="mock-window" style={{ left: 570, top: 80, width: 400 }}>
				<div className="mock-title">
					<span className="t">MUSIC:TAPEDECK</span>
					<span className="glyphs">
						<span className="glyph">▔</span>
						<span className="glyph">✕</span>
					</span>
				</div>
				<div className="mock-body p-2">
					<div className="inset p-3">
						<div className="flex items-center gap-3">
							<CassetteIcon size={48} />
							<div>
								<p className="text-[12px]">DUPONT — LAKE HIGHLAND</p>
								<p className="text-[11px]">SIDE A · 03:42</p>
							</div>
						</div>
						<div className="mt-3 h-4 inset relative p-0.5">
							<div className="h-full w-2/5 bg-[#0055aa]" />
						</div>
						<div className="mt-1 flex justify-between text-[10px]">
							<span>01:29</span>
							<span>03:42</span>
						</div>
						<div className="mt-2 flex justify-center gap-1">
							<button className="mock-btn">◀◀</button>
							<button className="mock-btn">▶</button>
							<button className="mock-btn">■</button>
							<button className="mock-btn">▶▶</button>
							<button className="mock-btn">⏏</button>
						</div>
					</div>
					<p className="mt-2 text-[11px]">
						▶ <span className="underline">SPOTIFY</span> ·{" "}
						<span className="underline">SOUNDCLOUD UNRELEASED</span>
					</p>
				</div>
			</div>

			{/* TOUR window */}
			<div className="mock-window" style={{ left: 320, top: 330, width: 380 }}>
				<div className="mock-title">
					<span className="t">TOUR.DATES</span>
					<span className="glyphs">
						<span className="glyph">▔</span>
						<span className="glyph">✕</span>
					</span>
				</div>
				<div className="mock-body p-2">
					<table className="w-full border-collapse text-[11px]">
						<tbody>
							{TOUR.map(([date, city, venue]) => (
								<tr key={date}>
									<td className="border-2 border-t-black border-l-black border-b-white border-r-white px-2 py-1">{date}</td>
									<td className="border-2 border-t-black border-l-black border-b-white border-r-white px-2 py-1">{city}</td>
									<td className="border-2 border-t-black border-l-black border-b-white border-r-white px-2 py-1">{venue}</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="mt-2 flex items-center justify-between">
						<span className="inset px-2 py-0.5 text-[10px]">4 DATES FOUND</span>
						<button className="mock-btn">GET TICKETS →</button>
					</div>
				</div>
			</div>

			{/* taskbar */}
			<div className="absolute bottom-0 left-0 right-0">
				<div className="mock-taskbar">
					<span className="screenname">dupontdoku 1.3</span>
					<span>1.2M FREE</span>
					<span className="ml-auto flex items-center gap-2">
						<GlobeIcon size={14} /> 12:34
					</span>
				</div>
			</div>
		</div>
	);
}
