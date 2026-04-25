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
