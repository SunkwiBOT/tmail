import { Platform } from "react-native"

import type { Envelope, MailDetail, TurnstileStatus } from "@/types"

type ApiEnvelope<T> = {
  code: number
  message: string
  data?: T
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function normalizeServerUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new Error("L’adresse du serveur est obligatoire.")
  const url = new URL(trimmed)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Le serveur doit utiliser une URL HTTP ou HTTPS.")
  }
  return url.toString().replace(/\/$/, "")
}

export function defaultServerUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) {
    try {
      return normalizeServerUrl(configured)
    } catch {
      // The settings screen will let the user correct a malformed build value.
    }
  }
  return Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000"
}

export class TmailApi {
  constructor(
    readonly serverUrl: string,
    private readonly accessToken: string | null,
  ) {}

  get authorizationHeaders(): Record<string, string> {
    return this.accessToken
      ? { Authorization: `Bearer ${this.accessToken}` }
      : {}
  }

  url(path: string) {
    return `${this.serverUrl}${path.startsWith("/") ? path : `/${path}`}`
  }

  async turnstileStatus(signal?: AbortSignal) {
    return this.request<TurnstileStatus>("/api/turnstile/status", { signal })
  }

  async domains(signal?: AbortSignal) {
    return this.request<string[]>("/api/domain", { signal })
  }

  async envelopes(address: string, signal?: AbortSignal) {
    return this.request<Envelope[]>(
      `/api/fetch?to=${encodeURIComponent(address)}`,
      { signal },
    )
  }

  async latest(address: string, id: number, signal?: AbortSignal) {
    return this.request<Envelope | undefined>(
      `/api/fetch/latest?to=${encodeURIComponent(address)}&id=${id}`,
      { signal },
    )
  }

  async detail(id: number, signal?: AbortSignal) {
    return this.request<MailDetail>(`/api/fetch/${id}`, { signal })
  }

  downloadUrl(id: string) {
    return this.url(`/api/download/${encodeURIComponent(id)}`)
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set("Accept", "application/json")
    if (this.accessToken) headers.set("Authorization", `Bearer ${this.accessToken}`)

    let response: Response
    try {
      response = await fetch(this.url(path), { ...init, headers })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error
      throw new ApiError(
        "Serveur TMail injoignable. Vérifiez son adresse et votre connexion.",
        0,
      )
    }

    if (response.status === 204) return undefined as T
    const text = await response.text()
    let body: ApiEnvelope<T> | undefined
    if (text) {
      try {
        body = JSON.parse(text) as ApiEnvelope<T>
      } catch {
        throw new ApiError(text, response.status)
      }
    }
    if (!response.ok || body?.code !== 0) {
      throw new ApiError(
        body?.message || `Erreur du serveur (${response.status})`,
        response.status,
      )
    }
    return body.data as T
  }
}
