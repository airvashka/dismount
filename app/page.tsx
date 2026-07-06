import Link from "next/link";
import Image from "next/image";
import { fetchGuildStats, fetchTopKills } from "@/lib/albion";

const DISCORD_INVITE = "https://discord.gg/RqjY3Mgkj";

function fmtFame(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} mld`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mil`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return new Intl.NumberFormat("cs-CZ").format(n);
}

/** Killboard timestamp (ISO, UTC) -> "D.M. HH:MM UTC". */
function fmtKillTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}.${month}. ${hh}:${mm} UTC`;
}

export default async function Home() {
  const [stats, kills] = await Promise.all([fetchGuildStats(), fetchTopKills()]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 15%, rgba(224,168,60,0.16), transparent 70%), radial-gradient(ellipse 40% 35% at 80% 80%, rgba(88,101,242,0.08), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-12 text-center">
          <Image
            src="/logo.png"
            alt="Dismount logo"
            width={150}
            height={150}
            priority
            className="mx-auto rounded-full ring-2 ring-accent/40 shadow-[0_0_70px_rgba(224,168,60,0.3)]"
          />
          <h1 className="mt-8 text-5xl sm:text-6xl font-bold tracking-[0.3em] text-accent">
            DISMOUNT
          </h1>
          <p className="mt-4 text-lg text-muted">
            Česko-slovenská guilda v Albion Online
          </p>

          {/* Živé statistiky z killboardu */}
          {stats && (
            <div className="mx-auto mt-10 flex max-w-xl justify-center gap-10 sm:gap-16">
              <div>
                <div className="text-3xl font-bold text-accent">
                  {stats.memberCount}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted">
                  členů
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">
                  {fmtFame(stats.killFame)}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted">
                  kill fame
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">
                  {stats.founded ? new Date(stats.founded).getFullYear() : "—"}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted">
                  založeno
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/akce"
              className="rounded border border-accent px-6 py-2 text-accent hover:bg-accent hover:text-background transition-colors"
            >
              Nadcházející akce
            </Link>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-discord px-6 py-2 text-white hover:opacity-90"
            >
              Náš Discord
            </a>
          </div>

        </div>

        {/* Top killy za 48 h (killboard) */}
        {kills && kills.length > 0 && (
          <div className="relative mx-auto max-w-xl px-4 pb-16">
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              ⚔ Top killy za posledních 48 hodin
            </h2>
            <ol className="mt-4 space-y-1.5">
              {kills.map((k, i) => (
                <li key={k.eventId}>
                  <a
                    href={`https://albiononline.com/killboard/kill/${k.eventId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface/70 px-4 py-2 text-sm transition-colors hover:border-accent hover:bg-surface"
                  >
                    <span className="w-5 text-right font-bold text-accent">
                      {i + 1}.
                    </span>
                    <span className="font-semibold text-accent">{k.killer}</span>
                    <span className="text-muted">⚔</span>
                    <span className="text-red-300">
                      {k.victim}
                      {k.victimGuild && (
                        <span className="text-muted"> [{k.victimGuild}]</span>
                      )}
                    </span>
                    <span className="ml-auto flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-muted">
                        {fmtKillTime(k.time)}
                      </span>
                      <span className="font-mono text-xs text-emerald-400">
                        {fmtFame(k.fame)} fame
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

      </section>
    </div>
  );
}
