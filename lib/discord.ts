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

/**
 * Upraví existující zprávu (místo nového postu při každé úpravě akce).
 * Vrací false i když zpráva třeba mezitím zmizela (smazaná ručně) — volající
 * si pak může poslat novou.
 */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: { content?: string; embeds?: DiscordEmbed[] }
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !channelId || !messageId) return false;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Discord API: nelze upravit zprávu", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Discord API: chyba při úpravě zprávy", err);
    return false;
  }
}

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
};

/**
 * Pošle zprávu do Discord kanálu (embed a/nebo obyčejný text). Bez
 * DISCORD_BOT_TOKEN nebo bez channelId je no-op (vrátí null) — appka
 * funguje dál i bez nakonfigurovaného bota, jen nic neposílá.
 */
export async function sendChannelMessage(
  channelId: string,
  payload: { content?: string; embeds?: DiscordEmbed[] }
): Promise<string | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !channelId) return null;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Discord API: nelze poslat zprávu", res.status, await res.text());
      return null;
    }
    const msg = (await res.json()) as { id: string };
    return msg.id;
  } catch (err) {
    console.error("Discord API: chyba při odesílání zprávy", err);
    return null;
  }
}
