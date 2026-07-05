// Textový formát kompozice: jeden slot na řádek, "Role | build/gear | poznámka".
// Řádek začínající "#" založí novou partu (max ~20 hráčů), např.:
//   # Parta 1 — Heavybrawl
//   Dreadstorm T7 | Hellion hood T7+, ...
//   # Parta 2 — PVE
//   ...
// Stejný formát používají akce i šablony — edituje se jako obyčejný text,
// jednoduše jako v Google Sheetu.

export type SlotLine = {
  party: string;
  role_name: string;
  build: string;
  note: string;
};

export const PARTY_MAX = 20;

/** Bezpečně rozparsuje offers JSON přihlášky na pole rolí ("FILL" = cokoliv). */
export function parseOffers(offers: string): string[] {
  try {
    const arr = JSON.parse(offers);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function parseSlotLines(text: string): SlotLine[] {
  const out: SlotLine[] = [];
  let party = "";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      party = line.replace(/^#+\s*/, "");
      continue;
    }
    // Vložení přímo z Google Sheetu: sloupce oddělené tabulátory
    // (Zbraň | Hood | Armor | Boty | Capa | Jídlo) -> jídlo do poznámky.
    if (line.includes("\t")) {
      const cols = line.split("\t").map((p) => p.trim());
      const role_name = cols[0] ?? "";
      const rest = cols.slice(1).filter(Boolean);
      const note = rest.length >= 2 ? rest[rest.length - 1] : "";
      const build = (rest.length >= 2 ? rest.slice(0, -1) : rest).join(", ");
      if (role_name) out.push({ party, role_name, build, note });
      continue;
    }
    const [role_name = "", build = "", note = ""] = line
      .split("|")
      .map((p) => p.trim());
    if (role_name) out.push({ party, role_name, build, note });
  }
  return out;
}

export function slotsToText(
  slots: Array<{ party?: string; role_name: string; build: string; note: string }>
): string {
  const lines: string[] = [];
  let currentParty: string | null = null;
  for (const s of slots) {
    const party = s.party ?? "";
    if (party !== currentParty) {
      if (party) {
        if (lines.length > 0) lines.push("");
        lines.push(`# ${party}`);
      }
      currentParty = party;
    }
    lines.push(
      [s.role_name, s.build, s.note].filter((p, i) => i === 0 || p).join(" | ")
    );
  }
  return lines.join("\n");
}
