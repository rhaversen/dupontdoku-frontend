"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type CurrentUser } from "./api";

type AuthState = {
	user: CurrentUser | null;
	loading: boolean;
	login: (name: string, password: string) => Promise<void>;
	register: (name: string, password: string, inviteCode: string) => Promise<void>;
	logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.me()
			.then((res) => setUser(res.authenticated ? (res.user ?? null) : null))
			.catch(() => setUser(null))
			.finally(() => setLoading(false));
	}, []);

	const login = useCallback(async (name: string, password: string) => {
		setUser(await api.login(name, password));
	}, []);

	const register = useCallback(async (name: string, password: string, inviteCode: string) => {
		setUser(await api.register(name, password, inviteCode));
	}, []);

	const logout = useCallback(async () => {
		await api.logout();
		setUser(null);
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
