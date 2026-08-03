// Lehký JSON endpoint pro živé překreslování boardu (polling z komponenty
// EventBoard) — vrací jen přihlášky, sloty se po vytvoření akce nemění.
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { getEvent, getSignups } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, "dismount")) {
    return Response.json({ error: "unauthorized" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const event = getEvent(Number(id));
  if (!event) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const signups = getSignups(event.id).map((s) => ({
    id: s.id,
    slot_id: s.slot_id,
    discord_id: s.discord_id,
    display_name: s.display_name,
    note: s.note,
    offers: s.offers,
  }));

  return Response.json({ signups });
}
