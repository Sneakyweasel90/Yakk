import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";
import config from "../config";
import type { AdminUser, UserRole } from "../types";
import { RoleBadge } from "./RoleBadge";

interface Props {
  user: {
    id: number;
    username: string;
    nickname: string | null;
    avatar: string | null;
    token: string;
    role: UserRole;
    customRoleName: string | null;
  };
  onClose: () => void;
  onNicknameChange: (nickname: string | null) => void;
  onAvatarChange: (avatar: string | null) => void;
}

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

function InvitePanel({ token }: { token: string }) {
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

// ── Admin panel ───────────────────────────────────────────────────────────────

function AdminPanel({ token, currentUserId }: { token: string; currentUserId: number }) {
  const { theme } = useTheme();
  const [adminTab, setAdminTab] = useState<"users" | "invites">("users");
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [ownerId, setOwnerId]   = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [customNames, setCustomNames] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${config.HTTP}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data.users);
      setOwnerId(data.ownerId);
      const names: Record<number, string> = {};
      for (const u of data.users) {
        if (u.role === "custom") names[u.id] = u.custom_role_name || "";
      }
      setCustomNames(names);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const setRole = async (userId: number, role: UserRole) => {
    try {
      await axios.patch(
        `${config.HTTP}/api/admin/users/${userId}/role`,
        { role, customRoleName: customNames[userId] || "Member" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role, custom_role_name: role === "custom" ? (customNames[userId] || "Member") : null } : u));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || "Failed");
    }
  };

  const saveCustomName = async (userId: number) => {
    try {
      await axios.patch(
        `${config.HTTP}/api/admin/users/${userId}/role`,
        { role: "custom", customRoleName: customNames[userId] || "Member" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, custom_role_name: customNames[userId] || "Member" } : u));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || "Failed");
    }
  };

  const kick = async (userId: number, username: string) => {
    if (!window.confirm(`Kick ${username}? They will be logged out immediately.`)) return;
    try {
      await axios.post(`${config.HTTP}/api/admin/users/${userId}/kick`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`${username} has been kicked.`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || "Failed");
    }
  };

  const ban = async (userId: number, username: string, isBanned: boolean) => {
    const action = isBanned ? "unban" : "ban";
    if (!isBanned && !window.confirm(`Ban ${username}? They will be logged out and blocked from logging in.`)) return;
    try {
      await axios.post(`${config.HTTP}/api/admin/users/${userId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned_at: isBanned ? null : new Date().toISOString() } : u));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert(err.response?.data?.error || "Failed");
    }
  };

  const roleColor = (role: UserRole) =>
    role === "admin" ? theme.error : role === "custom" ? theme.primary : theme.textDim;

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: "0", marginBottom: "1rem", borderBottom: `1px solid ${theme.border}` }}>
        {(["users", "invites"] as const).map(t => (
          <button
            key={t}
            onClick={() => setAdminTab(t)}
            style={{
              background: "none", border: "none",
              borderBottom: `2px solid ${adminTab === t ? theme.primary : "transparent"}`,
              color: adminTab === t ? theme.primary : theme.textDim,
              fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: "0.1em", padding: "0.4rem 0.75rem",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {t === "users" ? "USERS" : "INVITE CODES"}
          </button>
        ))}
      </div>

      {/* Users sub-tab */}
      {adminTab === "users" && (
        <>
          {loading && <div style={{ color: theme.textDim, fontSize: "0.75rem", padding: "1rem", textAlign: "center" }}>LOADING USERS...</div>}
          {error && <div style={{ color: theme.error, fontSize: "0.75rem", padding: "1rem" }}>{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {users.map(u => {
              const isSelf     = u.id === currentUserId;
              const isOwner    = u.id === ownerId;
              const isAdmin    = u.role === "admin";
              const isProtected = isOwner || (isAdmin && currentUserId !== ownerId);
              const isBanned   = !!u.banned_at;
              return (
                <div key={u.id} style={{
                  border: `1px solid ${isBanned ? theme.error : theme.border}`,
                  borderRadius: "3px", padding: "8px 10px",
                  background: isBanned ? `${theme.error}11` : theme.background,
                  opacity: isBanned ? 0.7 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: isProtected || isSelf ? 0 : "6px" }}>
                    <Avatar username={u.nickname || u.username} avatar={u.avatar} size={24} />
                    <span style={{ fontSize: "0.8rem", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: theme.text, flex: 1 }}>
                      {u.nickname || u.username}
                      {u.nickname && <span style={{ fontSize: "0.65rem", color: theme.textDim, fontWeight: 400 }}> @{u.username}</span>}
                      {isSelf && <span style={{ fontSize: "0.6rem", color: theme.textDim, fontWeight: 400 }}> (you)</span>}
                    </span>
                    <span style={{ fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace", color: roleColor(u.role as UserRole) }}>
                      {u.role === "custom" ? u.custom_role_name : u.role}
                    </span>
                  </div>

                  {isProtected && !isSelf && (
                    <div style={{ fontSize: "0.6rem", color: theme.textDim, fontFamily: "'Share Tech Mono', monospace", marginTop: "4px", opacity: 0.6 }}>
                      {isOwner ? "server owner — cannot be modified" : "admin — only owner can modify"}
                    </div>
                  )}

                  {!isSelf && !isProtected && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <select
                        value={u.role}
                        onChange={e => setRole(u.id, e.target.value as UserRole)}
                        style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", padding: "2px 4px", borderRadius: "2px", cursor: "pointer" }}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="custom">custom</option>
                      </select>

                      {u.role === "custom" && (
                        <>
                          <input
                            value={customNames[u.id] ?? u.custom_role_name ?? ""}
                            onChange={e => setCustomNames(prev => ({ ...prev, [u.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && saveCustomName(u.id)}
                            placeholder="role name"
                            style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text, fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", padding: "2px 6px", borderRadius: "2px", width: "90px", outline: "none" }}
                          />
                          <button onClick={() => saveCustomName(u.id)} style={{ ...btnStyle, color: theme.primary, borderColor: theme.primaryDim }}>
                            SAVE
                          </button>
                        </>
                      )}

                      <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                        <button onClick={() => kick(u.id, u.username)} style={{ ...btnStyle, color: theme.textDim, borderColor: theme.border }}>
                          KICK
                        </button>
                        <button
                          onClick={() => ban(u.id, u.username, isBanned)}
                          style={{ ...btnStyle, color: isBanned ? "#4ade80" : theme.error, borderColor: isBanned ? "#4ade80" : theme.error }}
                        >
                          {isBanned ? "UNBAN" : "BAN"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Invites sub-tab */}
      {adminTab === "invites" && <InvitePanel token={token} />}
    </div>
  );
}

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

// ── Main AccountSettings ──────────────────────────────────────────────────────

export default function AccountSettings({ user, onClose, onNicknameChange, onAvatarChange }: Props) {
  const { theme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"profile" | "admin">("profile");

  const [nickname, setNickname]             = useState(user.nickname || "");
  const [avatarPreview, setAvatarPreview]   = useState<string | null>(user.avatar);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nickSaving, setNickSaving]   = useState(false);
  const [nickMsg, setNickMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMsg, setAvatarMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwMsg, setPwMsg]             = useState<{ text: string; ok: boolean } | null>(null);

  const displayName = user.nickname || user.username;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarMsg({ text: "Please select an image file", ok: false }); return; }
    if (file.size > 500 * 1024) { setAvatarMsg({ text: "Image must be under 500KB", ok: false }); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatarPreview(reader.result as string); setAvatarMsg(null); };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    setAvatarSaving(true);
    setAvatarMsg(null);
    try {
      const { data } = await axios.patch(
        `${config.HTTP}/api/users/me`,
        { avatar: avatarPreview },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      onAvatarChange(data.avatar);
      setAvatarMsg({ text: avatarPreview ? "Avatar saved" : "Avatar removed", ok: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setAvatarMsg({ text: err.response?.data?.error || "Failed to save", ok: false });
    } finally {
      setAvatarSaving(false);
    }
  };

  const saveNickname = async () => {
    setNickSaving(true);
    setNickMsg(null);
    try {
      const { data } = await axios.patch(
        `${config.HTTP}/api/users/me`,
        { nickname: nickname.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      onNicknameChange(data.nickname);
      setNickMsg({ text: nickname.trim() ? "Nickname saved" : "Nickname cleared", ok: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setNickMsg({ text: err.response?.data?.error || "Failed to save", ok: false });
    } finally {
      setNickSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword !== confirmPassword) { setPwMsg({ text: "Passwords do not match", ok: false }); return; }
    if (newPassword.length < 6) { setPwMsg({ text: "Must be at least 6 characters", ok: false }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await axios.patch(
        `${config.HTTP}/api/users/me`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setPwMsg({ text: "Password updated", ok: true });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setPwMsg({ text: err.response?.data?.error || "Failed to update", ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  const isAdmin = user.role === "admin";

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.modal, background: theme.surface, border: `1px solid ${theme.border}`, boxShadow: `0 0 40px ${theme.primaryGlow}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ ...styles.header, borderColor: theme.border }}>
          <span style={{ ...styles.title, color: theme.primary, textShadow: `0 0 10px ${theme.primaryDim}` }}>
            ◈ ACCOUNT SETTINGS
          </span>
          <button onClick={onClose} style={{ ...styles.closeBtn, color: theme.textDim }}>✕</button>
        </div>

        {/* Tabs — only show admin tab if admin */}
        {isAdmin && (
          <div style={{ display: "flex", borderBottom: `1px solid ${theme.border}` }}>
            {(["profile", "admin"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, background: "none", border: "none",
                  borderBottom: `2px solid ${tab === t ? theme.primary : "transparent"}`,
                  color: tab === t ? theme.primary : theme.textDim,
                  fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace",
                  letterSpacing: "0.12em", padding: "0.6rem",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {t === "profile" ? "◈ PROFILE" : "⚙ USER MANAGEMENT"}
              </button>
            ))}
          </div>
        )}

        {/* Profile tab */}
        {tab === "profile" && (
          <>
            {/* Profile preview */}
            <div style={{ ...styles.profile, borderColor: theme.border }}>
              <Avatar username={displayName} avatar={avatarPreview} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ ...styles.displayName, color: theme.primary }}>{displayName}</div>
                  <RoleBadge role={user.role} customRoleName={user.customRoleName} />
                </div>
                {user.nickname && <div style={{ ...styles.usernameHint, color: theme.textDim }}>@{user.username}</div>}
              </div>
            </div>

            {/* Avatar */}
            <div style={styles.section}>
              <label style={{ ...styles.label, color: theme.textDim }}>AVATAR IMAGE</label>
              <p style={{ ...styles.hint, color: theme.textDim }}>JPG or PNG, max 500KB.</p>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => fileRef.current?.click()} style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}` }}>
                  {avatarPreview ? "CHANGE IMAGE" : "UPLOAD IMAGE"}
                </button>
                {avatarPreview && (
                  <button onClick={() => { setAvatarPreview(null); setAvatarMsg(null); if (fileRef.current) fileRef.current.value = ""; }}
                    style={{ ...styles.btn, color: theme.textDim, border: `1px solid ${theme.border}` }}>
                    REMOVE
                  </button>
                )}
                <button onClick={saveAvatar} disabled={avatarSaving}
                  style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}`, opacity: avatarSaving ? 0.5 : 1 }}>
                  {avatarSaving ? "SAVING..." : "SAVE AVATAR"}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
              {avatarMsg && <p style={{ ...styles.msg, color: avatarMsg.ok ? "#4ade80" : theme.error }}>{avatarMsg.text}</p>}
            </div>

            {/* Nickname */}
            <div style={{ ...styles.section, borderTop: `1px solid ${theme.border}`, paddingTop: "1rem" }}>
              <label style={{ ...styles.label, color: theme.textDim }}>DISPLAY NAME</label>
              <div style={styles.row}>
                <input style={{ ...styles.input, background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
                  placeholder="nickname (leave blank to use username)" value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveNickname()} />
                <button onClick={saveNickname} disabled={nickSaving}
                  style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}`, opacity: nickSaving ? 0.5 : 1 }}>
                  {nickSaving ? "..." : "SAVE"}
                </button>
              </div>
              {nickMsg && <p style={{ ...styles.msg, color: nickMsg.ok ? "#4ade80" : theme.error }}>{nickMsg.text}</p>}
            </div>

            {/* Password */}
            <div style={{ ...styles.section, borderTop: `1px solid ${theme.border}`, paddingTop: "1rem" }}>
              <label style={{ ...styles.label, color: theme.textDim }}>CHANGE PASSWORD</label>
              <input style={{ ...styles.input, background: theme.background, border: `1px solid ${theme.border}`, color: theme.text, marginBottom: "0.5rem" }}
                type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <input style={{ ...styles.input, background: theme.background, border: `1px solid ${theme.border}`, color: theme.text, marginBottom: "0.5rem" }}
                type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <input style={{ ...styles.input, background: theme.background, border: `1px solid ${theme.border}`, color: theme.text, marginBottom: "0.75rem" }}
                type="password" placeholder="Confirm new password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && savePassword()} />
              <button onClick={savePassword} disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
                style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}`, opacity: (pwSaving || !currentPassword || !newPassword || !confirmPassword) ? 0.5 : 1 }}>
                {pwSaving ? "UPDATING..." : "UPDATE PASSWORD"}
              </button>
              {pwMsg && <p style={{ ...styles.msg, color: pwMsg.ok ? "#4ade80" : theme.error }}>{pwMsg.text}</p>}
            </div>
          </>
        )}

        {/* Admin tab */}
        {tab === "admin" && isAdmin && (
          <div style={styles.section}>
            <AdminPanel token={user.token} currentUserId={user.id} />
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { width: "480px", maxWidth: "95vw", borderRadius: "4px", fontFamily: "'Share Tech Mono', monospace", maxHeight: "90vh", overflowY: "auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid" },
  title: { fontSize: "0.8rem", letterSpacing: "0.1em" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "2px" },
  profile: { display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem", borderBottom: "1px solid" },
  displayName: { fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.05em" },
  usernameHint: { fontSize: "0.72rem", marginTop: "2px" },
  section: { padding: "1rem 1.25rem" },
  label: { fontSize: "0.65rem", letterSpacing: "0.12em", display: "block", marginBottom: "0.4rem" },
  hint: { fontSize: "0.7rem", marginBottom: "0.6rem", lineHeight: 1.4, opacity: 0.7 },
  row: { display: "flex", gap: "0.5rem" },
  input: { flex: 1, padding: "0.45rem 0.6rem", borderRadius: "2px", fontSize: "0.85rem", fontFamily: "'Share Tech Mono', monospace", outline: "none", width: "100%" },
  btn: { background: "none", cursor: "pointer", borderRadius: "2px", padding: "0.45rem 0.75rem", fontSize: "0.65rem", letterSpacing: "0.1em", fontFamily: "'Share Tech Mono', monospace", transition: "all 0.15s", whiteSpace: "nowrap" },
  msg: { fontSize: "0.72rem", marginTop: "0.5rem" },
};