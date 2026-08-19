import { useEffect, useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { generateTotp, secondsRemaining, type Algorithm } from "@/lib/totp";

export type TotpAccount = {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
};

export function CodeCard({
  account,
  tick,
  onDelete,
}: {
  account: TotpAccount;
  tick: number;
  onDelete: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    generateTotp({
      secret: account.secret,
      digits: account.digits,
      period: account.period,
      algorithm: (account.algorithm as Algorithm) ?? "SHA1",
    })
      .then((value) => {
        if (!active) return;
        setCode(value);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [account.secret, account.digits, account.period, account.algorithm, tick]);

  const remaining = secondsRemaining(account.period, tick);
  const progress = remaining / account.period;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <li className="group relative animate-fade-in overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm">
      <span className="absolute inset-x-0 top-0 h-1 bg-secondary">
        <span
          className={`block h-full origin-left rounded-r-full ${
            remaining <= 5 ? "bg-destructive" : "bg-accent"
          }`}
          style={{
            width: `${progress * 100}%`,
            transition: "width 1s linear, background-color 0.3s ease",
          }}
        />
      </span>
      <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={copy}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
        aria-label={`Copy code for ${account.issuer || account.label}`}
      >
        <span className="w-full truncate text-xs text-muted-foreground">
          {account.issuer || "Account"}
          {account.label ? ` · ${account.label}` : ""}
        </span>
        <span key={code} className="mt-1 animate-fade-in font-mono text-2xl tracking-[0.18em] tabular-nums">
          {error ? "——————" : code ? formatCode(code) : "······"}
        </span>
      </button>

      <div className="flex items-center gap-1">
        <span
          className="relative grid size-9 shrink-0 place-items-center"
          title={`${remaining}s remaining`}
        >
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              strokeWidth="2.5"
              className="stroke-border"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={`transition-colors ${remaining <= 5 ? "stroke-destructive" : "stroke-accent"}`}
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={2 * Math.PI * 15 * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="absolute text-[10px] tabular-nums text-muted-foreground">
            {remaining}
          </span>
        </span>

        <span className="grid size-8 place-items-center text-muted-foreground">
          {copied ? (
            <Check className="size-4 animate-scale-in text-accent" />
          ) : (
            <Copy className="size-4 transition-opacity group-hover:opacity-100" />
          )}
        </span>

        <button
          type="button"
          onClick={() => onDelete(account.id)}
          aria-label="Delete account"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      </div>
    </li>
  );
}

function formatCode(code: string) {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}
