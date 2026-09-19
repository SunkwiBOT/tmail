export const storageKeys = {
  address: "tmail.address",
  history: "tmail.history",
  serverUrl: "tmail.serverUrl",
  token: "tmail.turnstile.token",
  tokenServer: "tmail.turnstile.server",
} as const

function browserStorage() {
  return typeof globalThis.localStorage === "undefined"
    ? null
    : globalThis.localStorage
}

export async function readStoredJson<T>(key: string, fallback: T): Promise<T> {
  const value = browserStorage()?.getItem(key)
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function writeStoredJson(key: string, value: unknown) {
  browserStorage()?.setItem(key, JSON.stringify(value))
}

export async function readTurnstileToken(serverUrl: string) {
  const storage = browserStorage()
  const tokenServer = storage?.getItem(storageKeys.tokenServer)
  return tokenServer === serverUrl ? storage?.getItem(storageKeys.token) ?? null : null
}

export async function writeTurnstileToken(serverUrl: string, token: string) {
  const storage = browserStorage()
  storage?.setItem(storageKeys.token, token)
  storage?.setItem(storageKeys.tokenServer, serverUrl)
}

export async function clearTurnstileToken() {
  const storage = browserStorage()
  storage?.removeItem(storageKeys.token)
  storage?.removeItem(storageKeys.tokenServer)
}
