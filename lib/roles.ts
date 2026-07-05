// Mapování Discord rolí -> role na webu.
// Mapuje se podle ID role (přejmenování role na Discordu nic nerozbije).
// Hráč může mít víc rolí (např. Caller + Officer) — bere se ta nejvyšší.

export type WebRole =
  | "guest"
  | "ally"
  | "friend"
  | "novacek"
  | "recruit"
  | "member"
  | "caller"
  | "admin";

export const HIERARCHY: WebRole[] = [
  "guest",
  "ally",
  "friend",
  "novacek",
  "recruit",
  "member",
  "caller",
  "admin",
];

// Discord role ID -> webová role (server guildy Dismount)
export const ROLE_MAP: Record<string, WebRole> = {
  "1258437128417706136": "admin", // GM / vedení guildy
  "1223291640697982976": "admin", // [RH] Right Hand
  "1223314990984073286": "admin", // [DA] Discord Admin
  "1311012789547958372": "admin", // [O] Officer / člen vedení
  "1249701849523814442": "caller", // [C] Caller
  "1234067078563106866": "caller", // [AC] Ava Caller
  "1238942644122550393": "member", // [RE] Recruiter
  "1257836020398031049": "member", // [M] Member
  "1257835823655551016": "recruit", // [R] Zkušený hráč, nový v guildě
  "1257835642868596837": "novacek", // [NO] Nováček
  "1238958037926936727": "friend", // [F] Friend
  "1273754545687892091": "ally", // Členové aliance
};

export const ROLE_LABELS: Record<WebRole, string> = {
  guest: "Host",
  ally: "Aliance",
  friend: "Friend",
  novacek: "Nováček",
  recruit: "Recruit",
  member: "Member",
  caller: "Caller",
  admin: "Vedení",
};

/** Z ID Discord rolí člena vybere nejvyšší odpovídající webovou roli. */
export function mapRoles(discordRoleIds: string[]): WebRole {
  let best: WebRole = "guest";
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
