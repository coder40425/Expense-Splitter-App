import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";      // tailwind layers
import "./styles/globals.css";  // your custom global styles

createRoot(document.getElementById("root")!).render(<App />);
