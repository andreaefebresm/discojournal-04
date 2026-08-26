# DiSCo Journal — Issue 04, Nuxt + Contentful

Questo progetto funziona **subito**, senza Contentful, con i dati locali in
`server/data/houses.sample.json`. Contentful si collega dopo, cambiando due
variabili d'ambiente — il codice non cambia.

```
npm install --legacy-peer-deps   # vedi nota sotto sul flag
npm run dev                      # http://localhost:3000
```

Nota sul flag `--legacy-peer-deps`: in questo ambiente `npm install` liscio
falliva con un errore interno di npm (`Cannot read properties of null
(reading 'edgesOut')`) legato alla risoluzione delle peer dependency — non è
un problema del progetto. Prova prima senza il flag sulla tua macchina; se
fallisce allo stesso modo, aggiungilo.

## Come è organizzato

- **Il layout della griglia isometrica resta nel codice**
  (`app/data/houseLayout.ts`): posizione e dimensione del lotto di ogni casa
  (in celle di griglia, diverse per casa). Questa è una decisione di design,
  non contenuto editoriale — lasciarla come campo libero in Contentful
  avrebbe permesso sovrapposizioni e coordinate assurde senza nessuna
  validazione.
- **Il contenuto editoriale vive in Contentful**: titolo, immagine della
  casa, testo dell'articolo. Il collegamento tra i due è lo `slug`.
- `server/api/houses.get.ts` e `server/api/houses/[slug].get.ts` provano
  Contentful; se le variabili d'ambiente mancano, o la chiamata fallisce,
  tornano ai dati locali — mai una pagina rotta.
- Il token della Content Delivery API resta lato server (`server/utils/contentful.ts`,
  usato solo dalle API route) — non finisce mai nel bundle spedito al browser.

## Passaggi precisi su Contentful (da fare tu, nella loro dashboard)

1. Vai su [contentful.com](https://www.contentful.com), crea un account
   gratuito, crea un nuovo Space (piano **Free**).

   **Attenzione**, letto oggi nella loro documentazione ufficiale sui limiti
   d'uso: il piano Free è dichiarato esplicitamente "per imparare e fare
   test" e i termini dicono che *non può essere usato per casi d'uso
   commerciali*. Non sono in grado di dirti se una rivista editoriale online
   come DiSCo Journal rientra o meno in questa clausola — non è una domanda
   tecnica, è una questione contrattuale — ma è corretto che tu lo sappia
   prima di costruirci sopra, non dopo. Se hai dubbi, vale la pena chiedere
   direttamente a Contentful o valutare un piano a pagamento se il progetto
   diventa pubblico stabilmente.

2. Nello Space, vai su **Content model** → **Add content type**.
   Crealo con questo **API identifier esatto**: `casa`
   (il codice cerca `content_type: "casa"` — se lo chiami diversamente
   devi aggiornare `server/utils/contentful.ts` e le due API route).

3. Aggiungi questi campi al content type `casa`, con questi **Field ID esatti**
   (il codice legge `fields.title`, `fields.slug`, ecc. — l'ID conta, il
   nome visualizzato no):

   | Field ID       | Tipo                        | Note |
   |----------------|-----------------------------|------|
   | `title`        | Short text                  | obbligatorio |
   | `slug`         | Short text                  | obbligatorio, univoco — deve combaciare con una chiave in `app/data/houseLayout.ts` (`casa-piscina`, `torre`, `serra`, `loft`, `cottage`) |
   | `number`       | Number (integer)            | 1–5 (6 quando aggiungi la super mansion) |
   | `excerpt`      | Short text                  | opzionale |
   | `houseImage`   | Media, one file             | la foto intera della casa, sfondo compreso — NON un ritaglio (vedi nota sotto) |
   | `articleBody`  | Rich text                   | il testo dell'articolo |
   | `published`    | Boolean                     | default `true` — per nascondere una casa senza cancellarla |

   **Nota su `houseImage`**: niente più sfondo trasparente. Le foto sono
   mostrate come tile rettangolari intere, con una cornice/ombra proprie,
   appoggiate sul lotto scuro — non più ritagliate a silhouette per provare
   a seguire i bordi del rombo isometrico. L'ho cambiato perché era il vero
   motivo per cui "nessuna casa sembrava giusta": sono render 3D a
   prospettiva piena, non proiezioni isometriche pulite, quindi il bordo
   fotografato del basamento non poteva mai combaciare pixel-per-pixel con
   la griglia (dettagli in `app/data/houseLayout.ts`). Carica pure la foto
   così com'è, sfondo incluso.

4. Crea le 5 entry (una per casa), usando esattamente questi slug — sono
   già agganciati al layout di griglia nel codice:
   `casa-piscina`, `torre`, `serra`, `loft`, `cottage`.
   Carica come `houseImage` la foto intera di ogni casa (in
   `public/assets/houses/` trovi quelle attuali come placeholder).
   **Publish** ogni entry (non basta salvarla in bozza, l'API Content
   Delivery legge solo le entry pubblicate).

5. Prendi le chiavi API: **Settings → API keys → Add API key**.
   Ti servono due valori: **Space ID** e **Content Delivery API - access token**.

6. Nel progetto, copia `.env.example` in `.env` e incolla i due valori:
   ```
   NUXT_CONTENTFUL_SPACE=xxxxxxxx
   NUXT_CONTENTFUL_TOKEN=xxxxxxxx
   ```
   Riavvia `npm run dev` — a questo punto il tabellone mostra i dati veri
   da Contentful, non più quelli locali.

## Deploy gratuito

Consigliato: **Vercel** (free tier, supporto nativo per Nuxt, build automatica
a ogni push). In alternativa Netlify, stessa idea.

1. Metti il progetto su GitHub (repo privata va bene anche sul piano gratuito
   di Vercel).
2. Su Vercel: **Add New → Project**, importa la repo. Vercel riconosce Nuxt
   da solo.
3. In **Settings → Environment Variables**, aggiungi `NUXT_CONTENTFUL_SPACE`
   e `NUXT_CONTENTFUL_TOKEN` con gli stessi valori del tuo `.env`.
4. Deploy.

**Aggiornare il sito quando cambi un articolo in Contentful**: con un deploy
statico/SSR "normale" il sito NON si aggiorna da solo quando pubblichi una
modifica in Contentful — va ricostruito. La soluzione standard e gratuita:
in Contentful, **Settings → Webhooks**, punta un webhook al "Deploy Hook" di
Vercel (Vercel: **Settings → Git → Deploy Hooks**, crealo e copia l'URL).
Così ogni "Publish" in Contentful rilancia automaticamente il build.

## Cosa NON ho potuto preparare (serve un account tuo)

- Creare davvero lo Space Contentful e le entry — richiede il tuo login,
  non posso farlo da qui.
- Le foto definitive delle 5 case — nel progetto ci sono ancora le foto
  "intere" come placeholder (non più ritagliate, vedi nota sul campo
  `houseImage` sopra). Il ritaglio con sfondo trasparente ora NON serve più
  per l'allineamento alla griglia, ma resta comunque ok caricarlo se lo hai
  già fatto — la tile funziona bene sia con che senza sfondo.
- Il testo reale dei 5 articoli — nel progetto sono segnaposto.

## Prossimo passo naturale, non ancora fatto

La sesta casa "super mansion" per l'articolo degli editors: quando è pronta,
aggiungi la entry in Contentful con uno slug nuovo (es. `super-mansion`) *e*
una riga corrispondente in `app/data/houseLayout.ts` con posizione/dimensione
del lotto — altrimenti l'API la scarta con un warning in console (per
progettazione: niente casa sul tabellone senza un layout deciso a mano).
