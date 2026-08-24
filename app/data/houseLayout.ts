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
export const HOUSE_LAYOUT: Record<string, HouseLayout> = {
  "casa-piscina": { gx0: -7, gy0: 0,  cols: 6, rows: 4 },
  "torre":        { gx0: 1,  gy0: -6, cols: 3, rows: 3 },
  "serra":        { gx0: 5,  gy0: 0,  cols: 5, rows: 3 },
  "loft":         { gx0: -5, gy0: 6,  cols: 4, rows: 4 },
  "cottage":      { gx0: 2,  gy0: 6,  cols: 5, rows: 3 }
  // "super-mansion": aggiungere qui quando la sesta casa (articolo degli editors) è pronta —
  // scegliere gx0/gy0 fuori dagli ingombri sopra, cols/rows più grandi delle altre.
};

// estensione della griglia di sfondo (in celle) — deve coprire tutti i lotti con un margine
export const GRID_BOUNDS = { gxMin: -10, gxMax: 13, gyMin: -9, gyMax: 12 };
