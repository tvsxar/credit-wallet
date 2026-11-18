import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Footer } from "./components/Footer";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Footer />
  </>,
);
