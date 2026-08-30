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

/* shell a tutta pagina: la topbar ora è un overlay trasparente (position:absolute, vedi
   TopNav.vue) sopra il mosaico del mare, non più una riga di flex che spinge la board in
   basso — quindi qui basta che NuxtPage/IsoBoard riempiano l'intera altezza; position:relative
   dà alla topbar un contenitore posizionato di riferimento. */
.app-shell{ height:100vh; position:relative; display:flex; flex-direction:column; }

/* le pagine diverse dalla home (es. /articolo/[slug], ancora navigabile per link diretto)
   possono avere contenuto più alto della viewport: lì va bene scrollare normalmente. */
.app-shell:has(article){ overflow:auto; }
</style>
