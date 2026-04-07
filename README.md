# bbdzbp musik

Lecteur de partitions textuelles dans le navigateur, sans dépendances. La partition est un string de notes séparées par des virgules, rendu via Web Audio API.

## Syntaxe des partitions

### Note simple

```
a3,b3,c,d,e
```

Une note est une lettre (`a`–`g`) suivie optionnellement d'un numéro d'octave. L'octave par défaut (sans numéro) est 4 (do central = `c` = 261 Hz). `3` est une octave en dessous, `5` au-dessus, etc.

```
c      →  C4  (261 Hz)
c3     →  C3  (130 Hz)
c5     →  C5  (523 Hz)
```

### Altérations

```
c#     →  do dièse
eb     →  mi bémol
```

### Durées

Le tempo par défaut est **120 BPM** et se règle via le slider (40–300 BPM). À 120 BPM, 1 temps = 0.5 s.

| Syntaxe  | Durée            |
|----------|------------------|
| `a`      | 1 temps (défaut) |
| `a/2`    | 1/2 temps        |
| `a/4`    | 1/4 de temps     |
| `a*2`    | 2 temps          |
| `a*4`    | 4 temps          |

### Silence

```
-      →  silence 1 temps
-/2    →  silence 1/2 temps
```

### Accords

Plusieurs notes entre parenthèses, séparées par des virgules :

```
(c,e,g)       →  accord do majeur
(c,e,g)*2     →  accord do majeur, tenu 2 temps
(d3,f3)/2     →  accord sur 1/2 temps
```

### Slides (glissando)

`->` pour glisser d'une note à une autre sur la durée de l'événement :

```
a3->c          →  glisse de A3 à C4 en 1 temps
a3->c*2        →  glisse de A3 à C4 en 2 temps
e->g/2         →  glisse rapide de E à G
```

Les slides fonctionnent aussi sur les accords (chaque voix glisse indépendamment) :

```
(c,e)->(e,g)   →  glisse do→mi et mi→sol simultanément
```

### Espaces et retours à la ligne

Les espaces et sauts de ligne sont ignorés — la partition peut être mise en forme librement :

```
a3->c*2, c->e,
e->g/2,  g->a/2,
a*2,     -/2
```

## Exemples

```
# Mélodie simple
c,d,e,f,g,a,b,c5

# Avec durées variées
c*2,e/2,g/2,a,g/2,e/2,c*2

# Accords
(c,e,g)*2,(f,a,c5)*2,(g,b,d5)*2,(c,e,g)*4

# Slides blues (pentatonique La mineur)
a3->c*2,c->e,e->g/2,g->a/2,a*2,-/2,a->g*2,g->e
```

## Interface

- **Sélecteur de partition** — choisir parmi les partitions préchargées (définies dans `js/partitions.js`) ; le tempo se règle automatiquement
- **Textarea** — éditer la partition librement ; cliquer dessus pendant la lecture arrête la musique
- **Tempo** — slider de 40 à 300 BPM, appliqué avec un délai de 500 ms pour éviter les recalculs intempestifs
- **Boutons** — start / pause / resume / stop
- **Télécharger** — exporte la partition en `.txt`
- **Point de beat** — cercle qui pulse, change de couleur et de position aléatoirement à chaque note

## Architecture

| Fichier                | Rôle |
|------------------------|------|
| `js/bbdzbpmsc.js`      | Moteur audio : parsing, synthèse via Web Audio API, contrôle lecture |
| `js/partitions.js`     | Partitions préchargées (objet `{ nom: { tempo, notes } }`) |
| `js/index.js`          | UI : chargement des partitions, sync textarea, highlight, beat dot |
| `css/index.css`        | Styles de l'interface principale |
| `css/manuel.css`       | Styles du manuel |
| `index.html`           | Structure HTML principale |
| `manuel.html`          | Documentation de la syntaxe |

### Fonctionnement interne

1. **Parsing** — `parsePartition()` découpe le string en liste de chords avec leur durée et leurs fréquences.
2. **Rendu offline** — `play()` utilise un `OfflineAudioContext` pour pré-rendre toute la partition en un buffer audio.
3. **Lecture** — Le buffer est joué en boucle via un `AudioBufferSourceNode` branché sur l'`AudioContext` live.
4. **Highlight** — `getCurrentChordIndex()` calcule l'index du chord courant via `(audioContext.currentTime - songStartTime) % totalDuration`, utilisé par `index.js` pour surligner la note dans la partition affichée.
5. **Beat dot** — `getChordPhase()` retourne la progression 0→1 dans la note courante, utilisée pour animer le cercle en `rAF`.
