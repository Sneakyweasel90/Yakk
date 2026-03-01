import { useCallback, useRef } from "react";

// Generates a short "join" sound — rising two-tone chime
function playJoinSound(ctx: AudioContext) {
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";

  // Rising interval: D5 -> F#5
  osc1.frequency.setValueAtTime(587, now);
  osc2.frequency.setValueAtTime(740, now + 0.12);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.setValueAtTime(0.25, now + 0.1);
  gain.gain.linearRampToValueAtTime(0, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.14);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.38);
}

// Generates a short "leave" sound — falling two-tone
function playLeaveSound(ctx: AudioContext) {
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";

  // Falling interval: F#5 -> D5
  osc1.frequency.setValueAtTime(740, now);
  osc2.frequency.setValueAtTime(587, now + 0.12);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain.gain.setValueAtTime(0.2, now + 0.1);
  gain.gain.linearRampToValueAtTime(0, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.14);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.38);
}

export function useVoiceSounds() {
  // Lazily create AudioContext on first use — browsers require user interaction first
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playJoin = useCallback(() => {
    try {
      playJoinSound(getCtx());
    } catch (e) {
      console.warn("Could not play join sound:", e);
    }
  }, [getCtx]);

  const playLeave = useCallback(() => {
    try {
      playLeaveSound(getCtx());
    } catch (e) {
      console.warn("Could not play leave sound:", e);
    }
  }, [getCtx]);

  return { playJoin, playLeave };
}