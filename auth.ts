import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { fetchGuildMember } from "@/lib/discord";
import { mapRoles, type WebRole } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Při prvním přihlášení: zjistit role na guild serveru přes bota.
      if (account && profile?.id) {
        token.discordId = profile.id as string;
        const member = await fetchGuildMember(profile.id as string);
        if (member === null) {
          // Bot ještě není nakonfigurován/na serveru -> každý přihlášený je guest.
          token.webRole = "guest" satisfies WebRole;
          token.isInGuild = false;
        } else {
          token.webRole = member.isInGuild ? mapRoles(member.roleIds) : "guest";
          token.isInGuild = member.isInGuild;
          if (member.nick) token.name = member.nick;
        }
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
