import { BLOCKS, INLINES } from "@contentful/rich-text-types";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

// Helper condiviso tra HouseModal.vue (finestra modale) e app/pages/articolo/[slug].vue
// (pagina diretta) — prima la stessa logica era duplicata in entrambi i file (mdInline/
// renderBody), qui vive in un solo posto.

// --- mini-markdown, usato SOLO per l'array di paragrafi semplici (dati locali di esempio
// in server/data/houses.sample.json). Il Rich Text vero di Contentful ha già i suoi stili
// nativi, non serve applicargli anche questo.
function mdInline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function renderParagraphs(paragraphs: string[]) {
  return paragraphs
    .map((p) => {
      if (p.startsWith("## ")) return `<h3>${mdInline(p.slice(3))}</h3>`;
      if (p.startsWith("> ")) return `<blockquote>${mdInline(p.slice(2))}</blockquote>`;
      return `<p>${mdInline(p)}</p>`;
    })
    .join("");
}

// Renderizza un embedded asset (immagine o altro file) dentro il Rich Text. Per default
// @contentful/rich-text-html-renderer NON produce alcun HTML per gli embedded asset — va
// detto esplicitamente come trasformarli ("immagini/media che devono avere width grandi
// come la finestra dell'articolo", richiesto). Il ".rt-media" risultante è width:100% via
// CSS in HouseModal.vue/[slug].vue — qui ci occupiamo solo di generare il markup giusto,
// non della dimensione (quella è responsabilità del CSS del contenitore che lo ospita).
// NB: perché node.data.target abbia i "fields" (e non solo un sys.id) serve che la fetch a
// Contentful sia stata fatta con "include" >= 1 — vedi server/api/houses/[slug].ts.
function renderEmbeddedAsset(node: any): string {
  const f = node?.data?.target?.fields;
  if (!f?.file) return "";
  const rawUrl = f.file.url as string | undefined;
  if (!rawUrl) return "";
  const url = rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl;
  const contentType: string = f.file.contentType || "";
  const alt = String(f.description || f.title || "").replace(/"/g, "&quot;");
  if (contentType.startsWith("image/")) {
    return `<figure class="rt-media"><img src="${url}" alt="${alt}" loading="lazy" decoding="async" /></figure>`;
  }
  if (contentType.startsWith("video/")) {
    return `<figure class="rt-media"><video src="${url}" controls playsinline></video></figure>`;
  }
  // altro tipo di file (pdf, audio, ecc.) — link semplice invece di provare a incorporarlo
  return `<p class="rt-file"><a href="${url}" target="_blank" rel="noopener">${alt || "Scarica il file"}</a></p>`;
}

const richTextOptions = {
  renderNode: {
    [BLOCKS.EMBEDDED_ASSET]: renderEmbeddedAsset,
    // entry incorporate (non asset) — non usate al momento, non renderizzare nulla invece
    // di far esplodere il renderer su un nodo che non sa gestire.
    [BLOCKS.EMBEDDED_ENTRY]: () => "",
    [INLINES.EMBEDDED_ENTRY]: () => ""
  }
  // NB: nessuna renderMark custom qui — il mark "Code" nativo di Contentful (icona </> in
  // toolbar, disponibile a qualsiasi ruolo Editor, nessun Content Type da creare) è già
  // renderizzato di default come <code>...</code>. È quello che usiamo per marcare il
  // "protocollo"/font diverso di Nicole — vedi CSS ":deep(code)" in HouseModal.vue/[slug].vue.
} as const;

// Un campo Rich Text può essere: un documento Contentful (nodeType "document"), un array
// di paragrafi semplici (dati locali di esempio), oppure assente.
export function renderField(body: unknown): string {
  if (!body) return "";
  if (Array.isArray(body)) return renderParagraphs(body as string[]);
  if (typeof body === "object" && (body as any).nodeType === "document") {
    return documentToHtmlString(body as any, richTextOptions as any);
  }
  return String(body);
}

// Concatena articleBody + articleBody2 + articleBody3 + articleBody4 in un unico HTML — un
// solo articolo diviso su più campi Rich Text perché troppo lungo per un campo solo
// ("l'articolo è lungo 500000 caratteri", richiesto). I campi vuoti vengono saltati, quindi
// funziona identico a prima per gli articoli che usano solo articleBody.
export function renderArticleBody(house: any): string {
  return [house?.body, house?.body2, house?.body3, house?.body4].map(renderField).filter(Boolean).join("");
}

// Campo "footnotes" separato, renderizzato a parte così si può stilizzarlo diversamente
// (font diverso, richiesto) senza mescolarlo al corpo principale.
export function renderFootnotes(house: any): string {
  return renderField(house?.footnotes);
}
