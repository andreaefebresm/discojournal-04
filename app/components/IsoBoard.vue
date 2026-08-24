<template>
  <div>
    <div class="board-wrap">
      <svg ref="svgEl" id="board-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>
    <div class="list">
      <NuxtLink
        v-for="hs in houses"
        :key="hs.slug"
        :to="`/articolo/${hs.slug}`"
        class="house"
        @click="$emit('select', hs)"
      >
        <img :src="hs.image?.url" :alt="`${hs.title}, casa 0${hs.number}`" loading="lazy" />
        <div class="caption">Casa 0{{ hs.number }} — {{ hs.title }}</div>
      </NuxtLink>
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

defineEmits<{ select: [house: any] }>();

const svgEl = ref<SVGSVGElement | null>(null);
const readout = useState<string>('board-readout', () => 'Ready.');

// Griglia ASIMMETRICA — misurata per davvero sui bordi del basamento di 3 render
// (edge-detection su colonne di pixel): l'asse "vicino" (gy) è ~25.2°, l'asse
// "lontano" (gx) è molto più basso, ~12.9° — non simmetrica ±26.565°/±25.9° come
// nei tentativi precedenti. Vedi app/data/houseLayout.ts per i dettagli.
const GX_X = 26, GX_Y = 6.0;   // asse gx: ~12.9° (tan⁻¹(6/26))
const GY_X = 26, GY_Y = 12.23; // asse gy: ~25.2° (tan⁻¹(12.23/26))
function proj(gx: number, gy: number) { return { x: gx * GX_X - gy * GY_X, y: gx * GX_Y + gy * GY_Y }; }

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
  const cells = new Set<string>();
  for (let i = 0; i < hs.cols; i++) for (let j = 0; j < hs.rows; j++) cells.add(i + ',' + j);
  const edgeIdx = (len: number) => { const a = []; for (let k = 1; k < len - 1; k++) a.push(k); return a; };
  edgeIdx(hs.cols).forEach(i => { const r = rand(); if (r < 0.30) cells.delete(i + ',0'); else if (r < 0.55) cells.add(i + ',-1'); });
  edgeIdx(hs.cols).forEach(i => { const r = rand(); if (r < 0.30) cells.delete(i + ',' + (hs.rows - 1)); else if (r < 0.55) cells.add(i + ',' + hs.rows); });
  edgeIdx(hs.rows).forEach(j => { const r = rand(); if (r < 0.30) cells.delete('0,' + j); else if (r < 0.55) cells.add('-1,' + j); });
  edgeIdx(hs.rows).forEach(j => { const r = rand(); if (r < 0.30) cells.delete((hs.cols - 1) + ',' + j); else if (r < 0.55) cells.add(hs.cols + ',' + j); });
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
  return path.map(([a, b]) => proj(hs.gx0 + a, hs.gy0 + b));
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

  const { gxMin, gxMax, gyMin, gyMax } = props.gridBounds;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  [[gxMin, gyMin], [gxMax, gyMin], [gxMax, gyMax], [gxMin, gyMax]].forEach(([gx, gy]) => {
    const p = proj(gx, gy);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  });
  const pad = 30;
  const vbX = minX - pad, vbY = minY - pad, vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const defs = document.createElementNS(SVGNS, "defs");
  defs.innerHTML = `
    <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="4" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.75 0" result="noiseA"/>
      <feComposite in="noiseA" in2="SourceAlpha" operator="in"/>
    </filter>`;
  svg.appendChild(defs);

  svg.appendChild(el('rect', { x: vbX, y: vbY, width: vbW, height: vbH, fill: '#f1efe8' }));

  const gridG = el('g', { opacity: 0.75 });
  for (let gx = gxMin; gx <= gxMax; gx++) {
    const a = proj(gx, gyMin), b = proj(gx, gyMax);
    gridG.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#d8d2bf', 'stroke-width': 0.8 }));
  }
  for (let gy = gyMin; gy <= gyMax; gy++) {
    const a = proj(gxMin, gy), b = proj(gxMax, gy);
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
    const w = bw * 0.52, h = w * IMG_ASPECT * 1.1; // *1.1 per il padding del .card
    const x = bx0 + (bw - w) / 2, y = by0 + (bh - h) / 2 + bh * 0.06;

    const fo = el('foreignObject', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1) });
    const a = document.createElementNS(XHTMLNS, 'a');
    a.setAttribute('href', `/articolo/${hs.slug}`);
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

    a.addEventListener('mouseenter', () => { wrap.classList.add('house-hover'); readout.value = `Casa 0${hs.number} — ${hs.title} — click per aprire`; });
    a.addEventListener('mouseleave', () => { wrap.classList.remove('house-hover'); readout.value = 'Ready.'; });
    a.addEventListener('focus', () => { wrap.classList.add('house-hover'); readout.value = `Casa 0${hs.number} — ${hs.title} — click per aprire`; });
    a.addEventListener('blur', () => { wrap.classList.remove('house-hover'); readout.value = 'Ready.'; });
  });
}

onMounted(buildBoard);
watch(() => props.houses, buildBoard, { deep: true });
</script>

<style>
/* stile globale (non scoped): il board viene costruito imperativamente nel DOM via JS,
   Vue's scoped CSS non raggiungerebbe i nodi creati con createElementNS/createElement */
.board-wrap{ max-width: 1200px; margin: 8px auto 32px; padding: 0 16px; }
#board-svg{ display:block; width:100%; height:auto; border-radius:4px; }

.house-btn{ all:unset; display:block; width:100%; height:100%; cursor:pointer; }
.house-frame{ width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.house-btn:hover .house-frame, .house-btn:focus-visible .house-frame{ transform: translateY(-4%) scale(1.05); }
.house-frame .card{ width:100%; display:block; background:#faf8f2; border:1px solid rgba(20,17,12,.10); border-radius:5px; padding:5%; box-shadow:0 10px 16px rgba(15,13,10,.35); }
.house-frame img{ width:100%; display:block; border-radius:2px; }

.house-badge{ font-family:Georgia,serif; font-size:13px; fill:#efe9d8; }
.house-cap{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; fill:#6b6558; opacity:0; transition:opacity .25s ease; pointer-events:none; }
.house-hover .house-cap{ opacity:1; }
.house-hover .house-frame{ transform: translateY(-4%) scale(1.05); }

.list{ display:none; }
@media (max-width: 760px){
  .board-wrap{ display:none; }
  .list{ display:flex; flex-direction:column; align-items:center; gap:28px; padding:8px 20px 32px; }
  .list .house{ width:92%; max-width:420px; text-decoration:none; color:inherit; display:block; }
  .list .house img{ width:100%; border-radius:6px; filter: drop-shadow(0 8px 10px rgba(15,13,10,.3)); }
  .list .caption{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-align:center; padding-top:6px; }
}
</style>
