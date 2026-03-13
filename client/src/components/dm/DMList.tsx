import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import Avatar from "../ui/Avatar";
import type { DMConversation, OnlineUser } from "../../types";

interface Props {
  conversations: DMConversation[];
  activeDMChannel: string | null;
  onlineUsers: OnlineUser[];
  onSelectDM: (conv: DMConversation) => void;
  loading: boolean;
}

export default function DMList({ conversations, activeDMChannel, onlineUsers, onSelectDM, loading }: Props) {
  const { theme } = useTheme();

  const onlineIds = new Set(onlineUsers.map(u => u.id));

  if (loading && conversations.length === 0) {
    return (
      <div style={{ padding: "1rem", color: theme.textDim, fontSize: "0.7rem", fontFamily: "'Share Tech Mono', monospace", textAlign: "center" }}>
        LOADING...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div style={{ padding: "1.5rem 1rem", color: theme.textDim, fontSize: "0.72rem", fontFamily: "'Share Tech Mono', monospace", textAlign: "center", lineHeight: 1.6 }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", opacity: 0.4 }}>◈</div>
        No direct messages yet.
        <br />
        Click a username in chat to start one.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px", padding: "0.25rem 0" }}>
      {conversations.map(conv => {
        const isActive = activeDMChannel === conv.channelId;
        const isOnline = onlineIds.has(conv.other_user_id);
        const displayName = conv.nickname || conv.username;
        const hasUnread = conv.unread_count > 0;

        return (
          <div
            key={conv.channelId}
            onClick={() => onSelectDM(conv)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
              borderLeft: isActive ? `2px solid ${theme.primary}` : "2px solid transparent",
              background: isActive ? theme.primaryGlow : "transparent",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${theme.primaryGlow}66`; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            {/* Avatar with online dot */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar username={displayName} avatar={conv.avatar} size={32} />
              <div style={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: isOnline ? "#4ade80" : theme.border,
                boxShadow: isOnline ? "0 0 5px #4ade80" : "none",
                border: `1px solid ${theme.surface}`,
              }} />
            </div>

            {/* Name + last message */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "4px",
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: hasUnread ? 700 : 600,
                  fontSize: "0.88rem",
                  color: hasUnread ? theme.primary : theme.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {displayName}
                </span>
                {/* Unread badge */}
                {hasUnread && (
                  <span style={{
                    background: theme.primary,
                    color: theme.background,
                    borderRadius: "8px",
                    padding: "0px 5px",
                    fontSize: "0.6rem",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontWeight: 700,
                    flexShrink: 0,
                    minWidth: "16px",
                    textAlign: "center",
                  }}>
                    {conv.unread_count > 99 ? "99+" : conv.unread_count}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <div style={{
                  fontSize: "0.7rem",
                  color: theme.textDim,
                  fontFamily: "'Share Tech Mono', monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  opacity: hasUnread ? 0.9 : 0.6,
                }}>
                  {conv.last_message.length > 35 ? conv.last_message.slice(0, 35) + "…" : conv.last_message}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}