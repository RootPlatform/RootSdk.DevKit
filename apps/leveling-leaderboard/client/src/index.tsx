import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeRootColorScheme } from "./lib/rootColorScheme";
import "./styles/globals.css";

// Bridge Root's theme to CSS `color-scheme` before first paint so native
// form controls and scrollbars render with matching chrome. The bridge
// also subscribes to runtime theme changes.
initializeRootColorScheme();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
