import {
	CassetteIcon,
	TicketIcon,
	FilmIcon,
	NoteIcon,
	CameraIcon,
	CalendarIcon,
	StarIcon,
	GlobeIcon,
	KeyIcon,
} from "../icons";

const TOUR = [
	["Oct 03", "Copenhagen", "Vega"],
	["Oct 11", "Berlin", "Lido"],
	["Oct 18", "Amsterdam", "Paradiso"],
	["Nov 01", "London", "KOKO"],
];

export default function FictMock() {
	return (
		<div className="t-fict relative h-full w-full overflow-hidden">
			{/* desktop icons */}
			<div className="absolute top-3 left-3 flex flex-col gap-3">
				{[
					{ icon: <NoteIcon size={34} />, label: "README.TXT" },
					{ icon: <CassetteIcon size={34} />, label: "Music" },
					{ icon: <FilmIcon size={34} />, label: "Videos" },
					{ icon: <CalendarIcon size={34} />, label: "Tour Dates" },
					{ icon: <TicketIcon size={34} />, label: "Tickets" },
					{ icon: <CameraIcon size={34} />, label: "Photos" },
				].map(({ icon, label }) => (
					<div key={label} className="flex flex-col items-center gap-0.5 w-[84px] p-1">
						{icon}
						<span
							className="px-1 text-[11px] leading-tight text-white"
							style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.9)" }}
						>
							{label}
						</span>
					</div>
				))}
			</div>

			{/* README window */}
			<div className="mock-window" style={{ left: 160, top: 36, width: 400 }}>
				<div className="mock-title">
					<NoteIcon size={14} />
					<span className="t">README.TXT — Dupontdoku Writer</span>
					<button className="title-btn">_</button>
					<button className="title-btn">▢</button>
					<button className="title-btn close">✕</button>
				</div>
				<div className="mock-body p-3">
					<div className="inset p-3 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">{`DUPONTDOKU - README.TXT

Genre: lo-fi synth / bedroom pop
Formed: 2019, Aarhus DK

psst... type the name of this site
anywhere on the page.

Contact: booking@dupontdoku.example`}</div>
					<div className="mt-3 flex justify-end gap-2">
						<button className="mock-btn px-4">OK</button>
						<button className="mock-btn px-4">Cancel</button>
					</div>
				</div>
			</div>

			{/* Music window */}
			<div className="mock-window" style={{ left: 590, top: 90, width: 400 }}>
				<div className="mock-title">
					<CassetteIcon size={14} />
					<span className="t">Music — Tape Deck</span>
					<button className="title-btn">_</button>
					<button className="title-btn">▢</button>
					<button className="title-btn close">✕</button>
				</div>
				<div className="mock-body p-3">
					<div className="inset p-3">
						<div className="flex items-center gap-3">
							<CassetteIcon size={48} />
							<div>
								<p className="text-[12px] font-bold">DUPONT — Lake Highland Sessions</p>
								<p className="text-[11px] opacity-70">Side A · 03:42</p>
							</div>
						</div>
						<div className="mt-3 h-3 relative inset !bg-[#fbf9f2]">
							<div className="absolute inset-y-0 left-0 w-2/5 bg-[var(--plum)]" />
						</div>
						<div className="mt-3 flex justify-center gap-2">
							<button className="mock-btn">◀◀</button>
							<button className="mock-btn">▶</button>
							<button className="mock-btn">■</button>
							<button className="mock-btn">▶▶</button>
							<button className="mock-btn">⏏</button>
						</div>
					</div>
					<p className="mt-3 text-[11px]">
						Streaming on <span className="underline text-[#0000cc]">Spotify</span> · unreleased
						demos on <span className="underline text-[#0000cc]">SoundCloud</span>
					</p>
				</div>
			</div>

			{/* Tour window */}
			<div className="mock-window" style={{ left: 330, top: 340, width: 390 }}>
				<div className="mock-title">
					<CalendarIcon size={14} />
					<span className="t">Tour Dates 2025</span>
					<button className="title-btn">_</button>
					<button className="title-btn">▢</button>
					<button className="title-btn close">✕</button>
				</div>
				<div className="mock-body p-3">
					<table className="w-full border-collapse text-[11px]">
						<thead>
							<tr>
								{["Date", "City", "Venue"].map((h) => (
									<th
										key={h}
										className="border border-[#55504a] bg-[#c8c2b2] px-2 py-1 text-left font-bold"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{TOUR.map(([date, city, venue]) => (
								<tr key={date} className="hover:bg-[#e8d8ec]">
									<td className="border border-[#b8b2a4] px-2 py-1">{date}</td>
									<td className="border border-[#b8b2a4] px-2 py-1">{city}</td>
									<td className="border border-[#b8b2a4] px-2 py-1">{venue}</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="mt-3 flex items-center justify-between">
						<span className="flex items-center gap-1 text-[11px]">
							<StarIcon size={14} /> 4 dates found
						</span>
						<button className="mock-btn">Get Tickets →</button>
					</div>
				</div>
			</div>

			{/* taskbar */}
			<div className="absolute bottom-0 left-0 right-0">
				<div className="mock-taskbar">
					<button className="start-btn">
						<StarIcon size={16} /> dupont
					</button>
					<div className="flex flex-1 items-center gap-1.5">
						<button className="task-btn active">README.TXT</button>
						<button className="task-btn">Tape Deck</button>
						<button className="task-btn">Tour Dates</button>
					</div>
					<div className="tray">
						<KeyIcon size={14} />
						<GlobeIcon size={14} />
						<span className="tabular-nums">12:34</span>
					</div>
				</div>
			</div>
		</div>
	);
}
