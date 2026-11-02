// Petites fonctions d'affichage.

/** Numéro du Pokédex sur 3 chiffres, comme dans le jeu : 25 → « 025 », 495 → « 495 ». */
export function formatDexNumber(id: number): string {
  console.log('formatDexNumber', id)
  return String(id).padStart(3, '0')
}
