export interface BuildInfo {
  version: string
  commit: string
}

declare const __BUILD_INFO__: BuildInfo | undefined

export const BUILD_INFO: BuildInfo | undefined =
  typeof __BUILD_INFO__ === 'undefined' ? undefined : __BUILD_INFO__
