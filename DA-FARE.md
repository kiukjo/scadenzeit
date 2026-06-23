# Promemo — Cosa manca per la pubblicazione

Aggiornato: 22 giugno 2026 · Stato: app funzionalmente completa, in preparazione al rilascio.

## 🔴 Bloccanti per pubblicare (test interni Play)
- [ ] **Icona + splash** brandizzate Promemo → serve il logo PNG (≥512, meglio 1024).
      Da lì: generare icona adattiva (foreground/background) + splash in tutte le densità.
- [ ] **Keystore di firma** → creare il keystore (.jks) e configurare `android/app/build.gradle`
      (signingConfigs + buildTypes.release). ⚠️ Conservare keystore + password al sicuro:
      senza, non si potrà più aggiornare l'app.
- [ ] **Generare l'AAB firmato**: `./gradlew bundleRelease` → file `.aab` da caricare in Play Console.
- [ ] **Privacy policy online**: attivare GitHub Pages (Settings → Pages → branch `main`, /docs)
      → URL: https://kiukjo.github.io/scadenzeit/privacy.html (già pronta in docs/privacy.html).
- [ ] **Play Console**: creare l'app, compilare scheda (vedi STORE.md), Data safety, IARC,
      caricare AAB nei test interni.

## 🟠 Importante (verifiche su dispositivo reale)
- [ ] Notifiche: arrivo all'orario impostato + canale Android.
- [ ] Widget home screen: mostra la prossima scadenza, tap apre l'app.
- [ ] Condivisione backup/.ics (foglio di condivisione Android).
- [ ] AdMob interstitial: comparsa annuncio (può servire dopo ~1h dalla creazione unità).
      ⚠️ NON cliccare i propri annunci reali (rischio ban). Aggiungere il telefono come
      dispositivo di test in AdMob.

## 🟡 Migliorie UX/funzioni (post-lancio, su branch dev)
- [ ] Banner AdMob fisso in basso (in aggiunta all'interstitial) — se desiderato.
- [ ] Selettore Comune anche nel profilo (contesto TARI/IMU).
- [ ] Pull-to-refresh e skeleton loader.
- [ ] Vista dettaglio scadenza dedicata (oggi il tap apre la modifica).
- [ ] Badge sull'icona app col numero di scadenze urgenti.
- [ ] Condividi singola scadenza.
- [ ] Onboarding: anteprima del numero di scadenze importate.

## ⚙️ Note tecniche
- Package definitivo: `it.promemo.app` (permanente).
- AdMob App ID e unità interstitial: reali, `isTesting:false`.
- Dati documenti: solo locali (mai sul server) — scelta di privacy.
- Catalogo scadenze (date fisse nazionali) in `src/app/catalog/scadenze-it.json`,
  aggiornabile annualmente.
- TARI: data indicativa (varia per Comune, nessuna API nazionale) con avviso in-app.

## 🌿 Branch
- `main`: versione pulita/online (allineata).
- `dev`: sviluppo, bugfix e migliorie.
