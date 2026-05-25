import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { liveQuery } from 'dexie';
import { DexieService } from '../../db/dexie.service';
import { SyncQueueService } from '../../db/sync-queue.service';
import { Vehicle } from '../models';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly db = inject(DexieService);
  private readonly syncQueue = inject(SyncQueueService);

  readonly all = toSignal(
    from(liveQuery(() => this.db.vehicles.orderBy('targa').toArray())),
    { initialValue: [] as Vehicle[] },
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async add(vehicle: Omit<Vehicle, 'id'>): Promise<number> {
    const id = await this.db.vehicles.add(vehicle);
    await this.syncQueue.enqueue('vehicle', vehicle.uuid, 'create', vehicle);
    return id;
  }

  async update(id: number, changes: Partial<Omit<Vehicle, 'id'>>): Promise<void> {
    await this.db.vehicles.update(id, { ...changes, updatedAt: new Date() });
    const vehicle = await this.db.vehicles.get(id);
    if (vehicle) {
      await this.syncQueue.enqueue('vehicle', vehicle.uuid, 'update', vehicle);
    }
  }

  async remove(id: number): Promise<void> {
    const vehicle = await this.db.vehicles.get(id);
    if (vehicle) {
      await this.syncQueue.enqueue('vehicle', vehicle.uuid, 'delete', { uuid: vehicle.uuid });
    }
    await this.db.vehicles.delete(id);
  }

  getById(id: number): Promise<Vehicle | undefined> {
    return this.db.vehicles.get(id);
  }

  getByTarga(targa: string): Promise<Vehicle | undefined> {
    return this.db.vehicles.where('targa').equals(targa.toUpperCase()).first();
  }

  static newUuid(): string {
    return crypto.randomUUID();
  }

  static build(partial: Omit<Vehicle, 'id' | 'uuid' | 'updatedAt'>): Omit<Vehicle, 'id'> {
    return {
      ...partial,
      targa: partial.targa.toUpperCase(),
      uuid: VehicleService.newUuid(),
      updatedAt: new Date(),
    };
  }
}
