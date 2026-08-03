// Mapování Discord rolí -> role na webu.
// Vstup na guild část webu = role Dismount. Rank role jen určují badge a práva.
// Hráč může mít víc rolí — bere se ta nejvyšší.

export type WebRole =
  | "guest"
  | "dismount"
  | "novice"
  | "recruit"
  | "member"
  | "caller"
  | "admin";

export const HIERARCHY: WebRole[] = [
  "guest",
  "dismount",
  "novice",
  "recruit",
  "member",
  "caller",
  "admin",
];

/** Guild role — bez ní je uživatel na webu guest (i když je na Discord serveru). */
export const DISMOUNT_ROLE_ID = "1223298803520503941";

/** Jak často znovu načíst Discord role do JWT (ne při každém requestu). */
export const ROLE_REFRESH_MS = 60 * 60 * 1000; // 1 hodina

// Discord role ID -> webová role
export const ROLE_MAP: Record<string, WebRole> = {
  "1354154330130747536": "admin", // Leadership (full admin)
  "1249701849523814442": "caller", // Caller
  "1257836020398031049": "member", // Member
  "1257835823655551016": "recruit", // Recruit
  "1257835642868596837": "novice", // Novice
  [DISMOUNT_ROLE_ID]: "dismount", // Dismount — fallback / vstupní role
};

export const ROLE_LABELS: Record<WebRole, string> = {
  guest: "Host",
  dismount: "Dismount",
  novice: "Novice",
  recruit: "Recruit",
  member: "Member",
  caller: "Caller",
  admin: "Leadership",
};

/**
 * Bez role Dismount → guest.
 * Jen Dismount → "dismount".
 * Jinak nejvyšší z Novice / Recruit / Member / Caller / Leadership.
 */
export function mapRoles(discordRoleIds: string[]): WebRole {
  if (!discordRoleIds.includes(DISMOUNT_ROLE_ID)) {
    return "guest";
  }

  let best: WebRole = "dismount";
  for (const id of discordRoleIds) {
    const mapped = ROLE_MAP[id];
    if (mapped && HIERARCHY.indexOf(mapped) > HIERARCHY.indexOf(best)) {
      best = mapped;
    }
  }
  return best;
}

export function atLeast(role: WebRole | undefined, min: WebRole): boolean {
  return HIERARCHY.indexOf(role ?? "guest") >= HIERARCHY.indexOf(min);
}
