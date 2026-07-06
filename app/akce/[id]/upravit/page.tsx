import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { getEvent, getSlots, isLocked } from "@/lib/events";
import { listTemplates, getTemplateText } from "@/lib/comps";
import { updateEventAction } from "../../actions";
import { CompEditor } from "@/components/comp-editor";
import { slotsToText } from "@/lib/comp-format";
import { eventPath } from "@/lib/slug";

const EVENT_TYPES = ["CTA", "ZvZ", "Ava Raid", "Hellgates", "Fame farm", "Jiné"];

export default async function UpravitAkciPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, "caller")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Upravit akci</h1>
        <p className="mt-4 text-muted">
          Akce může upravovat jen caller nebo vedení guildy.
        </p>
      </div>
    );
  }

  const { id } = await params;
  const event = getEvent(parseInt(id, 10));
  if (!event) notFound();
  const locked = isLocked(event);

  const templates = listTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    text: getTemplateText(t.id),
  }));

  // "YYYY-MM-DD HH:MM" -> "YYYY-MM-DDTHH:MM" pro datetime-local
  const startsAtLocal = event.starts_at.replace(" ", "T").slice(0, 16);
  const slotsText = slotsToText(getSlots(event.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upravit akci</h1>
        <Link
          href={eventPath(event.id, event.title)}
          className="text-sm text-muted hover:text-foreground"
        >
          ← zpět na akci
        </Link>
      </div>

      {locked ? (
        <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-muted">
          🔒 Akce proběhla — archiv už nejde upravovat.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Úprava kompozice vrátí už přiřazené hráče zpět mezi čekající —
            jejich přihláška a nabídka zůstane, jen je bude potřeba znovu
            rozřadit na sloty.
          </p>

          <form action={updateEventAction} className="mt-8 space-y-6">
            <input type="hidden" name="event_id" value={event.id} />
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-muted">Název akce</span>
                <input
                  name="title"
                  required
                  defaultValue={event.title}
                  className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Typ</span>
                <select
                  name="type"
                  defaultValue={event.type}
                  className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-muted">
                Začátek — čas v UTC (= herní čas Albionu)
              </span>
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={startsAtLocal}
                className="mt-1 rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted">Popis (sraz, cíl, pravidla lootu…)</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={event.description}
                className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>

            <CompEditor initialText={slotsText} templates={templates} />

            <button
              type="submit"
              className="rounded bg-accent px-6 py-2 font-medium text-background hover:bg-accent-hover cursor-pointer"
            >
              Uložit změny
            </button>
          </form>
        </>
      )}
    </div>
  );
}
