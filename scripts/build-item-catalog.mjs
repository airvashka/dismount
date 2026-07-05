// Vygeneruje lib/item-catalog.json z ao-bin-dumps (oficiální databáze itemů).
// Spuštění: node scripts/build-item-catalog.mjs [volitelně cesta k items.txt]
// Bez argumentu si stáhne čerstvý dump z GitHubu.

import fs from "node:fs";

const src = process.argv[2];
const text = src
  ? fs.readFileSync(src, "utf8")
  : await (
      await fetch(
        "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.txt"
      )
    ).text();

// Rodiny itemů: ID bez tier prefixu -> nejvyšší tier + název
const families = new Map();
for (const line of text.split("\n")) {
  const m = line.match(/^\s*\d+:\s+(\S+)\s*:\s*(.+?)\s*$/);
  if (!m) continue;
  const [, id, name] = m;
  const tm = id.match(/^T([1-8])_(.+)$/);
  if (!tm) continue;
  const tier = Number(tm[1]);
  const rest = tm[2];
  if (rest.includes("@")) continue; // enchant varianty přeskočit
  const fam = families.get(rest);
  if (!fam || tier > fam.tier) families.set(rest, { tier, name });
}

const cleanName = (n) =>
  n.replace(
    /^(Beginner's|Novice's|Journeyman's|Adept's|Expert's|Master's|Grandmaster's|Elder's)\s+/,
    ""
  );

const CATS = {
  // IRONGAUNTLETS_HELL (Black Hands) nemá render na oficiálním API
  weapon: (id) =>
    /^(MAIN|2H)_/.test(id) && !/TOOL|TRACKING|IRONGAUNTLETS_HELL/.test(id),
  offhand: (id) => /^OFF_/.test(id),
  head: (id) => /^HEAD_/.test(id) && !/GATHERER/.test(id),
  chest: (id) => /^ARMOR_/.test(id) && !/GATHERER/.test(id),
  shoes: (id) => /^SHOES_/.test(id) && !/GATHERER/.test(id),
  // bez dekorativních cap, arena bannerů (vanity) a crestů (_BP = součástka)
  cape: (id) =>
    /^CAPE/.test(id) &&
    !/CAPE_ARENA|CAPE_(CLOTH|LEATHER|PLATE)_|_BP$/.test(id),
  food: (id) => /^MEAL_/.test(id),
  // MOUNT_ = jízdní zvířata (battlemounty i transportní); MOUNTUPGRADE_
  // (sedla/doplňky) záměrně mimo, to nejsou mounty samotné.
  mount: (id) => /^MOUNT_/.test(id),
};

const catalog = Object.fromEntries(Object.keys(CATS).map((k) => [k, []]));
for (const [rest, { tier, name }] of families) {
  for (const [cat, test] of Object.entries(CATS)) {
    if (test(rest)) {
      catalog[cat].push({ id: rest, name: cleanName(name), maxTier: tier });
      break;
    }
  }
}
for (const list of Object.values(catalog)) {
  list.sort((a, b) => a.name.localeCompare(b.name));
}

fs.writeFileSync("lib/item-catalog.json", JSON.stringify(catalog));
console.log(
  Object.entries(catalog)
    .map(([k, v]) => `${k}: ${v.length}`)
    .join(", ")
);
