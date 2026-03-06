import { useState, useEffect, useCallback, useRef } from "react";

type VoiceMode = "open" | "ptt";

const STORAGE_KEY_MUTE = "yakk_mute_key";
const STORAGE_KEY_PTT = "yakk_ptt_key";
const STORAGE_KEY_MODE = "yakk_voice_mode";

export function useVoiceControls(localStream: React.MutableRefObject<MediaStream | null>) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
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

  // Ref to hold all remote audio elements so deafen can silence them
  const remoteAudioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  const registerRemoteAudio = useCallback((el: HTMLAudioElement) => {
    remoteAudioElementsRef.current.add(el);
    return () => { remoteAudioElementsRef.current.delete(el); };
  }, []);

  // Apply mute state to the actual audio tracks
  const applyMute = useCallback((muted: boolean) => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [localStream]);

  // Apply deafen to all remote audio elements
  const applyDeafen = useCallback((deafened: boolean) => {
    remoteAudioElementsRef.current.forEach((el) => {
      el.muted = deafened;
    });
  }, []);

  // In PTT mode the mic is muted unless the PTT key is held
  const effectiveMuted = isDeafened || (mode === "ptt" ? !isPttActive : isMuted);

  useEffect(() => {
    applyMute(effectiveMuted);
  }, [effectiveMuted, applyMute]);

  useEffect(() => {
    applyDeafen(isDeafened);
  }, [isDeafened, applyDeafen]);

  // Mute all tracks when first joining in PTT mode
  useEffect(() => {
    if (mode === "ptt") applyMute(true);
  }, [mode, applyMute]);

  const toggleMute = useCallback(() => {
    // Unmuting also un-deafens
    if (isDeafened) {
      setIsDeafened(false);
      setIsMuted(false);
    } else {
      setIsMuted((prev) => !prev);
    }
  }, [isDeafened]);

  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      // Deafening also mutes mic
      if (next) setIsMuted(true);
      return next;
    });
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

      // Mute shortcut (open mic mode only)
      if (mode === "open" && pressed === muteKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          toggleMute();
        }
      }

      // PTT: activate when key held
      if (mode === "ptt" && pressed === pttKey) {
        setIsPttActive(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const pressed = e.code === "Space" ? "Space" : e.key.toUpperCase();
      if (mode === "ptt" && pressed === pttKey) {
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

  const resetControls = useCallback(() => {
    setIsMuted(false);
    setIsDeafened(false);
    setIsPttActive(false);
    setAssigningKey(null);
  }, []);

  return {
    isMuted: effectiveMuted,
    isDeafened,
    isPttActive,
    mode,
    muteKey,
    pttKey,
    assigningKey,
    toggleMute,
    toggleDeafen,
    toggleMode,
    setAssigningKey,
    resetControls,
    registerRemoteAudio,
  };
}