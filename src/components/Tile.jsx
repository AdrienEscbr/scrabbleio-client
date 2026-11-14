import { forwardRef } from 'react';
import './tile.css';

/**
 * A letter tile. Fills its parent; every dimension inside is relative to the
 * tile's own size (container query units), so one component serves the rack,
 * the board, the drag ghost and decorative uses.
 */
const Tile = forwardRef(function Tile({ letter, value, joker, state, className = '', ...rest }, ref) {
  const blank = joker && !letter;
  return (
    <div ref={ref} className={`tile ${joker ? 'tile--joker' : ''} ${state ? `tile--${state}` : ''} ${className}`} {...rest}>
      <div className="tile__body">
        <span className="tile__letter">{blank ? '✦' : letter}</span>
        {!joker && value != null && <span className="tile__value">{value}</span>}
      </div>
    </div>
  );
});

export default Tile;
