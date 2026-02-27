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

  const createPeer = useCallback(
    (targetUserId: number, isInitiator: boolean): RTCPeerConnection => {
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

      peer.ontrack = (e) => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.autoplay = true;
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
          });
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
        createPeer(data.userId, true);
      }

      if (data.type === "voice_user_left") {
        setParticipants((prev) => prev.filter((u) => u !== data.username));
        peers.current[data.userId]?.close();
        delete peers.current[data.userId];
      }

      if (data.type === "voice_offer") {
        if (!localStream.current) {
          try {
            localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (err) {
            console.error("Microphone access denied:", err);
            return;
          }
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
          });
      }

      if (data.type === "voice_answer") {
        peers.current[data.userId]?.setRemoteDescription(data.answer);
      }

      if (data.type === "voice_ice") {
        peers.current[data.userId]?.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
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
    handleVoiceMessage,
  };
}