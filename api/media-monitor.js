// api/media-monitor.js
// GeoTrack — Media Monitor
// Busca notícias por tema (mercado) E por nome dos médicos parceiros

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";
const NEWSDATA_BASE = "https://newsdata.io/api/1/news";

// Queries de mercado — sempre buscadas
const MARKET_QUERIES = [
  { query: "obesidade", tag: "Mercado", lang: "pt", country: "br" },
  { query: "GLP-1 Ozempic Mounjaro", tag: "GLP-1/Mercado", lang: "pt", country: "br" },
  { query: "gastroplastia endoscópica", tag: "ESG/Endobariatria", lang: "pt", country: "br" },
  { query: "balão intragástrico", tag: "BIB", lang: "pt", country: "br" },
  { query: "ESG endoscopic sleeve gastroplasty", tag: "ESG/Endobariatria", lang: "en", country: null },
  { query: "intragastric balloon obesity", tag: "BIB", lang: "en", country: null },
  { query: "obesity GLP-1 treatment", tag: "GLP-1/Mercado", lang: "en", country: null },
];

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchNews(query, lang, country, apiKey) {
  const params = new URLSearchParams({ apikey: apiKey, q: query, language: lang, size: 5 });
  if (country) params.set("country", country);
  const res = await fetch(`${NEWSDATA_BASE}?${params}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.results?.message || JSON.stringify(data));
  return data.results || [];
}

// Extrai sobrenome principal para busca (ex: "Dr. João Silva" → "João Silva")
function normalizarNomeMedico(nome) {
  return nome.replace(/^dr\.?\s+|^dra\.?\s+/i, "").trim();
}

function scoreRelevancia(article, isMedico = false) {
  if (isMedico) return "alta"; // citação de médico parceiro = sempre alta
  const text = `${article.title || ""} ${article.description || ""}`.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let score = 0;
  ["esg", "gastroplastia endoscopica", "sleeve endoscopico", "balao intragastrico", "endobariatria", "endoscopic sleeve", "intragastric balloon"].forEach(w => { if (text.includes(w)) score += 3; });
  ["obesidade", "obesity", "ozempic", "mounjaro", "glp", "wegovy", "bariatrica", "bariatric"].forEach(w => { if (text.includes(w)) score += 2; });
  ["peso", "weight", "emagrecer", "dieta"].forEach(w => { if (text.includes(w)) score += 1; });
  if (score >= 5) return "alta";
  if (score >= 2) return "media";
  return "baixa";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || "pub_23980cf474644e2ab67a993c113144a1";

  // Parâmetro para forçar busca só de médicos ou só de mercado
  const mode = req.query?.mode || "all"; // "all" | "market" | "doctors"

  try {
    const allArticles = [];
    const seen = new Set();
    const errors = [];

    // ── 1. QUERIES DE MERCADO ──
    if (mode === "all" || mode === "market") {
      for (const { query, tag, lang, country } of MARKET_QUERIES) {
        try {
          const results = await fetchNews(query, lang, country, NEWSDATA_KEY);
          for (const article of results) {
            if (!article.link || seen.has(article.link)) continue;
            seen.add(article.link);
            allArticles.push({
              titulo: article.title || "Sem título",
              descricao: article.description || "",
              fonte: article.source_id || article.source_name || "Fonte desconhecida",
              url: article.link,
              data_publicacao: article.pubDate ? article.pubDate.split(" ")[0] : new Date().toISOString().split("T")[0],
              tag,
              relevancia: scoreRelevancia(article, false),
              medico_nome: null,
              criado_em: new Date().toISOString(),
            });
          }
        } catch (err) {
          errors.push(`Mercado "${query}": ${err.message}`);
        }
      }
    }

    // ── 2. QUERIES POR MÉDICO ──
    if (mode === "all" || mode === "doctors") {
      let medicos = [];
      try {
        medicos = await supaFetch("medicos?select=id,nome&order=nome") || [];
      } catch (err) {
        errors.push(`Erro ao buscar médicos: ${err.message}`);
      }

      for (const medico of medicos) {
        const nomeNorm = normalizarNomeMedico(medico.nome);
        if (!nomeNorm || nomeNorm.length < 5) continue;

        try {
          // Busca em PT e EN
          const [resPT, resEN] = await Promise.allSettled([
            fetchNews(`"${nomeNorm}"`, "pt", null, NEWSDATA_KEY),
            fetchNews(`"${nomeNorm}"`, "en", null, NEWSDATA_KEY),
          ]);

          const results = [
            ...(resPT.status === "fulfilled" ? resPT.value : []),
            ...(resEN.status === "fulfilled" ? resEN.value : []),
          ];

          for (const article of results) {
            if (!article.link || seen.has(article.link)) continue;
            seen.add(article.link);
            allArticles.push({
              titulo: article.title || "Sem título",
              descricao: article.description || "",
              fonte: article.source_id || article.source_name || "Fonte desconhecida",
              url: article.link,
              data_publicacao: article.pubDate ? article.pubDate.split(" ")[0] : new Date().toISOString().split("T")[0],
              tag: "Médico Parceiro",
              relevancia: "alta",
              medico_nome: medico.nome,
              criado_em: new Date().toISOString(),
            });
          }
        } catch (err) {
          errors.push(`Médico "${nomeNorm}": ${err.message}`);
        }
      }
    }

    // ── 3. SALVA NO SUPABASE ──
    if (allArticles.length > 0) {
      await supaFetch("media_alerts?on_conflict=url", {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=representation",
        body: JSON.stringify(allArticles),
      });
    }

    return res.status(200).json({
      ok: true,
      total: allArticles.length,
      articles: allArticles,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
