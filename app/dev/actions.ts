"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isDevEnvironment } from "@/lib/dev-env";
import * as events from "@/lib/events";
import { DEV_ROLE_COOKIE, resolveDevRole } from "@/lib/session";

/** Switch fake role in development (cookie). No-op outside DEV_ENVIRONMENT. */
export async function setDevRoleAction(roleRaw: string) {
  if (!isDevEnvironment()) return;

  const role = resolveDevRole(roleRaw);
  if (!role) return;

  const jar = await cookies();
  jar.set(DEV_ROLE_COOKIE, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}

function nextTestUserIndex(eventId: number): number {
  let max = 0;
  for (const s of events.getSignups(eventId)) {
    const m = /^dev-user-(\d+)$/.exec(s.discord_id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Add a simulated signup (Test user N) — DEV_ENVIRONMENT only. */
export async function addDevSignupAction(formData: FormData) {
  if (!isDevEnvironment()) {
    throw new Error("Only available in DEV_ENVIRONMENT.");
  }

  const eventId = Number(formData.get("event_id"));
  const event = events.getEvent(eventId);
  if (!event) throw new Error("Event not found.");
  if (events.isLocked(event)) throw new Error("Event is locked.");

  const offerList = formData
    .getAll("offer")
    .map((o) => String(o).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);
  if (formData.get("fill")) offerList.unshift("FILL");
  if (offerList.length === 0) {
    throw new Error("Pick at least one role or FILL.");
  }

  const n = nextTestUserIndex(eventId);
  const error = events.signUp({
    eventId,
    slotId: null,
    discordId: `dev-user-${n}`,
    displayName: `Test user ${n}`,
    note: "",
    offers: JSON.stringify(offerList),
  });
  if (error) throw new Error(error);

  revalidatePath(`/akce/${eventId}`);
}
