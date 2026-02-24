export default function VoiceIndicator({ inVoice, voiceChannel, participants, leaveVoice }) {
  if (!inVoice) return null;

  return (
    <div style={styles.container}>
      <div style={styles.status}>
        <span style={styles.dot} />
        <span style={styles.text}>Voice Connected — {voiceChannel?.replace("voice-", "")}</span>
      </div>
      {participants.length > 0 && (
        <div style={styles.participants}>
          {participants.map((name) => (
            <span key={name} style={styles.participant}>🎙 {name}</span>
          ))}
        </div>
      )}
      <button onClick={leaveVoice} style={styles.leave}>Disconnect</button>
    </div>
  );
}

const styles = {
  container: { padding: "0.5rem 1rem", background: "#0d2137", borderTop: "1px solid #0f3460", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" },
  status: { display: "flex", alignItems: "center", gap: "0.5rem" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", display: "inline-block" },
  text: { color: "#4ade80", fontSize: "0.8rem", fontWeight: "bold" },
  participants: { display: "flex", gap: "0.5rem", flex: 1 },
  participant: { color: "#aaa", fontSize: "0.8rem" },
  leave: { background: "#e94560", border: "none", color: "#fff", borderRadius: "6px", padding: "0.25rem 0.75rem", cursor: "pointer", fontSize: "0.8rem" },
};