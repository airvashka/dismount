import type { WebRole } from "@/lib/roles";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      discordId: string;
      webRole: WebRole;
      isInGuild: boolean;
    } & DefaultSession["user"];
  }
}
