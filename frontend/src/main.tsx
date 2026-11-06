import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import 'primereact/resources/themes/saga-blue/theme.css';  // or another theme
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
// Token de connexion sur tous les appels API (doit être importé avant les pages)
// @ts-ignore
import "./backend/authHttp";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
// @ts-ignore
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>,
);
