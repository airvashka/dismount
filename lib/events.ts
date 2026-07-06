// Databázové operace nad akcemi (CTA), sloty a přihláškami.

import { getDb } from "./db";

export type EventRow = {
  id: number;
  title: string;
  type: string;
  starts_at: string; // "YYYY-MM-DD HH:MM" v UTC
  description: string;
  created_by: string;
  created_by_name: string;
  discord_message_id: string | null;
  discord_reminded_at: string | null;
};

export type SlotRow = {
  id: number;
  event_id: number;
  position: number;
  party: string;
  role_name: string;
  build: string;
  note: string;
};

export type SignupRow = {
  id: number;
  event_id: number;
  slot_id: number | null;
  discord_id: string;
  display_name: string;
  note: string;
  offers: string; // JSON pole rolí ("[\"Heavy Mace\"]"), ["FILL"] = cokoliv
};

export type EventListItem = EventRow & {
  slot_count: number;
  signup_count: number;
};

export function listUpcomingEvents(): EventListItem[] {
  return getDb()
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM event_slots s WHERE s.event_id = e.id) AS slot_count,
        (SELECT COUNT(*) FROM signups g WHERE g.event_id = e.id) AS signup_count
      FROM events e
      WHERE e.starts_at >= datetime('now', '-2 hours')
      ORDER BY e.starts_at`
    )
    .all() as EventListItem[];
}

/** Proběhlé akce (archiv) — od nejnovější. */
export function listPastEvents(limit = 50): EventListItem[] {
  return getDb()
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM event_slots s WHERE s.event_id = e.id) AS slot_count,
        (SELECT COUNT(*) FROM signups g WHERE g.event_id = e.id) AS signup_count
      FROM events e
      WHERE e.starts_at < datetime('now', '-2 hours')
      ORDER BY e.starts_at DESC
      LIMIT ?`
    )
    .all(limit) as EventListItem[];
}

export type MySignupInfo = {
  event_id: number;
  slot_id: number | null;
  role_name: string | null;
  build: string | null;
};

/** Přihlášky hráče napříč akcemi (pro badge ve výpisu). */
export function getMySignups(discordId: string): Map<number, MySignupInfo> {
  const rows = getDb()
    .prepare(
      `SELECT s.event_id, s.slot_id, sl.role_name, sl.build
       FROM signups s LEFT JOIN event_slots sl ON sl.id = s.slot_id
       WHERE s.discord_id = ?`
    )
    .all(discordId) as MySignupInfo[];
  return new Map(rows.map((r) => [r.event_id, r]));
}

/** Akce se 2 h po začátku zamyká — archiv jen k nahlédnutí. */
export function isLocked(event: EventRow): boolean {
  const iso = event.starts_at.replace(" ", "T");
  const start = new Date((iso.length === 16 ? iso + ":00" : iso) + "Z").getTime();
  return start + 2 * 3600_000 < Date.now();
}

export function getEvent(id: number): EventRow | undefined {
  return getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as
    | EventRow
    | undefined;
}

export function getSlots(eventId: number): SlotRow[] {
  return getDb()
    .prepare("SELECT * FROM event_slots WHERE event_id = ? ORDER BY position")
    .all(eventId) as SlotRow[];
}

export function getSignups(eventId: number): SignupRow[] {
  return getDb()
    .prepare("SELECT * FROM signups WHERE event_id = ? ORDER BY created_at")
    .all(eventId) as SignupRow[];
}

export type ParticipationRow = {
  event_id: number;
  event_title: string;
  starts_at: string;
  discord_id: string;
  display_name: string;
  role_name: string;
  build: string;
};

/** Kdo hrál jakou roli na proběhlých (archivovaných) akcích, od nejnovější. */
export function getParticipationHistory(): ParticipationRow[] {
  return getDb()
    .prepare(
      `SELECT e.id AS event_id, e.title AS event_title, e.starts_at,
              s.discord_id, s.display_name, sl.role_name, sl.build
       FROM signups s
       JOIN events e ON e.id = s.event_id
       JOIN event_slots sl ON sl.id = s.slot_id
       WHERE e.starts_at < datetime('now', '-2 hours')
       ORDER BY e.starts_at DESC`
    )
    .all() as ParticipationRow[];
}

export type NewSlot = {
  party: string;
  role_name: string;
  build: string;
  note: string;
};

export function createEvent(
  data: {
    title: string;
    type: string;
    starts_at: string;
    description: string;
    created_by: string;
    created_by_name: string;
  },
  slots: NewSlot[]
): number {
  const db = getDb();
  const insertEvent = db.prepare(
    `INSERT INTO events (title, type, starts_at, description, created_by, created_by_name)
     VALUES (@title, @type, @starts_at, @description, @created_by, @created_by_name)`
  );
  const insertSlot = db.prepare(
    `INSERT INTO event_slots (event_id, position, party, role_name, build, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    const eventId = insertEvent.run(data).lastInsertRowid as number;
    slots.forEach((s, i) =>
      insertSlot.run(eventId, i, s.party, s.role_name, s.build, s.note)
    );
    return eventId;
  });
  return tx();
}

export function deleteEvent(id: number): void {
  getDb().prepare("DELETE FROM events WHERE id = ?").run(id);
}

/**
 * Upraví akci (datum, popis, kompozici...) i po přihlášení hráčů. Sloty se
 * nahrazují celé (smazání + nová sada) — díky `ON DELETE SET NULL` u
 * `signups.slot_id` se přiřazení hráči bezpečně vrátí mezi čekající
 * (jejich přihláška/nabídka zůstane), místo zůstat viset na neexistujícím
 * slotu. Caller je pak musí přerozřadit.
 */
export function updateEvent(
  id: number,
  data: { title: string; type: string; starts_at: string; description: string },
  slots: NewSlot[]
): void {
  const db = getDb();
  // Posun startu zruší už poslaný reminder, ať se cron pošle znovu na
  // nový čas (viz getEventsDueForReminder/markReminderSent níž).
  const updateEventStmt = db.prepare(
    `UPDATE events SET title = @title, type = @type, starts_at = @starts_at,
      description = @description,
      discord_reminded_at = CASE WHEN starts_at = @starts_at THEN discord_reminded_at ELSE NULL END
     WHERE id = @id`
  );
  const deleteSlots = db.prepare("DELETE FROM event_slots WHERE event_id = ?");
  const insertSlot = db.prepare(
    `INSERT INTO event_slots (event_id, position, party, role_name, build, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    updateEventStmt.run({ ...data, id });
    deleteSlots.run(id);
    slots.forEach((s, i) =>
      insertSlot.run(id, i, s.party, s.role_name, s.build, s.note)
    );
  });
  tx();
}

export function setDiscordMessageId(id: number, messageId: string): void {
  getDb()
    .prepare("UPDATE events SET discord_message_id = ? WHERE id = ?")
    .run(messageId, id);
}

/** Akce začínající za ~50–70 min, které ještě nedostaly reminder. */
export function getEventsDueForReminder(): EventRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM events
       WHERE discord_reminded_at IS NULL
         AND starts_at BETWEEN datetime('now', '+50 minutes') AND datetime('now', '+70 minutes')`
    )
    .all() as EventRow[];
}

export function markReminderSent(id: number): void {
  getDb()
    .prepare("UPDATE events SET discord_reminded_at = datetime('now') WHERE id = ?")
    .run(id);
}

/**
 * Přihlásí hráče na akci (na slot, nebo bez slotu — čeká na rozřazení).
 * Případnou předchozí přihlášku na téže akci nahradí; prázdná poznámka
 * a nabídky se převezmou z předchozí přihlášky (přesun neztrácí info).
 * Vrací chybovou hlášku, nebo null při úspěchu.
 */
export function signUp(params: {
  eventId: number;
  slotId: number | null;
  discordId: string;
  displayName: string;
  note: string;
  offers: string;
}): string | null {
  const db = getDb();
  const tx = db.transaction(() => {
    if (params.slotId !== null) {
      const slot = db
        .prepare("SELECT id FROM event_slots WHERE id = ? AND event_id = ?")
        .get(params.slotId, params.eventId);
      if (!slot) return "Slot neexistuje.";
      const taken = db
        .prepare(
          "SELECT display_name FROM signups WHERE slot_id = ? AND discord_id != ?"
        )
        .get(params.slotId, params.discordId) as
        | { display_name: string }
        | undefined;
      if (taken) return `Slot už zabral ${taken.display_name}.`;
    }
    const previous = db
      .prepare(
        "SELECT note, offers FROM signups WHERE event_id = ? AND discord_id = ?"
      )
      .get(params.eventId, params.discordId) as
      | { note: string; offers: string }
      | undefined;
    db.prepare(
      "DELETE FROM signups WHERE event_id = ? AND discord_id = ?"
    ).run(params.eventId, params.discordId);
    db.prepare(
      `INSERT INTO signups (event_id, slot_id, discord_id, display_name, note, offers)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      params.eventId,
      params.slotId,
      params.discordId,
      params.displayName,
      params.note || previous?.note || "",
      params.offers || previous?.offers || ""
    );
    return null;
  });
  return tx();
}

/**
 * Caller přiřadí přihlášeného hráče na slot. Pokud je slot obsazený,
 * původní hráč se přesune mezi nepřiřazené. Vrací chybu nebo null.
 */
export function assignToSlot(
  eventId: number,
  slotId: number,
  signupId: number
): string | null {
  const db = getDb();
  const tx = db.transaction(() => {
    const slot = db
      .prepare("SELECT id FROM event_slots WHERE id = ? AND event_id = ?")
      .get(slotId, eventId);
    if (!slot) return "Slot neexistuje.";
    const signup = db
      .prepare("SELECT id FROM signups WHERE id = ? AND event_id = ?")
      .get(signupId, eventId);
    if (!signup) return "Přihláška neexistuje.";
    db.prepare(
      "UPDATE signups SET slot_id = NULL WHERE slot_id = ? AND event_id = ?"
    ).run(slotId, eventId);
    db.prepare("UPDATE signups SET slot_id = ? WHERE id = ?").run(
      slotId,
      signupId
    );
    return null;
  });
  return tx();
}

/** Caller uvolní slot — hráč se přesune mezi nepřiřazené. */
export function clearSlot(eventId: number, slotId: number): void {
  getDb()
    .prepare(
      "UPDATE signups SET slot_id = NULL WHERE slot_id = ? AND event_id = ?"
    )
    .run(slotId, eventId);
}

export function removeSignup(eventId: number, discordId: string): void {
  getDb()
    .prepare("DELETE FROM signups WHERE event_id = ? AND discord_id = ?")
    .run(eventId, discordId);
}
