// Ikony z oficiálního Albion Online render API (render.albiononline.com).
// Mapování guild slangu -> přesné item ID (ověřeno proti ao-bin-dumps).
// Pořadí: konkrétní zbraně první, obecná klíčová slova jako záchytná síť.
// Když nic nesedí, ikona se prostě nezobrazí.

import catalog from "./item-catalog.json";

// Ikony jedou přes naši cache proxy (app/api/icon) — render server Albionu
// je pomalý; my každou ikonu stáhneme jednou a pak servírujeme z disku.
const RENDER = "/api/icon";

// Katalog všech itemů (generuje scripts/build-item-catalog.mjs z ao-bin-dumps):
// přesný název (EN) -> ID rodiny bez tieru. První instance rozpoznávání —
// pokryje vše, co vybere picker; guild slang řeší regexy níž.
export type CatalogItem = {
  id: string;
  name: string;
  maxTier: number;
  /** Nemá T-tier progrese (Season battlemounty, jednorázový skin) — render
   * se volá s `id` tak jak je, žádné "T{n}_" doplňování ani enchant tečky. */
  special?: boolean;
};
export type CatalogCategory =
  | "weapon"
  | "offhand"
  | "head"
  | "chest"
  | "shoes"
  | "cape"
  | "food"
  | "mount";
export const ITEM_CATALOG = catalog as Record<CatalogCategory, CatalogItem[]>;

// Prestižní battlemounty ze Season reward tracku — vzácnost Bronze/Silver/
// Gold/Crystal místo T-tieru, chybí v ao-bin-dumps pod běžným "T#_" prefixem
// (jsou "UNIQUE_..."), takže je generický parser v build-item-catalog.mjs
// nikdy nenajde. Bereme Gold jako reprezentativní vzhled. Command Mammoth
// existuje jen jako jediný "@1" skin (žádná plain T8 verze), řešíme stejně.
// Ověřeno proti wiki.albiononline.com/wiki/Category:Battle_Mount.
export const SPECIAL_MOUNTS: CatalogItem[] = [
  { id: "UNIQUE_MOUNT_ENT_GOLD", name: "Ancient Ent", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_ARMORED_EAGLE_GOLD", name: "Battle Eagle", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_RHINO_SEASON_GOLD", name: "Battle Rhino", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_BEHEMOTH_GOLD", name: "Behemoth", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_BEETLE_GOLD", name: "Colossus Beetle", maxTier: 8, special: true },
  { id: "T8_MOUNT_MAMMOTH_BATTLE@1", name: "Command Mammoth", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_BATTLESPIDER_GOLD", name: "Goliath Horseeater", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_JUGGERNAUT_GOLD", name: "Juggernaut", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_TANKBEETLE_GOLD", name: "Phalanx Beetle", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_BASTION_GOLD", name: "Roving Bastion", maxTier: 8, special: true },
  { id: "UNIQUE_MOUNT_TOWER_CHARIOT_GOLD", name: "Tower Chariot", maxTier: 8, special: true },
];
const SPECIAL_IDS = new Set(SPECIAL_MOUNTS.map((m) => m.id));

const NAME_TO_ID = new Map<string, string>();
for (const list of Object.values(ITEM_CATALOG)) {
  for (const it of list) NAME_TO_ID.set(it.name.toLowerCase(), it.id);
}
for (const it of SPECIAL_MOUNTS) NAME_TO_ID.set(it.name.toLowerCase(), it.id);

function cleanPartName(part: string): string {
  return part
    .replace(/\(.*?\)/g, " ")
    .replace(/\bT[1-8](\.\d)?\+?\b/gi, " ")
    .replace(/\b[1-8]\.\d\+?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ROLE_ICONS: Array<[RegExp, string]> = [
  // --- Mace / palice ---
  [/dreadstorm/i, "T8_MAIN_MACE_CRYSTAL"], // Dreadstorm Monarch (crystal 1H mace)
  [/oathkeeper/i, "T8_2H_DUALMACE_AVALON"], // Oathkeepers
  [/camlann/i, "T8_2H_MACE_MORGANA"],
  [/incubus/i, "T8_MAIN_MACE_HELL"],
  [/bedrock/i, "T8_MAIN_ROCKMACE_KEEPER"],
  [/morning\s*star/i, "T8_2H_FLAIL"],
  [/1h\s*mace|one\s*hand.*mace/i, "T8_MAIN_MACE"],
  [/\bh\s*mace|heavy\s*mace|hmace/i, "T8_2H_MACE"], // Heavy Mace
  // --- Hammer / kladiva ---
  [/forge\s*hammer|forgehammer/i, "T8_2H_DUALHAMMER_HELL"], // Forge Hammers
  [/tombhammer/i, "T8_2H_HAMMER_UNDEAD"],
  [/grovekeeper/i, "T8_2H_RAM_KEEPER"],
  [/hand\s*of\s*justice|hoj\b/i, "T8_2H_HAMMER_AVALON"],
  [/polehammer/i, "T8_2H_POLEHAMMER"],
  [/g\s*hammer|great\s*hammer|ghammer/i, "T8_2H_HAMMER"], // Great Hammer
  // --- Quarterstaff ---
  [/sob\b|staff\s*of\s*balance/i, "T8_2H_ROCKSTAFF_KEEPER"], // Staff of Balance
  [/grailseeker/i, "T8_2H_QUARTERSTAFF_AVALON"],
  [/black\s*monk/i, "T8_2H_COMBATSTAFF_MORGANA"],
  // --- Shapeshifter ---
  [/stillgaze/i, "T8_2H_SHAPESHIFTER_CRYSTAL"], // Stillgaze Staff
  [/rootbound|root\b/i, "T8_2H_SHAPESHIFTER_SET2"], // Rootbound Staff
  // --- Cursed ---
  [/damnation/i, "T8_2H_CURSEDSTAFF_MORGANA"],
  [/rotcaller/i, "T8_MAIN_CURSEDSTAFF_CRYSTAL"], // Rotcaller Staff
  [/cursed|kletb/i, "T8_2H_CURSEDSTAFF"],
  // --- Arcane ---
  [/locus/i, "T8_2H_ENIGMATICORB_MORGANA"], // Malevolent Locus
  [/evensong/i, "T8_2H_ARCANE_RINGPAIR_AVALON"],
  [/enigmatic/i, "T8_2H_ENIGMATICSTAFF"],
  [/astral/i, "T8_2H_ARCANESTAFF_CRYSTAL"], // Astral Staff
  [/arcane/i, "T8_MAIN_ARCANESTAFF"],
  // --- Sword / meče ---
  [/gala\b|galatine/i, "T8_2H_DUALSCIMITAR_UNDEAD"], // Galatine Pair
  [/infinity/i, "T8_MAIN_SWORD_CRYSTAL"], // Infinity Blade
  [/kingmaker/i, "T8_2H_CLAYMORE_AVALON"],
  [/clarent/i, "T8_MAIN_SCIMITAR_MORGANA"],
  [/claymore/i, "T8_2H_CLAYMORE"],
  // --- Axe / sekery (halberd je v axe stromu) ---
  [/carrion/i, "T8_2H_HALBERD_MORGANA"], // Carrioncaller
  [/halberd/i, "T8_2H_HALBERD"],
  [/bear\s*paws?/i, "T8_2H_DUALAXE_KEEPER"],
  [/realmbreaker/i, "T8_2H_AXE_AVALON"],
  [/scythe|greataxe/i, "T8_2H_AXE"],
  // --- Dagger / dýky ---
  [/bloodletter/i, "T8_MAIN_RAPIER_MORGANA"],
  [/dagger|dyk/i, "T8_2H_DUALDAGGER"],
  // --- War gloves ---
  [/ursine/i, "T8_2H_KNUCKLES_KEEPER"], // Ursine Maulers
  [/fists?\s*of\s*avalon/i, "T8_2H_KNUCKLES_AVALON"],
  // --- Holy ---
  [/hallow/i, "T8_MAIN_HOLYSTAFF_AVALON"], // Hallowfall
  [/redemption/i, "T8_2H_HOLYSTAFF_UNDEAD"],
  [/1h\s*holy/i, "T8_MAIN_HOLYSTAFF"],
  [/holy|svat/i, "T8_2H_HOLYSTAFF"],
  // --- Nature ---
  [/blight/i, "T8_2H_NATURESTAFF_HELL"],
  [/1h\s*nature/i, "T8_MAIN_NATURESTAFF"],
  [/nature|priroda|příroda/i, "T8_2H_WILDSTAFF"],
  // --- Fire / Frost ---
  [/fire|ohe?n/i, "T8_2H_FIRESTAFF"],
  [/frost|led/i, "T8_2H_ICEGLACIER"],
  // --- Ranged ---
  [/xbow|kuse|kuše|crossbow/i, "T8_2H_CROSSBOW"],
  [/bow|luk/i, "T8_2H_BOW"],
  // --- Spear ---
  [/glaive/i, "T8_2H_GLAIVE"],
  [/spear|kopi|kopí|pike/i, "T8_MAIN_SPEAR"],
  // --- Obecné role jako poslední záchrana ---
  [/tank/i, "T8_2H_MACE"],
  [/heal/i, "T8_MAIN_HOLYSTAFF"],
  [/support/i, "T8_MAIN_ARCANESTAFF"],
  [/dps/i, "T8_2H_CLAYMORE"],
];

// Gear + jídlo (build sloupec) — klíčové slovo -> item ID.
// Pořadí kusů v buildu je volné (offhand tam někdy je, někdy ne),
// proto se pozná každý kus podle názvu, ne podle pozice.
const GEAR_ICONS: Array<[RegExp, string]> = [
  // Offhandy
  [/leering\s*cane|leering/i, "T8_OFF_JESTERCANE_HELL"],
  [/mistcaller/i, "T8_OFF_HORN_KEEPER"],
  [/facebreaker/i, "T8_OFF_SPIKEDSHIELD_MORGANA"],
  [/astral\s*aegis|aegis/i, "T8_OFF_SHIELD_AVALON"],
  [/unbreakable\s*ward/i, "T8_OFF_SHIELD_CRYSTAL"],
  [/sarcophagus|sarco/i, "T8_OFF_TOWERSHIELD_UNDEAD"],
  [/caitiff/i, "T8_OFF_SHIELD_HELL"],
  [/eye\s*of\s*secrets|\beye\b/i, "T8_OFF_ORB_MORGANA"],
  [/muisak/i, "T8_OFF_DEMONSKULL_HELL"],
  [/taproot/i, "T8_OFF_TOTEM_KEEPER"],
  [/censer/i, "T8_OFF_CENSER_AVALON"],
  [/grimoire/i, "T8_OFF_TOME_CRYSTAL"],
  [/tome/i, "T8_OFF_BOOK"],
  [/cryptcandle/i, "T8_OFF_LAMP_UNDEAD"],
  [/sacred\s*scepter|scepter/i, "T8_OFF_TALISMAN_AVALON"],
  [/blueflame/i, "T8_OFF_TORCH_CRYSTAL"],
  [/torch/i, "T8_OFF_TORCH"],
  [/\bshield\b|štít/i, "T8_OFF_SHIELD"],
  // Hlavy
  [/hellion\s*hood/i, "T8_HEAD_LEATHER_HELL"],
  [/ass?ass?in\s*hood/i, "T8_HEAD_LEATHER_SET3"],
  [/stalker\s*hood/i, "T8_HEAD_LEATHER_MORGANA"],
  [/judi(cator)?\s*helm/i, "T8_HEAD_PLATE_KEEPER"],
  [/feyscale\s*(hood|hat)/i, "T8_HEAD_CLOTH_FEY"],
  [/soldier\s*helm/i, "T8_HEAD_PLATE_SET1"],
  [/sold\s*helm/i, "T8_HEAD_PLATE_SET1"],
  [/cleric\s*cowl/i, "T8_HEAD_CLOTH_SET2"],
  [/guardian\s*helm/i, "T8_HEAD_PLATE_SET3"],
  [/knight\s*helm/i, "T8_HEAD_PLATE_SET2"],
  [/royal\s*cowl/i, "T8_HEAD_CLOTH_ROYAL"],
  [/hood\s*of\s*tenacity/i, "T8_HEAD_LEATHER_AVALON"],
  [/mistwalker\s*hood/i, "T8_HEAD_LEATHER_FEY"],
  [/le?a?ther\s*hood/i, "T8_HEAD_LEATHER_SET1"], // "lether hood (cleans)"
  [/soldier\/guardian|guardian\/soldier/i, "T8_HEAD_PLATE_SET3"], // heal helmy
  // Armory
  [/guardian\s*armor/i, "T8_ARMOR_PLATE_SET3"],
  [/knight\s*armor/i, "T8_ARMOR_PLATE_SET2"],
  [/soldier\s*armor/i, "T8_ARMOR_PLATE_SET1"],
  [/judi(cator)?\s*armor/i, "T8_ARMOR_PLATE_KEEPER"],
  [/royal\s*armor/i, "T8_ARMOR_PLATE_ROYAL"],
  [/dusk(weaver)?\s*armor/i, "T8_ARMOR_PLATE_FEY"],
  [/hellion\s*jacket/i, "T8_ARMOR_LEATHER_HELL"],
  [/(jacket\s*of\s*)?tenacity/i, "T8_ARMOR_LEATHER_AVALON"],
  [/mistwalker/i, "T8_ARMOR_LEATHER_FEY"],
  // Boty
  [/stalker\s*shoes|royal\/stalker|stalker\b/i, "T8_SHOES_LEATHER_MORGANA"],
  [/blink|royal\s*sandals/i, "T8_SHOES_CLOTH_ROYAL"],
  [/feyscale/i, "T8_SHOES_CLOTH_FEY"],
  [/mage\s*sandals|\bmage\b/i, "T8_SHOES_CLOTH_SET3"],
  [/scholar\s*sandals/i, "T8_SHOES_CLOTH_SET1"],
  [/soldier\s*boots/i, "T8_SHOES_PLATE_SET1"],
  [/guardian\s*boots/i, "T8_SHOES_PLATE_SET3"],
  [/royal\s*boots/i, "T8_SHOES_PLATE_ROYAL"],
  [/royal\s*shoes|\broyal\b/i, "T8_SHOES_LEATHER_ROYAL"],
  // Capy
  [/smuggler/i, "T8_CAPEITEM_SMUGGLER"],
  [/lymhurst/i, "T8_CAPEITEM_FW_LYMHURST"],
  [/morgana/i, "T8_CAPEITEM_MORGANA"],
  [/ca[er]+leon/i, "T8_CAPEITEM_FW_CAERLEON"],
  [/thetford/i, "T8_CAPEITEM_FW_THETFORD"],
  [/martlock/i, "T8_CAPEITEM_FW_MARTLOCK"],
  [/bridgewatch/i, "T8_CAPEITEM_FW_BRIDGEWATCH"],
  [/fort\s*sterling/i, "T8_CAPEITEM_FW_FORTSTERLING"],
  [/brecilien/i, "T8_CAPEITEM_FW_BRECILIEN"],
  [/avalon.*cape|cape.*avalon/i, "T8_CAPEITEM_AVALON"],
  // Jídlo
  [/ava.*omelet|omelet.*ava|avalonian.*omelet/i, "T7_MEAL_OMELETTE_AVALON"],
  [/omelet/i, "T7_MEAL_OMELETTE"],
  [/ava.*sandwich|sandwich.*ava/i, "T8_MEAL_SANDWICH_AVALON"],
  [/sandwich/i, "T8_MEAL_SANDWICH"],
  [/eel/i, "T8_MEAL_STEW_FISH"], // Deadwater Eel Stew
  [/beef\s*stew|stew/i, "T8_MEAL_STEW"],
  // Fallbacky (samotné slovo bez upřesnění = nejčastější kus v hood sloupci)
  [/soldier\/ass?ass?in|\bsoldier\b/i, "T8_HEAD_PLATE_SET1"], // Soldier Helmet
  [/\bass?ass?in\b/i, "T8_HEAD_LEATHER_SET3"], // Assassin Hood
  [/\bguardian\b/i, "T8_HEAD_PLATE_SET3"],
  [/\bjudi\b/i, "T8_ARMOR_PLATE_KEEPER"],
  [/\bhellion\b/i, "T8_HEAD_LEATHER_HELL"],
];

type TierEnch = { tier: number; ench: number };

/**
 * Z textu vytáhne tier + enchant:
 *  "T7" / "T7+"  -> T7.0     "8.1+" / "T8.1" -> T8@1
 *  "T9" (slang)  -> T8@1     "T10" -> T8@2, "T11" -> T8@3, "T12" -> T8@4
 * Enchant se na ikoně kreslí jako tečky vlevo dole (1 zelená, 2 modré…).
 */
function tierEnchFromText(text: string): TierEnch | null {
  let m = text.match(/\b([4-8])\.([1-4])\+?/);
  if (m) return { tier: Number(m[1]), ench: Number(m[2]) };
  m = text.match(/\bT([4-8])(?:\.([1-4]))?\+?/i);
  if (m) return { tier: Number(m[1]), ench: m[2] ? Number(m[2]) : 0 };
  m = text.match(/\bT(9|1[0-2])\b/i);
  if (m) return { tier: 8, ench: Math.min(4, Number(m[1]) - 8) };
  return null;
}

function tierFromText(text: string): number | null {
  return tierEnchFromText(text)?.tier ?? null;
}

function iconUrl(item: string, te: TierEnch | null): string {
  const tiered = te ? item.replace(/^T\d_/, `T${te.tier}_`) : item;
  const ench = te && te.ench > 0 ? `@${te.ench}` : "";
  return `${RENDER}/${tiered}${ench}.png?quality=4&size=64`;
}

export type CatalogHit = {
  cat: CatalogCategory;
  item: CatalogItem;
  tier: number;
};

const ID_TO_ENTRY = new Map<string, { cat: CatalogCategory; item: CatalogItem }>();
for (const [cat, list] of Object.entries(ITEM_CATALOG)) {
  for (const item of list) {
    ID_TO_ENTRY.set(item.id, { cat: cat as CatalogCategory, item });
  }
}
for (const item of SPECIAL_MOUNTS) ID_TO_ENTRY.set(item.id, { cat: "mount", item });

/**
 * Reverzní vyhledání: z textu ("Hellion hood T7+", "Hmace T7", "Galatine Pair T8")
 * najde item v katalogu — nejdřív přesný název, pak guild slang přes regexy.
 * Používá picker při načtení existujícího řádku.
 */
export function findCatalogItem(part: string): CatalogHit | null {
  const tierRaw = tierFromText(part) ?? 8;
  const exactId = NAME_TO_ID.get(cleanPartName(part).toLowerCase());
  if (exactId) {
    const entry = ID_TO_ENTRY.get(exactId);
    if (entry) return { ...entry, tier: Math.min(tierRaw, entry.item.maxTier) };
  }
  for (const [re, fullId] of [...GEAR_ICONS, ...ROLE_ICONS]) {
    if (re.test(part)) {
      const entry = ID_TO_ENTRY.get(fullId.replace(/^T\d_/, ""));
      if (entry) return { ...entry, tier: Math.min(tierRaw, entry.item.maxTier) };
    }
  }
  return null;
}

/** Role zbraně odvozená ze stromu (podle ID). Best-effort, pro filtrování. */
export function roleClass(id: string): string {
  if (id.includes("SHAPESHIFTER")) return "Shape";
  if (/HOLYSTAFF|NATURESTAFF|WILDSTAFF/.test(id)) return "Heal";
  if (/ARCANESTAFF|ENIGMATIC|ARCANE_RINGPAIR/.test(id)) return "Support";
  if (/MACE|FLAIL|HAMMER|RAM_|ROCKSTAFF|COMBATSTAFF|QUARTERSTAFF|BALANCESTAFF|IRONCLAD|DOUBLEBLADED|SOULSCYTHE/.test(id))
    return "Tank";
  if (/BOW|FIRESTAFF|FROSTSTAFF|ICECRYSTAL|ICEGLACIER|CURSED|DEMONIC|SKULLORB/.test(id))
    return "Ranged";
  return "Melee";
}

/** Role slotu podle názvu (přes katalog/slang); null = nepoznáno. */
export function slotRoleClass(roleName: string): string | null {
  const hit = findCatalogItem(roleName);
  return hit && hit.cat === "weapon" ? roleClass(hit.item.id) : null;
}

// "CALLER" není zbraň — je to značka pro vůdčí slot party (jedno jaký
// build/gear má u sebe napsaný). Vlastní lokální ikona, ne z render API.
export const CALLER_ICON = "/icons/caller-crown.svg";

/** Jedno jméno (bez tieru) -> URL ikony se zadaným (sdíleným) tierem/enchantem. */
function resolveNameIcon(
  name: string,
  te: TierEnch,
  regexes: Array<[RegExp, string]>
): string | null {
  const id = NAME_TO_ID.get(cleanPartName(name).toLowerCase());
  if (id) {
    if (SPECIAL_IDS.has(id)) return `${RENDER}/${id}.png?quality=4&size=64`;
    return iconUrl(`T${te.tier}_${id}`, te);
  }
  for (const [re, item] of regexes) {
    if (re.test(name)) return iconUrl(item, te);
  }
  return null;
}

/**
 * URL ikon pro kus gearu / jídlo (jedna položka buildu, např. "Hellion hood
 * T7+"). Podporuje až 3 varianty oddělené „/" (např. "Stalker Shoes/Royal
 * Shoes T7") — tier/enchant je pro všechny varianty společný (bere se
 * z celého textu), vrátí ikonu pro KAŽDOU rozpoznanou variantu.
 */
export function gearIconUrls(part: string): string[] {
  const te = tierEnchFromText(part) ?? { tier: 8, ench: 0 };
  const names = part.split("/").map((s) => s.trim()).filter(Boolean);
  return names
    .map((n) => resolveNameIcon(n, te, GEAR_ICONS))
    .filter((u): u is string => Boolean(u));
}

/**
 * URL ikon pro slot (roli/zbraň) — podporuje až 3 varianty oddělené „/"
 * (např. "Great Hammer/Mace T7"), vrátí ikonu pro KAŽDOU rozpoznanou
 * variantu. Fallback na starší best-effort hledání v "role + build" pro
 * nejasné zápisy, kde samotné jméno role nic nenajde.
 */
export function slotIconUrls(roleName: string, build = ""): string[] {
  if (/^caller$/i.test(roleName.trim())) return [CALLER_ICON];
  const te = tierEnchFromText(roleName) ?? { tier: 8, ench: 0 };
  const names = roleName.split("/").map((s) => s.trim()).filter(Boolean);
  const urls = names
    .map((n) => resolveNameIcon(n, te, ROLE_ICONS))
    .filter((u): u is string => Boolean(u));
  if (urls.length > 0) return urls;
  const haystack = `${roleName} ${build}`;
  for (const [re, item] of ROLE_ICONS) {
    if (re.test(haystack)) return [iconUrl(item, tierEnchFromText(roleName))];
  }
  return [];
}

// --- Oficiální gameinfo API (Europe server) — statistiky guildy ---

const GAMEINFO_GUILD_ID = "fuENa1e2RXKb07OLjG0lWw"; // Dismount (Europe)

export type GuildStats = {
  memberCount: number;
  killFame: number;
  founded: string; // ISO datum
};

export type GuildKill = {
  eventId: number;
  killer: string;
  victim: string;
  victimGuild: string;
  fame: number;
  time: string;
};

type KillEvent = {
  EventId: number;
  TimeStamp: string;
  TotalVictimKillFame: number;
  Killer?: { Name?: string; GuildId?: string };
  Victim?: { Name?: string; GuildName?: string };
};

/**
 * Top killy guildy za posledních N hodin (podle fame); null = API nedostupné.
 * API vrací max 51 eventů na stránku (od nejnovějšího) — stránkuje se,
 * dokud okno nepokryjeme, max 5 stránek.
 */
export async function fetchTopKills(
  hours = 48,
  top = 10
): Promise<GuildKill[] | null> {
  const cutoff = Date.now() - hours * 3600_000;
  const all: KillEvent[] = [];
  try {
    for (let page = 0; page < 5; page++) {
      const res = await fetch(
        `https://gameinfo-ams.albiononline.com/api/gameinfo/events?guildId=${GAMEINFO_GUILD_ID}&limit=51&offset=${page * 51}`,
        { next: { revalidate: 900 }, signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) break;
      const events = (await res.json()) as KillEvent[];
      if (events.length === 0) break;
      all.push(...events);
      const oldest = events[events.length - 1];
      if (new Date(oldest.TimeStamp).getTime() < cutoff) break;
    }
  } catch {
    // co máme, to máme — případně prázdno
  }
  if (all.length === 0) return null;

  // API vrátí stejný kill klidně 2x (stránky se překrývají, když mezitím
  // přibude nový kill a posune offset) — dedup podle EventId.
  const seen = new Set<number>();
  const deduped = all.filter((e) => {
    if (seen.has(e.EventId)) return false;
    seen.add(e.EventId);
    return true;
  });

  return deduped
    .filter(
      (e) =>
        e.Killer?.GuildId === GAMEINFO_GUILD_ID &&
        new Date(e.TimeStamp).getTime() > cutoff
    )
    .map((e) => ({
      eventId: e.EventId,
      killer: e.Killer?.Name ?? "?",
      victim: e.Victim?.Name ?? "?",
      victimGuild: e.Victim?.GuildName ?? "",
      fame: Number(e.TotalVictimKillFame ?? 0),
      time: e.TimeStamp,
    }))
    .sort((a, b) => b.fame - a.fame)
    .slice(0, top);
}

/** Statistiky guildy z killboardu; null když API zrovna neodpovídá. */
export async function fetchGuildStats(): Promise<GuildStats | null> {
  try {
    const res = await fetch(
      `https://gameinfo-ams.albiononline.com/api/gameinfo/guilds/${GAMEINFO_GUILD_ID}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const g = await res.json();
    if (typeof g?.MemberCount !== "number") return null;
    return {
      memberCount: g.MemberCount,
      killFame: Number(g.killFame ?? 0),
      founded: String(g.Founded ?? ""),
    };
  } catch {
    return null;
  }
}
