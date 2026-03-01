import { useTheme } from "../context/ThemeContext";
import { useVoiceControls } from "../hooks/useVoiceControls";
import type { MutableRefObject } from "react";

interface Props {
  inVoice: boolean;
  voiceChannel: string | null;
  participants: string[];
  leaveVoice: () => void;
  localStream: MutableRefObject<MediaStream | null>;
}

export default function VoiceIndicator({ inVoice, voiceChannel, participants, leaveVoice, localStream }: Props) {
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
      alignItems: "center",
      gap: "0.6rem",
      flexWrap: "wrap",
    }}>
      {/* Status dot + channel name */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
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

      {/* Participants */}
      {participants.length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", flex: 1, flexWrap: "wrap" }}>
          {participants.map((name) => (
            <span key={name} style={{
              color: theme.textDim, fontSize: "0.72rem",
              fontFamily: "'Share Tech Mono', monospace",
            }}>
              🎙 {name}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>

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

        {/* Mute button (only in open mic mode) */}
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
          style={{
            ...btnBase,
            color: theme.textDim,
            borderColor: theme.border,
            background: "transparent",
          }}
        >
          {mode === "open" ? "PTT" : "OPEN MIC"}
        </button>

        {/* Keybind assign buttons */}
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {/* Mute keybind (only relevant in open mic mode) */}
          {mode === "open" && (
            <button
              onClick={() => setAssigningKey(assigningKey === "mute" ? null : "mute")}
              title="Assign mute key"
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

          {/* PTT keybind (only relevant in PTT mode) */}
          {mode === "ptt" && (
            <button
              onClick={() => setAssigningKey(assigningKey === "ptt" ? null : "ptt")}
              title="Assign PTT key"
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
        </div>

        {/* Disconnect */}
        <button
          onClick={handleLeave}
          style={{
            ...btnBase,
            color: "#f87171",
            borderColor: "#f87171",
            background: "transparent",
          }}
        >
          DISCONNECT
        </button>
      </div>
    </div>
  );
}