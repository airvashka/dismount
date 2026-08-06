import { signIn, signOut } from "@/auth";
import { isDiscordConfigured } from "@/lib/discord";
import { getSessionUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/roles";
import { DevRoleSwitcher } from "@/components/dev-role-switcher";

export async function AuthControls() {
  const user = await getSessionUser();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">
          {user.name}
          {!user.isDev && (
            <span className="ml-2 rounded bg-surface border border-border px-2 py-0.5 text-xs text-accent">
              {ROLE_LABELS[user.webRole]}
            </span>
          )}
          {user.isDev && (
            <span className="ml-2 inline-flex items-center gap-1.5">
              <span className="rounded border border-red-500/50 px-2 py-0.5 text-xs text-red-400">
                test
              </span>
              <DevRoleSwitcher current={user.webRole} />
            </span>
          )}
        </span>
        {!user.isDev && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-muted hover:text-foreground cursor-pointer"
            >
              Odhlásit
            </button>
          </form>
        )}
      </div>
    );
  }

  if (!isDiscordConfigured()) {
    return (
      <span className="text-xs text-muted" title="Čeká se na založení Discord aplikace">
        Login přes Discord — již brzy
      </span>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("discord");
      }}
    >
      <button
        type="submit"
        className="rounded bg-discord px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 cursor-pointer"
      >
        Přihlásit přes Discord
      </button>
    </form>
  );
}
