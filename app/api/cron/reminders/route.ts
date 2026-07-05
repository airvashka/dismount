// Voláno periodicky (cron na hostu, mimo appku) — najde akce ~1h před
// startem bez poslaného reminderu, pošle ho do Discordu a poznamená si to.
// Chráněno CRON_SECRET (bez něj v env je endpoint natvrdo zakázaný).

import { getEventsDueForReminder, markReminderSent } from "@/lib/events";
import { remindEvent } from "@/lib/discord-notify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const token = new URL(req.url).searchParams.get("token");
  if (!secret || token !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const due = getEventsDueForReminder();
  let sent = 0;
  for (const event of due) {
    const messageId = await remindEvent(event);
    markReminderSent(event.id);
    if (messageId) sent++;
  }

  return Response.json({ checked: due.length, sent });
}
