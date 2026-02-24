import { createRoot } from "react-dom/client";
import App from "./App";

function applyScale() {
  const baseWidth = 1100;
  const baseHeight = 750;
  const scaleX = window.innerWidth / baseWidth;
  const scaleY = window.innerHeight / baseHeight;
  const scale = Math.min(scaleX, scaleY);
  document.documentElement.style.fontSize = `${scale * 16}px`;
}

applyScale();
window.addEventListener("resize", applyScale);

createRoot(document.getElementById("root")).render(<App />);