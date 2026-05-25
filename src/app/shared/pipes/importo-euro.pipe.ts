import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'importoEuro', pure: true })
export class ImportoEuroPipe implements PipeTransform {
  private readonly fmt = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });

  transform(cents: number | undefined | null): string {
    if (cents == null) return '';
    return this.fmt.format(cents / 100);
  }
}
