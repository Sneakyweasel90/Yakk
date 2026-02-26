import { useState, useRef } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";
import config from "../config";

interface Props {
  user: { id: number; username: string; nickname: string | null; avatar: string | null; token: string };
  onClose: () => void;
  onNicknameChange: (nickname: string | null) => void;
  onAvatarChange: (avatar: string | null) => void;
}

export default function AccountSettings({ user, onClose, onNicknameChange, onAvatarChange }: Props) {
  const { theme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(user.nickname || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nickSaving, setNickSaving] = useState(false);
  const [nickMsg, setNickMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const displayName = user.nickname || user.username;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ text: "Please select an image file", ok: false });
      return;
    }
    if (file.size > 500 * 1024) {
      setAvatarMsg({ text: "Image must be under 500KB", ok: false });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      setAvatarMsg(null);
    };
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
      if (axios.isAxiosError(err)) {
        setAvatarMsg({ text: err.response?.data?.error || "Failed to save", ok: false });
      }
    } finally {
      setAvatarSaving(false);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarMsg(null);
    if (fileRef.current) fileRef.current.value = "";
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
      if (axios.isAxiosError(err)) {
        setNickMsg({ text: err.response?.data?.error || "Failed to save", ok: false });
      }
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
      if (axios.isAxiosError(err)) {
        setPwMsg({ text: err.response?.data?.error || "Failed to update", ok: false });
      }
    } finally {
      setPwSaving(false);
    }
  };

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

        {/* Profile preview */}
        <div style={{ ...styles.profile, borderColor: theme.border }}>
          <Avatar username={displayName} avatar={avatarPreview} size={56} />
          <div>
            <div style={{ ...styles.displayName, color: theme.primary }}>{displayName}</div>
            {user.nickname && (
              <div style={{ ...styles.usernameHint, color: theme.textDim }}>@{user.username}</div>
            )}
          </div>
        </div>

        {/* Avatar section */}
        <div style={styles.section}>
          <label style={{ ...styles.label, color: theme.textDim }}>AVATAR IMAGE</label>
          <p style={{ ...styles.hint, color: theme.textDim }}>JPG or PNG, max 500KB.</p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}` }}
            >
              {avatarPreview ? "CHANGE IMAGE" : "UPLOAD IMAGE"}
            </button>
            {avatarPreview && (
              <button
                onClick={removeAvatar}
                style={{ ...styles.btn, color: theme.textDim, border: `1px solid ${theme.border}` }}
              >
                REMOVE
              </button>
            )}
            <button
              onClick={saveAvatar}
              disabled={avatarSaving}
              style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}`, opacity: avatarSaving ? 0.5 : 1 }}
            >
              {avatarSaving ? "..." : "SAVE AVATAR"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
          {avatarMsg && <p style={{ ...styles.msg, color: avatarMsg.ok ? "#4ade80" : theme.error }}>{avatarMsg.text}</p>}
        </div>

        {/* Nickname section */}
        <div style={{ ...styles.section, borderTop: `1px solid ${theme.border}`, paddingTop: "1rem" }}>
          <label style={{ ...styles.label, color: theme.textDim }}>DISPLAY NICKNAME</label>
          <p style={{ ...styles.hint, color: theme.textDim }}>Shows in chat instead of your username. Leave blank to clear.</p>
          <div style={styles.row}>
            <input
              style={{ ...styles.input, background: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
              placeholder={user.username}
              value={nickname}
              maxLength={50}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveNickname()}
            />
            <button
              onClick={saveNickname}
              disabled={nickSaving}
              style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}`, opacity: nickSaving ? 0.5 : 1 }}
            >
              {nickSaving ? "..." : "SAVE"}
            </button>
          </div>
          {nickMsg && <p style={{ ...styles.msg, color: nickMsg.ok ? "#4ade80" : theme.error }}>{nickMsg.text}</p>}
        </div>

        {/* Password section */}
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
          <button
            onClick={savePassword}
            disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
            style={{ ...styles.btn, color: theme.primary, border: `1px solid ${theme.primaryDim}`, opacity: (pwSaving || !currentPassword || !newPassword || !confirmPassword) ? 0.4 : 1 }}
          >
            {pwSaving ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
          {pwMsg && <p style={{ ...styles.msg, color: pwMsg.ok ? "#4ade80" : theme.error }}>{pwMsg.text}</p>}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { width: "440px", maxWidth: "95vw", borderRadius: "4px", fontFamily: "'Share Tech Mono', monospace", maxHeight: "90vh", overflowY: "auto" },
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