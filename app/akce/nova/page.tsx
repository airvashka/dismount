import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { listTemplates, getTemplateText } from "@/lib/comps";
import { createEventAction } from "../actions";
import { CompEditor } from "@/components/comp-editor";
import { EVENT_TYPES } from "@/lib/event-types";

export default async function NovaAkcePage() {
  const user = await getSessionUser();

  if (!user || !atLeast(user.webRole, "caller")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Vypsat akci</h1>
        <p className="mt-4 text-muted">
          Akce může vypisovat jen caller nebo vedení guildy.
        </p>
      </div>
    );
  }

  const templates = listTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    text: getTemplateText(t.id),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vypsat akci</h1>
        <Link href="/kompozice" className="text-sm text-muted hover:text-foreground">
          spravovat kompozice →
        </Link>
      </div>

      <form action={createEventAction} className="mt-8 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-muted">Název akce</span>
            <input
              name="title"
              required
              placeholder="např. CTA – obrana teritoria"
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted">Typ</span>
            <select
              name="type"
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
            className="mt-1 rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm text-muted">Popis (sraz, cíl, pravidla lootu…)</span>
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <CompEditor templates={templates} />

        <button
          type="submit"
          className="rounded bg-accent px-6 py-2 font-medium text-background hover:bg-accent-hover cursor-pointer"
        >
          Vypsat akci
        </button>
      </form>
    </div>
  );
}
