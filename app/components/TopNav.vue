<template>
  <nav class="topbar">
    <NuxtLink to="/" class="logo-link" aria-label="DiSCo Journal — torna al tabellone">
      <img class="logo" src="/assets/logo-placeholder.png" alt="logo (placeholder)" />
    </NuxtLink>
    <div class="navlinks">
      <button type="button" class="navitem" aria-label="Issues — numeri precedenti" @click.prevent>
        <img src="/assets/nav/nav-issues-buoys.png" alt="Issues — numeri precedenti" />
        <span>Issues</span>
      </button>
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
// "About" porta ora alla pagina /about (contenuto modificabile su Contentful, content type
// "about" — vedi server/api/about.get.ts). "Issues" resta non collegato: nessuna pagina/
// menu dietro ancora, da decidere insieme. Il logo porta alla home. Icone più grandi di
// prima (44px -> 80px, dopo un primo tentativo a 150px risultato eccessivo) più
// l'etichetta testuale sotto ognuna (prima solo nell'aria-label, non visibile).
</script>

<style scoped>
/* overlay vero sopra la board (position:absolute, sfondo trasparente): la board occupa
   tutta l'altezza sotto e la barra galleggia sopra, così il mosaico del mare si vede
   anche dietro logo/voci invece di uno sfondo pieno che spinge la board in basso.
   align-items:flex-start (non più center) perché le icone, più alte di una barra di
   64px, devono "scendere" dall'angolo in alto invece di uscire dal viewport verso l'alto
   se centrate in una riga troppo bassa per contenerle. */
.topbar{
  min-height: 64px;
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px;
  background: transparent;
  z-index: 20;
}
.logo-link{ all: unset; cursor: pointer; display: block; border-radius: 50%; }
.logo{
  height:32px; width:32px; border-radius:50%; display:block;
  filter: drop-shadow(0 2px 6px rgba(10,25,35,0.35));
  transition: transform 0.2s cubic-bezier(.2,.8,.2,1);
}
.logo-link:hover .logo, .logo-link:focus-visible .logo{ transform: scale(1.08); }

.navlinks{ display:flex; align-items:flex-start; gap:36px; }
.navlinks button.navitem, .navlinks a.navitem{
  all: unset;
  display:flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor:pointer;
  transition: transform 0.2s cubic-bezier(.2,.8,.2,1);
}
.navlinks .navitem:hover, .navlinks .navitem:focus-visible{ transform: translateY(-3px) scale(1.05); }
.navlinks .navitem img{
  height:80px; width:auto; display:block;
  filter: drop-shadow(0 6px 12px rgba(10,25,35,0.4));
}
.navlinks .navitem span{
  font-family:"Inter",-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:13px;
  font-weight:600;
  letter-spacing:.04em;
  color:#efe9d8;
  /* niente stroke/paint-order (proprietà SVG): qui è testo HTML normale — un text-shadow
     smussato fa da "alone" scuro per restare leggibile sopra il mosaico del mare */
  text-shadow: 0 1px 3px rgba(10,20,15,0.85), 0 0 6px rgba(10,20,15,0.5);
}
</style>
