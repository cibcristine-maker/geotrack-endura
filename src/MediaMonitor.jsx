// src/MediaMonitor.jsx — Media Monitor com Google News RSS + URL manual

import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";

async function supaFetch(path, opts = {}) {
  const { prefer, headers: extraHeaders, ...restOpts } = opts;
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      "Prefer": prefer || "return=representation",
      ...extraHeaders,
    },
    ...restOpts,
  });
  // Lê o body UMA só vez
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text ? JSON.parse(text) : null;
}

const TAG_COLORS = {
  "ESG/Endobariatria": "#22D3EE", "BIB": "#A78BFA",
  "GLP-1/Mercado": "#FCD34D", "Mercado": "#34D399", "Médico Parceiro": "#F97316",
};
const RELEVANCIA_CONFIG = {
  alta:  { color: "#34D399", bg: "rgba(52,211,153,0.12)", label: "Alta" },
  media: { color: "#FCD34D", bg: "rgba(252,211,77,0.10)", label: "Média" },
  baixa: { color: "#64748B", bg: "rgba(100,116,139,0.08)", label: "Baixa" },
};

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ArticleCard({ article, s }) {
  const tag = article.tag || "Geral";
  const tagColor = TAG_COLORS[tag] || "#64748B";
  const rel = RELEVANCIA_CONFIG[article.relevancia] || RELEVANCIA_CONFIG.media;
  return (
    <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = tagColor}
      onMouseLeave={e => e.currentTarget.style.borderColor = s.border}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ background: `${tagColor}20`, color: tagColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: `1px solid ${tagColor}40`, textTransform: "uppercase" }}>{tag}</span>
        {article.medico_nome && <span style={{ background: "rgba(249,115,22,0.12)", color: "#F97316", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(249,115,22,0.3)" }}>👨‍⚕️ {article.medico_nome}</span>}
        <span style={{ background: rel.bg, color: rel.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: `1px solid ${rel.color}40` }}>● {rel.label}</span>
        <span style={{ color: s.muted, fontSize: 11, marginLeft: "auto" }}>{formatDate(article.data_publicacao)}</span>
      </div>
      <a href={article.url} target="_blank" rel="noopener noreferrer"
        style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 13, lineHeight: 1.4, textDecoration: "none" }}
        onMouseEnter={e => e.currentTarget.style.color = tagColor}
        onMouseLeave={e => e.currentTarget.style.color = "#F1F5F9"}>
        {article.titulo}
      </a>
      {article.descricao && <p style={{ color: s.muted, fontSize: 12, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{article.descricao}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <span style={{ color: s.muted, fontSize: 11, background: "rgba(255,255,255,0.04)", border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 6 }}>📰 {article.fonte}</span>
        <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: tagColor, fontSize: 11, fontWeight: 600, textDecoration: "none", marginLeft: "auto" }}>Ler →</a>
      </div>
    </div>
  );
}

export default function MediaMonitor({ s }) {
  const [articles, setArticles]         = useState([]);
  const [medicos, setMedicos]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [scanning, setScanning]         = useState(false);
  const [scanMode, setScanMode]         = useState("market");
  const [error, setError]               = useState(null);
  const [scanMsg, setScanMsg]           = useState(null);
  const [filterTag, setFilterTag]       = useState("todos");
  const [filterRel, setFilterRel]       = useState("todos");
  const [filterMedico, setFilterMedico] = useState("todos");
  const [searchText, setSearchText]     = useState("");
  const [activeTab, setActiveTab]       = useState("mercado");
  // URL manual
  const [manualUrl, setManualUrl]       = useState("");
  const [manualMedico, setManualMedico] = useState("");
  const [manualTag, setManualTag]       = useState("Mercado");
  const [savingUrl, setSavingUrl]       = useState(false);
  const [showManual, setShowManual]     = useState(false);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      // Busca separada para isolar erros — se médicos falhar, artigos ainda carregam
      const data = await supaFetch(
        "media_alerts?select=id,titulo,descricao,fonte,url,data_publicacao,tag,relevancia,medico_nome,criado_em" +
        "&order=data_publicacao.desc,criado_em.desc&limit=150"
      ).catch(err => { console.warn("media_alerts erro:", err.message); return []; });
      const meds = await supaFetch("medicos?select=id,nome&order=nome")
        .catch(() => []);
      setArticles(data || []);
      setMedicos(meds || []);
    } catch (err) {
      setError("Erro ao carregar: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleScan = async () => {
    setScanning(true); setScanMsg(null); setError(null);
    try {
      const res = await fetch(`/api/media-monitor?mode=${scanMode}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Resposta inválida da API: " + text.slice(0, 100)); }
      if (!res.ok || data.error) {
        // Timeout/crash da função — artigos de mercado podem ter sido salvos parcialmente
        const msg = data.error || `HTTP ${res.status}`;
        if (msg.includes("FUNCTION_INVOCATION_FAILED") || msg.includes("timeout")) {
          setScanMsg("⚠️ Varredura interrompida (timeout). Artigos de mercado podem ter sido salvos — recarregue a lista.");
          await fetchArticles();
        } else {
          throw new Error(msg);
        }
        return;
      }
      const aviso = data.errors?.length ? ` · ${data.errors.length} aviso(s)` : "";
      setScanMsg(`✅ ${data.total} artigo(s) encontrado(s)${aviso}`);
      await fetchArticles();
    } catch (err) {
      setError("Erro: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!manualUrl.trim()) return;
    setSavingUrl(true); setError(null);
    try {
      let endpoint = `/api/media-monitor?url=${encodeURIComponent(manualUrl.trim())}`;
      if (manualMedico) endpoint += `&medico=${encodeURIComponent(manualMedico)}`;
      else endpoint += `&tag=${encodeURIComponent(manualTag)}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScanMsg(`✅ Matéria salva: "${data.articles[0]?.titulo?.slice(0, 60)}..."`);
      setManualUrl(""); setManualMedico(""); setShowManual(false);
      await fetchArticles();
    } catch (err) { setError("Erro ao salvar URL: " + err.message); }
    finally { setSavingUrl(false); }
  };

  const marketArticles = articles.filter(a => a.tag !== "Médico Parceiro");
  const doctorArticles = articles.filter(a => a.tag === "Médico Parceiro");
  const medicosComCitacoes = [...new Set(doctorArticles.map(a => a.medico_nome).filter(Boolean))];

  const baseArticles = activeTab === "medicos" ? doctorArticles : marketArticles;
  const filtered = baseArticles.filter(a => {
    const matchTag    = filterTag === "todos" || a.tag === filterTag;
    const matchRel    = filterRel === "todos" || a.relevancia === filterRel;
    const matchMedico = filterMedico === "todos" || a.medico_nome === filterMedico;
    const matchSearch = !searchText ||
      a.titulo?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.descricao?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.fonte?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.medico_nome?.toLowerCase().includes(searchText.toLowerCase());
    return matchTag && matchRel && matchMedico && matchSearch;
  });

  const tagsPresentes = [...new Set(marketArticles.map(a => a.tag).filter(Boolean))];
  const tabStyle = (tab) => ({
    padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
    background: activeTab === tab ? "rgba(34,211,238,0.12)" : "transparent",
    border: activeTab === tab ? "1px solid rgba(34,211,238,0.4)" : "1px solid transparent",
    color: activeTab === tab ? "#22D3EE" : "#64748B",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ width: 4, height: 24, background: "linear-gradient(to bottom,#22D3EE,#6EE7B7)", borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#F1F5F9" }}>📰 Media Monitor</h2>
          <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>Publicações sobre obesidade, ESG, GLP-1 e médicos parceiros</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowManual(v => !v)} style={{
            background: showManual ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
            color: showManual ? "#F97316" : s.muted,
            border: `1px solid ${showManual ? "rgba(249,115,22,0.4)" : s.border}`,
            padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
          }}>🔗 Adicionar URL</button>
          <select value={scanMode} onChange={e => setScanMode(e.target.value)}
            style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.muted, padding: "8px 10px", borderRadius: 7, fontSize: 11 }}>
            <option value="market">📰 Mercado</option>
            <option value="doctors">👨‍⚕️ Médicos (lento)</option>
            <option value="all">Tudo</option>
          </select>
          <button onClick={handleScan} disabled={scanning} style={{
            background: scanning ? "rgba(34,211,238,0.1)" : "linear-gradient(135deg,#22D3EE,#6EE7B7)",
            color: scanning ? "#22D3EE" : "#070D1A",
            border: scanning ? "1px solid #22D3EE" : "none",
            padding: "8px 16px", borderRadius: 8, cursor: scanning ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap",
          }}>{scanning ? "🔍 Buscando..." : "🔄 Varrer agora"}</button>
        </div>
      </div>

      {/* Painel URL Manual */}
      {showManual && (
        <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ color: "#F97316", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔗 Adicionar matéria manualmente</div>
          <input value={manualUrl} onChange={e => setManualUrl(e.target.value)}
            placeholder="Cole a URL da matéria aqui..."
            style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.text, padding: "10px 12px", borderRadius: 8, fontSize: 13, width: "100%", marginBottom: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <select value={manualMedico} onChange={e => setManualMedico(e.target.value)}
              style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.text, padding: "10px 12px", borderRadius: 8, fontSize: 12 }}>
              <option value="">— Médico parceiro (opcional) —</option>
              {medicos.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
            </select>
            <select value={manualTag} onChange={e => setManualTag(e.target.value)} disabled={!!manualMedico}
              style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: manualMedico ? s.muted : s.text, padding: "10px 12px", borderRadius: 8, fontSize: 12 }}>
              <option value="Mercado">Mercado</option>
              <option value="ESG/Endobariatria">ESG/Endobariatria</option>
              <option value="GLP-1/Mercado">GLP-1/Mercado</option>
              <option value="BIB">BIB</option>
            </select>
          </div>
          <button onClick={handleSaveUrl} disabled={savingUrl || !manualUrl.trim()} style={{
            background: savingUrl || !manualUrl.trim() ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#F97316,#FCD34D)",
            color: savingUrl || !manualUrl.trim() ? s.muted : "#070D1A",
            border: "none", padding: "10px 20px", borderRadius: 8, cursor: savingUrl || !manualUrl.trim() ? "not-allowed" : "pointer",
            fontWeight: 800, fontSize: 13,
          }}>{savingUrl ? "⏳ Salvando..." : "💾 Salvar matéria"}</button>
        </div>
      )}

      {/* Mensagens */}
      {scanMsg && <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "10px 14px", color: "#34D399", fontSize: 12, fontWeight: 600, marginBottom: 14 }}>{scanMsg}</div>}
      {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", color: "#F87171", fontSize: 12, marginBottom: 14 }}>{error}</div>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Mercado", count: marketArticles.length, color: "#22D3EE", icon: "📰" },
          { label: "Médicos citados", count: doctorArticles.length, color: "#F97316", icon: "👨‍⚕️" },
          { label: "Médicos distintos", count: medicosComCitacoes.length, color: "#A78BFA", icon: "🏆" },
          { label: "Alta relevância", count: articles.filter(a => a.relevancia === "alta").length, color: "#34D399", icon: "🔥" },
        ].map(({ label, count, color, icon }) => (
          <div key={label} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ color: s.muted, fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{icon} {label}</div>
            <div style={{ color, fontSize: 20, fontWeight: 800 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button style={tabStyle("mercado")} onClick={() => { setActiveTab("mercado"); setFilterMedico("todos"); }}>📰 Mercado ({marketArticles.length})</button>
        <button style={tabStyle("medicos")} onClick={() => { setActiveTab("medicos"); setFilterTag("todos"); }}>
          👨‍⚕️ Médicos Parceiros ({doctorArticles.length})
          {doctorArticles.length > 0 && <span style={{ marginLeft: 4, background: "#F97316", color: "#fff", borderRadius: 99, padding: "0 5px", fontSize: 10 }}>●</span>}
        </button>
      </div>

      {activeTab === "medicos" && doctorArticles.length === 0 && !loading && (
        <div style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "14px 16px", color: "#F97316", fontSize: 12, marginBottom: 14 }}>
          Nenhuma citação encontrada ainda. Clique em <strong>Varrer agora → Médicos</strong> ou adicione uma matéria manualmente via <strong>🔗 Adicionar URL</strong>.
        </div>
      )}

      {/* Filtros */}
      {articles.length > 0 && (
        <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="🔍 Buscar..."
            style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.text, padding: "7px 12px", borderRadius: 7, fontSize: 12, flex: "1 1 160px" }} />
          {activeTab === "mercado" && (
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
              style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.text, padding: "7px 10px", borderRadius: 7, fontSize: 12 }}>
              <option value="todos">Todos os temas</option>
              {tagsPresentes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {activeTab === "medicos" && medicosComCitacoes.length > 0 && (
            <select value={filterMedico} onChange={e => setFilterMedico(e.target.value)}
              style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.text, padding: "7px 10px", borderRadius: 7, fontSize: 12 }}>
              <option value="todos">Todos os médicos</option>
              {medicosComCitacoes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <select value={filterRel} onChange={e => setFilterRel(e.target.value)}
            style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.text, padding: "7px 10px", borderRadius: 7, fontSize: 12 }}>
            <option value="todos">Toda relevância</option>
            <option value="alta">🔥 Alta</option>
            <option value="media">📌 Média</option>
            <option value="baixa">● Baixa</option>
          </select>
          <span style={{ color: s.muted, fontSize: 11, marginLeft: "auto" }}>{filtered.length} artigo{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: s.muted }}>⏳ Carregando...</div>
      ) : filtered.length === 0 && articles.length > 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: s.muted }}>Nenhum artigo para os filtros selecionados.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((article, i) => <ArticleCard key={article.id || article.url || i} article={article} s={s} />)}
        </div>
      )}

      <div style={{ marginTop: 20, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${s.border}`, borderRadius: 8, color: s.muted, fontSize: 11, textAlign: "center" }}>
        🕐 Varredura diária às 7h BRT · NewsData.io + Google News RSS · URL manual disponível
      </div>
    </div>
  );
}
