<template>
  <div class="page-root">
    <IsoBoard v-if="houses && houses.length" :houses="houses" :grid-bounds="GRID_BOUNDS" @select="selected = $event" />
    <p v-else-if="pending" class="note">Caricamento…</p>
    <p v-else class="note">Nessuna casa trovata — controlla il content model su Contentful o i dati locali di esempio.</p>

    <HouseModal :house="selected" @close="selected = null" />
  </div>
</template>

<script setup lang="ts">
import { GRID_BOUNDS } from '../data/houseLayout';

const { data: houses, pending } = await useFetch('/api/houses');
// L'articolo si apre come finestra interna (HouseModal), non navigando a /articolo/[slug]
// (quella pagina resta comunque, utile per un link diretto condivisibile in futuro).
// /api/houses restituisce già titolo+immagine+corpo di ogni casa, quindi qui non serve
// un'altra chiamata quando si apre la finestra.
const selected = ref<any | null>(null);
</script>

<style scoped>
.page-root{ flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.note{ max-width:640px; margin:40px auto; padding:0 24px; text-align:center; font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:13px; color:var(--ink-soft); }
</style>
