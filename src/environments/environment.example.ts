/**
 * Template configurazione Supabase.
 * Copia questo file in environment.ts e compila i valori reali:
 *
 *   cp src/environments/environment.example.ts src/environments/environment.ts
 *
 * Dove trovare i valori:
 *   supabaseUrl     → Supabase Dashboard → Project Settings → General → Project URL
 *   supabaseAnonKey → Supabase Dashboard → Project Settings → API → Publishable key
 *
 * Il file environment.ts è in .gitignore — non verrà mai committato.
 */
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'sb_publishable_YOUR_KEY_HERE',
};
