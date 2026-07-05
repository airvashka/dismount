"use client";

// Editor kompozice: každá parta = vlastní blok (nadpis + sloty + živý náhled).
// Do formuláře se odesílá jediné pole `slots` v textovém formátu
// (# Název party + řádky slotů) — server se nemění.
// Textová pole podporují copy-paste řádků přímo z Google Sheetu (tabulátory).

import { useState } from "react";
import { parseSlotLines, PARTY_MAX } from "@/lib/comp-format";
import { slotIconUrl } from "@/lib/albion";
import { GearChips } from "@/components/gear-chips";
import { ItemIcon } from "@/components/item-icon";
import { SlotPicker, type PickerPrefill } from "@/components/slot-picker";

export type CompOption = { id: number; name: string; text: string };

type Section = { title: string; text: string };

const SECTION_PRESETS = ["Parta", "Bomba", "PVE"];

function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  let cur: Section = { title: "", text: "" };
  for (const line of text.split("\n")) {
    if (line.trim().startsWith("#")) {
      if (cur.title || cur.text.trim()) sections.push(cur);
      cur = { title: line.trim().replace(/^#+\s*/, ""), text: "" };
    } else {
      cur.text += (cur.text ? "\n" : "") + line;
    }
  }
  if (cur.title || cur.text.trim()) sections.push(cur);
  if (sections.length === 0) sections.push({ title: "", text: "" });
  return sections.map((s) => ({ ...s, text: s.text.replace(/^\n+|\n+$/g, "") }));
}

function serializeSections(sections: Section[]): string {
  return sections
    .map((s) => (s.title.trim() ? `# ${s.title.trim()}\n` : "") + s.text)
    .join("\n\n");
}

export function CompEditor({
  name = "slots",
  initialText = "",
  templates = [],
}: {
  name?: string;
  initialText?: string;
  templates?: CompOption[];
}) {
  const [sections, setSections] = useState<Section[]>(() =>
    parseSections(initialText)
  );
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<PickerPrefill | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ section: number; index: number } | null>(null);

  const update = (i: number, patch: Partial<Section>) =>
    setSections((s) => s.map((sec, si) => (si === i ? { ...sec, ...patch } : sec)));

  const remove = (i: number) =>
    setSections((s) => (s.length > 1 ? s.filter((_, si) => si !== i) : [{ title: "", text: "" }]));

  /** Smaže n-tý slot řádek dané party (počítá jen řádky, které jsou sloty). */
  const removeSlotAt = (secIndex: number, slotIndex: number) =>
    setSections((s) =>
      s.map((sec, si) => {
        if (si !== secIndex) return sec;
        let seen = -1;
        const lines = sec.text.split("\n").filter((line) => {
          const t = line.trim();
          const isSlot =
            t.length > 0 &&
            !t.startsWith("#") &&
            Boolean(t.split(/\t|\|/)[0]?.trim());
          if (isSlot) {
            seen++;
            if (seen === slotIndex) return false;
          }
          return true;
        });
        return { ...sec, text: lines.join("\n") };
      })
    );

  /** Nahradí n-tý slot řádek dané party (uložení editace přes picker). */
  const replaceSlotAt = (secIndex: number, slotIndex: number, newLine: string) =>
    setSections((s) =>
      s.map((sec, si) => {
        if (si !== secIndex) return sec;
        let seen = -1;
        const lines = sec.text.split("\n").map((line) => {
          const t = line.trim();
          const isSlot =
            t.length > 0 &&
            !t.startsWith("#") &&
            Boolean(t.split(/\t|\|/)[0]?.trim());
          if (isSlot) {
            seen++;
            if (seen === slotIndex) return newLine;
          }
          return line;
        });
        return { ...sec, text: lines.join("\n") };
      })
    );

  const addSection = (preset: string) =>
    setSections((s) => [
      ...s,
      { title: preset === "Parta" ? `Parta ${s.length + 1}` : preset, text: "" },
    ]);

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serializeSections(sections)} />

      {templates.length > 0 && (
        <label className="block">
          <span className="text-sm text-muted">Načíst kompozici ze šablony</span>
          <select
            defaultValue=""
            onChange={(e) => {
              const t = templates.find((x) => x.id === Number(e.target.value));
              if (t) setSections(parseSections(t.text));
            }}
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">— vlastní / prázdná —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {sections.map((sec, i) => {
        const slots = parseSlotLines(sec.text);
        return (
          <div key={i} className="rounded-lg border border-border bg-surface/50 p-3">
            <div className="flex items-center gap-2">
              <input
                value={sec.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder={sections.length > 1 ? `Parta ${i + 1}` : "Název party (nepovinné)"}
                className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm font-semibold outline-none focus:border-accent"
              />
              <span className="text-xs text-muted whitespace-nowrap">
                {slots.length}/{PARTY_MAX}
                {slots.length > PARTY_MAX && (
                  <span className="text-red-400"> ⚠ přes {PARTY_MAX}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                title="Odebrat partu"
                className="rounded border border-border px-2 py-1 text-xs text-muted hover:border-red-500 hover:text-red-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <textarea
              value={sec.text}
              onChange={(e) => update(i, { text: e.target.value })}
              rows={Math.min(12, Math.max(4, sec.text.split("\n").length + 1))}
              placeholder={`Jeden slot na řádek: Role | gear | poznámka\nnapř. Dreadstorm T7 | Hellion hood T7+, Guardian armor T8, Royal/blink T7, Smuggler T7 | Ava omeleta 7.1+\n(jde sem vložit i řádky přímo z Google Sheetu)`}
              className="mt-2 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            />

            <button
              type="button"
              onClick={() => {
                setPickerOpen((p) => (p === i ? null : i));
                setEditingSlot(null);
                setPrefill(null);
              }}
              className={
                "mt-2 inline-flex items-center gap-1.5 rounded border px-3 py-1 text-xs font-medium cursor-pointer transition-colors " +
                (pickerOpen === i
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-accent/50 text-accent hover:bg-accent/10")
              }
            >
              ⚒ {pickerOpen === i ? "Skrýt picker" : "Přidat slot pickerem"}
            </button>
            {pickerOpen === i && (
              <SlotPicker
                prefill={prefill}
                editing={editingSlot?.section === i}
                onCancelEdit={() => {
                  setEditingSlot(null);
                  setPrefill(null);
                }}
                onAdd={(line) => {
                  if (editingSlot && editingSlot.section === i) {
                    replaceSlotAt(i, editingSlot.index, line);
                    setEditingSlot(null);
                    setPrefill(null);
                  } else {
                    update(i, { text: sec.text.trim() ? sec.text.trimEnd() + "\n" + line : line });
                  }
                }}
              />
            )}

            {slots.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {slots.map((s, si) => {
                  const icon = slotIconUrl(s.role_name, s.build);
                  return (
                    <li key={si} className="flex items-center gap-2 text-xs">
                      {icon ? (
                        <ItemIcon src={icon} size={24} />
                      ) : (
                        <span className="inline-block w-6" />
                      )}
                      <span className="font-medium whitespace-nowrap">{s.role_name}</span>
                      <span className="text-muted overflow-hidden">
                        <GearChips
                          text={[s.build, s.note].filter(Boolean).join(", ")}
                          size={18}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPickerOpen(i);
                          setPrefill({
                            role_name: s.role_name,
                            build: s.build,
                            note: s.note,
                          });
                          setEditingSlot({ section: i, index: si });
                        }}
                        title="Načíst tento řádek do pickeru"
                        className="ml-auto shrink-0 text-muted hover:text-accent cursor-pointer"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlotAt(i, si)}
                        title="Smazat řádek"
                        className="shrink-0 text-muted hover:text-red-400 cursor-pointer"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      <div className="flex gap-2">
        {SECTION_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addSection(p)}
            className="rounded border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent cursor-pointer"
          >
            + {p}
          </button>
        ))}
      </div>
    </div>
  );
}
