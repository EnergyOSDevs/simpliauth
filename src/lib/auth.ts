import { supabase } from "@/integrations/supabase/client";

/** Usernames are the only credential the user types; auth needs an email, so
 * we derive a deterministic internal address from the normalized username. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(normalizeUsername(username));
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@users.authly.app`;
}

export async function signIn(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
}

export async function signUp(username: string, password: string) {
  return supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { username: normalizeUsername(username) },
    },
  });
}
