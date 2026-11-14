# ScrabbleIO — client

Interface web du jeu (React 19 + Vite), pensée d'abord pour le mobile, et jouable aussi sur ordinateur à la souris et au clavier.

```bash
npm install
npm run dev        # http://localhost:5173 (et sur le réseau local, pour tester sur téléphone)
npm run build      # build de production dans dist/
npm run deploy     # build + publication sur GitHub Pages (branche gh-pages)
```

Le serveur doit tourner à côté (`scrabbleio-server`, port 3001). En développement, le client se connecte à `http://<hôte>:3001` ; en production à Render. Pour changer l'adresse : `VITE_SERVER_URL` (voir `.env.example`).

## Moteur partagé

`src/engine/` est une **copie générée** du moteur du serveur (`scrabbleio-server/src/engine`). Le client s'en sert pour afficher en direct le score d'un coup avant validation, avec exactement les règles du serveur. Après toute modification du moteur côté serveur :

```bash
npm run sync-engine
```

## Organisation

| Dossier | Contenu |
|---|---|
| `src/styles/` | Variables de design (couleurs, typographie, espacements, animations, thèmes clair et sombre) et styles de base. |
| `src/components/` | Composants de base : tuile 3D (CSS), boutons, panneaux, notifications, confettis. |
| `src/lib/` | Connexion Socket.IO et session, état global (zustand), préférences, sons (synthétisés en Web Audio) et vibrations, textes. |
| `src/screens/home/` | Accueil et scène 3D (three.js, chargée à la demande). |
| `src/screens/room/` | Salon, résultats, et l'écran qui choisit la vue selon l'état du salon. |
| `src/screens/game/` | Plateau, chevalet, glisser-déposer, scores, historique, brouillon du coup en cours. |

## Interactions

- **Glisser-déposer** au doigt, au stylet ou à la souris (pointer events) : du chevalet vers le plateau, d'une case à l'autre, retour au chevalet, réordonnancement.
- **Toucher-toucher** : toucher une lettre puis une case. Toucher une lettre posée la reprend.
- **Clavier** (ordinateur) : cliquer une case, taper les lettres, `Espace` change le sens, `Retour arrière` annule la dernière lettre, `Entrée` joue, `Échap` reprend tout.
- Le **brouillon** du coup survit à un rechargement de la page (stocké pour l'onglet en cours), et on peut préparer son coup pendant le tour des autres.
