import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";
import type { Channel } from "../types";

interface CreateChannelInputProps {
  type: "text" | "voice";
  value: string;
  creating: boolean;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function CreateChannelInput({
  type,
  value,
  creating,
  onChange,
  onSubmit,
  onCancel,
}: CreateChannelInputProps) {
  const { theme } = useTheme();
  return (
    <div
      style={{ padding: "0.25rem 0.75rem", display: "flex", gap: "0.35rem" }}
    >
      <input
        autoFocus
        style={{
          flex: 1,
          background: theme.primaryGlow,
          border: `1px solid ${theme.border}`,
          color: theme.primary,
          padding: "0.3rem 0.5rem",
          borderRadius: "2px",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.75rem",
          outline: "none",
        }}
        placeholder={type === "voice" ? "channel-name" : "channel-name"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        onClick={onSubmit}
        disabled={creating}
        style={{
          background: theme.primaryGlow,
          border: `1px solid ${theme.primaryDim}`,
          color: theme.primary,
          cursor: "pointer",
          borderRadius: "2px",
          padding: "0 0.4rem",
          fontSize: "0.8rem",
        }}
      >
        ✓
      </button>
    </div>
  );
}

interface ChannelListProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  activeChannel: string;
  voiceChannel: string | null;
  participants: string[];
  username: string;
  newChannelName: string;
  creating: boolean;
  showCreateText: boolean;
  showCreateVoice: boolean;
  voiceOccupancy: Record<string, string[]>;
  onSelectChannel: (name: string) => void;
  onJoinVoice: (name: string) => void;
  onLeaveVoice: () => void;
  onDeleteChannel: (id: number, e: React.MouseEvent) => void;
  onToggleCreateText: () => void;
  onToggleCreateVoice: () => void;
  onChannelNameChange: (val: string) => void;
  onCreateChannel: (type: "text" | "voice") => void;
  onCancelCreate: () => void;
}

export default function ChannelList({
  textChannels,
  voiceChannels,
  activeChannel,
  voiceChannel,
  participants,
  username,
  newChannelName,
  creating,
  showCreateText,
  showCreateVoice,
  voiceOccupancy,
  onSelectChannel,
  onJoinVoice,
  onLeaveVoice,
  onDeleteChannel,
  onToggleCreateText,
  onToggleCreateVoice,
  onChannelNameChange,
  onCreateChannel,
  onCancelCreate,
}: ChannelListProps) {
  const { theme } = useTheme();

  const channelStyle = (isActive: boolean) => ({
    padding: "0.4rem 1rem",
    cursor: "pointer",
    fontSize: "0.88rem",
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    position: "relative" as const,
    transition: "all 0.15s",
    margin: "1px 0",
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 600,
    color: isActive ? theme.primary : theme.textDim,
    background: isActive ? theme.primaryGlow : "transparent",
    borderLeft: isActive
      ? `2px solid ${theme.primary}`
      : "2px solid transparent",
  });

  return (
    <>
      {/* Text channels */}
      <div
        style={{
          padding: "0.75rem 1rem 0.3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            fontFamily: "'Share Tech Mono', monospace",
            letterSpacing: "0.08em",
            color: theme.textDim,
          }}
        >
          // TEXT CHANNELS
        </span>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            lineHeight: 1,
            padding: "0 0.2rem",
            color: theme.textDim,
          }}
          onClick={onToggleCreateText}
          title="Create text channel"
        >
          +
        </button>
      </div>

      {showCreateText && (
        <CreateChannelInput
          type="text"
          value={newChannelName}
          creating={creating}
          onChange={onChannelNameChange}
          onSubmit={() => onCreateChannel("text")}
          onCancel={onCancelCreate}
        />
      )}

      {textChannels.map((ch) => (
        <div
          key={ch.id}
          onClick={() => onSelectChannel(ch.name)}
          style={channelStyle(ch.name === activeChannel)}
        >
          <span style={{ color: theme.border }}>#</span>
          <span style={{ flex: 1 }}>{ch.name}</span>
          {ch.name === activeChannel && (
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                flexShrink: 0,
                background: theme.primary,
                boxShadow: `0 0 6px ${theme.primary}`,
              }}
            />
          )}
          {ch.created_by !== null && (
            <span
              onClick={(e) => onDeleteChannel(ch.id, e)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
                lineHeight: 1,
                opacity: 0.4,
                padding: "0",
                flexShrink: 0,
                color: theme.textDim,
              }}
              title="Delete channel"
            >
              ×
            </span>
          )}
        </div>
      ))}

      {/* Voice channels */}
      <div
        style={{
          padding: "0.75rem 1rem 0.3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            fontFamily: "'Share Tech Mono', monospace",
            letterSpacing: "0.08em",
            color: theme.textDim,
          }}
        >
          // VOICE CHANNELS
        </span>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            lineHeight: 1,
            padding: "0 0.2rem",
            color: theme.textDim,
          }}
          onClick={onToggleCreateVoice}
          title="Create voice channel"
        >
          +
        </button>
      </div>

      {showCreateVoice && (
        <CreateChannelInput
          type="voice"
          value={newChannelName}
          creating={creating}
          onChange={onChannelNameChange}
          onSubmit={() => onCreateChannel("voice")}
          onCancel={onCancelCreate}
        />
      )}

      {voiceChannels.map((ch) => {
        // Use voiceOccupancy for everyone's view (server-authoritative).
        // Fall back to local participants if we're in the channel and occupancy
        // hasn't arrived yet (covers the brief moment between joining and first broadcast).
        const occupants: string[] =
          voiceOccupancy[ch.name] ??
          (ch.name === voiceChannel ? [username, ...participants] : []);

        return (
          <div
            key={ch.id}
            style={{ flexDirection: "column", alignItems: "stretch" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                paddingRight: "0.5rem",
              }}
            >
              <div
                onClick={() =>
                  voiceChannel === ch.name
                    ? onLeaveVoice()
                    : onJoinVoice(ch.name)
                }
                style={{ ...channelStyle(ch.name === voiceChannel), flex: 1 }}
              >
                <span style={{ color: theme.textDim }}>◈</span>
                <span style={{ flex: 1 }}>{ch.name.replace("voice-", "")}</span>
                {/* Show occupant count when channel has people and you're not in it */}
                {occupants.length > 0 && ch.name !== voiceChannel && (
                  <span
                    style={{
                      fontSize: "0.55rem",
                      fontFamily: "'Share Tech Mono', monospace",
                      color: theme.primary,
                      opacity: 0.7,
                    }}
                  >
                    {occupants.length}
                  </span>
                )}
              </div>
              {ch.name === voiceChannel && (
                <span
                  style={{
                    fontSize: "0.5rem",
                    borderRadius: "2px",
                    padding: "1px 4px",
                    fontFamily: "'Share Tech Mono', monospace",
                    letterSpacing: "0.1em",
                    border: "1px solid",
                    flexShrink: 0,
                    color: theme.primary,
                    borderColor: theme.primaryDim,
                    background: theme.primaryGlow,
                  }}
                >
                  LIVE
                </span>
              )}
              {ch.created_by !== null && (
                <span
                  onClick={(e) => onDeleteChannel(ch.id, e)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1rem",
                    lineHeight: 1,
                    opacity: 0.4,
                    padding: "0",
                    flexShrink: 0,
                    color: theme.textDim,
                  }}
                  title="Delete channel"
                >
                  ×
                </span>
              )}
            </div>

            {/* Show all occupants regardless of whether you're in the channel */}
            {occupants.map((name) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.2rem 1rem 0.2rem 2.5rem",
                }}
              >
                <Avatar username={name} size={18} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: theme.textDim,
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  {name}
                </span>
                <span style={{ fontSize: "0.55rem", color: "#4ade80" }}>
                  🎙
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

