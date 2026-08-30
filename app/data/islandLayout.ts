// Layout isometrico: DECISIONE DI DESIGN, non contenuto editoriale.
// Resta nel codice apposta — posizione/dimensione dell'isola sulla griglia non deve
// essere modificabile da un campo di testo libero in Contentful (rischio di sovrapposizioni,
// coordinate assurde, layout rotto senza nessuna validazione).
// Chiave = il campo "number" dell'articolo in Contentful (non lo slug: lo slug si
// autogenera dal titolo e quindi cambia se cambia il titolo — agganciare il layout a
// quello vorrebbe dire farlo rompere ogni volta che si rinomina un articolo. "number" è
// stabile, è già il numero d'ordine che compili in Contentful per ogni articolo).
// Se un giorno aggiungi un articolo in CMS senza una entry qui (number nuovo, mai visto),
// l'API lo scarta con un warning.
//
// Porting diretto dei valori validati nel mockup statico (disco-mockup/index.html,
// array `islands`), trovati con una ricerca Python che massimizza la dimensione apparente
// mantenendo ogni isola almeno ~55% visibile nel viewBox, senza sovrapposizioni.
export interface IslandLayout {
  gx0: number;
  gy0: number;
  cols: number; // larghezza dell'ingombro in celle di griglia
  rows: number; // profondità dell'ingombro in celle di griglia
}

// Round 2 di ingrandimento: "ancora più grandi, va bene se stanno vicine, quasi
// sovrapposte" — SIZE_SCALE (2.8x le dimensioni originali) supera apposta lo SPREAD_SCALE
// (2.0x le posizioni originali): a differenza del giro precedente (dove le posizioni
// dovevano scalare ESATTAMENTE quanto le dimensioni per garantire zero sovrapposizioni),
// qui bordi che si toccano/si accavallano un po' sono esplicitamente accettati. Due
// tentativi più aggressivi coprivano troppo "Nicole Furtado" dietro "Crassula Shang"
// (didascalia illeggibile/tagliata) — verificato via screenshot nel mockup e corretto
// aumentando lo SPREAD_SCALE finché ogni isola resta riconoscibile e cliccabile per conto
// suo, pur restando vicine. GRID_BOUNDS più sotto è stato allargato solo del minimo
// indispensabile per contenere il nuovo ingombro (non quanto le isole), quindi l'aumento
// di dimensione resta quasi tutto percepibile a schermo.
export const ISLAND_LAYOUT: Record<number, IslandLayout> = {
  1: { gx0: 4,    gy0: 144,  cols: 246, rows: 207 },
  2: { gx0: -387, gy0: 87,   cols: 252, rows: 185 },
  3: { gx0: -403, gy0: -252, cols: 224, rows: 179 },
  4: { gx0: -64,  gy0: -372, cols: 230, rows: 179 },
  5: { gx0: 254,  gy0: -106, cols: 246, rows: 207 }
  // sesta isola: aggiungi qui la entry "6: {...}" quando pronta — gx0/gy0 fuori dagli
  // ingombri sopra, cols/rows in linea con le altre (guarda i valori esistenti come guida).
};

// estensione "di contenuto" della board (in celle) — bounding box che contiene tutte le
// isole con margine, usata per il calcolo del viewBox in IsoBoard.vue. Stessi valori
// (gxMin0/gxMax0/gyMin0/gyMax0) già verificati nel mockup.
export const GRID_BOUNDS = { gxMin: -484, gxMax: 505, gyMin: -378, gyMax: 383 };
