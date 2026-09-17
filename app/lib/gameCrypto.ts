"use client";

import { api } from "./api";

// non-extractable ECDSA P-256 keypair persisted in IndexedDB — the private
// key can only be used to sign inside this browser, never exported
const DB_NAME = "dupontdoku-game";
const STORE = "keys";

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) {
				req.result.createObjectStore(STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).get(key);
		req.onsuccess = () => resolve(req.result as T | undefined);
		req.onerror = () => reject(req.error);
	});
}

async function idbSet(key: string, value: unknown): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function idbDelete(key: string): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function getOrCreateKeypair(): Promise<{ publicKeyJwk: Record<string, unknown>; privateKey: CryptoKey }> {
	// CryptoKey objects round-trip through IndexedDB via structured clone —
	// the private key stays non-extractable and can never leave the browser
	const stored = await idbGet<{ publicKeyJwk: Record<string, unknown>; privateKey: CryptoKey }>("keypair");
	if (stored) {
		return { publicKeyJwk: stored.publicKeyJwk, privateKey: stored.privateKey };
	}
	const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
	const publicKeyJwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as unknown as Record<string, unknown>;
	await idbSet("keypair", { publicKeyJwk, privateKey: pair.privateKey });
	return { publicKeyJwk, privateKey: pair.privateKey };
}

export async function signMessage(privateKey: CryptoKey, message: string): Promise<string> {
	const sig = await crypto.subtle.sign(
		{ name: "ECDSA", hash: "SHA-256" },
		privateKey,
		new TextEncoder().encode(message),
	);
	return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export type RunState = {
	runId: string;
	fingerprint: string;
	completed: number;
	required: number;
	code: string | null;
	respondedSeqs: number[];
};

const RUN_KEY = "run";
const PROGRESS_KEY = "progress";

export type LocalProgress = {
	completed: number;
	required: number;
	respondedSeqs: number[];
	updatedAt: number;
};

export function loadProgress(): LocalProgress {
	try {
		return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "") as LocalProgress;
	} catch {
		return { completed: 0, required: 10, respondedSeqs: [], updatedAt: 0 };
	}
}

export function saveProgress(p: LocalProgress): void {
	localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...p, updatedAt: Date.now() }));
}

export async function ensureRun(): Promise<{ run: RunState; privateKey: CryptoKey } | null> {
	const { publicKeyJwk, privateKey } = await getOrCreateKeypair();
	const res = await fetch("/api/game/start", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ publicKeyJwk }),
		credentials: "include",
	});
	if (res.status === 409) return null;
	if (!res.ok) throw new Error(`start failed: ${res.status}`);
	const run = (await res.json()) as RunState;
	localStorage.setItem(RUN_KEY, JSON.stringify(run));
	saveProgress({ completed: run.completed, required: run.required, respondedSeqs: run.respondedSeqs, updatedAt: Date.now() });
	return { run, privateKey };
}

export async function clearRun(): Promise<void> {
	await idbDelete("keypair").catch(() => {});
	localStorage.removeItem(RUN_KEY);
	localStorage.removeItem(PROGRESS_KEY);
}

export async function resetProgress(): Promise<void> {
	localStorage.removeItem(PROGRESS_KEY);
}
