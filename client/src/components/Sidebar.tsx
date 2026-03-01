import { useTheme } from "../context/ThemeContext";
import { useChannels } from "../hooks/useChannels";
import ChannelList from "./ChannelList";
import SidebarFooter from "./SidebarFooter";
import type { OnlineUser } from "../types";

interface Props {
  channel: string;
  setChannel: (c: string) => void;
  voiceChannel: string | null;
  joinVoice: (c: string) => void;
  leaveVoice: () => void;
  logout: () => void;
  username: string;
  nickname: string | null;
  avatar: string | null;
  userId: number;
  token: string;
  onlineUsers: OnlineUser[];
  onSearchOpen: () => void;
  onNicknameChange: (nickname: string | null) => void;
  onAvatarChange: (avatar: string | null) => void;
  participants: string[];
  voiceOccupancy: Record<string, string[]>;
}

export default function Sidebar({
  channel, setChannel, voiceChannel, joinVoice, leaveVoice,
  logout, username, nickname, avatar, userId, token,
  onlineUsers, onSearchOpen, onNicknameChange, onAvatarChange,
  participants, voiceOccupancy,
}: Props) {
  const { theme } = useTheme();
  const {
    textChannels, voiceChannels,
    newChannelName, setNewChannelName, creating,
    showCreateText, showCreateVoice,
    createChannel, deleteChannel,
    toggleCreateText, toggleCreateVoice, cancelCreate,
  } = useChannels(token);

  return (
    <div style={{
      width: "100%", minWidth: "100%", height: "100%",
      display: "flex", flexDirection: "column", borderRight: "1px solid",
      fontFamily: "'Rajdhani', sans-serif", overflowY: "auto",
      background: `linear-gradient(180deg, ${theme.surface2} 0%, ${theme.surface} 100%)`,
      borderColor: theme.border,
    }}>
      {/* Logo */}
      <div style={{ padding: "1.25rem 1rem", borderBottom: `1px solid ${theme.border}` }}>
        <span style={{
          fontFamily: "'Orbitron', monospace", fontSize: "1.2rem", fontWeight: 900,
          letterSpacing: "0.3em", color: theme.primary,
          textShadow: `0 0 15px ${theme.primaryGlow}`,
        }}>
          YAKK
        </span>
        <div style={{ height: "1px", width: "40px", marginTop: "4px", background: `linear-gradient(90deg, ${theme.primary}, transparent)` }} />
      </div>

      {/* Search button */}
      <div
        style={{
          margin: "0.5rem", padding: "0.45rem 0.75rem", cursor: "pointer",
          border: `1px solid ${theme.border}`, borderRadius: "2px",
          display: "flex", alignItems: "center", gap: "0.5rem",
          transition: "all 0.15s", color: theme.textDim,
        }}
        onClick={onSearchOpen}
      >
        <span style={{ fontSize: "0.85rem" }}>⌕</span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
          SEARCH
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.6rem", opacity: 0.5 }}>
          ctrl+k
        </span>
      </div>

      <ChannelList
        textChannels={textChannels}
        voiceChannels={voiceChannels}
        activeChannel={channel}
        voiceChannel={voiceChannel}
        participants={participants}
        username={username}
        newChannelName={newChannelName}
        creating={creating}
        showCreateText={showCreateText}
        showCreateVoice={showCreateVoice}
        onSelectChannel={setChannel}
        onJoinVoice={joinVoice}
        onLeaveVoice={leaveVoice}
        onDeleteChannel={deleteChannel}
        onToggleCreateText={toggleCreateText}
        onToggleCreateVoice={toggleCreateVoice}
        onChannelNameChange={setNewChannelName}
        onCreateChannel={createChannel}
        onCancelCreate={cancelCreate}
        voiceOccupancy={voiceOccupancy}
      />

      <SidebarFooter
        username={username}
        nickname={nickname}
        avatar={avatar}
        userId={userId}
        token={token}
        onlineUsers={onlineUsers}
        onNicknameChange={onNicknameChange}
        onAvatarChange={onAvatarChange}
        onLogout={logout}
      />
    </div>
  );
}