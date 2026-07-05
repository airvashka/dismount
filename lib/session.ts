// Jednotný přístup k přihlášenému uživateli.
// V dev režimu s DEV_FAKE_ROLE v .env.local vrací falešného uživatele,
// aby šel web testovat bez Discord aplikace. V produkci se ignoruje.

import { auth } from "@/auth";
import { HIERARCHY, type WebRole } from "./roles";

export type SessionUser = {
  discordId: string;
  name: string;
  webRole: WebRole;
  isInGuild: boolean;
  isDev: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const fakeRole = process.env.DEV_FAKE_ROLE as WebRole | undefined;
  if (
    process.env.NODE_ENV === "development" &&
    fakeRole &&
    HIERARCHY.includes(fakeRole)
  ) {
    return {
      discordId: "dev-000",
      name: "Testovací hráč",
      webRole: fakeRole,
      isInGuild: true,
      isDev: true,
    };
  }

  const session = await auth();
  if (!session?.user) return null;
  return {
    discordId: session.user.discordId,
    name: session.user.name ?? "neznámý",
    webRole: session.user.webRole,
    isInGuild: session.user.isInGuild,
    isDev: false,
  };
}
