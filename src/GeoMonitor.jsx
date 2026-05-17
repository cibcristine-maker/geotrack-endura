import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "REPLACE_WITH_YOUR_KEY";

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
  { id: "copilot", label: "Copilot" },
];

const QUESTIONS_TPL = [
  { id: 1, text: "Parei o Mounjaro em {cidade} e voltei a engordar, o que fazer?", intent: "Reganho pós-GLP-1", priority: "critica" },
  { id: 2, text: "Existe tratamento definitivo em {cidade} para quem parou ozempic e engordou?", intent: "Frustração com dependência", priority: "critica" },
  { id: 3, text: "O que é gastroplastia endoscópica em {cidade} e como funciona?", intent: "Descoberta local", priority: "media" },
  { id: 4, text: "Gastroplastia endoscópica é melhor que continuar com GLP-1 em {cidade}?", intent: "Comparação direta", priority: "alta" },
  { id: 5, text: "Qual procedimento para emagrecer sem cirurgia bariátrica em {cidade}?", intent: "Alternativa cirúrgica", priority: "media" },
  { id: 6, text: "Quanto custa gastroplastia endoscópica em {cidade} e tem no plano?", intent: "Decisão de acesso", priority: "media" },
  { id: 7, text: "Qual médico faz gastroplastia endoscópica em {cidade}?", intent: "Busca por especialista", priority: "critica" },
  { id: 8, text: "Posso fazer gastroplastia endoscópica depois de usar GLP-1 em {cidade}?", intent: "Sequência de tratamento", priority: "alta" },
  { id: 9, text: "Gastroplastia endoscópica tem risco em {cidade}? É segura?", intent: "Barreira de conversão", priority: "media" },
  { id: 10, text: "Qual o resultado da gastroplastia endoscópica a longo prazo em {cidade}?", intent: "Evidência clínica", priority: "alta" },
];

const SCORE_OPTIONS = [
  { value: 0, label: "Invisível", color: "#ef4444", bg: "#fee2e2" },
  { value: 1, label: "ESG mencionada", color: "#f59e0b", bg: "#fef3c7" },
  { value: 2, label: "ESG + GLP-1", color: "#3b82f6", bg: "#dbeafe" },
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

export default function GeoMonitor({ medicos = [], s = {} }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [modo, setModo] = useState("medico");
  const [medicoSel, setMedicoSel] = useState(null);
  const [plataformaSel, setPlataformaSel] = useState(0);
  const [busca, setBusca] = useState("");

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

  function calcGeoScore(mId, plIdx) {
    const pl = PLATFORMS[plIdx];
    const vals = QUESTIONS_TPL.map(q => getScore(mId, q.id, pl.id) ?? 0);
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }

  const medicosFiltrados = medicos.filter(m => m.nome.toLowerCase().includes(busca.toLowerCase()));

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: accent }}>Carregando...</div>;

  return (
    <div style={{ color: text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>GEO Intelligence · 6 Plataformas</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>10 perguntas com cidade do médico · {medicos.length} médicos</div>
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

      {modo === "medico" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
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
                <div style={{ fontSize: 11, color: muted }}>GEO SCORE</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: scoreGrade(calcGeoScore(medicoSel.id, plataformaSel)).color }}>
                  {calcGeoScore(medicoSel.id, plataformaSel)}%
                </div>
              </div>
            )}
          </div>

          {medicoSel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {getQuestions(medicoSel.cidade).map(q => {
                const pl = PLATFORMS[plataformaSel];
                const current = getScore(medicoSel.id, q.id, pl.id);
                const pc = priorityStyle[q.priority];
                return (
                  <div key={q.id} style={{ background: card, borderRadius: 8, border: `1px solid ${border}`, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: muted, minWidth: 22, fontFamily: "monospace", paddingTop: 2 }}>{String(q.id).padStart(2, "0")}</span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, color: text, marginBottom: 3 }}>"{q.text}"</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: muted }}>{q.intent}</span>
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: pc.bg, color: pc.text, fontWeight: 600 }}>{q.priority}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {SCORE_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => setScore(medicoSel.id, q.id, pl.id, opt.value)} title={opt.label}
                            style={{
                              width: 30, height: 30, borderRadius: 6, border: "2px solid",
                              borderColor: current === opt.value ? opt.color : border,
                              background: current === opt.value ? opt.bg : "transparent",
                              color: current === opt.value ? opt.color : muted,
                              cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s"
                            }}>{opt.value}</button>
                        ))}
                        {current !== null && <span style={{ fontSize: 11, color: SCORE_OPTIONS[current]?.color, minWidth: 70 }}>{SCORE_OPTIONS[current]?.label}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modo === "plataforma" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1 }}>PLATAFORMA</div>
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
                        const opt = current !== null ? SCORE_OPTIONS[current] : null;
                        return (
                          <td key={q.id} style={{ padding: "4px", textAlign: "center" }}>
                            <select value={current ?? ""} onChange={e => setScore(m.id, q.id, pl.id, Number(e.target.value))}
                              style={{
                                width: 36, background: opt ? opt.bg : card, border: `1px solid ${opt ? opt.color : border}`,
                                color: opt ? opt.color : muted, borderRadius: 4, padding: "3px", fontSize: 11, cursor: "pointer"
                              }}>
                              <option value="">—</option>
                              {SCORE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
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
        <strong style={{ color: accent }}>Escala:</strong> 0 Invisível · 1 ESG mencionada · 2 ESG+GLP-1 · 3 Médico citado por nome
      </div>
    </div>
  );
}
