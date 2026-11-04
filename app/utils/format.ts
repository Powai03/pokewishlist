export function formatDexNumber(id: number): string {
  return String(id).padStart(3, '0')
}

const decimal = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)

export function formatHeight(
  decimeters: number,
  locale: string = 'en',
): string {
  return `${decimal(decimeters / 10, locale)} m`
}

export function formatWeight(
  hectograms: number,
  locale: string = 'en',
): string {
  return `${decimal(hectograms / 10, locale)} kg`
}
