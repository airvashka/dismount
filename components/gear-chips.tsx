// Build rozsekaný na kusy gearu — každý s ikonkou z render API (když ji poznáme).
// Hover na ikonku ukáže plovoucí zvětšeninu (ItemIcon).

import { gearIconUrl } from "@/lib/albion";
import { ItemIcon } from "@/components/item-icon";

export function GearChips({
  text,
  size = 26,
  nowrap = false,
}: {
  text: string;
  size?: number;
  nowrap?: boolean;
}) {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <span
      className={
        nowrap
          ? "flex items-center gap-x-2.5 whitespace-nowrap"
          : "flex flex-wrap items-center gap-x-2.5 gap-y-0.5"
      }
    >
      {parts.map((part, i) => {
        const url = gearIconUrl(part);
        return (
          <span key={i} className="inline-flex items-center gap-1 whitespace-nowrap">
            {url && <ItemIcon src={url} size={size} />}
            {part}
          </span>
        );
      })}
    </span>
  );
}
