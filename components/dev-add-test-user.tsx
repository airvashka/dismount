"use client";

import { useState } from "react";
import { addDevSignupAction } from "@/app/dev/actions";
import { slotIconUrls } from "@/lib/albion";
import { ItemIcon } from "@/components/item-icon";

export function DevAddTestUser({
  eventId,
  roles,
}: {
  eventId: number;
  roles: string[];
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [fill, setFill] = useState(false);

  const toggle = (role: string) =>
    setPicked((r) =>
      r.includes(role)
        ? r.filter((x) => x !== role)
        : r.length < 3
          ? [...r, role]
          : r
    );

  return (
    <form
      action={addDevSignupAction}
      className="rounded-lg border border-red-500/40 bg-surface p-3"
    >
      <input type="hidden" name="event_id" value={eventId} />
      {picked.map((r) => (
        <input key={r} type="hidden" name="offer" value={r} />
      ))}
      {fill && <input type="hidden" name="fill" value="1" />}

      <div className="text-xs font-semibold uppercase tracking-wide text-red-400">
        Dev — add test user
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Pick roles (or FILL), then + — adds{" "}
        <span className="text-red-300">Test user N</span> to the waiting list.
      </p>

      <button
        type="button"
        onClick={() => setFill((f) => !f)}
        className={
          "mt-2 w-full rounded border px-2 py-1.5 text-sm font-semibold cursor-pointer transition-colors " +
          (fill
            ? "border-emerald-500 bg-emerald-500 text-background"
            : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10")
        }
      >
        {fill ? "✓ FILL" : "FILL"}
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {roles.map((role) => {
          const idx = picked.indexOf(role);
          const icons = slotIconUrls(role, "");
          return (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              className={
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs cursor-pointer " +
                (idx >= 0
                  ? "border-accent bg-accent/20 text-accent font-semibold"
                  : "border-border text-muted hover:border-accent")
              }
            >
              {idx >= 0 && (
                <span className="rounded bg-accent px-1 text-[10px] font-bold text-background">
                  {idx + 1}.
                </span>
              )}
              {icons.map((u, i) => (
                <ItemIcon key={i} src={u} size={16} />
              ))}
              {role}
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={picked.length === 0 && !fill}
        className="mt-2 w-full rounded border border-red-500/50 bg-red-950/40 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-900/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Add test user
      </button>
    </form>
  );
}
