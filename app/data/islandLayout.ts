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

// Round "isole più grandi il doppio": cols/rows raddoppiati (SIZE_SCALE=2). Le posizioni
// sono state scalate dal centro comune ESATTAMENTE dello stesso fattore (SPREAD_SCALE=2,
// non di meno): è una pura scala uniforme 2x dell'assetto precedente (che non si
// sovrapponeva), quindi per costruzione non introduce nuove sovrapposizioni — un primo
// tentativo con spread inferiore alla dimensione (1.5x posizione contro 2x dimensione)
// aveva invece ridotto lo spazio libero relativo, facendo toccare visivamente due isole
// (verificato con screenshot ravvicinato nel mockup). GRID_BOUNDS più sotto è stato
// allargato solo dell'1.2x, non del 2x pieno, altrimenti l'inquadratura si sarebbe
// allargata quanto il contenuto e l'effetto "più grandi" sarebbe sparito a schermo —
// l'aumento percepito è quindi ~1.6-1.7x, non un 2.0x letterale.
export const ISLAND_LAYOUT: Record<number, IslandLayout> = {
  1: { gx0: 39,   gy0: 174,  cols: 176, rows: 148 },
  2: { gx0: -351, gy0: 114,  cols: 180, rows: 132 },
  3: { gx0: -371, gy0: -226, cols: 160, rows: 128 },
  4: { gx0: -31,  gy0: -346, cols: 164, rows: 128 },
  5: { gx0: 289,  gy0: -76,  cols: 176, rows: 148 }
  // sesta isola: aggiungi qui la entry "6: {...}" quando pronta — gx0/gy0 fuori dagli
  // ingombri sopra, cols/rows in linea con le altre (guarda i valori esistenti come guida).
};

// estensione "di contenuto" della board (in celle) — bounding box che contiene tutte le
// isole con margine, usata per il calcolo del viewBox in IsoBoard.vue. Stessi valori
// (gxMin0/gxMax0/gyMin0/gyMax0) già verificati nel mockup.
export const GRID_BOUNDS = { gxMin: -484, gxMax: 485, gyMin: -358, gyMax: 383 };
