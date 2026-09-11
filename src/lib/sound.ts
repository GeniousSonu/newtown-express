// Web Audio API custom high-urgency kitchen alert chime

let audioCtx: AudioContext | null = null;
let alertIntervalId: NodeJS.Timeout | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays an attention-grabbing, resonant kitchen order alert chime
 */
export function playChimeTone(freq1 = 880, freq2 = 1175, duration = 0.4): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq1, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + duration);

    // Second harmonic tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2, now + 0.12);
    gain2.gain.setValueAtTime(0.4, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + duration + 0.2);

    // Mobile vibration trigger if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (err) {
    console.warn('Audio chime playback prevented or not supported:', err);
  }
}

/**
 * Starts continuous looping high-urgency alarm until manually dismissed
 */
export function startLoudAlertLoop(): void {
  stopLoudAlertLoop();
  playChimeTone(987.77, 1318.51, 0.45); // B5 -> E6 lively food chime

  alertIntervalId = setInterval(() => {
    playChimeTone(987.77, 1318.51, 0.45);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 400]);
    }
  }, 2200);
}

/**
 * Stops any active loud alert loop
 */
export function stopLoudAlertLoop(): void {
  if (alertIntervalId) {
    clearInterval(alertIntervalId);
    alertIntervalId = null;
  }
}
