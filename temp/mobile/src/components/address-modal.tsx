import { useEffect, useMemo, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AlertTriangle, Check, ChevronDown } from "lucide-react-native"

import { fonts, useAppTheme } from "@/constants/theme"

type Props = {
  visible: boolean
  currentAddress: string
  domains: string[]
  onClose: () => void
  onConfirm: (address: string) => void
}

export function AddressModal({
  visible,
  currentAddress,
  domains,
  onClose,
  onConfirm,
}: Props) {
  const { palette } = useAppTheme()
  const styles = useMemo(() => makeStyles(palette), [palette])
  const [localPart, setLocalPart] = useState("")
  const [domain, setDomain] = useState("")
  const [domainMenuOpen, setDomainMenuOpen] = useState(false)

  useEffect(() => {
    if (!visible) return
    const [nextLocal = "", currentDomain = domains[0] ?? ""] =
      currentAddress.split("@")
    setLocalPart(nextLocal)
    setDomain(currentDomain)
    setDomainMenuOpen(false)
  }, [currentAddress, domains, visible])

  const valid = localPart.length > 0 && domain.length > 0

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.dialog}>
          <Text style={styles.title}>Modifier l’adresse</Text>
          <View style={styles.warning}>
            <AlertTriangle color={palette.textMuted} size={19} strokeWidth={1.8} />
            <Text style={styles.warningText}>
              Cette adresse est publique. Utilisez-la à vos propres risques.
            </Text>
          </View>

          <View style={styles.addressEditor}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={64}
              placeholder="ma-boite"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.text}
              value={localPart}
              onChangeText={(value) =>
                setLocalPart(value.replace(/[^a-zA-Z0-9._-]/g, ""))
              }
              style={styles.input}
            />
            <View style={styles.atBadge}>
              <Text style={styles.at}>@</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choisir le domaine"
              onPress={() => setDomainMenuOpen((open) => !open)}
              style={({ pressed }) => [styles.domainTrigger, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={styles.domainTriggerText}>
                {domain || "Domaine"}
              </Text>
              <ChevronDown color={palette.textMuted} size={16} />
            </Pressable>
          </View>

          {domainMenuOpen && (
            <ScrollView style={styles.domainMenu} nestedScrollEnabled>
              {domains.map((item, index) => {
                const selected = item === domain
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setDomain(item)
                      setDomainMenuOpen(false)
                    }}
                    style={({ pressed }) => [
                      styles.domainOption,
                      index > 0 && styles.domainOptionBorder,
                      pressed && styles.domainOptionPressed,
                    ]}
                  >
                    <Text style={styles.domainOptionText}>{item}</Text>
                    {selected && <Check color={palette.text} size={16} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <Text style={styles.buttonLabel}>Annuler</Text>
            </Pressable>
            <Pressable
              disabled={!valid}
              onPress={() => onConfirm(`${localPart.toLowerCase()}@${domain}`)}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                !valid && styles.disabled,
                pressed && valid && styles.pressed,
              ]}
            >
              <Text style={styles.confirmLabel}>Confirmer</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function makeStyles(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "rgba(0,0,0,0.78)",
    },
    dialog: {
      width: "100%",
      maxWidth: 420,
      padding: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
      shadowColor: palette.shadow,
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    title: { color: palette.text, fontFamily: fonts.medium, fontSize: 18 },
    warning: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 8,
      marginBottom: 20,
    },
    warningText: { flex: 1, color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    addressEditor: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    input: {
      minWidth: 0,
      flex: 0.9,
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text,
      backgroundColor: palette.background,
      fontFamily: fonts.mono,
      fontSize: 13,
      textAlign: "right",
    },
    atBadge: {
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 3,
      backgroundColor: palette.surfaceMuted,
    },
    at: { color: palette.text, fontFamily: fonts.mono, fontSize: 14 },
    domainTrigger: {
      minWidth: 0,
      height: 40,
      flex: 1.15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 11,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
    },
    domainTriggerText: {
      flex: 1,
      color: palette.text,
      fontFamily: fonts.mono,
      fontSize: 12,
    },
    domainMenu: {
      maxHeight: 160,
      marginTop: 6,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 6,
      backgroundColor: palette.background,
    },
    domainOption: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },
    domainOptionBorder: { borderTopWidth: 1, borderTopColor: palette.border },
    domainOptionPressed: { backgroundColor: palette.surfaceMuted },
    domainOptionText: { color: palette.text, fontFamily: fonts.mono, fontSize: 13 },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 24,
    },
    button: {
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
    },
    buttonLabel: { color: palette.text, fontFamily: fonts.medium, fontSize: 13 },
    confirmButton: { borderColor: palette.text, backgroundColor: palette.text },
    confirmLabel: { color: palette.background, fontFamily: fonts.medium, fontSize: 13 },
    disabled: { opacity: 0.35 },
    pressed: { opacity: 0.65 },
  })
}
