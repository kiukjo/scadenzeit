import {
  Component, inject, signal, viewChildren, ElementRef,
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

          <p class="legal">
            Continuando accetti i <span class="grad">Termini</span>
            e la <span class="grad">Privacy</span>.
          </p>
        </div>
      }

      <!-- ── Step OTP ──────────────────────────────────────────── -->
      @if (step() === 'otp') {
        <div class="form slide-up">
          <!-- 6-box grid -->
          @if (!showLong()) {
            <div class="otp-grid">
              @for (box of otpBoxes; track $index; let i = $index) {
                <input
                  #otpEl
                  class="otp-box"
                  inputmode="numeric"
                  maxlength="1"
                  [value]="otp()[i]"
                  (input)="onOtpInput(i, $event)"
                  (keydown)="onOtpKey(i, $event)"
                  (focus)="otpFocus.set(i)"
                />
              }
            </div>
          } @else {
            <!-- Fallback text input for 8-digit codes -->
            <div class="floating" [class.focused]="focused()">
              <label>Codice (8 cifre)</label>
              <input
                type="text"
                inputmode="numeric"
                maxlength="8"
                [value]="longCode()"
                (input)="longCode.set($any($event.target).value)"
                (focus)="focused.set(true)"
                (blur)="focused.set(false)"
                style="letter-spacing:.15em;font-family:var(--font-mono);font-size:18px;font-weight:700"
              />
            </div>
          }

          <p class="resend">
            Non hai ricevuto il codice?
            <span class="grad" style="cursor:pointer" (click)="resendOtp()">
              Invia di nuovo
            </span>
          </p>

          @if (!showLong()) {
            <p class="legal" style="text-align:center">
              Codice a 8 cifre?
              <span class="grad" style="cursor:pointer" (click)="showLong.set(true)">
                Inseriscilo qui
              </span>
            </p>
          }

          <button class="primary-btn shimmer"
            [disabled]="!canSubmitOtp()"
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
          <div style="
            padding:16px;border-radius:14px;
            background:rgba(255,71,87,0.08);
            border:1px solid rgba(255,71,87,0.25);
            text-align:center;
          ">
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
      display: block;
      min-height: 100dvh;
      background: var(--bg-primary);
      position: relative;
      overflow-y: auto;
    }
    .screen {
      min-height: 100dvh;
      padding: 40px 28px 32px;
      display: flex;
      flex-direction: column;
      animation: scadit-fadeIn 280ms ease both;
    }
    .slide-up { animation: scadit-slideUp 380ms cubic-bezier(0.2,0.8,0.2,1) both; }

    /* Logo */
    .logo-wrap {
      text-align: center;
      margin-top: 50px;
      margin-bottom: 44px;
      animation: scadit-slideUp 500ms cubic-bezier(0.2,0.8,0.2,1) both;
    }
    .logo-tile {
      width: 96px; height: 96px;
      margin: 0 auto 18px;
      border-radius: 28px;
      background: var(--accent-grad);
      display: flex; align-items: center; justify-content: center;
      box-shadow:
        0 0 60px rgba(108,99,255,0.55),
        0 0 24px rgba(59,130,246,0.45),
        inset 0 1px 0 rgba(255,255,255,0.30);
    }
    .brand {
      font-size: 28px; font-weight: 800; letter-spacing: -0.7px;
    }
    .grad {
      background: var(--accent-grad);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-weight: 600;
    }
    .tagline {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin-top: 6px;
    }

    /* Form */
    .form { display: flex; flex-direction: column; gap: 18px; }

    /* Floating label */
    .floating {
      position: relative;
      padding: 18px 16px 14px;
      border-radius: 16px;
      border: 1px solid var(--glass-border);
      background: var(--glass);
      backdrop-filter: blur(20px) saturate(140%);
      transition: all 200ms ease;
    }
    .floating.focused {
      border-color: rgba(108,99,255,0.65);
      box-shadow: 0 0 0 4px rgba(108,99,255,0.15);
    }
    .floating label {
      position: absolute;
      left: 16px; top: 18px;
      font-size: 14px; font-weight: 400;
      color: var(--text-tertiary);
      pointer-events: none;
      transition: all 180ms ease;
    }
    .floating.focused label,
    .floating.filled label {
      top: 8px;
      font-size: 10.5px; font-weight: 600;
      letter-spacing: 0.8px; text-transform: uppercase;
      color: var(--accent);
    }
    .floating input {
      width: 100%; background: transparent;
      border: none; outline: none;
      color: var(--text-primary);
      font-size: 15px; font-family: inherit;
      margin-top: 6px;
      caret-color: var(--accent);
    }

    /* OTP 6-box grid */
    .otp-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
    }
    .otp-box {
      height: 56px;
      text-align: center;
      font-size: 24px; font-weight: 700;
      background: var(--glass);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
      color: var(--text-primary);
      outline: none;
      font-family: var(--font-mono);
      transition: all 180ms ease;
      caret-color: var(--accent);
    }
    .otp-box:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(108,99,255,0.20);
    }

    /* Buttons */
    .primary-btn {
      border: none;
      padding: 15px;
      border-radius: 16px;
      background: var(--accent-grad);
      color: white;
      font-size: 15px; font-weight: 600;
      letter-spacing: 0.2px;
      cursor: pointer;
      box-shadow: 0 12px 28px rgba(108,99,255,0.40);
      transition: opacity 200ms ease;
      font-family: inherit;
      position: relative; overflow: hidden;
    }
    .primary-btn:disabled { cursor: not-allowed; opacity: 0.55; }
    .shimmer::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
      background-size: 200% 100%;
      animation: scadit-shimmer 2.8s ease-in-out infinite;
      pointer-events: none;
    }
    .link-btn {
      background: transparent; border: none; cursor: pointer;
      color: var(--text-tertiary); font-size: 12.5px;
      align-self: center; padding: 8px;
      display: inline-flex; align-items: center; gap: 4px;
      font-family: inherit;
    }
    .legal {
      text-align: center;
      font-size: 12.5px; color: var(--text-tertiary);
      line-height: 1.6; margin: 4px 0 0;
    }
    .resend {
      text-align: center;
      font-size: 13px; color: var(--text-secondary); margin: 0;
    }
    .spinner {
      display: inline-block;
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid rgba(108,99,255,0.20);
      border-top-color: var(--accent);
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
  readonly otpFocus     = signal(0);
  readonly otp          = signal<string[]>(['','','','','','']);
  readonly showLong     = signal(false);
  readonly longCode     = signal('');
  readonly errorMessage = signal('');

  // querySelectorAll on #otpEl refs
  readonly otpEls = viewChildren<ElementRef<HTMLInputElement>>('otpEl');

  readonly otpBoxes = [0,1,2,3,4,5]; // drives @for loop

  isValidEmail(): boolean {
    return /\S+@\S+\.\S+/.test(this.email());
  }

  canSubmitOtp(): boolean {
    if (this.showLong()) return this.longCode().length >= 6;
    return this.otp().every(d => d !== '');
  }

  async goOtp(): Promise<void> {
    if (!this.isValidEmail()) return;
    this.step.set('loading');
    try {
      await this.authService.sendOtp(this.email());
      this.otp.set(['','','','','','']);
      this.showLong.set(false);
      this.longCode.set('');
      this.step.set('otp');
      // Focus first box after render
      setTimeout(() => this.otpEls()[0]?.nativeElement.focus(), 220);
    } catch (err) {
      this.errorMessage.set(`Errore: ${(err as Error).message}`);
      this.lastStep.set('email');
      this.step.set('error');
    }
  }

  onOtpInput(i: number, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 1);
    const arr = [...this.otp()];
    arr[i] = v;
    this.otp.set(arr);
    if (v && i < 5) {
      const next = this.otpEls()[i + 1]?.nativeElement;
      next?.focus();
      this.otpFocus.set(i + 1);
    }
  }

  onOtpKey(i: number, ev: KeyboardEvent): void {
    if (ev.key === 'Backspace' && !this.otp()[i] && i > 0) {
      const prev = this.otpEls()[i - 1]?.nativeElement;
      prev?.focus();
      this.otpFocus.set(i - 1);
    }
  }

  async verifyCode(): Promise<void> {
    const code = this.showLong()
      ? this.longCode()
      : this.otp().join('');
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
      this.otp.set(['','','','','','']);
      this.longCode.set('');
    } catch { /* ignore */ }
  }
}
