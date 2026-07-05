"use client";

// Ikona itemu s hover náhledem: zvětšenina se vykresluje position:fixed,
// takže ji neořízne scrollovací tabulka ani okraj karty.

import { useState } from "react";

export function ItemIcon({
  src,
  size = 16,
  zoom = 96,
}: {
  src: string;
  size?: number;
  zoom?: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      className="inline-flex shrink-0"
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={size} height={size} alt="" />
      {pos && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src.replace(/size=\d+/, "size=217")}
          width={zoom}
          height={zoom}
          alt=""
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface/95 p-1 shadow-2xl"
          style={{
            left: Math.max(4, pos.x - zoom / 2),
            top: Math.max(4, pos.y - zoom - 10),
          }}
        />
      )}
    </span>
  );
}
