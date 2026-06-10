// api/media-monitor.js
// GeoTrack — Media Monitor
// Busca notícias sobre obesidade/ESG via NewsData.io e salva no Supabase
// Chamado pelo frontend (botão manual) e pelo Cron Job diário

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const NEWSDATA_BASE = "https://newsdata.io/api/1/news";

// Keywords para busca — cobre obesidade, ESG, BIB, GLP-1 e endobariatria
const KEYWORD_SETS = [
  { query: "obesidade tratamento endoscopia", tag: "ESG/Endobariatria" },
  { query: "gastroplastia endoscópica sleeve endoscópico", tag: "ESG/Endobariatria" },
  { query: "balão intragástrico obesidade", tag: "BIB" },
  { query: "GLP-1 Ozempic Mounjaro obesidade reganho peso", tag: "GLP-1/Mercado" },
  { query: "obesidade cirurgia bariátrica tratamento Brasil", tag: "Mercado" },
  { query: "obesidade endoscopia digestiva bariatrica", tag: "Mercado" },
];

async function supaFetch(path, opts = {}) {
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPA_KEY;
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

async function fetchNews(query, apiKey) {
  const params = new URLSearchParams({
    apikey: apiKey,
    q: query,
    language: "pt",
    country: "br",
    size: 5,
  });
  const res = await fetch(`${NEWSDATA_BASE}?${params}`);
  if (!res.ok) throw new Error(`NewsData error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

function scoreRelevancia(article, tag) {
  const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();
  let score = 0;

  const highValue = ["esg", "gastroplastia endoscópica", "sleeve endoscópico", "balão intragástrico", "endobariatria", "endoscopia bariátrica"];
  const medValue  = ["obesidade", "ozempic", "mounjaro", "glp-1", "wegovy", "bariátrica", "sobrepeso"];
  const lowValue  = ["peso", "emagrecer", "dieta", "nutrição"];

  highValue.forEach(w => { if (text.includes(w)) score += 3; });
  medValue.forEach(w =>  { if (text.includes(w)) score += 2; });
  lowValue.forEach(w =>  { if (text.includes(w)) score += 1; });

  if (score >= 5) return "alta";
  if (score >= 2) return "media";
  return "baixa";
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || "pub_23980cf474644e2ab67a993c113144a1";
  const isCron = req.headers["x-vercel-cron"] === "1";

  if (!NEWSDATA_KEY) {
    return res.status(500).json({ error: "NEWSDATA_API_KEY não configurada." });
  }

  try {
    const allArticles = [];
    const seen = new Set();

    for (const { query, tag } of KEYWORD_SETS) {
      try {
        const results = await fetchNews(query, NEWSDATA_KEY);
        for (const article of results) {
          // Deduplica por link
          if (!article.link || seen.has(article.link)) continue;
          seen.add(article.link);

          const relevancia = scoreRelevancia(article, tag);
          // Se rodada automática (cron), salva só alta/media. Manual salva tudo.
          if (isCron && relevancia === "baixa") continue;

          allArticles.push({
            titulo: article.title || "Sem título",
            descricao: article.description || "",
            fonte: article.source_id || article.source_name || "Fonte desconhecida",
            url: article.link,
            data_publicacao: article.pubDate ? article.pubDate.split(" ")[0] : new Date().toISOString().split("T")[0],
            tag,
            relevancia,
            criado_em: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn(`Erro na query "${query}":`, err.message);
      }
    }

    // Salva no Supabase — upsert por URL para evitar duplicatas
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
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("media-monitor error:", err);
    return res.status(500).json({ error: err.message });
  }
}
