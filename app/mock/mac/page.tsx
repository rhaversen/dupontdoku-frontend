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
	["OCT 03", "COPENHAGEN", "VEGA"],
	["OCT 11", "BERLIN", "LIDO"],
	["OCT 18", "AMSTERDAM", "PARADISO"],
	["NOV 01", "LONDON", "KOKO"],
];

export default function MacMock() {
	return (
		<div className="t-mac relative h-full w-full overflow-hidden">
			{/* desktop icons */}
			<div className="absolute top-3 left-3 flex flex-col gap-4">
				{[
					{ icon: <NoteIcon size={32} />, label: "readme.txt" },
					{ icon: <CassetteIcon size={32} />, label: "music" },
					{ icon: <FilmIcon size={32} />, label: "videos" },
					{ icon: <CalendarIcon size={32} />, label: "tour dates" },
					{ icon: <TicketIcon size={32} />, label: "tickets" },
					{ icon: <CameraIcon size={32} />, label: "photos" },
				].map(({ icon, label }) => (
					<div key={label} className="flex flex-col items-center gap-0.5 w-[74px]">
						<span className="bg-white/70 border border-black/60 p-[3px]">{icon}</span>
						<span className="bg-[#111] text-[#fff] text-[10px] px-1 leading-tight">
							{label}
						</span>
					</div>
				))}
			</div>

			{/* about window */}
			<div className="mock-window" style={{ left: 150, top: 40, width: 380 }}>
				<div className="mock-title">
					<span className="closebox" />
					<span className="t">readme.txt</span>
				</div>
				<div className="mock-menubar">
					<span className="font-bold">File</span>
					<span>Edit</span>
					<span>View</span>
					<span>Special</span>
				</div>
				<div className="mock-body p-3">
					<div className="inset p-3 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">{`DUPONTDOKU - readme.txt

Genre: lo-fi synth / bedroom pop
Formed: 2019, Aarhus DK

psst... type the name of this site
anywhere on the page.

Contact: booking@dupontdoku.example`}</div>
					<div className="mt-3 flex justify-end gap-2">
						<button className="mock-btn">Save</button>
						<button className="mock-btn">Close</button>
					</div>
				</div>
			</div>

			{/* music window */}
			<div className="mock-window" style={{ left: 560, top: 90, width: 400 }}>
				<div className="mock-title">
					<span className="closebox" />
					<span className="t">music — tape deck</span>
				</div>
				<div className="mock-menubar">
					<span className="font-bold">File</span>
					<span>Edit</span>
					<span>Controls</span>
				</div>
				<div className="mock-body p-3">
					<div className="inset p-3">
						<div className="flex items-center gap-3">
							<CassetteIcon size={48} />
							<div>
								<p className="text-[12px] font-bold">DUPONT — LAKE HIGHLAND SESSIONS</p>
								<p className="text-[11px] opacity-70">Side A · 03:42</p>
							</div>
						</div>
						<div className="mt-3 h-3 inset !shadow-none relative">
							<div className="absolute inset-y-0 left-0 w-2/5 bg-[#111]" />
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
						Streaming on{" "}
						<a className="underline" href="https://open.spotify.com/artist/dupont">
							Spotify
						</a>{" "}
						· unreleased demos rotate on{" "}
						<a className="underline" href="https://soundcloud.com/dupont0k/sets/unreleased">
							SoundCloud
						</a>
					</p>
				</div>
			</div>

			{/* tour window */}
			<div className="mock-window" style={{ left: 300, top: 320, width: 380 }}>
				<div className="mock-title">
					<span className="closebox" />
					<span className="t">tour dates</span>
				</div>
				<div className="mock-body p-3">
					<table className="w-full border-collapse text-[11px]">
						<tbody>
							{TOUR.map(([date, city, venue]) => (
								<tr key={date}>
									<td className="border border-black px-2 py-1 font-bold">{date}</td>
									<td className="border border-black px-2 py-1">{city}</td>
									<td className="border border-black px-2 py-1">{venue}</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="mt-3 flex justify-between items-center">
						<StarIcon size={16} />
						<button className="mock-btn">Get tickets…</button>
					</div>
				</div>
			</div>
		</div>
	);
}
