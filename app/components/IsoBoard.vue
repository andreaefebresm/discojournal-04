<template>
  <div class="board-root">
    <div class="board-wrap">
      <svg ref="svgEl" id="board-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>
    <div class="list">
      <button
        v-for="hs in mobileHouses"
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

// Ordine della lista in vista mobile: DECISIONE DI DESIGN, non deriva dal campo "number"
// (quello resta l'ordine "ufficiale"/di pubblicazione in Contentful e continua a fissare
// la posizione di ogni isola sulla board desktop via ISLAND_LAYOUT, indipendente da qui).
// Richiesto: isola della redazione per prima (appena pronta — riservato qui il numero 6,
// da correggere se in Contentful finisce con un altro "number"), poi Crassula, Charlotte,
// Fareda, Nicole, e April per ultima (il suo articolo esce dopo il lancio del numero).
const MOBILE_ORDER: Record<number, number> = {
  6: 0, // isola della redazione (non ancora in Contentful — number ipotizzato)
  5: 1, // Crassula Shang
  1: 2, // Charlotte Schuitenmaker
  2: 3, // Fareda El Shaaer
  4: 4, // Nicole Furtado
  3: 5  // April Wei-West — per ultima
};
const mobileHouses = computed(() =>
  [...props.houses].sort((a, b) => (MOBILE_ORDER[a.number] ?? 999) - (MOBILE_ORDER[b.number] ?? 999))
);

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

  // Round 6 (superato): "sostituire alcuni degli omini a nuoto con altre cose che si
  // trovano in mare" — barchette/boe/detriti/balene, prima fatte come pittogrammi SVG
  // animati insieme agli omini. Round 7: quelle "altre cose" diventano immagini statiche
  // nello stesso stile fotorealistico delle isole (non più animate, non più parte della
  // simulazione omini/gruppi) — vedi SEA_OBJECTS più sotto. I walker restano SOLO persone.

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
  // corpo di una PERSONA vista dall'alto (comportamento originale, invariato)
  function buildPersonBody(w: any, op: string, g: SVGElement) {
    const legL = el('ellipse', { cx: -1.3, cy: 3.6, rx: 1.1, ry: 1.9, fill: w.pants, opacity: op });
    const legR = el('ellipse', { cx: 1.3, cy: 3.6, rx: 1.1, ry: 1.9, fill: w.pants, opacity: op });
    const armL = el('line', {
      x1: 0, y1: -1, x2: (Math.cos(w.armA * Math.PI / 180) * w.armLenA).toFixed(2), y2: (Math.sin(w.armA * Math.PI / 180) * w.armLenA - 1).toFixed(2),
      stroke: w.skin, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: op
    });
    const armR = el('line', {
      x1: 0, y1: -1, x2: (Math.cos(w.armB * Math.PI / 180) * w.armLenB).toFixed(2), y2: (Math.sin(w.armB * Math.PI / 180) * w.armLenB - 1).toFixed(2),
      stroke: w.skin, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: op
    });
    const torso = w.sitting
      ? el('ellipse', { cx: 0, cy: 0, rx: 3.4, ry: 3.2, fill: w.color, opacity: op })
      : el('ellipse', { cx: 0, cy: -0.4, rx: 2.7, ry: 3.9, fill: w.color, opacity: op });
    const head = el('circle', { cx: 0, cy: (w.sitting ? -2.6 : -4.2), r: 1.7, fill: '#181818', opacity: op });
    [legL, legR, armL, armR, torso, head].forEach(n => g.appendChild(n));
  }
  // ---- pittogramma visto dall'alto: una persona (vestito colorato, braccia color-pelle a
  // due angoli fissi, testa nera sempre in cima). Ferme di natura — nessuna animazione di
  // gambe/braccia legata al movimento: la sola vita residua è il filo di respiro applicato
  // in render() alla posizione dell'intero <g>. (Barche/boe/detriti/balene sono usciti da
  // qui — ora sono oggetti statici a colori nello stile delle isole, vedi SEA_OBJECTS.)
  function buildPictogram(w: any) {
    const op = (0.75 + 0.25 * w.depthOpacity).toFixed(2);
    const g = el('g', { class: 'walker' });
    const shadow = el('ellipse', { cx: 0, cy: 1, rx: 4.6, ry: 5.4, fill: 'rgba(10,30,35,0.16)' });
    // ondine/schiuma: invisibili da fermi, compaiono e crescono con la velocità corrente
    // (w.curSpeed, impostata in step()) — vedi render(). Sotto il "corpo" nell'ordine di
    // disegno, così sembrano intorno all'acqua smossa, non sopra.
    const wake = el('ellipse', { cx: 0, cy: 1.5, rx: 5, ry: 3.2, fill: 'none', stroke: 'rgba(244,248,255,0.75)', 'stroke-width': 1, opacity: 0 });
    const foamA = el('circle', { cx: -3, cy: 2.2, r: 0.6, fill: 'rgba(244,248,255,0.9)', opacity: 0 });
    const foamB = el('circle', { cx: 3, cy: 1.8, r: 0.55, fill: 'rgba(244,248,255,0.9)', opacity: 0 });
    const foamC = el('circle', { cx: 0, cy: 3.6, r: 0.5, fill: 'rgba(244,248,255,0.9)', opacity: 0 });
    [shadow, wake, foamA, foamB, foamC].forEach(n => g.appendChild(n));
    buildPersonBody(w, op, g);
    return { g, shadow, wake, foamA, foamB, foamC };
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

// ---- onda del mare: guidata via JS (stesso principio di tickSeaDrift sopra), NON più via
// <animate> SMIL sull'attributo "scale" del feDisplacementMap. Il giro precedente usava SMIL,
// ma non è affidabile ovunque (dipende dal supporto SMIL del browser sui filtri SVG) — un
// rAF che scrive direttamente l'attributo funziona sempre, stessa garanzia già usata per la
// deriva del mosaico.
// più veloce (7s -> 3.2s) e ampiezza leggermente maggiore — "vorrei che fosse più evidente
// il movimento", richiesto esplicitamente ("immagino basti farlo più veloce").
const SEA_WAVE_MIN = 8, SEA_WAVE_MAX = 54, SEA_WAVE_PERIOD = 3.2; // secondi per un giro completo
let seaWaveT0: number | null = null;
function tickSeaWave(tMs: number) {
  if (seaWaveT0 === null) seaWaveT0 = tMs;
  const t = (tMs - seaWaveT0) / 1000;
  const mid = (SEA_WAVE_MIN + SEA_WAVE_MAX) / 2, ampl = (SEA_WAVE_MAX - SEA_WAVE_MIN) / 2;
  const scale = mid + Math.sin((t / SEA_WAVE_PERIOD) * 2 * Math.PI) * ampl;
  const disp = document.getElementById('waveDisp');
  if (disp) disp.setAttribute('scale', scale.toFixed(1));
  requestAnimationFrame(tickSeaWave);
}

// ---- "griglia topografica" v2: corretto un difetto del giro precedente — gli inserti
// (allora anelli/badge liberi) potevano cadere ovunque, senza rispettare i quadrati della
// griglia del mosaico. Ora SOLO due motivi (righine diagonali, pallini), e ognuno è
// confinato dentro UN quadrato preciso della griglia — mai a cavallo del bordo.
// Il quadrato "griglia" è lo stesso della trama del mosaico: MOSAIC_CELL/MOSAIC_SUB = 24
// unità di gx/gy — un quadrato va quindi da (gx0,gy0) a (gx0+24,gy0+24), allineato
// all'origine (0,0) come il mosaico stesso.
// (l'entità IA "monolite" sull'isola di Nicole — pittogramma SVG placeholder in stile
// HAL 9000 — è stata rimossa: Nicole ha generato un'immagine vera con Gemini, che
// prenderà il suo posto. Quando arriva il file, va inserito qui come overlay sull'isola
// number:4, sullo stesso principio — vedi git history per il codice del pittogramma se
// serve come riferimento nel frattempo.)

// ---- mini-isole/terreni decorativi sparsi in acqua aperta: NON cliccabili, desaturati
// (grayscale via CSS — vedi classe .mini-island), scelti a mano per stare lontani dalle
// 5 isole principali e dai quadrati della griglia topografica. Per ora sono placeholder
// disegnati in SVG (nessuno strumento di generazione immagini disponibile in questa
// sessione); quando arrivano le immagini vere generate con Gemini (vedi prompt fornito
// ad Andrea), ogni entry qui sotto va convertita in un <img>/foreignObject come le isole
// principali, mantenendo la stessa posizione (gx/gy) e la stessa classe .mini-island per
// il filtro di desaturazione — il resto del codice non cambia.
// raddoppiata su richiesta esplicita ("grandi il doppio").
const MINI_ISLAND_SCALE = 260;
// tutte e 10 hanno ora l'immagine vera generata da Andrea con Gemini — niente più
// placeholder procedurali. rot:0 su tutte (foto fotorealistiche, non poligoni astratti:
// ruotarle sembra sbagliato, come da richiesta). imgAspect solo dove diverso dal formato
// standard ~700x382 usato dalla maggior parte delle immagini.
const MINI_ISLANDS: Array<{ gx: number; gy: number; variant: number; size: number; rot: number; img?: string; imgAspect?: number }> = [
  { gx: -300, gy: 300, variant: 0, size: 1.0, rot: 0, img: '/assets/mini-islands/reef.png' },
  { gx: 380, gy: 250, variant: 2, size: 0.85, rot: 0, img: '/assets/mini-islands/volcano.png', imgAspect: 700 / 284 },
  { gx: -230, gy: -330, variant: 1, size: 1.1, rot: 0, img: '/assets/mini-islands/driftwood.png' },
  { gx: 250, gy: -330, variant: 3, size: 0.9, rot: 0, img: '/assets/mini-islands/saltflat.png' },
  { gx: -60, gy: -40, variant: 2, size: 0.8, rot: 0, img: '/assets/mini-islands/mossyboulders.png' },
  { gx: 100, gy: -20, variant: 0, size: 0.7, rot: 0, img: '/assets/mini-islands/mesa.png' },
  { gx: -450, gy: -50, variant: 1, size: 1.15, rot: 0, img: '/assets/mini-islands/tidepools.png' },
  { gx: -100, gy: 360, variant: 3, size: 0.95, rot: 0, img: '/assets/mini-islands/mangrove.png' },
  { gx: 200, gy: -360, variant: 0, size: 0.8, rot: 0, img: '/assets/mini-islands/dunegrass.png', imgAspect: 1 },
  { gx: -250, gy: -20, variant: 2, size: 1.0, rot: 0, img: '/assets/mini-islands/icefloe.png' },
];
// 4 "varianti" di sagoma (poligono irregolare con raggio diverso per vertice), per un
// po' di diversità di forma senza dover disegnare 10 pittogrammi a mano.
const MINI_VARIANTS = [
  [3.6, 4.4, 3.2, 4.8, 3.4, 4.0],
  [4.6, 3.0, 4.2, 3.6, 4.8, 2.8],
  [3.0, 3.4, 4.6, 3.8, 3.2, 4.4],
  [4.0, 4.2, 3.6, 3.0, 4.4, 3.8],
];
const MINI_FILLS = ['#b9ae95', '#9aa39c', '#8a9a7c', '#c9d6d6'];
// aspect ratio (larghezza/altezza) delle immagini generate con Gemini per le mini-isole:
// stessa inquadratura per tutte (~700x382), quindi un solo valore va bene per tutte.
const MINI_IMG_ASPECT = 700 / 382;
function buildMiniIsland(mi: { gx: number; gy: number; variant: number; size: number; rot: number; img?: string; imgAspect?: number }) {
  const p = proj(mi.gx, mi.gy);
  const scale = MINI_ISLAND_SCALE * mi.size;
  const g = el('g', { class: 'mini-island', transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${mi.rot}) scale(${scale.toFixed(1)})` });
  if (mi.img) {
    // immagine vera (fotorealistica, stesso stile delle isole): niente poligono/speckle
    // procedurali — solo l'immagine, centrata sull'ancora, più un'ombra leggera sotto le
    // radici. Larghezza fissa in unità locali (14: ancora più grande, su richiesta),
    // altezza derivata dall'aspect ratio della sorgente (imgAspect per-entry se diverso
    // dal formato standard).
    // niente più ombra sotto: a taglia grande risultava storta/disallineata — tolta del
    // tutto su richiesta esplicita ("non mettere ombre storte, anzi non metterle proprio").
    const W = 14, H = W / (mi.imgAspect || MINI_IMG_ASPECT);
    const img = el('image', { href: mi.img, x: (-W / 2).toFixed(2), y: (-H / 2).toFixed(2), width: W.toFixed(2), height: H.toFixed(2), preserveAspectRatio: 'xMidYMid meet' });
    g.appendChild(img);
    return g;
  }
  const radii = MINI_VARIANTS[mi.variant % MINI_VARIANTS.length];
  const pts = radii.map((r, i) => {
    const a = (Math.PI * 2 * i) / radii.length;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r * 0.62).toFixed(2)}`; // *0.62: appiattita, vista dall'alto in leggera prospettiva
  }).join(' ');
  const land = el('polygon', { points: pts, fill: MINI_FILLS[mi.variant % MINI_FILLS.length], stroke: 'rgba(30,30,25,0.35)', 'stroke-width': 0.15 });
  const speck1 = el('circle', { cx: -radii[0] * 0.3, cy: 0.3, r: 0.5, fill: 'rgba(40,35,30,0.28)' });
  const speck2 = el('circle', { cx: radii[2] * 0.35, cy: -0.4, r: 0.4, fill: 'rgba(40,35,30,0.22)' });
  [land, speck1, speck2].forEach(n => g.appendChild(n));
  return g;
}
function buildMiniIslandsLayer() {
  const g = el('g', { class: 'mini-island-layer' });
  MINI_ISLANDS.forEach(mi => g.appendChild(buildMiniIsland(mi)));
  return g;
}

// ---- "oggettini" del mare (barche/boe Argo/detriti/balene): STATICI, non animati, non
// cliccabili — al contrario degli omini restano fermi nella loro posizione, come le
// isole/mini-isole. Anche qui, per ora, placeholder SVG (stessa sagoma usata nel round
// precedente, quando erano ancora parte della simulazione omini): niente strumento di
// generazione immagini disponibile in questa sessione. Quando arrivano le immagini vere
// (stesso stile fotorealistico delle isole, vedi prompt fornito ad Andrea), ogni entry va
// convertita in un <img>/foreignObject, stessa posizione — NON desaturate come le
// mini-isole: questi sono oggetti "in scena", non texture di sfondo.
// ATTENZIONE dimensioni: i valori qui sotto NON sono più quelli tarati sulle vecchie sagome
// procedurali (quel giro dava oggetti larghi 2-7px a schermo — di fatto invisibili, bug
// scoperto solo con uno zoom reale sullo screenshot, non dai soli bounding-box). Ritarati
// per una taglia effettivamente visibile: boat/whale più in vista, argo/debris più piccoli
// ma comunque leggibili come sagoma, non puntini.
// raddoppiati su richiesta esplicita ("grandi il doppio").
const SEA_SCALE: Record<string, number> = { boat: 144, argo: 200, debris: 190, whale: 140 };
// larghezza dell'immagine in unità locali — invariata: è SEA_SCALE (sopra) che ora dà la
// taglia finale visibile.
const SEA_IMG_W: Record<string, number> = { boat: 13, argo: 5.5, debris: 4.5, whale: 19 };
const SEA_IMG_ASPECT = 600 / 327;
const SEA_OBJECTS: Array<{ type: string; gx: number; gy: number; rot: number; color?: string; variant?: string; img?: string; imgAspect?: number }> = [
  { type: 'boat', gx: 300, gy: 350, rot: 15, color: '#7a4a2b', img: '/assets/sea-objects/boat1.png' },
  { type: 'boat', gx: -430, gy: 150, rot: -40, color: '#54606b', img: '/assets/sea-objects/boat2.png', imgAspect: 600 / 335 },
  { type: 'argo', gx: 50, gy: 390, rot: 0, img: '/assets/sea-objects/argo1.png' },
  { type: 'argo', gx: 450, gy: -200, rot: 0, img: '/assets/sea-objects/argo2.png' },
  { type: 'debris', gx: -150, gy: 260, rot: 30, variant: 'bottle', img: '/assets/sea-objects/bottle.png' },
  { type: 'debris', gx: 0, gy: -150, rot: -20, variant: 'crate', img: '/assets/sea-objects/crate.png' },
  { type: 'whale', gx: -90, gy: 440, rot: 25, img: '/assets/sea-objects/whale.png' },
];
function buildSeaObject(so: { type: string; gx: number; gy: number; rot: number; color?: string; variant?: string; img?: string; imgAspect?: number }) {
  const p = proj(so.gx, so.gy);
  const scale = SEA_SCALE[so.type];
  const g = el('g', { class: 'sea-object', transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${so.rot}) scale(${scale})` });
  // wrapper interno per il "galleggiamento": la posizione/rotazione/scala restano fisse sul
  // <g> esterno, il bob/ondeggiamento via CSS va sull'interno (vedi .sea-object-float).
  // durata/ritardo variano per oggetto (dedotti dalla posizione, deterministico) così non
  // ondeggiano tutti in sincrono.
  const seed = Math.abs(so.gx * 7 + so.gy * 13) % 100;
  const dur = (3.2 + (seed % 17) / 10).toFixed(2);
  const delay = (-(seed % 29) / 10).toFixed(2);
  const float = el('g', { class: 'sea-object-float', style: `animation-duration:${dur}s;animation-delay:${delay}s;` });
  g.appendChild(float);
  // niente più ombra sotto: a taglia grande risultava storta/disallineata — tolta del tutto
  // su richiesta esplicita ("non mettere ombre storte, anzi non metterle proprio").
  if (so.img) {
    // immagine vera: stesso schema delle mini-isole, larghezza in unità locali da
    // SEA_IMG_W (per tipo), altezza dall'aspect ratio della sorgente.
    const W = SEA_IMG_W[so.type], H = W / (so.imgAspect || SEA_IMG_ASPECT);
    const img = el('image', { href: so.img, x: (-W / 2).toFixed(2), y: (-H / 2).toFixed(2), width: W.toFixed(2), height: H.toFixed(2), preserveAspectRatio: 'xMidYMid meet' });
    float.appendChild(img);
    return g;
  }
  if (so.type === 'boat') {
    const hull = el('path', { d: 'M -6.5,0 Q -3.2,-2.3 0,-2.4 Q 3.2,-2.3 6.5,0 Q 3.2,2.3 0,2.4 Q -3.2,2.3 -6.5,0 Z', fill: so.color, stroke: 'rgba(20,20,15,0.35)', 'stroke-width': 0.3 });
    const thwart = el('line', { x1: -1.8, y1: -1.6, x2: -1.8, y2: 1.6, stroke: 'rgba(20,20,15,0.3)', 'stroke-width': 0.4 });
    const bow = el('circle', { cx: 5.6, cy: 0, r: 0.5, fill: 'rgba(20,20,15,0.35)' });
    [hull, thwart, bow].forEach(n => float.appendChild(n));
  } else if (so.type === 'argo') {
    const body = el('circle', { cx: 0, cy: 0, r: 2.1, fill: '#efe9dc', stroke: '#d9622e', 'stroke-width': 0.6 });
    const cap = el('circle', { cx: 0, cy: 0, r: 0.7, fill: '#d9622e' });
    const antenna = el('line', { x1: 0, y1: 0, x2: 3.4, y2: -1.1, stroke: '#8a8578', 'stroke-width': 0.35 });
    [body, antenna, cap].forEach(n => float.appendChild(n));
  } else if (so.type === 'debris') {
    if (so.variant === 'bottle') {
      const body = el('ellipse', { cx: 0, cy: 0.3, rx: 1.1, ry: 2.6, fill: 'rgba(120,160,120,0.75)', stroke: 'rgba(20,20,15,0.3)', 'stroke-width': 0.25 });
      const cap = el('circle', { cx: 0, cy: -2.3, r: 0.6, fill: 'rgba(70,90,70,0.85)' });
      [body, cap].forEach(n => float.appendChild(n));
    } else if (so.variant === 'bag') {
      const bag = el('path', { d: 'M -2.6,-0.8 Q -1.2,-2.4 0.4,-1.6 Q 2.4,-1.8 2.2,0.4 Q 2.6,2.2 0.2,2.2 Q -2.2,2.4 -2.6,-0.8 Z', fill: 'rgba(230,230,225,0.6)', stroke: 'rgba(120,120,110,0.4)', 'stroke-width': 0.25 });
      float.appendChild(bag);
    } else {
      const crate = el('rect', { x: -2.2, y: -2.2, width: 4.4, height: 4.4, fill: 'rgba(139,90,43,0.85)', stroke: 'rgba(60,35,15,0.5)', 'stroke-width': 0.3 });
      const slat = el('line', { x1: -2.2, y1: 0, x2: 2.2, y2: 0, stroke: 'rgba(60,35,15,0.5)', 'stroke-width': 0.3 });
      const slat2 = el('line', { x1: 0, y1: -2.2, x2: 0, y2: 2.2, stroke: 'rgba(60,35,15,0.5)', 'stroke-width': 0.3 });
      [crate, slat, slat2].forEach(n => float.appendChild(n));
    }
  } else if (so.type === 'whale') {
    const body = el('ellipse', { cx: -0.6, cy: 0, rx: 8.2, ry: 2.9, fill: '#3c4f5c' });
    const belly = el('ellipse', { cx: -0.6, cy: 0.3, rx: 6.6, ry: 1.5, fill: '#5b7583' });
    const tail = el('path', { d: 'M 7.4,0 Q 9.6,-2.6 11,-3.2 Q 9.6,0 11,3.2 Q 9.6,2.6 7.4,0 Z', fill: '#3c4f5c' });
    const blowhole = el('circle', { cx: -6.6, cy: 0, r: 0.5, fill: '#1f2a30' });
    [body, tail, belly, blowhole].forEach(n => float.appendChild(n));
  }
  return g;
}
function buildSeaObjectsLayer() {
  const g = el('g', { class: 'sea-object-layer' });
  SEA_OBJECTS.forEach(so => g.appendChild(buildSeaObject(so)));
  return g;
}

// --- Animali strani, in scena come SEA_OBJECTS (statici, a colori, non cliccabili) ---
// Stessa logica delle mini-isole: rot:0 fisso già da ora (immagini fotorealistiche in
// arrivo da Gemini, ruotarle sembrerebbe sbagliato) e supporto img/imgAspect pronto per
// quando arrivano le immagini vere — placeholder procedurale (sagoma generica) nel
// frattempo. ANIMAL_SCALE = fattore di scala del <g> esterno (unico, uguale per
// placeholder e immagine vera). ANIMAL_IMG_W = larghezza dell'immagine in unità locali,
// pensata per dare una taglia finale comparabile al placeholder che sostituisce (corpo
// rx:2.2 → diametro ~4.4).
// stesso discorso di SEA_SCALE sopra: 34 dava creature larghe 4-7px a schermo, invisibili.
// 150 restava ancora "quasi non si vedono" (richiesta esplicita) — ritarato più su, poi
// raddoppiato di nuovo ("grandi il doppio").
const ANIMAL_SCALE = 520;
const ANIMAL_IMG_W = 4.6;
const ANIMAL_IMG_ASPECT = 600 / 327;
// raddoppiati (ogni specie compare 2 volte, posizioni diverse) e più sparsi in acqua aperta
// — richiesto esplicitamente ("fanne il doppio... falli più sparsi").
const ANIMALS: Array<{ gx: number; gy: number; rot: number; size: number; color: string; img?: string; imgAspect?: number }> = [
  { gx: 150, gy: 380, rot: 0, size: 1.0, color: '#8a6a9c', img: '/assets/animals/narwhalopus.png' },
  { gx: -230, gy: 400, rot: 0, size: 0.85, color: '#4a7a6a', img: '/assets/animals/turtlejelly.png' },
  { gx: 330, gy: -260, rot: 0, size: 1.1, color: '#b06a4a', img: '/assets/animals/anglerfish.png' },
  { gx: -330, gy: 20, rot: 0, size: 0.75, color: '#5a6a9c', img: '/assets/animals/axolotl.png' },
  { gx: -260, gy: -420, rot: 0, size: 0.95, color: '#9c7a4a', img: '/assets/animals/butterflyfish.png' },
  { gx: 480, gy: 70, rot: 0, size: 1.05, color: '#8a6a9c', img: '/assets/animals/narwhalopus.png' },
  { gx: -480, gy: -190, rot: 0, size: 0.9, color: '#4a7a6a', img: '/assets/animals/turtlejelly.png' },
  { gx: 160, gy: 480, rot: 0, size: 1.15, color: '#b06a4a', img: '/assets/animals/anglerfish.png' },
  { gx: 480, gy: 360, rot: 0, size: 0.8, color: '#5a6a9c', img: '/assets/animals/axolotl.png' },
  { gx: -140, gy: -480, rot: 0, size: 1.0, color: '#9c7a4a', img: '/assets/animals/butterflyfish.png' },
];
function buildAnimal(a: { gx: number; gy: number; rot: number; size: number; color: string; img?: string; imgAspect?: number }) {
  const p = proj(a.gx, a.gy);
  const scale = ANIMAL_SCALE * a.size;
  const g = el('g', { class: 'animal', transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)}) rotate(${a.rot}) scale(${scale.toFixed(1)})` });
  // stesso wrapper "float" degli oggetti del mare, per il galleggiamento via CSS.
  const seed = Math.abs(a.gx * 11 + a.gy * 17) % 100;
  const dur = (3.4 + (seed % 15) / 10).toFixed(2);
  const delay = (-(seed % 23) / 10).toFixed(2);
  const float = el('g', { class: 'animal-float', style: `animation-duration:${dur}s;animation-delay:${delay}s;` });
  g.appendChild(float);
  // niente più ombra sotto: a taglia grande risultava storta/disallineata — tolta del tutto
  // su richiesta esplicita ("non mettere ombre storte, anzi non metterle proprio").
  if (a.img) {
    const W = ANIMAL_IMG_W, H = W / (a.imgAspect || ANIMAL_IMG_ASPECT);
    const img = el('image', { href: a.img, x: (-W / 2).toFixed(2), y: (-H / 2).toFixed(2), width: W.toFixed(2), height: H.toFixed(2), preserveAspectRatio: 'xMidYMid meet' });
    float.appendChild(img);
    return g;
  }
  // placeholder generico: corpo + coda + due "appendici" stravaganti + occhio, così da
  // suggerire "creatura strana" senza dover disegnare 5 animali diversi a mano.
  const body = el('ellipse', { cx: 0, cy: 0, rx: 2.2, ry: 1.3, fill: a.color, stroke: 'rgba(20,20,15,0.35)', 'stroke-width': 0.15 });
  const tail = el('path', { d: 'M 2.1,0 Q 3.4,-0.9 3.8,-1.6 Q 3.2,-0.1 3.8,1.6 Q 3.4,0.9 2.1,0 Z', fill: a.color, opacity: 0.85 });
  const fin1 = el('path', { d: 'M -0.6,-1.1 Q -1.3,-2.2 -0.3,-2.4 Q 0.4,-1.6 -0.6,-1.1 Z', fill: a.color, opacity: 0.7 });
  const fin2 = el('path', { d: 'M -0.9,1.1 Q -1.9,1.7 -1.4,2.4 Q -0.4,2.0 -0.9,1.1 Z', fill: a.color, opacity: 0.7 });
  const eye = el('circle', { cx: -1.5, cy: -0.3, r: 0.22, fill: '#1f2a30' });
  [body, tail, fin1, fin2, eye].forEach(n => float.appendChild(n));
  return g;
}
function buildAnimalsLayer() {
  const g = el('g', { class: 'animal-layer' });
  ANIMALS.forEach(a => g.appendChild(buildAnimal(a)));
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
  // griglia più grande in mobile ("la griglia la voglio più grande" — richiesta esplicita):
  // stesso mosaico, ma tessere più larghe così si legge meglio su schermo piccolo.
  const isMobileView = wrapRect.width > 0 && wrapRect.width <= 760;
  const MOSAIC_CELL = isMobileView ? 176 : 96;
  const MOSAIC_SUB = 4;
  const projMatrix = `matrix(${GX_X},${GX_Y},${-GY_X},${GY_Y},0,0)`;
  // stroke-width irregolare per tassello (non più un valore fisso): righe di grout un po'
  // più larghe, un po' più sottili — "onde più irregolari come larghezza di stroke",
  // richiesto esplicitamente. Seed fisso per rendering, ricalcolato solo ad ogni rebuild.
  function mosaicTilesSVG(sub: number, baseFill: string, accentFill: string, accentCells: number[][], groutColor: string, groutW: number) {
    const s = MOSAIC_CELL / sub;
    let out = '';
    for (let i = 0; i < sub; i++) for (let j = 0; j < sub; j++) {
      const isAccent = accentCells.some(([ai, aj]) => ai === i && aj === j);
      const w = (groutW + (Math.random() - 0.5) * groutW * 0.85).toFixed(2);
      out += `<rect x="${(i * s).toFixed(2)}" y="${(j * s).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}"
        fill="${isAccent ? accentFill : baseFill}" stroke="${groutColor}" stroke-width="${w}"/>`;
    }
    return out;
  }
  const mosaicDeepSVG = `
    <pattern id="mosaicDeep" patternUnits="userSpaceOnUse" width="${MOSAIC_CELL}" height="${MOSAIC_CELL}" patternTransform="${projMatrix}">
      ${mosaicTilesSVG(MOSAIC_SUB, '#3d5a8f', '#32507f', [[0, 2], [3, 1]], '#eef4fc', 2.6)}
    </pattern>`;
  const mosaicMidSVG = `
    <pattern id="mosaicMid" patternUnits="userSpaceOnUse" width="${MOSAIC_CELL}" height="${MOSAIC_CELL}" patternTransform="${projMatrix}">
      ${mosaicTilesSVG(MOSAIC_SUB, '#5c7ab8', '#4a6aa8', [[2, 1], [0, 3]], '#f2f6fd', 2.6)}
    </pattern>`;
  const mosaicShallowSVG = `
    <pattern id="mosaicShallow" patternUnits="userSpaceOnUse" width="${MOSAIC_CELL}" height="${MOSAIC_CELL}" patternTransform="${projMatrix}">
      ${mosaicTilesSVG(MOSAIC_SUB, '#8aa3d6', '#7590c6', [[1, 0], [2, 3]], '#f7faff', 2.6)}
    </pattern>`;
  // "seaWobble": due passaggi in catena. Il primo (statico, seed fisso) è il vecchio wobble
  // "dipinto a mano" — le linee non sono perfettamente rette come il resto della board (case/
  // isole restano nitide, solo il mare "respira"). Il secondo è un'onda vera: stessa idea ma
  // con la "scale" di feDisplacementMap animata via <animate> SMIL (nessun JS extra), così la
  // griglia/grout più spessa ondeggia lentamente avanti e indietro come schiuma sull'acqua.
  const handWobbleSVG = `
    <filter id="seaWobble" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.010" numOctaves="2" seed="7" result="handN"/>
      <feDisplacementMap in="SourceGraphic" in2="handN" scale="55" xChannelSelector="R" yChannelSelector="G" result="handWobbled"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.020" numOctaves="2" seed="21" result="waveN"/>
      <feDisplacementMap id="waveDisp" in="handWobbled" in2="waveN" scale="28" xChannelSelector="R" yChannelSelector="G"/>
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
  const seaG = el('g', { filter: 'url(#seaWobble)' });
  seaG.appendChild(el('rect', { x: vbX.toFixed(1), y: vbY.toFixed(1), width: vbW.toFixed(1), height: vbH.toFixed(1), fill: 'url(#mosaicDeep)' }));
  // gli "scalini" chiari intorno a ogni isola grande vanno in un gruppo a parte
  // (.main-island-steps), nascosto in mobile insieme alle isole stesse (.main-island): senza
  // l'isola sopra, questi resterebbero macchie chiare senza motivo — "devono stare sotto
  // alle isole, non a caso", richiesto esplicitamente.
  const islandStepsG = el('g', { class: 'main-island-steps' });
  seaG.appendChild(islandStepsG);
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
      islandStepsG.appendChild(el('polygon', { points: ptsStr, fill: `url(#${step.pattern})` }));
      islandStepsG.appendChild(el('polygon', { points: ptsStr, fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 2.2 }));
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

  // ---- omini piatti: montati QUI, PRIMA delle isole, così nell'ordine di disegno SVG (chi
  // viene dopo sta sopra) le isole finiscono sempre sopra agli omini — mai il contrario. Il
  // DOM va ricreato a ogni rebuild, ma la simulazione (posizioni/velocità) persiste.
  WalkerLayer.mount(svg);

  // ---- mini-isole/terreni decorativi, non cliccabili — vedi buildMiniIslandsLayer più
  // sopra. Dopo gli omini (così coprono chi vi passa sotto) ma prima delle isole vere,
  // che restano sempre l'elemento più in primo piano della board.
  svg.appendChild(buildMiniIslandsLayer());

  // ---- "oggettini" del mare (barche/boe/detriti/balene): statici, non cliccabili — vedi
  // buildSeaObjectsLayer più sopra.
  svg.appendChild(buildSeaObjectsLayer());

  // ---- animali strani: statici, non cliccabili, a colori (non desaturati) — vedi
  // buildAnimalsLayer più sopra.
  svg.appendChild(buildAnimalsLayer());

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

    const wrap = el('g', { class: 'main-island' });
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
  requestAnimationFrame(tickSeaWave);
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

/* mini-isole/terreni decorativi: desaturati e un filo spenti, così restano sullo sfondo e
   non competono con le 5 isole vere (a colori, interattive, sempre più in primo piano).
   pointer-events:none — per sicurezza, anche se non hanno già nessun bottone/handler: non
   devono MAI intercettare hover/click destinati al mare/agli omini sotto. */
.mini-island{ filter:grayscale(1) brightness(0.94) contrast(1.05); opacity:0.82; pointer-events:none; }

/* "oggettini" del mare (barche/boe/detriti/balene): statici, non cliccabili, ma NON
   desaturati come le mini-isole — sono oggetti "in scena", a colori come le isole. */
.sea-object{ pointer-events:none; }
.animal{ pointer-events:none; }
/* galleggiamento: piccolo bob verticale + rollio, per dare l'idea che animali e oggetti
   siano in acqua (e non semplicemente "appoggiati"). Durata/ritardo per-istanza sono
   impostati inline (vedi buildSeaObject/buildAnimal) così non ondeggiano in sincrono.
   Unità: locali al <g> già scalato dal padre, quindi valori piccoli bastano. */
.sea-object-float, .animal-float{
  animation-name: floatBob;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes floatBob{
  0%   { transform: translate(0, 0)      rotate(0deg); }
  25%  { transform: translate(0.02, -0.09) rotate(1.1deg); }
  50%  { transform: translate(0, -0.14)   rotate(0deg); }
  75%  { transform: translate(-0.02, -0.09) rotate(-1.1deg); }
  100% { transform: translate(0, 0)      rotate(0deg); }
}
@media (prefers-reduced-motion: reduce){
  .sea-object-float, .animal-float{ animation:none; }
}

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
  /* la board isometrica resta MONTATA anche in mobile — non più "display:none" — così lo
     sfondo è la stessa scena del desktop (mare/mosaico, mini-isole, animali, oggetti,
     omini) invece di un gradiente piatto. Diventa uno sfondo fisso a schermo intero,
     dietro la lista di card: non cliccabile/non scrollabile di suo, e le isole grandi
     cliccabili (.main-island) restano nascoste perché la navigazione qui è la lista, non i
     tap sulla mappa. */
  .board-wrap{
    display:flex;
    position:fixed; inset:0;
    z-index:0;
    pointer-events:none;
  }
  .main-island{ display:none; }
  .main-island-steps{ display:none; }
  .board-root{ min-height: 100%; }
  /* padding-top più ampio: la topbar è "position:absolute" sopra tutto (icone 80px +
     etichetta + padding verticale ≈ 130px) e prima la prima isola ci finiva sotto. */
  .list{ position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:28px; padding:150px 20px 32px; flex:1 1 auto; min-height:0; overflow:auto; }
  .list .house{ width:92%; max-width:420px; text-decoration:none; color:inherit; display:block; background:none; border:none; padding:0; cursor:pointer; font:inherit; }
  .list .house img{ width:100%; border-radius:6px; filter: drop-shadow(0 8px 10px rgba(15,13,10,.3)); }
  .list .caption{ font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-align:center; padding-top:6px; text-shadow: 0 1px 3px rgba(255,255,255,.9), 0 1px 3px rgba(255,255,255,.9); }
}
</style>
