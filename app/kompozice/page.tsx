import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { listTemplates } from "@/lib/comps";

export const metadata = { title: "Kompozice – Dismount" };

export default async function KompozicePage() {
  const user = await getSessionUser();

  if (!user || !atLeast(user.webRole, "caller")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Kompozice</h1>
        <p className="mt-4 text-muted">
          Knihovna kompozic je jen pro callery a vedení guildy.
        </p>
      </div>
    );
  }

  const templates = listTemplates();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kompozice</h1>
        <Link
          href="/kompozice/nova"
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-background hover:bg-accent-hover"
        >
          + Nová kompozice
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Šablony, které si caller vybere při vypsání akce. Kdokoliv z callerů je
        může upravovat — změna šablony neovlivní už vypsané akce.
      </p>

      {templates.length === 0 ? (
        <p className="mt-6 text-muted">Zatím žádné šablony.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/kompozice/${t.id}`}
                className="flex items-baseline justify-between rounded-lg border border-border bg-surface p-4 hover:border-accent transition-colors"
              >
                <span className="font-semibold">{t.name}</span>
                <span className="text-sm text-muted">{t.slot_count} slotů</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
