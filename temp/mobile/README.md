# TMail Mobile

Application Expo SDK 57 / React Native 0.86 pour iOS et Android. Elle utilise le serveur Go de ce
dépôt et reprend les fonctions du site : adresse aléatoire ou personnalisée, relève
en temps réel, historique local, lecture sécurisée des messages et pièces jointes.
Le projet utilise la nouvelle architecture React Native, obligatoire à partir
d’Expo SDK 55.

## Lancer en développement

```bash
cd mobile
pnpm install
cp .env.example .env.local
pnpm start
```

Renseigner `EXPO_PUBLIC_API_URL` avec l’URL du serveur TMail. Sur un téléphone
physique, `localhost` désigne le téléphone lui-même : utiliser l’adresse IP locale de
la machine qui lance le serveur (par exemple `http://192.168.1.20:3000`). Une URL HTTPS
est requise pour une version destinée aux stores.

`pnpm start:go` force l’ouverture dans Expo Go. Expo Go ne prend en charge qu’un SDK
Expo à la fois : l’application installée sur le téléphone doit donc accepter le SDK 57.

Pour éviter cette dépendance à la version d’Expo Go, créer une development build puis
utiliser `pnpm start:dev` :

```bash
pnpm dlx eas-cli@latest build --platform android --profile development
pnpm start:dev
```

Les commandes `pnpm android` et `pnpm ios` ouvrent directement la plateforme ciblée.
La compilation iOS native locale nécessite macOS et Xcode ; une development build ou
EAS Build permet néanmoins de travailler depuis Linux ou Windows.

## Turnstile

Lorsque Turnstile est activé côté serveur, l’app ouvre la vérification officielle dans
une WebView. Le serveur renvoie ensuite un jeton signé, conservé avec
`expo-secure-store` et envoyé dans l’en-tête `Authorization`. Le site web continue à
utiliser son cookie HTTP-only comme auparavant.

Il faut reconstruire le front Astro et redéployer le serveur après l’ajout du pont
mobile :

```bash
cd web
bun run build
```

## Builds de distribution

Changer `IOS_BUNDLE_IDENTIFIER` et `ANDROID_PACKAGE`, puis initialiser le projet EAS :

```bash
eas build:configure
eas build --platform all --profile preview
eas build --platform all --profile production
```

Les identifiants de bundle doivent appartenir aux comptes développeur Apple et Google
qui publieront l’application.
