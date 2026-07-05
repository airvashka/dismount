// Šablony kompozic — knihovna, kterou si caller vybere při vypsání akce.

import { getDb } from "./db";
import { parseSlotLines, slotsToText } from "./comp-format";

export type CompTemplate = {
  id: number;
  name: string;
  created_by: string;
  slot_count?: number;
};

export type CompTemplateSlot = {
  id: number;
  template_id: number;
  position: number;
  party: string;
  role_name: string;
  build: string;
  note: string;
};

export function listTemplates(): CompTemplate[] {
  return getDb()
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM comp_template_slots s WHERE s.template_id = t.id) AS slot_count
       FROM comp_templates t ORDER BY t.name`
    )
    .all() as CompTemplate[];
}

export function getTemplate(id: number): CompTemplate | undefined {
  return getDb()
    .prepare("SELECT * FROM comp_templates WHERE id = ?")
    .get(id) as CompTemplate | undefined;
}

export function getTemplateSlots(templateId: number): CompTemplateSlot[] {
  return getDb()
    .prepare(
      "SELECT * FROM comp_template_slots WHERE template_id = ? ORDER BY position"
    )
    .all(templateId) as CompTemplateSlot[];
}

export function getTemplateText(templateId: number): string {
  return slotsToText(getTemplateSlots(templateId));
}

/** Vytvoří (id = null) nebo přepíše šablonu. Vrací id šablony. */
export function saveTemplate(
  id: number | null,
  name: string,
  slotsText: string,
  createdBy: string
): number {
  const db = getDb();
  const slots = parseSlotLines(slotsText);
  const insertSlot = db.prepare(
    `INSERT INTO comp_template_slots (template_id, position, party, role_name, build, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    let templateId = id;
    if (templateId === null) {
      templateId = db
        .prepare("INSERT INTO comp_templates (name, created_by) VALUES (?, ?)")
        .run(name, createdBy).lastInsertRowid as number;
    } else {
      db.prepare("UPDATE comp_templates SET name = ? WHERE id = ?").run(
        name,
        templateId
      );
      db.prepare("DELETE FROM comp_template_slots WHERE template_id = ?").run(
        templateId
      );
    }
    slots.forEach((s, i) =>
      insertSlot.run(templateId, i, s.party, s.role_name, s.build, s.note)
    );
    return templateId;
  });
  return tx();
}

export function deleteTemplate(id: number): void {
  getDb().prepare("DELETE FROM comp_templates WHERE id = ?").run(id);
}
