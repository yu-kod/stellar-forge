import { GuestProvider } from "@app/identity-client/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { guestSession } from "./lib/guest";
import "@fontsource/dela-gothic-one/400.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/zen-kaku-gothic-new/400.css";
import "@fontsource/zen-kaku-gothic-new/700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <GuestProvider session={guestSession}>
        <App />
      </GuestProvider>
    </BrowserRouter>
  </StrictMode>
);
