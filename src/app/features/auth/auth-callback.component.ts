import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';
import { SettingsService } from '../../core/services/settings.service';

/**
 * Gestisce il redirect post-OAuth e post-magic-link.
 * Supabase popola la sessione dalla URL automaticamente via onAuthStateChange.
 * Questo componente aspetta la sessione e poi decide dove andare:
 *   - Profilo già impostato → /deadlines
 *   - Primo accesso → /onboarding
 */
@Component({
  selector: 'app-auth-callback',
  imports: [],
  template: `<p style="text-align:center;padding:2rem">Accesso in corso…</p>`,
})
export class AuthCallbackComponent implements OnInit {
  private readonly authService = inject(SupabaseAuthService);
  private readonly settings    = inject(SettingsService);
  private readonly router      = inject(Router);

  async ngOnInit(): Promise<void> {
    // Attende che Supabase processi il token nella URL (max 3 secondi)
    await this.waitForSession(3000);

    if (!this.authService.isLoggedIn()) {
      await this.router.navigate(['/auth']);
      return;
    }

    await this.settings.loadProfile();
    const dest = this.settings.profile() ? '/deadlines' : '/onboarding';
    await this.router.navigate([dest]);
  }

  private waitForSession(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.authService.isLoggedIn()) {
        resolve();
        return;
      }
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (this.authService.isLoggedIn() || Date.now() >= deadline) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 100);
    });
  }
}
