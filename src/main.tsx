import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// Nota: StrictMode se quitó a propósito. Provoca un crash conocido de
// Radix UI (Portal de Select anidado dentro de un Dialog) por el doble
// montaje/desmontaje que hace en desarrollo -- "Node.removeChild: the
// node to be removed is not a child of this node". Es un problema
// reportado en Radix, no de este código. StrictMode no afecta el build
// de producción de todas formas (React lo ignora fuera de desarrollo),
// así que quitarlo aquí no cambia nada para los usuarios reales.
createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
