"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "./lib/auth";

export default function AuthWindow({ onDone }: { onDone?: () => void }) {
	const { user, loading, login, register, logout } = useAuth();
	const [mode, setMode] = useState<"login" | "register">("login");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");
		setBusy(true);
		try {
			if (mode === "login") {
				await login(name, password);
			} else {
				await register(name, password, inviteCode);
			}
			onDone?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setBusy(false);
		}
	};

	if (loading) {
		return <p className="p-3 text-[12px]">Loading…</p>;
	}

	if (user) {
		return (
			<div className="flex flex-col gap-3 p-3">
				<p className="text-[12px]">
					Logged in as <span className="font-bold">{user.name}</span>
				</p>
				<div className="flex justify-end">
					<button
						className="xp-btn px-4"
						onClick={() => {
							void logout();
						}}
					>
						Log out
					</button>
				</div>
			</div>
		);
	}

	return (
		<form className="flex flex-col gap-2 p-3 text-[12px]" onSubmit={(e) => void submit(e)}>
			<div className="flex gap-1">
				<button
					type="button"
					className={`xp-btn px-3 py-0.5 ${mode === "login" ? "font-bold" : ""}`}
					onClick={() => setMode("login")}
				>
					Log in
				</button>
				<button
					type="button"
					className={`xp-btn px-3 py-0.5 ${mode === "register" ? "font-bold" : ""}`}
					onClick={() => setMode("register")}
				>
					Register
				</button>
			</div>
			<label className="flex items-center justify-between gap-2">
				Name:
				<input
					required
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="xp-inset w-44 rounded-sm px-1 py-0.5"
				/>
			</label>
			<label className="flex items-center justify-between gap-2">
				Password:
				<input
					required
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="xp-inset w-44 rounded-sm px-1 py-0.5"
				/>
			</label>
			{mode === "register" && (
				<label className="flex items-center justify-between gap-2">
					Invite code:
					<input
						required
						value={inviteCode}
						onChange={(e) => setInviteCode(e.target.value)}
						className="xp-inset w-44 rounded-sm px-1 py-0.5"
					/>
				</label>
			)}
			{error && <p className="text-red-700">{error}</p>}
			<div className="flex justify-end">
				<button type="submit" className="xp-btn px-4" disabled={busy}>
					{busy ? "…" : mode === "login" ? "Log in" : "Create account"}
				</button>
			</div>
		</form>
	);
}
