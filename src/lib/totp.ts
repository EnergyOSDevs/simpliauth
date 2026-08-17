// RFC 4648 Base32 + RFC 6238 TOTP, computed entirely in the browser.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function normalizeSecret(input: string): string {
  return input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
}

export function isValidSecret(input: string): boolean {
  const s = normalizeSecret(input);
  return s.length >= 8 && /^[A-Z2-7]+$/.test(s);
}

export function base32Decode(input: string): Uint8Array {
  const s = normalizeSecret(input);
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of s) {
    const idx = B32.indexOf(char);
    if (idx === -1) throw new Error("Invalid Base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

export type Algorithm = "SHA1" | "SHA256" | "SHA512";

const HASH_NAME: Record<Algorithm, string> = {
  SHA1: "SHA-1",
  SHA256: "SHA-256",
  SHA512: "SHA-512",
};

export async function generateTotp(options: {
  secret: string;
  digits?: number;
  period?: number;
  algorithm?: Algorithm;
  timestamp?: number;
}): Promise<string> {
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  const algorithm = options.algorithm ?? "SHA1";
  const now = options.timestamp ?? Date.now();
  const counter = Math.floor(now / 1000 / period);

  const counterBytes = new Uint8Array(8);
  let rest = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = rest & 0xff;
    rest = Math.floor(rest / 256);
  }

  const keyData = base32Decode(options.secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData.slice().buffer as ArrayBuffer,
    { name: "HMAC", hash: { name: HASH_NAME[algorithm] } },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counterBytes.buffer as ArrayBuffer),
  );

  const offset = sig[sig.length - 1]! & 0x0f;
  const binary =
    ((sig[offset]! & 0x7f) << 24) |
    ((sig[offset + 1]! & 0xff) << 16) |
    ((sig[offset + 2]! & 0xff) << 8) |
    (sig[offset + 3]! & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

export function secondsRemaining(period: number, timestamp = Date.now()): number {
  return period - (Math.floor(timestamp / 1000) % period);
}

export type ParsedOtpAuth = {
  issuer: string;
  label: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: Algorithm;
};

/** Parses an otpauth://totp/... URI. Returns null when the input isn't one. */
export function parseOtpAuthUri(uri: string): ParsedOtpAuth | null {
  const trimmed = uri.trim();
  if (!/^otpauth:\/\/totp\//i.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const rawLabel = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const [maybeIssuer, maybeName] = rawLabel.includes(":")
    ? [rawLabel.split(":")[0]!, rawLabel.split(":").slice(1).join(":")]
    : ["", rawLabel];

  const secret = url.searchParams.get("secret");
  if (!secret) return null;

  const algo = (url.searchParams.get("algorithm") ?? "SHA1").toUpperCase();

  return {
    issuer: (url.searchParams.get("issuer") ?? maybeIssuer).trim(),
    label: maybeName.trim(),
    secret: normalizeSecret(secret),
    digits: Number(url.searchParams.get("digits") ?? 6) || 6,
    period: Number(url.searchParams.get("period") ?? 30) || 30,
    algorithm: (["SHA1", "SHA256", "SHA512"].includes(algo) ? algo : "SHA1") as Algorithm,
  };
}
