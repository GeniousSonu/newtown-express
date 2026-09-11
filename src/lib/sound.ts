// Web Audio API custom high-urgency kitchen alert chime & Screen Wake Lock

let audioCtx: AudioContext | null = null;
let alertIntervalId: NodeJS.Timeout | null = null;
let wakeLockSentinel: any = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

    // First tone (Food chime primary)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq1, now);
    gain1.gain.setValueAtTime(0.4, now);
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
    gain2.gain.setValueAtTime(0.45, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + duration + 0.2);

    // Mobile vibration trigger if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([250, 100, 250]);
    }
  } catch (err) {
    console.warn('Audio chime playback prevented or not supported:', err);
  }
}

/**
 * Plays a single on-demand test chime for testing phone speaker volume
 */
export function testAlarmChime(): void {
  playChimeTone(987.77, 1318.51, 0.5);
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([300, 100, 300]);
  }
}

/**
 * Starts continuous looping high-urgency alarm until manually actioned
 */
export function startLoudAlertLoop(): void {
  stopLoudAlertLoop();
  playChimeTone(987.77, 1318.51, 0.45); // B5 -> E6 lively food chime

  // Acquire wake lock to keep screen awake while ringing
  requestScreenWakeLock();

  alertIntervalId = setInterval(() => {
    playChimeTone(987.77, 1318.51, 0.45);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 400]);
    }
  }, 2000);
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

/**
 * Request Screen Wake Lock API to prevent kitchen tablet/phone from sleeping
 */
export async function requestScreenWakeLock(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch (err) {
      console.warn('[WAKE-LOCK] Screen Wake Lock not acquired:', err);
    }
  }
}

/**
 * Release Screen Wake Lock when queue is clear
 */
export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}
