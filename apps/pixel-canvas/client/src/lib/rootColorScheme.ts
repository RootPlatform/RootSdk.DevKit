import { rootClient, RootClientThemeEvent } from "@rootsdk/client-app";
import type { RootThemeMode } from "@rootsdk/client-app";

// ============================================================================
// rootColorScheme — bridge Root's current theme to the CSS `color-scheme`
// property on <html>.
//
// Why: native form controls (number-input spin buttons, date pickers, the
// scrollbar on overflow containers, <select> dropdowns) render with
// browser-default chrome that follows the document's `color-scheme`. On a
// dark Root surface, the default light chrome looks washed out; on a light
// surface, dark chrome would be too heavy. Setting `color-scheme` at the
// document root keeps those controls in step with Root's theme without
// per-component CSS overrides.
//
// Root's theme is the source of truth: `rootClient.theme.getTheme()` for
// the current value and `rootClient.theme.on(ThemeUpdate, ...)` for
// runtime changes (user toggles Root's theme from dark to light, etc.).
// ============================================================================

function apply(mode: RootThemeMode): void {
  document.documentElement.style.colorScheme = mode;
}

export function initializeRootColorScheme(): void {
  apply(rootClient.theme.getTheme());
  rootClient.theme.on(RootClientThemeEvent.ThemeUpdate, apply);
}
