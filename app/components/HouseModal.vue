<template>
  <div class="modal-backdrop" :class="{ open: !!house }" :style="{ '--accent': accentColor }" @click.self="$emit('close')">
    <div v-if="house" class="modal-shell">
      <div class="modal-glow" aria-hidden="true"></div>
      <div :key="house.slug" class="modal-window" role="dialog" aria-modal="true" :aria-label="`Isola 0${house.number} — ${house.title}`">
        <!-- griglia di quadratini che "costruisce" il modal all'apertura (richiesta
             esplicita: "animazione tipo griglia che si forma a quadrati") — ogni tile appare
             e sparisce con un ritardo crescente dal centro verso i bordi, poi resta il modal
             vero sotto. :key sopra forza Vue a ricreare il DOM (e quindi l'animazione) ogni
             volta che si apre un articolo diverso. -->
        <div class="modal-tiles" aria-hidden="true">
          <span
            v-for="t in tiles" :key="t.key" class="modal-tile" :class="{ alt: t.alt }"
            :style="{ left: t.left, top: t.top, width: t.w, height: t.h, '--d': t.delay + 's' }"
          ></span>
        </div>
        <!-- grain/rumore sopra la griglia in formazione ("noise sull'animazione del modal",
             richiesto) — texture di rumore che sfarfalla (steps, non un fade morbido) e si
             spegne insieme alla griglia, per un effetto pellicola/materializzazione invece di
             un dissolvimento pulito. -->
        <div class="modal-grain" aria-hidden="true"></div>
        <div class="modal-titlebar">
          <span>{{ house.title }}</span>
          <div class="modal-actions">
            <NuxtLink
              :to="`/articolo/${house.slug}`"
              class="modal-open"
              :aria-label="`Apri '${house.title}' in una pagina dedicata`"
              title="Apri in una pagina dedicata"
              @click="$emit('close')"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
                <path d="M8 4H4.8A1.8 1.8 0 0 0 3 5.8v9.4A1.8 1.8 0 0 0 4.8 17h9.4A1.8 1.8 0 0 0 16 15.2V12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 3h6v6M17 3l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </NuxtLink>
            <button class="modal-close" type="button" aria-label="Chiudi" @click="$emit('close')">✕</button>
          </div>
        </div>
        <div class="modal-body">
          <p v-if="house.excerpt" class="modal-excerpt">{{ house.excerpt }}</p>
          <div v-html="bodyHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

const props = defineProps<{ house: any | null }>();
const emit = defineEmits<{ close: [] }>();

// colore "identità" di ogni isola — stessa famiglia cromatica del bioma/tema di ognuna
// (vedi disco-mockup per i riferimenti originali): usato per lo sfondo dietro il modal, il
// bagliore sfocato/opalescente e l'header — "adattati a ogni isola corrispondente".
const HOUSE_ACCENTS: Record<number, string> = {
  1: '#c9743a', // Charlotte — blocco urbano, graffiti, terracotta
  2: '#d9b26a', // Fareda — oasi desertica, sabbia/oro
  3: '#7fae7a', // April — giardino giapponese, verde
  4: '#b9835a', // Nicole — terra spaccata, ruggine/tan
  5: '#b45fae', // Crassula — composto nebbioso, magenta
  6: '#7a9a5a', // The Editors — isola centrale, verde salvia
};
const accentColor = computed(() => HOUSE_ACCENTS[props.house?.number] || '#5c7ab8');

// griglia di tile per l'animazione di apertura: ritardo crescente dal centro verso i bordi
// (radiale), più un piccolo jitter così non sembra un metronomo. Ricalcolata ad ogni nuova
// isola aperta (house cambia) — vedi :key="house.slug" nel template per il restart CSS.
const TILE_COLS = 20, TILE_ROWS = 13; // unità più piccole ("griglia con unità più piccole", richiesto)
const tiles = computed(() => {
  if (!props.house) return [];
  const list: Array<{ key: string; left: string; top: string; w: string; h: string; delay: string; alt: boolean }> = [];
  const cx = (TILE_COLS - 1) / 2, cy = (TILE_ROWS - 1) / 2;
  const maxDist = Math.hypot(cx, cy);
  for (let r = 0; r < TILE_ROWS; r++) {
    for (let c = 0; c < TILE_COLS; c++) {
      const dist = Math.hypot(c - cx, r - cy) / maxDist;
      const jitter = Math.random() * 0.1;
      list.push({
        key: `${r}-${c}`,
        left: (c / TILE_COLS * 100).toFixed(3) + '%',
        top: (r / TILE_ROWS * 100).toFixed(3) + '%',
        w: (100 / TILE_COLS).toFixed(3) + '%',
        h: (100 / TILE_ROWS).toFixed(3) + '%',
        delay: (dist * 0.26 + jitter).toFixed(3),
        alt: (r + c) % 2 === 0,
      });
    }
  }
  return list;
});

// mini-markdown per il corpo articolo, usato solo per l'array di paragrafi semplici (dati
// locali di esempio): righe che iniziano con "## " diventano un sottotitolo (h3), righe che
// iniziano con "> " diventano una citazione (blockquote), il resto un paragrafo normale — più
// **grassetto**, *corsivo* e [link](url) inline. Il documento Rich Text di Contentful ha già
// stili differenziati nativamente (documentToHtmlString li rende come h1-h6/blockquote/ecc.),
// quindi non serve applicargli anche questo.
function mdInline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function renderBody(paragraphs: string[]) {
  return paragraphs.map(p => {
    if (p.startsWith('## ')) return `<h3>${mdInline(p.slice(3))}</h3>`;
    if (p.startsWith('> ')) return `<blockquote>${mdInline(p.slice(2))}</blockquote>`;
    return `<p>${mdInline(p)}</p>`;
  }).join('');
}

// house.body può essere: un documento Rich Text di Contentful, un array di paragrafi
// semplici (dati locali di esempio), oppure assente — stessa logica di prima in
// app/pages/articolo/[slug].vue (quella pagina resta, per link diretti).
const bodyHtml = computed(() => {
  const body = props.house?.body as any;
  if (!body) return "";
  if (Array.isArray(body)) return renderBody(body);
  if (typeof body === "object" && body.nodeType === "document") return documentToHtmlString(body);
  return String(body);
});

// Esc per chiudere — struttura neutra per ora, stile "The Sims" da decidere dopo.
function onKey(e: KeyboardEvent) { if (e.key === "Escape" && props.house) emit("close"); }
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<style>
/* non scoped sull'essenziale: v-html inserisce markup che lo scoping non raggiungerebbe */
.modal-backdrop{
  display:none;
  position:fixed; inset:0;
  /* "sfondo dietro il modal può prendere il colore dell'isola" — tinta radiale verso
     --accent (impostato inline sul backdrop, eredita fino a modal-glow/modal-window). */
  background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--accent, #5c7ab8) 30%, rgba(20,17,12,0.5)) 0%, rgba(20,17,12,0.55) 65%);
  align-items:center; justify-content:center;
  z-index:100;
  padding:24px;
}
.modal-backdrop.open{ display:flex; }

.modal-shell{ position:relative; width:100%; max-width:1180px; }
/* bagliore sfocato/opalescente col colore dell'isola, dietro al modal */
.modal-glow{
  position:absolute; inset:-70px;
  background: radial-gradient(circle at 50% 45%, var(--accent) 0%, transparent 72%);
  filter: blur(64px);
  opacity:.55;
  z-index:-1;
  pointer-events:none;
}

/* finestra più larga ("fare più largo il modal", richiesta esplicita) — non a tutto schermo,
   resta una finestra interna alla pagina. Trattamento skeumorfico: bordo chiaro/rilievo che
   simula uno smusso fisico (chiaro in alto, ombra interna in basso) sopra il classico drop
   shadow "sotto al modal", per farla sembrare un pannello solido appoggiato sulla pagina
   invece di un rettangolo piatto — stesso spirito delle finestre stile SimCity2000/A-Train
   che hanno ispirato il resto del sito. */
.modal-window{
  position:relative;
  background: linear-gradient(180deg, #fffdf7, #f4f0e4);
  border-radius:14px;
  border: 1px solid rgba(40,30,15,0.18);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.9),
    inset 0 -1px 0 rgba(40,30,15,0.08),
    0 4px 0 rgba(74,106,168,0.35),
    0 38px 64px -14px rgba(15,26,46,0.48),
    0 14px 28px rgba(15,26,46,0.28);
  width:100%;
  max-height:92vh;
  overflow:auto;
  isolation:isolate; /* la griglia di tile (z-index:5) resta dentro il modal, non sopra ad altro */
}

/* ---- griglia di apertura: quadratini col colore dell'isola che appaiono e spariscono in
   sequenza dal centro verso i bordi, "costruendo" il modal prima che compaia il contenuto. */
.modal-tiles{ position:absolute; inset:0; z-index:5; pointer-events:none; overflow:hidden; }
.modal-tile{
  position:absolute;
  background: var(--accent);
  opacity:0;
  transform: scale(.2);
  animation: modalTileIn .3s cubic-bezier(.2,.8,.2,1) forwards, modalTileOut .3s ease forwards;
  animation-delay: var(--d), calc(var(--d) + .3s);
}
.modal-tile.alt{ background: color-mix(in srgb, var(--accent) 65%, white 25%); }
@keyframes modalTileIn{ from{ opacity:0; transform:scale(.2); } to{ opacity:1; transform:scale(1); } }
@keyframes modalTileOut{ to{ opacity:0; } }

/* grain/rumore sopra la griglia: texture generata via SVG (feTurbulence), niente asset
   esterni. mix-blend-mode:overlay così si "morde" nei colori dei tile invece di stare
   sopra come un velo piatto; il background-position salta a scatti (steps) — non un
   movimento fluido — per leggersi come sfarfallio di grana pellicola, coerente con la
   griglia che si forma a scatti sotto. Si spegne insieme alla griglia (~0.95s totali). */
.modal-grain{
  position:absolute; inset:0; z-index:6; pointer-events:none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:160px 160px;
  mix-blend-mode:overlay;
  opacity:0;
  animation: modalGrainFlicker .95s steps(1) forwards;
}
@keyframes modalGrainFlicker{
  0%   { opacity:.65; background-position:0 0; }
  8%   { opacity:.55; background-position:-37px 21px; }
  16%  { opacity:.6;  background-position:29px -44px; }
  24%  { opacity:.5;  background-position:-58px -12px; }
  32%  { opacity:.55; background-position:14px 33px; }
  40%  { opacity:.45; background-position:-22px 57px; }
  48%  { opacity:.5;  background-position:46px -6px; }
  56%  { opacity:.4;  background-position:-9px -39px; }
  64%  { opacity:.35; background-position:33px 18px; }
  72%  { opacity:.25; background-position:-44px 4px; }
  84%  { opacity:.12; background-position:18px -27px; }
  100% { opacity:0;   background-position:0 0; }
}

/* header adattato all'isola (era un azzurro fisso) — versione più chiara/opalescente
   dell'accent, così il testo bianco resta leggibile su ogni colore della palette. Sheen
   lucido in alto (::before) + bevel inferiore, per farla leggere come una barra fisica
   (stile title-bar di un vecchio OS) invece di un blocco di colore piatto. */
.modal-titlebar{
  position:relative; z-index:1;
  top:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 28px;
  border-radius:13px 13px 0 0;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 78%, #2c2620 10%), color-mix(in srgb, var(--accent) 55%, white 20%));
  color:#f8f6ef;
  text-shadow: 0 1px 1px rgba(0,0,0,0.25);
  font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size:14px; letter-spacing:.02em;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.4),
    inset 0 -2px 0 rgba(0,0,0,0.12);
  overflow:hidden;
  opacity:0;
  animation: modalContentIn .4s ease forwards;
  animation-delay: .5s;
}
.modal-titlebar::before{
  content:'';
  position:absolute; inset:0 0 55% 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
  pointer-events:none;
}
.modal-actions{ position:relative; display:flex; align-items:center; gap:8px; }
/* bottoni "a disco", in rilievo — luce in alto/sinistra, ombra in basso/destra come un
   tasto fisico; in hover/press si "schiacciano" (ombre invertite). */
.modal-open, .modal-close{
  all:unset; cursor:pointer; line-height:1; box-sizing:border-box;
  display:flex; align-items:center; justify-content:center;
  width:26px; height:26px; text-align:center;
  border-radius:50%;
  color:#4a4030;
  background: linear-gradient(145deg, #fffdf8, #ddd6c4);
  box-shadow:
    0 1px 2px rgba(0,0,0,0.35),
    inset 0 1px 1px rgba(255,255,255,0.9),
    inset 0 -1px 2px rgba(0,0,0,0.18);
  transition: transform .12s ease, box-shadow .12s ease;
}
.modal-open:hover, .modal-close:hover{ transform: translateY(1px); }
.modal-open:active, .modal-close:active{
  transform: translateY(1px);
  box-shadow:
    inset 0 1px 3px rgba(0,0,0,0.35),
    inset 0 -1px 0 rgba(255,255,255,0.4);
}
.modal-body{
  position:relative; z-index:1;
  padding:28px 34px 34px; margin:0 auto;
  opacity:0;
  animation: modalContentIn .4s ease forwards;
  animation-delay: .58s;
}
@keyframes modalContentIn{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:translateY(0); } }
.modal-excerpt{ font-style:italic; color:var(--ink-soft); }
/* ---- stili di testo differenziati dentro l'articolo: paragrafo normale, sottotitolo (h3),
   citazione/estratto (blockquote), grassetto/corsivo/link inline — così il corpo non è più
   un unico blocco uniforme di testo. */
.modal-body p{ font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size:15px; line-height:1.7; color:var(--ink); margin:0 0 16px; }
.modal-body h3{
  font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 20px; font-weight: normal; font-style: italic;
  color: var(--ink); margin: 28px 0 10px;
}
.modal-body blockquote{
  margin: 20px 0; padding: 4px 0 4px 18px;
  border-left: 3px solid #c9a86a;
  font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 17px; font-style: italic; line-height:1.5;
  color: #4a4438;
}
.modal-body strong{ font-weight:700; }
.modal-body em{ font-style:italic; }
.modal-body a{ color:#8a5a2b; text-decoration:underline; text-underline-offset:2px; }
.modal-body a:hover{ color:#b3752f; }
</style>
