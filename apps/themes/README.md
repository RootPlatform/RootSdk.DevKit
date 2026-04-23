# themes

UI theming showcase — a browsable reference for every Root design token, common UI patterns, and icon library. Client-only; the server is a stub.

## Coverage scope

**Demonstrates:** full inventory of `--rootsdk-*` CSS tokens (brand, text, background, surface, interactive, status, mention), dark/light mode detection via `rootClient.theme.getTheme()` and the `RootClientThemeEvent.ThemeUpdate` event, copy-paste-ready styled components (buttons, inputs, badges, alerts, modals, sliders, etc.), icon library with metadata, contrast handling for status colors.

**Does NOT demonstrate:**
- Client-server RPC — see [`api-samples/networking-app-services`](../../api-samples/networking-app-services). Server is a stub.
- Persistence — see [`api-samples/server-database`](../../api-samples/server-database) or [`api-samples/server-key-value-store`](../../api-samples/server-key-value-store).
- User identity / profiles — see [`api-samples/client-app-users`](../../api-samples/client-app-users).
- Role/member permissions — see [`api-samples/server-global-settings`](../../api-samples/server-global-settings) and [`api-samples/server-access-rules`](../../api-samples/server-access-rules).
- Scheduling — see [`api-samples/server-jobs`](../../api-samples/server-jobs).

Use this sample as **the** reference for any client UI styling. Any new app with a UI should start by reading its token tables and component patterns before writing CSS.
