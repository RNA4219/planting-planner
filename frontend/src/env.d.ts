interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  readonly VITE_SW_FORCE_UPDATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
