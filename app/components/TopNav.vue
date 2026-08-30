<template>
  <nav class="topbar">
    <img class="logo" src="/assets/logo-placeholder.png" alt="logo (placeholder)" />
    <div class="navlinks">
      <button type="button" aria-label="Issues — numeri precedenti" @click.prevent>
        <img src="/assets/nav/nav-issues-buoys.png" alt="Issues — numeri precedenti" />
      </button>
      <button type="button" aria-label="About" @click.prevent>
        <img src="/assets/nav/nav-about-ladder.png" alt="About" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
// "Issues" e "About" non sono più testo ma piccoli render fotorealistici (stack di
// salvagenti = numeri precedenti, scaletta piscina = About), coerenti con la board e con
// la barra ora trasparente sopra il mosaico del mare — porting diretto dal mockup statico.
// Non ancora collegati a nulla (nessuna pagina/menu dietro, da decidere insieme).
</script>

<style scoped>
/* overlay vero sopra la board (position:absolute, sfondo trasparente): la board occupa
   tutta l'altezza sotto e la barra galleggia sopra, così il mosaico del mare si vede
   anche dietro logo/voci invece di uno sfondo pieno che spinge la board in basso. */
.topbar{
  height: 64px;
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: transparent;
  z-index: 20;
}
.logo{
  height:32px; width:32px; border-radius:50%; display:block;
  filter: drop-shadow(0 2px 6px rgba(10,25,35,0.35));
}
.navlinks{ display:flex; align-items:center; gap:22px; }
.navlinks button{
  all: unset;
  display:block;
  cursor:pointer;
  height:44px;
  transition: transform 0.2s cubic-bezier(.2,.8,.2,1);
}
.navlinks button:hover, .navlinks button:focus-visible{ transform: translateY(-2px) scale(1.06); }
.navlinks button img{
  height:100%; width:auto; display:block;
  filter: drop-shadow(0 4px 8px rgba(10,25,35,0.35));
}
</style>
