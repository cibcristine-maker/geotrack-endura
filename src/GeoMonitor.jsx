import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";

const supa = async (path, opts = {}) => {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const PLATFORMS = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
  { id: "perplexity", label: "Perplexity" },
  { id: "claude", label: "Claude" },
  { id: "grok", label: "Grok" },
];

const QUESTIONS_TPL = [
  { id: 1, text: "Parei de tomar Mounjaro e engordei de novo. Existe algum outro tipo de tratamento que seja duradouro? Moro em {cidade}.", intent: "Reganho pós-GLP-1", priority: "critica" },
  { id: 2, text: "Qual especialista procurar quando o GLP-1 para de fazer efeito e o peso volta? Moro em {cidade}.", intent: "Reganho pós-GLP-1", priority: "critica" },
  { id: 3, text: "O medicamento me fez mal e eu parei de tomar. Quais os caminhos para tratar obesidade sem passar por isso de novo? Moro em {cidade}.", intent: "Intolerância a efeito colateral", priority: "alta" },
  { id: 4, text: "Não consigo tomar a caneta emagrecedora por causa dos efeitos colaterais. Existe outro tratamento que funcione? Moro em {cidade}.", intent: "Intolerância a efeito colateral", priority: "alta" },
  { id: 5, text: "Estou usando caneta emagrecedora mas o peso estagnou. Existe algum tratamento duradouro? Moro em {cidade}.", intent: "Estagnação no GLP-1", priority: "critica" },
  { id: 6, text: "Não emagreço mais com Mounjaro, o que fazer? Moro em {cidade}.", intent: "Estagnação no GLP-1", priority: "critica" },
  { id: 7, text: "Não consigo pagar a caneta emagrecedora todo mês. Existe alternativa com melhor custo a longo prazo? Moro em {cidade}.", intent: "Objeção de custo", priority: "alta" },
  { id: 8, text: "Qual tipo de médico devo procurar para tratar obesidade sem cirurgia? Moro em {cidade}.", intent: "Busca por especialista", priority: "alta" },
  { id: 9, text: "Tenho obesidade mas tenho medo de cirurgia bariátrica, quais as opções menos invasivas? Moro em {cidade}.", intent: "Alternativa cirúrgica", priority: "alta" },
  { id: 10, text: "Meu médico indicou bariátrica mas tenho medo de operar, existe outro caminho? Moro em {cidade}.", intent: "Alternativa cirúrgica", priority: "alta" },
  { id: 11, text: "Fiz cirurgia bariátrica e voltei a engordar. Existe tratamento sem operar de novo? Moro em {cidade}.", intent: "Reganho pós-bariátrica", priority: "critica" },
  { id: 12, text: "Meu estômago dilatou depois da bariátrica e voltei a engordar. O que fazer sem nova cirurgia? Moro em {cidade}.", intent: "Reganho pós-bariátrica", priority: "critica" },
  { id: 13, text: "Qual médico faz gastroplastia endoscópica e é referência? Moro em {cidade}.", intent: "Busca direta", priority: "critica", scoreEspecial: true },
];

const SCORE_OPTIONS = [
  { value: 0, label: "Invisível", color: "#ef4444", bg: "#fee2e2" },
  { value: 1, label: "ESG mencionada", color: "#f59e0b", bg: "#fef3c7" },
  { value: 3, label: "Médico citado", color: "#10b981", bg: "#d1fae5" },
];

const SCORE_OPTIONS_Q10 = [
  { value: 0, label: "Não citado", color: "#ef4444", bg: "#fee2e2" },
  { value: 3, label: "Médico citado", color: "#10b981", bg: "#d1fae5" },
];

const priorityStyle = {
  critica: { bg: "#fce7f3", text: "#be185d" },
  alta: { bg: "#fff7ed", text: "#c2410c" },
  media: { bg: "#f0fdf4", text: "#166534" },
};

function scoreGrade(pct) {
  if (pct >= 70) return { label: "Visível", color: "#10b981" };
  if (pct >= 40) return { label: "Parcial", color: "#f59e0b" };
  return { label: "Invisível", color: "#ef4444" };
}

function getQuestions(cidade) {
  const c = cidade || "sua cidade";
  return QUESTIONS_TPL.map(q => ({ ...q, text: q.text.replace(/{cidade}/g, c) }));
}

// ─── AUTO SCAN BUTTON ────────────────────────────────────────────────────────
function AutoScanButton({ medico, accent, muted, card, border, onScanComplete }) {
  const [scanning, setScanning] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  async function iniciarScan() {
    if (!medico) return;
    setScanning(true);
    setResultado(null);
    setErro(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 280000); // 280s timeout

    try {
      const res = await fetch("/api/geo-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          medico_id: medico.id,
          nome_medico: medico.nome,
          cidade: medico.cidade || "sua cidade",
        }),
      });

      clearTimeout(timeoutId);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error(`Resposta inválida da API: ${text.slice(0,200)}`); }
      if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);
      setResultado(data);
      if (onScanComplete) onScanComplete();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === "AbortError") {
        setErro("Timeout — o scan demorou mais de 4 minutos. Tente novamente ou verifique as chaves de API no Vercel.");
      } else {
        setErro(e.message || "Erro desconhecido");
      }
    } finally {
      setScanning(false);
    }
  }

  async function testarDiagnostico() {
    if (!medico) return;
    setScanning(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch("/api/geo-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medico_id: medico.id,
          nome_medico: medico.nome,
          cidade: medico.cidade || "São Paulo",
          plataformas: ["chatgpt"],
          teste: true,
        }),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setErro(`🔍 DIAGNÓSTICO:
Chaves: ${JSON.stringify(data.chaves)}
Plataforma: ${data.plataforma}
OK: ${data.ok}
${data.erro ? "Erro: " + data.erro : "Score: " + data.score + "\nResposta: " + data.resposta}`);
      } catch { setErro("Resposta inválida: " + text.slice(0,300)); }
    } catch(e) { setErro("Falha na chamada: " + e.message); }
    finally { setScanning(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={iniciarScan} disabled={scanning || !medico} style={{
          padding: "8px 16px", borderRadius: 8, border: `1px solid ${scanning ? muted : accent}`,
          background: scanning ? `${muted}22` : `${accent}22`, color: scanning ? muted : accent,
          cursor: scanning || !medico ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
          letterSpacing: 1, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}>
          {scanning ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Analisando...</> : <>🤖 Auto Scan</>}
        </button>
        <button onClick={testarDiagnostico} disabled={scanning || !medico} style={{
          padding: "8px 12px", borderRadius: 8, border: `1px solid ${muted}`,
          background: "transparent", color: muted,
          cursor: scanning || !medico ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600,
        }}>🔍 Diagnóstico</button>
      </div>
      {resultado && (
        <div style={{ fontSize: 11, padding: "6px 10px", borderRadius: 6, background: "#d1fae522", border: "1px solid #10b98133", color: "#10b981" }}>
          ✅ Scan concluído · Score: {resultado.percentual}% · {resultado.total} registros
          {resultado.erros?.length > 0 && <span style={{ color: "#f59e0b" }}> · {resultado.erros.length} erros</span>}
        </div>
      )}
      {erro && (
        <div style={{ fontSize: 11, padding: "8px 10px", borderRadius: 6, background: "#fee2e222", border: "1px solid #ef444433", color: "#ef4444", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          ⚠️ {erro}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── CARD DE DIAGNÓSTICO ─────────────────────────────────────────────────────
function DiagnosticoCard({ medico, scores, accent, muted, card, border, text }) {
  if (!medico) return null;

  const allScores = PLATFORMS.map(p => {
    const vals = QUESTIONS_TPL.map(q => scores[medico.id]?.[q.id]?.[p.id] ?? null).filter(v => v !== null);
    if (vals.length === 0) return null;
    return { platform: p, pct: Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100), count: vals.length };
  }).filter(Boolean);

  if (allScores.length === 0) return (
    <div style={{ padding: "10px 14px", background: `${accent}08`, borderRadius: 8, border: `1px solid ${accent}22`, fontSize: 12, color: muted, marginBottom: 16 }}>
      Nenhum dado ainda. Clique em Auto Scan para analisar.
    </div>
  );

  const mediaGeral = Math.round(allScores.reduce((a, b) => a + b.pct, 0) / allScores.length);
  const piorPlataforma = allScores.reduce((a, b) => a.pct < b.pct ? a : b);
  const melhorPlataforma = allScores.reduce((a, b) => a.pct > b.pct ? a : b);

  const perguntasScore = QUESTIONS_TPL.map(q => {
    const vals = PLATFORMS.map(p => scores[medico.id]?.[q.id]?.[p.id] ?? null).filter(v => v !== null);
    if (vals.length === 0) return null;
    return { q, avg: vals.reduce((a, b) => a + b, 0) / vals.length };
  }).filter(Boolean);

  const piorPergunta = perguntasScore.length > 0 ? perguntasScore.reduce((a, b) => a.avg < b.avg ? a : b) : null;
  const grade = scoreGrade(mediaGeral);

  return (
    <div style={{ marginBottom: 16, background: card, borderRadius: 10, border: `1px solid ${border}`, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Diagnóstico Consolidado</div>
          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Média das {allScores.length} plataformas analisadas</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: grade.color, lineHeight: 1 }}>{mediaGeral}%</div>
          <div style={{ fontSize: 11, color: grade.color, fontWeight: 600 }}>{grade.label}</div>
        </div>
      </div>

      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1 }}>SCORE POR PLATAFORMA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {allScores.sort((a, b) => b.pct - a.pct).map(({ platform, pct }) => {
            const g = scoreGrade(pct);
            return (
              <div key={platform.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 11, color: text, minWidth: 80 }}>{platform.label}</div>
                <div style={{ flex: 1, height: 6, background: `${border}`, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: g.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: g.color, minWidth: 36, textAlign: "right" }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "10px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140, padding: "8px 10px", borderRadius: 6, background: "#fee2e222", border: "1px solid #ef444433" }}>
          <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, marginBottom: 3 }}>⚠️ MAIS FRACA</div>
          <div style={{ fontSize: 12, color: text, fontWeight: 600 }}>{piorPlataforma.platform.label}</div>
          <div style={{ fontSize: 11, color: muted }}>{piorPlataforma.pct}% de visibilidade</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, padding: "8px 10px", borderRadius: 6, background: "#d1fae522", border: "1px solid #10b98133" }}>
          <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600, marginBottom: 3 }}>✅ MAIS FORTE</div>
          <div style={{ fontSize: 12, color: text, fontWeight: 600 }}>{melhorPlataforma.platform.label}</div>
          <div style={{ fontSize: 11, color: muted }}>{melhorPlataforma.pct}% de visibilidade</div>
        </div>
        {piorPergunta && (
          <div style={{ width: "100%", padding: "8px 10px", borderRadius: 6, background: "#fff7ed22", border: "1px solid #f59e0b33" }}>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, marginBottom: 3 }}>🎯 LACUNA PRIORITÁRIA</div>
            <div style={{ fontSize: 11, color: text }}>Q{piorPergunta.q.id}: {piorPergunta.q.intent}</div>
            <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>Score médio: {piorPergunta.avg.toFixed(1)}/3 em todas as plataformas</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function GeoMonitor({ medicos = [], s = {} }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [modo, setModo] = useState("medico");
  const [medicoSel, setMedicoSel] = useState(null);
  const [plataformaSel, setPlataformaSel] = useState(0);
  const [busca, setBusca] = useState("");
  const [rankOrdem, setRankOrdem] = useState("asc");

  const card = s.card || "#0A2342";
  const border = s.border || "#1e3a5f";
  const accent = s.accent || "#00879E";
  const muted = s.muted || "#64748b";
  const text = s.text || "#e2e8f0";

  const fetchRegistros = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supa("geo_monitor?select=*");
      setRegistros(data || []);
      const map = {};
      (data || []).forEach(r => {
        if (!map[r.medico_id]) map[r.medico_id] = {};
        if (!map[r.medico_id][r.questao_id]) map[r.medico_id][r.questao_id] = {};
        map[r.medico_id][r.questao_id][r.plataforma] = r.score;
      });
      setScores(map);
    } catch (e) { setScores({}); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRegistros();
    if (medicos.length > 0) setMedicoSel(medicos[0]);
  }, [fetchRegistros, medicos]);

  const getScore = (mId, qId, plId) => scores[mId]?.[qId]?.[plId] ?? null;

  async function setScore(mId, qId, plId, value) {
    setScores(prev => ({ ...prev, [mId]: { ...prev[mId], [qId]: { ...prev[mId]?.[qId], [plId]: value } } }));
    try {
      const existing = registros.find(r => r.medico_id === mId && r.questao_id === qId && r.plataforma === plId);
      if (existing) {
        await supa(`geo_monitor?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify({ score: value, updated_at: new Date().toISOString() }) });
      } else {
        const nr = await supa("geo_monitor", { method: "POST", body: JSON.stringify({ medico_id: mId, questao_id: qId, plataforma: plId, score: value }) });
        if (nr) setRegistros(prev => [...prev, ...(Array.isArray(nr) ? nr : [nr])]);
      }
    } catch (e) {}
  }

  function calcScoreConsolidado(mId) {
    const vals = [];
    PLATFORMS.forEach(p => {
      QUESTIONS_TPL.forEach(q => {
        const s = getScore(mId, q.id, p.id);
        if (s !== null) vals.push(s);
      });
    });
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }

  function calcGeoScore(mId, plIdx) {
    const pl = PLATFORMS[plIdx];
    const vals = QUESTIONS_TPL.map(q => getScore(mId, q.id, pl.id) ?? 0);
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }

  const medicosFiltrados = medicos.filter(m => m.nome.toLowerCase().includes(busca.toLowerCase()));

  const rankingConsolidado = [...medicos].map(m => ({
    ...m,
    scoreTotal: calcScoreConsolidado(m.id),
    piorPlataforma: PLATFORMS.reduce((worst, p) => {
      const vals = QUESTIONS_TPL.map(q => getScore(m.id, q.id, p.id) ?? null).filter(v => v !== null);
      if (vals.length === 0) return worst;
      const pct = Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
      return (!worst || pct < worst.pct) ? { label: p.label, pct } : worst;
    }, null),
  })).sort((a, b) => rankOrdem === "asc" ? a.scoreTotal - b.scoreTotal : b.scoreTotal - a.scoreTotal);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: accent }}>Carregando...</div>;

  return (
    <div style={{ color: text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>GEO Intelligence · 5 Plataformas</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>13 perguntas com cidade do médico · {medicos.length} médicos</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: card, padding: 4, borderRadius: 8, border: `1px solid ${border}` }}>
          {[["medico", "Por Médico"], ["plataforma", "Por Plataforma"]].map(([key, label]) => (
            <button key={key} onClick={() => setModo(key)} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12,
              background: modo === key ? accent : "transparent", color: modo === key ? "#fff" : muted, transition: "all 0.2s"
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── ABA POR MÉDICO ── */}
      {modo === "medico" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4, letterSpacing: 1 }}>MÉDICO</div>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar médico..."
                style={{ background: card, border: `1px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: "100%", marginBottom: 6 }} />
              <select value={medicoSel?.id || ""} onChange={e => { setMedicoSel(medicos.find(m => m.id === e.target.value)); setBusca(""); }}
                style={{ background: card, border: `1px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: "100%" }}>
                {medicosFiltrados.map(m => <option key={m.id} value={m.id}>{m.nome}{m.cidade ? ` — ${m.cidade}` : ""}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4, letterSpacing: 1 }}>PLATAFORMA</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {PLATFORMS.map((p, i) => (
                  <button key={p.id} onClick={() => setPlataformaSel(i)} style={{
                    padding: "7px 10px", borderRadius: 6, border: "1px solid",
                    borderColor: plataformaSel === i ? accent : border,
                    background: plataformaSel === i ? `${accent}22` : "transparent",
                    color: plataformaSel === i ? accent : muted, cursor: "pointer", fontSize: 11
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
            {medicoSel && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: muted }}>SCORE PLATAFORMA</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: scoreGrade(calcGeoScore(medicoSel.id, plataformaSel)).color }}>
                  {calcGeoScore(medicoSel.id, plataformaSel)}%
                </div>
              </div>
            )}
          </div>

          {medicoSel && <DiagnosticoCard medico={medicoSel} scores={scores} accent={accent} muted={muted} card={card} border={border} text={text} />}

          {medicoSel && (
            <div style={{
              marginBottom: 16, padding: "12px 14px", background: `${accent}0a`, borderRadius: 8,
              border: `1px solid ${accent}33`, display: "flex", alignItems: "center",
              justifyContent: "space-between", flexWrap: "wrap", gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 12, color: accent, fontWeight: 600 }}>Análise Automática</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Consulta as 5 LLMs automaticamente e atualiza o diagnóstico</div>
              </div>
              <AutoScanButton medico={medicoSel} accent={accent} muted={muted} card={card} border={border} onScanComplete={fetchRegistros} />
            </div>
          )}

          {medicoSel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {getQuestions(medicoSel.cidade).map(q => {
                const pl = PLATFORMS[plataformaSel];
                const current = getScore(medicoSel.id, q.id, pl.id);
                const pc = priorityStyle[q.priority];
                const isQ10 = q.scoreEspecial;
                const opcoes = isQ10 ? SCORE_OPTIONS_Q10 : SCORE_OPTIONS;
                return (
                  <div key={q.id} style={{
                    background: card, borderRadius: 8,
                    border: `1px solid ${isQ10 ? accent + "44" : border}`,
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: muted, minWidth: 22, fontFamily: "monospace", paddingTop: 2 }}>{String(q.id).padStart(2, "0")}</span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, color: text, marginBottom: 3 }}>"{q.text}"</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: muted }}>{q.intent}</span>
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: pc.bg, color: pc.text, fontWeight: 600 }}>{q.priority}</span>
                          {isQ10 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: `${accent}22`, color: accent, fontWeight: 600 }}>score 0 ou 3</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {opcoes.map(opt => (
                          <button key={opt.value} onClick={() => setScore(medicoSel.id, q.id, pl.id, opt.value)} title={opt.label}
                            style={{
                              width: 30, height: 30, borderRadius: 6, border: "2px solid",
                              borderColor: current === opt.value ? opt.color : border,
                              background: current === opt.value ? opt.bg : "transparent",
                              color: current === opt.value ? opt.color : muted,
                              cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s"
                            }}>{opt.value}</button>
                        ))}
                        {current !== null && <span style={{ fontSize: 11, color: SCORE_OPTIONS.find(o => o.value === current)?.color, minWidth: 70 }}>{SCORE_OPTIONS.find(o => o.value === current)?.label}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA POR PLATAFORMA ── */}
      {modo === "plataforma" && (
        <div>
          <div style={{ marginBottom: 20, background: card, borderRadius: 10, border: `1px solid ${border}`, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Ranking Consolidado</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Média das 5 plataformas · ordenado por visibilidade</div>
              </div>
              <button onClick={() => setRankOrdem(o => o === "asc" ? "desc" : "asc")} style={{
                padding: "5px 10px", borderRadius: 6, border: `1px solid ${border}`, background: "transparent",
                color: muted, cursor: "pointer", fontSize: 11,
              }}>
                {rankOrdem === "asc" ? "↑ Mais fracos" : "↓ Mais fortes"}
              </button>
            </div>
            <div style={{ padding: "8px 0" }}>
              {rankingConsolidado.map((m, i) => {
                const grade = scoreGrade(m.scoreTotal);
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
                    borderBottom: i < rankingConsolidado.length - 1 ? `1px solid ${border}22` : "none",
                    flexWrap: "wrap",
                  }}>
                    <div style={{ fontSize: 12, color: muted, minWidth: 20, fontFamily: "monospace" }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13, color: text, fontWeight: 500 }}>{m.nome}</div>
                      {m.cidade && <div style={{ fontSize: 11, color: muted }}>{m.cidade}</div>}
                    </div>
                    <div style={{ flex: 2, minWidth: 100 }}>
                      <div style={{ height: 6, background: `${border}`, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${m.scoreTotal}%`, height: "100%", background: grade.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: grade.color, minWidth: 40, textAlign: "right" }}>{m.scoreTotal}%</div>
                    {m.piorPlataforma && (
                      <div style={{ fontSize: 10, color: "#ef4444", minWidth: 80, textAlign: "right" }}>⚠️ {m.piorPlataforma.label}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1 }}>DETALHE POR PLATAFORMA</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {PLATFORMS.map((p, i) => (
                <button key={p.id} onClick={() => setPlataformaSel(i)} style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid",
                  borderColor: plataformaSel === i ? accent : border,
                  background: plataformaSel === i ? accent : "transparent",
                  color: plataformaSel === i ? "#fff" : muted, cursor: "pointer", fontSize: 13, fontWeight: plataformaSel === i ? 700 : 400
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: muted, fontWeight: 500, whiteSpace: "nowrap" }}>Médico / Cidade</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", color: muted, fontWeight: 500 }}>Score</th>
                  {QUESTIONS_TPL.map(q => (
                    <th key={q.id} style={{ padding: "8px 6px", textAlign: "center", color: muted, fontWeight: 500, fontSize: 10 }}>Q{q.id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medicos.map((m, i) => {
                  const pl = PLATFORMS[plataformaSel];
                  const vals = QUESTIONS_TPL.map(q => getScore(m.id, q.id, pl.id) ?? 0);
                  const pct = Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
                  const grade = scoreGrade(pct);
                  return (
                    <tr key={m.id} style={{ borderBottom: i < medicos.length - 1 ? `1px solid ${border}22` : "none" }}>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap", fontSize: 12 }}>
                        <div style={{ color: text }}>{m.nome}</div>
                        {m.cidade && <div style={{ color: muted, fontSize: 10 }}>{m.cidade}</div>}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: grade.color, fontSize: 13 }}>{pct}%</span>
                      </td>
                      {QUESTIONS_TPL.map(q => {
                        const current = getScore(m.id, q.id, pl.id);
                        const opt = current !== null ? SCORE_OPTIONS.find(o => o.value === current) : null;
                        const isQ10 = q.scoreEspecial;
                        return (
                          <td key={q.id} style={{ padding: "4px", textAlign: "center" }}>
                            <select value={current ?? ""} onChange={e => setScore(m.id, q.id, pl.id, Number(e.target.value))}
                              style={{
                                width: 36, background: opt ? opt.bg : card, border: `1px solid ${opt ? opt.color : border}`,
                                color: opt ? opt.color : muted, borderRadius: 4, padding: "3px", fontSize: 11, cursor: "pointer"
                              }}>
                              <option value="">—</option>
                              {(isQ10 ? SCORE_OPTIONS_Q10 : SCORE_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SCORE_OPTIONS.map(o => (
              <div key={o.value} style={{ display: "flex", alignItems: "center", gap: 5, background: card, padding: "5px 10px", borderRadius: 16, border: `1px solid ${border}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: o.color }} />
                <span style={{ fontSize: 11, color: muted }}>{o.value} — {o.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: "10px 14px", background: `${accent}11`, borderRadius: 8, fontSize: 12, color: muted, border: `1px solid ${accent}33` }}>
        <strong style={{ color: accent }}>Escala:</strong> 0 Invisível · 1 ESG mencionada · 3 Médico citado por nome · Q13 (busca direta): apenas 0 ou 3
      </div>
    </div>
  );
}
