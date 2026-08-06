# dismount.team

Web guildy **Dismount** (Albion Online, Europe server): veřejný onesite + interní
přihlašování na akce (Call to Arms) s rozřazováním hráčů callerem.

## Funkce

- **Login přes Discord** (OAuth2) — práva na webu se řídí rolemi na guild
  Discord serveru (bot je čte přes API, žádná hesla, žádná druhá správa účtů).
- **Akce (CTA)**: caller vypíše akci s kompozicí (party po max 20 hráčích),
  hráči se hlásí výběrem rolí podle priority nebo FILL, caller je rozhazuje
  na sloty drag & dropem. 2 h po začátku se akce zamkne a přesune do archivu.
- **Kompozice**: knihovna šablon — editace textem (podpora copy-paste přímo
  z Google Sheets), nebo item pickerem s gridem ikon, filtrem rolí
  (Tank/Heal/Support/…) a variantami itemů.
- **Ikony itemů** z oficiálního render API Albionu, s vlastní disk cache
  (`/api/icon`), rozpoznávání tierů a enchantů („T9" = 8.1 s tečkou)
  i guildovního slangu.
- Živé statistiky guildy z oficiálního gameinfo API na titulce.

## Stack

Next.js (app router) · TypeScript · Tailwind CSS · Auth.js (Discord provider) ·
better-sqlite3 · Docker

## Vývoj

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Local sandbox (`DEV_ENVIRONMENT`)

In `.env.local`:

```env
AUTH_SECRET=any-random-string
DEV_ENVIRONMENT=true
DEV_FAKE_ROLE=admin
DEV_FAKE_NAME=Local admin
```

- Fake Leadership login (role dropdown in the header).
- Discord **never** uses production channel IDs. Optional test channels:
  `DEV_DISCORD_CTA_CHANNEL_ID` (+ bot token). If unset → Discord is no-op.
- No `@everyone` pings in the sandbox.
- Event board can add simulated signups (Test user N).

Ignored unless `NODE_ENV=development`. See `.env.example`.

## Produkce

```bash
docker compose build && docker compose up -d
```

SQLite databáze a cache ikon žijí ve volume `./data`. Za reverse proxy
(Caddy/nginx) s TLS; aplikace poslouchá na portu 3000.

## Údržba katalogu itemů

Po herním patchi s novými itemy:

```bash
node scripts/build-item-catalog.mjs   # stáhne čerstvý dump (ao-data/ao-bin-dumps)
node scripts/warm-icons.mjs           # předehřeje cache ikon
```
