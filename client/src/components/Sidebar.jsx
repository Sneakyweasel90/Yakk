const CHANNELS = ["general", "random", "yakking"];

export default function Sidebar({ channel, setChannel, logout, username }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>🦆 Yakk</div>
      <div style={styles.section}>Channels</div>
      {CHANNELS.map((ch) => (
        <div
          key={ch}
          onClick={() => setChannel(ch)}
          style={{ ...styles.channel, ...(ch === channel ? styles.active : {}) }}
        >
          # {ch}
        </div>
      ))}
      <div style={styles.footer}>
        <span style={styles.username}>@{username}</span>
        <button onClick={logout} style={styles.logout}>Logout</button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: { width: "220px", minWidth: "220px", background: "#16213e", display: "flex", flexDirection: "column", borderRight: "1px solid #0f3460" },
  logo: { padding: "1.25rem", fontSize: "1.3rem", fontWeight: "bold", color: "#e94560", borderBottom: "1px solid #0f3460" },
  section: { padding: "1rem 1rem 0.5rem", fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" },
  channel: { padding: "0.5rem 1rem", cursor: "pointer", color: "#aaa", borderRadius: "6px", margin: "0 0.5rem" },
  active: { background: "#0f3460", color: "#fff" },
  footer: { marginTop: "auto", padding: "1rem", borderTop: "1px solid #0f3460", display: "flex", justifyContent: "space-between", alignItems: "center" },
  username: { color: "#aaa", fontSize: "0.85rem" },
  logout: { background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: "0.85rem" },
};