// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import "./styles.css"; // ← ajoute les styles (inputs + layout)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
  <App />
  </React.StrictMode>
);
