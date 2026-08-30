// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Fraunces (titoli/citazioni) + Inter (interfaccia/corpo) — coppia scelta dopo il
  // confronto in font-pairings.html tra 3 abbinamenti Google Fonts, vedi CSS in app.vue /
  // IsoBoard.vue / HouseModal.vue / articolo/[slug].vue per dove vengono applicati.
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,340;0,9..144,480;1,9..144,400&family=Inter:wght@400;500;600&display=swap'
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
