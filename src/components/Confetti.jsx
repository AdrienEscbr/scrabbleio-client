import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

const COLORS = ['#f0a21a', '#e5484d', '#3e63dd', '#12a594', '#e0789a', '#f7efdd'];
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVZ';

/** A one-shot burst of tiny tiles and ribbons on a canvas. Decorative, skipped with reduced motion. */
export default function Confetti({ duration = 3200, count = 140 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return undefined;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.width / dpr;
    const parts = Array.from({ length: count }, (_, i) => {
      const tile = i % 4 === 0;
      return {
        x: W() / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 900,
        vy: -400 - Math.random() * 700,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
        size: tile ? 16 + Math.random() * 8 : 6 + Math.random() * 6,
        tile,
        letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
        color: COLORS[i % COLORS.length],
        flip: Math.random() * Math.PI,
      };
    });

    let raf;
    let last = performance.now();
    const start = last;
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W(), window.innerHeight);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - duration + 800) / 800);
      for (const p of parts) {
        p.vy += 1100 * dt;
        p.vx *= Math.pow(0.35, dt);
        p.vy *= Math.pow(0.6, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        p.flip += dt * 6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.abs(Math.cos(p.flip)) * 0.8 + 0.2);
        if (p.tile) {
          const s = p.size;
          ctx.fillStyle = '#c6ad7f';
          ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2 + 2, s, s, 3); ctx.fill();
          ctx.fillStyle = '#f7efdd';
          ctx.beginPath(); ctx.roundRect(-s / 2, -s / 2, s, s, 3); ctx.fill();
          ctx.fillStyle = '#2b2219';
          ctx.font = `800 ${s * 0.62}px "Bricolage Grotesque", system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.letter, 0, 1);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (t < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W(), window.innerHeight);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [reduce, duration, count]);

  if (reduce) return null;
  return <canvas ref={ref} className="confetti" aria-hidden style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 150 }} />;
}
