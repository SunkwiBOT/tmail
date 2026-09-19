import { useMemo, useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Globe2,
  Info,
  LockKeyhole,
  Server,
} from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { fonts, useAppTheme } from "@/constants/theme"
import { useMailbox } from "@/context/mailbox-context"
import { normalizeServerUrl } from "@/lib/api"

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useAppTheme()
  const styles = useMemo(() => makeStyles(palette), [palette])
  const { serverUrl, saveServerUrl } = useMailbox()
  const [draftUrl, setDraftUrl] = useState(serverUrl)
  const [saving, setSaving] = useState(false)

  const hasChanges = (() => {
    try {
      return normalizeServerUrl(draftUrl) !== serverUrl
    } catch {
      return draftUrl.trim() !== serverUrl
    }
  })()

  async function save() {
    try {
      setSaving(true)
      await saveServerUrl(draftUrl)
      router.back()
    } catch (caught) {
      Alert.alert(
        "URL invalide",
        caught instanceof Error ? caught.message : "Vérifiez l’adresse du serveur.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Pressable
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={palette.text} size={19} />
          </Pressable>
          <Text style={styles.title}>Réglages</Text>
          <View style={styles.headerSpacer} />
          <Pressable
            accessibilityLabel="Enregistrer"
            disabled={!hasChanges || saving}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.saveButton,
              (!hasChanges || saving) && styles.disabled,
              pressed && hasChanges && styles.pressed,
            ]}
          >
            <Check color={palette.background} size={18} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 28) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>SERVEUR</Text>
        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <Server color={palette.textMuted} size={19} />
            <View style={styles.cardHeadingCopy}>
              <Text style={styles.cardTitle}>Instance TMail</Text>
              <Text style={styles.cardCaption}>L’API Go utilisée par cette application</Text>
            </View>
          </View>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://mail.example.com"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.text}
            value={draftUrl}
            onChangeText={setDraftUrl}
            style={styles.input}
          />
          <Text style={styles.helpText}>
            Sur un téléphone physique, localhost pointe vers le téléphone. Utilisez l’IP
            locale de votre ordinateur en développement, puis une URL HTTPS en production.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>CONFIDENTIALITÉ</Text>
        <View style={styles.card}>
          <InfoRow
            icon={<LockKeyhole color={palette.textMuted} size={18} />}
            title="Sans compte"
            description="L’adresse et son historique restent sur cet appareil."
            styles={styles}
          />
          <View style={styles.separator} />
          <InfoRow
            icon={<Globe2 color={palette.textMuted} size={18} />}
            title="Boîte publique"
            description="Toute personne connaissant l’adresse peut consulter ses messages."
            styles={styles}
          />
          <View style={styles.separator} />
          <InfoRow
            icon={<Info color={palette.textMuted} size={18} />}
            title="Conservation limitée"
            description="Les messages reçus sont supprimés par le serveur après 10 jours."
            styles={styles}
          />
        </View>

        <Text style={styles.sectionLabel}>À PROPOS</Text>
        <Pressable
          onPress={() => void Linking.openURL("https://github.com/sunls24/tmail")}
          style={({ pressed }) => [styles.linkCard, pressed && styles.rowPressed]}
        >
          <View>
            <Text style={styles.cardTitle}>TMail Mobile</Text>
            <Text style={styles.cardCaption}>
              Version {Constants.expoConfig?.version ?? "0.1.0"} · Code source
            </Text>
          </View>
          <ExternalLink color={palette.textMuted} size={17} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

type InfoRowProps = {
  icon: React.ReactNode
  title: string
  description: string
  styles: ReturnType<typeof makeStyles>
}

function InfoRow({ icon, title, description, styles }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </View>
  )
}

function makeStyles(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    header: {
      backgroundColor: palette.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerInner: {
      width: "100%",
      maxWidth: 896,
      minHeight: 48,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { color: palette.text, fontFamily: fonts.medium, fontSize: 15 },
    headerSpacer: { flex: 1 },
    saveButton: {
      width: 36,
      height: 36,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.text,
    },
    disabled: { opacity: 0.3 },
    content: {
      width: "100%",
      maxWidth: 640,
      alignSelf: "center",
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    sectionLabel: {
      color: palette.textMuted,
      fontFamily: fonts.medium,
      fontSize: 10,
      letterSpacing: 1.15,
      marginTop: 20,
      marginBottom: 8,
    },
    card: {
      borderRadius: 6,
      padding: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    cardHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardHeadingCopy: { flex: 1 },
    cardTitle: { color: palette.text, fontFamily: fonts.medium, fontSize: 13 },
    cardCaption: { color: palette.textMuted, fontSize: 11, marginTop: 3 },
    input: {
      height: 42,
      color: palette.text,
      fontFamily: fonts.mono,
      fontSize: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
      paddingHorizontal: 12,
      marginTop: 14,
    },
    helpText: { color: palette.textMuted, fontSize: 11, lineHeight: 17, marginTop: 9 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    infoIcon: { width: 20, alignItems: "center", paddingTop: 1 },
    infoCopy: { flex: 1 },
    infoTitle: { color: palette.text, fontFamily: fonts.medium, fontSize: 13 },
    infoDescription: { color: palette.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: 14,
      marginLeft: 30,
    },
    linkCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 6,
      padding: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    rowPressed: { backgroundColor: palette.surfaceMuted },
    pressed: { opacity: 0.6 },
  })
}
