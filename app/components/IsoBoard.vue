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
        <div class="caption">{{ hs.title }}</div>
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
  // Round 2: "tantissimi di più", bianchi come le linee/grout del mosaico, più piccoli,
  // sparsi ovunque nel mare (non solo vicino alle isole) e a GRUPPI PIÙ FITTI (prima
  // separazione soltanto, ora anche un richiamo verso il centro del proprio gruppo — vedi
  // COHESION_STRENGTH). Restano sempre "a nuoto": testa più opaca (resta "a pelo d'acqua"),
  // corpo più trasparente con un'opacità fissa per omino (si "perdono" nel blu, alcuni più
  // sfumati di altri, come nuotassero a profondità diverse). Mouse-repulsione più decisa.
  // Round 3: da omini bianchi "a nuoto" a piccole figure colorate viste dall'alto — testa
  // nera + vestiti colorati. Round 4: erano diventati troppo statici — "un po' di
  // movimento, noise", più grandi (non troppo) e più sparsi, ancora a gruppi ma con un
  // vagare più naturale. La repulsione al mouse (REPEL_*) c'era già e resta, ora si vede
  // meglio perché MAX_SPEED non è più quasi-zero.
  // Round 5: "più omini", anche singoli oltre a quelli a gruppi, gruppi meno serrati (più
  // separazione al loro interno) — vedi SINGLE_COUNT/SEP_RADIUS più sotto.
  const NUM_GROUPS = 11;       // eran 9
  const GROUP_SIZE = 9;        // eran 15: gruppi meno numerosi, meno "ammassati"
  const SINGLE_COUNT = 45;     // nuovo: omini sciolti, ognuno per conto proprio
  const WALKER_SCALE = 17;     // erano 13: un po' più grandi, non troppo

  const BODY_COLORS = ['#c1552c', '#e0a72e', '#3b6ea5', '#2f8f7a', '#8b5fa3', '#6b8e4f', '#d97b8f', '#4a5a6a', '#2c7fb8'];
  const SKIN_TONES = ['#e8b58c', '#c98a5b', '#8d5a3c', '#f2c9a0'];
  const PANTS_TONES = ['#2e2e2e', '#d8d2c2', '#5b6b73', '#efe9d8'];

  const REPEL_RADIUS = 26;     // erano 16: il mouse si sente da più lontano
  const REPEL_STRENGTH = 420;  // erano 220: molto più "respingente"
  const MAX_SPEED = 1.1;       // eran 0.35 (troppo fermi): vagare lento ma visibile
  const WANDER_JITTER = 0.22;  // eran 0.06: scarti di direzione un po' più naturali
  // "noise"/respiro autonomo: un'oscillazione morbida indipendente dal movimento vero e
  // proprio, così anche un omino praticamente fermo continua ad avere un filo di vita (si
  // "respira un po' da solo") invece di restare rigido — vedi render().
  const NOISE_AMPL = 0.6;      // eran 0.35: più "noise" visibile, come richiesto

  const SEP_RADIUS = 8;        // era 5 (poi 4): "meno vicini fra loro" — si respingono da più lontano
  const SEP_STRENGTH = 6;
  const COHESION_STRENGTH = 0.6; // era 0.85: richiamo verso il gruppo ancora più morbido

  const LAND_PUSH_STRENGTH = 260; // forza con cui vengono respinti se finiscono sopra un'isola
  const LAND_MARGIN = 16;

  // spinge un punto (omino o centro-gruppo) fuori dal perimetro ellittico di un'isola se
  // ci si trova dentro, in direzione radiale (via via più forte quanto più è "dentro").
  function landAvoidForce(w: any, dt: number, strength: number) {
    props.houses.forEach(isl => {
      const cx = isl.gx0 + isl.cols / 2, cy = isl.gy0 + isl.rows / 2;
      const rx = isl.cols / 2 * 0.82, ry = isl.rows / 2 * 0.82;
      const dx = (w.gx - cx) / rx, dy = (w.gy - cy) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1) {
        const rdx = w.gx - cx, rdy = w.gy - cy;
        const rd = Math.hypot(rdx, rdy) || 0.001;
        const f = (1 - d2) * strength * dt;
        w.vx += rdx / rd * f; w.vy += rdy / rd * f;
      }
    });
  }
  // vincolo rigido (non solo una forza): garantisce che il punto non entri mai nell'area
  // (isola + margine) — la sola forza poteva essere sopraffatta da altre forze e lasciare
  // per un istante l'omino visibilmente sovrapposto al bordo della PNG.
  function clampOffLand(w: any, margin: number) {
    props.houses.forEach(isl => {
      const cx = isl.gx0 + isl.cols / 2, cy = isl.gy0 + isl.rows / 2;
      const rx = isl.cols / 2 * 0.82 + margin, ry = isl.rows / 2 * 0.82 + margin;
      const ex = (w.gx - cx) / rx, ey = (w.gy - cy) / ry;
      const ed = Math.hypot(ex, ey);
      if (ed < 1) {
        const nx = ex / (ed || 0.0001), ny = ey / (ed || 0.0001);
        w.gx = cx + nx * rx * 1.001;
        w.gy = cy + ny * ry * 1.001;
        const vDot = w.vx * nx + w.vy * ny;
        if (vDot < 0) { w.vx -= vDot * nx; w.vy -= vDot * ny; }
      }
    });
  }

  // stato della simulazione: creato UNA VOLTA sola (persiste tra i resize/rebuild della board,
  // che invece ricreano tutto il DOM svg da zero via svg.innerHTML='')
  let groups: any[] | null = null; // centri dei gruppi: vagano lentamente per tutto il mare
  let walkers: any[] | null = null;
  let simT = 0; // tempo continuo, indipendente dalla velocità di ognuno — alimenta il "respiro"
  function initWalkers() {
    const cx0 = props.houses.reduce((s, h) => s + h.gx0 + h.cols / 2, 0) / props.houses.length;
    const cy0 = props.houses.reduce((s, h) => s + h.gy0 + h.rows / 2, 0) / props.houses.length;
    // i centri-gruppo partono sparsi su un'area molto ampia: è quello che dà l'effetto
    // "sparsi in giro nell'acqua" invece che ammassati vicino alle isole.
    groups = [];
    for (let i = 0; i < NUM_GROUPS; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 90 + Math.random() * 480; // "più sparsi": area di partenza ancora più ampia
      groups.push({ gx: cx0 + Math.cos(a) * r, gy: cy0 + Math.sin(a) * r, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, wanderT: Math.random() * 8, size: GROUP_SIZE });
    }
    // omini singoli: la stessa identica meccanica (wander/land-avoid/repulsione), solo come
    // "gruppo" di una sola persona — vagano per conto proprio invece che assieme.
    for (let i = 0; i < SINGLE_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 520;
      groups.push({ gx: cx0 + Math.cos(a) * r, gy: cy0 + Math.sin(a) * r, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, wanderT: Math.random() * 8, size: 1 });
    }
    walkers = [];
    groups.forEach((g, gi) => {
      for (let i = 0; i < g.size; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = g.size === 1 ? 0 : Math.random() * 36; // gruppi meno serrati: più raggio di nascita
        walkers!.push({
          group: gi,
          gx: g.gx + Math.cos(a) * r,
          gy: g.gy + Math.sin(a) * r,
          vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
          phase: Math.random() * Math.PI * 2,
          wanderT: Math.random() * 10,
          // opacità fissa per omino: alcuni leggermente più tenui, non più per dare
          // profondità "sott'acqua" (ora sono fermi in superficie) ma solo un filo di
          // varietà — vedi buildPictogram.
          depthOpacity: 0.7 + Math.random() * 0.3,
          // fase/frequenza del "respiro" autonomo, diverse per ognuno così non oscillano
          // tutti insieme in sincrono — vedi NOISE_AMPL e render().
          noiseAX: Math.random() * Math.PI * 2, noiseAY: Math.random() * Math.PI * 2,
          noiseFX: 0.5 + Math.random() * 0.4, noiseFY: 0.4 + Math.random() * 0.5,
          // aspetto: colore vestito + tono pelle/pantaloni + rotazione e posa fissati alla
          // nascita (non più orientati dalla direzione di marcia: ora sono fermi, orientati
          // a caso come nel riferimento fornito).
          color: BODY_COLORS[(Math.random() * BODY_COLORS.length) | 0],
          skin: SKIN_TONES[(Math.random() * SKIN_TONES.length) | 0],
          pants: PANTS_TONES[(Math.random() * PANTS_TONES.length) | 0],
          rot: Math.random() * 360,
          armA: -55 - Math.random() * 45,   // angolo braccio sinistro (gradi, variazione di posa)
          armB: 55 + Math.random() * 45,    // angolo braccio destro
          armLenA: 2.2 + Math.random() * 1.6,
          armLenB: 2.2 + Math.random() * 1.6,
          sitting: Math.random() < 0.22,    // ~1 su 5: posa raccolta/seduta invece che eretta
        });
      }
    });
  }
  initWalkers();

  // ---- pittogramma visto dall'alto: vestito colorato (busto), braccia color-pelle a due
  // angoli fissi (posa), testa nera sempre in cima (l'elemento più "alto"/vicino, come nel
  // riferimento fornito). Ferme di natura — nessuna animazione di gambe/braccia legata al
  // movimento: la sola vita residua è il filo di respiro applicato in render() alla
  // posizione dell'intero gruppo <g>.
  function buildPictogram(w: any) {
    const op = (0.75 + 0.25 * w.depthOpacity).toFixed(2);
    const g = el('g', { class: 'walker' });
    const shadow = el('ellipse', { cx: 0, cy: 1, rx: 4.6, ry: 5.4, fill: 'rgba(10,30,35,0.16)' });
    // ondine/schiuma: invisibili da fermi, compaiono e crescono con la velocità corrente
    // (w.curSpeed, impostata in step()) — vedi render(). Sotto le gambe nell'ordine di
    // disegno, così sembrano intorno ai piedi/nell'acqua smossa, non sopra il vestito.
    const wake = el('ellipse', { cx: 0, cy: 1.5, rx: 5, ry: 3.2, fill: 'none', stroke: 'rgba(244,248,255,0.75)', 'stroke-width': 1, opacity: 0 });
    const foamA = el('circle', { cx: -3, cy: 2.2, r: 0.6, fill: 'rgba(244,248,255,0.9)', opacity: 0 });
    const foamB = el('circle', { cx: 3, cy: 1.8, r: 0.55, fill: 'rgba(244,248,255,0.9)', opacity: 0 });
    const foamC = el('circle', { cx: 0, cy: 3.6, r: 0.5, fill: 'rgba(244,248,255,0.9)', opacity: 0 });
    // gambe: appena visibili sotto il busto, tono pantaloni/scarpe
    const legL = el('ellipse', { cx: -1.3, cy: 3.6, rx: 1.1, ry: 1.9, fill: w.pants, opacity: op });
    const legR = el('ellipse', { cx: 1.3, cy: 3.6, rx: 1.1, ry: 1.9, fill: w.pants, opacity: op });
    // braccia: due segmenti color-pelle ad angoli/lunghezze diversi per omino (varietà di posa)
    const armL = el('line', {
      x1: 0, y1: -1, x2: (Math.cos(w.armA * Math.PI / 180) * w.armLenA).toFixed(2), y2: (Math.sin(w.armA * Math.PI / 180) * w.armLenA - 1).toFixed(2),
      stroke: w.skin, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: op
    });
    const armR = el('line', {
      x1: 0, y1: -1, x2: (Math.cos(w.armB * Math.PI / 180) * w.armLenB).toFixed(2), y2: (Math.sin(w.armB * Math.PI / 180) * w.armLenB - 1).toFixed(2),
      stroke: w.skin, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: op
    });
    // busto: vestito colorato — più tondo/raccolto se "seduto", più ovale/allungato se eretto
    const torso = w.sitting
      ? el('ellipse', { cx: 0, cy: 0, rx: 3.4, ry: 3.2, fill: w.color, opacity: op })
      : el('ellipse', { cx: 0, cy: -0.4, rx: 2.7, ry: 3.9, fill: w.color, opacity: op });
    // testa: sempre nera, sempre l'elemento più in cima (renderizzata per ultima)
    const head = el('circle', { cx: 0, cy: (w.sitting ? -2.6 : -4.2), r: 1.7, fill: '#181818', opacity: op });
    [shadow, wake, foamA, foamB, foamC, legL, legR, armL, armR, torso, head].forEach(n => g.appendChild(n));
    return { g, legL, legR, armL, armR, torso, head, shadow, wake, foamA, foamB, foamC };
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
    simT += dt;
    const cx0 = props.houses.reduce((s, h) => s + h.gx0 + h.cols / 2, 0) / props.houses.length;
    const cy0 = props.houses.reduce((s, h) => s + h.gy0 + h.rows / 2, 0) / props.houses.length;
    const GROUP_BOUND_R = 520; // "più sparsi": i centri-gruppo possono vagare ancora più lontano

    // i centri-gruppo vagano lentamente per tutto il mare, evitando le isole — vagare
    // visibile ma pacato, non un giro veloce.
    groups!.forEach(g => {
      g.wanderT -= dt;
      if (g.wanderT <= 0) {
        g.vx += (Math.random() - 0.5) * 0.25;
        g.vy += (Math.random() - 0.5) * 0.25;
        g.wanderT = 3 + Math.random() * 4;
      }
      const dxc = cx0 - g.gx, dyc = cy0 - g.gy, dc = Math.hypot(dxc, dyc);
      if (dc > GROUP_BOUND_R) { g.vx += dxc / dc * 1.2 * dt * 10; g.vy += dyc / dc * 1.2 * dt * 10; }
      landAvoidForce(g, dt, LAND_PUSH_STRENGTH * 0.6);
      g.vx *= 0.96; g.vy *= 0.96;
      const gsp = Math.hypot(g.vx, g.vy);
      if (gsp > 0.5) { g.vx = g.vx / gsp * 0.5; g.vy = g.vy / gsp * 0.5; }
      g.gx += g.vx * dt; g.gy += g.vy * dt;
      clampOffLand(g, LAND_MARGIN + 10);
    });

    walkers!.forEach(w => {
      w.wanderT -= dt;
      if (w.wanderT <= 0) {
        w.vx += (Math.random() - 0.5) * WANDER_JITTER;
        w.vy += (Math.random() - 0.5) * WANDER_JITTER;
        w.wanderT = 1 + Math.random() * 1.5;
      }
      // richiamo verso il centro del proprio gruppo — è questo che tiene i gruppi "fitti"
      // mentre vagano insieme, invece di disperdersi in un'unica nuvola uniforme
      const gc = groups![w.group];
      const dxg = gc.gx - w.gx, dyg = gc.gy - w.gy, dg = Math.hypot(dxg, dyg);
      if (dg > 0.001) {
        const f = Math.min(dg, 40) * COHESION_STRENGTH * dt * 0.1;
        w.vx += dxg / dg * f; w.vy += dyg / dg * f;
      }
      // repulsione dal mouse — mai afferrabili, solo si scostano (ora molto più marcata)
      if (pointerGrid) {
        const dx = w.gx - pointerGrid.gx, dy = w.gy - pointerGrid.gy, d = Math.hypot(dx, dy);
        if (d < REPEL_RADIUS && d > 0.001) {
          const f = (1 - d / REPEL_RADIUS) * REPEL_STRENGTH * dt;
          w.vx += dx / d * f; w.vy += dy / d * f;
        }
      }
      // separazione dagli altri omini dello STESSO gruppo, raggio corto: si stringono
      // parecchio prima di respingersi, da cui l'effetto "gruppo fitto" invece che sparpagliato
      walkers!.forEach(o => {
        if (o === w || o.group !== w.group) return;
        const dx = w.gx - o.gx, dy = w.gy - o.gy, d = Math.hypot(dx, dy);
        if (d > 0.001 && d < SEP_RADIUS) { w.vx += dx / d * SEP_STRENGTH * dt; w.vy += dy / d * SEP_STRENGTH * dt; }
      });
      // restano sempre in acqua: se finiscono dentro il perimetro di un'isola vengono
      // respinti fuori (niente camminata "a terra" sopra le isole)
      landAvoidForce(w, dt, LAND_PUSH_STRENGTH);

      w.vx *= 0.92; w.vy *= 0.92;
      const sp = Math.hypot(w.vx, w.vy);
      if (sp > MAX_SPEED) { w.vx = w.vx / sp * MAX_SPEED; w.vy = w.vy / sp * MAX_SPEED; }
      // velocità corrente memorizzata (dopo il clamp): usata in render() per far comparire
      // ondine/schiuma intorno a chi si sta muovendo — vedi buildPictogram/render.
      w.curSpeed = Math.hypot(w.vx, w.vy);
      w.phase += dt * (1.5 + w.curSpeed * 2);

      w.gx += w.vx * dt; w.gy += w.vy * dt;

      clampOffLand(w, LAND_MARGIN);
    });
  }

  function render() {
    walkers!.forEach(w => {
      if (!w.dom) return;
      // "respiro" autonomo: un piccolo scarto di posizione che oscilla per conto suo nel
      // tempo (simT, non legato alla velocità reale dell'omino), fase/frequenza diverse per
      // ognuno — anche un omino praticamente fermo continua ad avere un filo di vita.
      const nGx = w.gx + Math.sin(simT * w.noiseFX + w.noiseAX) * NOISE_AMPL;
      const nGy = w.gy + Math.cos(simT * w.noiseFY + w.noiseAY) * NOISE_AMPL;
      const p = proj(nGx, nGy);
      // vista dall'alto: rotazione di base fissata alla nascita (w.rot) più un piccolo
      // ondeggiare autonomo (stesso principio del respiro, ma sull'angolo) — un po' di
      // "vita" senza farli girare su loro stessi in modo innaturale.
      const rot = w.rot + Math.sin(simT * w.noiseFX * 0.6 + w.noiseAY) * 7;
      w.dom.g.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${WALKER_SCALE})`);

      // ondine/schiuma: compaiono e crescono con la velocità corrente, invisibili da fermi.
      const spF = Math.min(1, (w.curSpeed || 0) / MAX_SPEED);
      const { wake, foamA, foamB, foamC } = w.dom;
      wake.setAttribute('opacity', (spF * 0.55).toFixed(2));
      wake.setAttribute('rx', (4 + spF * 3.5).toFixed(1));
      wake.setAttribute('ry', (2.6 + spF * 2.2).toFixed(1));
      const flick = (seed: number) => 0.35 + 0.65 * Math.max(0, Math.sin(w.phase * 2.2 + seed));
      foamA.setAttribute('opacity', (spF * 0.8 * flick(0)).toFixed(2));
      foamB.setAttribute('opacity', (spF * 0.8 * flick(2.1)).toFixed(2));
      foamC.setAttribute('opacity', (spF * 0.8 * flick(4.2)).toFixed(2));
      foamA.setAttribute('cx', (-3 - spF * 1.1).toFixed(1));
      foamB.setAttribute('cx', (3 + spF * 1.1).toFixed(1));
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
    // STATO della simulazione (posizioni/velocità in walkers/groups) resta invariato — nessun "salto".
    mount(svg: SVGSVGElement) {
      mountedSvg = svg;
      const layer = el('g', { class: 'walker-layer' });
      walkers!.forEach(w => {
        w.dom = buildPictogram(w);
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

// ---- deriva lentissima del mosaico: sposta il punto di ancoraggio del pattern (in unità
// di griglia, poi proiettato con la stessa skew di proj()) lungo un piccolo giro ellittico,
// così le tessere sembrano "respirare"/muoversi appena invece di restare perfettamente
// ferme — persiste indipendentemente da buildBoard() (che ricrea i <pattern> nel DOM a ogni
// resize, ma con gli stessi id: qui basta ri-cercarli per id a ogni frame).
const SEA_DRIFT_AMPL = 5;      // unità di griglia — piccolo apposta ("leggermente")
const SEA_DRIFT_PERIOD_X = 46; // secondi per un giro completo sull'asse x
const SEA_DRIFT_PERIOD_Y = 63; // periodo diverso sull'asse y, così il moto non si ripete in loop visibile
let seaDriftT0: number | null = null;
function tickSeaDrift(tMs: number) {
  if (seaDriftT0 === null) seaDriftT0 = tMs;
  const t = (tMs - seaDriftT0) / 1000;
  const dgx = Math.sin(t / SEA_DRIFT_PERIOD_X * 2 * Math.PI) * SEA_DRIFT_AMPL;
  const dgy = Math.cos(t / SEA_DRIFT_PERIOD_Y * 2 * Math.PI) * SEA_DRIFT_AMPL;
  const d = proj(dgx, dgy);
  const transform = `translate(${d.x.toFixed(2)},${d.y.toFixed(2)}) matrix(${GX_X},${GX_Y},${-GY_X},${GY_Y},0,0)`;
  ['mosaicDeep', 'mosaicMid', 'mosaicShallow'].forEach(id => {
    const p = document.getElementById(id);
    if (p) p.setAttribute('patternTransform', transform);
  });
  requestAnimationFrame(tickSeaDrift);
}

// ---- "griglia topografica" v2: corretto un difetto del giro precedente — gli inserti
// (allora anelli/badge liberi) potevano cadere ovunque, senza rispettare i quadrati della
// griglia del mosaico. Ora SOLO due motivi (righine diagonali, pallini), e ognuno è
// confinato dentro UN quadrato preciso della griglia — mai a cavallo del bordo.
// Il quadrato "griglia" è lo stesso della trama del mosaico: MOSAIC_CELL/MOSAIC_SUB = 24
// unità di gx/gy — un quadrato va quindi da (gx0,gy0) a (gx0+24,gy0+24), allineato
// all'origine (0,0) come il mosaico stesso.
// Qui le forme sono autorate DIRETTAMENTE in coordinate gx/gy (non "unità di disegno" poi
// scalate): ogni punto passa da proj() singolarmente, così eredita naturalmente la stessa
// skew isometrica della griglia — è quello che le fa restare "ingrigliate".
// stroke-width/raggio NON passano per proj(): restano in unità finali dello stesso spazio
// enorme delle coordinate (le stesse dei bordi-isola, stroke-width 2.2 lì) — un valore
// "piccolo" sarebbe sub-pixel e invisibile. TOPO_LINE = spessore/raggio "reale" in quello spazio.
const TOPO_TINT = 'rgba(244,248,255,0.62)';
const TOPO_LINE = 26;
function topoCellHatch(gx0: number, gy0: number) {
  // 3 trattini paralleli lungo la diagonale del quadrato (direzione gx=gy), sfalsati lungo
  // l'anti-diagonale — restano dentro il quadrato con un margine di sicurezza.
  const g = el('g', { class: 'topo-hatch' });
  [-4, 0, 4].forEach(o => {
    const cx = gx0 + 12 + o, cy = gy0 + 12 - o;
    const p1 = proj(cx - 7, cy - 7), p2 = proj(cx + 7, cy + 7);
    g.appendChild(el('line', { x1: p1.x.toFixed(1), y1: p1.y.toFixed(1), x2: p2.x.toFixed(1), y2: p2.y.toFixed(1), stroke: TOPO_TINT, 'stroke-width': TOPO_LINE, 'stroke-linecap': 'round', opacity: 0.5 }));
  });
  return g;
}
function topoCellDots(gx0: number, gy0: number) {
  const g = el('g', { class: 'topo-stipple' });
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const fx = 3 + Math.random() * 18, fy = 3 + Math.random() * 18; // dentro il quadrato, con margine
    const p = proj(gx0 + fx, gy0 + fy);
    g.appendChild(el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (TOPO_LINE * 0.6 + Math.random() * TOPO_LINE * 0.4).toFixed(1), fill: TOPO_TINT, opacity: (0.38 + Math.random() * 0.32).toFixed(2) }));
  }
  return g;
}
function buildTopoLayer() {
  const g = el('g', { class: 'topo-layer' });
  // quadrati scelti a mano in acqua aperta, lontano dalle isole, allineati a multipli di 24
  // così coincidono esattamente con un quadrato vero della griglia mosaico.
  const cells = [
    { gx0: 24, gy0: -24, type: 'hatch' },
    { gx0: -312, gy0: -24, type: 'dots' },
    { gx0: -456, gy0: 312, type: 'hatch' },
    { gx0: 408, gy0: -312, type: 'dots' },
    { gx0: 144, gy0: 336, type: 'hatch' },
    { gx0: 288, gy0: 288, type: 'dots' },
    { gx0: 96, gy0: -120, type: 'dots' },
    { gx0: -150, gy0: 150, type: 'hatch' },
  ];
  cells.forEach(c => {
    g.appendChild(c.type === 'hatch' ? topoCellHatch(c.gx0, c.gy0) : topoCellDots(c.gx0, c.gy0));
  });
  return g;
}

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

  // ---- scala px-schermo/unità-griglia-proiettata: con le isole il viewBox copre un'area
  // enorme in unità di griglia (~0.05 px-schermo per unità), quindi un font-size "13" in
  // stile CSS sul <text> dell'SVG (che vale 13 UNITÀ DI GRIGLIA, non 13px reali) risulta di
  // fatto invisibile (<1px a schermo) — badge/didascalia usano dimensioni calcolate da questa
  // scala, non valori fissi, così restano leggibili qualunque sia la dimensione della finestra.
  const pxPerUnit = wrapRect.width / vbW;
  const CAP_FONT = 14 / pxPerUnit;
  const CAP_STROKE = 3 / pxPerUnit;
  const CAP_GAP = 16 / pxPerUnit;

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
  // grana animata: un feOffset tra la turbolenza e il color-matrix, con dx/dy che
  // "camminano" lentamente via <animate> SMIL nativo (nessun JS extra, nessun ricalcolo
  // del rumore stesso) — la grana sembra viva/respirare invece di essere ferma.
  const seaGrainSVG = `
    <filter id="seaGrain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch" result="noise"/>
      <feOffset in="noise" dx="0" dy="0" result="noiseMove">
        <animate attributeName="dx" values="0;13;-8;3;0" dur="14s" repeatCount="indefinite"/>
        <animate attributeName="dy" values="0;-10;6;-4;0" dur="17s" repeatCount="indefinite"/>
      </feOffset>
      <feColorMatrix in="noiseMove" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"/>
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

  // ---- inserti da "mappa topografica" in alcuni punti del mare aperto — texture/decorazione,
  // sotto isole e omini.
  svg.appendChild(buildTopoLayer());

  // ---- omini piatti: montati QUI, PRIMA delle isole, così nell'ordine di disegno SVG (chi
  // viene dopo sta sopra) le isole finiscono sempre sopra agli omini — mai il contrario. Il
  // DOM va ricreato a ogni rebuild, ma la simulazione (posizioni/velocità) persiste.
  WalkerLayer.mount(svg);

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
    // fase/durata del "galleggiamento" leggermente diverse per isola (delay negativo = parte
    // già a metà ciclo), così non fluttuano tutte in sincrono — vedi @keyframes islandFloat.
    card.style.animationDelay = (-(hs.number * 1.7)).toFixed(1) + 's';
    card.style.animationDuration = (6.5 + (hs.number % 3) * 0.6).toFixed(1) + 's';
    card.appendChild(img);
    frame.appendChild(card);
    btn.appendChild(frame);
    fo.appendChild(btn);

    const wrap = el('g', {});
    wrap.appendChild(fo);

    // il badge numerico ("01","02"...) sopra l'isola è stato tolto: non si vogliono più
    // numeri visibili in homepage. Il numero resta comunque nell'aria-label del bottone
    // (accessibilità) e nel CMS, semplicemente non si disegna più sull'SVG.

    // didascalia, sotto l'isola: SOLO il titolo, sempre visibile (prima appariva solo in
    // hover, e con "Isola 0N —" davanti).
    const cap = el('text', { x: bx0 + bw / 2, y: (by1 + CAP_GAP).toFixed(1), 'text-anchor': 'middle', class: 'house-cap' });
    cap.setAttribute('style', `font-size:${CAP_FONT.toFixed(1)}px; stroke-width:${CAP_STROKE.toFixed(2)}px`);
    cap.textContent = hs.title;
    wrap.appendChild(cap);

    svg.appendChild(wrap);

    btn.addEventListener('mouseenter', () => { wrap.classList.add('house-hover'); });
    btn.addEventListener('mouseleave', () => { wrap.classList.remove('house-hover'); });
    btn.addEventListener('focus', () => { wrap.classList.add('house-hover'); });
    btn.addEventListener('blur', () => { wrap.classList.remove('house-hover'); });
    btn.addEventListener('click', () => { emit('select', hs); });
  });
}

onMounted(() => {
  buildBoard();
  requestAnimationFrame(tickSeaDrift);
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

/* inserti "mappa topografica": righine diagonali e pallini, statici e ingrigliati (ognuno
   dentro un quadrato preciso della griglia del mosaico — vedi buildTopoLayer). */
.topo-stipple, .topo-hatch{ pointer-events:none; }

.house-btn{ all:unset; display:block; width:100%; height:100%; cursor:pointer; }
.house-frame{ width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.house-btn:hover .house-frame, .house-btn:focus-visible .house-frame{ transform: translateY(-4%) scale(1.05); }
.house-frame .card{
  width:100%; display:block;
  /* le isole "fluttuano": un leggero bob verticale continuo sulla card (non sul frame, che
     porta già l'animazione di hover — due transform sullo stesso elemento confliggerebbero).
     Fase/durata leggermente diverse per isola (impostate via JS) così non fluttuano tutte
     in sincrono. */
  animation: islandFloat 7s ease-in-out infinite;
}
@keyframes islandFloat{
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4%); }
}
.house-frame img{
  width:100%; display:block;
  /* isole = PNG a sfondo trasparente: ombra portata che segue la sagoma, le fa leggere
     come oggetti che galleggiano sul mare (non un box-shadow rettangolare) */
  filter: drop-shadow(0 14px 18px rgba(5,20,25,0.45));
}

.house-badge{ font-family:"Inter",-apple-system,sans-serif; fill:#efe9d8; }
/* didascalia SEMPRE visibile sotto ogni isola (prima appariva solo in hover) — solo il
   titolo dell'articolo (niente più "Isola 0N —"). paint-order+stroke bianco invece di un
   text-shadow: resta leggibile sopra il mosaico del mare qualsiasi sia il tono di blu sotto. */
.house-cap{
  font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-weight:600;
  fill:var(--ink, #232019);
  paint-order:stroke;
  stroke:#f4f2ec;
  stroke-linejoin:round;
  pointer-events:none;
}
.house-hover .house-frame{ transform: translateY(-4%) scale(1.05); }

.list{ display:none; }
@media (max-width: 760px){
  .board-wrap{ display:none; }
  .list{ display:flex; flex-direction:column; align-items:center; gap:28px; padding:8px 20px 32px; flex:1 1 auto; min-height:0; overflow:auto; }
  .list .house{ width:92%; max-width:420px; text-decoration:none; color:inherit; display:block; background:none; border:none; padding:0; cursor:pointer; font:inherit; }
  .list .house img{ width:100%; border-radius:6px; filter: drop-shadow(0 8px 10px rgba(15,13,10,.3)); }
  .list .caption{ font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-align:center; padding-top:6px; }
}
</style>
