// Layout isometrico: DECISIONE DI DESIGN, non contenuto editoriale.
// Resta nel codice apposta — posizione/dimensione del lotto sulla griglia non deve
// essere modificabile da un campo di testo libero in Contentful (rischio di sovrapposizioni,
// coordinate assurde, layout rotto senza nessuna validazione).
// Chiave = slug della "casa" in Contentful. Se un giorno aggiungi una casa in CMS
// senza una entry qui, l'API la scarta con un warning (vedi server/api/houses.get.ts).

export interface HouseLayout {
  gx0: number;
  gy0: number;
  cols: number; // larghezza del lotto in celle di griglia — diversa per ogni casa, come richiesto
  rows: number; // profondità del lotto in celle di griglia
}

// NIENTE PIÙ rotDeg. Prima si tentava di ruotare la foto per far combaciare il bordo
// del suo basamento con il rombo della griglia (silhouette ritagliata "seduta" nel
// lotto). Due problemi distinti, trovati misurando per davvero (edge-detection su
// pixel, non più Hough) i bordi del basamento su 3 render alla risoluzione piena:
//
// 1. Le foto sono render 3D a prospettiva piena, non proiezioni isometriche pulite.
//    Perfino DENTRO una singola foto i due bordi del basamento hanno pendenze
//    diverse tra loro (~13° e ~25° in cottage, non ±26° speculari) — è prospettiva
//    reale, nessuna rotazione dell'immagine intera può farli combaciare entrambi.
//    In torre il basamento è quasi invisibile sotto l'ombra, in serra è coperto dal
//    giardino: niente bordo pulito da allineare in nessuno dei due casi.
// 2. La griglia stessa (in IsoBoard.vue, proj()) usava angoli SIMMETRICI (±26.565°,
//    poi ±25.9° nel tentativo precedente) mentre le foto no: l'asse "vicino" (gy) è
//    davvero vicino a ~25°, ma l'asse "lontano" (gx) è ~13°, non ~26°. Un intero asse
//    della griglia aveva l'angolo sbagliato — non un dettaglio, per questo "nessuna
//    casa era giusta". La griglia ora usa due assi indipendenti (asimmetrica) tarati
//    sulla media misurata; risultato: una board più "obliqua/schiacciata" da un lato,
//    meno un classico diamante isometrico simmetrico — conseguenza visiva accettata
//    consapevolmente, non un effetto collaterale.
//
// Soluzione per (1) (vedi IsoBoard.vue, classe .card): ogni foto è una tile
// rettangolare intera, con cornice/ombra proprie, appoggiata sopra il lotto — non un
// ritaglio che finge di essere l'edificio visto in isometria. Il rombo scuro sotto
// resta geometricamente perfetto (ora con gli assi giusti) e fa da cornice, come
// nelle fototessere infossate del riferimento che avevi mandato.
// Round 3: lotti (rombo scuro) ancora più grandi e ancora più distanti — l'intero
// layout del round precedente è stato scalato ×1.3 intorno al proprio centro (le
// proporzioni/i gap relativi restano quindi identici e già verificati senza
// sovrapposizioni, solo più grandi in assoluto). Il moltiplicatore tile/lotto in
// IsoBoard.vue è stato abbassato (0.95→0.72) così il rombo scuro si vede chiaramente
// intorno alla foto invece di essere quasi interamente coperto da essa. La vista in
// IsoBoard.vue è inoltre volutamente "zoomata" (CROP_FACTOR) così i lotti più esterni
// escono un po' dal bordo dello schermo, tagliati dalla cornice.
export const HOUSE_LAYOUT: Record<string, HouseLayout> = {
  "casa-piscina": { gx0: 27,  gy0: 5,   cols: 48, rows: 32 },
  "torre":        { gx0: -62, gy0: -39, cols: 23, rows: 25 },
  "serra":        { gx0: -34, gy0: -66, cols: 40, rows: 25 },
  "loft":         { gx0: 42,  gy0: -69, cols: 32, rows: 32 },
  "cottage":      { gx0: -29, gy0: 28,  cols: 40, rows: 25 }
  // "super-mansion": aggiungere qui quando la sesta casa (articolo degli editors) è pronta —
  // scegliere gx0/gy0 fuori dagli ingombri sopra, cols/rows più grandi delle altre.
};

// estensione della griglia di sfondo (in celle) — deve coprire tutti i lotti con un margine
export const GRID_BOUNDS = { gxMin: -64, gxMax: 77, gyMin: -72, gyMax: 56 };
