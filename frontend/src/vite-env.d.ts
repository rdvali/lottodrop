/// <reference types="vite/client" />
/// <reference types="@types/react" />
/// <reference types="@types/react-dom" />

// React 19 JSX compatibility
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Vite environment variable types
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_ENVIRONMENT: string
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
