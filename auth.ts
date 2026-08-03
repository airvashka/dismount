import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import type { JWT } from "next-auth/jwt";
import { fetchGuildMember } from "@/lib/discord";
import { mapRoles, ROLE_REFRESH_MS, type WebRole } from "@/lib/roles";

async function refreshGuildRoles(token: JWT, discordId: string): Promise<void> {
  const member = await fetchGuildMember(discordId);
  if (member === null) {
    // Bot není nakonfigurován — role neměň (nech poslední známý stav).
    return;
  }
  const webRole = member.isInGuild
    ? mapRoles(member.roleIds)
    : ("guest" satisfies WebRole);
  token.webRole = webRole;
  token.isInGuild = webRole !== "guest";
  if (member.nick) token.name = member.nick;
  token.rolesCheckedAt = Date.now();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      const now = Date.now();

      // Discord OAuth login — vždy načíst role.
      if (account && profile?.id) {
        token.discordId = profile.id as string;
        const member = await fetchGuildMember(profile.id as string);
        if (member === null) {
          token.webRole = "guest" satisfies WebRole;
          token.isInGuild = false;
        } else {
          const webRole = member.isInGuild
            ? mapRoles(member.roleIds)
            : ("guest" satisfies WebRole);
          token.webRole = webRole;
          token.isInGuild = webRole !== "guest";
          if (member.nick) token.name = member.nick;
        }
        token.rolesCheckedAt = now;
        return token;
      }

      // Periodický refresh (TTL) — badge + kick bez nutnosti re-loginu.
      const checkedAt = Number(token.rolesCheckedAt ?? 0);
      if (
        token.discordId &&
        (!checkedAt || now - checkedAt >= ROLE_REFRESH_MS)
      ) {
        await refreshGuildRoles(token, token.discordId as string);
      }

      return token;
    },
    async session({ session, token }) {
      session.user.discordId = (token.discordId as string) ?? "";
      session.user.webRole = (token.webRole as WebRole) ?? "guest";
      session.user.isInGuild = Boolean(token.isInGuild);
      // Override: Discord ID uvedená ve WEB_ADMINS mají na webu vždy max práva
      // (např. správce webu, který na Discordu nemá vedoucí roli).
      // Čte se při každém requestu -> změna v env platí hned, bez re-loginu.
      const admins = (process.env.WEB_ADMINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (session.user.discordId && admins.includes(session.user.discordId)) {
        session.user.webRole = "admin";
      }
      return session;
    },
  },
});
