import { Injectable, signal } from '@angular/core';

const PKG = 'it.promemo.app';
const K_OPENS   = 'scadenzait_open_count';
const K_RATED   = 'scadenzait_rated';        // '1' = già votato / non chiedere più
const K_LAST    = 'scadenzait_review_last';  // timestamp ultima proposta

const MIN_OPENS = 3;            // mostra dopo almeno 3 aperture
const REASK_DAYS = 3;           // se "più tardi", riproponi dopo 3 giorni

/**
 * Prompt di recensione in-app (UI nostra) con logica persistente:
 * - appare dopo qualche apertura
 * - se l'utente rimanda, si ripropone dopo qualche giorno
 * - si ferma solo quando vota o sceglie "non chiedere più"
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  readonly visible = signal(false);

  /** Da chiamare a ogni avvio (solo per utenti reali/onboardati). */
  registerOpen(eligible: boolean): void {
    if (this.read(K_RATED) === '1') return;

    const opens = (parseInt(this.read(K_OPENS) ?? '0', 10) || 0) + 1;
    this.write(K_OPENS, String(opens));
    if (!eligible || opens < MIN_OPENS) return;

    const last = parseInt(this.read(K_LAST) ?? '0', 10) || 0;
    if (last && (Date.now() - last) / 86400000 < REASK_DAYS) return;

    // Mostra dopo un breve ritardo (lascia caricare la schermata)
    setTimeout(() => this.visible.set(true), 1800);
  }

  /** L'utente vota → apre lo store e non chiediamo più. */
  rate(): void {
    this.write(K_RATED, '1');
    this.visible.set(false);
    const web = `https://play.google.com/store/apps/details?id=${PKG}`;
    try {
      window.open(`market://details?id=${PKG}`, '_system');
    } catch {
      /* ignore */
    }
    window.open(web, '_blank');
  }

  /** "Più tardi" → riproponiamo tra qualche giorno. */
  later(): void {
    this.write(K_LAST, String(Date.now()));
    this.visible.set(false);
  }

  /** "Non chiedere più". */
  never(): void {
    this.write(K_RATED, '1');
    this.visible.set(false);
  }

  private read(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  }
  private write(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch { /* ignore */ }
  }
}
