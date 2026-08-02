import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { listUpcomingEvents, listPastEvents, getMySignups } from "@/lib/events";
import { LocalTime } from "@/components/local-time";
import { ItemIcon } from "@/components/item-icon";
import { slotIconUrls } from "@/lib/albion";
import { eventPath } from "@/lib/slug";

export default async function AkcePage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Akce</h1>
        <p className="mt-4 text-muted">
          Přihlašování na akce je jen pro členy guildy — přihlas se přes
          Discord (tlačítko vpravo nahoře).
        </p>
      </div>
    );
  }

  if (!atLeast(user.webRole, "member")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Akce</h1>
        <p className="mt-4 text-muted">
          Tvůj Discord účet nemá na serveru Dismount potřebnou roli. Pokud jsi
          nový, napiš na Discordu o roli.
        </p>
      </div>
    );
  }

  const events = listUpcomingEvents();
  const past = listPastEvents();
  const mySignups = getMySignups(user.discordId);
  const canCreate = atLeast(user.webRole, "caller");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nadcházející akce</h1>
        {canCreate && (
          <Link
            href="/akce/nova"
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-background hover:bg-accent-hover"
          >
            + Vypsat akci
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <p className="mt-6 text-muted">
          Zatím nejsou vypsané žádné akce. Až caller nějakou vypíše, uvidíš ji
          tady.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {events.map((e) => {
            const mine = mySignups.get(e.id);
            const myIcons = mine?.role_name
              ? slotIconUrls(mine.role_name, mine.build ?? "")
              : [];
            return (
              <li key={e.id}>
                <Link
                  href={eventPath(e.id, e.title)}
                  className="block rounded-lg border border-border bg-surface p-4 hover:border-accent transition-colors"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{e.title}</span>
                    <span className="text-xs text-accent">{e.type}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    <LocalTime utc={e.starts_at} /> · vypsal {e.created_by_name}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span>
                      <span className="text-accent">{e.signup_count}</span>
                      <span className="text-muted">
                        {" "}
                        přihlášených{e.slot_count > 0 ? ` · ${e.slot_count} slotů` : ""}
                      </span>
                    </span>
                    {mine &&
                      (mine.role_name ? (
                        <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/60 bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          ✔ jdeš:
                          {myIcons.map((u, i) => (
                            <ItemIcon key={i} src={u} size={20} />
                          ))}
                          {mine.role_name}
                        </span>
                      ) : (
                        <span className="rounded border border-amber-500/60 bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-400">
                          ✋ přihlášen — čekáš na roli
                        </span>
                      ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Archiv proběhlých akcí */}
      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-muted">
            Proběhlé akce <span className="text-xs font-normal">(archiv — jen k nahlédnutí)</span>
          </h2>
          <ul className="mt-4 space-y-2">
            {past.map((e) => (
              <li key={e.id}>
                <Link
                  href={eventPath(e.id, e.title)}
                  className="block rounded-lg border border-border bg-surface/50 p-3 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">
                      🔒 {e.title}
                    </span>
                    <span className="text-xs text-muted">{e.type}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    <LocalTime utc={e.starts_at} /> · {e.signup_count} přihlášených
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
