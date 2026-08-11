// EP-09 / 7.3: recuperacion para el asistente de protocolos con RAG. El ranking
// es deterministico y testeable (solapamiento de terminos sobre la base
// documental aprobada). La sintesis de la respuesta se hace con el gateway
// cuando esta activo; si no, se devuelve un extracto de la fuente. Cada
// respuesta cita fuente exacta y version.

export type ApprovedDoc = {
  publicId: string;
  title: string;
  version: number;
  docType: string;
  sourceRef: string;
  body: string;
  keywords: string;
};

export type RankedDoc = ApprovedDoc & { score: number };

const stopwords = new Set([
  "el", "la", "los", "las", "un", "una", "de", "del", "y", "o", "en", "que", "con",
  "para", "por", "se", "su", "al", "lo", "es", "como", "mi", "me", "si", "no"
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

// Puntua cada documento por solapamiento de terminos de la consulta con su
// titulo, palabras clave y cuerpo. Titulo y keywords pesan mas.
export function rankDocuments(query: string, docs: ApprovedDoc[], limit = 3): RankedDoc[] {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0) return [];

  const scored = docs.map((doc): RankedDoc => {
    const titleTerms = new Set(tokenize(`${doc.title} ${doc.keywords}`));
    const bodyTerms = new Set(tokenize(doc.body));
    let score = 0;
    for (const term of queryTerms) {
      if (titleTerms.has(term)) score += 3;
      if (bodyTerms.has(term)) score += 1;
    }
    return { ...doc, score };
  });

  return scored
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function extractiveSnippet(body: string, maxChars = 400): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length <= maxChars ? clean : `${clean.slice(0, maxChars)}…`;
}
