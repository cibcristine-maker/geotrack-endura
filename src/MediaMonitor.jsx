// src/MediaMonitor.jsx
// GeoTrack — Media Monitor com busca por mercado + médicos parceiros

import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: opts.prefer || "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const TAG_COLORS = {
  "ESG/Endobariatria": "#22D3EE",
  "BIB": "#A78BFA",
  "GLP-1/Mercado": "#FCD34D",
  "Mercado": "#34D399",
  "Médico Parceiro": "#F97316",
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
      onMouseLeave={e => e.currentTarget.style.borderColor = s.border}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ background: `${tagColor}20`, color: tagColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: `1px solid ${tagColor}40`, textTransform: "uppercase", letterSpacing: "0.5px" }}>{tag}</span>
        {article.medico_nome && (
          <span style={{ background: "rgba(249,115,22,0.12)", color: "#F97316", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(249,115,22,0.3)" }}>
            👨‍⚕️ {article.medico_nome}
          </span>
        )}
        <span style={{ background: rel.bg, color: rel.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: `1px solid ${rel.color}40` }}>● {rel.label}</span>
        <span style={{ color: s.muted, fontSize: 11, marginLeft: "auto" }}>{formatDate(article.data_publicacao)}</span>
      </div>

      <a href={article.url} target="_blank" rel="noopener noreferrer"
        style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 13, lineHeight: 1.4, textDecoration: "none", display: "block" }}
        onMouseEnter={e => e.currentTarget.style.color = tagColor}
        onMouseLeave={e => e.currentTarget.style.color = "#F1F5F9"}
      >
        {article.titulo}
      </a>

      {article.descricao && (
        <p style={{ color: s.muted, fontSize: 12, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.descricao}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <span style={{ color: s.muted, fontSize: 11, background: "rgba(255,255,255,0.04)", border: `1px solid ${s.border}`, padding: "2px 8px", borderRadius: 6 }}>
          📰 {article.fonte}
        </span>
        <a href={article.url} target="_blank" rel="noopener noreferrer"
          style={{ color: tagColor, fontSize: 11, fontWeight: 600, textDecoration: "none", marginLeft: "auto" }}>
          Ler artigo →
        </a>
      </div>
    </div>
  );
}

export default function MediaMonitor({ s }) {
  const [articles, setArticles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [scanning, setScanning]     = useState(false);
  const [scanMode, setScanMode]     = useState("all"); // "all" | "market" | "doctors"
  const [error, setError]           = useState(null);
  const [scanMsg, setScanMsg]       = useState(null);
  const [filterTag, setFilterTag]   = useState("todos");
  const [filterRel, setFilterRel]   = useState("todos");
  const [filterMedico, setFilterMedico] = useState("todos");
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab]   = useState("mercado"); // "mercado" | "medicos"

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await supaFetch("media_alerts?select=*&order=data_publicacao.desc,criado_em.desc&limit=200");
      setArticles(data || []);
    } catch (err) { setError("Erro ao carregar: " + err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleScan = async () => {
    setScanning(true); setScanMsg(null); setError(null);
    try {
      const res = await fetch(`/api/media-monitor?mode=${scanMode}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const erroMsg = data.errors?.length ? ` (${data.errors.length} erros)` : "";
      setScanMsg(`✅ ${data.total} artigo(s) encontrado(s) e salvos${erroMsg}`);
      await fetchArticles();
    } catch (err) { setError("Erro na varredura: " + err.message); }
    finally { setScanning(false); }
  };

  // Artigos de mercado (tudo exceto Médico Parceiro)
  const marketArticles = articles.filter(a => a.tag !== "Médico Parceiro");
  // Artigos de médicos
  const doctorArticles = articles.filter(a => a.tag === "Médico Parceiro");
  // Médicos únicos com citações
  const medicosComCitacoes = [...new Set(doctorArticles.map(a => a.medico_nome).filter(Boolean))];

  // Filtros para a aba ativa
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
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 4, height: 24, background: "linear-gradient(to bottom,#22D3EE,#6EE7B7)", borderRadius: 2 }} />
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#F1F5F9" }}>📰 Media Monitor</h2>
          <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>Publicações sobre obesidade, ESG, GLP-1 e médicos parceiros</div>
        </div>
        {/* Botão varrer + seletor de modo */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select value={scanMode} onChange={e => setScanMode(e.target.value)}
            style={{ background: "#070D1A", border: `1px solid ${s.border2}`, color: s.muted, padding: "7px 10px", borderRadius: 7, fontSize: 11 }}>
            <option value="all">Tudo</option>
            <option value="market">Só mercado</option>
            <option value="doctors">Só médicos</option>
          </select>
          <button onClick={handleScan} disabled={scanning} style={{
            background: scanning ? "rgba(34,211,238,0.1)" : "linear-gradient(135deg,#22D3EE,#6EE7B7)",
            color: scanning ? "#22D3EE" : "#070D1A",
            border: scanning ? "1px solid #22D3EE" : "none",
            padding: "9px 16px", borderRadius: 8, cursor: scanning ? "not-allowed" : "pointer",
            fontWeight: 800, fontSize: 12, whiteSpace: "nowrap",
          }}>
            {scanning ? "🔍 Buscando..." : "🔄 Varrer agora"}
          </button>
        </div>
      </div>

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

      {/* Tabs Mercado / Médicos */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button style={tabStyle("mercado")} onClick={() => { setActiveTab("mercado"); setFilterMedico("todos"); }}>
          📰 Mercado ({marketArticles.length})
        </button>
        <button style={tabStyle("medicos")} onClick={() => { setActiveTab("medicos"); setFilterTag("todos"); }}>
          👨‍⚕️ Médicos Parceiros ({doctorArticles.length})
          {doctorArticles.length > 0 && <span style={{ marginLeft: 4, background: "#F97316", color: "#fff", borderRadius: 99, padding: "0 5px", fontSize: 10 }}>●</span>}
        </button>
      </div>

      {/* Alert médicos sem citações */}
      {activeTab === "medicos" && doctorArticles.length === 0 && !loading && (
        <div style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "14px 16px", color: "#F97316", fontSize: 12, marginBottom: 14 }}>
          Nenhuma citação de médicos encontrada ainda. Clique em <strong>Varrer agora</strong> → <strong>Tudo</strong> ou <strong>Só médicos</strong>.
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
        🕐 Varredura automática diária às 7h00 BRT · NewsData.io · PT-BR + EN
      </div>
    </div>
  );
}
