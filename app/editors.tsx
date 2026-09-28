"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type FieldDef = {
	key: string;
	label: string;
	type?: "text" | "textarea" | "number" | "checkbox" | "select";
	options?: string[];
	default?: unknown;
	optional?: boolean;
};

type Item = Record<string, unknown> & { id: string };

const inputCls = "flex-1 rounded-md border border-accent-border bg-surface shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] px-1.5 py-0.5";

export function CrudEditor({
	title,
	fields,
	fetchItems,
	createItem,
	updateItem,
	deleteItem,
}: {
	title: string;
	fields: FieldDef[];
	fetchItems: () => Promise<Item[]>;
	createItem: (data: Record<string, unknown>) => Promise<unknown>;
	updateItem: (id: string, data: Record<string, unknown>) => Promise<unknown>;
	deleteItem: (id: string) => Promise<unknown>;
}) {
	const [items, setItems] = useState<Item[] | null>(null);
	const [editing, setEditing] = useState<Item | "new" | null>(null);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		try {
			setItems(await fetchItems());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		}
	}, [fetchItems]);

	useEffect(() => {
		// setState fires from the async fetch callback, not synchronously in the effect body
		let cancelled = false;
		void (async () => {
			try {
				const data = await fetchItems();
				if (!cancelled) setItems(data);
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [fetchItems]);

	const remove = async (id: string) => {
		setError("");
		try {
			await deleteItem(id);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Delete failed");
		}
	};

	return (
		<div className="flex h-full flex-col text-[12px]">
			<div className="mb-2 flex items-center justify-between">
				<span className="font-bold">{title}</span>
				<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-3 py-0.5 font-bold hover:bg-accent-soft active:translate-y-px disabled:opacity-60" onClick={() => setEditing("new")}>
					New
				</button>
			</div>
			{error && <p className="mb-1 text-red-700">{error}</p>}
			<div className="min-h-0 flex-1 overflow-auto border border-accent-border bg-surface rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] p-1">
				{items === null ? (
					<p className="p-2">Loading…</p>
				) : items.length === 0 ? (
					<p className="p-2 opacity-60">No items yet.</p>
				) : (
					items.map((item) => (
						<div key={item.id} className="flex items-center gap-2 px-1 py-0.5">
							<span className="flex-1 truncate">
								{String(item[fields[0].key] ?? item.id)}
							</span>
							<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-2 py-0 hover:bg-accent-soft" onClick={() => setEditing(item)}>
								Edit
							</button>
							<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-2 py-0 hover:bg-accent-soft" onClick={() => void remove(item.id)}>
								Del
							</button>
						</div>
					))
				)}
			</div>
			{editing !== null && (
				<ItemForm
					fields={fields}
					item={editing === "new" ? null : editing}
					onCancel={() => setEditing(null)}
					onSaved={async () => {
						setEditing(null);
						await load();
					}}
					createItem={createItem}
					updateItem={updateItem}
				/>
			)}
		</div>
	);
}

function ItemForm({
	fields,
	item,
	onCancel,
	onSaved,
	createItem,
	updateItem,
}: {
	fields: FieldDef[];
	item: Item | null;
	onCancel: () => void;
	onSaved: () => Promise<void>;
	createItem: (data: Record<string, unknown>) => Promise<unknown>;
	updateItem: (id: string, data: Record<string, unknown>) => Promise<unknown>;
}) {
	const [values, setValues] = useState<Record<string, unknown>>(() => {
		const v: Record<string, unknown> = {};
		for (const f of fields) {
			v[f.key] = item ? item[f.key] : (f.default ?? "");
		}
		return v;
	});
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		setError("");
		setBusy(true);
		try {
			if (item) {
				await updateItem(item.id, values);
			} else {
				await createItem(values);
			}
			await onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Save failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] mt-2 p-2">
			{fields.map((f) => (
				<label key={f.key} className="mb-1 flex items-start justify-between gap-2">
					<span className="pt-0.5">{f.label}:</span>
					{f.type === "textarea" ? (
						<textarea
							rows={3}
							value={String(values[f.key] ?? "")}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
							className={inputCls}
						/>
					) : f.type === "checkbox" ? (
						<input
							type="checkbox"
							checked={Boolean(values[f.key])}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked }))}
						/>
					) : f.type === "select" ? (
						<select
							value={String(values[f.key] ?? "")}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
							className={inputCls}
						>
							{f.options?.map((o) => (
								<option key={o}>{o}</option>
							))}
						</select>
					) : (
						<input
							type={f.type === "number" ? "number" : "text"}
							value={String(values[f.key] ?? "")}
							onChange={(e) =>
								setValues((v) => ({
									...v,
									[f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
								}))
							}
							className={inputCls}
						/>
					)}
				</label>
			))}
			{error && <p className="text-red-700">{error}</p>}
			<div className="mt-1 flex justify-end gap-1">
				<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-3 hover:bg-accent-soft active:translate-y-px" onClick={onCancel}>
					Cancel
				</button>
				<button className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-3 font-bold hover:bg-accent-soft active:translate-y-px disabled:opacity-60" disabled={busy} onClick={() => void submit()}>
					{busy ? "…" : "Save"}
				</button>
			</div>
		</div>
	);
}

export function ConfigEditor({
	fields,
	fetchConfig,
	saveConfig,
}: {
	fields: FieldDef[];
	fetchConfig: () => Promise<Record<string, unknown>>;
	saveConfig: (patch: Record<string, unknown>) => Promise<unknown>;
}) {
	const [values, setValues] = useState<Record<string, unknown> | null>(null);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		fetchConfig()
			.then(setValues)
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
	}, [fetchConfig]);

	if (error) return <p className="text-[12px] text-red-700">{error}</p>;
	if (!values) return <p className="text-[12px] opacity-60">Loading…</p>;

	return (
		<div className="text-[12px]">
			<p className="mb-2 font-bold">Site settings</p>
			{fields.map((f) => (
				<label key={f.key} className="mb-1 flex items-start justify-between gap-2">
					<span className="pt-0.5">{f.label}:</span>
					{f.type === "textarea" ? (
						<textarea
							rows={3}
							value={String(values[f.key] ?? "")}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
							className={inputCls}
						/>
					) : (
						<input
							type="text"
							value={String(values[f.key] ?? "")}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
							className={inputCls}
						/>
					)}
				</label>
			))}
			{error && <p className="text-red-700">{error}</p>}
			{saved && <p className="text-accent-dark font-bold">Saved.</p>}
			<div className="mt-1 flex justify-end">
				<button
					className="border border-accent-border bg-chrome rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-3 py-0.5 font-bold hover:bg-accent-soft active:translate-y-px disabled:opacity-60"
					onClick={() => {
						setSaved(false);
						void saveConfig(values)
							.then(() => setSaved(true))
							.catch((err) => setError(err instanceof Error ? err.message : "Save failed"));
					}}
				>
					Save
				</button>
			</div>
		</div>
	);
}

export function TabbedEditors({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
	const [active, setActive] = useState(tabs[0]?.label);
	return (
		<div className="flex h-full flex-col">
			<div className="flex gap-0.5 px-1 pt-1 text-[11px]">
				{tabs.map((t) => (
					<button
						key={t.label}
						className={`border border-accent-border rounded-md px-2 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${active === t.label ? "bg-accent-soft font-bold" : "bg-chrome opacity-80 hover:opacity-100 hover:bg-accent-soft"}`}
						onClick={() => setActive(t.label)}
					>
						{t.label}
					</button>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-auto border border-accent-border bg-surface rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] p-2">
				{tabs.map((t) => (
					<div key={t.label} className={active === t.label ? "h-full" : "hidden"}>
						{t.content}
					</div>
				))}
			</div>
		</div>
	);
}
