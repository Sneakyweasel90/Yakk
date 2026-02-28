import { useRef, useState, useCallback } from "react";
import type { ClientMessage, ServerMessage } from "../types";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: import.meta.env.VITE_METERED_USERNAME,
      credential: import.meta.env.VITE_METERED_CREDENTIAL,
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: import.meta.env.VITE_METERED_USERNAME,
      credential: import.meta.env.VITE_METERED_CREDENTIAL,
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: import.meta.env.VITE_METERED_USERNAME,
      credential: import.meta.env.VITE_METERED_CREDENTIAL,
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: import.meta.env.VITE_METERED_USERNAME,
      credential: import.meta.env.VITE_METERED_CREDENTIAL,
    },
  ],
};

export function useVoice(
  send: (data: ClientMessage) => void,
  _currentUserId: number
) {
  const [inVoice, setInVoice] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Record<number, RTCPeerConnection>>({});
  // Keep audio elements alive — storing them prevents garbage collection killing audio mid-call
  const audioElements = useRef<Record<number, HTMLAudioElement>>({});

  const createPeer = useCallback(
    (targetUserId: number, isInitiator: boolean): RTCPeerConnection => {
      // Clean up any existing peer for this user before creating a new one
      if (peers.current[targetUserId]) {
        peers.current[targetUserId].close();
        delete peers.current[targetUserId];
      }

      const peer = new RTCPeerConnection(ICE_SERVERS);

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          peer.addTrack(track, localStream.current!);
        });
      }

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "voice_ice", targetUserId, candidate: e.candidate.toJSON() });
        }
      };

      // FIX: Store the audio element in a ref so it doesn't get garbage collected
      peer.ontrack = (e) => {
        let audio = audioElements.current[targetUserId];
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElements.current[targetUserId] = audio;
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {
          // Autoplay blocked — will play on next user interaction
        });
      };

      // FIX: Detect and recover from failed/disconnected peer connections
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log(`Peer ${targetUserId} connection state: ${state}`);

        if (state === "failed") {
          console.warn(`Peer ${targetUserId} failed — attempting ICE restart`);
          // ICE restart: renegotiate with new candidates
          if (isInitiator) {
            peer.createOffer({ iceRestart: true })
              .then((offer) => peer.setLocalDescription(offer))
              .then(() => {
                send({ type: "voice_offer", targetUserId, offer: peer.localDescription! });
              })
              .catch(console.error);
          }
        }

        if (state === "closed") {
          delete audioElements.current[targetUserId];
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log(`Peer ${targetUserId} ICE state: ${peer.iceConnectionState}`);
      };

      if (isInitiator) {
        peer
          .createOffer()
          .then((offer) => peer.setLocalDescription(offer))
          .then(() => {
            send({
              type: "voice_offer",
              targetUserId,
              offer: peer.localDescription!,
            });
          })
          .catch(console.error);
      }

      peers.current[targetUserId] = peer;
      return peer;
    },
    [send]
  );

  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    // Clean up audio elements
    Object.values(audioElements.current).forEach((a) => {
      a.srcObject = null;
    });
    audioElements.current = {};
    setInVoice(false);
    setVoiceChannel(null);
    setParticipants([]);
  }, []);

  const joinVoice = useCallback(
    async (channelId: string) => {
      if (localStream.current || inVoice) {
        send({ type: "voice_leave" });
        cleanup();
      }

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setInVoice(true);
        setVoiceChannel(channelId);
        send({ type: "voice_join", channelId });
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Please allow microphone access to use voice chat.");
        cleanup();
      }
    },
    [send, inVoice, cleanup]
  );

  const leaveVoice = useCallback(() => {
    send({ type: "voice_leave" });
    cleanup();
  }, [send, cleanup]);

  // Called by useWebSocket when the socket reconnects — rejoins the voice channel
  // so the server knows we're still in the call
  const rejoinVoice = useCallback(() => {
    const channel = voiceChannel;
    if (!channel || !localStream.current) return;
    console.log("WS reconnected — rejoining voice channel:", channel);
    // Close stale peers; the server will re-send voice_participants
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    send({ type: "voice_join", channelId: channel });
  }, [voiceChannel, send]);

  const handleVoiceMessage = useCallback(
    async (data: ServerMessage) => {
      if (data.type === "voice_participants") {
        setParticipants(data.usernames);
        data.userIds.forEach((userId: number) => {
          createPeer(userId, true);
        });
      }

      if (data.type === "voice_user_joined") {
        setParticipants((prev) =>
          prev.includes(data.username) ? prev : [...prev, data.username]
        );
        createPeer(data.userId, false);
      }

      if (data.type === "voice_user_left") {
        setParticipants((prev) => prev.filter((u) => u !== data.username));
        peers.current[data.userId]?.close();
        delete peers.current[data.userId];
        // Clean up their audio element
        if (audioElements.current[data.userId]) {
          audioElements.current[data.userId].srcObject = null;
          delete audioElements.current[data.userId];
        }
      }

      if (data.type === "voice_offer") {
        if (!localStream.current) {
          localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const peer = createPeer(data.userId, false);
        peer
          .setRemoteDescription(data.offer)
          .then(() => peer.createAnswer())
          .then((answer) => peer.setLocalDescription(answer))
          .then(() => {
            send({
              type: "voice_answer",
              targetUserId: data.userId,
              answer: peer.localDescription!,
            });
          })
          .catch(console.error);
      }

      if (data.type === "voice_answer") {
        peers.current[data.userId]?.setRemoteDescription(data.answer).catch(console.error);
      }

      if (data.type === "voice_ice") {
        const peer = peers.current[data.userId];
        if (peer && peer.remoteDescription) {
          peer.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
        }
      }
    },
    [createPeer, send]
  );

  return {
    inVoice,
    voiceChannel,
    participants,
    joinVoice,
    leaveVoice,
    rejoinVoice,
    handleVoiceMessage,
  };
}