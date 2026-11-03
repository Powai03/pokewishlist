// Petites fonctions d'affichage.

/** Numéro du Pokédex sur 3 chiffres, comme dans le jeu : 25 → « 025 », 495 → « 495 ». */
export function formatDexNumber(id: number): string {
  return String(id).padStart(3, '0')
}

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** Taille PokéAPI (décimètres) → « 0,6 m ». */
export function formatHeight(decimeters: number): string {
  return `${nf.format(decimeters / 10)} m`
}

/** Poids PokéAPI (hectogrammes) → « 8,1 kg ». */
export function formatWeight(hectograms: number): string {
  return `${nf.format(hectograms / 10)} kg`
}
