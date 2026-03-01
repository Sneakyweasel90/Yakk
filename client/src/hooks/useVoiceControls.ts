import { useState, useEffect, useCallback, useRef } from "react";

type VoiceMode = "open" | "ptt";

const STORAGE_KEY_MUTE = "yakk_mute_key";
const STORAGE_KEY_PTT = "yakk_ptt_key";
const STORAGE_KEY_MODE = "yakk_voice_mode";

export function useVoiceControls(localStream: React.MutableRefObject<MediaStream | null>) {
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState<VoiceMode>(
    () => (localStorage.getItem(STORAGE_KEY_MODE) as VoiceMode) || "open"
  );
  const [muteKey, setMuteKey] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_MUTE) || "M"
  );
  const [pttKey, setPttKey] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_PTT) || "Space"
  );
  const [assigningKey, setAssigningKey] = useState<"mute" | "ptt" | null>(null);
  const [isPttActive, setIsPttActive] = useState(false);

  // Apply mute state to the actual audio tracks
  const applyMute = useCallback((muted: boolean) => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [localStream]);

  // In PTT mode the mic is muted unless the PTT key is held
  const effectiveMuted = mode === "ptt" ? !isPttActive : isMuted;

  useEffect(() => {
    applyMute(effectiveMuted);
  }, [effectiveMuted, applyMute]);

  // Mute all tracks when first joining in PTT mode
  useEffect(() => {
    if (mode === "ptt") applyMute(true);
  }, [mode, applyMute]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "open" ? "ptt" : "open";
      localStorage.setItem(STORAGE_KEY_MODE, next);
      return next;
    });
  }, []);

  const saveKey = useCallback((type: "mute" | "ptt", key: string) => {
    if (type === "mute") {
      setMuteKey(key);
      localStorage.setItem(STORAGE_KEY_MUTE, key);
    } else {
      setPttKey(key);
      localStorage.setItem(STORAGE_KEY_PTT, key);
    }
    setAssigningKey(null);
  }, []);

  // Global keydown/keyup handlers for mute shortcut and PTT
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Capture mode — waiting for user to press a key to assign
      if (assigningKey) {
        e.preventDefault();
        const key = e.code === "Space" ? "Space" : e.key.toUpperCase();
        saveKey(assigningKey, key);
        return;
      }

      const pressed = e.code === "Space" ? "Space" : e.key.toUpperCase();

      // Mute toggle shortcut (only in open mic mode)
      if (mode === "open" && pressed === muteKey.toUpperCase()) {
        // Don't fire if user is typing in an input
        if (document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "TEXTAREA") return;
        toggleMute();
      }

      // PTT key held down
      if (mode === "ptt" && pressed === pttKey.toUpperCase()) {
        setIsPttActive(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (assigningKey) return;
      const pressed = e.code === "Space" ? "Space" : e.key.toUpperCase();
      if (mode === "ptt" && pressed === pttKey.toUpperCase()) {
        setIsPttActive(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [assigningKey, mode, muteKey, pttKey, toggleMute, saveKey]);

  // Reset PTT and mute state when leaving voice
  const resetControls = useCallback(() => {
    setIsMuted(false);
    setIsPttActive(false);
  }, []);

  return {
    isMuted: effectiveMuted,
    isPttActive,
    mode,
    muteKey,
    pttKey,
    assigningKey,
    toggleMute,
    toggleMode,
    setAssigningKey,
    resetControls,
  };
}