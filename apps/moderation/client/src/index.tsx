import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeRootColorScheme } from "./lib/rootColorScheme";
import "./styles/globals.css";

initializeRootColorScheme();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
