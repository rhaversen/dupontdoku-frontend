"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = [
	{ id: "xp", label: "Windows XP" },
	{ id: "mac", label: "Beige Classic Mac" },
	{ id: "amiga", label: "Amiga / Workbench" },
	{ id: "next", label: "NeXT / Unix" },
	{ id: "fict", label: "Fictional 90s OS" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

type ThemeState = {
	theme: ThemeId;
	setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);
const STORAGE_KEY = "dupontdoku-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<ThemeId>("xp");

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
		if (stored && THEMES.some((t) => t.id === stored)) setTheme(stored);
	}, []);

	// the theme class restyles every mock-* chrome element in the page; the
	// mock-*.css files also override the XP wallpaper while a theme is active
	useEffect(() => {
		document.documentElement.classList.remove(
			...THEMES.filter((t) => t.id !== "xp").map((t) => `t-${t.id}`),
		);
		if (theme !== "xp") {
			document.documentElement.classList.add(`t-${theme}`);
		}
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
	return ctx;
}
