// api/geo-scan.js
// Vercel Serverless Function — chamada pelo GeoMonitor.jsx

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";

const QUESTIONS_TPL = [
  { id: 1, text: "Parei o Mounjaro em {cidade} e voltei a engordar, o que fazer?" },
  { id: 2, text: "Existe tratamento definitivo em {cidade} para quem parou ozempic e engordou?" },
  { id: 3, text: "O que é gastroplastia endoscópica em {cidade} e como funciona?" },
  { id: 4, text: "Gastroplastia endoscópica é melhor que continuar com GLP-1 em {cidade}?" },
  { id: 5, text: "Qual procedimento para emagrecer sem cirurgia bariátrica em {cidade}?" },
  { id: 6, text: "Quanto custa gastroplastia endoscópica em {cidade} e tem no plano?" },
  { id: 7, text: "Qual médico faz gastroplastia endoscópica em {cidade}?" },
  { id: 8, text: "Posso fazer gastroplastia endoscópica depois de usar GLP-1 em {cidade}?" },
  { id: 9, text: "Gastroplastia endoscópica tem risco em {cidade}? É segura?" },
  { id: 10, text: "Qual o resultado da gastroplastia endoscópica a longo prazo em {cidade}?" },
];

function calcularScore(resposta, nomeMedico) {
  if (!resposta) return 0;
  const txt = resposta.toLowerCase();

  const partes = nomeMedico.toLowerCase()
    .replace(/^dr\.?\s+|^dra\.?\s+/i, "")
    .split(" ")
    .filter(p => p.length >= 4);
  if (partes.some(p => txt.includes(p))) return 3;

  const temESG = txt.includes("gastroplastia endoscópica") || txt.includes("esg") ||
    txt.includes("sleeve endoscópico") || txt.includes("endoscopic sleeve");
  const temGLP = txt.includes("glp-1") || txt.includes("ozempic") ||
    txt.includes("mounjaro") || txt.includes("wegovy") ||
    txt.includes("semaglutida") || txt.includes("tirzepatida");
  if (temESG && temGLP) return 2;
  if (temESG) return 1;
  return 0;
}

async function askChatGPT(prompt) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function askGemini(prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
      }),
    }
  );
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function askPerplexity(prompt) {
  const r = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function askClaude(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

async function askGrok(prompt) {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

const LLM_FNS = {
  chatgpt: askChatGPT,
  gemini: askGemini,
  perplexity: askPerplexity,
  claude: askClaude,
  grok: askGrok,
};

async function salvarScore(supaKey, medicoId, questaoId, plataforma, score) {
  const res = await fetch(`${SUPA_URL}/rest/v1/geo_monitor`, {
    method: "POST",
    headers: {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      medico_id: medicoId,
      questao_id: questaoId,
      plataforma,
      score,
      updated_at: new Date().toISOString(),
    }),
  });
  return res.ok;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { medico_id, nome_medico, cidade, plataformas } = req.body || {};

  if (!medico_id || !nome_medico || !cidade) {
    return res.status(400).json({ error: "medico_id, nome_medico e cidade são obrigatórios" });
  }

  const supaKey = process.env.SUPA_SERVICE_KEY;
  const plataformasRodar = plataformas || Object.keys(LLM_FNS);
  const resultados = [];
  const erros = [];

  for (const questao of QUESTIONS_TPL) {
    const prompt = questao.text.replace(/{cidade}/g, cidade);

    for (const plataforma of plataformasRodar) {
      const fn = LLM_FNS[plataforma];
      if (!fn) continue;

      try {
        const resposta = await fn(prompt);
        const score = calcularScore(resposta, nome_medico);
        await salvarScore(supaKey, medico_id, questao.id, plataforma, score);
        resultados.push({ questao_id: questao.id, plataforma, score });
      } catch (e) {
        erros.push({ questao_id: questao.id, plataforma, erro: e.message });
      }

      await new Promise(r => setTimeout(r, 200));
    }
  }

  const scoreTotal = resultados.reduce((a, b) => a + b.score, 0);
  const scoreMax = resultados.length * 3;
  const percentual = scoreMax > 0 ? Math.round((scoreTotal / scoreMax) * 100) : 0;

  return res.status(200).json({
    ok: true,
    total: resultados.length,
    score_total: scoreTotal,
    percentual,
    erros: erros.length ? erros : undefined,
  });
};
