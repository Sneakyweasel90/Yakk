import { useTheme, themes } from "../context/ThemeContext";

export default function ThemePicker({ onClose }) {
  const { theme, themeName, setTheme } = useTheme();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.panel, borderColor: theme.border, background: theme.surface }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.header, borderColor: theme.border }}>
          <span style={{ ...styles.title, color: theme.primary, fontFamily: "'Orbitron', monospace" }}>THEMES</span>
          <button onClick={onClose} style={{ ...styles.close, color: theme.textDim }}>✕</button>
        </div>
        <div style={styles.grid}>
          {Object.entries(themes).map(([key, t]) => (
            <div
              key={key}
              onClick={() => setTheme(key)}
              style={{
                ...styles.themeCard,
                border: `1px solid ${key === themeName ? t.primary : "rgba(255,255,255,0.08)"}`,
                background: t.background,
                boxShadow: key === themeName ? `0 0 12px ${t.primaryGlow}` : "none",
              }}
            >
              <div style={styles.preview}>
                <div style={{ ...styles.previewSidebar, background: t.surface2 }} />
                <div style={{ ...styles.previewMain, background: t.background }}>
                  <div style={{ ...styles.previewMsg, background: t.primaryGlow, borderColor: t.primary }} />
                  <div style={{ ...styles.previewMsg, background: t.primaryGlow, borderColor: t.primary, width: "60%" }} />
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={{
                  ...styles.cardName,
                  color: key === themeName ? t.primary : "rgba(255,255,255,0.5)",
                  fontFamily: "'Share Tech Mono', monospace",
                }}>
                  {key === themeName ? "▶ " : ""}{t.name}
                </span>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: t.primary, boxShadow: `0 0 6px ${t.primary}` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
  },
  panel: {
    width: "480px", borderRadius: "4px", border: "1px solid",
    overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
  },
  header: {
    padding: "1rem 1.25rem", borderBottom: "1px solid",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  title: { fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.2em" },
  close: { background: "none", border: "none", cursor: "pointer", fontSize: "1rem" },
  grid: { padding: "1rem", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", maxHeight: "400px", overflowY: "auto" },
  themeCard: {
    borderRadius: "3px", overflow: "hidden", cursor: "pointer",
    transition: "all 0.2s",
  },
  preview: { display: "flex", height: "50px" },
  previewSidebar: { width: "25%", height: "100%" },
  previewMain: { flex: 1, padding: "6px", display: "flex", flexDirection: "column", gap: "4px" },
  previewMsg: { height: "8px", borderRadius: "1px", border: "1px solid", width: "80%" },
  cardFooter: { padding: "0.35rem 0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: "0.6rem", letterSpacing: "0.05em" },
};