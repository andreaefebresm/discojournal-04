<template>
  <article v-if="house">
    <NuxtLink to="/" class="back">← torna al tabellone</NuxtLink>
    <div class="badge">Isola 0{{ house.number }}</div>
    <h1>{{ house.title }}</h1>
    <img v-if="house.image" :src="ctfImg(house.image.url, { w: 1200 })" :alt="house.title" class="hero" loading="lazy" decoding="async" />
    <div class="body" v-html="bodyHtml"></div>
  </article>
  <p v-else-if="pending" class="note">Caricamento…</p>
  <p v-else class="note">Articolo non trovato.</p>
</template>

<script setup lang="ts">
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

const route = useRoute();
const { data: house, pending } = await useFetch(`/api/houses/${route.params.slug}`);

// stessa mini-sintassi di HouseModal.vue: "## " -> sottotitolo, "> " -> citazione,
// **grassetto**/*corsivo*/[link](url) inline — solo per l'array di paragrafi semplici (dati
// locali di esempio). Il Rich Text di Contentful ha già stili differenziati nativamente.
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

// house.body può essere: un documento Rich Text di Contentful (oggetto con nodeType "document"),
// un array di paragrafi semplici (i dati locali di esempio), oppure assente.
const bodyHtml = computed(() => {
  const body = house.value?.body as any;
  if (!body) return "";
  if (Array.isArray(body)) return renderBody(body);
  if (typeof body === "object" && body.nodeType === "document") return documentToHtmlString(body);
  return String(body);
});
</script>

<style scoped>
article{ max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; font-family: "Fraunces", Georgia, serif; color:#232019; }
.back{ font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-decoration:none; }
.badge{ font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#b0a98f; margin-top:20px; }
h1{ font-weight:normal; font-size:32px; margin: 6px 0 24px; }
.hero{ width:100%; border-radius:6px; margin-bottom:24px; filter: drop-shadow(0 10px 16px rgba(15,13,10,.2)); }
.body{ line-height:1.7; font-size:16px; font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; }
/* :deep() perché il contenuto di .body arriva via v-html: lo scoping normale non raggiunge
   markup iniettato così — senza :deep() queste due regole erano silenziosamente ignorate
   (bug preesistente, mai notato: la pagina diretta /articolo/[slug] si usa raramente,
   quasi tutto passa dalla finestra modale — trovato e corretto insieme al bug analogo in
   about.vue). */
.body :deep(h3){ font-family:"Fraunces",Georgia,serif; font-style:italic; font-weight:normal; font-size:20px; margin:28px 0 10px; }
.body :deep(blockquote){ font-family:"Fraunces",Georgia,serif; margin:20px 0; padding:4px 0 4px 18px; border-left:3px solid #c9a86a; font-style:italic; color:#4a4438; }
.note{ text-align:center; padding:60px 24px; font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; color:#6b6558; }
</style>
