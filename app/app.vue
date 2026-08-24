<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
:root{ --ink:#232019; --ink-soft:#6b6558; }
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{ font-family: Georgia, "Iowan Old Style", serif; background:#f4f2ec; color:var(--ink); min-height:100vh; }

header{ max-width:1100px; margin:0 auto; padding:40px 24px 16px; text-align:center; }
header .kicker{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:11px; letter-spacing:.14em; color:var(--ink-soft); text-transform:uppercase; margin-bottom:10px; }
header h1{ font-size:26px; font-weight:normal; margin:0 0 8px; }
header p{ font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:13px; color:var(--ink-soft); max-width:520px; margin:0 auto; line-height:1.5; }

footer{ max-width:1100px; margin:0 auto; padding:0 24px 40px; display:flex; justify-content:space-between; align-items:center; font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:11px; color:var(--ink-soft); border-top:1px solid #ece6d6; padding-top:14px; }
#readout{ font-family:"SF Mono",Menlo,monospace; letter-spacing:.02em; }

.note{ max-width:640px; margin:40px auto; padding:0 24px; text-align:center; font-family:-apple-system,"Helvetica Neue",Arial,sans-serif; font-size:13px; color:var(--ink-soft); }
</style>
