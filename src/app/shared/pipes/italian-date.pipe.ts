import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'italianDate', pure: true })
export class ItalianDatePipe implements PipeTransform {
  private readonly fmt = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  transform(date: Date | string | undefined | null): string {
    if (!date) return '';
    return this.fmt.format(new Date(date));
  }
}
