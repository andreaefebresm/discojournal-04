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

// house.body può essere: un documento Rich Text di Contentful, un array di paragrafi
// semplici (dati locali di esempio), oppure assente — stessa logica di prima in
// app/pages/articolo/[slug].vue (quella pagina resta, per link diretti).
const bodyHtml = computed(() => {
  const body = props.house?.body as any;
  if (!body) return "";
  if (Array.isArray(body)) return body.map((p: string) => `<p>${p}</p>`).join("");
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
.modal-window{
  background:#faf8f2;
  border-radius:8px;
  box-shadow:0 24px 48px rgba(15,13,10,0.4);
  width:100%; max-width:560px;
  max-height:86vh;
  overflow:auto;
}
.modal-titlebar{
  position:sticky; top:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 16px;
  background:#2c2620; color:#efe9d8;
  border-radius:8px 8px 0 0;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size:13px; letter-spacing:.02em;
}
.modal-close{
  all:unset; cursor:pointer; line-height:1;
  width:22px; height:22px; text-align:center;
  border-radius:4px;
  color: inherit;
}
.modal-close:hover{ background:rgba(255,255,255,0.15); }
.modal-body{ padding:20px; }
.modal-body img{ width:100%; border-radius:6px; display:block; margin-bottom:16px; filter: drop-shadow(0 10px 16px rgba(15,13,10,0.2)); }
.modal-body p{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:14px; line-height:1.6; color:var(--ink); margin:0 0 12px; }
.modal-excerpt{ font-style:italic; color:var(--ink-soft); }
</style>
