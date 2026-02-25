import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import ThemePicker from "./ThemePicker";
import Avatar from "./Avatar";
import config from "../config";
import type { Channel, OnlineUser } from "../types";

interface Props {
  channel: string;
  setChannel: (c: string) => void;
  voiceChannel: string | null;
  joinVoice: (c: string) => void;
  leaveVoice: () => void;
  logout: () => void;
  username: string;
  token: string;
  onlineUsers: OnlineUser[];
  onSearchOpen: () => void;
}

export default function Sidebar({
  channel, setChannel, voiceChannel, joinVoice, leaveVoice,
  logout, username, token, onlineUsers, onSearchOpen,
}: Props) {
  const { theme } = useTheme();
  const [showThemes, setShowThemes] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreateText, setShowCreateText] = useState(false);
  const [showCreateVoice, setShowCreateVoice] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      const { data } = await axios.get(`${config.HTTP}/api/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChannels(data);
    } catch {
      // fallback — keep existing list
    }
  }, [token]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const createChannel = async (type: "text" | "voice") => {
    if (!newChannelName.trim()) return;
    setCreating(true);
    try {
      await axios.post(
        `${config.HTTP}/api/channels`,
        { name: newChannelName.trim(), type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewChannelName("");
      setShowCreateText(false);
      setShowCreateVoice(false);
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || "Failed to create channel");
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteChannel = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this channel?")) return;
    try {
      await axios.delete(`${config.HTTP}/api/channels/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || "Failed to delete channel");
      }
    }
  };

  const textChannels = channels.filter(c => c.type === "text");
  const voiceChannels = channels.filter(c => c.type === "voice");

  const CreateChannelInput = ({ type }: { type: "text" | "voice" }) => (
    <div style={{ padding: "0.25rem 0.75rem", display: "flex", gap: "0.35rem" }}>
      <input
        autoFocus
        style={{
          flex: 1, background: theme.primaryGlow, border: `1px solid ${theme.border}`,
          color: theme.primary, padding: "0.3rem 0.5rem", borderRadius: "2px",
          fontFamily: "'Share Tech Mono', monospace", fontSize: "0.75rem", outline: "none",
        }}
        placeholder={type === "voice" ? "channel-name" : "channel-name"}
        value={newChannelName}
        onChange={e => setNewChannelName(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") createChannel(type);
          if (e.key === "Escape") { setShowCreateText(false); setShowCreateVoice(false); setNewChannelName(""); }
        }}
      />
      <button
        onClick={() => createChannel(type)}
        disabled={creating}
        style={{
          background: theme.primaryGlow, border: `1px solid ${theme.primaryDim}`,
          color: theme.primary, cursor: "pointer", borderRadius: "2px",
          padding: "0 0.4rem", fontSize: "0.8rem",
        }}
      >
        ✓
      </button>
    </div>
  );

  return (
    <div style={{
      ...styles.sidebar,
      background: `linear-gradient(180deg, ${theme.surface2} 0%, ${theme.surface} 100%)`,
      borderColor: theme.border,
    }}>
      {/* Logo */}
      <div style={{ ...styles.logo, borderColor: theme.border }}>
        <span style={{ ...styles.logoText, color: theme.primary, textShadow: `0 0 15px ${theme.primaryGlow}` }}>
          YAKK
        </span>
        <div style={{ ...styles.logoUnderline, background: `linear-gradient(90deg, ${theme.primary}, transparent)` }} />
      </div>

      {/* Search button */}
      <div
        style={{ ...styles.searchBtn, borderColor: theme.border, color: theme.textDim }}
        onClick={onSearchOpen}
      >
        <span style={{ fontSize: "0.85rem" }}>⌕</span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          SEARCH
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", opacity: 0.5 }}>
          ctrl+k
        </span>
      </div>

      {/* Text channels */}
      <div style={styles.sectionRow}>
        <span style={{ ...styles.sectionLabel, color: theme.textDim }}>// TEXT CHANNELS</span>
        <button
          style={{ ...styles.addBtn, color: theme.textDim }}
          onClick={() => { setShowCreateText(s => !s); setShowCreateVoice(false); setNewChannelName(""); }}
          title="Create text channel"
        >+</button>
      </div>
      {showCreateText && <CreateChannelInput type="text" />}
      {textChannels.map(ch => (
        <div
          key={ch.id}
          onClick={() => setChannel(ch.name)}
          style={{
            ...styles.channel,
            color: ch.name === channel ? theme.primary : theme.textDim,
            background: ch.name === channel ? theme.primaryGlow : "transparent",
            borderLeft: ch.name === channel ? `2px solid ${theme.primary}` : "2px solid transparent",
          }}
        >
          <span style={{ color: theme.border }}>#</span>
          <span style={{ flex: 1 }}>{ch.name}</span>
          {ch.name === channel && (
            <div style={{ ...styles.activePip, background: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }} />
          )}
          {ch.created_by !== null && (
            <span
              onClick={e => deleteChannel(ch.id, e)}
              style={{ ...styles.deleteBtn, color: theme.textDim }}
              title="Delete channel"
            >×</span>
          )}
        </div>
      ))}

      {/* Voice channels */}
      <div style={styles.sectionRow}>
        <span style={{ ...styles.sectionLabel, color: theme.textDim }}>// VOICE CHANNELS</span>
        <button
          style={{ ...styles.addBtn, color: theme.textDim }}
          onClick={() => { setShowCreateVoice(s => !s); setShowCreateText(false); setNewChannelName(""); }}
          title="Create voice channel"
        >+</button>
      </div>
      {showCreateVoice && <CreateChannelInput type="voice" />}
      {voiceChannels.map(ch => (
        <div key={ch.id} style={styles.voiceRow}>
          <div
            onClick={() => voiceChannel === ch.name ? leaveVoice() : joinVoice(ch.name)}
            style={{
              ...styles.channel,
              flex: 1,
              color: ch.name === voiceChannel ? theme.primary : theme.textDim,
              background: ch.name === voiceChannel ? theme.primaryGlow : "transparent",
              borderLeft: ch.name === voiceChannel ? `2px solid ${theme.primary}` : "2px solid transparent",
            }}
          >
            <span style={{ color: theme.textDim }}>◈</span>
            <span style={{ flex: 1 }}>{ch.name.replace("voice-", "")}</span>
          </div>
          {ch.name === voiceChannel && (
            <span style={{ ...styles.liveTag, color: theme.primary, borderColor: theme.primaryDim, background: theme.primaryGlow }}>
              LIVE
            </span>
          )}
          {ch.created_by !== null && (
            <span
              onClick={e => deleteChannel(ch.id, e)}
              style={{ ...styles.deleteBtn, color: theme.textDim }}
              title="Delete channel"
            >×</span>
          )}
        </div>
      ))}

      {/* Online users toggle */}
      <div
        style={{ ...styles.onlineHeader, borderColor: theme.border, color: theme.textDim }}
        onClick={() => setShowOnline(s => !s)}
      >
        <span style={{ ...styles.sectionLabel, color: theme.textDim }}>// ONLINE</span>
        <span style={{
          ...styles.onlineBadge,
          background: theme.primaryGlow,
          border: `1px solid ${theme.primaryDim}`,
          color: theme.primary,
        }}>
          {onlineUsers.length}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.6rem" }}>{showOnline ? "▲" : "▼"}</span>
      </div>
      {showOnline && (
        <div style={styles.onlineList}>
          {onlineUsers.map(u => (
            <div key={u.id} style={styles.onlineUser}>
              <div style={{ position: "relative" }}>
                <Avatar username={u.username} size={24} />
                <div style={{ ...styles.onlineDot, background: "#4ade80", boxShadow: "0 0 4px #4ade80" }} />
              </div>
              <span style={{ ...styles.onlineUsername, color: theme.text }}>{u.username}</span>
              {u.username === username && (
                <span style={{ ...styles.youBadge, color: theme.textDim }}>(you)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Settings / Themes */}
      <div style={{ ...styles.settingsBtn, borderColor: theme.border }} onClick={() => setShowThemes(true)}>
        <span style={{ color: theme.textDim, fontSize: "0.75rem", fontFamily: "'Share Tech Mono', monospace" }}>
          ⚙ THEMES
        </span>
      </div>

      {/* Footer */}
      <div style={{ ...styles.footer, borderColor: theme.border }}>
        <Avatar username={username} size={28} />
        <span style={{ ...styles.usernameText, color: theme.text }}>{username}</span>
        <button onClick={logout} style={{ ...styles.logout, color: theme.textDim, borderColor: theme.border }}>
          EXIT
        </button>
      </div>

      {showThemes && <ThemePicker onClose={() => setShowThemes(false)} />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "230px", minWidth: "230px", display: "flex",
    flexDirection: "column", borderRight: "1px solid",
    fontFamily: "'Rajdhani', sans-serif", overflowY: "auto",
  },
  logo: { padding: "1.25rem 1rem", borderBottom: "1px solid" },
  logoText: { fontFamily: "'Orbitron', monospace", fontSize: "1.2rem", fontWeight: 900, letterSpacing: "0.3em" },
  logoUnderline: { height: "1px", width: "40px", marginTop: "4px" },
  searchBtn: {
    margin: "0.5rem", padding: "0.45rem 0.75rem", cursor: "pointer",
    border: "1px solid", borderRadius: "2px", display: "flex",
    alignItems: "center", gap: "0.5rem", transition: "all 0.15s",
  },
  sectionRow: {
    padding: "0.75rem 1rem 0.3rem", display: "flex",
    alignItems: "center", justifyContent: "space-between",
  },
  sectionLabel: { fontSize: "0.62rem", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em" },
  addBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1rem", lineHeight: 1, padding: "0 0.2rem",
  },
  channel: {
    padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.88rem",
    display: "flex", alignItems: "center", gap: "0.45rem",
    position: "relative", transition: "all 0.15s", margin: "1px 0",
    fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
  },
  activePip: { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },
  deleteBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1rem", lineHeight: 1, opacity: 0.4, padding: "0",
    flexShrink: 0,
  },
  voiceRow: { display: "flex", alignItems: "center", paddingRight: "0.5rem" },
  liveTag: {
    fontSize: "0.5rem", borderRadius: "2px", padding: "1px 4px",
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em",
    border: "1px solid", flexShrink: 0,
  },
  onlineHeader: {
    padding: "0.75rem 1rem 0.3rem", display: "flex", alignItems: "center",
    gap: "0.5rem", cursor: "pointer", borderTop: "1px solid", marginTop: "auto",
  },
  onlineBadge: {
    borderRadius: "8px", padding: "0 5px", fontSize: "0.6rem",
    fontFamily: "'Share Tech Mono', monospace",
  },
  onlineList: { padding: "0.25rem 0 0.5rem" },
  onlineUser: {
    padding: "0.3rem 1rem", display: "flex", alignItems: "center",
    gap: "0.5rem",
  },
  onlineDot: {
    position: "absolute", bottom: -1, right: -1, width: "7px",
    height: "7px", borderRadius: "50%",
  },
  onlineUsername: { fontSize: "0.85rem", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 },
  youBadge: { fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", opacity: 0.5 },
  settingsBtn: {
    margin: "0.5rem", padding: "0.5rem 1rem", cursor: "pointer",
    border: "1px solid", borderRadius: "2px", textAlign: "center", transition: "all 0.2s",
  },
  footer: {
    padding: "0.75rem 1rem", borderTop: "1px solid",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  usernameText: { fontSize: "0.85rem", fontFamily: "'Share Tech Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  logout: {
    background: "none", border: "1px solid", cursor: "pointer",
    fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: "0.1em", padding: "3px 6px", borderRadius: "2px",
    transition: "all 0.2s", flexShrink: 0,
  },
};