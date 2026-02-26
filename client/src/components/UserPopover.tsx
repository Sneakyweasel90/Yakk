import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLocalNicknames } from "../context/LocalNicknameContext";
import Avatar from "./Avatar";

interface Props {
  userId: number;
  username: string;       // server display name (their nickname or username)
  isSelf: boolean;
  onClose: () => void;
  anchorEl: HTMLElement;
}

export default function UserPopover({ userId, username, isSelf, onClose, anchorEl }: Props) {
  const { theme } = useTheme();
  const { resolve, setLocalNickname, nicknames } = useLocalNicknames();
  const ref = useRef<HTMLDivElement>(null);

  const existing = nicknames[userId] || "";
  const [value, setValue] = useState(existing);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Position the popover near the clicked element
  const rect = anchorEl.getBoundingClientRect();
  const top = rect.bottom + 6;
  const left = rect.left;

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

  const displayedAs = resolve(userId, username);

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
        <div>
          <div style={{ color: theme.primary, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
            {displayedAs}
          </div>
          {displayedAs !== username && (
            <div style={{ color: theme.textDim, fontSize: "0.65rem", opacity: 0.7 }}>({username})</div>
          )}
        </div>
      </div>

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
              onClick={() => { setValue(""); }}
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