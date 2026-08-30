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
        :aria-label="`Isola 0${hs.number} — ${hs.title} — apri articolo`"
        @click="$emit('select', hs)"
      >
        <img :src="hs.image?.url" :alt="`${hs.title}, isola 0${hs.number}`" loading="lazy" />
        <div class="caption">Isola 0{{ hs.number }} — {{ hs.title }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Porting diretto del motore SVG isometrico validato nel prototipo statico
// (disco-mockup/index.html): isole PNG a sfondo trasparente sopra un mare a
// mosaico "piscina" con livelli di profondità a gradini, più uno strato di
// omini piatti (WalkerLayer). Griglia e isole condividono la STESSA funzione
// proj(): è quello che garantisce l'allineamento.
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
// "lontano" (gx) è ~12.9°. Vedi app/data/islandLayout.ts per i dettagli.
const GX_X = 26, GX_Y = 6.0;   // asse gx: ~12.9° (tan⁻¹(6/26))
const GY_X = 26, GY_Y = 12.23; // asse gy: ~25.2° (tan⁻¹(12.23/26))

function proj(gx: number, gy: number) { return { x: gx * GX_X - gy * GY_X, y: gx * GX_Y + gy * GY_Y }; }
// inversa di proj(): serve per capire, dato un rettangolo in pixel (il contenitore
// reale), quale intervallo di gx/gy serve perché il mare copra l'intero viewBox.
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

const SVGNS = "http://www.w3.org/2000/svg";
const XHTMLNS = "http://www.w3.org/1999/xhtml";
function el(tag: string, attrs: Record<string, any>) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// aspect ratio (h/w) del canvas PNG delle isole (2400x1792, sfondo trasparente)
const ISLAND_HW = 1792 / 2400;

// ================================================================================================
// ---- OMINI: pittogrammi piatti, a gruppi, reattivi al mouse (mai afferrabili — solo
// repulsione passiva). "Terra" = un'ellisse inscritta nell'ingombro di ogni isola.
// ================================================================================================
function createWalkerLayer() {
  const GROUPS = [
    { color: '#e0623f', n: 5 },
    { color: '#2f8f7a', n: 5 },
    { color: '#d9a441', n: 5 },
  ];
  const REPEL_RADIUS = 16;
  const REPEL_STRENGTH = 220;
  const MAX_SPEED = 5.2;

  function isOnLand(gx: number, gy: number) {
    return props.houses.some(isl => {
      const cx = isl.gx0 + isl.cols / 2, cy = isl.gy0 + isl.rows / 2;
      const rx = isl.cols / 2 * 0.82, ry = isl.rows / 2 * 0.82;
      const dx = (gx - cx) / rx, dy = (gy - cy) / ry;
      return dx * dx + dy * dy <= 1;
    });
  }

  let walkers: any[] | null = null;
  function initWalkers() {
    walkers = [];
    GROUPS.forEach((g, gi) => {
      const home = props.houses[gi % props.houses.length];
      const cx = home.gx0 + home.cols / 2, cy = home.gy0 + home.rows / 2;
      for (let i = 0; i < g.n; i++) {
        walkers!.push({
          group: gi, color: g.color,
          gx: cx + (Math.random() - 0.5) * home.cols * 0.6,
          gy: cy + (Math.random() - 0.5) * home.rows * 0.6,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
          phase: Math.random() * Math.PI * 2,
          wanderT: Math.random() * 10,
        });
      }
    });
  }
  initWalkers();

  function buildPictogram(color: string) {
    const g = el('g', { class: 'walker' });
    const shadow = el('ellipse', { cx: 0, cy: 5.5, rx: 4.2, ry: 1.6, fill: 'rgba(10,30,35,0.25)' });
    const legL = el('line', { x1: 0, y1: 0, x2: -3, y2: 5, stroke: color, 'stroke-width': 1.6, 'stroke-linecap': 'round' });
    const legR = el('line', { x1: 0, y1: 0, x2: 3, y2: 5, stroke: color, 'stroke-width': 1.6, 'stroke-linecap': 'round' });
    const armL = el('line', { x1: 0, y1: -4, x2: -3, y2: 0, stroke: color, 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    const armR = el('line', { x1: 0, y1: -4, x2: 3, y2: 0, stroke: color, 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    const torso = el('line', { x1: 0, y1: -4, x2: 0, y2: 0.5, stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round' });
    const head = el('circle', { cx: 0, cy: -6, r: 2.1, fill: color });
    const ripple = el('circle', { cx: 0, cy: 0, r: 2, fill: 'none', stroke: '#eaf6fb', 'stroke-width': 0.8, opacity: 0 });
    [shadow, legL, legR, armL, armR, torso, head, ripple].forEach(n => g.appendChild(n));
    return { g, legL, legR, armL, armR, torso, head, shadow, ripple };
  }

  let mountedSvg: SVGSVGElement | null = null, pointerGrid: { gx: number; gy: number } | null = null;
  function screenToGrid(clientX: number, clientY: number) {
    const pt = mountedSvg!.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = mountedSvg!.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return invProj(p.x, p.y);
  }

  function step(dt: number) {
    const cx0 = props.houses.reduce((s, h) => s + h.gx0 + h.cols / 2, 0) / props.houses.length;
    const cy0 = props.houses.reduce((s, h) => s + h.gy0 + h.rows / 2, 0) / props.houses.length;
    const boundR = 170;

    walkers!.forEach(w => {
      w.wanderT -= dt;
      if (w.wanderT <= 0) {
        w.vx += (Math.random() - 0.5) * 1.8;
        w.vy += (Math.random() - 0.5) * 1.8;
        w.wanderT = 1 + Math.random() * 1.5;
      }
      const dxc = cx0 - w.gx, dyc = cy0 - w.gy, dc = Math.hypot(dxc, dyc);
      if (dc > boundR) { w.vx += dxc / dc * 1.6 * dt * 10; w.vy += dyc / dc * 1.6 * dt * 10; }
      if (pointerGrid) {
        const dx = w.gx - pointerGrid.gx, dy = w.gy - pointerGrid.gy, d = Math.hypot(dx, dy);
        if (d < REPEL_RADIUS && d > 0.001) {
          const f = (1 - d / REPEL_RADIUS) * REPEL_STRENGTH * dt;
          w.vx += dx / d * f; w.vy += dy / d * f;
        }
      }
      walkers!.forEach(o => {
        if (o === w || o.group !== w.group) return;
        const dx = w.gx - o.gx, dy = w.gy - o.gy, d = Math.hypot(dx, dy);
        if (d > 0.001 && d < 7) { w.vx += dx / d * 6 * dt; w.vy += dy / d * 6 * dt; }
      });

      w.vx *= 0.94; w.vy *= 0.94;
      const sp = Math.hypot(w.vx, w.vy);
      if (sp > MAX_SPEED) { w.vx = w.vx / sp * MAX_SPEED; w.vy = w.vy / sp * MAX_SPEED; }

      w.gx += w.vx * dt; w.gy += w.vy * dt;
      w.phase += dt * (2.5 + sp * 0.8);
      w.onLand = isOnLand(w.gx, w.gy);
    });
  }

  function render() {
    walkers!.forEach(w => {
      if (!w.dom) return;
      const p = proj(w.gx, w.gy);
      const pv = proj(w.gx + w.vx * 0.2, w.gy + w.vy * 0.2);
      const heading = Math.atan2(pv.y - p.y, pv.x - p.x) * 180 / Math.PI;
      const swing = Math.sin(w.phase) * (w.onLand ? 22 : 30);

      const { legL, legR, armL, armR, shadow, ripple, g } = w.dom;
      if (w.onLand) {
        g.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${heading.toFixed(1)}) scale(26)`);
        legL.setAttribute('transform', `rotate(${swing})`);
        legR.setAttribute('transform', `rotate(${-swing})`);
        armL.setAttribute('transform', `rotate(${-swing * 0.8})`);
        armR.setAttribute('transform', `rotate(${swing * 0.8})`);
        shadow.setAttribute('opacity', '1');
        ripple.setAttribute('opacity', '0');
      } else {
        const bob = Math.sin(w.phase * 1.3) * 1.2;
        g.setAttribute('transform', `translate(${p.x.toFixed(1)},${(p.y + bob).toFixed(1)}) rotate(${(heading + 90).toFixed(1)}) scale(26)`);
        legL.setAttribute('transform', `rotate(${swing * 0.6})`);
        legR.setAttribute('transform', `rotate(${-swing * 0.6})`);
        armL.setAttribute('transform', `rotate(${-10 - swing * 0.3})`);
        armR.setAttribute('transform', `rotate(${10 + swing * 0.3})`);
        shadow.setAttribute('opacity', '0');
        const rr = 2 + ((w.phase * 3) % 6);
        ripple.setAttribute('r', rr.toFixed(1));
        ripple.setAttribute('opacity', Math.max(0, 0.5 - rr / 12).toFixed(2));
      }
    });
  }

  let lastT: number | null = null, started = false;
  function tick(tMs: number) {
    if (lastT === null) lastT = tMs;
    const dt = Math.min((tMs - lastT) / 1000, 0.1);
    lastT = tMs;
    step(dt);
    render();
    requestAnimationFrame(tick);
  }

  return {
    // richiamato a ogni buildBoard(): il DOM svg viene svuotato e ricostruito da zero, ma lo
    // STATO della simulazione (posizioni/velocità in walkers) resta invariato.
    mount(svg: SVGSVGElement) {
      mountedSvg = svg;
      const layer = el('g', { class: 'walker-layer' });
      walkers!.forEach(w => {
        w.dom = buildPictogram(w.color);
        layer.appendChild(w.dom.g);
      });
      svg.appendChild(layer);
      if (!started) {
        started = true;
        svg.addEventListener('pointermove', (e: PointerEvent) => { pointerGrid = screenToGrid(e.clientX, e.clientY); });
        svg.addEventListener('pointerleave', () => { pointerGrid = null; });
        requestAnimationFrame(tick);
      }
    }
  };
}
const WalkerLayer = createWalkerLayer();

function buildBoard() {
  const svg = svgEl.value;
  if (!svg || !props.houses.length) return;
  svg.innerHTML = "";

  // ---- bounding box "di contenuto" (isole + margine) — porting diretto dei valori
  // trovati via ricerca Python per il layout a 5 isole (vedi app/data/islandLayout.ts).
  const { gxMin: gxMin0, gxMax: gxMax0, gyMin: gyMin0, gyMax: gyMax0 } = props.gridBounds;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  [[gxMin0, gyMin0], [gxMax0, gyMin0], [gxMax0, gyMax0], [gxMin0, gyMax0]].forEach(([gx, gy]) => {
    const p = proj(gx, gy);
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  });
  const pad = 30;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  // vista "zoomata" sul centro: i bordi più esterni escono leggermente dalla cornice —
  // 0.752 è il valore trovato via ricerca Python che lascia ALMENO il 55% di ogni isola visibile.
  const CROP_FACTOR = 0.752;
  const contentW = ((maxX - minX) + pad * 2) * CROP_FACTOR;
  const contentH = ((maxY - minY) + pad * 2) * CROP_FACTOR;

  // il viewBox deve avere ESATTAMENTE le proporzioni del contenitore reale, altrimenti
  // preserveAspectRatio lascia bande vuote senza mare ai lati.
  const wrapRect = svg.getBoundingClientRect();
  const ar = wrapRect.width && wrapRect.height ? wrapRect.width / wrapRect.height : contentW / contentH;
  let vbW = contentW, vbH = contentH;
  if (contentW / contentH > ar) { vbH = contentW / ar; } else { vbW = contentH * ar; }
  const vbX = cx - vbW / 2, vbY = cy - vbH / 2;
  svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  // ---- MARE "piscina": mosaico di tessere allineato via patternTransform (proj() è
  // lineare, quindi si esprime come matrix() SVG — vedi disco-mockup/index.html per la
  // spiegazione completa), tre profondità (deep/mid/shallow) a gradini/spigoli intorno a
  // ogni isola, wobble "dipinto a mano" e grana per toglierlo dalla resa piatta/digitale.
  const MOSAIC_CELL = 96;
  const MOSAIC_SUB = 4;
  const projMatrix = `matrix(${GX_X},${GX_Y},${-GY_X},${GY_Y},0,0)`;
  function mosaicTilesSVG(sub: number, baseFill: string, accentFill: string, accentCells: number[][], groutColor: string, groutW: number) {
    const s = MOSAIC_CELL / sub;
    let out = '';
    for (let i = 0; i < sub; i++) for (let j = 0; j < sub; j++) {
      const isAccent = accentCells.some(([ai, aj]) => ai === i && aj === j);
      out += `<rect x="${(i * s).toFixed(2)}" y="${(j * s).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}"
        fill="${isAccent ? accentFill : baseFill}" stroke="${groutColor}" stroke-width="${groutW}"/>`;
    }
    return out;
  }
  const mosaicDeepSVG = `
    <pattern id="mosaicDeep" patternUnits="userSpaceOnUse" width="${MOSAIC_CELL}" height="${MOSAIC_CELL}" patternTransform="${projMatrix}">
      ${mosaicTilesSVG(MOSAIC_SUB, '#3d5a8f', '#32507f', [[0, 2], [3, 1]], '#e9f0fb', 1.1)}
    </pattern>`;
  const mosaicMidSVG = `
    <pattern id="mosaicMid" patternUnits="userSpaceOnUse" width="${MOSAIC_CELL}" height="${MOSAIC_CELL}" patternTransform="${projMatrix}">
      ${mosaicTilesSVG(MOSAIC_SUB, '#5c7ab8', '#4a6aa8', [[2, 1], [0, 3]], '#eef3fc', 1.1)}
    </pattern>`;
  const mosaicShallowSVG = `
    <pattern id="mosaicShallow" patternUnits="userSpaceOnUse" width="${MOSAIC_CELL}" height="${MOSAIC_CELL}" patternTransform="${projMatrix}">
      ${mosaicTilesSVG(MOSAIC_SUB, '#8aa3d6', '#7590c6', [[1, 0], [2, 3]], '#f3f7fd', 1.1)}
    </pattern>`;
  const handWobbleSVG = `
    <filter id="handWobble" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.010" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="55" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  const seaGrainSVG = `
    <filter id="seaGrain" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"/>
    </filter>`;
  const defs = document.createElementNS(SVGNS, "defs");
  defs.innerHTML = mosaicDeepSVG + mosaicMidSVG + mosaicShallowSVG + handWobbleSVG + seaGrainSVG;
  svg.appendChild(defs);

  // contorno "a gradini/spigoli" (non ellisse liscia) per gli scalini del mare intorno a
  // ogni isola — stessa tecnica generalizzata già usata per il vecchio lotto a scacchiera.
  const STEP_CELL = 24;
  function insideCellSet(insideTest: (x: number, y: number) => boolean, ox: number, oy: number, gxMin: number, gxMax: number, gyMin: number, gyMax: number, cell: number) {
    const cells = new Set<string>();
    const gx0 = ox - Math.ceil((ox - gxMin) / cell) * cell;
    const gy0 = oy - Math.ceil((oy - gyMin) / cell) * cell;
    for (let gx = gx0; gx < gxMax; gx += cell) {
      for (let gy = gy0; gy < gyMax; gy += cell) {
        if (insideTest(gx + cell / 2, gy + cell / 2)) cells.add(gx + ',' + gy);
      }
    }
    return cells;
  }
  function traceStepBoundary(cells: Set<string>, cell: number): number[][] | null {
    const has = (gx: number, gy: number) => cells.has(gx + ',' + gy);
    const edges: number[][][] = [];
    cells.forEach(key => {
      const [gx, gy] = key.split(',').map(Number);
      if (!has(gx - cell, gy)) edges.push([[gx, gy], [gx, gy + cell]]);
      if (!has(gx + cell, gy)) edges.push([[gx + cell, gy], [gx + cell, gy + cell]]);
      if (!has(gx, gy - cell)) edges.push([[gx, gy], [gx + cell, gy]]);
      if (!has(gx, gy + cell)) edges.push([[gx, gy + cell], [gx + cell, gy + cell]]);
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
    while (guard++ < 6000) {
      const neighbors = adj.get(pk(cur)) || [];
      let next: number[] | null = null;
      for (const n of neighbors) { if (!used.has(ek(cur, n))) { next = n; used.add(ek(cur, n)); break; } }
      if (next === null) break;
      path.push(next);
      cur = next;
      if (cur[0] === start[0] && cur[1] === start[1]) break;
    }
    if (path.length < 4 || used.size !== edges.length) return null;
    return path;
  }
  function steppedBlobPoints(cx: number, cy: number, rx: number, ry: number, cell: number) {
    const test = (x: number, y: number) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; };
    const cells = insideCellSet(test, cx, cy, cx - rx - cell, cx + rx + cell, cy - ry - cell, cy + ry + cell, cell);
    const path = traceStepBoundary(cells, cell);
    if (!path) return null;
    return path.map(([gx, gy]) => proj(gx, gy));
  }
  const seaG = el('g', { filter: 'url(#handWobble)' });
  seaG.appendChild(el('rect', { x: vbX.toFixed(1), y: vbY.toFixed(1), width: vbW.toFixed(1), height: vbH.toFixed(1), fill: 'url(#mosaicDeep)' }));
  props.houses.forEach(isl => {
    const cx = isl.gx0 + isl.cols / 2, cy = isl.gy0 + isl.rows / 2;
    [
      { rxF: 2.1, ryF: 2.1, pattern: 'mosaicMid' },
      { rxF: 1.45, ryF: 1.45, pattern: 'mosaicShallow' },
    ].forEach(step => {
      const rx = isl.cols / 2 * 0.82 * step.rxF, ry = isl.rows / 2 * 0.82 * step.ryF;
      const pts = steppedBlobPoints(cx, cy, rx, ry, STEP_CELL);
      if (!pts) return;
      const ptsStr = pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      seaG.appendChild(el('polygon', { points: ptsStr, fill: `url(#${step.pattern})` }));
      seaG.appendChild(el('polygon', { points: ptsStr, fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 2.2 }));
    });
  });
  seaG.setAttribute('opacity', '0.8');
  svg.appendChild(seaG);
  const grainRect = el('rect', {
    x: vbX.toFixed(1), y: vbY.toFixed(1), width: vbW.toFixed(1), height: vbH.toFixed(1),
    fill: '#000', filter: 'url(#seaGrain)', opacity: 0.30
  });
  grainRect.setAttribute('style', 'mix-blend-mode:multiply;pointer-events:none;');
  svg.appendChild(grainRect);

  // ---- isole: PNG con terreno/nature/edifici già inclusi, appoggiate direttamente sul mare.
  props.houses.forEach(hs => {
    const corners = plotCorners(hs);
    const bx0 = Math.min(...corners.map(p => p.x)), bx1 = Math.max(...corners.map(p => p.x));
    const by0 = Math.min(...corners.map(p => p.y)), by1 = Math.max(...corners.map(p => p.y));
    const bw = bx1 - bx0, bh = by1 - by0;

    const w = bw * 0.92;
    const h = w * ISLAND_HW;
    const x = bx0 + (bw - w) / 2;
    const y = by0 + (bh - h) / 2;

    const fo = el('foreignObject', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1) });
    const btn = document.createElementNS(XHTMLNS, 'button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('class', 'house-btn');
    btn.setAttribute('aria-label', `Isola 0${hs.number} — ${hs.title} — apri articolo`);
    const frame = document.createElementNS(XHTMLNS, 'div');
    frame.setAttribute('class', 'house-frame');
    const card = document.createElementNS(XHTMLNS, 'div');
    card.setAttribute('class', 'card');
    const img = document.createElementNS(XHTMLNS, 'img');
    img.setAttribute('src', hs.image?.url || '');
    img.setAttribute('alt', `${hs.title}, isola 0${hs.number}`);
    // niente loading="lazy": dentro un <foreignObject> di un SVG con overflow:hidden
    // l'euristica di lazy-load può non caricare mai l'immagine (bug già documentato).
    card.appendChild(img);
    frame.appendChild(card);
    btn.appendChild(frame);
    fo.appendChild(btn);

    const wrap = el('g', {});
    wrap.appendChild(fo);

    const badgeCx = bx0 + bw * 0.08, badgeCy = by0 + bh * 0.10;
    wrap.appendChild(el('circle', { cx: badgeCx, cy: badgeCy, r: 13, fill: '#2c2620', stroke: 'rgba(255,255,255,0.25)', 'stroke-width': 1 }));
    const bt = el('text', { x: badgeCx, y: badgeCy + 4, 'text-anchor': 'middle', class: 'house-badge' });
    bt.textContent = '0' + hs.number;
    wrap.appendChild(bt);

    const cap = el('text', { x: bx0 + bw / 2, y: by1 + 16, 'text-anchor': 'middle', class: 'house-cap' });
    cap.textContent = `Isola 0${hs.number} — ${hs.title}`;
    wrap.appendChild(cap);

    svg.appendChild(wrap);

    btn.addEventListener('mouseenter', () => { wrap.classList.add('house-hover'); });
    btn.addEventListener('mouseleave', () => { wrap.classList.remove('house-hover'); });
    btn.addEventListener('focus', () => { wrap.classList.add('house-hover'); });
    btn.addEventListener('blur', () => { wrap.classList.remove('house-hover'); });
    btn.addEventListener('click', () => { emit('select', hs); });
  });

  // ---- omini piatti: il DOM va ricreato a ogni rebuild, ma la simulazione persiste.
  WalkerLayer.mount(svg);
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
.board-root{ flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.board-wrap{ flex:1 1 auto; min-height:0; display:flex; }
#board-svg{ display:block; width:100%; height:100%; }

.house-btn{ all:unset; display:block; width:100%; height:100%; cursor:pointer; }
.house-frame{ width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.house-btn:hover .house-frame, .house-btn:focus-visible .house-frame{ transform: translateY(-4%) scale(1.05); }
.house-frame .card{ width:100%; display:block; }
.house-frame img{
  width:100%; display:block;
  /* isole = PNG a sfondo trasparente: ombra portata che segue la sagoma, le fa leggere
     come oggetti che galleggiano sul mare (non un box-shadow rettangolare) */
  filter: drop-shadow(0 14px 18px rgba(5,20,25,0.45));
}

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
