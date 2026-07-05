"use client";

// Zobrazení času akce: UTC (herní čas) + přepočet do lokálního času hráče.
// Klientská komponenta kvůli časové zóně prohlížeče (server ji nezná).

import { useEffect, useState } from "react";

export function LocalTime({ utc }: { utc: string }) {
  // utc: "YYYY-MM-DD HH:MM" v UTC
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    const iso = utc.replace(" ", "T");
    const d = new Date((iso.length === 16 ? iso + ":00" : iso) + "Z");
    setLocal(
      d.toLocaleString("cs-CZ", {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [utc]);

  const [date, time] = utc.split(" ");
  const [, m, d] = date.split("-");

  return (
    <span>
      {Number(d)}.{Number(m)}. {time.slice(0, 5)} UTC
      {local && <span className="text-muted"> · {local} místního</span>}
    </span>
  );
}
