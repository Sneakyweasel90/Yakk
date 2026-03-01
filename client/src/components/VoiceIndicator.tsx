import { useTheme } from "../context/ThemeContext";
import { useVoiceControls } from "../hooks/useVoiceControls";
import type { MutableRefObject } from "react";

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
    isPttActive,
    mode,
    muteKey,
    pttKey,
    assigningKey,
    toggleMute,
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
      alignItems: "flex-start",
      gap: "0.75rem",
      flexWrap: "wrap",
    }}>
      {/* Status dot + channel name */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", paddingTop: "6px" }}>
        <span style={{
          width: "7px", height: "7px", borderRadius: "50%",
          background: "#4ade80", boxShadow: "0 0 6px #4ade80",
          display: "inline-block", flexShrink: 0,
        }} />
        <span style={{
          color: "#4ade80", fontSize: "0.72rem",
          fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em",
        }}>
          {voiceChannel?.replace("voice-", "").toUpperCase()}
        </span>
      </div>

      {/* Volume sliders — self + each participant */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
        {/* Self volume */}
        <VolumeSlider
          label="YOU"
          value={selfVolume}
          onChange={setSelfVolume}
          color={theme.primary}
        />
        {/* Per-participant sliders */}
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

      {/* Controls on the right */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", paddingTop: "4px" }}>
        {/* PTT active indicator */}
        {mode === "ptt" && (
          <span style={{
            fontSize: "0.62rem", fontFamily: "'Share Tech Mono', monospace",
            color: isPttActive ? "#4ade80" : theme.textDim,
            border: `1px solid ${isPttActive ? "#4ade80" : theme.border}`,
            borderRadius: "2px", padding: "2px 6px",
            background: isPttActive ? "rgba(74,222,128,0.1)" : "transparent",
            transition: "all 0.1s",
          }}>
            {isPttActive ? "● TALKING" : "○ HOLD " + pttKey}
          </span>
        )}

        {/* Mute button (open mic mode only) */}
        {mode === "open" && (
          <button
            onClick={toggleMute}
            title={`${isMuted ? "Unmute" : "Mute"} (${muteKey})`}
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
    </div>
  );
}