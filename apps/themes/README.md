# themes

UI theming reference — a browsable inventory of every Root design token, common UI patterns, and the Root icon set. Client-only; the server is a stub.

## When to use this sample

**Use this sample if you want your app to look like Root.** It documents the canonical token-and-component vocabulary used across native Root surfaces. Sticking to it produces an app that feels indistinguishable from the rest of the platform — the same colors, typography, spacing, control shapes, and icon language.

**Skip it if you want a custom look.** Root apps can ship any UI framework or design system you like (Material, Tailwind, custom CSS, your own component library). The platform doesn't enforce visual identity; the only Root-specific concern is responding to `RootClientThemeEvent.ThemeUpdate` so light/dark mode behaves sanely. If you're shipping a deliberately distinct aesthetic, you can ignore everything in `client/src/generated/` and bring your own.

For apps that fall in the middle ("mostly custom but match Root surface chrome where I integrate"), pick tokens à la carte from `design-tokens.json`. Most apps in `apps/` lean heavily on the canonical patterns; a few sample apps deliberately diverge to demonstrate that's allowed.

## Coverage scope

**Demonstrates:** full inventory of `--rootsdk-*` CSS tokens (brand, text, background, surface, interactive, status, mention), dark/light mode detection via `rootClient.theme.getTheme()` and the `RootClientThemeEvent.ThemeUpdate` event, copy-paste-ready styled components (buttons, inputs, badges, alerts, modals, sliders, etc.), the Root icon set with metadata, contrast handling for status colors.

**Does NOT demonstrate:**
- Client-server RPC — see [`api-samples/networking-app-services`](../../api-samples/networking-app-services). Server is a stub.
- Persistence — see [`api-samples/server-database`](../../api-samples/server-database) or [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users).
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules).
- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).
