import { Platform, useColorScheme } from "react-native"

export type Palette = {
  background: string
  surface: string
  surfaceMuted: string
  text: string
  textMuted: string
  border: string
  accent: string
  accentStrong: string
  accentSoft: string
  danger: string
  shadow: string
}

export const palettes: Record<"light" | "dark", Palette> = {
  light: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#F4F4F5",
    text: "#18181B",
    textMuted: "#71717A",
    border: "#E4E4E7",
    accent: "#27272A",
    accentStrong: "#18181B",
    accentSoft: "#F4F4F5",
    danger: "#DC2626",
    shadow: "#000000",
  },
  dark: {
    background: "#18181B",
    surface: "#18181B",
    surfaceMuted: "#27272A",
    text: "#FAFAFA",
    textMuted: "#A1A1AA",
    border: "#3F3F46",
    accent: "#FAFAFA",
    accentStrong: "#FAFAFA",
    accentSoft: "#27272A",
    danger: "#F87171",
    shadow: "#000000",
  },
}

export const fonts = {
  regular: Platform.select({ ios: "System", android: "sans-serif" }),
  medium: Platform.select({ ios: "System", android: "sans-serif-medium" }),
  mono: Platform.select({ ios: "ui-monospace", android: "monospace" }),
}

export function useAppTheme() {
  const scheme: "light" | "dark" = useColorScheme() === "dark" ? "dark" : "light"
  return { palette: palettes[scheme], scheme }
}
