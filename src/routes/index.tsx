import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { isValidUsername, signIn, signUp } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Authly — Free TOTP Authenticator in Your Browser" },
      {
        name: "description",
        content:
          "Store your two-factor secret keys and generate 6-digit TOTP codes from any device. Username and password sign-in, free forever.",
      },
      { property: "og:title", content: "Authly — Free TOTP Authenticator" },
      {
        property: "og:description",
        content:
          "Generate 6-digit two-factor codes from any device. Simple username and password sign-in, free forever.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/vault", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/vault", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidUsername(username)) {
      toast.error("Username must be 3–32 characters (letters, numbers, . _ -)");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } =
      mode === "signin" ? await signIn(username, password) : await signUp(username, password);
    setBusy(false);

    if (error) {
      const message = /already registered|already been registered/i.test(error.message)
        ? "That username is taken"
        : /invalid login/i.test(error.message)
          ? "Wrong username or password"
          : error.message;
      toast.error(message);
      return;
    }
    navigate({ to: "/vault", replace: true });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
              A
            </span>
            <span className="text-sm font-medium tracking-tight">Authly</span>
          </div>
          <h1 className="text-3xl leading-tight font-medium tracking-tight text-balance">
            Your two-factor codes, everywhere.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Add a secret key once and get fresh 6-digit codes on any device. Free to use forever,
            sign in from anywhere.
          </p>
        </div>

        <div className="mb-6 inline-flex rounded-full border border-border p-0.5 text-xs">
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted-foreground">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="yourname"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          No email, no verification codes. Codes are generated locally in your browser using the
          TOTP standard (RFC 6238).
        </p>
      </div>
    </main>
  );
}
