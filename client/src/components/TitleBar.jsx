export default function TitleBar() {
  return (
    <div style={styles.titlebar}>
      <span style={styles.title}>YAKK <span style={styles.version}>v1.0</span></span>
      <div style={styles.controls}>
        <button style={styles.btn} onClick={() => window.electronAPI?.minimize()}>─</button>
        <button style={styles.btn} onClick={() => window.electronAPI?.maximize()}>□</button>
        <button style={{ ...styles.btn, ...styles.close }} onClick={() => window.electronAPI?.close()}>✕</button>
      </div>
      <style>{`
        .ctrl-btn:hover { background: rgba(0,255,159,0.1) !important; }
        .ctrl-close:hover { background: rgba(255,51,102,0.2) !important; color: #ff3366 !important; }
      `}</style>
    </div>
  );
}

const styles = {
  titlebar: {
    height: "32px", background: "#010a05",
    borderBottom: "1px solid rgba(0,255,159,0.15)",
    display: "flex", alignItems: "center",
    justifyContent: "space-between", paddingLeft: "1rem",
    WebkitAppRegion: "drag", userSelect: "none", flexShrink: 0,
  },
  title: {
    fontFamily: "'Orbitron', monospace", fontSize: "0.7rem",
    fontWeight: 700, color: "rgba(0,255,159,0.6)", letterSpacing: "0.2em",
  },
  version: { color: "rgba(0,255,159,0.3)", fontSize: "0.6rem" },
  controls: { display: "flex", WebkitAppRegion: "no-drag" },
  btn: {
    width: "46px", height: "32px", border: "none",
    background: "transparent", color: "rgba(0,255,159,0.4)",
    cursor: "pointer", fontSize: "0.9rem", transition: "all 0.15s",
  },
  close: { color: "rgba(255,51,102,0.6)" },
};