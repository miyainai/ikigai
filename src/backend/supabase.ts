import { createClient } from "@supabase/supabase-js";

// Publishable client key, not a service-role credential. Ownership is enforced in Postgres.
export const supabase = createClient(
  "https://psaddlwwgwqpeuyyqzjt.supabase.co",
  "sb_publishable_BZexUL8uACRt8Rg23Pdrww_c6lSzKjF",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) } },
);
