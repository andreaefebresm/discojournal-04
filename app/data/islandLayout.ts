// Layout isometrico: DECISIONE DI DESIGN, non contenuto editoriale.
// Resta nel codice apposta — posizione/dimensione dell'isola sulla griglia non deve
// essere modificabile da un campo di testo libero in Contentful (rischio di sovrapposizioni,
// coordinate assurde, layout rotto senza nessuna validazione).
// Chiave = slug dell'articolo/"casa" in Contentful (content type invariato — vedi
// server/api/houses.get.ts — solo il contenuto è diventato "isole" invece di "case").
// Se un giorno aggiungi un articolo in CMS senza una entry qui, l'API lo scarta con un warning.
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
// dimensione dell'ingombro sulla griglia.
export const ISLAND_LAYOUT: Record<string, IslandLayout> = {
  "isola-charlotte": { gx0: 20,   gy0: 85,   cols: 88, rows: 74 },
  "isola-fareda":    { gx0: -175, gy0: 55,   cols: 90, rows: 66 },
  "isola-april":     { gx0: -185, gy0: -115, cols: 80, rows: 64 },
  "isola-nicole":    { gx0: -15,  gy0: -175, cols: 82, rows: 64 },
  "isola-crassula":  { gx0: 145,  gy0: -40,  cols: 88, rows: 74 }
  // sesta isola (articolo degli editors): aggiungere qui quando pronta — gx0/gy0 fuori
  // dagli ingombri sopra, cols/rows in linea con le altre.
};

// estensione "di contenuto" della board (in celle) — bounding box che contiene tutte le
// isole con margine, usata per il calcolo del viewBox in IsoBoard.vue. Stessi valori
// (gxMin0/gxMax0/gyMin0/gyMax0) trovati via ricerca Python e già verificati nel mockup.
export const GRID_BOUNDS = { gxMin: -403, gxMax: 404, gyMin: -298, gyMax: 319 };
