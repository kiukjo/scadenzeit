import { Injectable } from '@angular/core';
import { addYears } from 'date-fns';
import bolloTariffe from '../../catalog/bollo-tariffe.json';
import { Vehicle, Deadline } from '../models';

type BolloTariffe = Record<string, { name: string; base: number }>;

@Injectable({ providedIn: 'root' })
export class VehicleDeadlineCalculatorService {
  private readonly tariffe = bolloTariffe as unknown as BolloTariffe;

  /** Restituisce le regioni disponibili per il select del form veicolo */
  getRegioni(): { code: string; name: string }[] {
    return Object.entries(this.tariffe)
      .filter(([k]) => !k.startsWith('_'))
      .map(([code, v]) => ({ code, name: v.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Calcola tutte le scadenze per un veicolo come bozze pronte per IndexedDB */
  computeAll(vehicle: Vehicle): Omit<Deadline, 'id' | 'uuid' | 'updatedAt'>[] {
    const result: Omit<Deadline, 'id' | 'uuid' | 'updatedAt'>[] = [];

    if (vehicle.immatDate) {
      result.push(this.buildBollo(vehicle));
      result.push(this.buildRevisione(vehicle));
    }
    if (vehicle.assicExpiry) {
      result.push(this.buildAssicurazione(vehicle));
    }

    return result;
  }

  // ── Bollo ─────────────────────────────────────────────────────────────────

  /** Scade nel mese di immatricolazione — se passato, anno prossimo */
  bolloScadenza(vehicle: Vehicle): Date {
    const immat = new Date(vehicle.immatDate!);
    const mese = immat.getMonth();
    const annoCorrente = new Date().getFullYear();
    const candidate = new Date(annoCorrente, mese, 1);
    return candidate < new Date()
      ? new Date(annoCorrente + 1, mese, 1)
      : candidate;
  }

  /** Importo bollo in centesimi: kW × tariffa regionale (arrotondato per eccesso) */
  bolloImportoCents(vehicle: Vehicle): number | undefined {
    if (!vehicle.kw || !vehicle.regioneCode) return undefined;
    const tariffa = this.tariffe[vehicle.regioneCode];
    if (!tariffa) return undefined;
    return Math.ceil(vehicle.kw * tariffa.base) * 100;
  }

  // ── Revisione ─────────────────────────────────────────────────────────────

  /** Prima revisione: 4 anni dall'immatricolazione */
  primaRevisione(vehicle: Vehicle): Date {
    return addYears(new Date(vehicle.immatDate!), 4);
  }

  /** Revisione successiva: 2 anni dall'ultima (o dalla prima se mai revisionato) */
  revisioneScadenza(vehicle: Vehicle): Date {
    const base = vehicle.ultimaRevisione
      ? new Date(vehicle.ultimaRevisione)
      : this.primaRevisione(vehicle);
    return addYears(base, 2);
  }

  // ── Builder privati ───────────────────────────────────────────────────────

  private buildBollo(vehicle: Vehicle): Omit<Deadline, 'id' | 'uuid' | 'updatedAt'> {
    return {
      catalogId: 'bollo_auto',
      customName: `Bollo — ${vehicle.targa}`,
      category: 'veicoli',
      dueDate: this.bolloScadenza(vehicle),
      amountCents: this.bolloImportoCents(vehicle),
      reminders: [30, 15, 7, 1],
      recurrence: 'yearly',
      completed: false,
      vehicleId: vehicle.uuid,
    };
  }

  private buildRevisione(vehicle: Vehicle): Omit<Deadline, 'id' | 'uuid' | 'updatedAt'> {
    return {
      catalogId: 'revisione_auto',
      customName: `Revisione — ${vehicle.targa}`,
      category: 'veicoli',
      dueDate: this.revisioneScadenza(vehicle),
      reminders: [60, 30, 7],
      recurrence: 'biennial',
      completed: false,
      vehicleId: vehicle.uuid,
    };
  }

  private buildAssicurazione(vehicle: Vehicle): Omit<Deadline, 'id' | 'uuid' | 'updatedAt'> {
    return {
      catalogId: 'assicurazione_rc_auto',
      customName: `Assicurazione — ${vehicle.targa}`,
      category: 'veicoli',
      dueDate: new Date(vehicle.assicExpiry!),
      reminders: [30, 15, 7, 3],
      recurrence: 'yearly',
      completed: false,
      vehicleId: vehicle.uuid,
    };
  }
}
