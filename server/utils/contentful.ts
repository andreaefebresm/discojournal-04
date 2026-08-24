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

// Mappa una entry grezza di Contentful (content type "casa") nella forma pulita
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
