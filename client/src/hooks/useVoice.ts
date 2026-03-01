import { useRef, useState, useCallback } from "react";
import type { ClientMessage, ServerMessage } from "../types";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
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

// Chromium handles echo cancellation and gain — RNNoise handles noise suppression
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  autoGainControl: true,
  noiseSuppression: false,
};

// Pipes mic stream through @sapphi-red/web-noise-suppressor (RNNoise via WASM).
// Falls back to raw stream if it fails to load.
async function applyNoiseSuppression(rawStream: MediaStream): Promise<MediaStream> {
  try {
    const { NoiseSupressor, NoiseSupressorWorklet } = await import(
      "@sapphi-red/web-noise-suppressor"
    );

    const audioCtx = new AudioContext({ sampleRate: 48000 });

    await audioCtx.audioWorklet.addModule(NoiseSupressorWorklet);

    const source = audioCtx.createMediaStreamSource(rawStream);
    const destination = audioCtx.createMediaStreamDestination();

    const suppressor = new NoiseSupressor(audioCtx);
    await suppressor.init();

    source.connect(suppressor.getNode());
    suppressor.getNode().connect(destination);

    console.log("Noise suppression active (RNNoise WASM)");
    return destination.stream;
  } catch (err) {
    console.warn("Noise suppressor failed to load, using raw stream:", err);
    return rawStream;
  }
}

async function getMicStream(): Promise<MediaStream> {
  const rawStream = await navigator.mediaDevices.getUserMedia({
    audio: AUDIO_CONSTRAINTS,
  });
  return applyNoiseSuppression(rawStream);
}

export function useVoice(
  send: (data: ClientMessage) => void,
  _currentUserId: number
) {
  const [inVoice, setInVoice] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Record<number, RTCPeerConnection>>({});
  const audioElements = useRef<Record<number, HTMLAudioElement>>({});

  const createPeer = useCallback(
    (targetUserId: number, isInitiator: boolean): RTCPeerConnection => {
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

      peer.ontrack = (e) => {
        let audio = audioElements.current[targetUserId];
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElements.current[targetUserId] = audio;
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log(`[${new Date().toISOString()}] Peer ${targetUserId} state: ${state}`);
        if (state === "failed") {
          console.warn(`Peer ${targetUserId} failed — attempting ICE restart`);
          if (isInitiator) {
            peer.createOffer({ iceRestart: true })
              .then((offer) => peer.setLocalDescription(offer))
              .then(() => send({ type: "voice_offer", targetUserId, offer: peer.localDescription! }))
              .catch(console.error);
          }
        }
        if (state === "closed") {
          delete audioElements.current[targetUserId];
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log(`[${new Date().toISOString()}] Peer ${targetUserId} ICE: ${peer.iceConnectionState}`);
      };

      if (isInitiator) {
        peer.createOffer()
          .then((offer) => peer.setLocalDescription(offer))
          .then(() => send({ type: "voice_offer", targetUserId, offer: peer.localDescription! }))
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
    Object.values(audioElements.current).forEach((a) => { a.srcObject = null; });
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
        localStream.current = await getMicStream();
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

  const rejoinVoice = useCallback(() => {
    const channel = voiceChannel;
    if (!channel || !localStream.current) return;
    console.log("WS reconnected — rejoining voice channel:", channel);
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    send({ type: "voice_join", channelId: channel });
  }, [voiceChannel, send]);

  const handleVoiceMessage = useCallback(
    async (data: ServerMessage) => {
      if (data.type === "voice_participants") {
        setParticipants(data.usernames);
        data.userIds.forEach((userId: number) => createPeer(userId, true));
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
        if (audioElements.current[data.userId]) {
          audioElements.current[data.userId].srcObject = null;
          delete audioElements.current[data.userId];
        }
      }

      if (data.type === "voice_offer") {
        if (!localStream.current) {
          localStream.current = await getMicStream();
        }
        const peer = createPeer(data.userId, false);
        peer.setRemoteDescription(data.offer)
          .then(() => peer.createAnswer())
          .then((answer) => peer.setLocalDescription(answer))
          .then(() => send({ type: "voice_answer", targetUserId: data.userId, answer: peer.localDescription! }))
          .catch(console.error);
      }

      if (data.type === "voice_answer") {
        peers.current[data.userId]?.setRemoteDescription(data.answer).catch(console.error);
      }

      if (data.type === "voice_ice") {
        const peer = peers.current[data.userId];
        if (peer?.remoteDescription) {
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
    localStream,
  };
}