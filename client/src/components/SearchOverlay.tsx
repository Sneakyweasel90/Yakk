import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import config from "../config";
import type { SearchResult } from "../types";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
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

  // Re-search when scope toggle changes
  useEffect(() => {
    if (query.trim().length >= 2) doSearch(query);
  }, [scopeChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: theme.primaryDim, color: theme.primary, borderRadius: "2px" }}>{part}</mark> : part
    );
  };

  return (
    <div style={{ ...styles.overlay }} onClick={onClose}>
      <div
        style={{ ...styles.panel, background: theme.surface, border: `1px solid ${theme.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ ...styles.header, borderColor: theme.border }}>
          <span style={{ ...styles.searchIcon, color: theme.textDim }}>⌕</span>
          <input
            ref={inputRef}
            style={{ ...styles.input, color: theme.primary, background: "transparent" }}
            placeholder="search messages..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKey}
          />
          <button
            style={{
              ...styles.scopeBtn,
              color: scopeChannel ? theme.primary : theme.textDim,
              border: `1px solid ${scopeChannel ? theme.primaryDim : theme.border}`,
              background: scopeChannel ? theme.primaryGlow : "transparent",
            }}
            onClick={() => setScopeChannel(s => !s)}
            title="Limit search to current channel"
          >
            #{currentChannel}
          </button>
          <button onClick={onClose} style={{ ...styles.closeBtn, color: theme.textDim }}>✕</button>
        </div>

        {/* Results */}
        <div style={styles.results}>
          {loading && (
            <div style={{ ...styles.empty, color: theme.textDim }}>SEARCHING...</div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ ...styles.empty, color: theme.textDim }}>NO RESULTS FOUND</div>
          )}
          {!loading && results.map(r => (
            <div
              key={r.id}
              style={{ ...styles.result, borderColor: theme.border }}
              onClick={() => { onJumpTo(r.channel_id, r.id); onClose(); }}
            >
              <div style={styles.resultMeta}>
                <span style={{ ...styles.resultChannel, color: theme.primary }}>#{r.channel_id}</span>
                <span style={{ ...styles.resultUser, color: theme.textDim }}>{r.username}</span>
                <span style={{ ...styles.resultTime, color: theme.textDim }}>
                  {new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </div>
              <div style={{ ...styles.resultContent, color: theme.text }}>
                {highlight(r.content, query)}
              </div>
            </div>
          ))}
        </div>
        <style>{`input:focus { outline: none; } input::placeholder { color: ${theme.textDim}; opacity: 0.5; }`}</style>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    zIndex: 2000, display: "flex", alignItems: "flex-start",
    justifyContent: "center", paddingTop: "8vh",
  },
  panel: {
    width: "600px", maxWidth: "90vw", borderRadius: "4px",
    overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
    display: "flex", flexDirection: "column", maxHeight: "70vh",
  },
  header: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.75rem 1rem", borderBottom: "1px solid",
  },
  searchIcon: { fontSize: "1.3rem", lineHeight: 1, flexShrink: 0 },
  input: {
    flex: 1, border: "none", fontSize: "0.95rem",
    fontFamily: "'Share Tech Mono', monospace", padding: "0.1rem 0",
  },
  scopeBtn: {
    padding: "2px 8px", borderRadius: "2px", cursor: "pointer",
    fontFamily: "'Share Tech Mono', monospace", fontSize: "0.65rem",
    letterSpacing: "0.05em", transition: "all 0.15s", flexShrink: 0,
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1rem", flexShrink: 0, padding: "0 0.25rem",
  },
  results: { overflowY: "auto", flex: 1 },
  empty: {
    padding: "2rem", textAlign: "center",
    fontFamily: "'Share Tech Mono', monospace", fontSize: "0.75rem", letterSpacing: "0.1em",
  },
  result: {
    padding: "0.75rem 1rem", borderBottom: "1px solid",
    cursor: "pointer", transition: "all 0.1s",
  },
  resultMeta: { display: "flex", gap: "0.75rem", alignItems: "baseline", marginBottom: "0.3rem" },
  resultChannel: { fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", fontWeight: 700 },
  resultUser: { fontFamily: "'Share Tech Mono', monospace", fontSize: "0.65rem" },
  resultTime: { fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", marginLeft: "auto" },
  resultContent: { fontSize: "0.9rem", fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.4 },
};