<template>
  <div class="bg-board" aria-hidden="true">
    <IsoBoard v-if="houses && houses.length" :houses="houses" :grid-bounds="GRID_BOUNDS" />
  </div>
</template>

<script setup lang="ts">
// Sfondo decorativo per le pagine "secondarie" (/about, /issues): la stessa board della
// home, non interattiva (pointer-events:none, nessun handler @select) e a opacità ridotta
// — "sfondo simile a quello della home, meno carico", richiesto esplicitamente. Fixed a
// tutto schermo, dietro il contenuto (z-index:0; l'<article> della pagina va a z-index:1).
import { GRID_BOUNDS } from '../data/islandLayout';

const { data: houses } = await useFetch('/api/houses');
</script>

<style scoped>
.bg-board{
  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  opacity: 0.16;
  pointer-events: none;
}
</style>
