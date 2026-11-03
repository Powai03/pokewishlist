// Petites fonctions d'affichage.

/** Numéro du Pokédex sur 3 chiffres, comme dans le jeu : 25 → « 025 », 495 → « 495 ». */
export function formatDexNumber(id: number): string {
  return String(id).padStart(3, '0')
}

/** Un nombre à 1 décimale, à la façon de la langue : « 0.6 » en anglais, « 0,6 » en français. */
const decimal = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)

/** Taille PokéAPI (décimètres) → « 0.6 m » (en), « 0,6 m » (fr). */
export function formatHeight(
  decimeters: number,
  locale: string = 'en',
): string {
  return `${decimal(decimeters / 10, locale)} m`
}

/** Poids PokéAPI (hectogrammes) → « 8.1 kg » (en), « 8,1 kg » (fr). */
export function formatWeight(
  hectograms: number,
  locale: string = 'en',
): string {
  return `${decimal(hectograms / 10, locale)} kg`
}
