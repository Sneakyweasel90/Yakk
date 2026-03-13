import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";
import type { OnlineUser } from "../types";

interface Props {
  onlineUsers: OnlineUser[];
  currentUserId: number;
  onUserClick: (userId: number, username: string, el: HTMLElement) => void;
}

export default function MemberList({ onlineUsers, currentUserId, onUserClick }: Props) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const panelWidth = 200;

  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      height: "100%",
      flexShrink: 0,
    }}>
      {/* Always-visible toggle tab */}
      <div
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? "Show members" : "Hide members"}
        style={{
          width: "18px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: `1px solid ${theme.border}`,
          background: theme.surface2,
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = theme.primaryGlow; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = theme.surface2; }}
      >
        <span style={{
          color: theme.textDim,
          fontSize: "0.5rem",
          userSelect: "none",
          writingMode: "vertical-rl",
          letterSpacing: "0.15em",
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          {collapsed ? "▶ MEMBERS" : "◀"}
        </span>
      </div>

      {/* Sliding panel */}
      <div style={{
        width: collapsed ? 0 : panelWidth,
        overflow: "hidden",
        transition: "width 0.2s ease",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: `linear-gradient(180deg, ${theme.surface2} 0%, ${theme.surface} 100%)`,
        borderLeft: collapsed ? "none" : `1px solid ${theme.border}`,
      }}>
        <div style={{
          width: panelWidth,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "1.1rem 1rem 0.6rem",
            borderBottom: `1px solid ${theme.border}`,
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primaryGlow}`,
            }}>
              MEMBERS
            </div>
            <div style={{ height: "1px", width: "30px", marginTop: "4px", background: `linear-gradient(90deg, ${theme.primary}, transparent)` }} />
          </div>

          {/* Online label */}
          <div style={{
            padding: "0.6rem 1rem 0.3rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: "0.58rem",
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: "0.08em",
              color: theme.textDim,
            }}>
              // ONLINE
            </span>
            <span style={{
              borderRadius: "8px",
              padding: "0 5px",
              fontSize: "0.58rem",
              fontFamily: "'Share Tech Mono', monospace",
              background: theme.primaryGlow,
              border: `1px solid ${theme.primaryDim}`,
              color: theme.primary,
            }}>
              {onlineUsers.length}
            </span>
          </div>

          {/* User list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.15rem 0 0.75rem" }}>
            {onlineUsers.map(u => (
              <MemberRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onUserClick={onUserClick}
              />
            ))}
            {onlineUsers.length === 0 && (
              <div style={{
                padding: "0.75rem 1rem",
                color: theme.textDim,
                fontSize: "0.65rem",
                fontFamily: "'Share Tech Mono', monospace",
                opacity: 0.5,
              }}>
                no one online
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberRow({
  user,
  isSelf,
  onUserClick,
}: {
  user: OnlineUser;
  isSelf: boolean;
  onUserClick: (userId: number, username: string, el: HTMLElement) => void;
}) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      onClick={() => rowRef.current && onUserClick(user.id, user.username, rowRef.current)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0.3rem 0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        cursor: "pointer",
        borderRadius: "2px",
        margin: "0 0.25rem",
        background: hovered ? theme.primaryGlow : "transparent",
        transition: "background 0.1s",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar username={user.username} size={26} />
        <div style={{
          position: "absolute",
          bottom: -1,
          right: -1,
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#4ade80",
          boxShadow: "0 0 5px #4ade80",
          border: `1px solid ${theme.surface2}`,
        }} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: "0.82rem",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 600,
          color: hovered ? theme.primary : theme.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          transition: "color 0.1s",
        }}>
          {user.username}
        </div>
        {isSelf && (
          <div style={{
            fontSize: "0.58rem",
            fontFamily: "'Share Tech Mono', monospace",
            color: theme.textDim,
            opacity: 0.6,
          }}>
            you
          </div>
        )}
      </div>
    </div>
  );
}