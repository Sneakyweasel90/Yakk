export default function TitleBar() {
  return (
    <div style={styles.titlebar}>
      <span style={styles.title}>🦆 Yakk</span>
      <div style={styles.controls}>
        <button style={styles.btn} onClick={() => window.electronAPI?.minimize()}>─</button>
        <button style={styles.btn} onClick={() => window.electronAPI?.maximize()}>□</button>
        <button style={{ ...styles.btn, ...styles.close }} onClick={() => window.electronAPI?.close()}>✕</button>
      </div>
    </div>
  );
}

const styles = {
  titlebar: {
    height: "32px",
    background: "#0f3460",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "1rem",
    WebkitAppRegion: "drag",
    userSelect: "none",
    flexShrink: 0,
  },
  title: { color: "#e94560", fontWeight: "bold", fontSize: "0.9rem" },
  controls: { display: "flex", WebkitAppRegion: "no-drag" },
  btn: {
    width: "46px", height: "32px", border: "none",
    background: "transparent", color: "#aaa",
    cursor: "pointer", fontSize: "1rem",
  },
  close: { color: "#e94560" },
};