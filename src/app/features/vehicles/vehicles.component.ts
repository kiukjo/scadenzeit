import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehicleService } from '../../core/services/vehicle.service';
import { DeadlineService } from '../../core/services/deadline.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ItalianDatePipe } from '../../shared/pipes/italian-date.pipe';

@Component({
  selector: 'app-vehicles',
  imports: [RouterLink, EmptyStateComponent, ItalianDatePipe],
  template: `
    <div class="vehicles-page">
      <header class="page-header">
        <h1>Veicoli</h1>
        <a routerLink="new">+ Aggiungi</a>
      </header>

      @if (vehicles().length === 0) {
        <app-empty-state
          title="Nessun veicolo"
          subtitle="Aggiungi un veicolo per calcolare bollo, revisione e assicurazione"
        />
      } @else {
        <div class="vehicle-list">
          @for (vehicle of vehicles(); track vehicle.id) {
            <div class="vehicle-card">
              <div class="vehicle-header">
                <strong class="targa">{{ vehicle.targa }}</strong>
                @if (vehicle.marca || vehicle.modello) {
                  <span>{{ vehicle.marca }} {{ vehicle.modello }}</span>
                }
              </div>

              <div class="vehicle-details">
                @if (vehicle.kw) {
                  <span>{{ vehicle.kw }} kW</span>
                }
                @if (vehicle.immatDate) {
                  <span>Immat. {{ vehicle.immatDate | italianDate }}</span>
                }
              </div>

              <!-- Scadenze collegate -->
              <div class="vehicle-deadlines">
                @for (d of getDeadlines(vehicle.uuid); track d.id) {
                  <div class="deadline-chip">
                    {{ d.customName }}
                  </div>
                }
              </div>

              <button (click)="remove(vehicle.id!)">Elimina</button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class VehiclesComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly deadlineService = inject(DeadlineService);

  readonly vehicles = this.vehicleService.all;

  getDeadlines(vehicleUuid: string) {
    return this.deadlineService.all().filter((d) => d.vehicleId === vehicleUuid);
  }

  async remove(id: number): Promise<void> {
    await this.vehicleService.remove(id);
  }
}
