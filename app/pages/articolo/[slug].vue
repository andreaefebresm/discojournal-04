<template>
  <article v-if="house">
    <NuxtLink to="/" class="back">← torna al tabellone</NuxtLink>
    <div class="badge">Isola 0{{ house.number }}</div>
    <h1>{{ house.title }}</h1>
    <img v-if="house.image" :src="ctfImg(house.image.url, { w: 1200 })" :alt="house.title" class="hero" loading="lazy" decoding="async" />
    <p v-if="house.excerpt" class="excerpt">{{ house.excerpt }}</p>
    <div class="body" v-html="bodyHtml"></div>
    <!-- note a fine articolo ("footnotes", richiesto), font diverso dal corpo — stesso
         trattamento del modal (.modal-footnotes) per coerenza tra le due viste. -->
    <div v-if="footnotesHtml" class="footnotes">
      <p class="footnotes-label">Footnotes</p>
      <div v-html="footnotesHtml"></div>
    </div>
  </article>
  <p v-else-if="pending" class="note">Caricamento…</p>
  <p v-else class="note">Articolo non trovato.</p>
</template>

<script setup lang="ts">
import { renderArticleBody, renderFootnotes } from "../../utils/article";

const route = useRoute();
const { data: house, pending } = await useFetch(`/api/houses/${route.params.slug}`);

// corpo dell'articolo: concatena articleBody + articleBody2/3/4 (un solo articolo diviso su
// più campi Rich Text perché troppo lungo per un campo solo, richiesto) — vedi
// app/utils/article.ts, condiviso con HouseModal.vue.
const bodyHtml = computed(() => renderArticleBody(house.value));
const footnotesHtml = computed(() => renderFootnotes(house.value));
</script>

<style scoped>
article{ max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; color:#232019; }
.back{ font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size:12px; color:#6b6558; text-decoration:none; }
.badge{ font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#b0a98f; margin-top:20px; }
h1{ font-weight:normal; font-size:32px; margin: 6px 0 24px; }
.hero{ width:100%; border-radius:6px; margin-bottom:24px; filter: drop-shadow(0 10px 16px rgba(15,13,10,.2)); }
/* stesso trattamento dell'estratto nel modal (.modal-excerpt) — coerenza tra le due viste
   dello stesso articolo, richiesta esplicitamente ("formattato come quello nel modal"). */
.excerpt{ font-style:italic; color:#6b6558; font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size:17px; margin:0 0 20px; }
.body{ line-height:1.7; font-size:16px; font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; }
/* :deep() perché il contenuto di .body arriva via v-html: lo scoping normale non raggiunge
   markup iniettato così — senza :deep() queste due regole erano silenziosamente ignorate
   (bug preesistente, mai notato: la pagina diretta /articolo/[slug] si usa raramente,
   quasi tutto passa dalla finestra modale — trovato e corretto insieme al bug analogo in
   about.vue). */
.body :deep(h3){ font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-style:italic; font-weight:normal; font-size:20px; margin:28px 0 10px; }
.body :deep(blockquote){ font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; margin:20px 0; padding:4px 0 4px 18px; border-left:3px solid #c9a86a; font-style:italic; color:#4a4438; }

/* ---- media incorporati nel Rich Text — "grandi come la finestra dell'articolo"
   (richiesto): piena larghezza della colonna di testo (max 680px, vedi "article" sopra).
   Vedi app/utils/article.ts → renderEmbeddedAsset per come nasce il markup .rt-media. */
.body :deep(.rt-media){ margin: 24px 0; }
.body :deep(.rt-media img),
.body :deep(.rt-media video){ display:block; width:100%; height:auto; border-radius:4px; }
.body :deep(.rt-file){ margin: 16px 0; }

/* ---- "protocol font" — stesso meccanismo del modal (mark "Code" nativo di Contentful,
   nessun Content Type nuovo). Vedi il commento gemello in HouseModal.vue per la nota sul
   Serif vs Mono. */
.body :deep(code),
.body :deep(h5){
  font-family: "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace !important;
  font-weight: 400;
  font-style: normal;
  background: none;
  padding: 0;
  font-size: 14px;
  letter-spacing: .01em;
  margin: 0 0 10px;
  color: #232019;
}
/* ---- note a fine articolo — stesso trattamento del modal (.modal-footnotes). */
.footnotes{
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1px solid rgba(40,30,15,0.16);
}
.footnotes-label{
  font-family: "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace !important;
  font-size: 11px; letter-spacing:.12em; text-transform:uppercase;
  color:#b0a98f; margin:0 0 10px;
}
.footnotes :deep(p){
  font-family: "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace !important;
  font-size: 13px; line-height:1.6; color:#6b6558; margin:0 0 8px;
}
.note{ text-align:center; padding:60px 24px; font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; color:#6b6558; }

.body :deep(.rt-title),
.body :deep(.rt-sub){
  font-family: "EB Garamond", Garamond, Georgia, serif;
  text-align: center; color:#232019;
}
.body :deep(.rt-title){ font-size: 40px; font-weight: 700; line-height: 1.1; margin: 8px 0 10px; letter-spacing: .02em; }
.body :deep(.rt-sub){ font-size: 19px; line-height: 1.4; margin: 0 0 6px; }

.body :deep(.rt-break){ text-align: center; margin: 32px 0; letter-spacing: .3em; }

.body :deep(.rt-ad){
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 700; font-style: normal;
  text-transform: uppercase; letter-spacing: .04em;
}
.body :deep(code strong.rt-ad){ font-family: inherit; text-transform: none; letter-spacing: inherit; }
.body :deep(strong.rt-ad code){ text-transform: none; letter-spacing: .01em; }

.body :deep(.rt-end){
  font-family: "IBM Plex Mono","SF Mono",Menlo,Consolas,monospace;
  font-size: 14px; letter-spacing: .01em; text-align: left; margin: 0 0 10px;
}

.body :deep(h3){
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 700; font-style: normal;
  text-transform: uppercase; letter-spacing: .04em;
  font-size: 16px; line-height: 1.4;
  margin: 28px 0 14px;
}
.body :deep(h2.rt-title){
  font-family: "EB Garamond", Garamond, Georgia, serif !important;
  text-align: center;
  font-size: 40px; font-weight: 700; line-height: 1.1;
  letter-spacing: .02em; margin: 8px 0 10px;
}
</style>
