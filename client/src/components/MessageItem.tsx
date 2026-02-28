import { useRef, useEffect } from "react";
import type { GroupedMessage, Reaction } from "../types";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ── EmojiPicker ────────────────────────────────────────────────────────────────

interface EmojiPickerProps {
  messageId: number;
  onReact: (messageId: number, emoji: string) => void;
  onClose: () => void;
}

function EmojiPicker({ messageId, onReact, onClose }: EmojiPickerProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "-44px",
        left: 0,
        zIndex: 100,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "4px",
        padding: "4px 6px",
        display: "flex",
        gap: "2px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onReact(messageId, emoji); onClose(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.15rem",
            padding: "3px 5px",
            borderRadius: "3px",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.primaryGlow)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ── ReactionPills ──────────────────────────────────────────────────────────────

interface ReactionPillsProps {
  reactions: Reaction[];
  messageId: number;
  currentUsername: string;
  onReact: (messageId: number, emoji: string) => void;
}

function ReactionPills({ reactions, messageId, currentUsername, onReact }: ReactionPillsProps) {
  const { theme } = useTheme();
  if (reactions.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
      {reactions.map((r) => {
        const reacted = r.users.includes(currentUsername);
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(messageId, r.emoji)}
            title={r.users.join(", ")}
            style={{
              background: reacted ? theme.primaryGlow : "rgba(255,255,255,0.04)",
              border: `1px solid ${reacted ? theme.primaryDim : theme.border}`,
              borderRadius: "10px",
              padding: "1px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8rem",
              transition: "all 0.15s",
            }}
          >
            <span>{r.emoji}</span>
            <span
              style={{
                color: reacted ? theme.primary : theme.textDim,
                fontSize: "0.7rem",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {r.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── MessageItem ────────────────────────────────────────────────────────────────

interface MessageItemProps {
  msg: GroupedMessage;
  hoveredMsgId: number | null;
  pickerMsgId: number | null;
  currentUsername: string;
  onHover: (id: number | null) => void;
  onPickerToggle: (id: number | null) => void;
  onReact: (messageId: number, emoji: string) => void;
  onUsernameClick: (userId: number, username: string, el: HTMLElement) => void;
  resolveNickname: (userId: number, username: string) => string;
}

export default function MessageItem({
  msg,
  hoveredMsgId,
  pickerMsgId,
  currentUsername,
  onHover,
  onPickerToggle,
  onReact,
  onUsernameClick,
  resolveNickname,
}: MessageItemProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        padding: `${msg.isGrouped ? "0.1rem" : "0.65rem"} 0.5rem`,
        borderRadius: "3px",
      }}
      onMouseEnter={() => onHover(msg.id)}
      onMouseLeave={() => { if (pickerMsgId !== msg.id) onHover(null); }}
    >
      {/* Avatar column */}
      <div style={{ width: "34px", flexShrink: 0, display: "flex", alignItems: "flex-start", paddingTop: "2px" }}>
        {!msg.isGrouped && <Avatar username={msg.username} size={34} />}
      </div>

      {/* Message body */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: "2.5rem", position: "relative" }}>
        {!msg.isGrouped && (
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.1rem" }}>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: theme.primary,
                cursor: "pointer",
              }}
              onClick={(e) => onUsernameClick(msg.user_id, msg.raw_username || msg.username, e.currentTarget as HTMLElement)}
              title="Click to set local nickname"
            >
              {resolveNickname(msg.user_id, msg.raw_username || msg.username)}
            </span>
            <span style={{ fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", color: theme.textDim }}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        <div style={{ fontSize: "0.9rem", lineHeight: 1.5, wordBreak: "break-word", color: theme.text }}>
          {msg.content}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <ReactionPills
            reactions={msg.reactions || []}
            messageId={msg.id}
            currentUsername={currentUsername}
            onReact={onReact}
          />

          {(hoveredMsgId === msg.id || pickerMsgId === msg.id) && (
            <div style={{ position: "relative" }}>
              <button
                style={{
                  border: "1px solid",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontFamily: "'Share Tech Mono', monospace",
                  letterSpacing: "0.05em",
                  transition: "all 0.15s",
                  lineHeight: "1.6",
                  color: pickerMsgId === msg.id ? theme.primary : theme.textDim,
                  borderColor: pickerMsgId === msg.id ? theme.primaryDim : theme.border,
                  background: pickerMsgId === msg.id ? theme.primaryGlow : "transparent",
                } as React.CSSProperties}
                onClick={() => onPickerToggle(pickerMsgId === msg.id ? null : msg.id)}
                title="Add reaction"
              >
                + 😊
              </button>
              {pickerMsgId === msg.id && (
                <EmojiPicker
                  messageId={msg.id}
                  onReact={onReact}
                  onClose={() => { onPickerToggle(null); onHover(null); }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}