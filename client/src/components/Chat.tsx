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
import UserPopover from "./UserPopover";
import { useLocalNicknames } from "../context/LocalNicknameContext";
import type {
  GroupedMessage,
  Message,
  OnlineUser,
  Reaction,
  ServerMessage,
} from "../types";
import ResizableSidebar from "./ResizableSidebar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface EmojiPickerProps {
  messageId: number;
  onReact: (messageId: number, emoji: string) => void;
  onClose: () => void;
  theme: Record<string, string>;
}

function EmojiPicker({ messageId, onReact, onClose, theme }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "-44px",
        left: 0,
        zIndex: 100,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: "4px",
        padding: "4px 6px",
        display: "flex",
        gap: "2px",
        boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
      }}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onReact(messageId, emoji);
            onClose();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.15rem",
            padding: "3px 5px",
            borderRadius: "3px",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = theme.primaryGlow)
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface ReactionPillsProps {
  reactions: Reaction[];
  messageId: number;
  currentUsername: string;
  onReact: (messageId: number, emoji: string) => void;
  theme: Record<string, string>;
}

function ReactionPills({
  reactions,
  messageId,
  currentUsername,
  onReact,
  theme,
}: ReactionPillsProps) {
  if (reactions.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        marginTop: "4px",
      }}
    >
      {reactions.map((r) => {
        const reacted = r.users.includes(currentUsername);
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(messageId, r.emoji)}
            title={r.users.join(", ")}
            style={{
              background: reacted
                ? theme.primaryGlow
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${reacted ? theme.primaryDim : theme.border}`,
              borderRadius: "10px",
              padding: "1px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8rem",
              transition: "all 0.15s",
            }}
          >
            <span>{r.emoji}</span>
            <span
              style={{
                color: reacted ? theme.primary : theme.textDim,
                fontSize: "0.7rem",
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {r.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Chat() {
  const { user, logout, updateNickname, updateAvatar } = useAuth();
  const { resolve, load } = useLocalNicknames();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState("general");
  const [typers, setTypers] = useState<Record<number, string>>({});
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [pickerMsgId, setPickerMsgId] = useState<number | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const [popover, setPopover] = useState<{
    userId: number;
    username: string;
    el: HTMLElement;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>(
    {},
  );
  const prevScrollHeightRef = useRef(0);
  const currentChannelRef = useRef(channel);
  const jumpToBottomRef = useRef(true);

  useEffect(() => {
    currentChannelRef.current = channel;
  }, [channel]);

  // Load local nicknames once on mount
  useEffect(() => {
    if (user?.token) load(user.token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (instant) el.scrollTop = el.scrollHeight;
    else bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleMessage = useCallback((data: ServerMessage) => {
    if (data.type === "history") {
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setOldestId(data.oldestId);
      jumpToBottomRef.current = true;
    }

    if (data.type === "history_prepend") {
      setLoadingMore(false);
      if (data.messages.length === 0) {
        setHasMore(false);
        return;
      }
      prevScrollHeightRef.current =
        messagesContainerRef.current?.scrollHeight ?? 0;
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setOldestId(data.oldestId);
    }

    if (data.type === "message") {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      if (
        data.message.channel_id !== currentChannelRef.current &&
        data.message.user_id !== userRef.current!.id
      ) {
        window.electronAPI?.notify(
          `#${data.message.channel_id}`,
          `${data.message.username}: ${data.message.content.slice(0, 80)}`,
        );
      }
    }

    if (data.type === "reaction_update") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    }

    if (data.type === "typing") {
      setTypers((prev) => ({ ...prev, [data.userId]: data.username }));
      clearTimeout(typingTimers.current[data.userId]);
      typingTimers.current[data.userId] = setTimeout(() => {
        setTypers((prev) => {
          const n = { ...prev };
          delete n[data.userId];
          return n;
        });
      }, 3000);
    }

    if (data.type === "presence") setOnlineUsers(data.users);

    if (data.type?.startsWith("voice_")) handleVoiceMessage(data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { send, disconnect } = useWebSocket(user!.token, handleMessage);

  const handleLogout = useCallback(async () => {
    disconnect();
    // Small delay so the WS close reaches the server before we clear auth state
    await new Promise((r) => setTimeout(r, 200));
    await logout();
  }, [disconnect, logout]);
  const {
    inVoice,
    voiceChannel,
    participants,
    joinVoice,
    leaveVoice,
    handleVoiceMessage,
  } = useVoice(send, user!.id);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    setOldestId(null);
    jumpToBottomRef.current = true;
    const t = setTimeout(() => send({ type: "join", channelId: channel }), 100);
    return () => clearTimeout(t);
  }, [channel, send]);

  useEffect(() => {
    if (loadingMore) return;
    if (jumpToBottomRef.current) {
      scrollToBottom(true);
      jumpToBottomRef.current = false;
    } else {
      const el = messagesContainerRef.current;
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 120)
        scrollToBottom(false);
    }
  }, [messages, loadingMore, scrollToBottom]);

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

  const handleReact = useCallback(
    (messageId: number, emoji: string) => {
      send({ type: "react", messageId, emoji });
    },
    [send],
  );

  const handleJumpTo = useCallback((channelId: string, _messageId: number) => {
    setChannel(channelId);
  }, []);

  const groupedMessages: GroupedMessage[] = messages.reduce<GroupedMessage[]>(
    (acc, msg, i) => {
      const prev = messages[i - 1];
      const isGrouped =
        !!prev &&
        prev.user_id === msg.user_id &&
        new Date(msg.created_at).getTime() -
          new Date(prev.created_at).getTime() <
          300000;
      acc.push({ ...msg, isGrouped });
      return acc;
    },
    [],
  );

  return (
    <div
      style={{
        ...styles.layout,
        background: theme.background,
        color: theme.text,
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      <TitleBar />
      <div style={styles.body}>
        <ResizableSidebar>
          <Sidebar
            channel={channel}
            setChannel={setChannel}
            voiceChannel={voiceChannel}
            joinVoice={joinVoice}
            leaveVoice={leaveVoice}
            logout={handleLogout}
            username={user!.username}
            nickname={user!.nickname ?? null}
            userId={user!.id}
            token={user!.token}
            onlineUsers={onlineUsers}
            onSearchOpen={() => setShowSearch(true)}
            avatar={user!.avatar ?? null}
            onNicknameChange={updateNickname}
            onAvatarChange={updateAvatar}
          />
        </ResizableSidebar>

        <div style={styles.main}>
          <div
            style={{
              ...styles.header,
              background: theme.surface,
              borderColor: theme.border,
            }}
          >
            <span style={{ color: theme.textDim }}>#</span>
            <span style={{ ...styles.channelName, color: theme.primary }}>
              {channel}
            </span>
            <div
              style={{
                ...styles.headerLine,
                background: `linear-gradient(90deg, ${theme.border}, transparent)`,
              }}
            />
            <span style={{ ...styles.headerOnline, color: theme.textDim }}>
              <span style={{ color: "#4ade80", marginRight: "4px" }}>●</span>
              {onlineUsers.length} online
            </span>
          </div>

          <div
            ref={messagesContainerRef}
            style={styles.messages}
            onScroll={handleScroll}
          >
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              {loadingMore && (
                <span
                  style={{
                    color: theme.textDim,
                    fontSize: "0.7rem",
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  LOADING...
                </span>
              )}
              {!hasMore && messages.length > 0 && (
                <span
                  style={{
                    color: theme.textDim,
                    fontSize: "0.65rem",
                    fontFamily: "'Share Tech Mono', monospace",
                    opacity: 0.4,
                  }}
                >
                  — BEGINNING OF #{channel} —
                </span>
              )}
            </div>

            {groupedMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...styles.msgRow,
                  paddingTop: msg.isGrouped ? "0.1rem" : "0.65rem",
                }}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => {
                  if (pickerMsgId !== msg.id) setHoveredMsgId(null);
                }}
              >
                <div style={styles.avatarCol}>
                  {!msg.isGrouped && (
                    <Avatar username={msg.username} size={34} />
                  )}
                </div>
                <div style={{ ...styles.msgBody, position: "relative" }}>
                  {!msg.isGrouped && (
                    <div style={styles.msgHeader}>
                      <span
                        style={{
                          ...styles.msgUsername,
                          color: theme.primary,
                          cursor: "pointer",
                        }}
                        onClick={(e) =>
                          setPopover({
                            userId: msg.user_id,
                            username: msg.raw_username || msg.username,
                            el: e.currentTarget as HTMLElement,
                          })
                        }
                        title="Click to set local nickname"
                      >
                        {resolve(msg.user_id, msg.raw_username || msg.username)}
                      </span>
                      <span style={{ ...styles.msgTime, color: theme.textDim }}>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  <div style={{ ...styles.msgContent, color: theme.text }}>
                    {msg.content}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <ReactionPills
                      reactions={msg.reactions || []}
                      messageId={msg.id}
                      currentUsername={
                        userRef.current!.nickname || userRef.current!.username
                      }
                      onReact={handleReact}
                      theme={theme as unknown as Record<string, string>}
                    />
                    {/* React button — visible on hover or when picker is open */}
                    {(hoveredMsgId === msg.id || pickerMsgId === msg.id) && (
                      <div style={{ position: "relative" }}>
                        <button
                          style={{
                            ...styles.reactBtn,
                            color:
                              pickerMsgId === msg.id
                                ? theme.primary
                                : theme.textDim,
                            borderColor:
                              pickerMsgId === msg.id
                                ? theme.primaryDim
                                : theme.border,
                            background:
                              pickerMsgId === msg.id
                                ? theme.primaryGlow
                                : "transparent",
                          }}
                          onClick={() =>
                            setPickerMsgId(
                              pickerMsgId === msg.id ? null : msg.id,
                            )
                          }
                          title="Add reaction"
                        >
                          + 😊
                        </button>
                        {pickerMsgId === msg.id && (
                          <EmojiPicker
                            messageId={msg.id}
                            onReact={handleReact}
                            onClose={() => {
                              setPickerMsgId(null);
                              setHoveredMsgId(null);
                            }}
                            theme={theme as unknown as Record<string, string>}
                          />
                        )}
                      </div>
                    )}
                  </div>
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

      {popover && (
        <UserPopover
          userId={popover.userId}
          username={popover.username} // this is now always raw_username
          isSelf={popover.userId === user!.id}
          anchorEl={popover.el}
          onClose={() => setPopover(null)}
        />
      )}

      {showSearch && (
        <SearchOverlay
          token={user!.token}
          currentChannel={channel}
          onJumpTo={handleJumpTo}
          onClose={() => setShowSearch(false)}
        />
      )}

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.primaryDim}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.primary}; }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
  },
  body: { display: "flex", flex: 1, overflow: "hidden", alignItems: "stretch" },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    borderBottom: "1px solid",
  },
  channelName: {
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
    fontSize: "1rem",
  },
  headerLine: { flex: 1, height: "1px" },
  headerOnline: {
    fontSize: "0.72rem",
    fontFamily: "'Share Tech Mono', monospace",
    flexShrink: 0,
  },
  messages: { flex: 1, overflowY: "auto", padding: "0 1rem 0.5rem" },
  msgRow: {
    display: "flex",
    gap: "0.75rem",
    padding: "0 0.5rem",
    borderRadius: "3px",
  },
  avatarCol: {
    width: "34px",
    flexShrink: 0,
    display: "flex",
    alignItems: "flex-start",
    paddingTop: "2px",
  },
  msgBody: { flex: 1, minWidth: 0, paddingRight: "2.5rem" },
  msgHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.6rem",
    marginBottom: "0.1rem",
  },
  msgUsername: {
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  msgTime: { fontSize: "0.65rem", fontFamily: "'Share Tech Mono', monospace" },
  msgContent: { fontSize: "0.9rem", lineHeight: 1.5, wordBreak: "break-word" },
  reactBtn: {
    background: "none",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "0.7rem",
    padding: "1px 6px",
    borderRadius: "10px",
    fontFamily: "'Share Tech Mono', monospace",
    letterSpacing: "0.05em",
    transition: "all 0.15s",
    lineHeight: "1.6",
  },
};
