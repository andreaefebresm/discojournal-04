import { getContentfulClient, mapHouseEntry } from "../utils/contentful";
import { ISLAND_LAYOUT } from "../../app/data/islandLayout";
import sample from "../data/houses.sample.json";

// GET /api/houses — lista delle case per il tabellone.
// Se le variabili d'ambiente Contentful non sono configurate, o la chiamata fallisce,
// si torna ai dati locali di esempio: `npm run dev` funziona da subito, senza CMS.
export default defineEventHandler(async (event) => {
  const client = getContentfulClient();
  let houses: any[];

  if (!client) {
    houses = sample as any[];
  } else {
    try {
      const res = await client.getEntries({ content_type: "article", order: ["fields.number"] as any });
      houses = res.items.map(mapHouseEntry).filter((h: any) => h.published);
    } catch (err) {
      console.error("[api/houses] fetch Contentful fallito, uso i dati di esempio:", err);
      houses = sample as any[];
    }
  }

  // aggancia il layout di griglia (di proprietà del codice, non del CMS) per "number", non
  // per slug: lo slug si autogenera dal titolo in Contentful e cambia se cambia il titolo,
  // "number" resta stabile.
  const withLayout = houses
    .map((h) => {
      const layout = ISLAND_LAYOUT[h.number];
      if (!layout) {
        console.warn(`[api/houses] nessun layout di griglia per number ${h.number} (slug "${h.slug}") — isola esclusa dal tabellone. Aggiungila in app/data/islandLayout.ts`);
        return null;
      }
      return { ...h, ...layout };
    })
    .filter(Boolean);

  return withLayout;
});
