// Shared types across the Yakk client

export interface User {
  id: number;
  username: string;
  token: string;
  refreshToken: string;
}

export interface Message {
  id: number;
  channel_id: string;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
  // client-only: set after decryption
  decrypted?: boolean;
}

export interface GroupedMessage extends Message {
  isGrouped: boolean;
}

// WebSocket message types sent from server → client
export type ServerMessage =
  | { type: "history"; messages: Message[]; hasMore: boolean; oldestId: number | null }
  | { type: "history_prepend"; messages: Message[]; hasMore: boolean; oldestId: number | null }
  | { type: "message"; message: Message }
  | { type: "typing"; userId: number; username: string }
  | { type: "error"; message: string }
  | { type: "voice_participants"; usernames: string[] }
  | { type: "voice_user_joined"; userId: number; username: string }
  | { type: "voice_user_left"; userId: number; username: string }
  | { type: "voice_offer"; userId: number; offer: RTCSessionDescriptionInit; targetUserId: number }
  | { type: "voice_answer"; userId: number; answer: RTCSessionDescriptionInit; targetUserId: number }
  | { type: "voice_ice"; userId: number; candidate: RTCIceCandidateInit; targetUserId: number };

// WebSocket message types sent client → server
export type ClientMessage =
  | { type: "join"; channelId: string }
  | { type: "load_more"; channelId: string; beforeId: number }
  | { type: "message"; channelId: string; content: string }
  | { type: "typing"; channelId: string }
  | { type: "voice_join"; channelId: string }
  | { type: "voice_leave" }
  | { type: "voice_offer"; targetUserId: number; offer: RTCSessionDescriptionInit }
  | { type: "voice_answer"; targetUserId: number; answer: RTCSessionDescriptionInit }
  | { type: "voice_ice"; targetUserId: number; candidate: RTCIceCandidateInit };

export interface Theme {
  name: string;
  primary: string;
  primaryDim: string;
  primaryGlow: string;
  background: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  error: string;
  gridColor: string;
}