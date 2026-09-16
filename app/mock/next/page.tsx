import {
	CassetteIcon,
	TicketIcon,
	FilmIcon,
	NoteIcon,
	CameraIcon,
	CalendarIcon,
	StarIcon,
} from "../icons";

const TOUR = [
	["oct 03", "copenhagen", "vega"],
	["oct 11", "berlin", "lido"],
	["oct 18", "amsterdam", "paradiso"],
	["nov 01", "london", "koko"],
];

export default function NextMock() {
	return (
		<div className="t-next relative h-full w-full overflow-hidden">
			{/* desktop icons — file shelf style */}
			<div className="absolute top-4 right-4 flex flex-col gap-5">
				{[
					{ icon: <NoteIcon size={28} />, label: "README.rtf" },
					{ icon: <CassetteIcon size={28} />, label: "Music" },
					{ icon: <FilmIcon size={28} />, label: "Videos" },
					{ icon: <CalendarIcon size={28} />, label: "Tour" },
					{ icon: <TicketIcon size={28} />, label: "Tickets" },
					{ icon: <CameraIcon size={28} />, label: "Photos" },
				].map(({ icon, label }) => (
					<div key={label} className="flex flex-col items-center gap-1 w-[80px]">
						<span className="bg-[#c8c8c8] border border-black p-1 shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
							{icon}
						</span>
						<span className="text-[10px] text-[#ddd]">{label}</span>
					</div>
				))}
			</div>

			{/* README window */}
			<div className="mock-window" style={{ left: 140, top: 40, width: 400 }}>
				<div className="mock-title">
					<span className="closebox">✕</span>
					<span className="t">README.rtf</span>
				</div>
				<div className="mock-body p-3">
					<div className="inset p-3 text-[11px] whitespace-pre-wrap leading-relaxed">{`DUPONTDOKU — README.rtf

Genre: lo-fi synth / bedroom pop
Formed: 2019, Aarhus DK

psst... type the name of this site
anywhere on the page.

Contact: booking@dupontdoku.example`}</div>
					<div className="mt-3 flex justify-end gap-2">
						<button className="mock-btn">OK</button>
						<button className="mock-btn">Dismiss</button>
					</div>
				</div>
			</div>

			{/* Music window */}
			<div className="mock-window" style={{ left: 560, top: 100, width: 400 }}>
				<div className="mock-title">
					<span className="closebox">✕</span>
					<span className="t">Music — TapeDeck</span>
				</div>
				<div className="mock-body p-3">
					<div className="inset p-3">
						<div className="flex items-center gap-3">
							<CassetteIcon size={44} />
							<div className="text-[#9fe89f]">
								<p className="text-[12px] font-bold">DUPONT — LAKE HIGHLAND SESSIONS</p>
								<p className="text-[11px] opacity-80">side a · 03:42</p>
							</div>
						</div>
						<div className="mt-3 h-3 relative">
							<div className="absolute inset-y-0 left-0 w-2/5 bg-[#9fe89f]" />
							<div className="absolute inset-0 border border-black" />
						</div>
						<div className="mt-3 flex justify-center gap-2">
							<button className="mock-btn">|◀</button>
							<button className="mock-btn">▶</button>
							<button className="mock-btn">■</button>
							<button className="mock-btn">▶|</button>
							<button className="mock-btn">⏏</button>
						</div>
					</div>
					<p className="mt-3 text-[11px] text-[#ddd]">
						streaming on <span className="underline">spotify</span> · unreleased on{" "}
						<span className="underline">soundcloud</span>
					</p>
				</div>
			</div>

			{/* Tour window */}
			<div className="mock-window" style={{ left: 300, top: 330, width: 390 }}>
				<div className="mock-title">
					<span className="closebox">✕</span>
					<span className="t">Tour Dates</span>
				</div>
				<div className="mock-body p-3">
					<table className="w-full border-collapse text-[11px] text-[#ddd]">
						<tbody>
							{TOUR.map(([date, city, venue]) => (
								<tr key={date}>
									<td className="border border-black px-2 py-1 bg-[#4c4c4c] font-bold">{date}</td>
									<td className="border border-black px-2 py-1 bg-[#4c4c4c]">{city}</td>
									<td className="border border-black px-2 py-1 bg-[#4c4c4c]">{venue}</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="mt-3 flex items-center justify-between">
						<span className="flex items-center gap-1 text-[10px]">
							<StarIcon size={14} /> 4 dates found
						</span>
						<button className="mock-btn">Get Tickets →</button>
					</div>
				</div>
			</div>

			{/* dock/taskbar */}
			<div className="absolute bottom-0 left-0 right-0">
				<div className="mock-taskbar">
					<span className="app font-bold">dupontdoku</span>
					<span className="app">TapeDeck</span>
					<span className="app">FileViewer</span>
					<span className="ml-auto tabular-nums">wed 12:34</span>
				</div>
			</div>
		</div>
	);
}
