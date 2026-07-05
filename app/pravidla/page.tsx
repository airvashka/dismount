export const metadata = { title: "Pravidla – Dismount" };

const SECTIONS: { icon: string; title: string; rules: string[] }[] = [
  {
    icon: "📢",
    title: "Chování a aktivita",
    rules: [
      "Každý hráč má povinnost si přečíst guildovní pravidla a respektovat v nich zmíněné!",
      "Vyvaruj se toxickému chování – jsme tu, abychom si hraní užili, ne znechutili.",
      "Chovej se s respektem ke všem členům guildy a hráčům v alianci.",
      "Používej aktivně náš Discord a zapojuj se do skupinového hraní.",
      "Reprezentuj guildu důstojně i mimo ni.",
      "Nevhodné chování mimo guildu poškozuje její pověst.",
    ],
  },
  {
    icon: "✅",
    title: "Pravidla účasti",
    rules: [
      "Zapisuj se jen na akce, na které opravdu dorazíš.",
      "Buď dochvilný a připravený na svou roli dle callera / vedoucího akce (PvP i PvE).",
      "Loot z guild eventů, které nejsou označeny jako LOOTSPLIT, připadá guildě.",
    ],
  },
  {
    icon: "📦",
    title: "Lootování",
    rules: [
      "Loot vždy ukládej do předem určené záložky.",
      "Neuložení lootu = porušení pravidel.",
      "Nemanipuluj s lootem či bednami jiných hráčů guildy či skupiny — např. zákaz otevírat bedny outpostů při vypsané guild akci, které nejsi součástí.",
    ],
  },
  {
    icon: "⚠️",
    title: "Postihy a porušení pravidel",
    rules: [
      "Porušení pravidel → upozornění od vedení nebo VB.",
      "Opakované porušování → vyloučení z guildy.",
      "Vedení si vyhrazuje právo řešit výjimečné situace individuálně.",
    ],
  },
  {
    icon: "🏠",
    title: "Pravidla HO/HQ a tabů v guild bedně",
    rules: [
      "Zákaz krádeže a manipulace lootu/tabů.",
      "Nevybírat bednu na pomoc/donate začínajícím hráčům a tahání core a vortexů.",
      "Loot v tabech po 3 dnech propadá guildě.",
    ],
  },
];

export default function PravidlaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">📜 Pravidla guildy Dismount</h1>
      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-semibold text-accent">
              {s.icon} {s.title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {s.rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
