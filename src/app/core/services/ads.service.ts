import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdOptions,
} from '@capacitor-community/admob';

/**
 * Pubblicità AdMob (banner in fondo). App gratuita finanziata da ads.
 *
 * ⚠️ Gli ID qui sotto sono gli ID DI TEST ufficiali di Google.
 * Prima della pubblicazione vanno sostituiti con quelli reali del tuo
 * account AdMob (App ID nel AndroidManifest + adId qui sotto), e isTesting:false.
 */
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private bannerShown = false;
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

  async showBanner(): Promise<void> {
    if (!this.isNative || this.bannerShown) return;
    await this.init();
    const options: BannerAdOptions = {
      adId: TEST_BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 56, // sopra la barra di navigazione
      isTesting: true,
    };
    try {
      await AdMob.showBanner(options);
      this.bannerShown = true;
    } catch {
      /* ignora errori banner */
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.isNative || !this.bannerShown) return;
    try {
      await AdMob.hideBanner();
      this.bannerShown = false;
    } catch {
      /* ignora */
    }
  }
}
