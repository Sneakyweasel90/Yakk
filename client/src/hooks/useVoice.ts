import { useRef, useState, useCallback } from "react";
import type { ClientMessage, ServerMessage } from "../types";
import { useVoiceSounds } from "./useVoiceSounds";

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

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  autoGainControl: true,
  noiseSuppression: false,
};

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

// Applies a GainNode to the local stream so we can control our own output volume.
// Returns { processedStream, gainNode } — we keep gainNode to update it live.
function applyGain(rawStream: MediaStream): { processedStream: MediaStream; gainNode: GainNode; audioCtx: AudioContext } {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(rawStream);
  const gainNode = audioCtx.createGain();
  const destination = audioCtx.createMediaStreamDestination();
  gainNode.gain.value = 1.0;
  source.connect(gainNode);
  gainNode.connect(destination);
  // Merge processed audio with any video tracks
  const processedStream = new MediaStream([...destination.stream.getAudioTracks()]);
  return { processedStream, gainNode, audioCtx };
}

async function getMicStream(): Promise<{ stream: MediaStream; gainNode: GainNode; audioCtx: AudioContext }> {
  const rawStream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
  const noiseFree = await applyNoiseSuppression(rawStream);
  const { processedStream, gainNode, audioCtx } = applyGain(noiseFree);
  return { stream: processedStream, gainNode, audioCtx };
}

// Load persisted volume for a username (0–2 range, default 1)
function loadVolume(username: string): number {
  const val = localStorage.getItem(`yakk_vol_${username}`);
  return val !== null ? parseFloat(val) : 1;
}

function saveVolume(username: string, vol: number) {
  localStorage.setItem(`yakk_vol_${username}`, String(vol));
}

export function useVoice(
  send: (data: ClientMessage) => void,
  _currentUserId: number
) {
  const [inVoice, setInVoice] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  // participantVolumes: username -> 0..2 (1 = 100%)
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  // selfVolume: 0..2 (1 = 100%)
  const [selfVolume, setSelfVolumeState] = useState<number>(() => loadVolume("__self__"));

  const { playJoin, playLeave } = useVoiceSounds();

  const localStream = useRef<MediaStream | null>(null);
  const selfGainNode = useRef<GainNode | null>(null);
  const selfAudioCtx = useRef<AudioContext | null>(null);
  const peers = useRef<Record<number, RTCPeerConnection>>({});
  const audioElements = useRef<Record<number, HTMLAudioElement>>({});
  // Maps userId -> username so we can look up volumes by username when audio arrives
  const userIdToName = useRef<Record<number, string>>({});

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
        // Apply persisted volume for this participant
        const username = userIdToName.current[targetUserId];
        audio.volume = username ? loadVolume(username) : 1;
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
    selfGainNode.current = null;
    selfAudioCtx.current?.close();
    selfAudioCtx.current = null;
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};
    Object.values(audioElements.current).forEach((a) => { a.srcObject = null; });
    audioElements.current = {};
    userIdToName.current = {};
    setInVoice(false);
    setVoiceChannel(null);
    setParticipants([]);
    setParticipantVolumes({});
  }, []);

  const joinVoice = useCallback(
    async (channelId: string) => {
      if (localStream.current || inVoice) {
        send({ type: "voice_leave" });
        cleanup();
      }
      try {
        const { stream, gainNode, audioCtx } = await getMicStream();
        localStream.current = stream;
        selfGainNode.current = gainNode;
        selfAudioCtx.current = audioCtx;
        // Apply persisted self volume
        gainNode.gain.value = loadVolume("__self__");
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

  // Set volume for a specific participant (0–2)
  const setParticipantVolume = useCallback((username: string, volume: number) => {
    const clamped = Math.max(0, Math.min(2, volume));
    saveVolume(username, clamped);
    setParticipantVolumes((prev) => ({ ...prev, [username]: clamped }));
    // Find the audio element for this user and update it live
    const userId = Object.entries(userIdToName.current).find(([, name]) => name === username)?.[0];
    if (userId && audioElements.current[Number(userId)]) {
      audioElements.current[Number(userId)].volume = clamped;
    }
  }, []);

  // Set our own microphone output volume (0–2)
  const setSelfVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(2, volume));
    saveVolume("__self__", clamped);
    setSelfVolumeState(clamped);
    if (selfGainNode.current) {
      selfGainNode.current.gain.value = clamped;
    }
  }, []);

  const handleVoiceMessage = useCallback(
    async (data: ServerMessage) => {
      if (data.type === "voice_participants") {
        setParticipants(data.usernames);
        // Build userId->name map from the participants list + userIds
        data.userIds.forEach((userId: number, i: number) => {
          userIdToName.current[userId] = data.usernames[i];
        });
        // Initialise volumes from localStorage
        const vols: Record<string, number> = {};
        data.usernames.forEach((name) => { vols[name] = loadVolume(name); });
        setParticipantVolumes(vols);
        data.userIds.forEach((userId: number) => createPeer(userId, true));
      }

      if (data.type === "voice_user_joined") {
        userIdToName.current[data.userId] = data.username;
        setParticipants((prev) =>
          prev.includes(data.username) ? prev : [...prev, data.username]
        );
        setParticipantVolumes((prev) => ({
          ...prev,
          [data.username]: loadVolume(data.username),
        }));
        createPeer(data.userId, false);
        playJoin();
      }

      if (data.type === "voice_user_left") {
        delete userIdToName.current[data.userId];
        setParticipants((prev) => prev.filter((u) => u !== data.username));
        setParticipantVolumes((prev) => {
          const next = { ...prev };
          delete next[data.username];
          return next;
        });
        peers.current[data.userId]?.close();
        delete peers.current[data.userId];
        if (audioElements.current[data.userId]) {
          audioElements.current[data.userId].srcObject = null;
          delete audioElements.current[data.userId];
        }
        playLeave();
      }

      if (data.type === "voice_offer") {
        if (!localStream.current) {
          const { stream, gainNode, audioCtx } = await getMicStream();
          localStream.current = stream;
          selfGainNode.current = gainNode;
          selfAudioCtx.current = audioCtx;
          gainNode.gain.value = loadVolume("__self__");
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
    [createPeer, send, playJoin, playLeave]
  );

  return {
    inVoice,
    voiceChannel,
    participants,
    participantVolumes,
    selfVolume,
    joinVoice,
    leaveVoice,
    rejoinVoice,
    handleVoiceMessage,
    localStream,
    setParticipantVolume,
    setSelfVolume,
  };
}