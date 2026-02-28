import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";
import ThemePicker from "./ThemePicker";
import AccountSettings from "./Accountsettings";
import type { OnlineUser } from "../types";

interface SidebarFooterProps {
  username: string;
  nickname: string | null;
  avatar: string | null;
  userId: number;
  token: string;
  onlineUsers: OnlineUser[];
  onNicknameChange: (nickname: string | null) => void;
  onAvatarChange: (avatar: string | null) => void;
  onLogout: () => void;
}

export default function SidebarFooter({
  username, nickname, avatar, userId, token,
  onlineUsers, onNicknameChange, onAvatarChange, onLogout,
}: SidebarFooterProps) {
  const { theme } = useTheme();
  const [showOnline, setShowOnline] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      {/* Online users */}
      <div
        style={{
          padding: "0.75rem 1rem 0.3rem", display: "flex", alignItems: "center",
          gap: "0.5rem", cursor: "pointer", borderTop: `1px solid ${theme.border}`,
          marginTop: "auto", color: theme.textDim,
        }}
        onClick={() => setShowOnline(s => !s)}
      >
        <span style={{ fontSize: "0.62rem", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em", color: theme.textDim }}>
          // ONLINE
        </span>
        <span style={{
          borderRadius: "8px", padding: "0 5px", fontSize: "0.6rem",
          fontFamily: "'Share Tech Mono', monospace",
          background: theme.primaryGlow, border: `1px solid ${theme.primaryDim}`, color: theme.primary,
        }}>
          {onlineUsers.length}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.6rem" }}>{showOnline ? "▲" : "▼"}</span>
      </div>

      {showOnline && (
        <div style={{ padding: "0.25rem 0 0.5rem" }}>
          {onlineUsers.map(u => (
            <div key={u.id} style={{ padding: "0.3rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ position: "relative" }}>
                <Avatar username={u.username} size={24} />
                <div style={{
                  position: "absolute", bottom: -1, right: -1,
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: "#4ade80", boxShadow: "0 0 4px #4ade80",
                }} />
              </div>
              <span style={{ fontSize: "0.85rem", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, color: theme.text }}>
                {u.username}
              </span>
              {u.username === username && (
                <span style={{ fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", opacity: 0.5, color: theme.textDim }}>
                  (you)
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Themes button */}
      <div
        style={{
          margin: "0.5rem", padding: "0.5rem 1rem", cursor: "pointer",
          border: `1px solid ${theme.border}`, borderRadius: "2px",
          textAlign: "center", transition: "all 0.2s",
        }}
        onClick={() => setShowThemes(true)}
      >
        <span style={{ color: theme.textDim, fontSize: "0.75rem", fontFamily: "'Share Tech Mono', monospace" }}>
          ⚙ THEMES
        </span>
      </div>

      {/* User footer */}
      <div style={{ padding: "0.75rem 1rem", borderTop: `1px solid ${theme.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          onClick={() => setShowSettings(true)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, cursor: "pointer", minWidth: 0 }}
          title="Account settings"
        >
          <Avatar username={nickname || username} avatar={avatar} size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontFamily: "'Share Tech Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: theme.text }}>
              {nickname || username}
            </div>
            {nickname && (
              <div style={{ fontSize: "0.6rem", color: theme.textDim, fontFamily: "'Share Tech Mono', monospace", opacity: 0.6 }}>
                @{username}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: "none", border: `1px solid ${theme.border}`, cursor: "pointer",
            fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace",
            letterSpacing: "0.1em", padding: "3px 6px", borderRadius: "2px",
            transition: "all 0.2s", flexShrink: 0, color: theme.textDim,
          }}
        >
          EXIT
        </button>
      </div>

      {showThemes && <ThemePicker onClose={() => setShowThemes(false)} />}
      {showSettings && (
        <AccountSettings
          user={{ id: userId, username, nickname, avatar, token }}
          onClose={() => setShowSettings(false)}
          onNicknameChange={onNicknameChange}
          onAvatarChange={onAvatarChange}
        />
      )}
    </>
  );
}