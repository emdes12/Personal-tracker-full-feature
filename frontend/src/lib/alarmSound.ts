/**
 * A short, distinct alarm beep synthesized with the Web Audio API — no
 * external audio asset to bundle/license. Two different patterns so a
 * "starting" alarm and an "ending" alarm are audibly distinguishable even
 * without looking at the screen.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function beep(context: AudioContext, startTime: number, frequency: number, duration: number) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Three quick ascending beeps — "starting now". */
export function playStartAlarm() {
  try {
    const context = getContext();
    if (context.state === "suspended") context.resume();
    const now = context.currentTime;
    beep(context, now, 660, 0.15);
    beep(context, now + 0.2, 880, 0.15);
    beep(context, now + 0.4, 1046, 0.22);
  } catch {
    // Web Audio unavailable/blocked — the visual toast/notification still fires.
  }
}

/** Two longer, lower beeps — "time's up". */
export function playEndAlarm() {
  try {
    const context = getContext();
    if (context.state === "suspended") context.resume();
    const now = context.currentTime;
    beep(context, now, 523, 0.3);
    beep(context, now + 0.35, 392, 0.4);
  } catch {
    // Web Audio unavailable/blocked — the visual toast/notification still fires.
  }
}
