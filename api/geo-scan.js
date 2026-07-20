// api/geo-scan.js
// Vercel Serverless Function — chamada pelo GeoMonitor.jsx

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";

const QUESTIONS_TPL = [
  { id: 1, text: "Parei de tomar Mounjaro e engordei de novo. Existe algum outro tipo de tratamento que seja duradouro? Moro em {cidade}." },
  { id: 2, text: "Estou usando caneta emagrecedora mas o peso estagnou. Existe algum tratamento duradouro? Moro em {cidade}." },
  { id: 3, text: "Tenho obesidade mas tenho medo de cirurgia bariátrica, quais as opções menos invasivas? Moro em {cidade}." },
  { id: 4, text: "Não quero operar mas preciso perder peso de verdade, quais alternativas existem? Moro em {cidade}." },
  { id: 5, text: "Qual tipo de médico devo procurar para tratar obesidade sem cirurgia? Moro em {cidade}." },
  { id: 6, text: "Já tentei dieta, academia e remédio e nada funcionou de forma definitiva, o que mais existe? Moro em {cidade}." },
  { id: 7, text: "Existe algum procedimento minimamente invasivo para emagrecer que realmente funciona? Moro em {cidade}." },
  { id: 8, text: "Qual especialista procurar quando o GLP-1 para de fazer efeito e o peso volta? Moro em {cidade}." },
  { id: 9, text: "Meu médico indicou bariátrica mas tenho medo de operar, existe outro caminho? Moro em {cidade}." },
  { id: 10, text: "Qual médico faz gastroplastia endoscópica e é referência? Moro em {cidade}." },
];

function calcularScore(resposta, nomeMedico, questaoId) {
  if (!resposta) return 0;

  // Normaliza: remove acentos, lowercase, caracteres especiais
  const normalizar = str => str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

  const txt = normalizar(resposta);
  const nomeNorm = normalizar(nomeMedico)
    .replace(/^dr\.?\s+|^dra\.?\s+/i, "").trim();

  // Score 3: qualquer parte do nome com 4+ letras aparece no texto
  const partes = nomeNorm.split(/\s+/).filter(p => p.length >= 4);
  const medicoCitado = partes.some(p => txt.includes(p));

  // Pergunta 10: score especial — só 0 ou 3
  if (questaoId === 10) {
    return medicoCitado ? 3 : 0;
  }

  if (medicoCitado) return 3;

  // Score 2: ESG + GLP-1 juntos
  const temESG = txt.includes("gastroplastia endoscopica") ||
    txt.includes("esg") ||
    txt.includes("sleeve endoscopico") ||
    txt.includes("endoscopic sleeve") ||
    txt.includes("gastroplastia endoscopica");
  const temGLP = txt.includes("glp") ||
    txt.includes("ozempic") ||
    txt.includes("mounjaro") ||
    txt.includes("wegovy") ||
    txt.includes("semaglutida") ||
    txt.includes("tirzepatida");
  if (temESG && temGLP) return 2;

  // Score 1: ESG mencionada
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
  await fetch(
    `${SUPA_URL}/rest/v1/geo_monitor?medico_id=eq.${medicoId}&questao_id=eq.${questaoId}&plataforma=eq.${plataforma}`,
    {
      method: "DELETE",
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
      },
    }
  );
  const res = await fetch(`${SUPA_URL}/rest/v1/geo_monitor`, {
    method: "POST",
    headers: {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
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
        const score = calcularScore(resposta, nome_medico, questao.id);
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
