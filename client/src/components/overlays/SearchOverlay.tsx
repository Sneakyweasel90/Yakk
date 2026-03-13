import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";
import config from "../../config";
import type { SearchResult } from "../../types";

interface ContextMessage {
  id: number;
  username: string;
  content: string;
  created_at: string;
  position: "before" | "target" | "after";
}

interface Props {
  token: string;
  currentChannel: string;
  onJumpTo: (channelId: string, messageId: number) => void;
  onClose: () => void;
}

export default function SearchOverlay({ token, currentChannel, onJumpTo, onClose }: Props) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopeChannel, setScopeChannel] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contextMap, setContextMap] = useState<Record<number, ContextMessage[]>>({});
  const [contextLoading, setContextLoading] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    setExpandedId(null);
    try {
      const params: Record<string, string> = { q };
      if (scopeChannel) params.channel = currentChannel;
      const { data } = await axios.get(`${config.HTTP}/api/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, scopeChannel, currentChannel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  useEffect(() => {
    if (query.trim().length >= 2) doSearch(query);
  }, [scopeChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  // Toggle context for a result — fetch if not cached
  const handleExpandContext = useCallback(async (result: SearchResult) => {
    if (expandedId === result.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(result.id);

    if (contextMap[result.id]) return; // already cached

    setContextLoading(result.id);
    try {
      const { data } = await axios.get(`${config.HTTP}/api/search/context`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { messageId: result.id, channel: result.channel_id, around: 4 },
      });
      setContextMap((prev) => ({ ...prev, [result.id]: data }));
    } catch {
      // silently fail — user can still jump to message
    } finally {
      setContextLoading(null);
    }
  }, [expandedId, contextMap, token]);

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part)
        ? <mark key={i} style={{ background: theme.primaryGlow, color: theme.primary, borderRadius: "2px" }}>{part}</mark>
        : part
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "10vh",
      }}
      onClick={onClose}
      onKeyDown={handleKey}
    >
      <div
        style={{
          background: theme.surface,
          border: `1px solid ${theme.primaryDim}`,
          borderRadius: "4px",
          width: "min(680px, 94vw)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${theme.primaryDim}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "0.75rem 1rem",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: theme.textDim, fontSize: "0.9rem" }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder="search messages..."
            style={{
              flex: 1, background: "transparent", border: "none",
              color: theme.primary, fontSize: "1rem",
              fontFamily: "'Share Tech Mono', monospace",
            }}
          />
          <button
            onClick={() => setScopeChannel((s) => !s)}
            title={scopeChannel ? "Searching current channel — click for all" : "Searching all channels — click for current only"}
            style={{
              background: scopeChannel ? theme.primaryGlow : "transparent",
              border: `1px solid ${scopeChannel ? theme.primaryDim : theme.border}`,
              borderRadius: "2px",
              color: scopeChannel ? theme.primary : theme.textDim,
              cursor: "pointer",
              fontSize: "0.62rem",
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: "0.06em",
              padding: "3px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {scopeChannel ? `#${currentChannel}` : "ALL CHANNELS"}
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: "1.5rem", textAlign: "center", color: theme.textDim, fontFamily: "'Share Tech Mono', monospace", fontSize: "0.8rem" }}>
              searching...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ padding: "1.5rem", textAlign: "center", color: theme.textDim, fontFamily: "'Share Tech Mono', monospace", fontSize: "0.8rem" }}>
              no results found
            </div>
          )}

          {results.map((r) => {
            const isExpanded = expandedId === r.id;
            const ctxMessages = contextMap[r.id] ?? [];
            const isCtxLoading = contextLoading === r.id;

            return (
              <div
                key={r.id}
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                {/* Result row */}
                <div style={{
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  background: isExpanded ? theme.primaryGlow : "transparent",
                }}
                  onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = `${theme.primaryGlow}80`; }}
                  onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.75rem", color: theme.primary, fontWeight: 700 }}>
                        {r.username}
                      </span>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", color: theme.textDim }}>
                        #{r.channel_id}
                      </span>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", color: theme.textDim, opacity: 0.5 }}>
                        {formatTime(r.created_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {/* Show context button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExpandContext(r); }}
                        title={isExpanded ? "Hide context" : "Show surrounding messages"}
                        style={{
                          background: isExpanded ? theme.primaryGlow : "transparent",
                          border: `1px solid ${isExpanded ? theme.primary : theme.border}`,
                          borderRadius: "2px",
                          color: isExpanded ? theme.primary : theme.textDim,
                          cursor: "pointer",
                          fontSize: "0.58rem",
                          fontFamily: "'Share Tech Mono', monospace",
                          letterSpacing: "0.05em",
                          padding: "2px 6px",
                          transition: "all 0.15s",
                        }}
                      >
                        {isCtxLoading ? "..." : isExpanded ? "▲ CONTEXT" : "▼ CONTEXT"}
                      </button>
                      {/* Jump button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onJumpTo(r.channel_id, r.id); onClose(); }}
                        title="Jump to message"
                        style={{
                          background: "transparent",
                          border: `1px solid ${theme.primaryDim}`,
                          borderRadius: "2px",
                          color: theme.primary,
                          cursor: "pointer",
                          fontSize: "0.58rem",
                          fontFamily: "'Share Tech Mono', monospace",
                          letterSpacing: "0.05em",
                          padding: "2px 6px",
                          transition: "all 0.15s",
                        }}
                      >
                        JUMP →
                      </button>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "0.9rem", color: theme.text, lineHeight: 1.4 }}>
                    {highlight(r.content, query)}
                  </div>
                </div>

                {/* Context panel */}
                {isExpanded && ctxMessages.length > 0 && (
                  <div style={{
                    background: `${theme.background}cc`,
                    borderTop: `1px dashed ${theme.border}`,
                    padding: "0.5rem 1rem",
                  }}>
                    <div style={{
                      fontSize: "0.58rem",
                      fontFamily: "'Share Tech Mono', monospace",
                      color: theme.textDim,
                      letterSpacing: "0.08em",
                      marginBottom: "0.4rem",
                    }}>
                      // SURROUNDING CONTEXT
                    </div>
                    {ctxMessages.map((cm) => {
                      const isTarget = cm.position === "target";
                      return (
                        <div
                          key={cm.id}
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            padding: "3px 6px",
                            borderRadius: "2px",
                            background: isTarget
                              ? `${theme.primaryGlow}`
                              : "transparent",
                            borderLeft: isTarget
                              ? `2px solid ${theme.primary}`
                              : "2px solid transparent",
                            marginBottom: "1px",
                            opacity: isTarget ? 1 : 0.65,
                          }}
                        >
                          <span style={{
                            fontFamily: "'Share Tech Mono', monospace",
                            fontSize: "0.7rem",
                            color: isTarget ? theme.primary : theme.textDim,
                            minWidth: "80px",
                            flexShrink: 0,
                          }}>
                            {cm.username}
                          </span>
                          <span style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontSize: "0.85rem",
                            color: isTarget ? theme.text : theme.textDim,
                            flex: 1,
                            wordBreak: "break-word",
                          }}>
                            {isTarget ? highlight(cm.content, query) : cm.content}
                          </span>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => { onJumpTo(r.channel_id, r.id); onClose(); }}
                      style={{
                        marginTop: "0.4rem",
                        background: "transparent",
                        border: `1px solid ${theme.primaryDim}`,
                        borderRadius: "2px",
                        color: theme.primary,
                        cursor: "pointer",
                        fontSize: "0.6rem",
                        fontFamily: "'Share Tech Mono', monospace",
                        letterSpacing: "0.06em",
                        padding: "3px 10px",
                      }}
                    >
                      JUMP TO CHANNEL →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.4rem 1rem",
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          gap: "1rem",
          fontSize: "0.58rem",
          fontFamily: "'Share Tech Mono', monospace",
          color: theme.textDim,
          opacity: 0.6,
        }}>
          <span>ESC to close</span>
          <span>▼ CONTEXT to preview surrounding messages</span>
          <span>JUMP → to navigate</span>
        </div>
      </div>

      <style>{`
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}