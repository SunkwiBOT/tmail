import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { ShieldCheck, SlidersHorizontal, XCircle } from "lucide-react-native"
import { useRouter } from "expo-router"
import { WebView } from "react-native-webview"

import { fonts, useAppTheme } from "@/constants/theme"
import type { TurnstileBridgeMessage } from "@/types"

type Props = {
  visible: boolean
  serverUrl: string
  onVerified: (token: string) => Promise<void>
  onChangeServer: () => void
}

export function VerificationGate({
  visible,
  serverUrl,
  onVerified,
  onChangeServer,
}: Props) {
  const { palette } = useAppTheme()
  const router = useRouter()
  const [webViewKey, setWebViewKey] = useState(0)
  const [failed, setFailed] = useState(false)
  const styles = useMemo(() => makeStyles(palette), [palette])

  function openSettings() {
    onChangeServer()
    router.push("/settings")
  }

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <ShieldCheck color={palette.accentStrong} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PROTECTION ANTI-BOT</Text>
            <Text style={styles.title}>Une vérification rapide</Text>
          </View>
          <Pressable
            accessibilityLabel="Changer de serveur"
            hitSlop={10}
            onPress={openSettings}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <SlidersHorizontal color={palette.text} size={20} />
          </Pressable>
        </View>

        <Text style={styles.explanation}>
          Le serveur demande de confirmer que vous êtes humain. La validation reste
          active pendant quelques heures sur cet appareil.
        </Text>

        <View style={styles.browserFrame}>
          {failed ? (
            <View style={styles.failure}>
              <XCircle color={palette.danger} size={32} />
              <Text style={styles.failureTitle}>La vérification ne répond pas</Text>
              <Text style={styles.failureText}>
                Vérifiez la connexion et l’URL du serveur, puis réessayez.
              </Text>
              <Pressable
                onPress={() => {
                  setFailed(false)
                  setWebViewKey((value) => value + 1)
                }}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryLabel}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              key={webViewKey}
              source={{ uri: `${serverUrl}/` }}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator color={palette.accent} />
                  <Text style={styles.loadingText}>Chargement de la vérification…</Text>
                </View>
              )}
              onError={() => setFailed(true)}
              onHttpError={(event) => {
                if (event.nativeEvent.statusCode >= 500) setFailed(true)
              }}
              onMessage={(event) => {
                try {
                  const message = JSON.parse(
                    event.nativeEvent.data,
                  ) as TurnstileBridgeMessage
                  if (message.type === "turnstile-verified" && message.accessToken) {
                    void onVerified(message.accessToken)
                  }
                } catch {
                  // Ignore messages not emitted by the TMail bridge.
                }
              }}
              style={styles.webView}
            />
          )}
        </View>

        <Text numberOfLines={1} style={styles.serverLabel}>
          {serverUrl}
        </Text>
      </SafeAreaView>
    </Modal>
  )
}

function makeStyles(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
      paddingBottom: 12,
    },
    header: {
      width: "100%",
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: "5%",
      backgroundColor: palette.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    brandMark: {
      width: 28,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCopy: { flex: 1 },
    eyebrow: {
      color: palette.textMuted,
      fontFamily: fonts.medium,
      fontSize: 8,
      letterSpacing: 1,
    },
    title: {
      color: palette.text,
      fontFamily: fonts.medium,
      fontSize: 15,
      marginTop: 1,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    explanation: {
      width: "90%",
      maxWidth: 640,
      alignSelf: "center",
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 16,
      marginBottom: 12,
    },
    browserFrame: {
      flex: 1,
      width: "90%",
      maxWidth: 640,
      alignSelf: "center",
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    webView: { flex: 1, backgroundColor: palette.surface },
    loader: {
      position: "absolute",
      inset: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: palette.surface,
    },
    loadingText: { color: palette.textMuted, fontSize: 14 },
    failure: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 28,
    },
    failureTitle: {
      color: palette.text,
      fontFamily: fonts.medium,
      fontSize: 18,
      marginTop: 14,
    },
    failureText: {
      color: palette.textMuted,
      textAlign: "center",
      lineHeight: 21,
      marginTop: 7,
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: palette.text,
      borderRadius: 6,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    retryLabel: {
      color: palette.background,
      fontFamily: fonts.medium,
      fontSize: 14,
    },
    serverLabel: {
      color: palette.textMuted,
      fontFamily: fonts.mono,
      fontSize: 11,
      textAlign: "center",
      marginTop: 12,
      paddingHorizontal: 24,
    },
    pressed: { opacity: 0.62 },
  })
}
