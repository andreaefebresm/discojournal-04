import { getContentfulClient, mapHouseEntry } from "../../utils/contentful";
import sample from "../../data/houses.sample.json";

// GET /api/houses/:slug — una singola casa/articolo, per la pagina /articolo/[slug]
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const client = getContentfulClient();

  if (!client) {
    const found = (sample as any[]).find((h) => h.slug === slug);
    if (!found) throw createError({ statusCode: 404, statusMessage: "Casa non trovata" });
    return found;
  }

  try {
    // include:10 (era assente) — senza, Contentful non risolve i link dentro il Rich Text
    // (immagini/media incorporati nel corpo dell'articolo restano solo un riferimento
    // sys.id, senza url/file): servono per il punto "immagini/media a piena larghezza",
    // vedi app/utils/article.ts → renderEmbeddedAsset.
    const res = await client.getEntries({ content_type: "article", "fields.slug": slug, limit: 1, include: 10 } as any);
    const item = res.items[0];
    if (!item) throw createError({ statusCode: 404, statusMessage: "Casa non trovata" });
    return mapHouseEntry(item);
  } catch (err: any) {
    if (err.statusCode === 404) throw err;
    console.error("[api/houses/:slug] fetch Contentful fallito, uso i dati di esempio:", err);
    const found = (sample as any[]).find((h) => h.slug === slug);
    if (!found) throw createError({ statusCode: 404, statusMessage: "Casa non trovata" });
    return found;
  }
});
