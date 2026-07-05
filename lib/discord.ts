// Komunikace s Discord API přes bota (REST, bez gateway připojení).
// Potřebuje DISCORD_BOT_TOKEN a DISCORD_GUILD_ID v env.
// Když nejsou nastavené, vrací null = "nenakonfigurováno" a web běží dál.

const API = "https://discord.com/api/v10";

type DiscordMember = { roles: string[]; nick: string | null };

export type MemberInfo = {
  roleIds: string[];
  nick: string | null;
  isInGuild: boolean;
};

/** Vrátí ID rolí a nick člena na guild serveru, null = bot není nakonfigurován. */
export async function fetchGuildMember(
  userId: string
): Promise<MemberInfo | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) return null;

  const res = await fetch(`${API}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) {
    // Uživatel není na Discord serveru guildy.
    return { roleIds: [], nick: null, isInGuild: false };
  }
  if (!res.ok) {
    console.error("Discord API: nelze načíst člena", res.status);
    return null;
  }

  const member = (await res.json()) as DiscordMember;
  return { roleIds: member.roles, nick: member.nick, isInGuild: true };
}

export function isDiscordConfigured(): boolean {
  return Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
}
