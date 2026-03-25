---
path: app-docs/develop/client/css-colors.md
audience: app
category: guide
summary: Style your App to match the Root theme using CSS color variables provided by the Root SDK.
---

# CSS colors

Style your App to match the Root theme using CSS color variables provided by the Root SDK.

## What are Root CSS colors?

*Root CSS colors* are CSS custom properties (variables) that Root injects into your App's client at runtime. These variables contain the current theme's color values, allowing your App to automatically adapt when the user switches between light and dark mode.

Root updates the CSS color variables automatically when the user switches themes. If your App needs to perform additional logic when the theme changes (such as updating a canvas or third-party library), see [Theme mode](theme-mode.md).

## Available color variables

The Root SDK provides the following CSS color variables:

| Variable | Purpose |
|----------|---------|
| `--rootsdk-brand-primary` | Primary brand color |
| `--rootsdk-brand-secondary` | Secondary brand color |
| `--rootsdk-brand-tertiary` | Tertiary brand color |
| `--rootsdk-text-primary` | Primary text color |
| `--rootsdk-text-secondary` | Secondary text color |
| `--rootsdk-text-tertiary` | Tertiary/muted text color |
| `--rootsdk-text-white` | White text color |
| `--rootsdk-background-primary` | Primary background color |
| `--rootsdk-background-secondary` | Secondary background color |
| `--rootsdk-background-tertiary` | Tertiary background color |
| `--rootsdk-input` | Input field background color |
| `--rootsdk-border` | Border color |
| `--rootsdk-highlight-light` | Light highlight/hover color |
| `--rootsdk-highlight-normal` | Normal highlight/hover color |
| `--rootsdk-highlight-strong` | Strong highlight/hover color |
| `--rootsdk-info` | Informational status color |
| `--rootsdk-warning` | Warning status color |
| `--rootsdk-error` | Error status color |
| `--rootsdk-muted` | Muted/disabled color |
| `--rootsdk-link` | Link color |

## Use Root colors in CSS

Reference Root color variables in your stylesheets using the standard CSS `var()` function.

### Basic usage

```css
.my-component {
  background-color: var(--rootsdk-background-primary);
  color: var(--rootsdk-text-primary);
  border: 1px solid var(--rootsdk-border);
}

.my-button {
  background-color: var(--rootsdk-brand-primary);
  color: var(--rootsdk-text-white);
}

.my-button:hover {
  background-color: var(--rootsdk-highlight-normal);
}
```

### Input fields

```css
.my-input {
  background-color: var(--rootsdk-input);
  border: 1px solid var(--rootsdk-border);
  color: var(--rootsdk-text-primary);
  caret-color: var(--rootsdk-text-primary);
}

.my-input:focus {
  border-color: var(--rootsdk-brand-primary);
}

.my-input::placeholder {
  color: var(--rootsdk-text-tertiary);
}
```

### Status messages

```css
.error-message {
  color: var(--rootsdk-error);
}

.warning-message {
  color: var(--rootsdk-warning);
}

.info-message {
  color: var(--rootsdk-info);
}
```

### Links and interactive elements

```css
a {
  color: var(--rootsdk-link);
}

.clickable-item {
  color: var(--rootsdk-text-primary);
}

.clickable-item:hover {
  background-color: var(--rootsdk-highlight-normal);
}

.muted-text {
  color: var(--rootsdk-muted);
}
```

### Cards and containers

```css
.card {
  background-color: var(--rootsdk-background-secondary);
  border: 1px solid var(--rootsdk-border);
}

.card-header {
  background-color: var(--rootsdk-background-tertiary);
  color: var(--rootsdk-text-primary);
}

.card-content {
  color: var(--rootsdk-text-secondary);
}
```