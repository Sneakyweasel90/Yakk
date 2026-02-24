import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export default function MessageInput({ send, channel }) {
  const [text, setText] = useState("");
  const typingRef = useRef(false);
  const { theme } = useTheme();

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
    <form onSubmit={handleSend} style={{ ...styles.form, background: theme.surface, borderColor: theme.border }}>
      <div style={{ ...styles.inputWrap, background: theme.primaryGlow, borderColor: theme.border }}>
        <span style={{ ...styles.prompt, color: theme.textDim }}>&gt;</span>
        <input
          style={{ ...styles.input, color: theme.primary }}
          placeholder={`transmit to #${channel}...`}
          value={text}
          onChange={handleChange}
        />
      </div>
      <button
        style={{ ...styles.button, color: theme.primary, borderColor: theme.primaryDim }}
        type="submit"
      >
        SEND
      </button>
      <style>{`
        input::placeholder { color: ${theme.textDim}; opacity: 0.4; }
        input:focus { outline: none; }
        .send-btn:hover { background: ${theme.primary} !important; color: #000 !important; }
      `}</style>
    </form>
  );
}

const styles = {
  form: {
    display: "flex", gap: "0.5rem", padding: "0.75rem 1.5rem",
    borderTop: "1px solid",
  },
  inputWrap: {
    flex: 1, display: "flex", alignItems: "center", gap: "0.5rem",
    border: "1px solid", borderRadius: "2px", padding: "0 1rem",
  },
  prompt: {
    fontFamily: "'Share Tech Mono', monospace", fontSize: "0.9rem",
  },
  input: {
    flex: 1, padding: "0.65rem 0", background: "transparent",
    border: "none", fontSize: "0.9rem",
    fontFamily: "'Share Tech Mono', monospace",
  },
  button: {
    padding: "0 1.25rem", background: "transparent",
    border: "1px solid", borderRadius: "2px",
    fontSize: "0.7rem", cursor: "pointer",
    fontFamily: "'Orbitron', monospace", fontWeight: 700,
    letterSpacing: "0.1em", transition: "all 0.15s",
  },
};