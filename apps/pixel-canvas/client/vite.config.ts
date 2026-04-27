import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  server: {
    open: true,
  },
  plugins: [react(), hotReload(), checker({ typescript: true })],
});

// Replace Vite's HMR (hot module replacement) with a full-reload on every
// source/style change. HMR's state-preservation is incompatible with the
// Root devhost's iframe model — partial module swaps inside the iframe
// would leave the SDK's RootClient session in an inconsistent state vs.
// the host. A full reload re-establishes the RPC client and event
// subscriptions cleanly. Keep this plugin when porting to a new app; it
// looks deletable but the dev experience without it is broken in subtle
// ways (broadcasts stop firing, `amIAdmin` goes stale, etc.).
function hotReload() {
  return {
    name: "hotreload-hmr",
    enforce: "post" as const,
    handleHotUpdate({ file, server }: { file: string; server: { ws: { send: (msg: unknown) => void } } }) {
      if (
        file.endsWith(".json") ||
        file.endsWith(".tsx") ||
        file.endsWith(".ts") ||
        file.endsWith(".css")
      ) {
        server.ws.send({
          type: "full-reload",
          path: "*",
        });
      }
    },
  };
}
