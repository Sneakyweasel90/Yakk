import { useTheme } from "../../context/ThemeContext";
import { useVoiceControls } from "../../hooks/useVoiceControls";

interface Props {
  inVoice: boolean;
  voiceChannel: string | null;
  participants: string[];
  participantVolumes: Record<string, number>;
  selfVolume: number;
  leaveVoice: () => void;
  localStream: MutableRefObject<MediaStream | null>;
  setParticipantVolume: (username: string, volume: number) => void;
  setSelfVolume: (volume: number) => void;
}

function VolumeSlider({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: "60px" }}>
      <span style={{
        fontSize: "0.58rem", fontFamily: "'Share Tech Mono', monospace",
        color, letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden",
        textOverflow: "ellipsis", maxWidth: "72px", textAlign: "center",
      }}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: "64px",
          accentColor: color,
          cursor: "pointer",
          height: "3px",
        }}
        title={`${Math.round(value * 100)}%`}
      />
      <span style={{
        fontSize: "0.55rem", fontFamily: "'Share Tech Mono', monospace",
        color, opacity: 0.6,
      }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function VoiceIndicator({
  inVoice, voiceChannel, participants,
  participantVolumes, selfVolume,
  leaveVoice, localStream,
  setParticipantVolume, setSelfVolume,
}: Props) {
  const { theme } = useTheme();
  const {
    isMuted,
    isDeafened,
    isPttActive,
    mode,
    muteKey,
    pttKey,
    assigningKey,
    toggleMute,
    toggleDeafen,
    toggleMode,
    setAssigningKey,
    resetControls,
  } = useVoiceControls(localStream);

  if (!inVoice) return null;

  const handleLeave = () => {
    resetControls();
    leaveVoice();
  };

  const btnBase: React.CSSProperties = {
    border: "1px solid",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: "0.65rem",
    fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: "0.08em",
    padding: "3px 8px",
    transition: "all 0.15s",
  };

  return (
    <div style={{
      padding: "0.4rem 1rem",
      background: theme.surface,
      borderTop: `1px solid ${theme.border}`,
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
    }}>
      {/* Channel label */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{
          fontSize: "0.6rem", fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: "0.1em", color: theme.primary,
        }}>
          🔊 {voiceChannel}
        </span>
        {mode === "ptt" && (
          <span style={{
            fontSize: "0.58rem", fontFamily: "'Share Tech Mono', monospace",
            color: isPttActive ? theme.primary : theme.textDim,
            background: isPttActive ? theme.primaryGlow : "transparent",
            border: `1px solid ${isPttActive ? theme.primary : theme.border}`,
            borderRadius: "2px", padding: "1px 5px",
            transition: "all 0.1s",
          }}>
            {isPttActive ? "● TRANSMITTING" : `PTT: ${pttKey}`}
          </span>
        )}
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>

        {/* Mute button */}
        {mode === "open" && (
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute mic" : "Mute mic"}
            style={{
              ...btnBase,
              color: isMuted ? "#f87171" : theme.textDim,
              borderColor: isMuted ? "#f87171" : theme.border,
              background: isMuted ? "rgba(248,113,113,0.1)" : "transparent",
            }}
          >
            {isMuted ? "🔇 MUTED" : "🎙 MUTE"}
          </button>
        )}

        {/* Deafen button — always visible */}
        <button
          onClick={toggleDeafen}
          title={isDeafened ? "Undeafen" : "Deafen (mutes mic + all incoming audio)"}
          style={{
            ...btnBase,
            color: isDeafened ? "#f97316" : theme.textDim,
            borderColor: isDeafened ? "#f97316" : theme.border,
            background: isDeafened ? "rgba(249,115,22,0.1)" : "transparent",
          }}
        >
          {isDeafened ? "🔕 DEAFENED" : "🔔 DEAFEN"}
        </button>

        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          title={mode === "open" ? "Switch to Push to Talk" : "Switch to Open Mic"}
          style={{ ...btnBase, color: theme.textDim, borderColor: theme.border, background: "transparent" }}
        >
          {mode === "open" ? "PTT" : "OPEN MIC"}
        </button>

        {/* Keybind assign */}
        {mode === "open" && (
          <button
            onClick={() => setAssigningKey(assigningKey === "mute" ? null : "mute")}
            style={{
              ...btnBase,
              color: assigningKey === "mute" ? theme.primary : theme.textDim,
              borderColor: assigningKey === "mute" ? theme.primary : theme.border,
              background: assigningKey === "mute" ? theme.primaryGlow : "transparent",
            }}
          >
            {assigningKey === "mute" ? "PRESS A KEY..." : `MUTE KEY: ${muteKey}`}
          </button>
        )}
        {mode === "ptt" && (
          <button
            onClick={() => setAssigningKey(assigningKey === "ptt" ? null : "ptt")}
            style={{
              ...btnBase,
              color: assigningKey === "ptt" ? theme.primary : theme.textDim,
              borderColor: assigningKey === "ptt" ? theme.primary : theme.border,
              background: assigningKey === "ptt" ? theme.primaryGlow : "transparent",
            }}
          >
            {assigningKey === "ptt" ? "PRESS A KEY..." : `PTT KEY: ${pttKey}`}
          </button>
        )}

        {/* Disconnect */}
        <button
          onClick={handleLeave}
          style={{ ...btnBase, color: "#f87171", borderColor: "#f87171", background: "transparent" }}
        >
          DISCONNECT
        </button>
      </div>

      {/* Volume sliders */}
      {participants.length > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          paddingTop: "0.25rem",
          borderTop: `1px solid ${theme.border}`,
          opacity: isDeafened ? 0.4 : 1,
          transition: "opacity 0.2s",
        }}>
          <VolumeSlider
            label="YOU"
            value={selfVolume}
            onChange={setSelfVolume}
            color={theme.primary}
          />
          {participants.map((name) => (
            <VolumeSlider
              key={name}
              label={name}
              value={participantVolumes[name] ?? 1}
              onChange={(v) => setParticipantVolume(name, v)}
              color={theme.textDim}
            />
          ))}
        </div>
      )}
    </div>
  );
}