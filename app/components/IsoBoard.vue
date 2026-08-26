<template>
  <div class="board-root">
    <div class="board-wrap">
      <svg ref="svgEl" id="board-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>
    <div class="list">
      <button
        v-for="hs in houses"
        :key="hs.slug"
        type="button"
        class="house"
        :aria-label="`Casa 0${hs.number} — ${hs.title} — apri articolo`"
        @click="$emit('select', hs)"
      >
        <img :src="hs.image?.url" :alt="`${hs.title}, casa 0${hs.number}`" loading="lazy" />
        <div class="caption">Casa 0{{ hs.number }} — {{ hs.title }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Porting diretto del motore SVG isometrico validato nel prototipo statico.
// Griglia e lotti condividono la STESSA funzione proj(): è quello che garantisce
// l'allineamento (vedi conversazione precedente — prima del porting, griglia CSS
// e case posizionate in JS avevano ciascuna la propria matematica, da cui il disallineamento).
const props = defineProps<{
  houses: Array<{
    slug: string;
    number: number;
    title: string;
    image: { url: string; width: number; height: number } | null;
    gx0: number; gy0: number; cols: number; rows: number;
  }>;
  gridBounds: { gxMin: number; gxMax: number; gyMin: number; gyMax: number };
}>();

const emit = defineEmits<{ select: [house: any] }>();

const svgEl = ref<SVGSVGElement | null>(null);

// Griglia ASIMMETRICA — misurata per davvero sui bordi del basamento di 3 render
// (edge-detection su colonne di pixel): l'asse "vicino" (gy) è ~25.2°, l'asse
// "lontano" (gx) è molto più basso, ~12.9° — non simmetrica ±26.565°/±25.9° come
// nei tentativi precedenti. Vedi app/data/houseLayout.ts per i dettagli.
const GX_X = 26, GX_Y = 6.0;   // asse gx: ~12.9° (tan⁻¹(6/26))
const GY_X = 26, GY_Y = 12.23; // asse gy: ~25.2° (tan⁻¹(12.23/26))
// Il pattern di sfondo disegna una linea ogni GRID_STEP celle (vedi buildBoard) — le
// case in houseLayout.ts hanno gx0/gy0/cols/rows multipli di GRID_STEP apposta, così il
// bordo "a gradini" del lotto scuro (irregularPlotPoints) cade sulle stesse linee della
// griglia visibile invece di fare scalini più fini e sembrare "non seguirla".
const GRID_STEP = 5;
function proj(gx: number, gy: number) { return { x: gx * GX_X - gy * GY_X, y: gx * GX_Y + gy * GY_Y }; }
// inversa di proj(): serve per calcolare, dati i 4 angoli del viewBox reale (che
// combacia con l'aspect ratio del contenitore, non con quello del contenuto), fino a
// dove estendere le linee della griglia — altrimenti la griglia resta un rombo legato
// ai bound del contenuto e lascia angoli vuoti nel rettangolo del viewport.
function invProj(x: number, y: number) {
  const det = GX_X * GY_Y + GY_X * GX_Y;
  return { gx: (GY_Y * x + GY_X * y) / det, gy: (-GX_Y * x + GX_X * y) / det };
}

function plotCorners(hs: any) {
  return [
    proj(hs.gx0, hs.gy0),
    proj(hs.gx0 + hs.cols, hs.gy0),
    proj(hs.gx0 + hs.cols, hs.gy0 + hs.rows),
    proj(hs.gx0, hs.gy0 + hs.rows)
  ];
}

// Forma irregolare del lotto, ma "a scacchiera": segue SEMPRE le linee della griglia
// (mai un taglio diagonale libero) — una cella sì, una cella no, dentro o fuori dal
// rettangolo base, come nel riferimento mandato. Il rombo "vero" (plotCorners) resta
// la fonte di verità per bounding box / posizionamento della tile fotografica; SOLO
// il disegno del terreno scuro segue questo bordo a gradini. Random seedato per casa
// (non Math.random) così la forma è stabile tra un caricamento e l'altro.
function seededRand(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// insieme di celle occupate (coordinate LOCALI 0..cols-1 / 0..rows-1, più eventuali
// celle aggiunte appena fuori), partendo dal rettangolo pieno: per ogni cella di
// bordo (mai gli angoli, per restare un'unica forma semplice) la toglie o ne
// aggiunge una adiacente fuori, a caso ma stabile.
function buildCellSet(hs: any, rand: () => number) {
  // Opera in "celle grandi" (bigCols x bigRows, un'unità = GRID_STEP celle fini) così
  // gli scalini del bordo cadono sulle stesse linee del pattern di sfondo, non su una
  // sottogriglia più fine e invisibile.
  const bigCols = hs.cols / GRID_STEP, bigRows = hs.rows / GRID_STEP;
  const cells = new Set<string>();
  for (let i = 0; i < bigCols; i++) for (let j = 0; j < bigRows; j++) cells.add(i + ',' + j);
  const edgeIdx = (len: number) => { const a = []; for (let k = 1; k < len - 1; k++) a.push(k); return a; };
  edgeIdx(bigCols).forEach(i => { const r = rand(); if (r < 0.30) cells.delete(i + ',0'); else if (r < 0.55) cells.add(i + ',-1'); });
  edgeIdx(bigCols).forEach(i => { const r = rand(); if (r < 0.30) cells.delete(i + ',' + (bigRows - 1)); else if (r < 0.55) cells.add(i + ',' + bigRows); });
  edgeIdx(bigRows).forEach(j => { const r = rand(); if (r < 0.30) cells.delete('0,' + j); else if (r < 0.55) cells.add('-1,' + j); });
  edgeIdx(bigRows).forEach(j => { const r = rand(); if (r < 0.30) cells.delete((bigCols - 1) + ',' + j); else if (r < 0.55) cells.add(bigCols + ',' + j); });
  return cells;
}
// traccia il contorno dell'insieme di celle come un unico anello chiuso, in
// coordinate LOCALI ai vertici delle celle (non ancora proiettate)
function traceCellBoundary(cells: Set<string>): number[][] | null {
  const has = (i: number, j: number) => cells.has(i + ',' + j);
  const edges: number[][][] = [];
  cells.forEach(key => {
    const [i, j] = key.split(',').map(Number);
    if (!has(i - 1, j)) edges.push([[i, j], [i, j + 1]]);
    if (!has(i + 1, j)) edges.push([[i + 1, j], [i + 1, j + 1]]);
    if (!has(i, j - 1)) edges.push([[i, j], [i + 1, j]]);
    if (!has(i, j + 1)) edges.push([[i, j + 1], [i + 1, j + 1]]);
  });
  if (!edges.length) return null;
  const pk = (p: number[]) => p[0] + ',' + p[1];
  const adj = new Map<string, number[][]>();
  edges.forEach(([a, b]) => {
    if (!adj.has(pk(a))) adj.set(pk(a), []);
    if (!adj.has(pk(b))) adj.set(pk(b), []);
    adj.get(pk(a))!.push(b);
    adj.get(pk(b))!.push(a);
  });
  const ek = (a: number[], b: number[]) => { const ka = pk(a), kb = pk(b); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
  const used = new Set<string>();
  const start = edges[0][0];
  const path = [start];
  let cur = start;
  let guard = 0;
  while (guard++ < 2000) {
    const neighbors = adj.get(pk(cur)) || [];
    let next: number[] | null = null;
    for (const n of neighbors) { if (!used.has(ek(cur, n))) { next = n; used.add(ek(cur, n)); break; } }
    if (next === null) break;
    path.push(next);
    cur = next;
    if (cur[0] === start[0] && cur[1] === start[1]) break;
  }
  // deve tornare al punto di partenza e passare da ogni bordo esattamente una volta,
  // altrimenti la forma si è spezzata in più pezzi — fallback al rettangolo pieno.
  if (path.length < 4 || used.size !== edges.length) return null;
  return path;
}
function irregularPlotPoints(hs: any) {
  const rand = seededRand(hs.number * 977 + 13);
  const cells = buildCellSet(hs, rand);
  const path = traceCellBoundary(cells);
  if (!path) return plotCorners(hs); // fallback sicuro
  return path.map(([a, b]) => proj(hs.gx0 + a * GRID_STEP, hs.gy0 + b * GRID_STEP));
}

const SVGNS = "http://www.w3.org/2000/svg";
const XHTMLNS = "http://www.w3.org/1999/xhtml";
function el(tag: string, attrs: Record<string, any>) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function buildBoard() {
  const svg = svgEl.value;
  if (!svg || !props.houses.length) return;
  svg.innerHTML = "";

  const { gxMin: gxMin0, gxMax: gxMax0, gyMin: gyMin0, gyMax: gyMax0 } = props.gridBounds;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  [[gxMin0, gyMin0], [gxMax0, gyMin0], [gxMax0, gyMax0], [gxMin0, gyMax0]].forEach(([gx, gy]) => {
    const p = proj(gx, gy);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  });
  const pad = 30;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  // CROP_FACTOR: la vista è volutamente "zoomata" sul centro della board, così i lotti
  // più esterni escono un po' dal bordo dello schermo (tagliati dalla cornice, dato che
  // l'<svg> non ha overflow:visible) invece di restare tutti interamente visibili con
  // aria morta intorno — dà la sensazione che la mappa continui oltre quello che si vede.
  const CROP_FACTOR = 0.78;
  const contentW = ((maxX - minX) + pad * 2) * CROP_FACTOR;
  const contentH = ((maxY - minY) + pad * 2) * CROP_FACTOR;

  // Il viewBox deve combaciare ESATTAMENTE con l'aspect ratio del contenitore reale
  // (non con quello del contenuto): altrimenti preserveAspectRatio introduce bande
  // vuote (letterboxing) sui lati corti — è la causa diretta delle "zone senza griglia"
  // segnalate. Si allarga (mai si restringe) solo la dimensione necessaria, centrando
  // sul centro del contenuto originale.
  const wrapRect = svg.getBoundingClientRect();
  const ar = wrapRect.width && wrapRect.height ? wrapRect.width / wrapRect.height : contentW / contentH;
  let vbW = contentW, vbH = contentH;
  if (contentW / contentH > ar) { vbH = contentW / ar; } else { vbW = contentH * ar; }
  const vbX = cx - vbW / 2, vbY = cy - vbH / 2;
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  // Le linee della griglia devono coprire l'INTERO rettangolo del viewBox, angoli
  // compresi — non solo il rombo derivato dal bounding box del contenuto. Si
  // proiettano-all'indietro i 4 angoli del viewBox con invProj() e si arrotonda
  // per eccesso/difetto con un margine di ±1 cella (la trasformazione lineare di un
  // rettangolo resta un parallelogramma convesso, quindi i 4 angoli bastano).
  let gxMin = Infinity, gxMax = -Infinity, gyMin = Infinity, gyMax = -Infinity;
  [[vbX, vbY], [vbX + vbW, vbY], [vbX + vbW, vbY + vbH], [vbX, vbY + vbH]].forEach(([x, y]) => {
    const g = invProj(x, y);
    gxMin = Math.min(gxMin, g.gx); gxMax = Math.max(gxMax, g.gx);
    gyMin = Math.min(gyMin, g.gy); gyMax = Math.max(gyMax, g.gy);
  });
  gxMin = Math.floor(gxMin) - 1; gxMax = Math.ceil(gxMax) + 1;
  gyMin = Math.floor(gyMin) - 1; gyMax = Math.ceil(gyMax) + 1;

  const defs = document.createElementNS(SVGNS, "defs");
  defs.innerHTML = `
    <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="4" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.75 0" result="noiseA"/>
      <feComposite in="noiseA" in2="SourceAlpha" operator="in"/>
    </filter>`;
  svg.appendChild(defs);

  svg.appendChild(el('rect', { x: vbX, y: vbY, width: vbW, height: vbH, fill: '#f1efe8' }));

  // GRID_STEP dichiarata più sopra (condivisa con irregularPlotPoints): una linea ogni
  // GRID_STEP celle invece che ogni cella, quindi i rombi del pattern sono GRID_STEP
  // volte più grandi.
  const gridG = el('g', { opacity: 0.75 });
  const gxStart = Math.floor(gxMin / GRID_STEP) * GRID_STEP, gxEnd = Math.ceil(gxMax / GRID_STEP) * GRID_STEP;
  const gyStart = Math.floor(gyMin / GRID_STEP) * GRID_STEP, gyEnd = Math.ceil(gyMax / GRID_STEP) * GRID_STEP;
  for (let gx = gxStart; gx <= gxEnd; gx += GRID_STEP) {
    const a = proj(gx, gyStart), b = proj(gx, gyEnd);
    gridG.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#d8d2bf', 'stroke-width': 0.8 }));
  }
  for (let gy = gyStart; gy <= gyEnd; gy += GRID_STEP) {
    const a = proj(gxStart, gy), b = proj(gxEnd, gy);
    gridG.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#d8d2bf', 'stroke-width': 0.8 }));
  }
  svg.appendChild(gridG);

  props.houses.forEach((hs) => {
    const pts = irregularPlotPoints(hs).map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    svg.appendChild(el('polygon', { points: pts, fill: '#2c2620' }));
    const noise = el('polygon', { points: pts, fill: '#000', filter: 'url(#grain)', opacity: 0.9 });
    noise.setAttribute('style', 'mix-blend-mode:multiply;pointer-events:none;');
    svg.appendChild(noise);
    svg.appendChild(el('polygon', { points: pts, fill: 'none', stroke: 'rgba(255,255,255,0.10)', 'stroke-width': 1 }));
  });

  // Tile fotografico "appoggiato" sul lotto — non un ritaglio che tenta di seguire
  // i bordi del lotto isometrico. Le foto sono render 3D a prospettiva piena, con
  // basamento visibile in modo molto diverso da casa a casa (pulito in loft,
  // ASIMMETRICO in cottage — vera prospettiva, non un'inquadratura ruotata — quasi
  // invisibile in torre, coperto dal giardino in serra): nessuna rotazione singola
  // poteva far combaciare il bordo della foto col rombo della griglia. Il lotto
  // scuro sotto resta un rombo geometricamente perfetto e fa da cornice alla tile.
  const IMG_ASPECT = 654 / 1200;
  props.houses.forEach((hs) => {
    const corners = plotCorners(hs);
    const bx0 = Math.min(...corners.map(p => p.x)), bx1 = Math.max(...corners.map(p => p.x));
    const by0 = Math.min(...corners.map(p => p.y)), by1 = Math.max(...corners.map(p => p.y));
    const bw = bx1 - bx0, bh = by1 - by0;
    const w = bw * 0.9, h = w * IMG_ASPECT * 1.1;
    // centrata sia orizzontalmente che verticalmente nel lotto (niente più offset verso il basso)
    const x = bx0 + (bw - w) / 2, y = by0 + (bh - h) / 2;

    const fo = el('foreignObject', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1) });
    // button, non link: l'articolo si apre in una finestra interna alla pagina,
    // non naviga mai a /articolo/[slug] (quella pagina resta per link diretti).
    const a = document.createElementNS(XHTMLNS, 'button');
    a.setAttribute('type', 'button');
    a.setAttribute('class', 'house-btn');
    a.setAttribute('aria-label', `Casa 0${hs.number} — ${hs.title} — apri articolo`);
    const frame = document.createElementNS(XHTMLNS, 'div');
    frame.setAttribute('class', 'house-frame');
    const card = document.createElementNS(XHTMLNS, 'div');
    card.setAttribute('class', 'card');
    const img = document.createElementNS(XHTMLNS, 'img');
    img.setAttribute('src', hs.image?.url || '');
    img.setAttribute('alt', `${hs.title}, casa 0${hs.number}`);
    img.setAttribute('loading', 'lazy');
    card.appendChild(img);
    frame.appendChild(card);
    a.appendChild(frame);
    fo.appendChild(a);

    const wrap = el('g', {});
    wrap.appendChild(fo);

    const badgeCx = bx0 + bw * 0.08, badgeCy = by0 + bh * 0.10;
    wrap.appendChild(el('circle', { cx: badgeCx, cy: badgeCy, r: 13, fill: '#2c2620', stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 1 }));
    const bt = el('text', { x: badgeCx, y: badgeCy + 4, 'text-anchor': 'middle', class: 'house-badge' });
    bt.textContent = '0' + hs.number;
    wrap.appendChild(bt);

    const cap = el('text', { x: bx0 + bw / 2, y: by1 + 16, 'text-anchor': 'middle', class: 'house-cap' });
    cap.textContent = `Casa 0${hs.number} — ${hs.title}`;
    wrap.appendChild(cap);

    svg.appendChild(wrap);

    a.addEventListener('mouseenter', () => { wrap.classList.add('house-hover'); });
    a.addEventListener('mouseleave', () => { wrap.classList.remove('house-hover'); });
    a.addEventListener('focus', () => { wrap.classList.add('house-hover'); });
    a.addEventListener('blur', () => { wrap.classList.remove('house-hover'); });
    a.addEventListener('click', () => { emit('select', hs); });
  });
}

onMounted(() => {
  buildBoard();
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildBoard, 150);
  });
});
watch(() => props.houses, buildBoard, { deep: true });
</script>

<style>
/* stile globale (non scoped): il board viene costruito imperativamente nel DOM via JS,
   Vue's scoped CSS non raggiungerebbe i nodi creati con createElementNS/createElement */
/* la board riempie tutto lo spazio disponibile sotto la topbar (vedi app.vue) */
.board-root{ flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.board-wrap{ flex:1 1 auto; min-height:0; display:flex; }
#board-svg{ display:block; width:100%; height:100%; }

.house-btn{ all:unset; display:block; width:100%; height:100%; cursor:pointer; }
.house-frame{ width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.house-btn:hover .house-frame, .house-btn:focus-visible .house-frame{ transform: translateY(-4%) scale(1.05); }
/* Niente più cornice bianca: la foto sta a filo, senza sfondo/bordo/ombra/angoli propri —
   solo il rombo scuro del lotto sotto la separa dalla griglia. */
.house-frame .card{ width:100%; display:block; }
.house-frame img{ width:100%; display:block; }

.house-badge{ font-family:Georgia,serif; font-size:13px; fill:#efe9d8; }
.house-cap{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; fill:#6b6558; opacity:0; transition:opacity .25s ease; pointer-events:none; }
.house-hover .house-cap{ opacity:1; }
.house-hover .house-frame{ transform: translateY(-4%) scale(1.05); }

.list{ display:none; }
@media (max-width: 760px){
  .board-wrap{ display:none; }
  .list{ display:flex; flex-direction:column; align-items:center; gap:28px; padding:8px 20px 32px; flex:1 1 auto; min-height:0; overflow:auto; }
  .list .house{ width:92%; max-width:420px; text-decoration:none; color:inherit; display:block; background:none; border:none; padding:0; cursor:pointer; font:inherit; }
  .list .house img{ width:100%; border-radius:6px; filter: drop-shadow(0 8px 10px rgba(15,13,10,.3)); }
  .list .caption{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-align:center; padding-top:6px; }
}
</style>
