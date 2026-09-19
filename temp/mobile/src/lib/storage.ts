import * as SecureStore from "expo-secure-store"
import Storage from "expo-sqlite/kv-store"

export const storageKeys = {
  address: "tmail.address",
  history: "tmail.history",
  serverUrl: "tmail.serverUrl",
  token: "tmail.turnstile.token",
  tokenServer: "tmail.turnstile.server",
} as const

export async function readStoredJson<T>(key: string, fallback: T): Promise<T> {
  const value = await Storage.getItem(key)
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function writeStoredJson(key: string, value: unknown) {
  await Storage.setItem(key, JSON.stringify(value))
}

export async function readTurnstileToken(serverUrl: string) {
  const [token, tokenServer] = await Promise.all([
    SecureStore.getItemAsync(storageKeys.token),
    SecureStore.getItemAsync(storageKeys.tokenServer),
  ])
  return tokenServer === serverUrl ? token : null
}

export async function writeTurnstileToken(serverUrl: string, token: string) {
  await Promise.all([
    SecureStore.setItemAsync(storageKeys.token, token),
    SecureStore.setItemAsync(storageKeys.tokenServer, serverUrl),
  ])
}

export async function clearTurnstileToken() {
  await Promise.all([
    SecureStore.deleteItemAsync(storageKeys.token),
    SecureStore.deleteItemAsync(storageKeys.tokenServer),
  ])
}
