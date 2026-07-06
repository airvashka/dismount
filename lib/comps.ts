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

export type TemplateVersion = {
  id: number;
  template_id: number;
  name: string;
  slots_text: string;
  changed_by: string;
  changed_by_name: string;
  deleted: number;
  created_at: string;
};

/** Uloží snapshot AKTUÁLNÍHO stavu šablony před úpravou/smazáním. */
function snapshotTemplate(
  id: number,
  changedBy: string,
  changedByName: string,
  deleted: boolean
): void {
  const template = getTemplate(id);
  if (!template) return;
  getDb()
    .prepare(
      `INSERT INTO comp_template_versions
        (template_id, name, slots_text, changed_by, changed_by_name, deleted)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, template.name, getTemplateText(id), changedBy, changedByName, deleted ? 1 : 0);
}

/** Historie verzí existující šablony (jen před úpravami, ne smazání), od nejnovější. */
export function getTemplateVersions(templateId: number): TemplateVersion[] {
  return getDb()
    .prepare(
      `SELECT * FROM comp_template_versions
       WHERE template_id = ? AND deleted = 0
       ORDER BY created_at DESC`
    )
    .all(templateId) as TemplateVersion[];
}

/** Poslední snapshot každé smazané šablony (pro obnovu ze seznamu kompozic). */
export function getDeletedTemplates(): TemplateVersion[] {
  return getDb()
    .prepare(
      `SELECT v.* FROM comp_template_versions v
       WHERE v.deleted = 1
         AND v.id = (
           SELECT MAX(id) FROM comp_template_versions v2
           WHERE v2.template_id = v.template_id AND v2.deleted = 1
         )
       ORDER BY v.created_at DESC`
    )
    .all() as TemplateVersion[];
}

export function getTemplateVersion(versionId: number): TemplateVersion | undefined {
  return getDb()
    .prepare("SELECT * FROM comp_template_versions WHERE id = ?")
    .get(versionId) as TemplateVersion | undefined;
}

/** Vytvoří (id = null) nebo přepíše šablonu. Před přepsáním uloží snapshot. Vrací id šablony. */
export function saveTemplate(
  id: number | null,
  name: string,
  slotsText: string,
  createdBy: string,
  createdByName: string
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
      snapshotTemplate(templateId, createdBy, createdByName, false);
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

/** Smaže šablonu — před tím uloží finální snapshot, ať jde obnovit. */
export function deleteTemplate(
  id: number,
  deletedBy: string,
  deletedByName: string
): void {
  snapshotTemplate(id, deletedBy, deletedByName, true);
  getDb().prepare("DELETE FROM comp_templates WHERE id = ?").run(id);
}

/** Obnoví verzi (existující i smazané šablony) jako NOVOU šablonu. Vrací id. */
export function restoreTemplateVersion(
  versionId: number,
  restoredBy: string
): number | null {
  const version = getTemplateVersion(versionId);
  if (!version) return null;
  return saveTemplate(null, version.name, version.slots_text, restoredBy, "");
}
