---
name: Expo SDK 56 / expo-router v4 + RN7 gotchas
description: Non-obvious framework incompatibilities that silently break bundling or no-op at runtime in this app
---

# Expo SDK 56 / expo-router v4 (React Navigation 7) gotchas

## `useFocusEffect` must come from `expo-router`, not `@react-navigation/native`
As of SDK 56, expo-router is no longer compatible with importing react-navigation
directly. Any `import { ... } from "@react-navigation/native"` inside the `app/`
require.context fails the bundle with: "As of SDK 56, expo-router is no longer
compatible with react-navigation." The fix is to import `useFocusEffect` (and
friends) from `expo-router`.
**Why:** expo-router re-exports the navigation primitives; importing the raw
package trips a build-time guard (can be disabled with
`EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1`, but the right fix is the import).

## RN7 native-stack dropped `headerBackTitleVisible`
On React Navigation 7 / expo-router v4, `headerBackTitleVisible: false` is a
silent no-op (back title still shows on iOS). Use
`headerBackButtonDisplayMode: 'minimal'` instead.
**Why:** the prop was removed in RN7 native-stack. When header options live in a
standalone const (no JSX excess-property check), TypeScript won't flag the dead
prop, so it fails silently.
**How to apply:** any iOS back-button title hiding in Stack screenOptions.
