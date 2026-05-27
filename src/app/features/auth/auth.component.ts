import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';
import { SettingsService } from '../../core/services/settings.service';

type AuthStep = 'choose' | 'email' | 'otp' | 'loading' | 'error';

@Component({
  selector: 'app-auth',
  imports: [],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>ScadenzaIT</h1>
        <p class="auth-subtitle">Le tue scadenze, sempre in ordine.</p>

        @if (step() === 'choose') {
          <div class="auth-options" style="animation: fadeSlideUp 0.3s var(--ease-out) both">
            <button class="btn-email" (click)="step.set('email')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Accedi con email
            </button>
          </div>
        }

        @if (step() === 'email') {
          <form class="auth-form" (submit)="$event.preventDefault(); sendOtp()">
            <p class="auth-hint">Inserisci la tua email — ti mandiamo un codice di accesso.</p>
            <div class="form-group">
              <label>Email</label>
              <input
                class="auth-input"
                type="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
                placeholder="nome@esempio.it"
                required
                autofocus
                style="text-align:left;font-size:1rem;letter-spacing:normal"
              />
            </div>
            <button
              type="submit"
              class="auth-submit"
              [disabled]="!email().includes('@')"
            >
              Invia codice
            </button>
            <button type="button" class="auth-back" (click)="step.set('choose')">
              ← Indietro
            </button>
          </form>
        }

        @if (step() === 'otp') {
          <form class="auth-form" (submit)="$event.preventDefault(); verifyCode()">
            <p class="auth-hint">
              Codice inviato a <strong>{{ email() }}</strong>.<br>
              Controlla la casella email e inserisci il codice.
            </p>
            <div class="form-group">
              <label>Codice di accesso</label>
              <input
                class="otp-input"
                type="text"
                inputmode="numeric"
                maxlength="8"
                pattern="[0-9]{6,8}"
                [value]="otpCode()"
                (input)="otpCode.set($any($event.target).value)"
                placeholder="123456"
                autofocus
              />
            </div>
            <button
              type="submit"
              class="auth-submit"
              [disabled]="otpCode().length < 6 || otpCode().length > 8"
            >
              Accedi
            </button>
            <button type="button" class="auth-back" (click)="resendOtp()">
              Rimanda il codice
            </button>
            <button type="button" class="auth-back" (click)="step.set('email')">
              ← Cambia email
            </button>
          </form>
        }

        @if (step() === 'loading') {
          <p class="auth-loading">Accesso in corso…</p>
        }

        @if (step() === 'error') {
          <div class="auth-error">
            <p>{{ errorMessage() }}</p>
            <button class="auth-back" (click)="step.set('choose')">Riprova</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class AuthComponent {
  private readonly authService = inject(SupabaseAuthService);
  private readonly settings = inject(SettingsService);
  private readonly router = inject(Router);

  readonly step = signal<AuthStep>('choose');
  readonly email = signal('');
  readonly otpCode = signal('');
  readonly errorMessage = signal('');

  async sendOtp(): Promise<void> {
    if (!this.email().includes('@')) return;
    try {
      this.step.set('loading');
      await this.authService.sendOtp(this.email());
      this.otpCode.set('');
      this.step.set('otp');
    } catch (err) {
      this.errorMessage.set(`Errore: ${(err as Error).message}`);
      this.step.set('error');
    }
  }

  async verifyCode(): Promise<void> {
    if (this.otpCode().length < 6) return;
    try {
      this.step.set('loading');
      await this.authService.verifyOtp(this.email(), this.otpCode());
      await this.settings.loadProfile();
      const dest = this.settings.profile() ? '/deadlines' : '/onboarding';
      await this.router.navigate([dest]);
    } catch (err) {
      this.errorMessage.set('Codice non valido o scaduto. Richiedi un nuovo codice.');
      this.step.set('otp');
    }
  }

  async resendOtp(): Promise<void> {
    try {
      await this.authService.sendOtp(this.email());
      this.otpCode.set('');
    } catch {
      // ignora — l'utente è già nella schermata otp
    }
  }
}
