import type { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TMail",
  slug: "tmail-mobile",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "tmail",
  userInterfaceStyle: "automatic",
  icon: "../web/public/apple-touch-icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER ?? "app.tmail.mobile",
  },
  android: {
    package: process.env.ANDROID_PACKAGE ?? "app.tmail.mobile",
    adaptiveIcon: {
      foregroundImage: "../web/public/apple-touch-icon.png",
      backgroundColor: "#FFFFFF",
    },
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-sqlite",
    [
      "expo-splash-screen",
      {
        image: "../web/public/apple-touch-icon.png",
        imageWidth: 112,
        resizeMode: "contain",
        backgroundColor: "#FFFFFF",
        dark: {
          backgroundColor: "#18181B",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
})
