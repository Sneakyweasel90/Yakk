import { useTheme } from "../context/ThemeContext";
import { APP_VERSION } from "../version";

export default function TitleBar() {
  const { theme } = useTheme();

  return (
    <div style={{
      ...styles.titlebar,
      background: theme.surface2,
      borderBottom: `1px solid ${theme.border}`,
    }}>
      <span style={{ ...styles.title, color: theme.primary }}>
        YAKK <span style={{ color: theme.textDim, fontSize: "0.6rem" }}>v{APP_VERSION}</span>
      </span>
      <div style={styles.controls}>
        <button
          style={{ ...styles.btn, color: theme.textDim }}
          onClick={() => window.electronAPI?.minimize()}
        >─</button>
        <button
          style={{ ...styles.btn, color: theme.textDim }}
          onClick={() => window.electronAPI?.maximize()}
        >□</button>
        <button
          style={{ ...styles.btn, color: theme.error }}
          onClick={() => window.electronAPI?.close()}
        >✕</button>
      </div>
    </div>
  );
}

const styles = {
  titlebar: {
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "1rem",
    WebkitAppRegion: "drag",
    userSelect: "none",
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Orbitron', monospace",
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.2em",
  },
  controls: { display: "flex", WebkitAppRegion: "no-drag" },
  btn: {
    width: "46px", height: "32px", border: "none",
    background: "transparent", cursor: "pointer",
    fontSize: "0.9rem", transition: "all 0.15s",
    WebkitAppRegion: "no-drag",
  },
};