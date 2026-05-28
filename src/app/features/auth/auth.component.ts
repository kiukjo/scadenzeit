import {
  Component, inject, signal, ElementRef, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseAuthService } from '../../core/services/supabase-auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { IconComponent, BrandLogoComponent } from '../../shared/components/icon.component';

type Step = 'email' | 'otp' | 'loading' | 'error';

@Component({
  selector: 'app-auth',
  imports: [IconComponent, BrandLogoComponent],
  template: `
    <div class="screen">
      <!-- Brand -->
      <div class="logo-wrap">
        <div class="logo-tile"><app-brand-logo [size]="56" /></div>
        <div class="brand">Scadenza<span class="grad">IT</span></div>
        <div class="tagline">
          @if (step() === 'email') { Mai più scadenze dimenticate. }
          @else { Codice inviato a {{ email() || 'la tua email' }} }
        </div>
      </div>

      <!-- ── Step email ────────────────────────────────────────── -->
      @if (step() === 'email') {
        <div class="form slide-up">
          <div class="floating" [class.focused]="focused()" [class.filled]="!!email()">
            <label>Email</label>
            <input
              type="email"
              autocomplete="email"
              inputmode="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              (focus)="focused.set(true)"
              (blur)="focused.set(false)"
              (keydown.enter)="goOtp()"
            />
          </div>

          <button class="primary-btn shimmer"
            [disabled]="!isValidEmail()"
            (click)="goOtp()">
            Invia codice di accesso
          </button>

          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">oppure</span>
            <span class="divider-line"></span>
          </div>

          <button class="google-btn" (click)="signInGoogle()">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continua con Google
          </button>

          <p class="legal">
            Continuando accetti i <span class="grad">Termini</span>
            e la <span class="grad">Privacy</span>.
          </p>
        </div>
      }

      <!-- ── Step OTP ──────────────────────────────────────────── -->
      @if (step() === 'otp') {
        <div class="form slide-up">

          <!-- Singolo campo grande — funziona con qualsiasi lunghezza (6-10 cifre) -->
          <div class="otp-wrap" [class.otp-active]="otpFocused() || otpValue().length > 0">
            <p class="otp-label">Codice di verifica</p>
            <input
              #otpEl
              class="otp-single"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="10"
              placeholder="• • • • • •"
              [value]="otpValue()"
              (input)="onOtpChange($event)"
              (focus)="otpFocused.set(true)"
              (blur)="otpFocused.set(false)"
              (keydown.enter)="verifyCode()"
            />
            @if (otpValue().length > 0) {
              <span class="otp-count">{{ otpValue().length }} cifre</span>
            }
          </div>

          <p class="resend">
            Non hai ricevuto il codice?
            <span class="grad" style="cursor:pointer" (click)="resendOtp()">
              Invia di nuovo
            </span>
          </p>

          <button class="primary-btn shimmer"
            [disabled]="otpValue().length < 6"
            (click)="verifyCode()">
            Accedi
          </button>

          <button class="link-btn" (click)="step.set('email')">
            <app-icon name="chevronLeft" [size]="14" />
            Cambia email
          </button>
        </div>
      }

      <!-- ── Loading ──────────────────────────────────────────── -->
      @if (step() === 'loading') {
        <div class="form slide-up" style="align-items:center;gap:16px">
          <span class="spinner"></span>
          <p style="color:var(--text-secondary);font-size:13px">Accesso in corso…</p>
        </div>
      }

      <!-- ── Error ────────────────────────────────────────────── -->
      @if (step() === 'error') {
        <div class="form slide-up">
          <div style="padding:16px;border-radius:14px;background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.25);text-align:center;">
            <p style="color:var(--danger);font-size:13px;margin-bottom:12px">
              {{ errorMessage() }}
            </p>
            <button class="primary-btn" style="font-size:13px"
              (click)="step.set(lastStep() === 'otp' ? 'otp' : 'email')">
              Riprova
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block; min-height: 100dvh; background: var(--bg-primary);
      position: relative; overflow-x: hidden; overflow-y: auto;
    }
    .screen {
      min-height: 100dvh; padding: 40px 28px 32px;
      display: flex; flex-direction: column;
      animation: scadit-fadeIn 280ms ease both; width: 100%; box-sizing: border-box;
    }
    .slide-up { animation: scadit-slideUp 380ms cubic-bezier(0.2,0.8,0.2,1) both; }
    .logo-wrap {
      text-align: center; margin-top: 50px; margin-bottom: 44px;
      animation: scadit-slideUp 500ms cubic-bezier(0.2,0.8,0.2,1) both;
    }
    .logo-tile {
      width: 96px; height: 96px; margin: 0 auto 18px; border-radius: 28px;
      background: var(--accent-grad); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 60px rgba(108,99,255,0.55), 0 0 24px rgba(59,130,246,0.45),
        inset 0 1px 0 rgba(255,255,255,0.30);
    }
    .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.7px; }
    .grad {
      background: var(--accent-grad); -webkit-background-clip: text;
      background-clip: text; color: transparent; font-weight: 600;
    }
    .tagline { font-size: 13.5px; color: var(--text-secondary); margin-top: 6px; }
    .form { display: flex; flex-direction: column; gap: 18px; width: 100%; }
    .floating {
      position: relative; padding: 18px 16px 14px; border-radius: 16px;
      border: 1px solid var(--glass-border); background: var(--glass);
      backdrop-filter: blur(20px) saturate(140%); transition: all 200ms ease;
    }
    .floating.focused { border-color: rgba(108,99,255,0.65); box-shadow: 0 0 0 4px rgba(108,99,255,0.15); }
    .floating label {
      position: absolute; left: 16px; top: 18px; font-size: 14px; font-weight: 400;
      color: var(--text-tertiary); pointer-events: none; transition: all 180ms ease;
    }
    .floating.focused label, .floating.filled label {
      top: 8px; font-size: 10.5px; font-weight: 600;
      letter-spacing: 0.8px; text-transform: uppercase; color: var(--accent);
    }
    .floating input {
      width: 100%; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-size: 15px; font-family: inherit;
      margin-top: 6px; caret-color: var(--accent);
    }
    .otp-wrap {
      position: relative; border-radius: 20px; border: 1.5px solid var(--glass-border);
      background: var(--glass); backdrop-filter: blur(20px) saturate(140%);
      padding: 20px 20px 18px; transition: all 200ms ease; text-align: center;
    }
    .otp-wrap.otp-active { border-color: rgba(108,99,255,0.65); box-shadow: 0 0 0 4px rgba(108,99,255,0.15); }
    .otp-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
      color: var(--text-tertiary); margin-bottom: 14px;
    }
    .otp-single {
      width: 100%; min-width: 0; box-sizing: border-box; background: transparent;
      border: none; outline: none; text-align: center;
      font-size: 34px; font-weight: 700; letter-spacing: 0.25em;
      font-family: var(--font-mono); color: var(--text-primary); caret-color: var(--accent);
    }
    .otp-single::placeholder { color: var(--text-tertiary); letter-spacing: 0.15em; font-size: 28px; }
    .otp-count {
      position: absolute; bottom: 8px; right: 14px;
      font-size: 10px; font-weight: 600; color: var(--accent); opacity: 0.7;
    }
    .divider { display: flex; align-items: center; gap: 10px; }
    .divider-line { flex: 1; height: 1px; background: var(--glass-border); }
    .divider-text { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }
    .google-btn {
      border: 1px solid var(--glass-border); background: var(--glass);
      backdrop-filter: blur(20px); padding: 13px 16px; border-radius: 16px;
      color: var(--text-primary); font-size: 14px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-family: inherit; transition: all 180ms ease;
    }
    .google-btn:active { opacity: 0.75; }
    .primary-btn {
      border: none; padding: 15px; border-radius: 16px;
      background: var(--accent-grad); color: white;
      font-size: 15px; font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
      box-shadow: 0 12px 28px rgba(108,99,255,0.40);
      transition: opacity 200ms ease; font-family: inherit;
      position: relative; overflow: hidden;
    }
    .primary-btn:disabled { cursor: not-allowed; opacity: 0.55; }
    .shimmer::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
      background-size: 200% 100%;
      animation: scadit-shimmer 2.8s ease-in-out infinite; pointer-events: none;
    }
    .link-btn {
      background: transparent; border: none; cursor: pointer;
      color: var(--text-tertiary); font-size: 12.5px; align-self: center; padding: 8px;
      display: inline-flex; align-items: center; gap: 4px; font-family: inherit;
    }
    .legal {
      text-align: center; font-size: 12.5px;
      color: var(--text-tertiary); line-height: 1.6; margin: 4px 0 0;
    }
    .resend { text-align: center; font-size: 13px; color: var(--text-secondary); margin: 0; }
    .spinner {
      display: inline-block; width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid rgba(108,99,255,0.20); border-top-color: var(--accent);
      animation: scadit-spin 700ms linear infinite;
    }
  `],
})
export class AuthComponent {
  private readonly authService = inject(SupabaseAuthService);
  private readonly settings    = inject(SettingsService);
  private readonly router      = inject(Router);

  readonly step         = signal<Step>('email');
  readonly lastStep     = signal<Step>('email');
  readonly email        = signal('');
  readonly focused      = signal(false);
  readonly otpValue     = signal('');
  readonly otpFocused   = signal(false);
  readonly errorMessage = signal('');

  readonly otpEl = viewChild<ElementRef<HTMLInputElement>>('otpEl');

  isValidEmail(): boolean {
    return /\S+@\S+\.\S+/.test(this.email());
  }

  async signInGoogle(): Promise<void> {
    this.step.set('loading');
    try {
      await this.authService.signInWithGoogle();
    } catch (err) {
      this.errorMessage.set(`Errore Google: ${(err as Error).message}`);
      this.lastStep.set('email');
      this.step.set('error');
    }
  }

  async goOtp(): Promise<void> {
    if (!this.isValidEmail()) return;
    this.step.set('loading');
    try {
      await this.authService.sendOtp(this.email());
      this.otpValue.set('');
      this.step.set('otp');
      setTimeout(() => this.otpEl()?.nativeElement.focus(), 220);
    } catch (err) {
      this.errorMessage.set(`Errore: ${(err as Error).message}`);
      this.lastStep.set('email');
      this.step.set('error');
    }
  }

  onOtpChange(ev: Event): void {
    // Accetta solo cifre, max 10 caratteri
    const v = (ev.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 10);
    this.otpValue.set(v);
    // Forza il valore nell'input (per rimuovere lettere eventualmente incollate)
    (ev.target as HTMLInputElement).value = v;
  }

  async verifyCode(): Promise<void> {
    const code = this.otpValue().trim();
    if (code.length < 6) return;

    this.step.set('loading');
    try {
      await this.authService.verifyOtp(this.email(), code);
      await this.settings.loadProfile();
      const dest = this.settings.profile() ? '/deadlines' : '/onboarding';
      await this.router.navigate([dest]);
    } catch {
      this.errorMessage.set('Codice non valido o scaduto. Richiedi un nuovo codice.');
      this.lastStep.set('otp');
      this.step.set('error');
    }
  }

  async resendOtp(): Promise<void> {
    try {
      await this.authService.sendOtp(this.email());
      this.otpValue.set('');
      setTimeout(() => this.otpEl()?.nativeElement.focus(), 100);
    } catch { /* ignore */ }
  }
}
