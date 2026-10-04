export function formatPrice(cents: number, currency = 'EUR', locale = 'sr-Latn'): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** ISO datum → { day, month, year } u vremenskoj zoni Maribora. */
export function dateParts(iso: string): { day: string; month: string; year: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Ljubljana',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { day: get('day'), month: get('month'), year: get('year') };
}
