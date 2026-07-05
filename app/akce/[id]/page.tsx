import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { getEvent, getSlots, getSignups, isLocked } from "@/lib/events";
import { LocalTime } from "@/components/local-time";
import { deleteEventAction } from "../actions";
import { ConfirmForm } from "@/components/confirm-form";
import { EventBoard } from "@/components/event-board";

export default async function AkceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chyba?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, "friend")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-muted">Detail akce je jen pro členy guildy.</p>
      </div>
    );
  }

  const { id } = await params;
  const { chyba } = await searchParams;
  const event = getEvent(Number(id));
  if (!event) notFound();

  const slots = getSlots(event.id);
  const signups = getSignups(event.id);
  const locked = isLocked(event);
  const canDelete =
    event.created_by === user.discordId || atLeast(user.webRole, "admin");
  const canEdit = atLeast(user.webRole, "caller") && !locked;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href="/akce" className="text-sm text-muted hover:text-foreground">
        ← zpět na akce
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="text-accent">{event.type}</span> ·{" "}
            <LocalTime utc={event.starts_at} /> · vypsal {event.created_by_name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Link
              href={`/akce/${event.id}/upravit`}
              className="rounded border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
            >
              Upravit
            </Link>
          )}
          {canDelete && (
            <ConfirmForm
              action={deleteEventAction}
              message={`Opravdu zrušit akci „${event.title}"? Smažou se i všechny přihlášky.`}
            >
              <input type="hidden" name="event_id" value={event.id} />
              <button
                type="submit"
                className="rounded border border-border px-3 py-1 text-xs text-muted hover:border-red-500 hover:text-red-400 cursor-pointer"
              >
                Zrušit akci
              </button>
            </ConfirmForm>
          )}
        </div>
      </div>

      {locked && (
        <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-muted">
          🔒 Akce proběhla — tohle je archivní náhled, přihlášky a rozřazení už
          nejde měnit.
        </p>
      )}

      {event.description && (
        <p className="mt-4 whitespace-pre-line rounded-lg border border-border bg-surface p-4 text-sm">
          {event.description}
        </p>
      )}

      {chyba && (
        <p className="mt-4 rounded border border-red-500 bg-red-950/40 p-3 text-sm text-red-300">
          {chyba}
        </p>
      )}

      <EventBoard
        eventId={event.id}
        slots={slots.map((s) => ({
          id: s.id,
          party: s.party,
          role_name: s.role_name,
          build: s.build,
          note: s.note,
        }))}
        signups={signups.map((s) => ({
          id: s.id,
          slot_id: s.slot_id,
          discord_id: s.discord_id,
          display_name: s.display_name,
          note: s.note,
          offers: s.offers,
        }))}
        discordId={user.discordId}
        canSignup={atLeast(user.webRole, "friend") && !locked}
        isCaller={atLeast(user.webRole, "caller") && !locked}
      />
    </div>
  );
}
