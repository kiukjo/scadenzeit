import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';

/**
 * Pubblicità AdMob — annuncio Interstitial (schermo intero, anche video).
 * App gratuita finanziata dagli ads.
 *
 * Mostrato con parsimonia: mai alla prima apertura, e al massimo una volta
 * ogni qualche minuto, su transizioni "naturali" (apertura riepilogo/calendario).
 */
const INTERSTITIAL_ID = 'ca-app-pub-1224566889235881/3988492250';
const MIN_INTERVAL_MS = 3 * 60 * 1000; // almeno 3 minuti tra un annuncio e l'altro
const K_LAST = 'promemo_ad_last';

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private showing = false;
  private readonly isNative = Capacitor.getPlatform() === 'android';

  async init(): Promise<void> {
    if (!this.isNative || this.initialized) return;
    try {
      await AdMob.initialize({});
      this.initialized = true;
    } catch {
      /* AdMob non disponibile — ignora */
    }
  }

  /** Mostra un interstitial se è passato abbastanza tempo dall'ultimo. */
  async maybeShowInterstitial(): Promise<void> {
    if (!this.isNative || this.showing) return;

    const now = Date.now();
    const last = parseInt(localStorage.getItem(K_LAST) ?? '0', 10) || 0;
    if (last && now - last < MIN_INTERVAL_MS) return;

    this.showing = true;
    try {
      await this.init();
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: false });
      await AdMob.showInterstitial();
      localStorage.setItem(K_LAST, String(now));
    } catch {
      /* annuncio non pronto/non disponibile — ignora silenziosamente */
    } finally {
      this.showing = false;
    }
  }
}
