import { useMemo } from "react"
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ArrowLeft, ChevronRight, Frown, Mail, Trash2 } from "lucide-react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { fonts, useAppTheme } from "@/constants/theme"
import { useMailbox } from "@/context/mailbox-context"

export default function HistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { palette } = useAppTheme()
  const styles = useMemo(() => makeStyles(palette), [palette])
  const { history, changeAddress, removeHistoryAddress, clearHistory } = useMailbox()

  function confirmClear() {
    Alert.alert(
      "Effacer l’historique ?",
      "Les anciennes adresses disparaîtront uniquement de cet appareil.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Tout effacer",
          style: "destructive",
          onPress: () => void clearHistory(),
        },
      ],
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Pressable
            accessibilityLabel="Retour"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={palette.text} size={19} />
          </Pressable>
          <Text style={styles.title}>Historique</Text>
          <View style={styles.headerSpacer} />
          {history.length > 0 && (
            <Pressable
              accessibilityLabel="Tout effacer"
              onPress={confirmClear}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
            >
              <Text style={styles.clearLabel}>Tout effacer</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        style={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeading}>
            <Text style={styles.listTitle}>Adresses précédentes</Text>
            <Text style={styles.listDescription}>
              {history.length} adresse{history.length > 1 ? "s" : ""} enregistrée{history.length > 1 ? "s" : ""}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() => {
                void changeAddress(item).then(() => router.back())
              }}
              style={({ pressed }) => [styles.switchArea, pressed && styles.rowPressed]}
            >
              <Mail color={palette.textMuted} size={17} />
              <Text numberOfLines={1} style={styles.address}>
                {item}
              </Text>
              <ChevronRight color={palette.textMuted} size={17} />
            </Pressable>
            <Pressable
              accessibilityLabel={`Supprimer ${item}`}
              onPress={() => void removeHistoryAddress(item)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Trash2 color={palette.textMuted} size={17} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyRow}>
            <Frown color={palette.textMuted} size={20} />
            <Text style={styles.emptyText}>Aucune ancienne adresse</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
    clearButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 8 },
    clearLabel: { color: palette.danger, fontFamily: fonts.medium, fontSize: 12 },
    list: { width: "100%", maxWidth: 640, alignSelf: "center" },
    listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 20 },
    listHeading: { marginBottom: 14 },
    listTitle: { color: palette.text, fontFamily: fonts.medium, fontSize: 18 },
    listDescription: { color: palette.textMuted, fontSize: 13, marginTop: 4 },
    row: { flexDirection: "row", alignItems: "stretch", gap: 4, marginBottom: 8 },
    switchArea: {
      flex: 1,
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 12,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
    },
    rowPressed: { backgroundColor: palette.surface },
    address: { flex: 1, color: palette.textMuted, fontFamily: fonts.mono, fontSize: 12 },
    deleteButton: {
      width: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
    },
    emptyRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
    },
    emptyText: { color: palette.textMuted, fontSize: 13 },
    pressed: { opacity: 0.6 },
  })
}
