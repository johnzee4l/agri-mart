import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LazyMotion, domAnimation } from "motion/react";

import "@fontsource-variable/sora";
import "@fontsource-variable/manrope";
import "./styles/theme.css";

import App from "./App.jsx";
import { AuthProvider } from "./lib/auth.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </LazyMotion>
  </StrictMode>,
);
