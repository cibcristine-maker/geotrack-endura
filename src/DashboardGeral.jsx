import { useState } from "react";

const PLATFORMS = ["chatgpt","gemini","perplexity","claude","grok","copilot"];

function scoreGrade(pct) {
  if (pct >= 70) return { label: "Visível", color: "#10b981" };
  if (pct >= 40) return { label: "Parcial", color: "#f59e0b" };
  return { label: "Invisível", color: "#ef4444" };
}

function calcGeoScore(mId, geoScores) {
  if (!geoScores[mId]) return 0;
  const vals = PLATFORMS.flatMap(pl =>
    [1,2,3,4,5,6,7,8,9,10].map(q => geoScores[mId]?.[q]?.[pl] ?? 0)
  );
  return Math.round((vals.reduce((a,b)=>a+b,0) / (vals.length * 3)) * 100);
}

function calcSeoScore(mId, registros) {
  const regs = registros.filter(r => r.medico_id === mId);
  if (!regs.length) return 0;
  const last = regs[regs.length - 1];
  const imp = last?.valores?.impressoes_gsc || 0;
  const cli = last?.valores?.cliques_gsc || 0;
  // Normaliza: >1000 impressões = 100%, >100 cliques = 100%
  const impScore = Math.min(imp / 10, 100);
  const cliScore = Math.min(cli, 100);
  return Math.round((impScore + cliScore) / 2);
}

function calcPerfilScore(mId, perfis) {
  const p = perfis[mId] || {};
  let score = 0;
  let total = 5;
  if (p.schema_physician) score++;
  if (p.schema_faqpage) score++;
  if (p.doctoralia_ativo) score += p.doctoralia_estrelas >= 4 ? 1.5 : 0.5;
  if (p.reddit_mencoes) score += 0.5;
  if (p.blog_ativo && p.blog_artigos > 0) score++;
  return Math.round((score / total) * 100);
}

function calcTotal(geo, seo, perfil) {
  return Math.round(geo * 0.5 + seo * 0.25 + perfil * 0.25);
}

export default function DashboardGeral({ medicos = [], registros = [], geoScores = {}, perfis = {}, s = {}, onSelectMedico }) {
  const [expandido, setExpandido] = useState(null);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState("total");

  const card = s.card || "#0A2342";
  const border = s.border || "#1e3a5f";
  const accent = s.accent || "#00879E";
  const muted = s.muted || "#64748b";
  const text = s.text || "#e2e8f0";

  const medicosComScore = medicos
    .filter(m => m.nome.toLowerCase().includes(busca.toLowerCase()))
    .map(m => {
      const geo = calcGeoScore(m.id, geoScores);
      const seo = calcSeoScore(m.id, registros);
      const perfil = calcPerfilScore(m.id, perfis);
      const total = calcTotal(geo, seo, perfil);
      return { ...m, geo, seo, perfil, total };
    })
    .sort((a, b) => b[ordenar] - a[ordenar]);

  const top = medicosComScore[0];

  return (
    <div style={{ color: text }}>
      {/* Header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Médicos monitorados", value: medicos.length, color: accent },
          { label: "Score médio GEO", value: `${Math.round(medicosComScore.reduce((a,b)=>a+b.geo,0)/(medicosComScore.length||1))}%`, color: "#10b981" },
          { label: "Melhor performance", value: top ? top.nome.split(" ").slice(-1)[0] : "—", color: "#f59e0b" },
          { label: "Score líder", value: top ? `${top.total}%` : "—", color: "#f59e0b" },
        ].map((stat, i) => (
          <div key={i} style={{ background: card, borderRadius: 10, padding: "12px 14px", border: `1px solid ${border}` }}>
            <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar médico..."
          style={{ background: card, border: `1px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 8, fontSize: 13, flex: 1, minWidth: 160 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[["total","Total"],["geo","GEO"],["seo","SEO"],["perfil","Perfil"]].map(([key,label]) => (
            <button key={key} onClick={() => setOrdenar(key)} style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid",
              borderColor: ordenar === key ? accent : border,
              background: ordenar === key ? `${accent}22` : "transparent",
              color: ordenar === key ? accent : muted, cursor: "pointer", fontSize: 12
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {medicosComScore.map((m, i) => {
          const grade = scoreGrade(m.total);
          const isOpen = expandido === m.id;
          return (
            <div key={m.id} style={{ background: card, borderRadius: 10, border: `1px solid ${isOpen ? accent : border}`, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Linha principal */}
              <div onClick={() => setExpandido(isOpen ? null : m.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
                <span style={{ fontSize: 13, color: muted, minWidth: 24, fontFamily: "monospace" }}>#{i+1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: text, fontWeight: 600 }}>{m.nome}</div>
                  {m.cidade && <div style={{ fontSize: 11, color: muted }}>{m.especialidade ? `${m.especialidade} · ` : ""}{m.cidade}</div>}
                </div>
                {/* Barras de score */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {[["GEO", m.geo, "#00879E"], ["SEO", m.seo, "#8b5cf6"], ["Perfil", m.perfil, "#f59e0b"]].map(([lbl, val, cor]) => (
                    <div key={lbl} style={{ textAlign: "center", minWidth: 40 }}>
                      <div style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: cor }}>{val}%</div>
                    </div>
                  ))}
                  <div style={{ textAlign: "center", minWidth: 48, borderLeft: `1px solid ${border}`, paddingLeft: 8 }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 2 }}>Total</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: grade.color }}>{m.total}%</div>
                  </div>
                </div>
                <span style={{ color: muted, fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
              </div>

              {/* Barra de progresso */}
              <div style={{ height: 3, background: border, margin: "0 16px" }}>
                <div style={{ height: "100%", width: `${m.total}%`, background: grade.color, borderRadius: 2, transition: "width 0.5s" }} />
              </div>

              {/* Detalhe expandido */}
              {isOpen && (
                <div style={{ padding: "16px", borderTop: `1px solid ${border}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {/* GEO detalhado */}
                  <div style={{ background: "#07192B", borderRadius: 8, padding: "12px", border: `1px solid #00879E33` }}>
                    <div style={{ fontSize: 11, color: "#00879E", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>GEO · VISIBILIDADE EM IAs</div>
                    {PLATFORMS.map(pl => {
                      const vals = [1,2,3,4,5,6,7,8,9,10].map(q => geoScores[m.id]?.[q]?.[pl] ?? 0);
                      const pct = Math.round((vals.reduce((a,b)=>a+b,0)/(vals.length*3))*100);
                      return (
                        <div key={pl} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: muted, minWidth: 70, textTransform: "capitalize" }}>{pl}</span>
                          <div style={{ flex: 1, height: 4, background: border, borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: scoreGrade(pct).color, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: scoreGrade(pct).color, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* SEO detalhado */}
                  <div style={{ background: "#07192B", borderRadius: 8, padding: "12px", border: `1px solid #8b5cf633` }}>
                    <div style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>SEO · BUSCA ORGÂNICA</div>
                    {(() => {
                      const regs = registros.filter(r => r.medico_id === m.id);
                      const last = regs[regs.length - 1];
                      const v = last?.valores || {};
                      return (
                        <div>
                          {[
                            ["Impressões GSC", v.impressoes_gsc || "—"],
                            ["Cliques orgânicos", v.cliques_gsc || "—"],
                            ["Posição média", v.posicao_media_gsc || "—"],
                            ["Keywords Top 10", v.keywords_top10 || "—"],
                          ].map(([lbl, val]) => (
                            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: muted }}>{lbl}</span>
                              <span style={{ fontSize: 12, color: text, fontWeight: 600 }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Perfil Digital detalhado */}
                  <div style={{ background: "#07192B", borderRadius: 8, padding: "12px", border: `1px solid #f59e0b33` }}>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>PERFIL DIGITAL</div>
                    {(() => {
                      const p = perfis[m.id] || {};
                      return (
                        <div>
                          {[
                            ["Schema Physician", p.schema_physician],
                            ["Schema FAQPage", p.schema_faqpage],
                            ["Doctoralia", p.doctoralia_ativo],
                            ["Reddit", p.reddit_mencoes],
                            ["Blog ativo", p.blog_ativo],
                          ].map(([lbl, val]) => (
                            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: muted }}>{lbl}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: val ? "#10b981" : "#ef4444" }}>{val ? "✓ Sim" : "✗ Não"}</span>
                            </div>
                          ))}
                          {p.doctoralia_ativo && p.doctoralia_estrelas && (
                            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
                              ⭐ {p.doctoralia_estrelas} · {p.doctoralia_avaliacoes || 0} avaliações
                            </div>
                          )}
                          {p.blog_ativo && p.blog_artigos > 0 && (
                            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>📝 {p.blog_artigos} artigos publicados</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
