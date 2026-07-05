import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Malý produkční image (server.js + jen potřebné node_modules).
  output: "standalone",
  // Nativní modul — nesmí se bundlovat, načítá se z node_modules za běhu.
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
