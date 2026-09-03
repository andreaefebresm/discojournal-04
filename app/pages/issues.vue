<template>
  <PageBoardBackground />
  <article>
    <h1>Issues — numeri precedenti</h1>
    <p v-if="pending" class="note">Caricamento…</p>
    <div v-else-if="issues && issues.length" class="issue-grid">
      <component :is="iss.url ? 'a' : 'div'" v-for="iss in issues" :key="iss.number" :href="iss.url || undefined" :target="iss.url ? '_blank' : undefined" :rel="iss.url ? 'noopener' : undefined" class="issue-card" :class="{ disabled: !iss.url }">
        <div class="issue-shot">
          <img v-if="iss.image" :src="iss.image.url" :alt="`Screenshot — ${iss.title}`" loading="lazy" />
          <div v-else class="issue-shot-placeholder">Screenshot in arrivo</div>
          <span v-if="!iss.url" class="issue-soon">presto disponibile</span>
        </div>
        <div class="issue-title">{{ iss.title }}</div>
        <div v-if="iss.excerpt" class="issue-excerpt">{{ iss.excerpt }}</div>
      </component>
    </div>
    <p v-else class="note">Nessun numero precedente ancora pubblicato.</p>
  </article>
</template>

<script setup lang="ts">
const { data: issues, pending } = await useFetch("/api/issues");
</script>

<style scoped>
/* stesso stile di about.vue — vedi note lì per il padding-top (barra con icone grandi) e
   la scelta di non avere un back-link dedicato (il logo in barra torna alla home).
   position:relative + z-index:1: sta sopra lo sfondo-board fisso (PageBoardBackground). */
article{ position:relative; z-index:1; max-width: 760px; margin: 0 auto; padding: 220px 24px 80px; font-family: "Fraunces", Georgia, serif; color:#232019; }
h1{ font-weight:normal; font-size:32px; margin: 6px 0 32px; }
.note{ text-align:center; padding:60px 24px; font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif; color:#6b6558; }

.issue-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:28px; }
.issue-card{
  display:flex; flex-direction:column; gap:8px;
  text-decoration:none; color:inherit; cursor:pointer;
  transition: transform 0.2s cubic-bezier(.2,.8,.2,1), opacity 0.2s;
}
a.issue-card:hover{ transform: translateY(-3px); }
.issue-card.disabled{ cursor:default; }

.issue-shot{
  position:relative;
  aspect-ratio: 4 / 3;
  border-radius:8px;
  overflow:hidden;
  background:#e4ded0;
  box-shadow: 0 8px 18px rgba(15,13,10,0.18);
}
.issue-shot img{ width:100%; height:100%; object-fit:cover; display:block; }
.issue-shot-placeholder{
  width:100%; height:100%;
  display:flex; align-items:center; justify-content:center;
  font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:12px; color:#a39a86; text-align:center; padding:0 12px;
}
.issue-soon{
  position:absolute; right:8px; bottom:8px;
  font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:10px; font-style:italic; color:#4a4438;
  background:rgba(244,241,234,0.88); padding:3px 8px; border-radius:20px;
}
.issue-title{ font-size:20px; }
.issue-excerpt{
  font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:13px; line-height:1.5; color:#6b6558;
}
</style>
