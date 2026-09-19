import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { VerificationGate } from "@/components/verification-gate"
import { defaultServerUrl, normalizeServerUrl, TmailApi } from "@/lib/api"
import { emailDomain, randomAddress } from "@/lib/format"
import {
  clearTurnstileToken,
  readStoredJson,
  readTurnstileToken,
  storageKeys,
  writeStoredJson,
  writeTurnstileToken,
} from "@/lib/storage"

type VerificationState = "checking" | "ready" | "required"

type MailboxContextValue = {
  hydrated: boolean
  address: string
  domains: string[]
  history: string[]
  serverUrl: string
  accessToken: string | null
  verificationState: VerificationState
  api: TmailApi
  syncDomains: (signal?: AbortSignal) => Promise<string>
  changeAddress: (address: string) => Promise<void>
  randomizeAddress: () => Promise<string>
  removeHistoryAddress: (address: string) => Promise<void>
  clearHistory: () => Promise<void>
  saveServerUrl: (serverUrl: string) => Promise<void>
  refreshVerification: () => Promise<void>
}

const MailboxContext = createContext<MailboxContextValue | null>(null)

export function MailboxProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false)
  const [address, setAddress] = useState("")
  const [domains, setDomains] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [serverUrl, setServerUrl] = useState(defaultServerUrl)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [verificationState, setVerificationState] =
    useState<VerificationState>("checking")

  const api = useMemo(
    () => new TmailApi(serverUrl, accessToken),
    [accessToken, serverUrl],
  )

  useEffect(() => {
    let active = true
    void (async () => {
      const storedServer = await readStoredJson(
        storageKeys.serverUrl,
        defaultServerUrl(),
      )
      const normalizedServer = (() => {
        try {
          return normalizeServerUrl(storedServer)
        } catch {
          return defaultServerUrl()
        }
      })()
      const [storedAddress, storedHistory, storedToken] = await Promise.all([
        readStoredJson(storageKeys.address, ""),
        readStoredJson<string[]>(storageKeys.history, []),
        readTurnstileToken(normalizedServer),
      ])
      if (!active) return
      setServerUrl(normalizedServer)
      setAddress(storedAddress)
      setHistory(storedHistory)
      setAccessToken(storedToken)
      setHydrated(true)
    })()
    return () => {
      active = false
    }
  }, [])

  const refreshVerification = useCallback(async () => {
    if (!hydrated) return
    setVerificationState("checking")
    try {
      const status = await api.turnstileStatus()
      if (!status.enabled || status.verified) {
        setVerificationState("ready")
        return
      }
      if (accessToken) {
        await clearTurnstileToken()
        setAccessToken(null)
      }
      setVerificationState("required")
    } catch {
      // Connectivity errors are rendered with richer recovery actions in the inbox.
      setVerificationState("ready")
    }
  }, [accessToken, api, hydrated])

  useEffect(() => {
    void refreshVerification()
  }, [refreshVerification])

  const syncDomains = useCallback(
    async (signal?: AbortSignal) => {
      const availableDomains = await api.domains(signal)
      if (!availableDomains.length) {
        throw new Error("Le serveur ne propose aucun domaine d’adresse.")
      }
      setDomains(availableDomains)
      if (address && availableDomains.includes(emailDomain(address))) return address

      const generated = randomAddress(availableDomains[0])
      setAddress(generated)
      await writeStoredJson(storageKeys.address, generated)
      return generated
    },
    [address, api],
  )

  const changeAddress = useCallback(
    async (nextAddress: string) => {
      const normalized = nextAddress.trim().toLowerCase()
      if (!normalized || normalized === address) return
      const nextHistory = address
        ? [address, ...history.filter((item) => item !== address && item !== normalized)].slice(
            0,
            30,
          )
        : history.filter((item) => item !== normalized)
      setAddress(normalized)
      setHistory(nextHistory)
      await Promise.all([
        writeStoredJson(storageKeys.address, normalized),
        writeStoredJson(storageKeys.history, nextHistory),
      ])
    },
    [address, history],
  )

  const randomizeAddress = useCallback(async () => {
    const domain = emailDomain(address) || domains[0]
    if (!domain) throw new Error("Aucun domaine n’est disponible.")
    const generated = randomAddress(domain)
    await changeAddress(generated)
    return generated
  }, [address, changeAddress, domains])

  const removeHistoryAddress = useCallback(
    async (value: string) => {
      const nextHistory = history.filter((item) => item !== value)
      setHistory(nextHistory)
      await writeStoredJson(storageKeys.history, nextHistory)
    },
    [history],
  )

  const clearHistory = useCallback(async () => {
    setHistory([])
    await writeStoredJson(storageKeys.history, [])
  }, [])

  const saveServerUrl = useCallback(async (value: string) => {
    const normalized = normalizeServerUrl(value)
    await Promise.all([
      writeStoredJson(storageKeys.serverUrl, normalized),
      clearTurnstileToken(),
    ])
    setAccessToken(null)
    setDomains([])
    setServerUrl(normalized)
    setVerificationState("checking")
  }, [])

  const completeVerification = useCallback(
    async (token: string) => {
      await writeTurnstileToken(serverUrl, token)
      setAccessToken(token)
      setVerificationState("ready")
    },
    [serverUrl],
  )

  const value = useMemo<MailboxContextValue>(
    () => ({
      hydrated,
      address,
      domains,
      history,
      serverUrl,
      accessToken,
      verificationState,
      api,
      syncDomains,
      changeAddress,
      randomizeAddress,
      removeHistoryAddress,
      clearHistory,
      saveServerUrl,
      refreshVerification,
    }),
    [
      accessToken,
      address,
      api,
      changeAddress,
      clearHistory,
      domains,
      history,
      hydrated,
      randomizeAddress,
      refreshVerification,
      removeHistoryAddress,
      saveServerUrl,
      serverUrl,
      syncDomains,
      verificationState,
    ],
  )

  return (
    <MailboxContext.Provider value={value}>
      {children}
      <VerificationGate
        visible={hydrated && verificationState === "required"}
        serverUrl={serverUrl}
        onVerified={completeVerification}
        onChangeServer={() => setVerificationState("ready")}
      />
    </MailboxContext.Provider>
  )
}

export function useMailbox() {
  const value = useContext(MailboxContext)
  if (!value) throw new Error("useMailbox must be used inside MailboxProvider")
  return value
}
