import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import "./index.css";
import App from "./App.jsx";
import { notify } from "./utils/inPageFeedback";

import { AuthProvider } from "./context/AuthContext.jsx";

window.Buffer = Buffer;

// Guard against duplicate patching during HMR updates.
if (typeof window !== "undefined" && !window.__dpoAlertPatched) {
  window.__dpoAlertPatched = true;
  window.alert = (message) => {
    notify(String(message ?? ""), { type: "info" });
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);