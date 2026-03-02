import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import type { GroupedMessage } from "../types";

interface Props {
  send: (msg: object) => void;
  channel: string;
  replyTo: GroupedMessage | null;
  onCancelReply: () => void;
}

export default function MessageInput({ send, channel, replyTo, onCancelReply }: Props) {
  const [text, setText] = useState("");
  const typingRef = useRef(false);
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when reply target is set
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!typingRef.current) {
      send({ type: "typing", channelId: channel });
      typingRef.current = true;
      setTimeout(() => { typingRef.current = false; }, 2000);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send({
      type: "message",
      channelId: channel,
      content: text,
      replyToId: replyTo?.id ?? null,
    });
    setText("");
    onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && replyTo) {
      e.preventDefault();
      onCancelReply();
    }
  };

  return (
    <div style={{ borderTop: `1px solid ${theme.border}`, background: theme.surface }}>
      {/* Reply banner */}
      {replyTo && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 1.5rem",
          background: theme.primaryGlow,
          borderBottom: `1px solid ${theme.border}`,
          fontSize: "0.75rem",
          fontFamily: "'Share Tech Mono', monospace",
        }}>
          <span style={{ color: theme.textDim }}>
            <span style={{ color: theme.primary, marginRight: "6px" }}>↩ replying to {replyTo.username}</span>
            <span style={{ opacity: 0.6 }}>
              {replyTo.content.length > 60 ? replyTo.content.slice(0, 60) + "…" : replyTo.content}
            </span>
          </span>
          <button
            onClick={onCancelReply}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: theme.textDim,
              fontSize: "0.9rem",
              padding: "0 4px",
              lineHeight: 1,
            }}
            title="Cancel reply (Esc)"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1.5rem" }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "0.5rem",
          background: theme.primaryGlow, border: `1px solid ${theme.border}`,
          borderRadius: "2px", padding: "0 1rem",
        }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.9rem", color: theme.textDim }}>&gt;</span>
          <input
            ref={inputRef}
            style={{
              flex: 1, padding: "0.65rem 0", background: "transparent",
              border: "none", fontSize: "0.9rem", color: theme.primary,
              fontFamily: "'Share Tech Mono', monospace",
            }}
            placeholder={replyTo ? `reply to ${replyTo.username}...` : `transmit to #${channel}...`}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "0 1.25rem", background: "transparent",
            border: `1px solid ${theme.primaryDim}`, borderRadius: "2px",
            fontSize: "0.7rem", cursor: "pointer", color: theme.primary,
            fontFamily: "'Orbitron', monospace", fontWeight: 700,
            letterSpacing: "0.1em", transition: "all 0.15s",
          }}
        >
          SEND
        </button>
      </form>

      <style>{`
        input::placeholder { color: ${theme.textDim}; opacity: 0.4; }
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}