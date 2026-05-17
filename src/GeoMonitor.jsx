import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTU3MzIsImV4cCI6MjA2MTA5MTczMn0.placeholder";

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
  { id: "chatgpt", label: "ChatGPT", kpi: "chatgpt_citacoes" },
  { id: "gemini", label: "Gemini", kpi: "gemini_citacoes" },
  { id: "perplexity", label: "Perplexity", kpi: "perplexity_citacoes" },
  { id: "claude", label: "Claude", kpi: "claude_citacoes" },
  { id: "grok", label: "Grok", kpi: "grok_citacoes" },
  { id: "copilot", label: "Copilot", kpi: "manus_citacoes" },
];

const QUESTIONS = [
  { id: 1, text: "Parei o Mounjaro e voltei a engordar, o que fazer?", intent: "Reganho pós-GLP-1", priority: "critica" },
  { id: 2, text: "Existe tratamento definitivo para quem parou ozempic e engordou?", intent: "Frustração com dependência", priority: "critica" },
  { id: 3, text: "O que é gastroplastia endoscópica e como funciona?", intent: "Descoberta / topo de funil", priority: "media" },
  { id: 4, text: "Gastroplastia endoscópica é melhor do que continuar com GLP-1?", intent: "Comparação direta", priority: "alta" },
  { id: 5, text: "Qual procedimento para emagrecer sem cirurgia bariátrica?", intent: "Alternativa cirúrgica", priority: "media" },
  { id: 6, text: "Quanto custa gastroplastia endoscópica e tem no plano?", intent: "Decisão de acesso", priority: "media" },
  { id: 7, text: "Qual médico faz gastroplastia endoscópica em [cidade]?", intent: "Busca por especialista", priority: "critica" },
  { id: 8, text: "Posso fazer gastroplastia endoscópica depois de usar GLP-1?", intent: "Sequência de tratamento", priority: "alta" },
  { id: 9, text: "Gastroplastia endoscópica tem risco? É segura?", intent: "Barreira de conversão", priority: "media" },
  { id: 10, text: "Qual o resultado da gastroplastia endoscópica a longo prazo?", intent: "Evidência clínica (MERIT Trial)", priority: "alta" },
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

export default function GeoMonitor({ medicos = [], s = {}, periodoSel = "", onKpiUpdate = null }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [view, setView] = useState("dashboard");
  const [medicoSel, setMedicoSel] = useState(null);
  const [plataformaSel, setPlataformaSel] = useState(0);
  const [scores, setScores] = useState({});

  const card = s.card || "#0A2342";
  const border = s.border || "#1e3a5f";
  const accent = s.accent || "#00879E";
  const muted = s.muted || "#64748b";
  const text = s.text || "#e2e8f0";

  const fetchRegistros = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supa("geo_monitor?select=*&order=created_at.desc");
      setRegistros(data || []);
      const map = {};
      (data || []).forEach(r => {
        if (!map[r.medico_id]) map[r.medico_id] = {};
        if (!map[r.medico_id][r.questao_id]) map[r.medico_id][r.questao_id] = {};
        map[r.medico_id][r.questao_id][r.plataforma] = r.score;
      });
      setScores(map);
    } catch (e) {
      setScores({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
    if (medicos.length > 0) setMedicoSel(medicos[0]);
  }, [fetchRegistros, medicos]);

  function getScore(medicoId, questaoId, plataformaId) {
    return scores[medicoId]?.[questaoId]?.[plataformaId] ?? null;
  }

  async function setScore(medicoId, questaoId, plataformaId, value) {
    setScores(prev => ({
      ...prev,
      [medicoId]: {
        ...prev[medicoId],
        [questaoId]: { ...prev[medicoId]?.[questaoId], [plataformaId]: value },
      },
    }));
    try {
      const existing = registros.find(r => r.medico_id === medicoId && r.questao_id === questaoId && r.plataforma === plataformaId);
      if (existing) {
        await supa(`geo_monitor?id=eq.${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ score: value, updated_at: new Date().toISOString() }),
        });
      } else {
        const newReg = await supa("geo_monitor", {
          method: "POST",
          body: JSON.stringify({ medico_id: medicoId, questao_id: questaoId, plataforma: plataformaId, score: value }),
        });
        if (newReg) setRegistros(prev => [...prev, ...(Array.isArray(newReg) ? newReg : [newReg])]);
      }
    } catch (e) {}
  }

  function calcGeoScore(medicoId, plataformaIdx) {
    const pl = PLATFORMS[plataformaIdx];
    const vals = QUESTIONS.map(q => getScore(medicoId, q.id, pl.id) ?? 0);
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }

  function calcOverall(medicoId) {
    const vals = PLATFORMS.flatMap(pl => QUESTIONS.map(q => getScore(medicoId, q.id, pl.id) ?? 0));
    return Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
  }

  async function syncToDashboard() {
    if (!periodoSel) { alert("Selecione um período no Dashboard antes de sincronizar."); return; }
    setSyncing(true);
    try {
      for (const medico of medicos) {
        const valores = {};
        PLATFORMS.forEach(pl => {
          valores[pl.kpi] = QUESTIONS.filter(q => getScore(medico.id, q.id, pl.id) === 3).length;
        });
        const existing = await supa(`registros_kpi?medico_id=eq.${medico.id}&periodo=eq.${periodoSel}&select=id,valores`);
        if (existing && existing.length > 0) {
          await supa(`registros_kpi?id=eq.${existing[0].id}`, {
            method: "PATCH",
            body: JSON.stringify({ valores: { ...(existing[0].valores || {}), ...valores } }),
          });
        } else {
          await supa("registros_kpi", {
            method: "POST",
            body: JSON.stringify({ medico_id: medico.id, periodo: periodoSel, valores }),
          });
        }
      }
      setSynced(true);
      setTimeout(() => setSynced(false), 2500);
      if (onKpiUpdate) onKpiUpdate();
    } catch (e) {
      alert("Erro ao sincronizar: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function saveSnapshot() {
    setSaving(true);
    try {
      const snap = { tipo: "geo_snapshot", data: new Date().toISOString().split("T")[0], scores: {} };
      medicos.forEach(m => { snap.scores[m.id] = calcOverall(m.id); });
      await supa("geo_snapshots", { method: "POST", body: JSON.stringify(snap) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: accent }}>
      Carregando monitor GEO...
    </div>
  );

  return (
    <div style={{ color: text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 4, fontFamily: "monospace" }}>
            GEO Intelligence · 6 Plataformas
          </div>
          <div style={{ fontSize: 13, color: muted }}>10 perguntas · {medicos.length} médicos</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={syncToDashboard} style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid #10b981",
            background: synced ? "#10b981" : "transparent", color: synced ? "#fff" : "#10b981",
            cursor: "pointer", fontSize: 12, fontFamily: "monospace", textTransform: "uppercase", transition: "all 0.3s"
          }}>{synced ? "Sincronizado!" : syncing ? "Sincronizando..." : "Sync Dashboard"}</button>
          <button onClick={saveSnapshot} style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${accent}`,
            background: saved ? accent : "transparent", color: saved ? "#fff" : accent,
            cursor: "pointer", fontSize: 12, fontFamily: "monospace", textTransform: "uppercase", transition: "all 0.3s"
          }}>{saved ? "Salvo!" : saving ? "Salvando..." : "Snapshot"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
        {[["dashboard", "Dashboard GEO"], ["matriz", "Matriz de Perguntas"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{
            padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13,
            background: view === key ? accent : "transparent", color: view === key ? "#fff" : muted, transition: "all 0.2s"
          }}>{label}</button>
        ))}
      </div>

      {view === "dashboard" && (
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>Score por Médico</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10, marginBottom: 24 }}>
            {medicos.map(m => {
              const pct = calcOverall(m.id);
              const grade = scoreGrade(pct);
              return (
                <div key={m.id} onClick={() => { setMedicoSel(m); setView("matriz"); }}
                  style={{ background: card, borderRadius: 10, padding: 14, cursor: "pointer", border: `1px solid ${border}`, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = border}>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{m.nome}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: grade.color, lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: grade.color, marginTop: 3 }}>{grade.label}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 2 }}>
                    {PLATFORMS.map((pl, i) => {
                      const s2 = calcGeoScore(m.id, i);
                      return <div key={pl.id} title={`${pl.label}: ${s2}%`} style={{ flex: 1, height: 3, borderRadius: 2, background: s2 > 40 ? accent : border }} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 11, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>Score por Plataforma</div>
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: muted, fontWeight: 500 }}>Médico</th>
                  {PLATFORMS.map(p => <th key={p.id} style={{ padding: "10px 8px", textAlign: "center", color: muted, fontWeight: 500, whiteSpace: "nowrap" }}>{p.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {medicos.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: i < medicos.length - 1 ? `1px solid ${border}22` : "none" }}>
                    <td style={{ padding: "10px 12px", color: text, fontSize: 12 }}>{m.nome}</td>
                    {PLATFORMS.map((pl, idx) => {
                      const s2 = calcGeoScore(m.id, idx);
                      const g = scoreGrade(s2);
                      return <td key={pl.id} style={{ padding: "10px 8px", textAlign: "center" }}>
                        <span style={{ fontWeight: 600, color: g.color }}>{s2}%</span>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SCORE_OPTIONS.map(o => (
              <div key={o.value} style={{ display: "flex", alignItems: "center", gap: 5, background: card, padding: "5px 10px", borderRadius: 16, border: `1px solid ${border}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: o.color }} />
                <span style={{ fontSize: 11, color: muted }}>{o.value} — {o.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#10b98111", borderRadius: 8, fontSize: 12, color: muted, border: "1px solid #10b98133" }}>
            <strong style={{ color: "#10b981" }}>Sync Dashboard:</strong> Envia citações (score 3) de cada plataforma para os KPIs do período selecionado no Dashboard principal.
          </div>
        </div>
      )}

      {view === "matriz" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4, letterSpacing: 1 }}>MÉDICO</div>
              <select value={medicoSel?.id || ""} onChange={e => setMedicoSel(medicos.find(m => m.id === e.target.value) || medicos[0])}
                style={{ background: card, border: `1px solid ${border}`, color: text, padding: "7px 12px", borderRadius: 8, fontSize: 13 }}>
                {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
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
                    color: plataformaSel === i ? accent : muted,
                    cursor: "pointer", fontSize: 11
                  }}>{p.label}</button>
                ))}
              </div>
            </div>
            {medicoSel && (
              <div style={{ marginLeft: "auto" }}>
                <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>GEO SCORE</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: scoreGrade(calcGeoScore(medicoSel.id, plataformaSel)).color }}>
                  {calcGeoScore(medicoSel.id, plataformaSel)}%
                </div>
              </div>
            )}
          </div>

          {medicoSel && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {QUESTIONS.map(q => {
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
                      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
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
                        {current !== null && (
                          <span style={{ fontSize: 11, color: SCORE_OPTIONS[current]?.color, minWidth: 80 }}>
                            {SCORE_OPTIONS[current]?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 14, padding: "10px 14px", background: `${accent}11`, borderRadius: 8, fontSize: 12, color: muted, border: `1px solid ${accent}33` }}>
            <strong style={{ color: accent }}>Como usar:</strong> Teste cada pergunta na plataforma e marque. Score 3 = médico citado, sincroniza com o Dashboard.
            <br /><span style={{ color: "#ef4444" }}>0</span> Invisível <span style={{ color: "#f59e0b" }}> 1</span> ESG mencionada <span style={{ color: "#3b82f6" }}> 2</span> ESG+GLP-1 <span style={{ color: "#10b981" }}> 3</span> Médico citado
          </div>
        </div>
      )}
    </div>
  );
}
