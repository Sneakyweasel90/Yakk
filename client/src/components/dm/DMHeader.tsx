import { useTheme } from "../../context/ThemeContext";
import Avatar from "../ui/Avatar";
import type { DMConversation, OnlineUser } from "../../types";

interface Props {
  conversation: DMConversation;
  onlineUsers: OnlineUser[];
}

export default function DMHeader({ conversation, onlineUsers }: Props) {
  const { theme } = useTheme();
  const isOnline = onlineUsers.some(u => u.id === conversation.other_user_id);
  const displayName = conversation.nickname || conversation.username;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.6rem 1rem",
      borderBottom: `1px solid ${theme.border}`,
      background: theme.surface,
      flexShrink: 0,
    }}>
      <div style={{ position: "relative" }}>
        <Avatar username={displayName} avatar={conversation.avatar} size={28} />
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: "8px", height: "8px", borderRadius: "50%",
          background: isOnline ? "#4ade80" : theme.border,
          boxShadow: isOnline ? "0 0 5px #4ade80" : "none",
          border: `1px solid ${theme.surface}`,
        }} />
      </div>
      <div>
        <span style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.95rem",
          color: theme.primary,
          letterSpacing: "0.04em",
        }}>
          {displayName}
        </span>
        {conversation.nickname && (
          <span style={{ fontSize: "0.65rem", color: theme.textDim, fontFamily: "'Share Tech Mono', monospace", marginLeft: "6px" }}>
            @{conversation.username}
          </span>
        )}
      </div>
      <span style={{
        marginLeft: "auto",
        fontSize: "0.6rem",
        fontFamily: "'Share Tech Mono', monospace",
        color: isOnline ? "#4ade80" : theme.textDim,
        opacity: 0.8,
      }}>
        {isOnline ? "● ONLINE" : "○ OFFLINE"}
      </span>
    </div>
  );
}