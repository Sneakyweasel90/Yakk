import axios from "axios";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import config from "../../config";

// ── Invite Codes Panel ────────────────────────────────────────────────────────

interface InviteToken {
  id: number;
  token: string;
  note: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by_username: string | null;
}

export default function InvitePanel({ token }: { token: string }) {
  const { theme } = useTheme();
  const [invites, setInvites]       = useState<InviteToken[]>([]);
  const [loading, setLoading]       = useState(true);
  const [note, setNote]             = useState("");
  const [expiresIn, setExpiresIn]   = useState("24");
  const [creating, setCreating]     = useState(false);
  const [copied, setCopied]         = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${config.HTTP}/api/admin/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvites(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const body: Record<string, unknown> = { note: note.trim() || undefined };
      if (expiresIn !== "never") body.expiresInHours = parseInt(expiresIn);
      const { data } = await axios.post(`${config.HTTP}/api/admin/invites`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvites(prev => [data, ...prev]);
      setNote("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: number) => {
    if (!confirm("Revoke this invite code?")) return;
    try {
      await axios.delete(`${config.HTTP}/api/admin/invites/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || "Failed");
    }
  };

  const copy = async (invite: InviteToken) => {
    await navigator.clipboard.writeText(invite.token);
    setCopied(invite.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatExpiry = (invite: InviteToken) => {
    if (invite.used_at) return `used by ${invite.used_by_username}`;
    if (!invite.expires_at) return "no expiry";
    const d = new Date(invite.expires_at);
    if (d < new Date()) return "expired";
    return `expires ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const isUsedOrExpired = (invite: InviteToken) =>
    !!invite.used_at || (!!invite.expires_at && new Date(invite.expires_at) < new Date());

  if (loading) return <div style={{ color: theme.textDim, fontSize: "0.75rem", textAlign: "center", padding: "1rem" }}>LOADING...</div>;

  return (
    <div>
      {/* Generate form */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem", padding: "0.75rem", border: `1px solid ${theme.border}`, borderRadius: "2px", background: theme.background }}>
        <div style={{ fontSize: "0.6rem", color: theme.textDim, letterSpacing: "0.1em", fontFamily: "'Share Tech Mono', monospace" }}>GENERATE INVITE</div>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="note (optional — who is this for?)"
          style={{ ...inputStyle, background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
        />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.6rem", color: theme.textDim, fontFamily: "'Share Tech Mono', monospace", whiteSpace: "nowrap" }}>EXPIRES IN</span>
          <select
            value={expiresIn}
            onChange={e => setExpiresIn(e.target.value)}
            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: "0.7rem", fontFamily: "'Share Tech Mono', monospace", padding: "3px 6px", borderRadius: "2px", cursor: "pointer" }}
          >
            <option value="1">1 hour</option>
            <option value="6">6 hours</option>
            <option value="24">24 hours</option>
            <option value="72">3 days</option>
            <option value="168">7 days</option>
            <option value="never">never</option>
          </select>
          <button
            onClick={create}
            disabled={creating}
            style={{ ...btnStyle, color: theme.primary, borderColor: theme.primaryDim, marginLeft: "auto" }}
          >
            {creating ? "..." : "+ CREATE"}
          </button>
        </div>
      </div>

      {/* Token list */}
      {invites.length === 0 ? (
        <div style={{ color: theme.textDim, fontSize: "0.7rem", textAlign: "center", padding: "0.5rem", fontFamily: "'Share Tech Mono', monospace" }}>
          No invite codes yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {invites.map(inv => {
            const dead = isUsedOrExpired(inv);
            return (
              <div key={inv.id} style={{
                border: `1px solid ${dead ? theme.border : theme.primaryDim}`,
                borderRadius: "2px",
                padding: "8px 10px",
                background: dead ? theme.background : `${theme.primaryGlow}`,
                opacity: dead ? 0.5 : 1,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <code style={{ flex: 1, fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", color: dead ? theme.textDim : theme.primary, wordBreak: "break-all" }}>
                    {inv.token}
                  </code>
                  {!dead && (
                    <button onClick={() => copy(inv)} style={{ ...btnStyle, color: theme.primary, borderColor: theme.primaryDim, flexShrink: 0 }}>
                      {copied === inv.id ? "✓" : "COPY"}
                    </button>
                  )}
                  <button onClick={() => revoke(inv.id)} style={{ ...btnStyle, color: theme.textDim, borderColor: theme.border, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace", color: theme.textDim }}>
                  {inv.note && <span>{inv.note}</span>}
                  <span style={{ marginLeft: inv.note ? 0 : "auto", opacity: 0.7 }}>{formatExpiry(inv)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: "2px",
  fontSize: "0.75rem",
  fontFamily: "'Share Tech Mono', monospace",
  outline: "none",
  width: "100%",
};

const btnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid",
  cursor: "pointer",
  fontSize: "0.6rem",
  padding: "2px 7px",
  borderRadius: "2px",
  fontFamily: "'Share Tech Mono', monospace",
  letterSpacing: "0.08em",
  transition: "all 0.15s",
};