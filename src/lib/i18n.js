// UI copy (French). Kept in one place so an English UI is a translation away.

export const ERRORS = {
  OFFLINE: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  TIMEOUT: 'Le serveur met trop de temps à répondre.',
  INTERNAL: 'Une erreur inattendue est survenue.',
  ROOM_NOT_FOUND: 'Ce salon n’existe pas ou a expiré.',
  ROOM_FULL: 'Ce salon est complet.',
  ROOM_IN_GAME: 'La partie a déjà commencé dans ce salon.',
  NOT_HOST: 'Seul l’hôte peut faire cela.',
  NOT_IN_ROOM: 'Vous n’êtes pas dans ce salon.',
  NOT_ENOUGH_PLAYERS: 'Il faut au moins 2 joueurs.',
  INVALID_SETTINGS: 'Réglage invalide.',
  INVALID_NICKNAME: 'Pseudo invalide : 1 à 16 lettres, chiffres, espaces, - ou _.',
  NO_GAME: 'Aucune partie en cours.',
  GAME_OVER: 'La partie est terminée.',
  NOT_IN_GAME: 'Vous ne participez pas à cette partie.',
  NOT_YOUR_TURN: 'Ce n’est pas votre tour.',
  NO_TILES: 'Posez au moins une lettre.',
  TOO_MANY_TILES: 'Trop de lettres.',
  TILE_NOT_IN_RACK: 'Cette lettre n’est plus sur votre chevalet.',
  DUPLICATE_TILE: 'Lettre utilisée deux fois.',
  JOKER_LETTER_REQUIRED: 'Choisissez la lettre du joker.',
  OUT_OF_BOUNDS: 'Hors du plateau.',
  CELL_OCCUPIED: 'Case déjà occupée.',
  DUPLICATE_CELL: 'Deux lettres sur la même case.',
  NOT_ALIGNED: 'Les lettres doivent être sur une même ligne ou colonne.',
  NOT_CONTIGUOUS: 'Les lettres doivent se suivre, sans trou.',
  NOT_CONNECTED: 'Le mot doit toucher une lettre déjà posée.',
  MUST_COVER_CENTER: 'Le premier mot doit passer par l’étoile centrale.',
  WORD_TOO_SHORT: 'Un mot fait au moins 2 lettres.',
  INVALID_WORDS: 'Mot absent du dictionnaire.',
  BAG_TOO_SMALL: 'Il faut au moins 7 lettres dans le sac pour échanger.',
};

export const errorMessage = (code, details) => {
  if (code === 'INVALID_WORDS' && details?.words?.length) {
    const list = details.words.map((w) => `« ${w} »`).join(', ');
    return details.words.length > 1 ? `${list} ne sont pas dans le dictionnaire.` : `${list} n’est pas dans le dictionnaire.`;
  }
  return ERRORS[code] || ERRORS.INTERNAL;
};

export const LANG_LABELS = { FR: 'Français', EN: 'English' };

export const PREMIUM_LABELS = {
  TW: { short: '×3', word: 'MOT', aria: 'mot compte triple' },
  DW: { short: '×2', word: 'MOT', aria: 'mot compte double' },
  TL: { short: '×3', word: 'LETTRE', aria: 'lettre compte triple' },
  DL: { short: '×2', word: 'LETTRE', aria: 'lettre compte double' },
};

export const END_REASONS = {
  OUT: 'Un joueur a posé toutes ses lettres.',
  PASSES: 'Tout le monde a passé deux fois de suite.',
};

export function formatTurnSeconds(s) {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r}` : `${m} min`;
}

export const cellName = (x, y) => `${String.fromCharCode(65 + x)}${y + 1}`;
