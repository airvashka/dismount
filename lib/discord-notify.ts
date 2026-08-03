// Oznámení akcí do Discordu — vypsání/úprava (embed) a 1h reminder (text).
// Bez DISCORD_BOT_TOKEN je vše no-op (viz sendChannelMessage) — appka jede
// dál, jen nic neposílá.

import {
  sendChannelMessage,
  editChannelMessage,
  type MessagePayload,
} from "./discord";
import type { EventRow } from "./events";
import { eventPath } from "./slug";

const SITE_URL = (process.env.AUTH_URL ?? "https://dismount.team").replace(/\/$/, "");

// Produkční CTA kanál (#call-to-arms). Ava/Random můžou mít vlastní env.
const CTA_CHANNEL_ID = "1515762742852587711";

function resolveChannelId(type: string): string {
  const perType: Record<string, string | undefined> = {
    "Ava Raid": process.env.DISCORD_AVA_CHANNEL_ID,
    "Random Content": process.env.DISCORD_RANDOM_CHANNEL_ID,
  };
  return perType[type] || CTA_CHANNEL_ID;
}

/** "YYYY-MM-DD HH:MM" (UTC) -> unix vteřiny, pro Discord <t:...> formát. */
function toUnix(startsAt: string): number {
  const iso = startsAt.replace(" ", "T");
  return Math.floor(new Date((iso.length === 16 ? iso + ":00" : iso) + "Z").getTime() / 1000);
}

function announcePayload(event: EventRow, edited: boolean): MessagePayload {
  const unix = toUnix(event.starts_at);
  const url = `${SITE_URL}${eventPath(event.id, event.title)}`;
  return {
    ...(!edited ? { content: "@everyone" } : {}),
    allowed_mentions: { parse: ["everyone"] },
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
        ...(edited ? { footer: { text: "✏️ Upraveno" } } : {}),
      },
    ],
  };
}

/**
 * Vypsání akce pošle nový embed; úprava (voláno znovu se stejným eventem,
 * který už má discord_message_id) EDITUJE původní zprávu místo nového postu.
 * Když editace selže (zpráva mezitím zmizela), pošle se nová.
 */
export async function announceEvent(event: EventRow): Promise<string | null> {
  const channelId = resolveChannelId(event.type);
  if (!channelId) return null;
  if (event.discord_message_id) {
    const ok = await editChannelMessage(
      channelId,
      event.discord_message_id,
      announcePayload(event, true)
    );
    if (ok) return event.discord_message_id;
  }
  return sendChannelMessage(channelId, announcePayload(event, false));
}

/** Zrušení akce — edituje původní post na "ZRUŠENO" (nemaže ho, ať to lidi vidí). */
export async function cancelEventAnnouncement(event: EventRow): Promise<void> {
  const channelId = resolveChannelId(event.type);
  if (!channelId || !event.discord_message_id) return;
  await editChannelMessage(channelId, event.discord_message_id, {
    embeds: [
      {
        title: `❌ ZRUŠENO: ${event.title}`,
        color: 0xdc2626,
        description: "Tato akce byla zrušena.",
        fields: [
          { name: "Caller", value: event.created_by_name, inline: true },
          { name: "Typ", value: event.type, inline: true },
        ],
      },
    ],
  });
}

/** Reminder ~1 h před akcí do stejného kanálu (posílá cron endpoint). */
export async function remindEvent(event: EventRow): Promise<string | null> {
  const channelId = resolveChannelId(event.type);
  if (!channelId) return null;
  const unix = toUnix(event.starts_at);
  const url = `${SITE_URL}${eventPath(event.id, event.title)}`;
  // Prostý content nerozumí markdown odkazům [text](url) (na rozdíl od
  // embedu) — proto holá URL, Discord ji sám polinkuje.
  return sendChannelMessage(channelId, {
    content: `⏰ **${event.title}** začíná <t:${unix}:R>! Kdo ještě nemá roli, mrkni sem: ${url}`,
  });
}
