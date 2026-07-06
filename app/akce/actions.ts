"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import * as events from "@/lib/events";
import { parseSlotLines } from "@/lib/comp-format";
import { announceEvent, cancelEventAnnouncement } from "@/lib/discord-notify";

// Kdo smí co (jedno místo pro doladění pravidel):
const CAN_CREATE = "caller" as const; // vypisovat akce
const CAN_SIGNUP = "friend" as const; // přihlašovat se na akce

export async function createEventAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, CAN_CREATE)) {
    throw new Error("Vypisovat akce může jen caller nebo vedení.");
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const type = String(formData.get("type") ?? "CTA").trim().slice(0, 40);
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim().slice(0, 20);
  const description = String(formData.get("description") ?? "").trim().slice(0, 3000);
  const slots = parseSlotLines(
    String(formData.get("slots") ?? "").slice(0, 30000)
  ).slice(0, 200);

  if (!title || !startsAtRaw) {
    throw new Error("Chybí název nebo čas akce.");
  }

  // datetime-local -> "YYYY-MM-DD HH:MM" (bereme jako UTC = herní čas)
  const starts_at = startsAtRaw.replace("T", " ");

  const id = events.createEvent(
    {
      title,
      type,
      starts_at,
      description,
      created_by: user.discordId,
      created_by_name: user.name,
    },
    slots
  );

  await announce(id);

  revalidatePath("/akce");
  redirect(`/akce/${id}`);
}

/**
 * Pošle/aktualizuje Discord oznámení akce. Chyba Discord API nikdy nesmí
 * shodit samotné vypsání/úpravu akce — jen se zaloguje (viz sendChannelMessage).
 */
async function announce(eventId: number) {
  const event = events.getEvent(eventId);
  if (!event) return;
  try {
    const messageId = await announceEvent(event);
    if (messageId) events.setDiscordMessageId(eventId, messageId);
  } catch (err) {
    console.error("Nepodařilo se poslat Discord oznámení akce", err);
  }
}

export async function updateEventAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, CAN_CREATE)) {
    throw new Error("Upravovat akce může jen caller nebo vedení.");
  }

  const eventId = Number(formData.get("event_id"));
  guardUnlocked(eventId);
  const before = events.getEvent(eventId);

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const type = String(formData.get("type") ?? "CTA").trim().slice(0, 40);
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim().slice(0, 20);
  const description = String(formData.get("description") ?? "").trim().slice(0, 3000);
  const slots = parseSlotLines(
    String(formData.get("slots") ?? "").slice(0, 30000)
  ).slice(0, 200);

  if (!title || !startsAtRaw) {
    throw new Error("Chybí název nebo čas akce.");
  }

  const starts_at = startsAtRaw.replace("T", " ");

  events.updateEvent(eventId, { title, type, starts_at, description }, slots);

  // Znovu oznámit do Discordu jen když se změnil název nebo čas — úprava
  // gearu v kompozici by zbytečně spamovala kanál novou zprávou.
  if (before && (before.title !== title || before.starts_at !== starts_at)) {
    await announce(eventId);
  }

  revalidatePath(`/akce/${eventId}`);
  revalidatePath("/akce");
  redirect(`/akce/${eventId}`);
}

/** Zamčenou (proběhlou) akci už nejde měnit — přesměruje s hláškou. */
function guardUnlocked(eventId: number) {
  const event = events.getEvent(eventId);
  if (!event) redirect("/akce");
  if (events.isLocked(event)) {
    redirect(`/akce/${eventId}?chyba=${encodeURIComponent("Akce už proběhla — archiv je jen k nahlédnutí.")}`);
  }
}

export async function signUpAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, CAN_SIGNUP)) {
    throw new Error("Na akce se může přihlásit jen člen guildy.");
  }

  const eventId = Number(formData.get("event_id"));
  guardUnlocked(eventId);
  // Přímé přiřazení na konkrétní slot (slot_id) smí jen caller+ — běžný člen
  // se může jen přihlásit s nabídkou rolí, na pozici ho zařadí caller.
  const slotIdRaw = formData.get("slot_id");
  const slotId = slotIdRaw && atLeast(user.webRole, CAN_CREATE) ? Number(slotIdRaw) : null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);

  // Nabídnuté role: checkboxy "offer" (+ případný "fill" = zahraju cokoliv)
  const offerList = formData
    .getAll("offer")
    .map((o) => String(o).trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);
  if (formData.get("fill")) offerList.unshift("FILL");
  const offers = offerList.length > 0 ? JSON.stringify(offerList) : "";

  const error = events.signUp({
    eventId,
    slotId,
    discordId: user.discordId,
    displayName: user.name,
    note,
    offers,
  });

  revalidatePath(`/akce/${eventId}`);
  if (error) {
    redirect(`/akce/${eventId}?chyba=${encodeURIComponent(error)}`);
  }
  redirect(`/akce/${eventId}`);
}

export async function unsignAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Nepřihlášený uživatel.");

  const eventId = Number(formData.get("event_id"));
  guardUnlocked(eventId);
  events.removeSignup(eventId, user.discordId);
  revalidatePath(`/akce/${eventId}`);
}

export async function assignSlotAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, CAN_CREATE)) {
    throw new Error("Rozřazovat hráče může jen caller nebo vedení.");
  }

  const eventId = Number(formData.get("event_id"));
  guardUnlocked(eventId);
  const slotId = Number(formData.get("slot_id"));
  const signupIdRaw = String(formData.get("signup_id") ?? "");

  if (signupIdRaw) {
    const error = events.assignToSlot(eventId, slotId, Number(signupIdRaw));
    if (error) {
      revalidatePath(`/akce/${eventId}`);
      redirect(`/akce/${eventId}?chyba=${encodeURIComponent(error)}`);
    }
  } else {
    events.clearSlot(eventId, slotId);
  }
  revalidatePath(`/akce/${eventId}`);
}

export async function deleteEventAction(formData: FormData) {
  const user = await getSessionUser();
  const eventId = Number(formData.get("event_id"));
  const event = events.getEvent(eventId);
  if (!event) redirect("/akce");

  const isOwner = event.created_by === user?.discordId;
  if (!user || (!isOwner && !atLeast(user.webRole, "admin"))) {
    throw new Error("Akci může zrušit jen její caller nebo vedení.");
  }

  // Nejdřív označit Discord post jako zrušený (potřebuje ještě data akce),
  // pak teprve smazat z DB — přihlášky zmizí samy přes ON DELETE CASCADE.
  try {
    await cancelEventAnnouncement(event);
  } catch (err) {
    console.error("Nepodařilo se označit Discord oznámení jako zrušené", err);
  }

  events.deleteEvent(eventId);
  revalidatePath("/akce");
  redirect("/akce");
}
