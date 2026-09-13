// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Valley Sans per tutto il sito (titoli, corpo, interfaccia) — sostituisce la coppia
  // Fraunces+Inter usata prima, richiesto esplicitamente ("voglio usare Valley Sans per
  // tutto"). È un font variabile (Thin→Black, con asse italico): un solo @import copre
  // tutti i pesi/stili usati nel CSS (normal/500/600/700, con font-style:italic dove serve
  // — vedi .modal-excerpt, i blockquote, gli h3 — invece dei corsivi "veri" di Fraunces).
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Valley+Sans:ital,wght@0,100..900;1,100..900&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    // solo server-side (niente "public:") — non finiscono nel bundle del browser.
    // Valorizzate da env NUXT_CONTENTFUL_SPACE / NUXT_CONTENTFUL_TOKEN (vedi .env.example).
    contentfulSpace: '',
    contentfulToken: ''
  }
})
