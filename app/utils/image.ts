// Ottimizzazione immagini Contentful ("le immagini ci mettono un botto a caricarsi"):
// la Images API di Contentful applica resize/conversione formato lato CDN aggiungendo
// semplici parametri alla query string dell'URL dell'asset — nessuna libreria o passaggio
// server aggiuntivo necessario. https://www.contentful.com/developers/docs/references/images-api/
// w = larghezza in px (Contentful scala mantenendo le proporzioni), q = qualità JPEG/WebP,
// fm=webp = formato più leggero di JPEG/PNG a parità di qualità, supportato da tutti i
// browser moderni. Funziona solo per URL Contentful (images.ctfassets.net): per gli asset
// locali (/assets/...) restituisce l'URL invariato, così si può chiamare ovunque senza
// dover controllare la fonte caso per caso.
export function ctfImg(url: string | undefined | null, opts: { w?: number; q?: number } = {}): string {
  if (!url) return "";
  if (!url.includes("ctfassets.net")) return url;
  const w = opts.w || 800;
  const q = opts.q ?? 72;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}w=${w}&q=${q}&fm=webp`;
}
