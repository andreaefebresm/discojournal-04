// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    // solo server-side (niente "public:") — non finiscono nel bundle del browser.
    // Valorizzate da env NUXT_CONTENTFUL_SPACE / NUXT_CONTENTFUL_TOKEN (vedi .env.example).
    contentfulSpace: '',
    contentfulToken: ''
  }
})
