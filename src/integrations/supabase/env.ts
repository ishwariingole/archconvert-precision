type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

function readEnv(name: string): string | undefined {
  const fromVite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return fromVite || fromProcess;
}

function requireEnv(primary: string, fallbacks: string[] = []): string {
  const value = [primary, ...fallbacks].map((key) => readEnv(key)).find(Boolean);
  if (!value) {
    const keys = [primary, ...fallbacks].join(", ");
    throw new Error(`Missing required environment variable. Expected one of: ${keys}`);
  }
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = requireEnv("VITE_SUPABASE_URL", ["SUPABASE_URL"]);
  const anonKey = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY", ["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]);
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { url, anonKey, serviceRoleKey };
}
