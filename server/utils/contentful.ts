import { createClient, type Entry } from "contentful";
import { useRuntimeConfig } from "#imports";

// Client Contentful creato solo lato server (Nitro) — il token della Content Delivery API
// non finisce MAI nel bundle spedito al browser. Questo è il motivo per cui tutto l'accesso
// a Contentful passa da qui e da server/api/*, mai da un plugin/composable lato client.
let client: ReturnType<typeof createClient> | null = null;

export function getContentfulClient() {
  const config = useRuntimeConfig();
  const spaceId = config.contentfulSpace as string;
  const accessToken = config.contentfulToken as string;

  if (!spaceId || !accessToken) return null; // niente credenziali → chi chiama usa il fallback locale

  if (!client) {
    client = createClient({ space: spaceId, accessToken });
  }
  return client;
}

// Mappa una entry grezza di Contentful (content type "article") nella forma pulita
// che il resto dell'app si aspetta — stessa forma di server/data/houses.sample.json.
export function mapHouseEntry(entry: Entry<any>) {
  const f = entry.fields as any;
  const asset = f.houseImage?.fields;
  return {
    slug: f.slug,
    number: f.number,
    title: f.title,
    excerpt: f.excerpt || "",
    image: asset
      ? {
          url: asset.file.url.startsWith("//") ? "https:" + asset.file.url : asset.file.url,
          width: asset.file.details?.image?.width || 1200,
          height: asset.file.details?.image?.height || 654
        }
      : null,
    body: f.articleBody || null, // documento Rich Text di Contentful, o null se non compilato
    published: f.published !== false
  };
}

// Mappa l'entry (singola, non una lista) del content type "about" — la pagina /about,
// pensata per essere modificata direttamente dalla redazione su Contentful, senza
// bisogno di toccare il codice.
export function mapAboutEntry(entry: Entry<any>) {
  const f = entry.fields as any;
  return {
    title: f.title || "About",
    body: f.body || null // documento Rich Text di Contentful, o null se non compilato
  };
}

// Mappa una entry del content type "issue" — la pagina /issues (numeri precedenti della
// rivista, link "Issues" nella topbar). Ogni numero è solo foto + titolo ("Issue N" —
// stesso stile del vecchio sito), ed è un link (url) solo quando compilato: prima che ci
// sia un url reale (Contentful vuoto), la entry resta visibile ma non cliccabile — vedi
// app/pages/issues.vue. In pratica la pagina resta statica finché non si configura
// Contentful: senza credenziali va sempre a server/data/issues.sample.json (vedi
// server/api/issues.get.ts), che è la fonte "ufficiale" per ora.
export function mapIssueEntry(entry: Entry<any>) {
  const f = entry.fields as any;
  const asset = f.screenshot?.fields;
  return {
    number: f.number,
    title: f.title || `Issue ${f.number ?? ""}`,
    image: asset
      ? {
          url: asset.file.url.startsWith("//") ? "https:" + asset.file.url : asset.file.url,
          width: asset.file.details?.image?.width || 1200,
          height: asset.file.details?.image?.height || 750
        }
      : null,
    url: f.url || null
  };
}
