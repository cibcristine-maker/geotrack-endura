// api/geo-scan.js
// Vercel Serverless Function — chamada pelo GeoMonitor.jsx

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";

const QUESTIONS_TPL = [
  { id: 1, text: "Parei de tomar Mounjaro e engordei de novo. Existe algum outro tipo de tratamento que seja duradouro? Moro em {cidade}." },
  { id: 2, text: "Qual especialista procurar quando o GLP-1 para de fazer efeito e o peso volta? Moro em {cidade}." },
  { id: 3, text: "O medicamento me fez mal e eu parei de tomar. Quais os caminhos para tratar obesidade sem passar por isso de novo? Moro em {cidade}." },
  { id: 4, text: "Não consigo tomar a caneta emagrecedora por causa dos efeitos colaterais. Existe outro tratamento que funcione? Moro em {cidade}." },
  { id: 5, text: "Estou usando caneta emagrecedora mas o peso estagnou. Existe algum tratamento duradouro? Moro em {cidade}." },
  { id: 6, text: "Não emagreço mais com Mounjaro, o que fazer? Moro em {cidade}." },
  { id: 7, text: "Não consigo pagar a caneta emagrecedora todo mês. Existe alternativa com melhor custo a longo prazo? Moro em {cidade}." },
  { id: 8, text: "Qual tipo de médico devo procurar para tratar obesidade sem cirurgia? Moro em {cidade}." },
  { id: 9, text: "Tenho obesidade mas tenho medo de cirurgia bariátrica, quais as opções menos invasivas? Moro em {cidade}." },
  { id: 10, text: "Meu médico indicou bariátrica mas tenho medo de operar, existe outro caminho? Moro em {cidade}." },
  { id: 11, text: "Fiz cirurgia bariátrica e voltei a engordar. Existe tratamento sem operar de novo? Moro em {cidade}." },
  { id: 12, text: "Meu estômago dilatou depois da bariátrica e voltei a engordar. O que fazer sem nova cirurgia? Moro em {cidade}." },
  { id: 13, text: "Qual médico faz gastroplastia endoscópica e é referência? Moro em {cidade}." },
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

  // Pergunta 13: busca direta pelo nome do procedimento — score especial, só 0 ou 3
  if (questaoId === 13) {
    return medicoCitado ? 3 : 0;
  }

  if (medicoCitado) return 3;

  // Score 1: ESG mencionada (categoria aparece na resposta, com ou sem nome do médico)
  const temESG = txt.includes("gastroplastia endoscopica") ||
    txt.includes("esg") ||
    txt.includes("sleeve endoscopico") ||
    txt.includes("endoscopic sleeve");
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

  const { medico_id, nome_medico, cidade, plataformas, teste } = req.body || {};

  if (!medico_id || !nome_medico || !cidade) {
    return res.status(400).json({ error: "medico_id, nome_medico e cidade são obrigatórios" });
  }

  // Modo diagnóstico: testa só 1 pergunta em 1 plataforma
  if (teste) {
    const plat = plataformas?.[0] || "chatgpt";
    const fn = LLM_FNS[plat];
    if (!fn) return res.status(400).json({ error: `Plataforma inválida: ${plat}` });
    const q = QUESTIONS_TPL[0];
    const prompt = q.text.replace(/{cidade}/g, cidade);
    try {
      const chaves = {
        chatgpt: !!process.env.OPENAI_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        claude: !!process.env.ANTHROPIC_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        grok: !!process.env.GROK_API_KEY,
        supa: !!process.env.SUPA_SERVICE_KEY,
      };
      const resposta = await fn(prompt);
      const score = calcularScore(resposta, nome_medico, q.id);
      return res.status(200).json({ ok: true, plataforma: plat, prompt, resposta: resposta.slice(0,300), score, chaves });
    } catch (e) {
      return res.status(200).json({ ok: false, plataforma: plat, prompt, erro: e.message, stack: e.stack?.slice(0,300) });
    }
  }

  const supaKey = process.env.SUPA_SERVICE_KEY;
  const plataformasRodar = plataformas || Object.keys(LLM_FNS);
  const resultados = [];
  const erros = [];

  // Roda as plataformas de cada pergunta EM PARALELO (antes era sequencial: 65
  // chamadas em fila esperando uma da outra, o que estourava o tempo limite
  // com 13 perguntas). Agora são 13 rodadas, cada uma limitada pela plataforma
  // mais lenta daquela rodada, não pela soma de todas as chamadas.
  for (const questao of QUESTIONS_TPL) {
    const prompt = questao.text.replace(/{cidade}/g, cidade);

    const tarefas = plataformasRodar
      .filter(plataforma => LLM_FNS[plataforma])
      .map(async (plataforma) => {
        const fn = LLM_FNS[plataforma];
        try {
          const resposta = await fn(prompt);
          const score = calcularScore(resposta, nome_medico, questao.id);
          await salvarScore(supaKey, medico_id, questao.id, plataforma, score);
          return { ok: true, questao_id: questao.id, plataforma, score };
        } catch (e) {
          return { ok: false, questao_id: questao.id, plataforma, erro: e.message };
        }
      });

    const respostas = await Promise.all(tarefas);
    respostas.forEach(r => {
      if (r.ok) resultados.push({ questao_id: r.questao_id, plataforma: r.plataforma, score: r.score });
      else erros.push({ questao_id: r.questao_id, plataforma: r.plataforma, erro: r.erro });
    });
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
