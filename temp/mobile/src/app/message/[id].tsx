import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { File, Paths } from "expo-file-system"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as Sharing from "expo-sharing"
import {
  ArrowLeft,
  Download,
  ImageOff,
  Paperclip,
  RefreshCw,
} from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"

import { fonts, useAppTheme } from "@/constants/theme"
import { useMailbox } from "@/context/mailbox-context"
import { ApiError } from "@/lib/api"
import { formatFullDate, safeFilename } from "@/lib/format"
import type { Attachment, MailDetail } from "@/types"

export default function MessageScreen() {
  const params = useLocalSearchParams<{
    id: string
    subject?: string
    from?: string
    createdAt?: string
  }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette, scheme } = useAppTheme()
  const styles = useMemo(() => makeStyles(palette), [palette])
  const { api, verificationState, refreshVerification } = useMailbox()
  const [detail, setDetail] = useState<MailDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const messageId = Number(params.id)

  useEffect(() => {
    if (!Number.isFinite(messageId) || verificationState !== "ready") return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void api
      .detail(messageId, controller.signal)
      .then(setDetail)
      .catch(async (caught: unknown) => {
        if (controller.signal.aborted) return
        if (caught instanceof ApiError && caught.status === 401) {
          await refreshVerification()
          return
        }
        setError(
          caught instanceof Error ? caught.message : "Impossible d’ouvrir ce message.",
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [api, messageId, refreshVerification, retryKey, verificationState])

  async function downloadAttachment(attachment: Attachment) {
    try {
      setDownloadingId(attachment.id)
      const target = new File(
        Paths.cache,
        `${attachment.id}-${safeFilename(attachment.filename)}`,
      )
      const file = await File.downloadFileAsync(api.downloadUrl(attachment.id), target, {
        headers: api.authorizationHeaders,
        idempotent: true,
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: `Ouvrir ${attachment.filename}`,
        })
      } else {
        await Linking.openURL(file.uri)
      }
    } catch (caught) {
      Alert.alert(
        "Téléchargement impossible",
        caught instanceof Error ? caught.message : "La pièce jointe n’a pas pu être ouverte.",
      )
    } finally {
      setDownloadingId(null)
    }
  }

  const html = useMemo(
    () => buildEmailHtml(detail?.content ?? "", scheme),
    [detail?.content, scheme],
  )

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={palette.text} size={19} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text numberOfLines={2} style={styles.subject}>
              {params.subject || "(Sans objet)"}
            </Text>
            <Text numberOfLines={1} style={styles.sender}>
              {params.from || "Expéditeur inconnu"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.date}>
          {params.createdAt ? formatFullDate(params.createdAt) : ""}
        </Text>
        <View style={styles.privacyBadge}>
          <ImageOff color={palette.accentStrong} size={13} />
          <Text style={styles.privacyText}>IMAGES DISTANTES BLOQUÉES</Text>
        </View>
      </View>

      {detail && detail.attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachments}
        >
          {detail.attachments.map((attachment) => (
            <Pressable
              key={attachment.id}
              disabled={downloadingId !== null}
              onPress={() => void downloadAttachment(attachment)}
              style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}
            >
              {downloadingId === attachment.id ? (
                <ActivityIndicator color={palette.accentStrong} size="small" />
              ) : (
                <Paperclip color={palette.accentStrong} size={16} />
              )}
              <Text numberOfLines={1} style={styles.attachmentName}>
                {attachment.filename}
              </Text>
              <Download color={palette.textMuted} size={15} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.contentFrame}>
        {loading || verificationState === "checking" ? (
          <View style={styles.state}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.stateTitle}>Ouverture du message…</Text>
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.errorTitle}>Le message ne peut pas être affiché</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => setRetryKey((value) => value + 1)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <RefreshCw color={palette.background} size={17} />
              <Text style={styles.retryLabel}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            originWhitelist={["about:blank", "data:*"]}
            source={{ html, baseUrl: api.serverUrl }}
            javaScriptEnabled={false}
            domStorageEnabled={false}
            allowFileAccess={false}
            setSupportMultipleWindows={false}
            mixedContentMode="never"
            onShouldStartLoadWithRequest={(request) => {
              if (request.url === "about:blank" || request.url.startsWith("data:")) {
                return true
              }
              void Linking.openURL(request.url)
              return false
            }}
            style={styles.webView}
          />
        )}
      </View>
    </View>
  )
}

function buildEmailHtml(content: string, scheme: "light" | "dark") {
  const isHtml = /<[a-z][\s\S]*>/i.test(content)
  const body = isHtml ? content : `<pre>${escapeHtml(content)}</pre>`
  const dark = scheme === "dark"
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:" />
    <style>
      :root { color-scheme: ${dark ? "dark" : "light"}; }
      html, body { margin: 0; padding: 0; background: ${dark ? "#18181B" : "#FFFFFF"}; color: ${dark ? "#FAFAFA" : "#18181B"}; }
      body { padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
      img { max-width: 100% !important; height: auto !important; }
      table { max-width: 100% !important; }
      pre { margin: 0; white-space: pre-wrap; font: inherit; }
      a { color: ${dark ? "#FAFAFA" : "#18181B"}; text-decoration: underline; }
      blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid ${dark ? "#3F3F46" : "#E4E4E7"}; }
    </style>
  </head>
  <body>${body}</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function makeStyles(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    headerBar: {
      backgroundColor: palette.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    header: {
      width: "100%",
      maxWidth: 896,
      minHeight: 56,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCopy: { flex: 1, paddingVertical: 8, paddingRight: 4 },
    subject: {
      color: palette.text,
      fontFamily: fonts.medium,
      fontSize: 15,
      lineHeight: 19,
    },
    sender: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
    metaRow: {
      width: "100%",
      maxWidth: 896,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    date: { flex: 1, color: palette.textMuted, fontSize: 11 },
    privacyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 3,
      backgroundColor: palette.surfaceMuted,
      paddingHorizontal: 7,
      paddingVertical: 5,
    },
    privacyText: {
      color: palette.textMuted,
      fontFamily: fonts.medium,
      fontSize: 7,
      letterSpacing: 0.45,
    },
    attachments: {
      width: "100%",
      maxWidth: 896,
      alignSelf: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    attachment: {
      maxWidth: 250,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 4,
      paddingHorizontal: 9,
      paddingVertical: 7,
      backgroundColor: palette.surfaceMuted,
      borderWidth: 1,
      borderColor: palette.border,
    },
    attachmentName: {
      maxWidth: 180,
      color: palette.textMuted,
      fontSize: 11,
    },
    contentFrame: {
      flex: 1,
      width: "100%",
      maxWidth: 896,
      alignSelf: "center",
      overflow: "hidden",
      marginBottom: 12,
      borderRadius: 4,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    webView: { flex: 1, backgroundColor: palette.surface },
    state: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 34,
    },
    stateTitle: {
      color: palette.text,
      fontFamily: fonts.medium,
      fontSize: 14,
      marginTop: 13,
    },
    errorTitle: {
      color: palette.text,
      fontFamily: fonts.medium,
      fontSize: 16,
      textAlign: "center",
    },
    errorText: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 6,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 6,
      backgroundColor: palette.text,
      paddingHorizontal: 15,
      paddingVertical: 11,
      marginTop: 18,
    },
    retryLabel: { color: palette.background, fontFamily: fonts.medium, fontSize: 13 },
    pressed: { opacity: 0.62 },
  })
}
