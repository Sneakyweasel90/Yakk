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
import Avatar from "./Avatar";
import SearchOverlay from "./SearchOverlay";
import type { GroupedMessage, Message, OnlineUser, ServerMessage } from "../types";

export default function Chat() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState("general");
  const [typers, setTypers] = useState<Record<number, string>>({});
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const prevScrollHeightRef = useRef(0);
  const currentChannelRef = useRef(channel);

  useEffect(() => { currentChannelRef.current = channel; }, [channel]);

  // Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(s => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMessage = useCallback((data: ServerMessage) => {
    if (data.type === "history") {
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setOldestId(data.oldestId);
    }

    if (data.type === "history_prepend") {
      setLoadingMore(false);
      if (data.messages.length === 0) { setHasMore(false); return; }
      prevScrollHeightRef.current = messagesContainerRef.current?.scrollHeight ?? 0;
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setOldestId(data.oldestId);
    }

    if (data.type === "message") {
      setMessages(prev => {
        if (prev.find(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });

      // Desktop notification if message is in a different channel and not from self
      if (
        data.message.channel_id !== currentChannelRef.current &&
        data.message.user_id !== user!.id
      ) {
        window.electronAPI?.notify(
          `#${data.message.channel_id}`,
          `${data.message.username}: ${data.message.content.slice(0, 80)}`
        );
      }
    }

    if (data.type === "typing") {
      setTypers(prev => ({ ...prev, [data.userId]: data.username }));
      clearTimeout(typingTimers.current[data.userId]);
      typingTimers.current[data.userId] = setTimeout(() => {
        setTypers(prev => { const n = { ...prev }; delete n[data.userId]; return n; });
      }, 3000);
    }

    if (data.type === "presence") {
      setOnlineUsers(data.users);
    }

    if (data.type?.startsWith("voice_")) {
      handleVoiceMessage(data);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const { send } = useWebSocket(user!.token, handleMessage);
  const { inVoice, voiceChannel, participants, joinVoice, leaveVoice, handleVoiceMessage } =
    useVoice(send, user!.id);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    setOldestId(null);
    const t = setTimeout(() => send({ type: "join", channelId: channel }), 100);
    return () => clearTimeout(t);
  }, [channel, send]);

  // Scroll to bottom on new messages (skip when loading older)
  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMore]);

  // Restore scroll after prepend
  useEffect(() => {
    if (prevScrollHeightRef.current > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingMore && oldestId !== null) {
      setLoadingMore(true);
      send({ type: "load_more", channelId: channel, beforeId: oldestId });
    }
  }, [hasMore, loadingMore, oldestId, channel, send]);

  // Jump to a message from search result — switch channel then scroll
  const handleJumpTo = useCallback((channelId: string, _messageId: number) => {
    setChannel(channelId);
    // After channel switch, messages reload; we don't scroll to a specific message yet
    // (full jump-to requires storing a target message id — future enhancement)
  }, []);

  const groupedMessages: GroupedMessage[] = messages.reduce<GroupedMessage[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    const isGrouped =
      !!prev &&
      prev.user_id === msg.user_id &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 300000;
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
          username={user!.username}
          token={user!.token}
          onlineUsers={onlineUsers}
          onSearchOpen={() => setShowSearch(true)}
        />

        <div style={styles.main}>
          {/* Channel header */}
          <div style={{ ...styles.header, background: theme.surface, borderColor: theme.border }}>
            <span style={{ color: theme.textDim }}>#</span>
            <span style={{ ...styles.channelName, color: theme.primary }}>{channel}</span>
            <div style={{ ...styles.headerLine, background: `linear-gradient(90deg, ${theme.border}, transparent)` }} />
            {/* Online count in header */}
            <span style={{ ...styles.headerOnline, color: theme.textDim }}>
              <span style={{ color: "#4ade80", marginRight: "4px" }}>●</span>
              {onlineUsers.length} online
            </span>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} style={styles.messages} onScroll={handleScroll}>
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              {loadingMore && (
                <span style={{ color: theme.textDim, fontSize: "0.7rem", fontFamily: "'Share Tech Mono', monospace" }}>
                  LOADING...
                </span>
              )}
              {!hasMore && messages.length > 0 && (
                <span style={{ color: theme.textDim, fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace", opacity: 0.4 }}>
                  — BEGINNING OF #{channel} —
                </span>
              )}
            </div>

            {groupedMessages.map(msg => (
              <div key={msg.id} style={{ ...styles.msgRow, paddingTop: msg.isGrouped ? "0.1rem" : "0.65rem" }}>
                {/* Avatar column */}
                <div style={styles.avatarCol}>
                  {!msg.isGrouped && <Avatar username={msg.username} size={34} />}
                </div>
                {/* Content column */}
                <div style={styles.msgBody}>
                  {!msg.isGrouped && (
                    <div style={styles.msgHeader}>
                      <span style={{ ...styles.msgUsername, color: theme.primary }}>
                        {msg.username}
                      </span>
                      <span style={{ ...styles.msgTime, color: theme.textDim }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  <div style={{ ...styles.msgContent, color: theme.text }}>{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <TypingIndicator typers={Object.values(typers)} />
          {inVoice && (
            <VoiceIndicator
              inVoice={inVoice}
              voiceChannel={voiceChannel}
              participants={participants}
              leaveVoice={leaveVoice}
            />
          )}
          <MessageInput send={send} channel={channel} />
        </div>
      </div>

      {showSearch && (
        <SearchOverlay
          token={user!.token}
          currentChannel={channel}
          onJumpTo={handleJumpTo}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: { display: "flex", flexDirection: "column", height: "100vh", width: "100vw" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  header: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.75rem 1.5rem", borderBottom: "1px solid",
  },
  channelName: { fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1rem" },
  headerLine: { flex: 1, height: "1px" },
  headerOnline: { fontSize: "0.72rem", fontFamily: "'Share Tech Mono', monospace", flexShrink: 0 },
  messages: { flex: 1, overflowY: "auto", padding: "0 1rem 0.5rem" },
  msgRow: { display: "flex", gap: "0.75rem", padding: "0 0.5rem" },
  avatarCol: { width: "34px", flexShrink: 0, display: "flex", alignItems: "flex-start", paddingTop: "2px" },
  msgBody: { flex: 1, minWidth: 0 },
  msgHeader: { display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.1rem" },
  msgUsername: { fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.9rem" },
  msgTime: { fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace" },
  msgContent: { fontSize: "0.9rem", lineHeight: 1.5, wordBreak: "break-word" },
};