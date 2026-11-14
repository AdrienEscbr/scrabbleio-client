import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import Icon from './Icon.jsx';
import './ui.css';

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, children, className = '', loading, ...props }) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size} ${loading ? 'is-loading' : ''} ${className}`}
      aria-busy={loading || undefined}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children && <span className="btn__label">{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 22 : 18} />}
      {loading && <span className="btn__spinner" aria-hidden />}
    </button>
  );
}

export function IconButton({ icon, label, className = '', size = 20, badge, ...props }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>
      <Icon name={icon} size={size} />
      {badge != null && <span className="icon-btn__badge tabular">{badge}</span>}
    </button>
  );
}

/** iOS-style segmented control with a sliding selection pill. */
export function Segmented({ value, options, onChange, disabled, label }) {
  const id = useId();
  return (
    <div className="segmented" role="radiogroup" aria-label={label} data-disabled={disabled || undefined}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented__item ${active ? 'is-active' : ''}`}
            disabled={disabled}
            onClick={() => !active && onChange?.(o.value)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="segmented__pill"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="segmented__label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, icon }) {
  return (
    <label className="switch-row">
      {icon && <Icon name={icon} size={18} className="switch-row__icon" />}
      <span className="switch-row__label">{label}</span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

const PLAYER_VARS = ['--p0', '--p1', '--p2', '--p3'];

export function Avatar({ name = '?', index = 0, size = 40, online = true, className = '' }) {
  const initial = [...(name || '?').trim()][0]?.toUpperCase() ?? '?';
  return (
    <span
      className={`avatar ${online ? '' : 'is-offline'} ${className}`}
      style={{ '--avatar-color': `var(${PLAYER_VARS[index % 4]})`, '--avatar-size': `${size}px` }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

/**
 * Bottom sheet on phones (drag down to dismiss), centred dialog on larger screens.
 * Enters and leaves along the same path.
 */
export function Sheet({ open, onClose, title, children, footer, size = 'md' }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const lastFocus = useRef(null);
  const titleId = useId();
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } };
    window.addEventListener('keydown', onKey, true);
    const t = setTimeout(() => {
      panelRef.current?.querySelector('[data-autofocus], button, input, [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true });
    }, 30);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
  const hidden = reduce ? { opacity: 0 } : isPhone ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 };
  const shown = reduce ? { opacity: 1 } : isPhone ? { y: 0 } : { opacity: 1, scale: 1, y: 0 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root" key="sheet">
          <motion.div
            className="sheet-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={`sheet sheet--${size}`}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={isPhone ? { type: 'spring', bounce: 0, duration: 0.4 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            drag={isPhone && !reduce ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
            }}
          >
            <div className="sheet__handle" onPointerDown={(e) => isPhone && dragControls.start(e)}>
              {isPhone && <div className="sheet__grabber" aria-hidden />}
              {title && (
              <header className="sheet__header">
                <h2 id={titleId} className="sheet__title">{title}</h2>
                <IconButton icon="close" label="Fermer" onClick={onClose} className="sheet__close" />
              </header>
              )}
            </div>
            <div className="sheet__body">{children}</div>
            {footer && <footer className="sheet__footer">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ '--spinner-size': `${size}px` }} aria-hidden />;
}
