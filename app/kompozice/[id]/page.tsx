import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import { getTemplate, getTemplateText, getTemplateVersions } from "@/lib/comps";
import {
  saveTemplateAction,
  deleteTemplateAction,
  restoreTemplateVersionAction,
} from "../actions";
import { ConfirmForm } from "@/components/confirm-form";
import { CompEditor } from "@/components/comp-editor";
import { LocalTime } from "@/components/local-time";

export default async function EditKompozicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, "caller")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-muted">Kompozice spravuje jen caller nebo vedení.</p>
      </div>
    );
  }

  const { id } = await params;
  const isNew = id === "nova";
  const template = isNew ? null : getTemplate(Number(id));
  if (!isNew && !template) notFound();
  const slotsText = template ? getTemplateText(template.id) : "";
  const versions = template ? getTemplateVersions(template.id) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link href="/kompozice" className="text-sm text-muted hover:text-foreground">
        ← zpět na kompozice
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {template ? `Kompozice: ${template.name}` : "Nová kompozice"}
        </h1>
        {template && (
          <ConfirmForm
            action={deleteTemplateAction}
            message={`Opravdu smazat kompozici „${template.name}"?`}
          >
            <input type="hidden" name="id" value={template.id} />
            <button
              type="submit"
              className="rounded border border-border px-3 py-1 text-xs text-muted hover:border-red-500 hover:text-red-400 cursor-pointer"
            >
              Smazat
            </button>
          </ConfirmForm>
        )}
      </div>

      <form action={saveTemplateAction} className="mt-6 space-y-6">
        {template && <input type="hidden" name="id" value={template.id} />}
        <label className="block max-w-md">
          <span className="text-sm text-muted">Název (např. Heavybrawl, TAPka, Brawl)</span>
          <input
            name="name"
            required
            defaultValue={template?.name ?? ""}
            className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <CompEditor initialText={slotsText} />

        <button
          type="submit"
          className="rounded bg-accent px-6 py-2 font-medium text-background hover:bg-accent-hover cursor-pointer"
        >
          Uložit kompozici
        </button>
      </form>

      {template && versions.length > 0 && (
        <div className="mt-10">
          <h2 className="font-semibold">Historie verzí</h2>
          <p className="mt-1 text-sm text-muted">
            Stav před každou uloženou úpravou — obnovením vznikne nová
            kompozice se stejným obsahem, tahle se nepřepíše.
          </p>
          <ul className="mt-3 space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span className="text-muted">
                  <LocalTime utc={v.created_at} />
                  {v.changed_by_name && <> · upravil {v.changed_by_name}</>}
                </span>
                <form action={restoreTemplateVersionAction}>
                  <input type="hidden" name="version_id" value={v.id} />
                  <button
                    type="submit"
                    className="rounded border border-accent px-3 py-1 text-xs text-accent hover:bg-accent hover:text-background cursor-pointer whitespace-nowrap"
                  >
                    Obnovit tuto verzi
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
