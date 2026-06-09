import { DeadlineCategory } from '../models';

export interface Portale {
  label: string;
  url: string;
}

/**
 * Link ai portali ufficiali per pagare/gestire una scadenza.
 * Mappa specifica per catalogId, con fallback per categoria.
 */
const BY_ID: Record<string, Portale> = {
  // ── Fisco ──
  dichiarazione_730:        { label: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  dichiarazione_redditi_pf: { label: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  isee:                     { label: 'Portale INPS — ISEE',   url: 'https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.isee-precompilato.html' },
  imu_prima_rata:           { label: 'Calcolo e pagamento IMU', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/aree-tematiche/casa/imu' },
  imu_seconda_rata:         { label: 'Calcolo e pagamento IMU', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/aree-tematiche/casa/imu' },
  acconto_irpef:            { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  saldo_irpef:              { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  f24_iva_trimestrale_q1:   { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  f24_iva_trimestrale_q2:   { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  f24_iva_trimestrale_q3:   { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  f24_iva_trimestrale_q4:   { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  acconto_iva:              { label: 'F24 — Agenzia Entrate',  url: 'https://www.agenziaentrate.gov.it/portale/web/guest/area-riservata' },
  inps_contributi_autonomo_q1: { label: 'Portale INPS', url: 'https://www.inps.it/' },
  inps_contributi_autonomo_q2: { label: 'Portale INPS', url: 'https://www.inps.it/' },
  inps_contributi_autonomo_q3: { label: 'Portale INPS', url: 'https://www.inps.it/' },
  inps_contributi_autonomo_q4: { label: 'Portale INPS', url: 'https://www.inps.it/' },
  canone_rai:               { label: 'Canone RAI — Agenzia Entrate', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/aree-tematiche/canone-tv' },

  // ── Lavoro ──
  cu_certificazione_unica:  { label: 'Portale INPS',  url: 'https://www.inps.it/' },
  inail:                    { label: 'Portale INAIL', url: 'https://www.inail.it/' },
  verifica_estratto_inps:   { label: 'MyINPS',        url: 'https://www.inps.it/' },

  // ── Famiglia ──
  assegno_unico_rinnovo:    { label: 'Assegno Unico — INPS', url: 'https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico.html' },
  bonus_asilo_nido:         { label: 'Bonus Nido — INPS',    url: 'https://www.inps.it/' },
  iscrizioni_scolastiche:   { label: 'Iscrizioni online — MIM', url: 'https://www.istruzione.it/iscrizionionline/' },

  // ── Documenti ──
  carta_identita:           { label: 'Carta d\'Identità Elettronica', url: 'https://www.cartaidentita.interno.gov.it/' },
  passaporto:               { label: 'Passaporto — Polizia di Stato', url: 'https://www.passaportonline.poliziadistato.it/' },
  permesso_soggiorno:       { label: 'Portale Immigrazione',  url: 'https://www.portaleimmigrazione.it/' },
  tessera_sanitaria:        { label: 'Tessera Sanitaria — Agenzia Entrate', url: 'https://www.agenziaentrate.gov.it/portale/web/guest/aree-tematiche/tessera-sanitaria' },

  // ── Veicoli ──
  bollo_auto:               { label: 'Bollo auto — ACI', url: 'https://www.aci.it/i-servizi/servizi-online/pagamento-bollo-auto.html' },
  revisione_auto:           { label: 'Prenota revisione — Portale dell\'Automobilista', url: 'https://www.ilportaledellautomobilista.it/' },
};

const BY_CATEGORY: Partial<Record<DeadlineCategory, Portale>> = {
  fisco:  { label: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/' },
  lavoro: { label: 'Portale INPS',          url: 'https://www.inps.it/' },
  veicoli:{ label: 'Portale dell\'Automobilista', url: 'https://www.ilportaledellautomobilista.it/' },
};

/** Restituisce il portale più pertinente per una scadenza, o null. */
export function portaleFor(catalogId?: string, category?: DeadlineCategory): Portale | null {
  if (catalogId && BY_ID[catalogId]) return BY_ID[catalogId];
  if (category && BY_CATEGORY[category]) return BY_CATEGORY[category]!;
  return null;
}
