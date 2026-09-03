import { getContentfulClient, mapIssueEntry } from "../utils/contentful";
import sample from "../data/issues.sample.json";

// GET /api/issues — elenco dei numeri precedenti della rivista (link "Issues" in topbar).
// Stesso pattern di /api/houses (lista, ordinata per "number"), fallback ai dati locali di
// esempio se Contentful non è configurato o la chiamata fallisce — content type "issue" da
// creare su Contentful quando pronto (campi: number, title, excerpt, screenshot [asset], url).
export default defineEventHandler(async (event) => {
  const client = getContentfulClient();

  if (!client) return sample;

  try {
    const res = await client.getEntries({ content_type: "issue", order: ["-fields.number"] as any });
    if (!res.items.length) {
      console.warn("[api/issues] nessuna entry del content type \"issue\" trovata su Contentful, uso i dati di esempio.");
      return sample;
    }
    return res.items.map(mapIssueEntry);
  } catch (err) {
    console.error("[api/issues] fetch Contentful fallito, uso i dati di esempio:", err);
    return sample;
  }
});
