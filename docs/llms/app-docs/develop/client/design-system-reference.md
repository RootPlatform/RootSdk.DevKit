---
path: app-docs/develop/client/design-system-reference.md
audience: app
category: guide
summary: Style your apps to match the Root visual style using CSS color variables, spacing, typography, and component patterns provided by the Root SDK.
---

# Design system reference

Style your apps to match the Root visual style using CSS color variables, spacing, typography, and component patterns provided by the Root SDK.

## What is the Root design system?

The Root design system is a set of CSS custom properties (variables) prefixed with `--rootsdk-` that the Root hosting environment injects into your App's client at runtime, plus conventions for spacing, radii, typography, shadows, and component patterns that match Root's first-party UI.

The CSS variables hold the current theme's color values, allowing your App to automatically adapt when the user switches between light and dark mode. Root updates the variables automatically when the theme changes, so your App does not need to know the actual color values. Just reference the variables and they will adapt.

> **Timing note.** Root sets these variables on `document.documentElement` after the App's iframe loads. CSS that references them via `var(--rootsdk-...)` resolves correctly at paint time. JavaScript that reads them via `getComputedStyle().getPropertyValue('--rootsdk-...')` may return empty strings if it runs before Root's first push — subscribe to `RootClientThemeEvent.ThemeUpdate` (see [Theme mode](theme-mode.md)) and read the variables from inside the handler if you need their string values from JS.

If your App needs to perform additional logic when the theme changes (such as updating a canvas or third-party library), see [Theme mode](theme-mode.md).

## Colors

### Color reference

#### Brand colors

| Token | CSS Variable | Description |
|-------|--------------|-------------|
| brandPrimary | `--rootsdk-brand-primary` | Primary brand color, used for primary buttons and key interactive elements |
| brandSecondary | `--rootsdk-brand-secondary` | Secondary brand color, used for success states and accents |
| brandTertiary | `--rootsdk-brand-tertiary` | Tertiary brand color, used for additional accents |

#### Text colors

| Token | CSS Variable | Description |
|-------|--------------|-------------|
| textPrimary | `--rootsdk-text-primary` | Primary text color for headings and body text |
| textSecondary | `--rootsdk-text-secondary` | Secondary text color for less prominent text |
| textTertiary | `--rootsdk-text-tertiary` | Tertiary text color for disabled or placeholder text |
| textWhite | `--rootsdk-text-white` | White text color, used on dark backgrounds regardless of theme |

#### Background colors

| Token | CSS Variable | Description |
|-------|--------------|-------------|
| backgroundPrimary | `--rootsdk-background-primary` | Primary background color for main content areas |
| backgroundSecondary | `--rootsdk-background-secondary` | Secondary background color for cards and panels |
| backgroundTertiary | `--rootsdk-background-tertiary` | Tertiary background color for nested elements and dropdowns |

#### Interactive colors

| Token | CSS Variable | Description |
|-------|--------------|-------------|
| input | `--rootsdk-input` | Background color for input fields |
| border | `--rootsdk-border` | Border color for dividers and element boundaries |
| link | `--rootsdk-link` | Color for links and clickable text |
| muted | `--rootsdk-muted` | Muted color for disabled states and subtle elements |
| highlightLight | `--rootsdk-highlight-light` | Light highlight for subtle hover states |
| highlightNormal | `--rootsdk-highlight-normal` | Normal highlight for standard hover states |
| highlightStrong | `--rootsdk-highlight-strong` | Strong highlight for active/pressed states |

#### Status colors

| Token | CSS Variable | Description |
|-------|--------------|-------------|
| info | `--rootsdk-info` | Info/notice color for informational messages |
| warning | `--rootsdk-warning` | Warning color for caution states |
| error | `--rootsdk-error` | Error color for error states and destructive actions |

### Use colors in CSS

Reference Root color variables in your stylesheets using the standard CSS `var()` function.

#### Basic usage

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

#### Input fields

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

#### Status messages

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

#### Links and interactive elements

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

#### Cards and containers

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

## Spacing

Use consistent spacing values for padding and margins. Pick the smallest value that gives the layout room to breathe — defaulting to larger values for "comfort" usually reads as inflated rather than generous.

| Name | Value | Use for |
|------|-------|---------|
| none | `0` | No spacing |
| xs | `4px` | Gap between an inline icon and its adjacent label |
| sm | `8px` | Gap between related controls in a horizontal row |
| md | `12px` | Gap between elements within a vertical form, between a label and its input |
| lg | `16px` | Panel/card internal padding; gap between sibling cards in a stack |
| xl | `20px` | Gap between sections within a panel; modal internal padding |
| 2xl | `24px` | Gap between major content sections on a page |
| 3xl | `32px` | Page-level vertical rhythm between unrelated content blocks |
| 4xl | `48px` | Hero/empty-state vertical spacing; rarely needed inside form layouts |

## Border radius

Root uses rounded corners extensively. **Default to `12px` (lg) for inputs, panels, and cards.** Anything smaller will read as inconsistent next to Root's first-party UI; reach for `8px` (md) only when the element is genuinely small (a list item inside a dropdown, an inline tag) and `6px` (sm) only for icon buttons or close buttons.

| Name | Value | Use case |
|------|-------|----------|
| none | `0` | Sharp corners |
| sm | `6px` | Icon buttons, close buttons |
| md | `8px` | List items, dropdown options, inline tags |
| lg | `12px` | **Default for inputs, panels, cards** |
| xl | `16px` | Prominent containers (hero panels, large modals) |
| full | `9999px` | Pills, buttons, avatars, switches |

## Border width

| Name | Value | Description |
|------|-------|-------------|
| none | `0` | No border |
| default | `1px` | Standard border width for inputs, cards, dividers |
| thick | `2px` | Emphasized borders for focus states |

## Shadows

Use shadows for modals, dropdowns, and popovers.

| Name | Value | Description |
|------|-------|-------------|
| none | `none` | No shadow |
| sm | `0 2px 4px rgba(0, 0, 0, 0.1)` | Subtle shadow for slight elevation |
| md | `0 4px 8px rgba(0, 0, 0, 0.15)` | Medium shadow for cards |
| lg | `0 0 12px rgba(0, 0, 0, 0.5)` | Large shadow for modals, dropdowns, popovers |

## Typography

### Font family

- **Sans:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Mono:** `source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace`

### Font sizes

| Name | Size | Line height | Description |
|------|------|-------------|-------------|
| xs | `12px` | `16px` | Extra small text for captions, badges |
| sm | `13px` | `20px` | Small text for status indicators |
| base | `14px` | `20px` | Base text size for body content, buttons |
| lg | `16px` | `24px` | Large text for input placeholders |
| xl | `20px` | `32px` | Extra large for modal titles |
| 2xl | `24px` | `32px` | Major headings |

### Font weights

| Name | Value | Use for |
|------|-------|---------|
| normal | `400` | Body text, placeholders |
| medium | `450` | Modal/drawer titles |
| semibold | `500` | **Default for headings, panel titles, buttons** |
| bold | `600` | Inline strong emphasis only — single words or short runs within a paragraph |

Default to `500` for headings and panel titles. Reserve `600` for genuine emphasis inside running text. Using `600` for routine headings reads heavier than Root's first-party UI and makes the page feel shouty.

## Section header conventions

Root's first-party UI uses two distinct section-header styles. Pick the right one based on whether the header sits at the top level of a page or labels a sub-section inside a containing card.

### Top-level content sections

Use sentence-case bold text in the primary text color, optionally followed by a secondary description. Use this for page-scoped section titles that introduce a block of content.

```css
.section-title {
  font-size: 16px; /* font-lg for nested sections; 20px font-xl for page titles */
  font-weight: 500;
  color: var(--rootsdk-text-primary);
  margin: 0;
}

.section-description {
  font-size: 13px;
  color: var(--rootsdk-text-secondary);
  line-height: 1.4;
  margin: 4px 0 0;
}
```

**Use when:** the header introduces a discrete content section at the page level — for example, "Friendship privacy" introducing a block of options, or "Privacy settings" as the page title.

### Sub-section labels inside a container

Use ALL-CAPS, letter-spaced text in secondary color. Use this for labels that mark a sub-section within an already-titled card or panel — INFORMATION, ROLES, USER SETTINGS, etc.

```css
.subsection-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--rootsdk-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 8px;
}
```

**Use when:** the label sits inside a containing card and marks a region of that card. The container itself already has identity (a parent title, a drawer chrome, a sidebar group); the sub-label just announces what kind of content follows.

### Picking between them

| Context | Style |
|---------|-------|
| Page title at the top of a route | Top-level (sentence-case bold) |
| Section heading that introduces a block of cards | Top-level (sentence-case bold) |
| Label inside a section card that announces "here are the roles" or "here is the metadata" | Sub-section (ALL-CAPS) |
| Group label in a sidebar or navigation panel | Sub-section (ALL-CAPS) |
| Heading inside a modal body | Top-level (sentence-case bold) |

Mixing styles across siblings (one section in caps, the next in sentence-case at the same nesting level) reads as inconsistent. If two headings sit at the same level, they should use the same style.

## Transitions

| Name | Duration | Description |
|------|----------|-------------|
| fast | `150ms` | Fast transitions for switches, micro-interactions |
| normal | `200ms` | Standard transition speed for hover states |
| slow | `300ms` | Slower transitions for larger elements |

## Component patterns

Common component styles extracted from Root first-party apps.

### panel

Standard panel/card container with rounded corners.

```css
.panel {
  background-color: var(--rootsdk-background-secondary);
  border-radius: 12px;
  padding: 16px;
  min-height: 80px;
}

.panel-bordered {
  border: 1px solid var(--rootsdk-border);
}
```

### input

Text input field with focus state.

```css
.input {
  background-color: var(--rootsdk-input);
  border: 1px solid var(--rootsdk-border);
  border-radius: 12px;
  padding: 14px 20px;
  color: var(--rootsdk-text-primary);
  font-size: 14px;
  line-height: 20px;
}

.input::placeholder {
  color: var(--rootsdk-text-tertiary);
  font-weight: 400;
}

.input:focus {
  outline: none;
  border-color: var(--rootsdk-brand-primary);
}
```

### button-primary

Primary action button (pill-shaped).

```css
.button-primary {
  background-color: var(--rootsdk-text-primary);
  color: var(--rootsdk-background-tertiary);
  border: none;
  border-radius: 9999px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 200ms;
}

.button-primary:hover {
  opacity: 0.7;
}

.button-primary:active {
  opacity: 0.5;
  transform: scale(0.98);
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### button-outline

Secondary outlined button (pill-shaped).

```css
.button-outline {
  background-color: transparent;
  color: var(--rootsdk-text-primary);
  border: 1px solid var(--rootsdk-text-tertiary);
  border-radius: 9999px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 200ms;
}

.button-outline:hover {
  opacity: 0.7;
}

.button-outline:active {
  opacity: 0.5;
  transform: scale(0.98);
}

.button-outline:disabled {
  opacity: 0.5;
  border-color: rgba(var(--rootsdk-text-tertiary), 0.4);
  cursor: not-allowed;
}
```

### button-danger

Destructive action button.

```css
.button-danger {
  background-color: var(--rootsdk-error);
  color: var(--rootsdk-text-white);
  border: none;
  border-radius: 9999px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 200ms;
}

.button-danger:hover {
  opacity: 0.7;
}

.button-danger:active {
  opacity: 0.5;
  transform: scale(0.98);
}
```

### modal

Modal dialog container.

**When to choose modal vs inline-edit:**

- **Inline-edit** is the right default for editing a single item that's already on screen — toggling a card between view and edit mode keeps the context, costs no layout shift, and works well at small widths.
- **Modal** is the right choice when the form is browse-and-pick (selecting from a long list of options), when the form is heavy enough that displacing it inline would push other content out of view, or when the action is decisive and demands the user's full focus (confirmations, destructive prompts).

If you choose a modal, ensure it works at 320px width — Root's web client embeds your App in widths that can be narrow.

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  padding: 16px; /* Ensure modal doesn't touch edges on small screens */
}

.modal-content {
  background-color: var(--rootsdk-background-primary);
  border: 1px solid var(--rootsdk-border);
  border-radius: 8px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
  max-width: 688px;
  width: 100%; /* Responsive: fill available width on small screens */
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: var(--rootsdk-background-primary);
}

.modal-title {
  font-size: 20px;
  font-weight: 450;
  line-height: 32px;
}

.modal-body {
  flex: 1;
  padding: 0 24px;
  overflow-y: auto;
}
```

### inline-edit

Inline edit pattern for responsive UIs. The item switches between view and edit modes in place, avoiding modals. Recommended over modals for small screens and mobile.

```css
/* Inline edit: item toggles between view and edit mode */
.item-card {
  background-color: var(--rootsdk-background-secondary);
  border-radius: 8px;
  padding: 12px 16px;
}

/* View mode: display content with edit button */
.item-view {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.item-content {
  flex: 1;
  min-width: 0; /* Allow text truncation */
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Edit mode: inline form replaces view */
.item-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-edit-input {
  background-color: var(--rootsdk-input);
  border: 1px solid var(--rootsdk-border);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--rootsdk-text-primary);
  font-size: 14px;
  width: 100%;
}

.item-edit-input:focus {
  outline: none;
  border-color: var(--rootsdk-brand-primary);
}

.item-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Usage: toggle isEditing state
   {isEditing ? <ItemEdit /> : <ItemView />} */
```

### dropdown

Dropdown/select menu.

```css
.dropdown {
  position: absolute;
  z-index: 100;
  background-color: var(--rootsdk-background-tertiary);
  border: 1px solid var(--rootsdk-border);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-option {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 150ms;
}

.dropdown-option:hover,
.dropdown-option.selected {
  background-color: var(--rootsdk-highlight-normal);
}
```

### switch

Toggle switch component.

```css
.switch {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--rootsdk-highlight-normal);
  border-radius: 9999px;
  cursor: pointer;
  transition: background-color 150ms;
}

.switch[data-state="checked"] {
  background-color: var(--rootsdk-brand-primary);
}

.switch-thumb {
  display: block;
  width: 20px;
  height: 20px;
  background-color: var(--rootsdk-text-primary);
  border-radius: 50%;
  transition: transform 150ms;
  transform: translateX(2px);
}

.switch[data-state="checked"] .switch-thumb {
  transform: translateX(22px);
}
```

### icon-button

Square icon button.

```css
.icon-button {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  border-radius: 6px;
  aspect-ratio: 1;
  cursor: pointer;
  color: var(--rootsdk-text-tertiary);
  transition: background-color 150ms, color 150ms;
}

.icon-button:hover {
  background-color: var(--rootsdk-highlight-strong);
  color: var(--rootsdk-text-primary);
}
```

### list-item

Clickable list item with hover state.

```css
.list-item {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 150ms;
}

.list-item:hover {
  background-color: var(--rootsdk-highlight-normal);
}
```

### selectable-card

Selectable card — a row in a vertical list of options where the user picks one (or several) by clicking. The selected state is signaled by a brand-colored border around the entire row, not just by a filled checkbox or radio indicator. This is the canonical "you've picked this" affordance in Root's UI; a fill-only indicator reads quieter than the rest of the platform.

Use for: a list of mutually-exclusive options (privacy modes, role categories), a list of multi-select options (notification preferences), or any pick-from-a-set surface where the row is the unit of selection.

```css
.selectable-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background-color: var(--rootsdk-background-secondary);
  border: 1px solid var(--rootsdk-border);
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 150ms, border-color 150ms;
  text-align: left;
}

.selectable-card:hover:not([aria-disabled="true"]) {
  background-color: var(--rootsdk-highlight-light);
}

.selectable-card[aria-selected="true"],
.selectable-card[aria-checked="true"] {
  /* Use a thicker border in the brand color so the row pops against the
     surrounding cards. The 1px → 1.5px change is what makes the row read
     as selected; without it, only an inner indicator changes and the
     selection signal is too quiet. */
  border-width: 1.5px;
  border-color: var(--rootsdk-brand-primary);
}

.selectable-card[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### status-banner

Inline status banner — tinted background, matching colored border, ALL-CAPS colored title, secondary-color body text. Use for transient status (`UPDATE AVAILABLE`, `Couldn't save`, `Action required`) that needs to stand out from the surrounding content without being a full modal.

The recipe uses `color-mix` to derive the background and border tints from a status color, so a single status family (`info`, `warning`, `error`) drives all three coordinated colors. Substitute `info` for `warning` or `error` to recolor.

```css
.status-banner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 12px;
  /* Tint the bg by 12% of the status color, border by 40%. The numbers
     are calibrated so the banner reads clearly without being loud; lower
     bg alpha and the banner disappears, higher and it competes with
     primary content. */
  background-color: color-mix(in srgb, var(--rootsdk-info) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--rootsdk-info) 40%, transparent);
}

.status-banner-title {
  color: var(--rootsdk-info);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-banner-body {
  color: var(--rootsdk-text-secondary);
  font-size: 14px;
  line-height: 20px;
}

/* For a warning banner: replace `--rootsdk-info` with `--rootsdk-warning`.
   For an error banner: replace with `--rootsdk-error`. The 12% / 40% mix
   percentages stay the same. */
```

### sub-setting-row

Sub-setting row — a "modifier" toggle that sits inside a parent section card, typically below the section's primary content. Title and description on the left, switch (or other compact control) on the right. Used for things like "Require verified users" beneath a primary privacy choice, or "Notify when expired" beneath a primary scheduling choice.

```css
.sub-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  /* Hairline divider above so the modifier visually attaches to the
     section's primary content but stays separated. Skip the border if
     this is the only sub-setting in the section. */
  border-top: 1px solid var(--rootsdk-border);
}

.sub-setting-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.sub-setting-row-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--rootsdk-text-primary);
}

.sub-setting-row-description {
  font-size: 13px;
  color: var(--rootsdk-text-secondary);
  line-height: 1.4;
}

/* Right side hosts a Switch (see the `switch` component pattern) or any
   other compact control. Don't use a full-pill button here — the row's
   visual weight is meant to read as secondary. */
```

### tabs

Top-level tab bar with a thick brand-colored underline indicating the active tab. Inactive tabs use `text-secondary`; active uses `text-primary`. Bottom border on the tab bar gives a clear separation from the panel content below.

```css
.tab-bar {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--rootsdk-border);
}

.tab {
  padding: 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--rootsdk-text-secondary);
  background: transparent;
  border: none;
  /* Reserve 2px at the bottom for the active indicator so switching
     tabs doesn't shift the row's height. */
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
}

.tab:hover {
  color: var(--rootsdk-text-primary);
}

.tab[aria-selected="true"] {
  color: var(--rootsdk-text-primary);
  border-bottom-color: var(--rootsdk-brand-primary);
}
```

### destructive-section

Destructive-action section — a card dedicated to a single dangerous action (delete, reset, remove). Section label + description on the left, filled red button on the right. Visually separates the action from normal config so members don't trigger it by accident while exploring.

```css
.destructive-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background-color: var(--rootsdk-background-secondary);
  border: 1px solid var(--rootsdk-border);
  border-radius: 12px;
}

.destructive-section-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.destructive-section-label {
  /* See "Section header conventions" — uses the sub-section ALL-CAPS
     style because this label sits inside a card. */
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--rootsdk-text-secondary);
}

.destructive-section-description {
  font-size: 14px;
  color: var(--rootsdk-text-secondary);
  line-height: 20px;
}

/* Right side hosts a button-danger (see button-danger pattern). */
```

### settings-sidebar

Vertical settings sidebar with grouped section labels and an active-item highlight. Use for multi-page settings surfaces (Account / Privacy / Audio / Theme), where each item swaps the right-pane content. Includes an identity card at the top and a footer slot (typically Sign out).

```css
.settings-sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  padding: 16px;
  background-color: var(--rootsdk-background-secondary);
  border-right: 1px solid var(--rootsdk-border);
  overflow-y: auto;
}

.settings-sidebar-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 16px;
  /* Identity card hosts avatar + name + status. Style as you would any
     compact user-card surface. */
}

.settings-sidebar-group-label {
  /* Uses the sub-section ALL-CAPS treatment — see "Section header
     conventions". Spacing differs from in-card sub-labels: extra space
     above to separate from the previous group. */
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--rootsdk-text-secondary);
  padding: 0 12px;
  margin: 16px 0 4px;
}

.settings-sidebar-group-label:first-of-type {
  margin-top: 0;
}

.settings-sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--rootsdk-text-secondary);
  cursor: pointer;
  transition: background-color 150ms, color 150ms;
}

.settings-sidebar-item:hover {
  background-color: var(--rootsdk-highlight-light);
  color: var(--rootsdk-text-primary);
}

.settings-sidebar-item[aria-current="page"] {
  background-color: var(--rootsdk-highlight-normal);
  color: var(--rootsdk-text-primary);
  font-weight: 500;
}

.settings-sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--rootsdk-border);
}
```

### button-quiet

Quiet/secondary button — flat tinted background, no border, smaller padding than the full-pill `button-primary`. Use for inline secondary actions where `button-outline`'s visible border reads too declarative (a "Manage" button next to a list, an "Edit" button inside a card).

Pairs naturally with `button-primary` or `button-danger` as the louder peer in a primary-secondary pair.

```css
.button-quiet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--rootsdk-highlight-light);
  color: var(--rootsdk-text-primary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms;
}

.button-quiet:hover {
  background-color: var(--rootsdk-highlight-normal);
}

.button-quiet:active {
  background-color: var(--rootsdk-highlight-strong);
  transform: scale(0.98);
}

.button-quiet:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```