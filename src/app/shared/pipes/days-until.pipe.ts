import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'daysUntil', pure: true })
export class DaysUntilPipe implements PipeTransform {
  transform(date: Date | string): number {
    const d = new Date(date);
    const today = new Date();
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
  }
}
