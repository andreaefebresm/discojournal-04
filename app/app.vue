<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <TopNav />
    <NuxtPage />
  </div>
</template>

<style>
:root{ --ink:#232019; --ink-soft:#6b6558; }
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; height:100%; overflow:hidden; }
body{ font-family: Georgia, "Iowan Old Style", serif; background:#f4f2ec; color:var(--ink); }

/* shell a tutta pagina: topbar fissa in alto, il resto (board o pagina articolo) riempie
   lo spazio restante — vedi TopNav.vue e IsoBoard.vue per come si spartiscono l'altezza. */
.app-shell{ height:100vh; display:flex; flex-direction:column; }

/* le pagine diverse dalla home (es. /articolo/[slug], ancora navigabile per link diretto)
   possono avere contenuto più alto della viewport: lì va bene scrollare normalmente. */
.app-shell:has(article){ overflow:auto; }
</style>
