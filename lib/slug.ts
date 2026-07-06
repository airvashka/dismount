// Hezci URL pro akce: /akce/10-zvz-aliance-vypad misto holeho /akce/10.
// ID zustava autoritativni (parseInt cte jen vedouci cislice a zbytek
// ignoruje) - stare odkazy bez slugu i slug z doby pred prejmenovanim
// akce dal funguji, nic se nemuze rozbit.

const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;

/** URL-friendly slug z nazvu (bez diakritiky, jen a-z0-9 a pomlcky). */
export function slugify(text: string): string {
  let ascii = "";
  for (const ch of text.normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= COMBINING_DIACRITICS_START && code <= COMBINING_DIACRITICS_END) continue;
    ascii += ch;
  }
  return ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Cesta k detailu akce s hezkym slugem v URL. */
export function eventPath(id: number, title: string): string {
  const slug = slugify(title);
  return slug ? `/akce/${id}-${slug}` : `/akce/${id}`;
}
