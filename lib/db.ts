// SQLite databáze (better-sqlite3). Soubor v ./data/dismount.db.
// Schéma se vytvoří automaticky při prvním použití.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(path.join(DATA_DIR, "dismount.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'CTA',
      starts_at TEXT NOT NULL,            -- ISO 8601, UTC
      description TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,           -- discord id callera
      created_by_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      discord_message_id TEXT             -- id embed zprávy v #call-to-arms
    );

    -- Sloty v kompozici akce (build + požadavky na gear)
    CREATE TABLE IF NOT EXISTS event_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      role_name TEXT NOT NULL,            -- např. "Heavy Mace", "Holy Healer"
      build TEXT NOT NULL DEFAULT '',     -- gear requirementy
      note TEXT NOT NULL DEFAULT ''
    );

    -- Přihlášky hráčů na sloty
    CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      slot_id INTEGER REFERENCES event_slots(id) ON DELETE SET NULL,
      discord_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',      -- např. alternativní buildy
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (event_id, discord_id)
    );

    -- Šablony kompozic (knihovna, kterou si caller klonuje do akce)
    CREATE TABLE IF NOT EXISTS comp_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comp_template_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES comp_templates(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      role_name TEXT NOT NULL,
      build TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT ''
    );

    -- Historie verzí kompozic — snapshot PŘED každou úpravou/smazáním šablony
    -- (viz lib/comps.ts snapshotTemplate). Záměrně BEZ FK/CASCADE na
    -- comp_templates: historie musí přežít i smazání šablony, aby šla
    -- obnovit jako nová.
    CREATE TABLE IF NOT EXISTS comp_template_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slots_text TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      changed_by_name TEXT NOT NULL DEFAULT '',
      deleted INTEGER NOT NULL DEFAULT 0,   -- 1 = snapshot těsně před smazáním šablony
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Dodatečné sloupce (migrace přes ALTER TABLE, guard přes PRAGMA table_info):
  // - party: sloty se seskupují do part (max ~20 hráčů)
  // - offers: JSON pole rolí, které se hráč nabídl hrát (["FILL"] = cokoliv)
  const ADDED_COLUMNS: Array<[string, string, string]> = [
    ["event_slots", "party", "TEXT NOT NULL DEFAULT ''"],
    ["comp_template_slots", "party", "TEXT NOT NULL DEFAULT ''"],
    ["signups", "offers", "TEXT NOT NULL DEFAULT ''"],
    // Kdy byl poslán 1h reminder do Discordu — NULL = ještě neposlán.
    // Cron kontrola podle tohohle sloupce nespamuje opakovaně; reset na
    // NULL při posunu starts_at (updateEvent), ať se pošle znovu na nový čas.
    ["events", "discord_reminded_at", "TEXT"],
  ];
  for (const [table, column, type] of ADDED_COLUMNS) {
    const cols = db
      .prepare(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }
}
