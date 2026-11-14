// Pointer-driven drag & drop for tiles (works with touch, pen and mouse).
// The ghost is moved with direct transforms in a rAF loop — no React render per frame.
import { sound, haptic } from '../../lib/feedback.js';

let active = null; // one drag at a time (ignore extra fingers)

/** Score shown next to the dragged tile (feedforward), or null to hide it. */
export function setDragBadge(value) {
  const badge = active?.badge;
  if (!badge) return;
  if (value == null) { badge.dataset.show = 'false'; return; }
  badge.textContent = `+${value}`;
  badge.dataset.show = 'true';
}

const THRESHOLD = { mouse: 4, pen: 6, touch: 8 };

/**
 * @param {PointerEvent} e
 * @param {{
 *   el: HTMLElement, onTap?: () => void, onDrop: (target) => boolean | void, canDrop?: (target) => boolean,
 *   onStart?: () => void, onHover?: (target | null) => void, onEnd?: () => void,
 * }} opts
 *   target: { type: 'cell', x, y } | { type: 'rack', index }
 *   onDrop returns false to refuse (the ghost flies back).
 *   onHover fires when the drop target changes, so the UI can preview the result (feedforward).
 *   onEnd fires once the drag is fully over (after the fly-back animation if refused).
 */
export function startTileGesture(e, { el, onTap, onDrop, canDrop = () => true, onStart, onHover, onEnd }) {
  if (active || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const pointerId = e.pointerId;
  const startX = e.clientX;
  const startY = e.clientY;
  const rect = el.getBoundingClientRect();
  const grabX = startX - rect.left;
  const grabY = startY - rect.top;
  const threshold = THRESHOLD[e.pointerType] ?? 6;

  const state = {
    ghost: null, x: startX, y: startY, px: startX, tilt: 0, scale: 1, targetScale: 1.12,
    target: null, targetKey: null, hoverEl: null, raf: 0, viewport: null, onHover,
  };
  active = state;

  const begin = () => {
    const ghost = el.cloneNode(true);
    ghost.classList.remove('tile--selected', 'tile--pending', 'tile--landing', 'tile--shake', 'tile--last');
    ghost.classList.add('drag-ghost');
    Object.assign(ghost.style, {
      position: 'fixed', left: '0px', top: '0px', width: `${rect.width}px`, height: `${rect.height}px`,
      transformOrigin: `${grabX}px ${grabY}px`, pointerEvents: 'none', zIndex: 300, margin: 0,
    });
    document.body.appendChild(ghost);
    state.ghost = ghost;
    // Unscaled sibling so the score stays readable whatever the ghost's size.
    const badge = document.createElement('div');
    badge.className = 'drag-badge';
    badge.dataset.show = 'false';
    document.body.appendChild(badge);
    state.badge = badge;
    state.viewport = document.querySelector('.board-viewport');
    el.classList.add('is-drag-origin');
    document.documentElement.classList.add('is-dragging');
    sound('pick');
    haptic('light');
    onStart?.();
    state.raf = requestAnimationFrame(frame);
  };

  const frame = () => {
    const s = state;
    if (!s.ghost) return;
    // Tilt follows horizontal velocity with a little lag, like a held object.
    const vx = s.x - s.px;
    s.px = s.x;
    s.tilt += (Math.max(-14, Math.min(14, vx * 0.9)) - s.tilt) * 0.2;
    s.scale += (s.targetScale - s.scale) * 0.25;
    s.ghost.style.transform = `translate3d(${s.x - grabX}px, ${s.y - grabY}px, 0) rotate(${s.tilt}deg) scale(${s.scale})`;
    // Top-right corner of the scaled ghost.
    s.badge.style.transform = `translate3d(${s.x + (rect.width - grabX) * s.scale}px, ${s.y - grabY * s.scale}px, 0) translate(-40%, -55%)`;
    autoScroll(s);
    s.raf = requestAnimationFrame(frame);
  };

  const move = (ev) => {
    if (ev.pointerId !== pointerId) return;
    state.x = ev.clientX;
    state.y = ev.clientY;
    if (!state.ghost) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < threshold) return;
      begin();
    }
    ev.preventDefault();
    hitTest(state, canDrop, rect, el);
  };

  const end = (ev) => {
    if (ev.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    active = null;
    if (!state.ghost) {
      if (ev.type === 'pointerup') onTap?.();
      return;
    }
    cancelAnimationFrame(state.raf);
    state.badge?.remove();
    clearHover(state);
    document.documentElement.classList.remove('is-dragging');
    const accepted = ev.type === 'pointerup' && state.target && onDrop(state.target) !== false;
    if (accepted) {
      state.ghost.remove();
      el.classList.remove('is-drag-origin');
      onEnd?.();
    } else {
      onHover?.(null);
      flyBack(state, el, rect, onEnd);
    }
  };

  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

function hitTest(state, canDrop, originRect, originEl) {
  const under = document.elementFromPoint(state.x, state.y);
  const cellEl = under?.closest?.('[data-cell]');
  const rackEl = under?.closest?.('[data-rack]');
  let target = null;
  let hoverEl = null;
  if (cellEl) {
    const [x, y] = cellEl.dataset.cell.split(',').map(Number);
    target = { type: 'cell', x, y };
    hoverEl = cellEl;
    const ok = canDrop(target);
    if (!ok) target = null;
    hoverEl.dataset.drop = ok ? 'ok' : 'no';
    // Preview the tile at its real size on the board.
    state.targetScale = cellEl.getBoundingClientRect().width / originRect.width;
  } else if (rackEl) {
    // Layout positions (offsetLeft ignores the transforms of tiles that are sliding
    // aside), so the index does not flicker while the rack animates the preview.
    const slots = [...rackEl.querySelectorAll('[data-rack-slot]:not([data-gap])')].filter((slot) => !slot.contains(originEl));
    const left = rackEl.getBoundingClientRect().left - rackEl.scrollLeft;
    let index = slots.length;
    for (let i = 0; i < slots.length; i++) {
      if (state.x < left + slots[i].offsetLeft + slots[i].offsetWidth / 2) { index = i; break; }
    }
    target = { type: 'rack', index };
    hoverEl = rackEl;
    hoverEl.dataset.drop = 'ok';
    state.targetScale = 1.12;
  } else {
    state.targetScale = 1.12;
  }
  if (state.hoverEl && state.hoverEl !== hoverEl) delete state.hoverEl.dataset.drop;
  state.hoverEl = hoverEl;
  state.target = target;
  const key = target ? (target.type === 'cell' ? `c${target.x},${target.y}` : `r${target.index}`) : null;
  if (key !== state.targetKey) {
    state.targetKey = key;
    state.onHover?.(target);
  }
}

function clearHover(state) {
  if (state.hoverEl) delete state.hoverEl.dataset.drop;
  state.hoverEl = null;
}

function autoScroll(state) {
  const vp = state.viewport;
  if (!vp || vp.scrollWidth <= vp.clientWidth + 1) return;
  const r = vp.getBoundingClientRect();
  const edge = 40;
  const speed = (d) => (d < edge ? ((edge - d) / edge) * 14 : 0);
  if (state.x < r.left || state.x > r.right || state.y < r.top || state.y > r.bottom) return;
  const dx = speed(r.right - state.x) - speed(state.x - r.left);
  const dy = speed(r.bottom - state.y) - speed(state.y - r.top);
  if (dx || dy) vp.scrollBy(dx, dy);
}

function flyBack(state, el, rect, onEnd) {
  const ghost = state.ghost;
  const to = el.isConnected ? el.getBoundingClientRect() : rect;
  const anim = ghost.animate(
    [
      { transform: ghost.style.transform },
      { transform: `translate3d(${to.left}px, ${to.top}px, 0) rotate(0deg) scale(1)` },
    ],
    { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
  );
  const done = () => { ghost.remove(); el.classList.remove('is-drag-origin'); onEnd?.(); };
  anim.onfinish = done;
  anim.oncancel = done;
}
