<template>
  <div>
    <header>
      <div class="kicker">DiSCo Journal · Issue 04</div>
      <h1>Digital Diaspora</h1>
      <p>Cinque articoli, cinque case sullo stesso tabellone isometrico — click su una casa per aprire l'articolo.</p>
    </header>

    <IsoBoard v-if="houses && houses.length" :houses="houses" :grid-bounds="GRID_BOUNDS" />
    <p v-else-if="pending" class="note">Caricamento…</p>
    <p v-else class="note">Nessuna casa trovata — controlla il content model su Contentful o i dati locali di esempio.</p>

    <footer>
      <div id="readout">{{ readout }}</div>
      <div>{{ dateline }}</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { GRID_BOUNDS } from '../data/houseLayout';

const { data: houses, pending } = await useFetch('/api/houses');
const readout = useState<string>('board-readout', () => 'Ready.');
const dateline = new Date().toLocaleString('it-IT', { month: 'short', year: 'numeric' });
</script>
