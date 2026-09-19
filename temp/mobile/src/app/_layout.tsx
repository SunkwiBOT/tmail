import { useEffect, useMemo } from "react"
import { View } from "react-native"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { useAppTheme } from "@/constants/theme"
import { MailboxProvider, useMailbox } from "@/context/mailbox-context"

void SplashScreen.preventAutoHideAsync()

function Navigator() {
  const { hydrated } = useMailbox()
  const { palette, scheme } = useAppTheme()
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: palette.background },
      animation: "slide_from_right" as const,
    }),
    [palette.background],
  )

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync()
  }, [hydrated])

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: palette.background }} />

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="message/[id]" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MailboxProvider>
        <Navigator />
      </MailboxProvider>
    </SafeAreaProvider>
  )
}
