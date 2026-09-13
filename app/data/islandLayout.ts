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
// Round 3: "isole un po' più piccole" — cols/rows scalate dell'85%, stesso angolo di
// ancoraggio (gx0/gy0) così le isole restano più o meno dove sono, solo un filo più
// compatte. GRID_BOUNDS invariato (rimpicciolire non introduce sovrapposizioni).
// Round 4: aggiunta la sesta isola (6, "editors issue") AL CENTRO — le altre 5 sono state
// spostate verso l'esterno (scalate ~1.3x dal loro centroide comune) per farle stare,
// verificato via script che nessuna coppia si sovrappone (margine 10-15 celle). Le
// posizioni di MINI_ISLANDS/SEA_OBJECTS in IsoBoard.vue sono state ricalcolate insieme a
// questo giro, per non finire sotto alla nuova isola 6 o alle isole 1-5 spostate.
export const ISLAND_LAYOUT: Record<number, IslandLayout> = {
  1: { gx0: 42,   gy0: 219,  cols: 209, rows: 176 },
  2: { gx0: -466, gy0: 142,  cols: 214, rows: 157 },
  3: { gx0: -490, gy0: -299, cols: 190, rows: 152 },
  4: { gx0: -49,  gy0: -455, cols: 196, rows: 152 },
  5: { gx0: 367,  gy0: -106, cols: 209, rows: 176 },
  6: { gx0: -125, gy0: -108, cols: 220, rows: 190 } // isola della redazione ("editors issue"), al centro
};

// estensione "di contenuto" della board (in celle) — bounding box che contiene tutte le
// isole con margine, usata per il calcolo del viewBox in IsoBoard.vue. Allargato per la
// nuova disposizione a 6 isole (round 4, vedi sopra).
export const GRID_BOUNDS = { gxMin: -530, gxMax: 616, gyMin: -495, gyMax: 435 };
