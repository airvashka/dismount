// Předehřeje cache ikon (data/icons) pro celý katalog itemů — T7 a maxTier,
// size 64. Enchant varianty a zvětšeniny se dotáhnou lazy při prvním zobrazení.
// Spuštění: node scripts/warm-icons.mjs (z kořene aplikace, i v kontejneru)

import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("lib/item-catalog.json", "utf8"));
const DIR = "data/icons";
fs.mkdirSync(DIR, { recursive: true });

const jobs = [];
for (const [cat, list] of Object.entries(catalog)) {
  for (const it of list) {
    // jídla existují typicky jen ve svém maxTieru; gear hřejeme i v T7
    const tiers =
      cat === "food"
        ? [it.maxTier]
        : new Set([Math.min(7, it.maxTier), it.maxTier]);
    for (const t of tiers) jobs.push(`T${t}_${it.id}`);
  }
}
console.log(`ikon k předehřátí: ${jobs.length}`);

let done = 0;
let cached = 0;
let fail = 0;
const workers = Array.from({ length: 6 }, async () => {
  while (jobs.length > 0) {
    const id = jobs.pop();
    const file = `${DIR}/${id}_s64.png`;
    if (fs.existsSync(file)) {
      cached++;
      continue;
    }
    try {
      const res = await fetch(
        `https://render.albiononline.com/v1/item/${id}.png?quality=4&size=64`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        fs.writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
        done++;
      } else {
        fail++;
      }
    } catch {
      fail++;
    }
    if ((done + fail) % 100 === 0) console.log(`…${done + fail}`);
  }
});
await Promise.all(workers);
console.log(`staženo: ${done}, už v cache: ${cached}, chyb: ${fail}`);
