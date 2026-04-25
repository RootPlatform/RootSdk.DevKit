---
path: app-docs/develop/client/theme-mode.md
audience: app
category: guide
summary: Detect and respond to the user's theme preference in your App client.
---

# Theme mode

Detect and respond to the user's theme preference in your App client.

## What is theme mode?

Root supports two *theme modes*: light and dark. The user controls which mode is active. When the theme changes, Root automatically updates the [CSS color variables](design-system-reference.md) in your App. Most Apps don't need to do anything beyond using those CSS variables.

However, some Apps need to respond programmatically to theme changes. For example:
- Canvas-based rendering that doesn't use CSS
- Third-party libraries that require manual color configuration
- Custom visualizations or charts

The Root SDK provides APIs to get the current theme mode and listen for changes.

## Get the current theme mode

Use `rootClientTheme.getTheme()` to check whether the current theme is light or dark.

```ts
import { rootClientTheme } from "@rootsdk/client-app";

const currentTheme = rootClientTheme.getTheme(); // "light" or "dark"
```

## Listen for theme changes

Subscribe to the `theme.update` event to respond when the user switches themes.

```ts
import { rootClientTheme } from "@rootsdk/client-app";

rootClientTheme.on("theme.update", (themeMode) => {
  console.log("Theme changed to:", themeMode); // "light" or "dark"
});
```

### Example: Update a chart library

```ts
import { rootClientTheme } from "@rootsdk/client-app";

function updateChartColors(theme: "light" | "dark") {
  const colors = theme === "dark"
    ? { background: "#07101B", text: "#FFFFFF" }
    : { background: "#FFFFFF", text: "#000000" };

  myChart.setOptions({
    backgroundColor: colors.background,
    textColor: colors.text,
  });
}

// Set initial colors
updateChartColors(rootClientTheme.getTheme());

// Update when theme changes
rootClientTheme.on("theme.update", updateChartColors);
```