import { useState, useRef } from "react";

export default function MessageInput({ send, channel }) {
  const [text, setText] = useState("");
  const typingRef = useRef(false);

  const handleChange = (e) => {
    setText(e.target.value);
    if (!typingRef.current) {
      send({ type: "typing", channelId: channel });
      typingRef.current = true;
      setTimeout(() => { typingRef.current = false; }, 2000);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    send({ type: "message", channelId: channel, content: text });
    setText("");
  };

  return (
    <form onSubmit={handleSend} style={styles.form}>
      <div style={styles.inputWrap}>
        <span style={styles.prompt}>&gt;</span>
        <input
          style={styles.input}
          placeholder={`transmit to #${channel}...`}
          value={text}
          onChange={handleChange}
        />
      </div>
      <button style={styles.button} type="submit">SEND</button>
      <style>{`
        .msg-input::placeholder { color: rgba(0,255,159,0.2); }
        .msg-input:focus { outline: none; }
        .send-btn:hover { background: #00ff9f !important; color: #000 !important; }
      `}</style>
    </form>
  );
}

const styles = {
  form: {
    display: "flex", gap: "0.5rem", padding: "0.75rem 1.5rem",
    borderTop: "1px solid rgba(0,255,159,0.15)",
    background: "rgba(0,10,6,0.95)",
  },
  inputWrap: {
    flex: 1, display: "flex", alignItems: "center", gap: "0.5rem",
    background: "rgba(0,255,159,0.03)", border: "1px solid rgba(0,255,159,0.15)",
    borderRadius: "2px", padding: "0 1rem",
  },
  prompt: { color: "rgba(0,255,159,0.4)", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.9rem" },
  input: {
    flex: 1, padding: "0.65rem 0", background: "transparent",
    border: "none", color: "#00ff9f", fontSize: "0.9rem",
    fontFamily: "'Share Tech Mono', monospace",
  },
  button: {
    padding: "0 1.25rem", background: "transparent",
    border: "1px solid rgba(0,255,159,0.4)", borderRadius: "2px",
    color: "#00ff9f", fontSize: "0.7rem", cursor: "pointer",
    fontFamily: "'Orbitron', monospace", fontWeight: 700,
    letterSpacing: "0.1em", transition: "all 0.15s",
  },
};