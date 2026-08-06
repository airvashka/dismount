"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ROLE_LABELS, type WebRole } from "@/lib/roles";
import { setDevRoleAction } from "@/app/dev/actions";

const OPTIONS: WebRole[] = [
  "admin",
  "caller",
  "member",
  "recruit",
  "novice",
  "dismount",
];

export function DevRoleSwitcher({ current }: { current: WebRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  return (
    <div className="inline-flex items-center gap-1">
      <label
        className="text-[10px] uppercase tracking-wide text-red-400/80"
        htmlFor="dev-role"
      >
        role
      </label>
      <select
        id="dev-role"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as WebRole;
          setValue(next);
          startTransition(async () => {
            await setDevRoleAction(next);
            router.refresh();
          });
        }}
        className="rounded border border-red-500/40 bg-background px-1.5 py-0.5 text-xs text-red-300 disabled:opacity-60"
        title="Local test only — switches permissions without restart. Pick Leadership for full access."
      >
        {OPTIONS.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}
