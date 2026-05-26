import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';

type AuthStep = 'choose' | 'magic-link' | 'magic-link-sent' | 'loading' | 'error';

@Component({
  selector: 'app-auth',
  imports: [],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>ScadenzaIT</h1>
        <p class="auth-subtitle">Le tue scadenze, sempre in ordine.</p>

        @if (step() === 'choose') {
          <div class="auth-options">
            <button class="btn-google" (click)="loginWithGoogle()">
              Accedi con Google
            </button>

            <div class="auth-divider"><span>oppure</span></div>

            <button class="btn-email" (click)="step.set('magic-link')">
              Accedi con email
            </button>
          </div>
        }

        @if (step() === 'magic-link') {
          <form (submit)="$event.preventDefault(); sendMagicLink()">
            <label>
              La tua email
              <input
                type="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
                placeholder="nome@esempio.it"
                required
                autofocus
              />
            </label>

            <button type="submit" [disabled]="!email().includes('@')">
              Invia link di accesso
            </button>
            <button type="button" (click)="step.set('choose')">← Indietro</button>
          </form>
        }

        @if (step() === 'magic-link-sent') {
          <div class="auth-sent">
            <p>✉ Controlla la tua email!</p>
            <p><small>Abbiamo inviato un link a <strong>{{ email() }}</strong>.<br>Clicca il link per accedere.</small></p>
            <button (click)="step.set('choose')">Usa un metodo diverso</button>
          </div>
        }

        @if (step() === 'loading') {
          <p class="auth-loading">Accesso in corso…</p>
        }

        @if (step() === 'error') {
          <div class="auth-error">
            <p>{{ errorMessage() }}</p>
            <button (click)="step.set('choose')">Riprova</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class AuthComponent {
  private readonly authService = inject(SupabaseAuthService);
  private readonly router = inject(Router);

  readonly step = signal<AuthStep>('choose');
  readonly email = signal('');
  readonly errorMessage = signal('');

  async loginWithGoogle(): Promise<void> {
    try {
      this.step.set('loading');
      await this.authService.signInWithGoogle();
      // Il browser viene rediretto su Google — non serve altro qui
    } catch (err) {
      this.errorMessage.set(`Errore: ${(err as Error).message}`);
      this.step.set('error');
    }
  }

  async sendMagicLink(): Promise<void> {
    if (!this.email().includes('@')) return;
    try {
      this.step.set('loading');
      await this.authService.signInWithMagicLink(this.email());
      this.step.set('magic-link-sent');
    } catch (err) {
      this.errorMessage.set(`Errore: ${(err as Error).message}`);
      this.step.set('error');
    }
  }
}
