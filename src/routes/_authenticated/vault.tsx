import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { CodeCard, type TotpAccount } from "@/components/CodeCard";
import { isValidSecret, normalizeSecret, parseOtpAuthUri } from "@/lib/totp";
import { ThemeToggle } from "@/components/ThemeToggle";
import keyLogo from "@/assets/simpliauth-key.png";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Your codes — SimpliAuth Authenticator" },
      {
        name: "description",
        content: "Live 6-digit two-factor codes for every secret key you've saved to SimpliAuth.",
      },
      { property: "og:title", content: "Your codes — SimpliAuth Authenticator" },
      {
        property: "og:description",
        content: "Live 6-digit two-factor codes for every secret key you've saved to SimpliAuth.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    void load();
    supabase
      .from("profiles")
      .select("username")
      .maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("totp_accounts")
      .select("id, issuer, label, secret, digits, period, algorithm")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Couldn't load your accounts");
      return;
    }
    setAccounts((data ?? []) as TotpAccount[]);
  }

  async function handleDelete(id: string) {
    const previous = accounts;
    setAccounts((list) => list.filter((a) => a.id !== id));
    const { error } = await supabase.from("totp_accounts").delete().eq("id", id);
    if (error) {
      setAccounts(previous);
      toast.error("Couldn't delete that account");
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
      <header className="mb-8 animate-fade-in flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <img src={keyLogo} alt="SimpliAuth key logo" width={28} height={28} className="size-7" />
            <h1 className="text-sm font-medium tracking-tight">SimpliAuth</h1>
          </div>
          {username ? (
            <p className="mt-2 text-xs text-muted-foreground">Signed in as {username}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign out
        </button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your codes…</p>
      ) : accounts.length === 0 ? (
        <div className="animate-fade-in rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">No accounts yet</p>
          <p className="mx-auto mt-2 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
            Add the secret key a site gave you when you turned on two-factor authentication.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {accounts.map((account) => (
            <CodeCard key={account.id} account={account} tick={tick} onDelete={handleDelete} />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="hover-scale mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" /> Add account
      </button>

      {adding ? (
        <AddAccountDialog
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function AddAccountDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [issuer, setIssuer] = useState("");
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  function handleSecretChange(value: string) {
    const parsed = parseOtpAuthUri(value);
    if (parsed) {
      setIssuer(parsed.issuer);
      setLabel(parsed.label);
      setSecret(parsed.secret);
      return;
    }
    setSecret(value);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseOtpAuthUri(secret);
    const finalSecret = parsed ? parsed.secret : normalizeSecret(secret);
    if (!isValidSecret(finalSecret)) {
      toast.error("That secret key doesn't look valid (Base32 letters A–Z and digits 2–7)");
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setBusy(false);
      toast.error("Your session expired, please sign in again");
      return;
    }
    const { error } = await supabase.from("totp_accounts").insert({
      user_id: userId,
      issuer: (parsed?.issuer ?? issuer).trim(),
      label: (parsed?.label ?? label).trim(),
      secret: finalSecret,
      digits: parsed?.digits ?? 6,
      period: parsed?.period ?? 30,
      algorithm: parsed?.algorithm ?? "SHA1",
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't save that account");
      return;
    }
    toast.success("Account added");
    onAdded();
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="animate-slide-up w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5 sm:animate-scale-in"
      >
        <div>
          <h2 className="text-sm font-medium">Add account</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste a secret key or a full otpauth:// link.
          </p>
        </div>

        <Field label="Secret key">
          <textarea
            value={secret}
            onChange={(e) => handleSecretChange(e.target.value)}
            rows={2}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="JBSWY3DPEHPK3PXP"
            className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm outline-none transition-colors focus:border-accent"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Service">
            <input
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="GitHub"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </Field>
          <Field label="Account">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </Field>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm transition-colors hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
