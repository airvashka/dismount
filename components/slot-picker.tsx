"use client";

// Picker slotu v2: procházení itemů podle IKON (grid) + textové hledání,
// u zbraní filtr podle role (Tank/Heal/Support/Melee/Ranged/Shapeshifter),
// možnost vybrat až 3 VARIANTY na kus ("Stalker Shoes/Mercenary Shoes T7").
// „Přidat řádek" vloží hotový řádek do kompozice; výběr zůstává pro další.

import { useEffect, useState } from "react";
import {
  ITEM_CATALOG,
  findCatalogItem,
  roleClass,
  type CatalogCategory,
  type CatalogItem,
} from "@/lib/albion";
import { ItemIcon } from "@/components/item-icon";

export type PickerPrefill = { role_name: string; build: string; note: string };

const RENDER = "/api/icon"; // cache proxy, viz app/api/icon
const MAX_VARIANTS = 3;

const FIELDS: Array<{ cat: CatalogCategory; label: string }> = [
  { cat: "weapon", label: "Zbraň" },
  { cat: "offhand", label: "Offhand" },
  { cat: "head", label: "Helma" },
  { cat: "chest", label: "Hruď" },
  { cat: "shoes", label: "Boty" },
  { cat: "cape", label: "Capa" },
  { cat: "food", label: "Jídlo" },
];

type Sel = { items: CatalogItem[]; tier: number };
const emptySel = (): Sel => ({ items: [], tier: 8 });
const emptySels = () =>
  Object.fromEntries(FIELDS.map((f) => [f.cat, emptySel()])) as Record<
    CatalogCategory,
    Sel
  >;

const ROLE_TABS = ["Vše", "Tank", "Heal", "Support", "Melee", "Ranged", "Shape"];

// Tiery v selectu: T9–T11 = slang pro enchantovanou T8 (8.1/8.2/8.3),
// ikona dostane enchant tečky přes @.
const TIER_OPTIONS = [6, 7, 8, 9, 10, 11];

const iconOf = (item: CatalogItem, tier: number) => {
  const ench = tier > 8 ? Math.min(4, tier - 8) : 0;
  const base = Math.min(8, tier, item.maxTier);
  return `${RENDER}/T${base}_${item.id}${ench ? `@${ench}` : ""}.png?quality=4&size=64`;
};

function PickerField({
  cat,
  label,
  sel,
  onChange,
}: {
  cat: CatalogCategory;
  label: string;
  sel: Sel;
  onChange: (s: Sel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Vše");

  const list = ITEM_CATALOG[cat].filter(
    (it) =>
      (!query.trim() ||
        it.name.toLowerCase().includes(query.trim().toLowerCase())) &&
      (cat !== "weapon" || tab === "Vše" || roleClass(it.id) === tab)
  );

  const toggleItem = (it: CatalogItem) => {
    const has = sel.items.some((x) => x.id === it.id);
    const items = has
      ? sel.items.filter((x) => x.id !== it.id)
      : sel.items.length < MAX_VARIANTS
        ? [...sel.items, it]
        : sel.items;
    onChange({ ...sel, items });
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
        <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted">
          {label}
        </span>
        {sel.items.map((it) => (
          <span
            key={it.id}
            className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-xs"
          >
            <ItemIcon src={iconOf(it, sel.tier)} size={18} />
            {it.name}
            <button
              type="button"
              onClick={() => toggleItem(it)}
              className="text-muted hover:text-red-400 cursor-pointer"
            >
              ✕
            </button>
          </span>
        ))}
        {sel.items.length > 0 && (
          <select
            value={sel.tier}
            onChange={(e) => onChange({ ...sel, tier: Number(e.target.value) })}
            className="rounded border border-border bg-surface px-1 py-0.5 text-[11px] outline-none cursor-pointer"
          >
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                T{t}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={
            "ml-auto rounded border px-2 py-0.5 text-[11px] cursor-pointer " +
            (open
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-muted hover:border-accent hover:text-accent")
          }
        >
          {open ? "zavřít ▴" : sel.items.length > 0 ? "změnit ▾" : "vybrat ▾"}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded border border-border bg-surface p-2 shadow-2xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="hledat podle názvu… (nebo jen klikej na ikony)"
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
          />
          {cat === "weapon" && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ROLE_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    "rounded px-2 py-0.5 text-[11px] border cursor-pointer " +
                    (tab === t
                      ? "border-accent bg-accent/20 text-accent font-semibold"
                      : "border-border text-muted hover:border-accent")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 grid max-h-56 grid-cols-7 gap-1 overflow-y-auto sm:grid-cols-9">
            {list.map((it) => {
              const selected = sel.items.some((x) => x.id === it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  title={it.name}
                  onClick={() => toggleItem(it)}
                  className={
                    "rounded p-0.5 cursor-pointer transition-colors " +
                    (selected
                      ? "bg-accent/30 ring-1 ring-accent"
                      : "hover:bg-accent/10")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={iconOf(it, sel.tier)}
                    alt={it.name}
                    width={36}
                    height={36}
                    loading="lazy"
                  />
                </button>
              );
            })}
            {list.length === 0 && (
              <span className="col-span-full py-2 text-center text-xs text-muted">
                nic nenalezeno
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-muted">
            Klikem vybereš, dalším klikem zrušíš — až {MAX_VARIANTS} varianty
            (např. Stalker/Merc boty).
          </p>
        </div>
      )}
    </div>
  );
}

export function SlotPicker({
  onAdd,
  prefill,
}: {
  onAdd: (line: string) => void;
  prefill?: PickerPrefill | null;
}) {
  const [sels, setSels] = useState<Record<CatalogCategory, Sel>>(emptySels);

  // Zpětné načtení existujícího řádku (klik na ✎ v náhledu) — rozumí
  // i variantám ("Royal/stalker T7") a slangu.
  useEffect(() => {
    if (!prefill) return;
    const next = emptySels();
    const addPart = (part: string) => {
      // "8.1"->T9, "8.2"->T10, "8.3"->T11; "T9"-"T12" přímo; jinak T4-T8
      let tier = 8;
      let m = part.match(/\b8\.([1-4])\b/);
      if (m) tier = 8 + Number(m[1]);
      else if ((m = part.match(/\bT(9|1[0-2])\b/i))) tier = Number(m[1]);
      else if ((m = part.match(/\b(?:T)?([4-8])(?:\.[1-4])?\+?\b/i)))
        tier = Number(m[1]);
      tier = Math.max(6, Math.min(11, tier));
      for (const seg of part.split("/").map((s) => s.trim()).filter(Boolean)) {
        const hit = findCatalogItem(seg);
        if (!hit) continue;
        const box = next[hit.cat];
        if (
          box.items.length < MAX_VARIANTS &&
          !box.items.some((x) => x.id === hit.item.id)
        ) {
          box.items.push(hit.item);
          box.tier = tier; // T9+ = enchant, iconOf si tier na T8@e přepočte
        }
      }
    };
    addPart(prefill.role_name);
    for (const part of prefill.build.split(",").map((p) => p.trim()).filter(Boolean)) {
      addPart(part);
    }
    if (prefill.note) addPart(prefill.note);
    setSels(next);
  }, [prefill]);

  const nameOf = (s: Sel) =>
    `${s.items.map((i) => i.name).join("/")} T${s.tier}`;

  const buildLine = (): string => {
    if (sels.weapon.items.length === 0) return "";
    const role = nameOf(sels.weapon);
    const gear = (["offhand", "head", "chest", "shoes", "cape"] as const)
      .map((c) => sels[c])
      .filter((s) => s.items.length > 0)
      .map(nameOf)
      .join(", ");
    const food = sels.food.items.length > 0 ? nameOf(sels.food) : "";
    return [role, gear, food].filter((p, i) => i === 0 || p).join(" | ");
  };

  const hasWeapon = sels.weapon.items.length > 0;

  return (
    <div className="mt-2 rounded-lg border border-border bg-background/40 p-2">
      <div className="grid gap-1.5">
        {FIELDS.map(({ cat, label }) => (
          <PickerField
            key={cat}
            cat={cat}
            label={label}
            sel={sels[cat]}
            onChange={(s) => setSels((prev) => ({ ...prev, [cat]: s }))}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted">
          {hasWeapon ? buildLine() : "vyber aspoň zbraň"}
        </span>
        <button
          type="button"
          disabled={!hasWeapon}
          onClick={() => hasWeapon && onAdd(buildLine())}
          className="shrink-0 rounded bg-accent px-3 py-1 text-xs font-medium text-background hover:bg-accent-hover cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ➕ Přidat řádek
        </button>
      </div>
    </div>
  );
}
