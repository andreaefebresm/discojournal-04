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
    const res = await client.getEntries({ content_type: "article", "fields.slug": slug, limit: 1 } as any);
    if (!res.items.length) throw createError({ statusCode: 404, statusMessage: "Casa non trovata" });
    return mapHouseEntry(res.items[0]);
  } catch (err: any) {
    if (err.statusCode === 404) throw err;
    console.error("[api/houses/:slug] fetch Contentful fallito, uso i dati di esempio:", err);
    const found = (sample as any[]).find((h) => h.slug === slug);
    if (!found) throw createError({ statusCode: 404, statusMessage: "Casa non trovata" });
    return found;
  }
});
