<template>
  <nav class="topbar">
    <img class="logo" src="/assets/logo-placeholder.png" alt="logo (placeholder)" />
    <div class="navlinks">
      <a href="#" @click.prevent>Issues</a>
      <a href="#" @click.prevent>About</a>
    </div>
  </nav>
</template>

<script setup lang="ts">
// Placeholder: logo casuale, e "Issues"/"About" non ancora collegati a nulla —
// da decidere insieme (pagine vere? menu a tendina? vedi conversazione).
</script>

<style scoped>
.topbar{
  height: 56px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #f1efe8;
  border-bottom: 1px solid #e2ddc9;
  position: relative;
  z-index: 20;
}
.logo{ height:32px; width:32px; border-radius:50%; display:block; }
.navlinks{ display:flex; gap:28px; }
.navlinks a{
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size:12px;
  letter-spacing:.08em;
  text-transform:uppercase;
  color: var(--ink-soft);
  text-decoration:none;
}
.navlinks a:hover{ color: var(--ink); }
</style>
