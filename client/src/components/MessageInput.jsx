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
      <input
        style={styles.input}
        placeholder={`Message #${channel}`}
        value={text}
        onChange={handleChange}
      />
      <button style={styles.button} type="submit">Send</button>
    </form>
  );
}

const styles = {
  form: { display: "flex", gap: "0.5rem", padding: "1rem 1.5rem", borderTop: "1px solid #0f3460" },
  input: { flex: 1, padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #0f3460", background: "#0f3460", color: "#fff", fontSize: "1rem" },
  button: { padding: "0.75rem 1.25rem", borderRadius: "8px", background: "#e94560", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" },
};