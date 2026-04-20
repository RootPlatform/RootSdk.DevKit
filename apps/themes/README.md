# themes

UI theming showcase — a browsable reference for every Root design token, common UI patterns, and icon library. Client-only; the server is a stub.

## Coverage scope

**Demonstrates:** full inventory of `--rootsdk-*` CSS tokens (brand, text, background, surface, interactive, status, mention), dark/light mode detection via `rootClient.theme.getTheme()` and the `RootClientThemeEvent.ThemeUpdate` event, copy-paste-ready styled components (buttons, inputs, badges, alerts, modals, sliders, etc.), icon library with metadata, contrast handling for status colors.

**Does NOT demonstrate:**
- Client-server RPC — see [`how-to/networking-app-services`](../../how-to/networking-app-services). Server is a stub.
- Persistence — see [`how-to/server-database`](../../how-to/server-database) or [`how-to/server-key-value-store`](../../how-to/server-key-value-store).
- User identity / profiles — see [`how-to/client-app-users`](../../how-to/client-app-users).
- Role/member permissions — see [`how-to/server-global-settings`](../../how-to/server-global-settings) and [`how-to/server-access-rules`](../../how-to/server-access-rules).
- Scheduling — see [`how-to/server-jobs`](../../how-to/server-jobs).

Use this sample as **the** reference for any client UI styling. Any new app with a UI should start by reading its token tables and component patterns before writing CSS.
