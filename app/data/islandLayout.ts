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

// Dimensioni riavvicinate tra loro ("dimensioni/proporzioni simili" tra le isole, rif.
// screenshot mandato): prima andavano da 70x60 a 100x65 (spread ampio), ora tutte tra
// 80-90 di lato — restano le forme/texture di ognuna a differenziarle, non più la
// dimensione dell'ingombro sulla griglia. Proprio perché ormai sono intercambiabili per
// forma, assegnarle per "number" (slot 1, 2, 3...) invece che per identità di ogni singolo
// articolo ha senso: non importa PIÙ QUALE isola va in un dato slot, basta lo slot giusto.
export const ISLAND_LAYOUT: Record<number, IslandLayout> = {
  1: { gx0: 20,   gy0: 85,   cols: 88, rows: 74 },
  2: { gx0: -175, gy0: 55,   cols: 90, rows: 66 },
  3: { gx0: -185, gy0: -115, cols: 80, rows: 64 },
  4: { gx0: -15,  gy0: -175, cols: 82, rows: 64 },
  5: { gx0: 145,  gy0: -40,  cols: 88, rows: 74 }
  // sesta isola: aggiungi qui la entry "6: {...}" quando pronta — gx0/gy0 fuori dagli
  // ingombri sopra, cols/rows in linea con le altre (guarda i valori esistenti come guida).
};

// estensione "di contenuto" della board (in celle) — bounding box che contiene tutte le
// isole con margine, usata per il calcolo del viewBox in IsoBoard.vue. Stessi valori
// (gxMin0/gxMax0/gyMin0/gyMax0) trovati via ricerca Python e già verificati nel mockup.
export const GRID_BOUNDS = { gxMin: -403, gxMax: 404, gyMin: -298, gyMax: 319 };
