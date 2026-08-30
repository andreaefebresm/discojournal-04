<template>
  <article v-if="about">
    <NuxtLink to="/" class="back">← torna al tabellone</NuxtLink>
    <h1>{{ about.title }}</h1>
    <div class="body" v-html="bodyHtml"></div>
  </article>
  <p v-else-if="pending" class="note">Caricamento…</p>
</template>

<script setup lang="ts">
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

const { data: about, pending } = await useFetch("/api/about");

// stessa mini-sintassi di HouseModal.vue/articolo/[slug].vue: "## " -> sottotitolo, "> " ->
// citazione, **grassetto**/*corsivo*/[link](url) inline — solo per l'array di paragrafi
// semplici (dati locali di esempio). Il Rich Text di Contentful ha già stili nativamente.
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

// about.body può essere: un documento Rich Text di Contentful, un array di paragrafi
// semplici (dati locali di esempio), oppure assente.
const bodyHtml = computed(() => {
  const body = about.value?.body as any;
  if (!body) return "";
  if (Array.isArray(body)) return renderBody(body);
  if (typeof body === "object" && body.nodeType === "document") return documentToHtmlString(body);
  return String(body);
});
</script>

<style scoped>
article{ max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; font-family: "Fraunces", Georgia, serif; color:#232019; }
.back{ font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-decoration:none; }
h1{ font-weight:normal; font-size:32px; margin: 6px 0 24px; }
.body{ line-height:1.7; font-size:16px; font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; }
/* :deep() perché il contenuto di .body arriva via v-html: lo scoping normale (basato su un
   attributo aggiunto agli elementi del template) non raggiunge markup iniettato così — senza
   :deep() queste regole verrebbero silenziosamente ignorate (bug preso e corretto qui). */
.body :deep(h3){ font-family:"Fraunces",Georgia,serif; font-style:italic; font-weight:normal; font-size:20px; margin:28px 0 10px; }
.body :deep(blockquote){ font-family:"Fraunces",Georgia,serif; margin:20px 0; padding:4px 0 4px 18px; border-left:3px solid #c9a86a; font-style:italic; color:#4a4438; }
.note{ text-align:center; padding:60px 24px; font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; color:#6b6558; }
</style>
