import Link from "next/link";
import Image from "next/image";
import { fetchGuildStats } from "@/lib/albion";

const DISCORD_INVITE = "https://discord.gg/RqjY3Mgkj";

// Zbrojnice — dekorativní pás ikon pod hero sekcí
const ARSENAL = [
  "T8_2H_MACE",
  "T8_2H_DUALMACE_AVALON",
  "T8_MAIN_HOLYSTAFF_AVALON",
  "T8_2H_ARCANESTAFF_CRYSTAL",
  "T8_2H_DUALSCIMITAR_UNDEAD",
  "T8_2H_HALBERD_MORGANA",
  "T8_2H_CURSEDSTAFF_MORGANA",
  "T8_2H_SHAPESHIFTER_CRYSTAL",
  "T8_2H_KNUCKLES_KEEPER",
  "T8_2H_DUALHAMMER_HELL",
];

function fmtFame(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} mld`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} mil`;
  return new Intl.NumberFormat("cs-CZ").format(n);
}

export default async function Home() {
  const stats = await fetchGuildStats();

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

        {/* Zbrojnice */}
        <div className="relative mx-auto max-w-3xl px-4 pb-16">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {ARSENAL.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item}
                src={`/api/icon/${item}.png?size=64`}
                alt=""
                width={52}
                height={52}
                className="opacity-50 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0 hover:scale-125"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
