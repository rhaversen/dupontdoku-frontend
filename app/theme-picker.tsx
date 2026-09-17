"use client";

import { useTheme, THEMES } from "./lib/theme";

// tray-dwelling theme picker: swaps the theme class on <html>, restyling the
// whole desktop in place — same page, same windows, same state
export default function ThemePicker() {
	const { theme, setTheme } = useTheme();
	return (
		<select
			aria-label="Theme"
			title="Theme"
			className="h-full cursor-default border-0 bg-transparent px-1 text-[11px] text-white outline-none"
			value={theme}
			onChange={(e) => setTheme(e.target.value as typeof theme)}
		>
			{THEMES.map((t) => (
				<option key={t.id} value={t.id} className="text-black">
					{t.label}
				</option>
			))}
		</select>
	);
}
