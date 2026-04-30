import { rootClient, RootClientThemeEvent } from "@rootsdk/client-app";
import type { RootThemeMode } from "@rootsdk/client-app";

// Bridge Root's theme to CSS `color-scheme` on <html> so native form
// controls follow the user's light/dark preference.

function apply(mode: RootThemeMode): void {
  document.documentElement.style.colorScheme = mode;
}

export function initializeRootColorScheme(): void {
  apply(rootClient.theme.getTheme());
  rootClient.theme.on(RootClientThemeEvent.ThemeUpdate, apply);
}
