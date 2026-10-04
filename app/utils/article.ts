import { BLOCKS, INLINES, MARKS } from "@contentful/rich-text-types";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

// Helper condiviso tra HouseModal.vue (finestra modale) e app/pages/articolo/[slug].vue
// (pagina diretta).

// --- mini-markdown, usato SOLO per l'array di paragrafi semplici (dati locali di esempio)
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

// Embedded asset (immagini/video/file) dentro il Rich Text.
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
  return `<p class="rt-file"><a href="${url}" target="_blank" rel="noopener">${alt || "Scarica il file"}</a></p>`;
}

// testo semplice di un nodo (ricorsivo) — serve per riconoscere "***" e "<SIGNAL LOST…"
function plainText(node: any): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.content || []).map(plainText).join("");
}

// "grassetto + tutto maiuscolo" = testo pubblicitario/governativo (font neutro tipo Helvetica).
// Almeno 4 lettere, così "I", "AI" o sigle corte in grassetto non vengono toccate.
function isAdText(s: string): boolean {
  const letters = s.replace(/&[a-z#0-9]+;/gi, "").replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length >= 4 && letters === letters.toUpperCase();
}

// "state" ricorda, tra un campo Rich Text e il successivo, se siamo già nel messaggio di
// fine trasmissione (da "<SIGNAL LOST" in poi tutti i paragrafi usano il font protocollo).
type RenderState = { end: boolean; proto: boolean };

function makeOptions(state: RenderState) {
  return {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: renderEmbeddedAsset,
      [BLOCKS.EMBEDDED_ENTRY]: () => "",
      [INLINES.EMBEDDED_ENTRY]: () => "",

      // Heading 1 = titolo; Heading 2 e Heading 4 = sottotitolo / autrice
      [BLOCKS.HEADING_1]: (node: any, next: any) => `<h2 class="rt-title">${next(node.content)}</h2>`,
      [BLOCKS.HEADING_2]: (node: any, next: any) => `<p class="rt-sub">${next(node.content)}</p>`,
      [BLOCKS.HEADING_4]: (node: any, next: any) => `<p class="rt-sub">${next(node.content)}</p>`,

      // una linea orizzontale chiude comunque il blocco protocollo (rete di sicurezza)
      [BLOCKS.HR]: () => { state.proto = false; return "<hr/>"; },

      [BLOCKS.PARAGRAPH]: (node: any, next: any) => {
        const t = plainText(node).trim();
        if (/^(\*\s*){3,}$/.test(t)) {
          state.proto = false;
          return `<p class="rt-break">***</p>`;
        }
        // il blocco protocollo comincia da "SURVIVAL PROTOCOL…" e finisce con
        // "THE WATER MUST REMAIN FREE" (o alla prima linea orizzontale / ***)
        if (/^SURVIVAL PROTOCOL/i.test(t)) state.proto = true;
        // il messaggio finale comincia da "<SIGNAL LOST" e dura fino alla fine
        if (t.startsWith("<SIGNAL LOST")) state.end = true;

        const mono = state.proto || state.end;
        const html = `<p${mono ? ' class="rt-proto"' : ""}>${next(node.content)}</p>`;
        if (state.proto && /THE WATER MUST REMAIN FREE/i.test(t)) state.proto = false;
        return html;
      }
    },
    renderMark: {
      // dentro il protocollo o nel messaggio finale il grassetto resta grassetto normale
      // (non "pubblicità"): il font lo decide il paragrafo
      [MARKS.BOLD]: (text: string) =>
        !state.proto && !state.end && isAdText(text)
          ? `<strong class="rt-ad">${text}</strong>`
          : `<strong>${text}</strong>`
    }
  };
}

export function renderField(body: unknown, state: RenderState = { end: false, proto: false }): string {
  if (!body) return "";
  if (Array.isArray(body)) return renderParagraphs(body as string[]);
  if (typeof body === "object" && (body as any).nodeType === "document") {
    return documentToHtmlString(body as any, makeOptions(state) as any);
  }
  return String(body);
}

// articleBody + 2/3/4 in un unico HTML; lo stato (protocollo / fine trasmissione) passa da un
// campo all'altro, perché il blocco potrebbe iniziare in un campo e finire in un altro.
export function renderArticleBody(house: any): string {
  const state: RenderState = { end: false, proto: false };
  return [house?.body, house?.body2, house?.body3, house?.body4]
    .map((b) => renderField(b, state))
    .filter(Boolean)
    .join("");
}

export function renderFootnotes(house: any): string {
  return renderField(house?.footnotes);
}