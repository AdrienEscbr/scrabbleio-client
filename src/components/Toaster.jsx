import { create } from 'zustand';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import Icon from './Icon.jsx';
import './toaster.css';

let seq = 0;
const useToasts = create((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts.slice(-2), t] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * toast('Texte') / toast({ title, description, tone: 'error' | 'success' | 'info', icon, duration })
 */
export function toast(input) {
  const t = typeof input === 'string' ? { title: input } : input;
  const id = ++seq;
  useToasts.getState().push({ tone: 'info', duration: 3200, ...t, id });
  setTimeout(() => useToasts.getState().remove(id), t.duration ?? 3200);
  return id;
}

const TONE_ICONS = { error: 'close', success: 'check' };

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const remove = useToasts((s) => s.remove);
  const reduce = useReducedMotion();
  // Enter and leave through the nearest screen edge: top on phones, bottom on desktop.
  const fromBottom = useMediaQuery('(min-width: 1024px)');
  const off = fromBottom ? 24 : -24;
  return (
    <div className="toaster" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout={!reduce}
            className={`toast toast--${t.tone} material`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: off, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: off, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={fromBottom ? { top: 0.1, bottom: 0.8 } : { top: 0.8, bottom: 0.1 }}
            onDragEnd={(_, info) => {
              const dy = fromBottom ? info.offset.y : -info.offset.y;
              const vy = fromBottom ? info.velocity.y : -info.velocity.y;
              if (dy > 24 || vy > 300) remove(t.id);
            }}
            onClick={() => remove(t.id)}
          >
            {(t.icon || TONE_ICONS[t.tone]) && (
              <span className="toast__icon"><Icon name={t.icon || TONE_ICONS[t.tone]} size={16} strokeWidth={2.5} /></span>
            )}
            <div className="toast__text">
              <div className="toast__title">{t.title}</div>
              {t.description && <div className="toast__desc">{t.description}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
