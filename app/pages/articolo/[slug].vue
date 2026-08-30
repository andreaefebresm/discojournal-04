<template>
  <article v-if="house">
    <NuxtLink to="/" class="back">← torna al tabellone</NuxtLink>
    <div class="badge">Isola 0{{ house.number }}</div>
    <h1>{{ house.title }}</h1>
    <img v-if="house.image" :src="house.image.url" :alt="house.title" class="hero" />
    <div class="body" v-html="bodyHtml"></div>
  </article>
  <p v-else-if="pending" class="note">Caricamento…</p>
  <p v-else class="note">Articolo non trovato.</p>
</template>

<script setup lang="ts">
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

const route = useRoute();
const { data: house, pending } = await useFetch(`/api/houses/${route.params.slug}`);

// house.body può essere: un documento Rich Text di Contentful (oggetto con nodeType "document"),
// un array di paragrafi semplici (i dati locali di esempio), oppure assente.
const bodyHtml = computed(() => {
  const body = house.value?.body as any;
  if (!body) return "";
  if (Array.isArray(body)) return body.map((p: string) => `<p>${p}</p>`).join("");
  if (typeof body === "object" && body.nodeType === "document") return documentToHtmlString(body);
  return String(body);
});
</script>

<style scoped>
article{ max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; font-family: Georgia, serif; color:#232019; }
.back{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:12px; color:#6b6558; text-decoration:none; }
.badge{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#b0a98f; margin-top:20px; }
h1{ font-weight:normal; font-size:32px; margin: 6px 0 24px; }
.hero{ width:100%; border-radius:6px; margin-bottom:24px; filter: drop-shadow(0 10px 16px rgba(15,13,10,.2)); }
.body{ line-height:1.7; font-size:16px; }
.note{ text-align:center; padding:60px 24px; font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; color:#6b6558; }
</style>
