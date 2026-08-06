import {
  sendChannelMessage,
  editChannelMessage,
  type MessagePayload,
} from "./discord";
import { isDevEnvironment } from "./dev-env";
import type { EventRow } from "./events";
import { eventPath } from "./slug";

const SITE_URL = (process.env.AUTH_URL ?? "https://dismount.team").replace(
  /\/$/,
  ""
);

/** Production CTA channel (#call-to-arms). Never used when DEV_ENVIRONMENT is on. */
const PROD_CTA_CHANNEL_ID = "1515762742852587711";

function resolveChannelId(type: string): string | null {
  if (isDevEnvironment()) {
    const perType: Record<string, string | undefined> = {
      "Ava Raid": process.env.DEV_DISCORD_AVA_CHANNEL_ID,
      "Random Content": process.env.DEV_DISCORD_RANDOM_CHANNEL_ID,
    };
    const id =
      (perType[type] || process.env.DEV_DISCORD_CTA_CHANNEL_ID || "").trim();
    // No fallback to production channels in the local sandbox.
    return id || null;
  }

  const perType: Record<string, string | undefined> = {
    "Ava Raid": process.env.DISCORD_AVA_CHANNEL_ID,
    "Random Content": process.env.DISCORD_RANDOM_CHANNEL_ID,
  };
  return perType[type] || PROD_CTA_CHANNEL_ID;
}

function toUnix(startsAt: string): number {
  const iso = startsAt.replace(" ", "T");
  return Math.floor(
    new Date((iso.length === 16 ? iso + ":00" : iso) + "Z").getTime() / 1000
  );
}

function announcePayload(event: EventRow, edited: boolean): MessagePayload {
  const unix = toUnix(event.starts_at);
  const url = `${SITE_URL}${eventPath(event.id, event.title)}`;
  const pingEveryone =
    !edited &&
    !isDevEnvironment() &&
    (process.env.DISCORD_PING_EVERYONE ?? "true").toLowerCase() !== "false";

  return {
    ...(pingEveryone ? { content: "@everyone" } : {}),
    allowed_mentions: { parse: pingEveryone ? ["everyone"] : [] },
    embeds: [
      {
        title: `📢 ${event.title}`,
        color: 0xe0a83c,
        description: `**Přihlas se na [stránce akce](${url})!**`,
        fields: [
          { name: "Caller", value: event.created_by_name, inline: true },
          { name: "Typ", value: event.type, inline: true },
          {
            name: "Kdy",
            value: `<t:${unix}:F> (<t:${unix}:R>)`,
            inline: false,
          },
        ],
        ...(edited ? { footer: { text: "✏️ Upraveno" } } : {}),
      },
    ],
  };
}

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

export async function remindEvent(event: EventRow): Promise<string | null> {
  const channelId = resolveChannelId(event.type);
  if (!channelId) return null;
  const unix = toUnix(event.starts_at);
  const url = `${SITE_URL}${eventPath(event.id, event.title)}`;
  return sendChannelMessage(channelId, {
    content: `⏰ **${event.title}** začíná <t:${unix}:R>! Kdo ještě nemá roli, mrkni sem: ${url}`,
  });
}
