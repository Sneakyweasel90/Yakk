import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import type { GroupedMessage, OnlineUser } from "../../types";

interface Props {
  send: (msg: object) => void;
  channel: string;
  replyTo: GroupedMessage | null;
  onCancelReply: () => void;
  onlineUsers?: OnlineUser[];
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MessageInput({ send, channel, replyTo, onCancelReply, onlineUsers = [] }: Props) {
  const [text, setText] = useState("");
  const typingRef = useRef(false);
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Mention autocomplete state ──────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(0);
  const [mentionIndex, setMentionIndex] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("Image must be under 15MB");
      return;
    }
    const compressed = await compressImage(file);
    setImagePreview(compressed);
  }, []);

  const mentionCandidates =
    mentionQuery === null
      ? []
      : onlineUsers
          .filter((u) =>
            (u.nickname || u.username)
              .toLowerCase()
              .startsWith(mentionQuery.toLowerCase())
          )
          .slice(0, 6);

  // Focus input when reply target is set
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();

    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);

    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  // ── Parse @ trigger on every keystroke ────────────────────────────────────
  const parseMention = (val: string, cursorPos: number) => {
    // Find the last @ before the cursor that hasn't been closed by a space
    const slice = val.slice(0, cursorPos);
    const atIdx = slice.lastIndexOf("@");
    if (atIdx === -1) { setMentionQuery(null); return; }

    const fragment = slice.slice(atIdx + 1);
    // If there's a space after @, autocomplete is closed
    if (fragment.includes(" ")) { setMentionQuery(null); return; }

    setMentionQuery(fragment);
    setMentionStart(atIdx);
    setMentionIndex(0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    parseMention(val, e.target.selectionStart ?? val.length);

    if (!typingRef.current) {
      send({ type: "typing", channelId: channel });
      typingRef.current = true;
      setTimeout(() => { typingRef.current = false; }, 2000);
    }
  };

  const commitMention = (user: OnlineUser) => {
    const display = user.nickname || user.username;
    // Replace from @ to current cursor with @username
    const before = text.slice(0, mentionStart);
    const after = text.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const next = `${before}@${display} ${after}`;
    setText(next);
    setMentionQuery(null);
    // Restore focus and move cursor after the inserted mention
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + display.length + 2; // "@display "
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (imagePreview) {
      send({ type: "message", channelId: channel, content: `[img]${imagePreview}`, replyToId: replyTo?.id ?? null });
      setImagePreview(null);
    }
    if (text.trim()) {
      send({ type: "message", channelId: channel, content: text.trim(), replyToId: replyTo?.id ?? null });
    }

    setText("");
    setMentionQuery(null);
    onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention navigation
    if (mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        commitMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Escape" && replyTo) {
      e.preventDefault();
      onCancelReply();
    }
  };

  // Render message content with @mention highlights
  const renderHighlightedPreview = (content: string) => {
    // Not shown in input — used in display layer. Here we just track mentions in the value.
    return content;
  };
  void renderHighlightedPreview;

  return (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      if (!isDragging) setIsDragging(true);
    }}
    onDragLeave={(e) => {
      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
    }}
    onDrop={(e) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    }}
    style={{
      borderTop: `1px solid ${theme.border}`,
      background: theme.surface,
      position: "relative"
    }}
  >

    {/* DROP OVERLAY */}
    {isDragging && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(2px)",
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2px dashed ${theme.primary}`,
          //pointerEvents: "none"
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Orbitron', monospace",
            color: theme.primary
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🖼</div>
          <div style={{ letterSpacing: "0.1em", fontSize: "0.8rem" }}>
            DROP IMAGE TO UPLOAD
          </div>
        </div>
      </div>
    )}

      {/* ── @Mention autocomplete dropdown ──────────────────────────────────── */}
      {mentionCandidates.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: "1.5rem",
          zIndex: 200,
          background: theme.surface,
          border: `1px solid ${theme.primaryDim}`,
          borderRadius: "4px",
          boxShadow: `0 -4px 20px rgba(0,0,0,0.5)`,
          minWidth: "200px",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "4px 8px",
            fontSize: "0.58rem",
            fontFamily: "'Share Tech Mono', monospace",
            letterSpacing: "0.08em",
            color: theme.textDim,
            borderBottom: `1px solid ${theme.border}`,
          }}>
            // MENTION USER
          </div>
          {mentionCandidates.map((u, i) => (
            <div
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); commitMention(u); }}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: i === mentionIndex ? theme.primaryGlow : "transparent",
                borderLeft: i === mentionIndex ? `2px solid ${theme.primary}` : "2px solid transparent",
                transition: "all 0.1s",
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <span style={{
                fontSize: "0.75rem",
                fontFamily: "'Share Tech Mono', monospace",
                color: theme.primary,
              }}>@</span>
              <span style={{
                fontSize: "0.9rem",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                color: i === mentionIndex ? theme.primary : theme.text,
              }}>
                {u.nickname || u.username}
              </span>
              {u.nickname && (
                <span style={{
                  fontSize: "0.7rem",
                  fontFamily: "'Share Tech Mono', monospace",
                  color: theme.textDim,
                  opacity: 0.6,
                }}>
                  ({u.username})
                </span>
              )}
            </div>
          ))}
          <div style={{
            padding: "3px 8px",
            fontSize: "0.58rem",
            fontFamily: "'Share Tech Mono', monospace",
            color: theme.textDim,
            borderTop: `1px solid ${theme.border}`,
            opacity: 0.5,
          }}>
            TAB or ENTER to select · ESC to close
          </div>
        </div>
      )}

      {imagePreview && (
        <div style={{
          padding: "6px 1.5rem",
          background: theme.primaryGlow,
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
        }}>
          <img src={imagePreview} alt="preview" style={{
            maxHeight: "80px", maxWidth: "160px", borderRadius: "3px",
            border: `1px solid ${theme.border}`, objectFit: "contain",
          }} />
          <button
            onClick={() => setImagePreview(null)}
            style={{
              background: "none", border: `1px solid ${theme.border}`,
              borderRadius: "3px", color: theme.textDim, cursor: "pointer",
              fontSize: "0.65rem", padding: "2px 6px",
              fontFamily: "'Share Tech Mono', monospace",
            }}
          >✕ REMOVE</button>
        </div>
      )}

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
              {replyTo.content.startsWith("[img]")
                ? "[image]"
                : replyTo.content.length > 60
                  ? replyTo.content.slice(0, 60) + "…"
                  : replyTo.content}
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
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.9rem", color: theme.textDim }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />

            {/* Attach button — inside the input bar */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: imagePreview ? theme.primary : theme.textDim,
                fontSize: "1rem", padding: "0 4px", lineHeight: 1,
                transition: "color 0.15s",
              }}
            >📎</button>
            &gt;</span>
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