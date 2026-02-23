import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import Sidebar from "./Sidebar";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import TitleBar from "./TitleBar";

export default function Chat() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [channel, setChannel] = useState("general");
  const [typers, setTypers] = useState({});
  const bottomRef = useRef(null);
  const typingTimers = useRef({});

  const handleMessage = useCallback((data) => {
  if (data.type === "history") {
    setMessages(data.messages); // replaces, not appends
  }
  if (data.type === "message") {
    setMessages((prev) => {
      // prevent duplicate messages by checking id
      if (prev.find((m) => m.id === data.message.id)) return prev;
      return [...prev, data.message];
    });
  }
  if (data.type === "typing") {
    setTypers((prev) => ({ ...prev, [data.userId]: data.username }));
    clearTimeout(typingTimers.current[data.userId]);
    typingTimers.current[data.userId] = setTimeout(() => {
      setTypers((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    }, 3000);
  }
}, []);

  const { send } = useWebSocket(user.token, handleMessage);

  useEffect(() => {
    setMessages([]);
    const timeout = setTimeout(() => {
        send({ type: "join", channelId: channel });
    }, 100);
    return () => clearTimeout(timeout);
}, [channel, send]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.layout}>
      <TitleBar />
      <div style={styles.body}>
        <Sidebar channel={channel} setChannel={setChannel} logout={logout} username={user.username} />
        <div style={styles.main}>
          <div style={styles.header}>
            <span style={styles.channelName}># {channel}</span>
          </div>
          <div style={styles.messages}>
            {messages.map((msg) => (
              <div key={msg.id} style={styles.message}>
                <span style={styles.author}>{msg.username}</span>
                <span style={styles.content}>{msg.content}</span>
                <span style={styles.time}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <TypingIndicator typers={typers} currentUserId={user.id} />
          <MessageInput send={send} channel={channel} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: "flex", flexDirection: "column", height: "100vh", background: "#1a1a2e", color: "#fff" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  header: { padding: "1rem 1.5rem", background: "#16213e", borderBottom: "1px solid #0f3460" },
  channelName: { fontWeight: "bold", fontSize: "1.1rem", color: "#e94560" },
  messages: { flex: 1, overflowY: "auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" },
  message: { display: "flex", gap: "0.75rem", alignItems: "baseline", padding: "0.4rem 0" },
  author: { fontWeight: "bold", color: "#e94560", minWidth: "80px" },
  content: { color: "#ddd", flex: 1 },
  time: { fontSize: "0.75rem", color: "#555" },
};