const TEXT_CHANNELS = ["general", "random", "yakking"];
const VOICE_CHANNELS = ["voice-general", "voice-chill"];

export default function Sidebar({ channel, setChannel, voiceChannel, joinVoice, leaveVoice, logout, username }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoText}>YAKK</span>
        <div style={styles.logoUnderline} />
      </div>

      <div style={styles.section}>
        <span style={styles.sectionLabel}>// TEXT CHANNELS</span>
      </div>
      {TEXT_CHANNELS.map((ch) => (
        <div
          key={ch}
          onClick={() => setChannel(ch)}
          style={{ ...styles.channel, ...(ch === channel ? styles.active : {}) }}
        >
          <span style={styles.hash}>#</span> {ch}
          {ch === channel && <div style={styles.activePip} />}
        </div>
      ))}

      <div style={styles.section}>
        <span style={styles.sectionLabel}>// VOICE CHANNELS</span>
      </div>
      {VOICE_CHANNELS.map((ch) => (
        <div key={ch} style={styles.voiceRow}>
          <div
            onClick={() => voiceChannel === ch ? leaveVoice() : joinVoice(ch)}
            style={{ ...styles.channel, ...(ch === voiceChannel ? styles.activeVoice : {}) }}
          >
            <span style={styles.hash}>◈</span> {ch.replace("voice-", "")}
          </div>
          {ch === voiceChannel && <span style={styles.liveTag}>LIVE</span>}
        </div>
      ))}

      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <div style={styles.userDot} />
          <span style={styles.username}>{username}</span>
        </div>
        <button onClick={logout} style={styles.logout}>Logout</button>
      </div>
      <style>{`
        .channel-item:hover { background: rgba(0,255,159,0.05) !important; color: #00ff9f !important; }
        .logout-btn:hover { color: #ff3366 !important; border-color: #ff3366 !important; }
      `}</style>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "220px", minWidth: "220px",
    background: "linear-gradient(180deg, #020d07 0%, #010a05 100%)",
    display: "flex", flexDirection: "column",
    borderRight: "1px solid rgba(0,255,159,0.15)",
    fontFamily: "'Rajdhani', sans-serif",
  },
  logo: {
    padding: "1.25rem 1rem", borderBottom: "1px solid rgba(0,255,159,0.15)",
  },
  logoText: {
    fontFamily: "'Orbitron', monospace", fontSize: "1.2rem",
    fontWeight: 900, color: "#00ff9f", letterSpacing: "0.3em",
    textShadow: "0 0 15px rgba(0,255,159,0.6)",
  },
  logoUnderline: {
    height: "1px", width: "40px", marginTop: "4px",
    background: "linear-gradient(90deg, #00ff9f, transparent)",
  },
  section: { padding: "1rem 1rem 0.4rem" },
  sectionLabel: {
    fontSize: "0.65rem", color: "rgba(0,255,159,0.4)",
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em",
  },
  channel: {
    padding: "0.45rem 1rem", cursor: "pointer", color: "rgba(0,255,159,0.5)",
    fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem",
    position: "relative", transition: "all 0.15s", margin: "1px 0",
    fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
  },
  active: {
    background: "rgba(0,255,159,0.08)", color: "#00ff9f",
    borderLeft: "2px solid #00ff9f",
  },
  activeVoice: {
    background: "rgba(0,255,159,0.08)", color: "#00ff9f",
    borderLeft: "2px solid #00ff9f",
  },
  activePip: {
    position: "absolute", right: "0.75rem", width: "6px", height: "6px",
    borderRadius: "50%", background: "#00ff9f",
    boxShadow: "0 0 6px rgba(0,255,159,0.8)",
  },
  hash: { color: "rgba(0,255,159,0.3)", fontSize: "0.8rem" },
  voiceRow: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "0.5rem" },
  liveTag: {
    fontSize: "0.55rem", background: "rgba(0,255,159,0.15)",
    color: "#00ff9f", border: "1px solid rgba(0,255,159,0.4)",
    borderRadius: "2px", padding: "1px 5px",
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em",
  },
  footer: {
    marginTop: "auto", padding: "0.75rem 1rem",
    borderTop: "1px solid rgba(0,255,159,0.15)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  userInfo: { display: "flex", alignItems: "center", gap: "0.5rem" },
  userDot: {
    width: "7px", height: "7px", borderRadius: "50%", background: "#00ff9f",
    boxShadow: "0 0 6px rgba(0,255,159,0.8)",
  },
  username: {
    color: "rgba(0,255,159,0.7)", fontSize: "0.85rem",
    fontFamily: "'Share Tech Mono', monospace",
  },
  logout: {
    background: "none", border: "1px solid rgba(0,255,159,0.2)",
    color: "rgba(0,255,159,0.4)", cursor: "pointer",
    fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: "0.1em", padding: "3px 8px", borderRadius: "2px",
    transition: "all 0.2s",
  },
};