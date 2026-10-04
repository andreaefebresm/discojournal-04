<template>
  <nav class="topbar">
    <NuxtLink to="/" class="logo-link" aria-label="DiSCo Journal — torna al tabellone">
      <img class="logo" src="/assets/logo-placeholder.png" alt="DiSCo Journal" />
    </NuxtLink>
    <div class="navlinks">
      <NuxtLink to="/issues" class="navitem" aria-label="Issues — numeri precedenti">
        <img src="/assets/nav/nav-issues-buoys.png" alt="Issues — numeri precedenti" />
        <span>Issues</span>
      </NuxtLink>
      <NuxtLink to="/about" class="navitem" aria-label="About">
        <img src="/assets/nav/nav-about-ladder.png" alt="About" />
        <span>About</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
// "Issues" e "About" non sono più testo ma piccoli render fotorealistici (stack di
// salvagenti = numeri precedenti, scaletta piscina = About), coerenti con la board e con
// la barra ora trasparente sopra il mosaico del mare — porting diretto dal mockup statico.
// "About" porta alla pagina /about (contenuto modificabile su Contentful, content type
// "about" — vedi server/api/about.get.ts). "Issues" ora porta alla pagina /issues, stesso
// meccanismo (content type "issue" su Contentful, vedi server/api/issues.get.ts) — prima
// era un bottone non collegato (segnalato da April: "Issues hyperlink doesn't work"). Il
// logo porta alla home. Icone più grandi di prima (44px -> 80px, dopo un primo tentativo a
// 150px risultato eccessivo) più l'etichetta testuale sotto ognuna (prima solo
// nell'aria-label, non visibile).
</script>

<style scoped>
.topbar{
  min-height: 64px;
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  /* padding che scala con lo schermo (24px sul desktop, ~14px a 360px) + safe-area per
     notch / landscape su iPhone */
  padding: clamp(12px, 4vw, 20px) 0;
  padding-left: max(clamp(12px, 4vw, 24px), env(safe-area-inset-left));
  padding-right: max(clamp(12px, 4vw, 24px), env(safe-area-inset-right));
  box-sizing: border-box;
  max-width: 100vw;
  background: transparent;
  z-index: 20;
}
.logo-link{ all: unset; cursor: pointer; display: block; border-radius: 50%; flex-shrink: 0; }
.logo{
  height: clamp(52px, 15vw, 80px); width: clamp(52px, 15vw, 80px);
  border-radius:50%; display:block;
  filter: drop-shadow(0 2px 6px rgba(10,25,35,0.35));
  transition: transform 0.2s cubic-bezier(.2,.8,.2,1);
}
.logo-link:hover .logo, .logo-link:focus-visible .logo{ transform: scale(1.08); }

/* gap ridotto su schermi stretti (36px solo da ~480px in su) */
.navlinks{ display:flex; align-items:flex-start; gap: clamp(8px, 3vw, 36px); min-width: 0; }
.navlinks button.navitem, .navlinks a.navitem{
  all: unset;
  display:flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  cursor:pointer;
  transition: transform 0.2s cubic-bezier(.2,.8,.2,1);
}
.navlinks .navitem:hover, .navlinks .navitem:focus-visible{ transform: translateY(-3px) scale(1.05); }
.navlinks .navitem img{
  height: clamp(52px, 16vw, 80px); width:auto; max-width: 100%; display:block;
  filter: drop-shadow(0 6px 12px rgba(10,25,35,0.4));
}
.navlinks .navitem span{
  font-family: "Valley Sans", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: clamp(11px, 3.2vw, 13px);
  font-weight:600;
  letter-spacing:.04em;
  color:#efe9d8;
  text-shadow: 0 1px 3px rgba(10,20,15,0.85), 0 0 6px rgba(10,20,15,0.5);
}
</style>