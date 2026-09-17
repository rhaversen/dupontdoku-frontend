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
		void load();
	}, [load]);

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
				<button className="xp-btn px-3 py-0.5" onClick={() => setEditing("new")}>
					New
				</button>
			</div>
			{error && <p className="mb-1 text-red-700">{error}</p>}
			<div className="xp-inset min-h-0 flex-1 overflow-auto rounded-sm bg-white p-1">
				{items === null ? (
					<p className="p-2">Loading…</p>
				) : items.length === 0 ? (
					<p className="p-2 opacity-60">No items yet.</p>
				) : (
					items.map((item) => (
						<div key={item.id} className="flex items-center gap-2 border-b border-[#eee] px-1 py-0.5">
							<span className="flex-1 truncate">
								{String(item[fields[0].key] ?? item.id)}
							</span>
							<button className="xp-btn px-2 py-0" onClick={() => setEditing(item)}>
								Edit
							</button>
							<button className="xp-btn px-2 py-0" onClick={() => void remove(item.id)}>
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
		<div className="xp-inset mt-2 rounded-sm bg-[#ece9d8] p-2">
			{fields.map((f) => (
				<label key={f.key} className="mb-1 flex items-start justify-between gap-2">
					<span className="pt-0.5">{f.label}:</span>
					{f.type === "textarea" ? (
						<textarea
							rows={3}
							value={String(values[f.key] ?? "")}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
							className="xp-inset flex-1 rounded-sm px-1 py-0.5"
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
							className="xp-inset flex-1 rounded-sm px-1 py-0.5"
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
							className="xp-inset flex-1 rounded-sm px-1 py-0.5"
						/>
					)}
				</label>
			))}
			{error && <p className="text-red-700">{error}</p>}
			<div className="mt-1 flex justify-end gap-1">
				<button className="xp-btn px-3" onClick={onCancel}>
					Cancel
				</button>
				<button className="xp-btn px-3" disabled={busy} onClick={() => void submit()}>
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
	if (!values) return <p className="text-[12px]">Loading…</p>;

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
							className="xp-inset flex-1 rounded-sm px-1 py-0.5"
						/>
					) : (
						<input
							type="text"
							value={String(values[f.key] ?? "")}
							onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
							className="xp-inset flex-1 rounded-sm px-1 py-0.5"
						/>
					)}
				</label>
			))}
			{error && <p className="text-red-700">{error}</p>}
			{saved && <p className="text-green-700">Saved.</p>}
			<div className="mt-1 flex justify-end">
				<button
					className="xp-btn px-3"
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
			<div className="flex gap-0.5 border-b border-[#d5d2c8] bg-[#ece9d8] px-1 pt-1 text-[11px]">
				{tabs.map((t) => (
					<button
						key={t.label}
						className={`rounded-t-sm border border-b-0 border-[#d5d2c8] px-2 py-0.5 ${
							active === t.label ? "bg-white font-bold" : "bg-[#e6e3d3]"
						}`}
						onClick={() => setActive(t.label)}
					>
						{t.label}
					</button>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-auto bg-white p-2">
				{tabs.map((t) => (
					<div key={t.label} className={active === t.label ? "h-full" : "hidden"}>
						{t.content}
					</div>
				))}
			</div>
		</div>
	);
}
