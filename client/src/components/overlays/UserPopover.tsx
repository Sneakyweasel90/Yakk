import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLocalNicknames } from "../../context/LocalNicknameContext";
import Avatar from "../ui/Avatar";

interface Props {
  userId: number;
  username: string;
  isSelf: boolean;
  onClose: () => void;
  anchorEl: HTMLElement;
  onOpenDM?: (userId: number) => void;
}

export default function UserPopover({ userId, username, isSelf, onClose, anchorEl, onOpenDM }: Props) {
  const { theme } = useTheme();
  const { setLocalNickname, nicknames } = useLocalNicknames();
  const ref = useRef<HTMLDivElement>(null);

  const existing = nicknames[userId] || "";
  const [value, setValue] = useState(existing);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const rect = anchorEl.getBoundingClientRect();
  const top = Math.min(rect.bottom + 6, window.innerHeight - 220);
  const left = Math.min(rect.left, window.innerWidth - 240);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await setLocalNickname(userId, value);
      setMsg({ text: value.trim() ? "Saved" : "Cleared", ok: true });
      setTimeout(onClose, 600);
    } catch {
      setMsg({ text: "Failed to save", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const displayedAs = nicknames[userId] || username;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 300,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "4px",
        padding: "0.75rem 1rem",
        minWidth: "220px",
        boxShadow: `0 8px 30px rgba(0,0,0,0.6)`,
        fontFamily: "'Share Tech Mono', monospace",
      }}
    >
      {/* User header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <Avatar username={displayedAs} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: theme.primary, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
            {displayedAs}
          </div>
          <div style={{ color: theme.textDim, fontSize: "0.65rem", opacity: 0.7 }}>@{username}</div>
        </div>
      </div>

      {/* DM button — not for self */}
      {!isSelf && onOpenDM && (
        <button
          onClick={() => onOpenDM(userId)}
          style={{
            width: "100%",
            background: theme.primaryGlow,
            border: `1px solid ${theme.primaryDim}`,
            borderRadius: "2px",
            color: theme.primary,
            fontSize: "0.65rem",
            fontFamily: "'Share Tech Mono', monospace",
            letterSpacing: "0.1em",
            padding: "0.4rem",
            cursor: "pointer",
            marginBottom: "0.75rem",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = theme.primaryDim; }}
          onMouseLeave={e => { e.currentTarget.style.background = theme.primaryGlow; }}
        >
          ◈ MESSAGE
        </button>
      )}

      {/* Local nickname field — not shown for self */}
      {!isSelf && (
        <>
          <div style={{ color: theme.textDim, fontSize: "0.6rem", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>
            YOUR LOCAL NICKNAME
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
              placeholder="Only visible to you..."
              maxLength={50}
              style={{
                flex: 1, background: theme.background, border: `1px solid ${theme.border}`,
                color: theme.text, padding: "0.35rem 0.5rem", borderRadius: "2px",
                fontSize: "0.8rem", fontFamily: "'Share Tech Mono', monospace", outline: "none",
              }}
            />
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: "none", border: `1px solid ${theme.primaryDim}`, cursor: "pointer",
                color: theme.primary, padding: "0.35rem 0.6rem", borderRadius: "2px",
                fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? "..." : "SET"}
            </button>
          </div>
          {existing && (
            <button
              onClick={() => setValue("")}
              style={{
                background: "none", border: "none", cursor: "pointer", color: theme.textDim,
                fontSize: "0.6rem", marginTop: "0.3rem", fontFamily: "'Share Tech Mono', monospace",
                padding: 0, opacity: 0.6,
              }}
            >
              clear nickname
            </button>
          )}
          {msg && (
            <div style={{ fontSize: "0.65rem", marginTop: "0.4rem", color: msg.ok ? "#4ade80" : theme.error }}>
              {msg.text}
            </div>
          )}
        </>
      )}

      {isSelf && (
        <div style={{ color: theme.textDim, fontSize: "0.7rem", opacity: 0.6 }}>
          That's you! Edit your name in account settings.
        </div>
      )}
    </div>
  );
}