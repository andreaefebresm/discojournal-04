<template>
  <div class="modal-backdrop" :class="{ open: !!house }" @click.self="$emit('close')">
    <div v-if="house" class="modal-window" role="dialog" aria-modal="true" :aria-label="`Isola 0${house.number} — ${house.title}`">
      <div class="modal-titlebar">
        <span>Isola 0{{ house.number }} — {{ house.title }}</span>
        <button class="modal-close" type="button" aria-label="Chiudi" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <img v-if="house.image" :src="house.image.url" :alt="house.title" />
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
/* finestra più larga e più alta ("più larghe e grandi", rif. screenshot mandato) — non a
   tutto schermo, resta una finestra interna alla pagina, ma con molto più respiro per
   immagine e testo. */
.modal-window{
  background:#faf8f2;
  border-radius:8px;
  box-shadow:0 24px 48px rgba(15,13,10,0.4);
  width:100%; max-width:900px;
  max-height:92vh;
  overflow:auto;
}
.modal-titlebar{
  position:sticky; top:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 22px;
  background:#2c2620; color:#efe9d8;
  border-radius:8px 8px 0 0;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size:14px; letter-spacing:.02em;
}
.modal-close{
  all:unset; cursor:pointer; line-height:1;
  width:22px; height:22px; text-align:center;
  border-radius:4px;
  color: inherit;
}
.modal-close:hover{ background:rgba(255,255,255,0.15); }
.modal-body{ padding:28px 34px 34px; max-width:680px; margin:0 auto; }
.modal-body img{ width:100%; border-radius:6px; display:block; margin-bottom:20px; filter: drop-shadow(0 10px 16px rgba(15,13,10,0.2)); }
.modal-excerpt{ font-style:italic; color:var(--ink-soft); }
/* ---- stili di testo differenziati dentro l'articolo: paragrafo normale, sottotitolo (h3),
   citazione/estratto (blockquote), grassetto/corsivo/link inline — così il corpo non è più
   un unico blocco uniforme di testo. */
.modal-body p{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:15px; line-height:1.7; color:var(--ink); margin:0 0 16px; }
.modal-body h3{
  font-family: Georgia, "Iowan Old Style", serif;
  font-size: 20px; font-weight: normal; font-style: italic;
  color: var(--ink); margin: 28px 0 10px;
}
.modal-body blockquote{
  margin: 20px 0; padding: 4px 0 4px 18px;
  border-left: 3px solid #c9a86a;
  font-family: Georgia, "Iowan Old Style", serif;
  font-size: 17px; font-style: italic; line-height:1.5;
  color: #4a4438;
}
.modal-body strong{ font-weight:700; }
.modal-body em{ font-style:italic; }
.modal-body a{ color:#8a5a2b; text-decoration:underline; text-underline-offset:2px; }
.modal-body a:hover{ color:#b3752f; }
</style>
