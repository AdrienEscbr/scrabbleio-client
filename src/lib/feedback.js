// Sound (synthesised with Web Audio, no assets) and haptics.
// Fired on the same frame as the visual change they accompany.
import { usePrefs } from './prefs.js';

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Unlock audio on the first gesture (iOS requires it).
if (typeof window !== 'undefined') {
  const unlock = () => { audio(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);
}

function tone(ac, { freq, type = 'sine', at = 0, dur = 0.12, gain = 0.15, slideTo }) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function click(ac, { at = 0, freq = 2400, gain = 0.25, dur = 0.035 }) {
  const t = ac.currentTime + at;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 1.2;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
}

const SOUNDS = {
  // Wooden tile set down on the board
  place: (ac, at = 0) => { click(ac, { at, freq: 1800 }); tone(ac, { at, freq: 190, slideTo: 120, dur: 0.07, gain: 0.12 }); },
  pick: (ac) => click(ac, { freq: 3200, gain: 0.12, dur: 0.02 }),
  back: (ac) => click(ac, { freq: 1200, gain: 0.14, dur: 0.03 }),
  shuffle: (ac) => { for (let i = 0; i < 5; i++) click(ac, { at: i * 0.035, freq: 2000 + i * 200, gain: 0.1, dur: 0.02 }); },
  turn: (ac) => { tone(ac, { freq: 659, dur: 0.16, gain: 0.08 }); tone(ac, { freq: 988, at: 0.11, dur: 0.24, gain: 0.08 }); },
  success: (ac) => [523, 659, 784].forEach((f, i) => tone(ac, { freq: f, at: i * 0.07, dur: 0.22, gain: 0.08, type: 'triangle' })),
  bingo: (ac) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ac, { freq: f, at: i * 0.08, dur: 0.35, gain: 0.08, type: 'triangle' })),
  error: (ac) => { tone(ac, { freq: 180, type: 'square', dur: 0.09, gain: 0.04 }); tone(ac, { freq: 150, type: 'square', at: 0.1, dur: 0.12, gain: 0.04 }); },
  tick: (ac) => click(ac, { freq: 4200, gain: 0.08, dur: 0.015 }),
  join: (ac) => tone(ac, { freq: 740, dur: 0.14, gain: 0.06, slideTo: 880 }),
};

export function sound(name, at) {
  if (!usePrefs.getState().sound) return;
  try {
    const ac = audio();
    if (ac) SOUNDS[name]?.(ac, at);
  } catch { /* audio is a nicety */ }
}

const HAPTICS = { light: 8, medium: 15, success: [10, 40, 18], error: [25, 40, 25], turn: [12, 60, 12] };

export function haptic(kind = 'light') {
  if (!usePrefs.getState().haptics) return;
  try { navigator.vibrate?.(HAPTICS[kind] ?? 10); } catch { /* unsupported (iOS) */ }
}
