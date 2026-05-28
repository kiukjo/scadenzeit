import { Injectable, inject, signal, computed } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

/**
 * Gestisce autenticazione Supabase: Google OAuth + magic link.
 * La sessione è esposta come Signal — tutti i componenti reagiscono
 * automaticamente ai cambi di stato auth senza subscription manuali.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly sb = inject(SupabaseService).client;

  // ── Stato sessione come Signal ────────────────────────────────────────────
  readonly session = signal<Session | null>(null);
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  constructor() {
    // Ripristina la sessione da localStorage all'avvio
    this.sb.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
    });

    // Ascolta i cambiamenti di stato auth (login, logout, token refresh, OAuth callback)
    this.sb.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
    });
  }

  // ── Metodi auth ───────────────────────────────────────────────────────────

  /**
   * Avvia il flusso Google OAuth (PKCE).
   * Redirige il browser su accounts.google.com → torna su /auth/callback.
   */
  async signInWithGoogle(): Promise<void> {
    const { error } = await this.sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }

  /**
   * Invia un codice OTP a 6 cifre all'email indicata.
   * Funziona su mobile (Capacitor) senza deep link — l'utente
   * inserisce il codice direttamente nell'app.
   */
  async sendOtp(email: string): Promise<void> {
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  /**
   * Verifica il codice OTP a 6 cifre inserito dall'utente.
   * Se corretto, la sessione viene impostata automaticamente via onAuthStateChange.
   */
  async verifyOtp(email: string, token: string): Promise<void> {
    // Prova prima 'email' (utente esistente) poi 'signup' (primo accesso)
    const { error: emailErr } = await this.sb.auth.verifyOtp({ email, token, type: 'email' });
    if (!emailErr) return;

    const { error: signupErr } = await this.sb.auth.verifyOtp({ email, token, type: 'signup' });
    if (signupErr) throw signupErr;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
    this.session.set(null);
  }
}
