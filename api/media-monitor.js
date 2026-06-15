// api/media-monitor.js
// GeoTrack — Media Monitor
// Fontes: NewsData.io + Google News RSS + URL manual

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";
const NEWSDATA_BASE = "https://newsdata.io/api/1/news";

// Palavras que indicam contexto médico/saúde — se nenhuma aparecer, descarta
// Palavras de ALTA especificidade médica — pelo menos UMA deve aparecer
// para o artigo ser aceito. Termos genéricos como "saúde", "tratamento",
// "médico" foram removidos pois ocorrem em contextos esportivos/políticos.
const MEDICAL_CONTEXT = [
  // Procedimentos e especialidades
  "endoscopia","endoscópica","endoscopico","gastroplastia","bariátrica","bariatrica",
  "endobariatria","cirurgia bariátrica","cirurgia bariatrica","sleeve","bypass",
  "gastrectomia","gastroenterologia","nutrologia","endocrinologia",
  // Condições
  "obesidade","obesity","sobrepeso","overweight","imc","índice de massa corporal",
  "compulsão alimentar","transtorno alimentar","resistência insulina",
  // Medicamentos GLP-1 (muito específicos)
  "ozempic","semaglutida","semaglutide","mounjaro","tirzepatida","tirzepatide",
  "wegovy","rybelsus","saxenda","victoza","glp-1","glp1",
  // Dispositivos
  "balão intragástrico","balao intragastrico","intragastric balloon",
  "endoscopic sleeve","esg","bib intragástrico",
  // Contexto clínico específico
  "paciente obeso","paciente obesidade","reganho de peso","perda de peso",
  "cirurgião bariátrico","médico bariátrico","endoscopista",
];

const MARKET_QUERIES = [
  { query: "obesidade", tag: "Mercado", lang: "pt", country: "br" },
  { query: "Ozempic semaglutida", tag: "GLP-1/Mercado", lang: "pt", country: "br" },
  { query: "Mounjaro tirzepatida", tag: "GLP-1/Mercado", lang: "pt", country: "br" },
  { query: "gastroplastia endoscópica", tag: "ESG/Endobariatria", lang: "pt", country: "br" },
  { query: "balão intragástrico", tag: "BIB", lang: "pt", country: "br" },
  { query: "ESG endoscopic sleeve gastroplasty", tag: "ESG/Endobariatria", lang: "en", country: null },
  { query: "intragastric balloon obesity", tag: "BIB", lang: "en", country: null },
  { query: "semaglutide tirzepatide obesity", tag: "GLP-1/Mercado", lang: "en", country: null },
];

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: opts.prefer || "return=representation", ...opts.headers },
    ...opts,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchNewsData(query, lang, country, apiKey) {
  const params = new URLSearchParams({ apikey: apiKey, q: query, language: lang, size: 5 });
  if (country) params.set("country", country);
  const res = await fetch(`${NEWSDATA_BASE}?${params}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.results?.message || JSON.stringify(data));
  return data.results || [];
}

async function fetchGoogleNewsRSS(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google News RSS ${res.status}`);
  const xml = await res.text();
  const items = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const item = match[1];
    const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || "";
    const link    = (item.match(/<link>(.*?)<\/link>/))?.[1]?.trim() || "";
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim() || "";
    const source  = (item.match(/<source[^>]*>(.*?)<\/source>/))?.[1]?.trim() || "Google News";
    const desc    = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/))?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    // Limpa HTML e entidades da descrição
    const cleanDesc = desc.replace(/<[^>]+>/g, "").replace(/&lt;.*?&gt;/g, "").replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim();
    if (title && link) items.push({ title, link, pubDate, source, description: cleanDesc });
  }
  return items;
}

async function fetchURLMeta(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; GeoTrack/1.0)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const title   = (html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i))?.[1]?.trim() || url;
  const desc    = (html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) || html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i))?.[1]?.trim() || "";
  const site    = (html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i))?.[1]?.trim() || new URL(url).hostname.replace("www.", "");
  const dateStr = (html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i))?.[1]?.trim() || new Date().toISOString();
  return { title, description: desc, source: site, pubDate: dateStr.split("T")[0] };
}

function normalizarNome(nome) {
  return nome.replace(/^dr\.?\s+|^dra\.?\s+/i, "").trim();
}

// FILTRO RESTRITO: só aceita artigo se o TÍTULO contiver pelo menos 1 termo de obesidade/emagrecimento
// Propositalmente ignoramos a descrição pois o RSS retorna HTML encoded (&lt;a href=...)
const OBESITY_TITLE_TERMS = [
  // Condição
  "obesidade","obeso","obesa","sobrepeso","overweight","obesity",
  // Perda de peso / emagrecimento
  "emagrecimento","emagrecer","perda de peso","weight loss","perda peso",
  // Medicamentos GLP-1 — muito específicos, raramente homônimos
  "ozempic","wegovy","semaglutida","semaglutide","mounjaro","tirzepatida","tirzepatide",
  "glp-1","glp1","saxenda","victoza","rybelsus",
  // Procedimentos bariátricos / endoscópicos
  "gastroplastia","gastric sleeve","sleeve","bypass gástrico","cirurgia bariátrica",
  "cirurgia bariatrica","bariátrica","bariatrica","gastrectomia",
  "balão intragástrico","balao intragastrico","intragastric balloon",
  "endoscopic sleeve","esg endobariatria","endobariatria",
  // Contexto clínico
  "imc","índice de massa corporal","indice de massa corporal",
  "reganho de peso","compulsão alimentar",
];

function isMedicalContext(title, _description) {
  // Filtra SOMENTE pelo título — descrição do RSS é HTML lixo
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return OBESITY_TITLE_TERMS.some(w => t.includes(w));
}

function scoreRelevancia(title, description, isMedico = false) {
  if (isMedico) return "alta";
  const text = `${title} ${description}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let score = 0;
  ["esg","gastroplastia endoscopica","sleeve endoscopico","balao intragastrico","endobariatria","endoscopic sleeve","intragastric balloon"].forEach(w => { if (text.includes(w)) score += 3; });
  ["obesidade","obesity","ozempic","mounjaro","glp","wegovy","bariatrica","bariatric"].forEach(w => { if (text.includes(w)) score += 2; });
  ["peso","weight","emagrecer","dieta"].forEach(w => { if (text.includes(w)) score += 1; });
  if (score >= 5) return "alta";
  if (score >= 2) return "media";
  return "baixa";
}

function parseDate(str) {
  if (!str) return new Date().toISOString().split("T")[0];
  try { return new Date(str).toISOString().split("T")[0]; } catch { return new Date().toISOString().split("T")[0]; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const NEWSDATA_KEY = process.env.NEWSDATA_API_KEY || "pub_23980cf474644e2ab67a993c113144a1";
  const mode      = req.query?.mode || "all";
  const manualUrl = req.query?.url || null;

  try {
    const allArticles = [];
    const seen = new Set();
    const errors = [];

    // ── URL MANUAL ──
    if (manualUrl) {
      try {
        const meta = await fetchURLMeta(manualUrl);
        const medico_nome = req.query?.medico || null;
        const tag = medico_nome ? "Médico Parceiro" : (req.query?.tag || "Mercado");
        const article = {
          titulo: meta.title, descricao: meta.description, fonte: meta.source, url: manualUrl,
          data_publicacao: meta.pubDate, tag,
          relevancia: medico_nome ? "alta" : scoreRelevancia(meta.title, meta.description),
          medico_nome: medico_nome || null, criado_em: new Date().toISOString(),
        };
        await supaFetch("media_alerts?on_conflict=url", { method: "POST", prefer: "resolution=ignore-duplicates,return=representation", body: JSON.stringify([article]) });
        return res.status(200).json({ ok: true, total: 1, articles: [article], errors: [] });
      } catch (err) {
        return res.status(400).json({ error: `Erro ao processar URL: ${err.message}` });
      }
    }

    // ── MERCADO: NewsData.io ──
    if (mode === "all" || mode === "market") {
      for (const { query, tag, lang, country } of MARKET_QUERIES) {
        try {
          const results = await fetchNewsData(query, lang, country, NEWSDATA_KEY);
          for (const a of results) {
            if (!a.link || seen.has(a.link)) continue;
            seen.add(a.link);
            allArticles.push({
              titulo: a.title || "Sem título", descricao: a.description || "",
              fonte: a.source_id || "NewsData", url: a.link,
              data_publicacao: parseDate(a.pubDate), tag,
              relevancia: scoreRelevancia(a.title, a.description),
              medico_nome: null, criado_em: new Date().toISOString(),
            });
          }
        } catch (err) { errors.push(`NewsData "${query}": ${err.message}`); }
      }

      // Google News RSS mercado
      for (const { query, tag } of [
        { query: "obesidade tratamento Brasil", tag: "Mercado" },
        { query: "gastroplastia endoscópica", tag: "ESG/Endobariatria" },
        { query: "balão intragástrico", tag: "BIB" },
        { query: "GLP-1 Ozempic obesidade", tag: "GLP-1/Mercado" },
      ]) {
        try {
          const results = await fetchGoogleNewsRSS(query);
          for (const a of results) {
            if (!a.link || seen.has(a.link)) continue;
            seen.add(a.link);
            allArticles.push({
              titulo: a.title, descricao: a.description || "",
              fonte: a.source || "Google News", url: a.link,
              data_publicacao: parseDate(a.pubDate), tag,
              relevancia: scoreRelevancia(a.title, a.description),
              medico_nome: null, criado_em: new Date().toISOString(),
            });
          }
        } catch (err) { errors.push(`Google News "${query}": ${err.message}`); }
      }
    }


    // ── MÉDICOS: Google News RSS + filtro de contexto médico ──
    if (mode === "all" || mode === "doctors") {
      let medicos = [];
      try { medicos = await supaFetch("medicos?select=id,nome,cidade,especialidade&order=nome") || []; }
      catch (err) { errors.push(`Supabase médicos: ${err.message}`); }

      for (const medico of medicos) {
        const nome = normalizarNome(medico.nome);
        if (!nome || nome.length < 5) continue;

        // Monta qualificadores para evitar homônimos
        const qualificadores = [];
        if (medico.cidade)       qualificadores.push(medico.cidade);
        if (medico.especialidade) qualificadores.push(medico.especialidade);
        // Fallback: termos clínicos restritos quando não há cidade/especialidade
        const contextoClin = qualificadores.length > 0
          ? qualificadores.join(" ")
          : "obesidade OR semaglutida OR ozempic OR gastroplastia OR bariatrica OR "perda de peso"";

        const queriesMedico = [
          `"${nome}" ${contextoClin}`,
        ];

        for (const query of queriesMedico) {
          try {
            const results = await fetchGoogleNewsRSS(query);
            for (const a of results) {
              if (!a.link || seen.has(a.link)) continue;
              if (!isMedicalContext(a.title, a.description)) continue;
              seen.add(a.link);
              allArticles.push({
                titulo: a.title, descricao: a.description || "",
                fonte: a.source || "Google News", url: a.link,
                data_publicacao: parseDate(a.pubDate),
                tag: "Médico Parceiro", relevancia: "alta",
                medico_nome: medico.nome, criado_em: new Date().toISOString(),
              });
            }
          } catch (err) { errors.push(`Google News "${nome}": ${err.message}`); }
        }
      }
    }

    // ── SALVA ──
    if (allArticles.length > 0) {
      await supaFetch("media_alerts?on_conflict=url", {
        method: "POST", prefer: "resolution=ignore-duplicates,return=representation",
        body: JSON.stringify(allArticles),
      });
    }

    return res.status(200).json({ ok: true, total: allArticles.length, articles: allArticles, errors, timestamp: new Date().toISOString() });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

