import { getContentfulClient, mapAboutEntry } from "../utils/contentful";
import sample from "../data/about.sample.json";

// GET /api/about — contenuto della pagina About. A differenza di /api/houses non è una
// lista: si prende semplicemente la prima (e unica) entry del content type "about". Stesso
// fallback ai dati locali di esempio se Contentful non è configurato o la chiamata fallisce.
export default defineEventHandler(async (event) => {
  const client = getContentfulClient();

  if (!client) return sample;

  try {
    const res = await client.getEntries({ content_type: "about", limit: 1 } as any);
    if (!res.items.length) {
      console.warn("[api/about] nessuna entry del content type \"about\" trovata su Contentful, uso i dati di esempio.");
      return sample;
    }
    return mapAboutEntry(res.items[0]);
  } catch (err) {
    console.error("[api/about] fetch Contentful fallito, uso i dati di esempio:", err);
    return sample;
  }
});
