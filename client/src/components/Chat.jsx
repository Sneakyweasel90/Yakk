import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { useVoice } from "../hooks/useVoice";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import TitleBar from "./TitleBar";
import VoiceIndicator from "./VoiceIndicator";

export default function Chat() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [channel, setChannel] = useState("general");
  const [typers, setTypers] = useState({});
  const bottomRef = useRef(null);
  const typingTimers = useRef({});

  const handleMessage = useCallback((data) => {
    if (data.type === "history") {
      setMessages(data.messages);
    }
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
        setTypers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }, 3000);
    }
    if (data.type?.startsWith("voice_")) {
      handleVoiceMessage(data);
    }
  }, []);

  const { send } = useWebSocket(user.token, handleMessage);
  const { inVoice, voiceChannel, participants, joinVoice, leaveVoice, handleVoiceMessage } = useVoice(send, user.id);

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

  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const isGrouped = prev && prev.user_id === msg.user_id &&
      new Date(msg.created_at) - new Date(prev.created_at) < 300000;
    acc.push({ ...msg, isGrouped });
    return acc;
  }, []);

  return (
    <div style={{ ...styles.layout, background: theme.background, color: theme.text, fontFamily: "'Rajdhani', sans-serif" }}>
      <TitleBar />
      <div style={styles.body}>
        <Sidebar
          channel={channel}
          setChannel={setChannel}
          voiceChannel={voiceChannel}
          joinVoice={joinVoice}
          leaveVoice={leaveVoice}
          logout={logout}
          username={user.username}
        />
        <div style={styles.main}>
          <div style={{ ...styles.header, background: theme.surface, borderColor: theme.border }}>
            <span style={{ color: theme.textDim, fontSize: "1rem" }}>#</span>
            <span style={{ ...styles.channelName, color: theme.primary }}>
              {channel}
            </span>
            <div style={{ ...styles.headerLine, background: `linear-gradient(90deg, ${theme.border}, transparent)` }} />
          </div>

          <div style={styles.messages}>
            {groupedMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.message,
                  paddingTop: msg.isGrouped ? "0.1rem" : "0.6rem",
                }}
              >
                {!msg.isGrouped && (
                  <div style={styles.messageHeader}>
                    <span style={{ ...styles.author, color: theme.primary, textShadow: `0 0 8px ${theme.primaryGlow}` }}>
                      {msg.username}
                    </span>
                    <span style={{ ...styles.time, color: theme.textDim, opacity: 0.5 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
                <div style={{ ...styles.bubble, background: theme.primaryGlow, borderColor: theme.border }}>
                  <span style={{ ...styles.content, color: theme.text }}>{msg.content}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <TypingIndicator typers={typers} currentUserId={user.id} />
          <VoiceIndicator
            inVoice={inVoice}
            voiceChannel={voiceChannel}
            participants={participants}
            leaveVoice={leaveVoice}
          />
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
  layout: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  header: {
    padding: "0.85rem 1.5rem",
    borderBottom: "1px solid",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  channelName: {
    fontFamily: "'Orbitron', monospace",
    fontSize: "0.85rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
  },
  headerLine: {
    flex: 1,
    height: "1px",
    marginLeft: "0.5rem",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  message: {
    animation: "fadeSlideIn 0.2s ease",
  },
  messageHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.75rem",
    marginBottom: "0.2rem",
  },
  author: {
    fontFamily: "'Orbitron', monospace",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  time: {
    fontSize: "0.7rem",
    fontFamily: "'Share Tech Mono', monospace",
  },
  bubble: {
    display: "inline-block",
    border: "1px solid",
    borderRadius: "2px",
    padding: "0.4rem 0.75rem",
    maxWidth: "100%",
  },
  content: {
    fontSize: "0.95rem",
    lineHeight: 1.5,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 400,
  },
};