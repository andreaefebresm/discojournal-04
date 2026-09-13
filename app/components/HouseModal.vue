<template>
  <div class="modal-backdrop" :class="{ open: !!house }" @click.self="$emit('close')">
    <div v-if="house" class="modal-window" role="dialog" aria-modal="true" :aria-label="`Isola 0${house.number} — ${house.title}`">
      <div class="modal-titlebar">
        <span>Isola 0{{ house.number }} — {{ house.title }}</span>
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
</template>

<script setup lang="ts">
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

const props = defineProps<{ house: any | null }>();
const emit = defineEmits<{ close: [] }>();

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
  background:rgba(20,17,12,0.45);
  align-items:center; justify-content:center;
  z-index:100;
  padding:24px;
}
.modal-backdrop.open{ display:flex; }
/* finestra più larga ("fare più largo il modal", richiesta esplicita) — non a tutto schermo,
   resta una finestra interna alla pagina. Ombra sotto rinforzata/a due strati, per staccarla
   meglio dallo sfondo ("ombra sotto al modal"). Stroke tutto intorno color grout/spuma del
   mosaico del mare ("come quello delle onde") — vedi mosaicMid/mosaicShallow in IsoBoard.vue,
   stessa famiglia di azzurri e la stessa riga chiara che separa i tasselli. */
.modal-window{
  background:#faf8f2;
  border-radius:10px;
  border: 2px solid #eef4fc;
  box-shadow:
    0 4px 0 rgba(74,106,168,0.35),
    0 38px 64px -14px rgba(15,26,46,0.48),
    0 14px 28px rgba(15,26,46,0.28);
  width:100%; max-width:1180px;
  max-height:92vh;
  overflow:auto;
}
/* header "azzurro come lo sfondo sotto" — stessa coppia di blu del mosaico mid/shallow che
   si vede dietro il modal sulla board (vedi mosaicMidSVG/mosaicShallowSVG in IsoBoard.vue). */
.modal-titlebar{
  position:sticky; top:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 22px;
  background: linear-gradient(135deg, #5c7ab8, #7590c6);
  color:#f4f8ff;
  border-radius:7px 7px 0 0;
  font-family: "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size:14px; letter-spacing:.02em;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.25);
}
.modal-actions{ display:flex; align-items:center; gap:4px; }
.modal-open, .modal-close{
  all:unset; cursor:pointer; line-height:1;
  display:flex; align-items:center; justify-content:center;
  width:26px; height:26px; text-align:center;
  border-radius:5px;
  color: inherit;
}
.modal-open:hover, .modal-close:hover{ background:rgba(255,255,255,0.18); }
.modal-body{ padding:28px 34px 34px; max-width:720px; margin:0 auto; }
.modal-excerpt{ font-style:italic; color:var(--ink-soft); }
/* ---- stili di testo differenziati dentro l'articolo: paragrafo normale, sottotitolo (h3),
   citazione/estratto (blockquote), grassetto/corsivo/link inline — così il corpo non è più
   un unico blocco uniforme di testo. */
.modal-body p{ font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:15px; line-height:1.7; color:var(--ink); margin:0 0 16px; }
.modal-body h3{
  font-family: "Fraunces", Georgia, "Iowan Old Style", serif;
  font-size: 20px; font-weight: normal; font-style: italic;
  color: var(--ink); margin: 28px 0 10px;
}
.modal-body blockquote{
  margin: 20px 0; padding: 4px 0 4px 18px;
  border-left: 3px solid #c9a86a;
  font-family: "Fraunces", Georgia, "Iowan Old Style", serif;
  font-size: 17px; font-style: italic; line-height:1.5;
  color: #4a4438;
}
.modal-body strong{ font-weight:700; }
.modal-body em{ font-style:italic; }
.modal-body a{ color:#8a5a2b; text-decoration:underline; text-underline-offset:2px; }
.modal-body a:hover{ color:#b3752f; }
</style>
