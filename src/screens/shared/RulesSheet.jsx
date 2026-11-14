import { Sheet } from '../../components/ui.jsx';
import './shared.css';

const PREMIUMS = [
  ['TW', 'Mot compte triple'],
  ['DW', 'Mot compte double'],
  ['TL', 'Lettre compte triple'],
  ['DL', 'Lettre compte double'],
];

export default function RulesSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Comment jouer" size="lg">
      <div className="rules">
        <section>
          <h3>Le but</h3>
          <p>Formez des mots sur le plateau avec vos 7 lettres pour marquer le plus de points. Le premier mot passe par l’étoile centrale ; les suivants s’appuient sur les lettres déjà posées.</p>
        </section>
        <section>
          <h3>Poser un mot</h3>
          <ul>
            <li><strong>Glissez</strong> une lettre du chevalet vers une case, ou <strong>touchez</strong> une lettre puis une case.</li>
            <li>Touchez une lettre posée pour la reprendre. Le score du coup s’affiche en direct avant de valider.</li>
            <li>Au clavier : cliquez une case, tapez vos lettres, <kbd>Espace</kbd> change de sens, <kbd>Entrée</kbd> valide, <kbd>Échap</kbd> reprend tout.</li>
          </ul>
        </section>
        <section>
          <h3>Cases bonus</h3>
          <ul className="rules__legend">
            {PREMIUMS.map(([k, label]) => (
              <li key={k}><span className={`legend-swatch prem-${k}`} />{label}</li>
            ))}
          </ul>
          <p>Un bonus ne compte que pour la lettre posée dessus pendant le coup.</p>
        </section>
        <section>
          <h3>Joker & Scrabble</h3>
          <p>Le joker (✦) remplace la lettre de votre choix et vaut 0 point ; une fois posé, il garde cette lettre. Placer vos 7 lettres d’un coup rapporte <strong>50 points</strong> de bonus.</p>
        </section>
        <section>
          <h3>Fin de partie</h3>
          <p>La partie s’arrête quand un joueur pose sa dernière lettre une fois le sac vide — il récupère les points restant chez ses adversaires — ou quand chacun a passé deux fois de suite.</p>
        </section>
      </div>
    </Sheet>
  );
}
