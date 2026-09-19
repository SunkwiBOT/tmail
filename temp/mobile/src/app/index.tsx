import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Appearance,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import * as Clipboard from "expo-clipboard"
import { useRouter } from "expo-router"
import {
  Check,
  Copy,
  Dices,
  Frown,
  History,
  Mail,
  Moon,
  PenLine,
  RefreshCw,
  Settings,
  Sun,
  WifiOff,
} from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AddressModal } from "@/components/address-modal"
import { TmailLogo } from "@/components/tmail-logo"
import { fonts, useAppTheme } from "@/constants/theme"
import { useMailbox } from "@/context/mailbox-context"
import { ApiError } from "@/lib/api"
import { formatInboxDate, formatSender } from "@/lib/format"
import type { Envelope } from "@/types"

const RETRY_DELAY_MS = 1_500

export default function InboxScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette, scheme } = useAppTheme()
  const styles = useMemo(() => makeStyles(palette), [palette])
  const {
    hydrated,
    address,
    domains,
    serverUrl,
    accessToken,
    verificationState,
    api,
    syncDomains,
    changeAddress,
    randomizeAddress,
    refreshVerification,
  } = useMailbox()

  const [messages, setMessages] = useState<Envelope[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshing(true)
    setReloadKey((value) => value + 1)
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setReloadKey((value) => value + 1)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!hydrated || verificationState !== "ready") return

    const controller = new AbortController()
    const { signal } = controller

    function waitBeforeRetry() {
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, RETRY_DELAY_MS)
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timeout)
            resolve()
          },
          { once: true },
        )
      })
    }

    async function receiveLoop() {
      setLoading(true)
      setError(null)

      while (!signal.aborted) {
        try {
          const activeAddress = await syncDomains(signal)
          if (signal.aborted) return

          const initialMessages = await api.envelopes(activeAddress, signal)
          if (signal.aborted) return
          setMessages(initialMessages)
          setLoading(false)
          setRefreshing(false)
          setError(null)

          let latestId = initialMessages[0]?.id ?? 0
          while (!signal.aborted) {
            const next = await api.latest(activeAddress, latestId, signal)
            if (!next || signal.aborted) continue
            latestId = next.id
            setMessages((current) => [
              next,
              ...current.filter((message) => message.id !== next.id),
            ])
          }
        } catch (caught) {
          if (signal.aborted || (caught instanceof Error && caught.name === "AbortError")) {
            return
          }
          if (caught instanceof ApiError && caught.status === 401) {
            setLoading(false)
            setRefreshing(false)
            await refreshVerification()
            return
          }
          setLoading(false)
          setRefreshing(false)
          setError(
            caught instanceof Error ? caught.message : "Impossible de relever la boîte.",
          )
          await waitBeforeRetry()
        }
      }
    }

    void receiveLoop()
    return () => controller.abort()
  }, [
    accessToken,
    address,
    api,
    hydrated,
    refreshVerification,
    reloadKey,
    serverUrl,
    syncDomains,
    verificationState,
  ])

  async function copyAddress() {
    if (!address) return
    await Clipboard.setStringAsync(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1_600)
  }

  async function createRandomAddress() {
    try {
      await randomizeAddress()
    } catch (caught) {
      Alert.alert(
        "Adresse indisponible",
        caught instanceof Error ? caught.message : "Réessayez dans un instant.",
      )
    }
  }

  function openMessage(message: Envelope) {
    router.push({
      pathname: "/message/[id]",
      params: {
        id: String(message.id),
        subject: message.subject || "(Sans objet)",
        from: message.from,
        createdAt: message.created_at,
      },
    })
  }

  const connectionColor = error
    ? palette.danger
    : loading || verificationState === "checking"
      ? "#FACC15"
      : "#4ADE80"
  const connectionLabel = error
    ? "Connexion temps réel interrompue"
    : loading || verificationState === "checking"
      ? "Connexion temps réel en cours"
      : "Connexion temps réel active"

  const listHeader = (
    <View>
      <View style={styles.actionsBar}>
        <ActionButton
          icon={<PenLine color={palette.background} size={16} />}
          label="Modifier"
          onPress={() => setEditingAddress(true)}
          primary
          styles={styles}
        />
        <ActionButton
          icon={<Dices color={palette.text} size={16} />}
          label="Aléatoire"
          onPress={() => void createRandomAddress()}
          styles={styles}
        />
        <ActionButton
          icon={<History color={palette.text} size={16} />}
          label="Historique"
          onPress={() => router.push("/history")}
          styles={styles}
        />
      </View>

      <View style={styles.addressBar}>
        <View
          accessible
          accessibilityLabel={connectionLabel}
          style={[styles.connectionBar, { backgroundColor: connectionColor }]}
        />
        <View style={styles.addressPane}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={1}
            selectable
            style={styles.addressText}
          >
            {address || "Préparation de l’adresse…"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={copied ? "Adresse copiée" : "Copier l’adresse"}
          disabled={!address}
          onPress={() => void copyAddress()}
          style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
        >
          {copied ? (
            <Check color={palette.text} size={19} />
          ) : (
            <Copy color={palette.text} size={19} strokeWidth={1.8} />
          )}
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorRow}>
          <WifiOff color={palette.danger} size={18} />
          <Text numberOfLines={2} style={styles.errorText}>
            {error}
          </Text>
          <Pressable
            accessibilityLabel="Réessayer"
            onPress={refresh}
            style={({ pressed }) => [styles.errorAction, pressed && styles.pressed]}
          >
            <RefreshCw color={palette.text} size={17} />
          </Pressable>
        </View>
      )}
    </View>
  )

  return (
    <View style={styles.screen}>
      <View style={[styles.siteHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={styles.brand}>
            <TmailLogo size={24} />
            <Text style={styles.brandName}>Temporary Mail</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel={scheme === "dark" ? "Thème clair" : "Thème sombre"}
              onPress={() => Appearance.setColorScheme(scheme === "dark" ? "light" : "dark")}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              {scheme === "dark" ? (
                <Sun color={palette.text} size={18} />
              ) : (
                <Moon color={palette.text} size={18} />
              )}
            </Pressable>
            <Pressable
              accessibilityLabel="Réglages"
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <Settings color={palette.text} size={18} />
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyRow}>
            {loading || verificationState === "checking" ? (
              <>
                <Mail color={palette.textMuted} size={19} />
                <Text style={styles.emptyText}>Relève de la boîte…</Text>
              </>
            ) : (
              <>
                <Frown color={palette.textMuted} size={20} />
                <Text style={styles.emptyText}>Aucun mail n’a encore été reçu</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => openMessage(item)}
            style={({ pressed }) => [
              styles.messageRow,
              index === 0 && styles.firstMessageRow,
              index === messages.length - 1 && styles.lastMessageRow,
              pressed && styles.messagePressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.subject}>
              {item.subject || "(Sans objet)"}
            </Text>
            <View style={styles.messageMeta}>
              <Text numberOfLines={1} style={styles.sender}>
                {formatSender(item.from)}
              </Text>
              <Text style={styles.date}>{formatInboxDate(item.created_at)}</Text>
            </View>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.text}
            colors={[palette.text]}
            progressBackgroundColor={palette.surface}
          />
        }
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <AddressModal
        visible={editingAddress}
        currentAddress={address}
        domains={domains}
        onClose={() => setEditingAddress(false)}
        onConfirm={(value) => {
          setEditingAddress(false)
          void changeAddress(value)
        }}
      />
    </View>
  )
}

type ActionButtonProps = {
  icon: React.ReactNode
  label: string
  onPress: () => void
  primary?: boolean
  styles: ReturnType<typeof makeStyles>
}

function ActionButton({ icon, label, onPress, primary = false, styles }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.actionButtonPrimary,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={[styles.actionLabel, primary && styles.actionLabelPrimary]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function makeStyles(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    siteHeader: {
      backgroundColor: palette.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      shadowColor: palette.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    headerInner: {
      width: "100%",
      maxWidth: 896,
      minHeight: 48,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 5 },
    brandName: { color: palette.text, fontFamily: fonts.medium, fontSize: 15 },
    headerActions: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    list: { width: "100%", maxWidth: 896, alignSelf: "center" },
    content: { flexGrow: 1 },
    actionsBar: {
      minHeight: 53,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: palette.surfaceMuted,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: palette.border,
    },
    actionButton: {
      minWidth: 0,
      height: 36,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 7,
      borderRadius: 6,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    actionButtonPrimary: {
      backgroundColor: palette.text,
      borderColor: palette.text,
    },
    actionLabel: { color: palette.text, fontFamily: fonts.medium, fontSize: 12 },
    actionLabelPrimary: { color: palette.background },
    addressBar: {
      position: "relative",
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
    },
    connectionBar: {
      position: "absolute",
      zIndex: 2,
      left: 0,
      right: 0,
      top: 0,
      height: 4,
    },
    addressPane: {
      flex: 1,
      height: 48,
      marginTop: 4,
      justifyContent: "center",
      paddingHorizontal: 16,
      backgroundColor: palette.surfaceMuted,
      borderRightWidth: 1,
      borderRightColor: palette.border,
    },
    addressText: {
      color: palette.text,
      fontFamily: fonts.mono,
      fontSize: 14,
      fontWeight: "600",
    },
    copyButton: {
      width: 48,
      height: 48,
      marginTop: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    errorRow: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: palette.danger,
      backgroundColor: palette.background,
    },
    errorText: { flex: 1, color: palette.danger, fontSize: 12, lineHeight: 17 },
    errorAction: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
    },
    messageRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: palette.background,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: palette.border,
    },
    firstMessageRow: { borderTopWidth: 1 },
    lastMessageRow: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
    messagePressed: { backgroundColor: palette.surfaceMuted },
    subject: { color: palette.text, fontSize: 14, lineHeight: 19 },
    messageMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 4,
    },
    sender: { flex: 1, color: palette.textMuted, fontSize: 12 },
    date: { color: palette.textMuted, fontSize: 12 },
    emptyRow: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: palette.border,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 4,
      backgroundColor: palette.background,
    },
    emptyText: { color: palette.textMuted, fontSize: 13 },
    pressed: { opacity: 0.65 },
  })
}
