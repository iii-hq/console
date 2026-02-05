// Runtime config type for binary mode
declare global {
  interface Window {
    __CONSOLE_CONFIG__?: {
      basePath: string
      engineHost: string
      enginePort: number
      wsPort: number
    }
  }
}

// Get configuration from runtime config (binary mode) or Vite env vars (dev mode)
export function getConfig() {
  // In binary mode, use injected config from window.__CONSOLE_CONFIG__
  if (typeof window !== 'undefined' && window.__CONSOLE_CONFIG__) {
    const c = window.__CONSOLE_CONFIG__
    return {
      engineHost: c.engineHost,
      enginePort: String(c.enginePort),
      wsPort: String(c.wsPort),
    }
  }
  // Fallback to Vite env vars for dev mode
  return {
    engineHost: import.meta.env.VITE_III_ENGINE_HOST || '127.0.0.1',
    enginePort: import.meta.env.VITE_III_ENGINE_PORT || '3111',
    wsPort: import.meta.env.VITE_III_WS_PORT || '3112',
  }
}

// Configurable engine connection settings
const config = getConfig()
export const ENGINE_HOST = config.engineHost
export const ENGINE_PORT = config.enginePort
export const WS_PORT = config.wsPort

export const DEVTOOLS_API = `http://${ENGINE_HOST}:${ENGINE_PORT}/_console`
// TODO: Differentiate MANAGEMENT_API from DEVTOOLS_API when the engine supports separate endpoints.
// Currently both point to the same endpoint, but they represent different concerns:
// - DEVTOOLS_API: Primary endpoint for development tools and diagnostics
// - MANAGEMENT_API: Fallback endpoint for management operations (used when DEVTOOLS_API fails)
export const MANAGEMENT_API = `http://${ENGINE_HOST}:${ENGINE_PORT}/_console`
export const STREAMS_WS = `ws://${ENGINE_HOST}:${WS_PORT}`

// Export connection info for debugging
export function getConnectionInfo() {
  return {
    engineHost: ENGINE_HOST,
    enginePort: ENGINE_PORT,
    wsPort: WS_PORT,
    devtoolsApi: DEVTOOLS_API,
    streamsWs: STREAMS_WS,
  }
}
