// Oznámení akcí do Discordu — vypsání/úprava (embed) a 1h reminder (text).
// Bez DISCORD_CTA_CHANNEL_ID / DISCORD_BOT_TOKEN je vše no-op (viz
// sendChannelMessage) — appka jede dál, jen nic neposílá.

import { sendChannelMessage } from "./discord";
import type { EventRow } from "./events";

const CHANNEL_ID = process.env.DISCORD_CTA_CHANNEL_ID ?? "";
const SITE_URL = (process.env.AUTH_URL ?? "https://dismount.team").replace(/\/$/, "");

/** "YYYY-MM-DD HH:MM" (UTC) -> unix vteřiny, pro Discord <t:...> formát. */
function toUnix(startsAt: string): number {
  const iso = startsAt.replace(" ", "T");
  return Math.floor(new Date((iso.length === 16 ? iso + ":00" : iso) + "Z").getTime() / 1000);
}

/** Nové vypsání akce (nebo úprava data/názvu) — pošle embed s odkazem. */
export async function announceEvent(event: EventRow): Promise<string | null> {
  if (!CHANNEL_ID) return null;
  const unix = toUnix(event.starts_at);
  const url = `${SITE_URL}/akce/${event.id}`;
  return sendChannelMessage(CHANNEL_ID, {
    embeds: [
      {
        title: `📢 ${event.title}`,
        color: 0xe0a83c,
        description: `**Přihlas se na [stránce akce](${url})!**`,
        fields: [
          { name: "Caller", value: event.created_by_name, inline: true },
          { name: "Typ", value: event.type, inline: true },
          { name: "Kdy", value: `<t:${unix}:F> (<t:${unix}:R>)`, inline: false },
        ],
      },
    ],
  });
}

/** Reminder ~1 h před akcí do stejného kanálu (posílá cron endpoint). */
export async function remindEvent(event: EventRow): Promise<string | null> {
  if (!CHANNEL_ID) return null;
  const unix = toUnix(event.starts_at);
  const url = `${SITE_URL}/akce/${event.id}`;
  // Prostý content nerozumí markdown odkazům [text](url) (na rozdíl od
  // embedu) — proto holá URL, Discord ji sám polinkuje.
  return sendChannelMessage(CHANNEL_ID, {
    content: `⏰ **${event.title}** začíná <t:${unix}:R>! Kdo ještě nemá roli, mrkni sem: ${url}`,
  });
}
