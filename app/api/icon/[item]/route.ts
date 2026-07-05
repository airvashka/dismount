// Cache proxy pro ikony itemů z render.albiononline.com.
// Render server Albionu je pomalý a občas padá — každou ikonu stáhneme
// jednou, uložíme do data/icons a dál ji servírujeme sami (immutable cache).

import type { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "data", "icons");
const UPSTREAM = "https://render.albiononline.com/v1/item";

function png(buf: Uint8Array): Response {
  return new Response(new Blob([buf as BlobPart]), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ item: string }> }
) {
  const { item } = await ctx.params;
  if (!/^[A-Za-z0-9_@]+\.png$/.test(item) || item.length > 80) {
    return new Response("bad item", { status: 400 });
  }
  const sizeParam = req.nextUrl.searchParams.get("size");
  const size = sizeParam === "217" ? "217" : "64";

  const file = path.join(
    CACHE_DIR,
    `${item.replace(/\.png$/, "").replace("@", "_e")}_s${size}.png`
  );

  try {
    return png(fs.readFileSync(file));
  } catch {
    // není v cache -> stáhnout
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${UPSTREAM}/${item}?quality=4&size=${size}`, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        try {
          fs.mkdirSync(CACHE_DIR, { recursive: true });
          fs.writeFileSync(file, buf);
        } catch {
          // cache zápis selhal — ikonu aspoň vrátíme
        }
        return png(buf);
      }
      if (res.status === 404) return new Response("not found", { status: 404 });
    } catch {
      // timeout / síť — zkusit ještě jednou
    }
  }
  return new Response("upstream error", { status: 502 });
}
