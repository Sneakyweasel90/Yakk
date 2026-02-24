import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import ThemePicker from "./ThemePicker";

const TEXT_CHANNELS = ["general", "random", "yakking"];
const VOICE_CHANNELS = ["voice-general", "voice-chill"];

export default function Sidebar({ channel, setChannel, voiceChannel, joinVoice, leaveVoice, logout, username }) {
  const { theme } = useTheme();
  const [showThemes, setShowThemes] = useState(false);

  return (
    <div style={{ ...styles.sidebar, background: `linear-gradient(180deg, ${theme.surface2} 0%, ${theme.surface} 100%)`, borderColor: theme.border }}>
      <div style={{ ...styles.logo, borderColor: theme.border }}>
        <span style={{ ...styles.logoText, color: theme.primary, textShadow: `0 0 15px ${theme.primaryGlow}` }}>YAKK</span>
        <div style={{ ...styles.logoUnderline, background: `linear-gradient(90deg, ${theme.primary}, transparent)` }} />
      </div>

      <div style={styles.section}>
        <span style={{ ...styles.sectionLabel, color: theme.textDim }}>// TEXT CHANNELS</span>
      </div>
      {TEXT_CHANNELS.map((ch) => (
        <div
          key={ch}
          onClick={() => setChannel(ch)}
          style={{
            ...styles.channel,
            color: ch === channel ? theme.primary : theme.textDim,
            background: ch === channel ? theme.primaryGlow : "transparent",
            borderLeft: ch === channel ? `2px solid ${theme.primary}` : "2px solid transparent",
          }}
        >
          <span style={{ color: theme.border }}>#</span> {ch}
          {ch === channel && <div style={{ ...styles.activePip, background: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }} />}
        </div>
      ))}

      <div style={styles.section}>
        <span style={{ ...styles.sectionLabel, color: theme.textDim }}>// VOICE CHANNELS</span>
      </div>
      {VOICE_CHANNELS.map((ch) => (
        <div key={ch} style={styles.voiceRow}>
          <div
            onClick={() => voiceChannel === ch ? leaveVoice() : joinVoice(ch)}
            style={{
              ...styles.channel,
              color: ch === voiceChannel ? theme.primary : theme.textDim,
              background: ch === voiceChannel ? theme.primaryGlow : "transparent",
              borderLeft: ch === voiceChannel ? `2px solid ${theme.primary}` : "2px solid transparent",
            }}
          >
            <span style={{ color: theme.textDim }}>◈</span> {ch.replace("voice-", "")}
          </div>
          {ch === voiceChannel && (
            <span style={{ ...styles.liveTag, color: theme.primary, borderColor: theme.primaryDim, background: theme.primaryGlow }}>
              LIVE
            </span>
          )}
        </div>
      ))}

      <div style={{ ...styles.settingsBtn, borderColor: theme.border }} onClick={() => setShowThemes(true)}>
        <span style={{ color: theme.textDim, fontSize: "0.75rem", fontFamily: "'Share Tech Mono', monospace" }}>⚙ THEMES</span>
      </div>

      <div style={{ ...styles.footer, borderColor: theme.border }}>
        <div style={styles.userInfo}>
          <div style={{ ...styles.userDot, background: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }} />
          <span style={{ ...styles.username, color: theme.textDim }}>{username}</span>
        </div>
        <button onClick={logout} style={{ ...styles.logout, color: theme.textDim, borderColor: theme.border }}>EXIT</button>
      </div>

      {showThemes && <ThemePicker onClose={() => setShowThemes(false)} />}
    </div>
  );
}

const styles = {
  sidebar: { width: "220px", minWidth: "220px", display: "flex", flexDirection: "column", borderRight: "1px solid", fontFamily: "'Rajdhani', sans-serif" },
  logo: { padding: "1.25rem 1rem", borderBottom: "1px solid" },
  logoText: { fontFamily: "'Orbitron', monospace", fontSize: "1.2rem", fontWeight: 900, letterSpacing: "0.3em" },
  logoUnderline: { height: "1px", width: "40px", marginTop: "4px" },
  section: { padding: "1rem 1rem 0.4rem" },
  sectionLabel: { fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" },
  channel: { padding: "0.45rem 1rem", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", transition: "all 0.15s", margin: "1px 0", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 },
  activePip: { position: "absolute", right: "0.75rem", width: "6px", height: "6px", borderRadius: "50%" },
  voiceRow: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "0.5rem" },
  liveTag: { fontSize: "0.55rem", borderRadius: "2px", padding: "1px 5px", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em", border: "1px solid" },
  settingsBtn: { margin: "0.5rem", padding: "0.5rem 1rem", cursor: "pointer", border: "1px solid", borderRadius: "2px", textAlign: "center", transition: "all 0.2s" },
  footer: { marginTop: "auto", padding: "0.75rem 1rem", borderTop: "1px solid", display: "flex", justifyContent: "space-between", alignItems: "center" },
  userInfo: { display: "flex", alignItems: "center", gap: "0.5rem" },
  userDot: { width: "7px", height: "7px", borderRadius: "50%" },
  username: { fontSize: "0.85rem", fontFamily: "'Share Tech Mono', monospace" },
  logout: { background: "none", border: "1px solid", cursor: "pointer", fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em", padding: "3px 8px", borderRadius: "2px", transition: "all 0.2s" },
};