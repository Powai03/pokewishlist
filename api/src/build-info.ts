// Informations gravées dans le paquet Lambda au moment du build (scripts/build-lambda.mjs, option `define` d'esbuild).
//
// Sur Lambda, il n'y a ni package.json ni dépôt git à côté du code : la version et le commit
// sont donc écrits DANS le fichier compilé. En local (tsx) ou après `tsc`, ils sont absents (undefined).
export interface BuildInfo {
  /** Version de api/package.json au moment du build. */
  version: string
  /** Commit git déployé (SHA complet). */
  commit: string
}

// Remplacé par esbuild par un objet littéral ; n'existe pas ailleurs (d'où le `typeof`).
declare const __BUILD_INFO__: BuildInfo | undefined

export const BUILD_INFO: BuildInfo | undefined =
  typeof __BUILD_INFO__ === 'undefined' ? undefined : __BUILD_INFO__
