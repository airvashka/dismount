import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { AuthControls } from "@/components/auth-buttons";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dismount – Albion Online guilda",
  description:
    "Dismount – česko-slovenská guilda v Albion Online. Info, nábor a přihlašování na akce.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const isCaller = atLeast(user?.webRole, "caller");
  const isMember = atLeast(user?.webRole, "dismount");

  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
            <nav className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/logo.png"
                  alt=""
                  width={34}
                  height={34}
                  className="rounded-full ring-1 ring-border"
                />
                <span className="text-lg font-bold tracking-widest text-accent">
                  DISMOUNT
                </span>
              </Link>
              <Link href="/akce" className="text-sm text-muted hover:text-foreground">
                Akce
              </Link>
              {isMember && (
                <Link href="/historie" className="text-sm text-muted hover:text-foreground">
                  Historie
                </Link>
              )}
              {isCaller && (
                <Link
                  href="/kompozice"
                  className="text-sm text-muted hover:text-foreground"
                >
                  Kompozice
                </Link>
              )}
              <Link href="/pravidla" className="text-sm text-muted hover:text-foreground">
                Pravidla
              </Link>
            </nav>
            <AuthControls />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          Dismount · Albion Online · dismount.team
        </footer>
      </body>
    </html>
  );
}
