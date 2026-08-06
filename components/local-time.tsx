"use client";

import { useSyncExternalStore } from "react";

function formatLocal(utc: string): string {
  const iso = utc.replace(" ", "T");
  const d = new Date((iso.length === 16 ? iso + ":00" : iso) + "Z");
  return d.toLocaleString("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const subscribeNoop = () => () => {};

export function LocalTime({ utc }: { utc: string }) {
  const local = useSyncExternalStore(
    subscribeNoop,
    () => formatLocal(utc),
    () => null
  );

  const [date, time] = utc.split(" ");
  const [, m, d] = date.split("-");

  return (
    <span>
      {Number(d)}.{Number(m)}. {time.slice(0, 5)} UTC
      {local && <span className="text-muted"> · {local} místního</span>}
    </span>
  );
}
