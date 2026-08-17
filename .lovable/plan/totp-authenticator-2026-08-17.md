# TOTP Authenticator

A minimal web authenticator: sign in with username + password, store your accounts' secret keys, and see live 6-digit codes that refresh every 30 seconds.

## Screens

1. **/ — Landing / Sign in**
  - Minimal centered card: product name, one-line pitch ("Free forever. Sign in from anywhere."), sign-in / sign-up toggle.
  - Username + password only. No email verification code step (accounts auto-confirmed).
  - Signed-in users are redirected to the vault.
2. **/vault — Your codes** (protected)
  - List of saved accounts (issuer + label), each showing the current 6-digit TOTP code, a circular countdown ring for the remaining seconds, and tap-to-copy.
  - "Add account" dialog: issuer, label, secret key (Base32), optional digits/period. Accepts a pasted `otpauth://` URI too.
  - Delete account, sign out.

## Design

Minimalist, system-driven light/dark (`prefers-color-scheme`), no theme toggle. Neutral near-black / near-white surfaces, one restrained accent for the countdown ring and copy feedback, tabular-figure monospace for the codes, generous whitespace, subtle transitions. Mobile-first single column.

## Technical notes

- **Backend:** Supabase for sign in? Not lovable cloud something else
- **Auth:** username-only login, so the app derives a deterministic internal email from the username, with auto-confirm enabled. A `profiles` table stores the normalized username (unique) linked to the auth user, created by a signup trigger. Password reset by email is not available in this model.
- **Data:** `totp_accounts` table (`id`, `user_id`, `issuer`, `label`, `secret`, `digits`, `period`, `created_at`) with RLS so each row is readable/writable only by its owner, plus explicit grants.
- **TOTP:** RFC 6238 implemented client-side with the Web Crypto API (HMAC-SHA1/256, Base32 decode); codes are computed in the browser, secrets never leave it except to be stored in the user's own row. A single ticking timer drives all cards.
- **Routing:** TanStack Start file routes, vault under the authenticated layout; per-route head metadata.

## Security note

Secrets are stored in the database protected by row-level security. Client-side-only encryption with a passphrase can be added later if you want secrets unreadable even at rest — say the word and I'll include it.