import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { getParticipationHistory } from "@/lib/events";
import { LocalTime } from "@/components/local-time";
import { ItemIcon } from "@/components/item-icon";
import { slotIconUrls } from "@/lib/albion";
import { eventPath } from "@/lib/slug";

export default async function HistoriePage({
  searchParams,
}: {
  searchParams: Promise<{ hrac?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, "dismount")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-muted">Historie účasti je jen pro členy guildy.</p>
      </div>
    );
  }

  const { hrac } = await searchParams;
  const filter = (hrac ?? "").trim().toLowerCase();
  const allRows = getParticipationHistory();
  const rows = filter
    ? allRows.filter((r) => r.display_name.toLowerCase().includes(filter))
    : allRows;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold">Historie účasti</h1>
      <p className="mt-1 text-sm text-muted">
        Kdo hrál jakou roli na proběhlých akcích.
      </p>

      <form className="mt-6">
        <input
          name="hrac"
          defaultValue={hrac ?? ""}
          placeholder="Filtrovat podle jména hráče…"
          className="w-full max-w-sm rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-muted">
          {filter ? "Nikdo takový v historii není." : "Zatím žádné proběhlé akce s rozřazenými hráči."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Akce</th>
                <th className="px-3 py-2">Hráč</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const icons = slotIconUrls(r.role_name, r.build);
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      <LocalTime utc={r.starts_at} />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={eventPath(r.event_id, r.event_title)}
                        className="hover:text-accent"
                      >
                        {r.event_title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{r.display_name}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {icons.map((u, j) => (
                          <ItemIcon key={j} src={u} size={20} />
                        ))}
                        {r.role_name}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
