import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Config Supabase manquante. Vérifie le fichier .env.local et redémarre npm run dev."
    );
  }

  if (!url.startsWith("https://") || !url.includes("supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL invalide. Doit être https://xxxxx.supabase.co"
    );
  }

  return createBrowserClient(url, key);
}