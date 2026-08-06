import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isDevEnvironment } from "./dev-env";
import { HIERARCHY, type WebRole } from "./roles";

export type SessionUser = {
  discordId: string;
  name: string;
  webRole: WebRole;
  isInGuild: boolean;
  isDev: boolean;
};

export const DEV_ROLE_COOKIE = "dev_web_role";

/**
 * DEV_FAKE_ROLE from env / cookie → WebRole.
 * Aliases: leadership→admin, true/1/yes→admin.
 */
export function resolveDevRole(raw: string | undefined | null): WebRole | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === "true" || key === "1" || key === "yes") return "admin";
  if (key === "leadership") return "admin";
  if ((HIERARCHY as string[]).includes(key)) return key as WebRole;
  return null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDevEnvironment()) {
    const jar = await cookies();
    const fromCookie = resolveDevRole(jar.get(DEV_ROLE_COOKIE)?.value);
    const fromEnv = resolveDevRole(process.env.DEV_FAKE_ROLE);
    const webRole = fromCookie ?? fromEnv ?? "admin";
    return {
      discordId: process.env.DEV_FAKE_DISCORD_ID?.trim() || "dev-000",
      name: process.env.DEV_FAKE_NAME?.trim() || "Local admin",
      webRole,
      isInGuild: webRole !== "guest",
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
