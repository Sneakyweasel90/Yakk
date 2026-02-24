import { useRef, useState, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Google's free STUN server
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useVoice(send, currentUserId) {
  const [inVoice, setInVoice] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState(null);
  const [participants, setParticipants] = useState([]);

  const localStream = useRef(null);
  const peers = useRef({}); // userId -> RTCPeerConnection

  // Create a peer connection to another user
  const createPeer = useCallback((targetUserId, isInitiator) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    // Add our local audio tracks to the connection
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStream.current);
      });
    }

    // When we get ICE candidates, send them to the other user
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        send({
          type: "voice_ice",
          targetUserId,
          candidate: e.candidate,
        });
      }
    };

    // When we receive their audio, play it
    peer.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
    };

    // If we're the initiator, create and send an offer
    if (isInitiator) {
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => {
          send({
            type: "voice_offer",
            targetUserId,
            offer: peer.localDescription,
          });
        });
    }

    peers.current[targetUserId] = peer;
    return peer;
  }, [send]);

  // Join a voice channel
  const joinVoice = useCallback(async (channelId) => {
    try {
      // Request microphone access
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      setInVoice(true);
      setVoiceChannel(channelId);

      // Tell server we joined
      send({ type: "voice_join", channelId });
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to use voice chat.");
    }
  }, [send]);

  // Leave voice channel
  const leaveVoice = useCallback(() => {
    // Stop all audio tracks
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;

    // Close all peer connections
    Object.values(peers.current).forEach((p) => p.close());
    peers.current = {};

    setInVoice(false);
    setVoiceChannel(null);
    setParticipants([]);

    send({ type: "voice_leave" });
  }, [send]);

  // Handle incoming WebRTC signaling messages
  const handleVoiceMessage = useCallback(async (data) => {
    // Someone joined — initiate connection with them
    if (data.type === "voice_user_joined") {
      setParticipants((prev) => [...prev, data.username]);
      createPeer(data.userId, true); // we initiate
    }

    // Someone left
    if (data.type === "voice_user_left") {
      setParticipants((prev) => prev.filter((u) => u !== data.username));
      peers.current[data.userId]?.close();
      delete peers.current[data.userId];
    }

    // We received an offer from another user
    if (data.type === "voice_offer") {
      const peer = createPeer(data.userId, false);
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send({ type: "voice_answer", targetUserId: data.userId, answer });
    }

    // We received an answer to our offer
    if (data.type === "voice_answer") {
      const peer = peers.current[data.userId];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    }

    // We received an ICE candidate
    if (data.type === "voice_ice") {
      const peer = peers.current[data.userId];
      if (peer) {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    }

    // Existing participants in channel when we join
    if (data.type === "voice_participants") {
      setParticipants(data.usernames);
    }
  }, [createPeer, send]);

  return {
    inVoice,
    voiceChannel,
    participants,
    joinVoice,
    leaveVoice,
    handleVoiceMessage,
  };
}