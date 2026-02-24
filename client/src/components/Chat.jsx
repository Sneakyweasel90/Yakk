import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { useVoice } from "../hooks/useVoice";
import Sidebar from "./Sidebar";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import TitleBar from "./TitleBar";
import VoiceIndicator from "./VoiceIndicator";

export default function Chat() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [channel, setChannel] = useState("general");
  const [typers, setTypers] = useState({});
  const bottomRef = useRef(null);
  const typingTimers = useRef({});

  const handleMessage = useCallback((data) => {
    if (data.type === "history") setMessages(data.messages);
    if (data.type === "message") {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    }
    if (data.type === "typing") {
      setTypers((prev) => ({ ...prev, [data.userId]: data.username }));
      clearTimeout(typingTimers.current[data.userId]);
      typingTimers.current[data.userId] = setTimeout(() => {
        setTypers((prev) => { const next = { ...prev }; delete next[data.userId]; return next; });
      }, 3000);
    }
    if (data.type?.startsWith("voice_")) handleVoiceMessage(data);
  }, []);

  const { send } = useWebSocket(user.token, handleMessage);
  const { inVoice, voiceChannel, participants, joinVoice, leaveVoice, handleVoiceMessage } = useVoice(send, user.id);

  useEffect(() => {
    setMessages([]);
    const timeout = setTimeout(() => send({ type: "join", channelId: channel }), 100);
    return () => clearTimeout(timeout);
  }, [channel, send]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by user for cleaner display
  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isGrouped = prev && prev.user_id === msg.user_id &&
      new Date(msg.created_at) - new Date(prev.created_at) < 300000;
    acc.push({ ...msg, isGrouped });
    return acc;
  }, []);

  return (
    <div style={styles.layout}>
      <TitleBar />
      <div style={styles.body}>
        <Sidebar
          channel={channel} setChannel={setChannel}
          voiceChannel={voiceChannel} joinVoice={joinVoice} leaveVoice={leaveVoice}
          logout={logout} username={user.username}
        />
        <div style={styles.main}>
          <div style={styles.header}>
            <span style={styles.hash}>#</span>
            <span style={styles.channelName}>{channel}</span>
            <div style={styles.headerLine} />
          </div>
          <div style={styles.messages}>
            {groupedMessages.map((msg) => (
              <div key={msg.id} style={{ ...styles.message, ...(msg.isGrouped ? styles.messageGrouped : {}) }}>
                {!msg.isGrouped && (
                  <div style={styles.messageHeader}>
                    <span style={styles.author}>{msg.username}</span>
                    <span style={styles.time}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
                <div style={styles.bubble}>
                  <span style={styles.content}>{msg.content}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <TypingIndicator typers={typers} currentUserId={user.id} />
          <VoiceIndicator inVoice={inVoice} voiceChannel={voiceChannel} participants={participants} leaveVoice={leaveVoice} />
          <MessageInput send={send} channel={channel} />
        </div>
      </div>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  layout: { display: "flex", flexDirection: "column", height: "100vh", background: "#020a06", color: "#fff", fontFamily: "'Rajdhani', sans-serif" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: {
    padding: "0.85rem 1.5rem", background: "rgba(0,10,6,0.95)",
    borderBottom: "1px solid rgba(0,255,159,0.15)",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  hash: { color: "rgba(0,255,159,0.4)", fontSize: "1rem" },
  channelName: {
    fontFamily: "'Orbitron', monospace", fontSize: "0.85rem",
    fontWeight: 700, color: "#00ff9f", letterSpacing: "0.1em",
  },
  headerLine: { flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(0,255,159,0.2), transparent)", marginLeft: "0.5rem" },
  messages: { flex: 1, overflowY: "auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.15rem" },
  message: { animation: "fadeSlideIn 0.2s ease", paddingTop: "0.6rem" },
  messageGrouped: { paddingTop: "0.1rem" },
  messageHeader: { display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.2rem" },
  author: {
    fontFamily: "'Orbitron', monospace", fontSize: "0.75rem",
    fontWeight: 700, color: "#00ff9f",
    textShadow: "0 0 8px rgba(0,255,159,0.5)",
  },
  time: { fontSize: "0.7rem", color: "rgba(0,255,159,0.25)", fontFamily: "'Share Tech Mono', monospace" },
  bubble: {
    display: "inline-block", background: "rgba(0,255,159,0.04)",
    border: "1px solid rgba(0,255,159,0.08)", borderRadius: "2px",
    padding: "0.4rem 0.75rem", maxWidth: "100%",
  },
  content: { color: "rgba(200,255,220,0.9)", fontSize: "0.95rem", lineHeight: 1.5, fontFamily: "'Rajdhani', sans-serif", fontWeight: 400 },
};