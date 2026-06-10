// src/MediaMonitor.jsx
// GeoTrack — Aba de monitoramento de mídia sobre obesidade/ESG

import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
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
};

const RELEVANCIA_CONFIG = {
  alta:  { color: "#34D399", bg: "rgba(52,211,153,0.12)", label: "Alta" },
  media: { color: "#FCD34D", bg: "rgba(252,211,77,0.10)", label: "Média" },
  baixa: { color: "#64748B", bg: "rgba(100,116,139,0.08)", label: "Baixa" },
};

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ArticleCard({ article, s }) {
  const tag = article.tag || "Geral";
  const tagColor = TAG_COLORS[tag] || "#64748B";
  const rel = RELEVANCIA_CONFIG[article.relevancia] || RELEVANCIA_CONFIG.media;

  return (
    <div style={{
      background: s.card,
      border: `1px solid ${s.border}`,
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transition: "border-color 0.2s",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = tagColor}
    onMouseLeave={e => e.currentTarget.style.borderColor = s.border}
    >
      {/* Header: tag + relevância + data */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          background: `${tagColor}20`,
          color: tagColor,
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 99,
          border: `1px solid ${tagColor}40`,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>{tag}</span>
        <span style={{
          background: rel.bg,
          color: rel.color,
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 99,
          border: `1px solid ${rel.color}40`,
        }}>● {rel.label}</span>
        <span style={{ color: s.muted, fontSize: 11, marginLeft: "auto" }}>
          {formatDate(article.data_publicacao)}
        </span>
      </div>

      {/* Título */}
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#F1F5F9",
          fontWeight: 700,
          fontSize: 13,
          lineHeight: 1.4,
          textDecoration: "none",
          display: "block",
        }}
        onMouseEnter={e => e.currentTarget.style.color = tagColor}
        onMouseLeave={e => e.currentTarget.style.color = "#F1F5F9"}
      >
        {article.titulo}
      </a>

      {/* Descrição */}
      {article.descricao && (
        <p style={{
          color: s.muted,
          fontSize: 12,
          lineHeight: 1.5,
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {article.descricao}
        </p>
      )}

      {/* Footer: fonte + link */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <span style={{
          color: s.muted,
          fontSize: 11,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${s.border}`,
          padding: "2px 8px",
          borderRadius: 6,
        }}>
          📰 {article.fonte}
        </span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: tagColor,
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            marginLeft: "auto",
          }}
        >
          Ler artigo →
        </a>
      </div>
    </div>
  );
}

export default function MediaMonitor({ s }) {
  const [articles, setArticles]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [scanning, setScanning]       = useState(false);
  const [error, setError]             = useState(null);
  const [scanMsg, setScanMsg]         = useState(null);
  const [filterTag, setFilterTag]     = useState("todos");
  const [filterRel, setFilterRel]     = useState("todos");
  const [searchText, setSearchText]   = useState("");

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await supaFetch(
        "media_alerts?select=*&order=data_publicacao.desc,criado_em.desc&limit=100"
      );
      setArticles(data || []);
    } catch (err) {
      setError("Erro ao carregar notícias: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleScan = async () => {
    setScanning(true);
    setScanMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/media-monitor");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScanMsg(`✅ ${data.total} artigo(s) encontrado(s) e salvos`);
      await fetchArticles();
    } catch (err) {
      setError("Erro na varredura: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Filtros aplicados
  const filtered = articles.filter(a => {
    const matchTag = filterTag === "todos" || a.tag === filterTag;
    const matchRel = filterRel === "todos" || a.relevancia === filterRel;
    const matchSearch = !searchText ||
      a.titulo?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.descricao?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.fonte?.toLowerCase().includes(searchText.toLowerCase());
    return matchTag && matchRel && matchSearch;
  });

  // Tags únicas presentes
  const tagsPresentes = [...new Set(articles.map(a => a.tag).filter(Boolean))];

  // Contadores por relevância
  const counts = {
    alta:  articles.filter(a => a.relevancia === "alta").length,
    media: articles.filter(a => a.relevancia === "media").length,
    baixa: articles.filter(a => a.relevancia === "baixa").length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 4, height: 24, background: "linear-gradient(to bottom,#22D3EE,#6EE7B7)", borderRadius: 2 }} />
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#F1F5F9" }}>
            📰 Media Monitor
          </h2>
          <div style={{ color: s.muted, fontSize: 11, marginTop: 2 }}>
            Publicações sobre obesidade, ESG, GLP-1 e endobariatria
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          style={{
            marginLeft: "auto",
            background: scanning
              ? "rgba(34,211,238,0.1)"
              : "linear-gradient(135deg,#22D3EE,#6EE7B7)",
            color: scanning ? s.accent : "#070D1A",
            border: scanning ? `1px solid ${s.accent}` : "none",
            padding: "9px 18px",
            borderRadius: 8,
            cursor: scanning ? "not-allowed" : "pointer",
            fontWeight: 800,
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {scanning ? "🔍 Buscando..." : "🔄 Varrer agora"}
        </button>
      </div>

      {/* Status messages */}
      {scanMsg && (
        <div style={{
          background: "rgba(52,211,153,0.1)",
          border: "1px solid rgba(52,211,153,0.3)",
          borderRadius: 8,
          padding: "10px 14px",
          color: "#34D399",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          {scanMsg}
        </div>
      )}
      {error && (
        <div style={{
          background: "rgba(248,113,113,0.1)",
          border: "1px solid rgba(248,113,113,0.3)",
          borderRadius: 8,
          padding: "10px 14px",
          color: "#F87171",
          fontSize: 12,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Alta relevância", count: counts.alta, color: "#34D399", icon: "🔥" },
          { label: "Média relevância", count: counts.media, color: "#FCD34D", icon: "📌" },
          { label: "Total encontrado", count: articles.length, color: "#22D3EE", icon: "📰" },
        ].map(({ label, count, color, icon }) => (
          <div key={label} style={{
            background: s.card,
            border: `1px solid ${s.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}>
            <div style={{ color: s.muted, fontSize: 10, fontWeight: 600, marginBottom: 4 }}>{icon} {label}</div>
            <div style={{ color, fontSize: 22, fontWeight: 800 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Aviso de configuração */}
      {articles.length === 0 && !loading && (
        <div style={{
          background: "rgba(252,211,77,0.07)",
          border: "1px solid rgba(252,211,77,0.25)",
          borderRadius: 10,
          padding: "16px 18px",
          marginBottom: 20,
          color: "#FCD34D",
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚙️ Configuração necessária</div>
          <div>Para usar o Media Monitor, adicione a variável de ambiente <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>NEWSDATA_API_KEY</code> no seu projeto Vercel.</div>
          <div style={{ marginTop: 6 }}>1. Acesse <a href="https://newsdata.io" target="_blank" rel="noopener noreferrer" style={{ color: "#22D3EE" }}>newsdata.io</a> → crie conta gratuita → copie a API Key</div>
          <div>2. No Vercel → Settings → Environment Variables → adicione <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>NEWSDATA_API_KEY</code></div>
          <div>3. Clique em <strong>"Varrer agora"</strong> para a primeira busca</div>
        </div>
      )}

      {/* Filtros */}
      {articles.length > 0 && (
        <div style={{
          background: s.card,
          border: `1px solid ${s.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}>
          {/* Search */}
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="🔍 Buscar nos artigos..."
            style={{
              background: "#070D1A",
              border: `1px solid ${s.border2}`,
              color: s.text,
              padding: "7px 12px",
              borderRadius: 7,
              fontSize: 12,
              flex: "1 1 180px",
              minWidth: 160,
            }}
          />

          {/* Tag filter */}
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            style={{
              background: "#070D1A",
              border: `1px solid ${s.border2}`,
              color: s.text,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              flex: "0 0 auto",
            }}
          >
            <option value="todos">Todos os temas</option>
            {tagsPresentes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Relevância filter */}
          <select
            value={filterRel}
            onChange={e => setFilterRel(e.target.value)}
            style={{
              background: "#070D1A",
              border: `1px solid ${s.border2}`,
              color: s.text,
              padding: "7px 10px",
              borderRadius: 7,
              fontSize: 12,
              flex: "0 0 auto",
            }}
          >
            <option value="todos">Toda relevância</option>
            <option value="alta">🔥 Alta</option>
            <option value="media">📌 Média</option>
            <option value="baixa">● Baixa</option>
          </select>

          <span style={{ color: s.muted, fontSize: 11, marginLeft: "auto" }}>
            {filtered.length} artigo{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Lista de artigos */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: s.muted }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
          Carregando notícias...
        </div>
      ) : filtered.length === 0 && articles.length > 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: s.muted }}>
          Nenhum artigo encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((article, i) => (
            <ArticleCard key={article.id || article.url || i} article={article} s={s} />
          ))}
        </div>
      )}

      {/* Footer info */}
      <div style={{
        marginTop: 20,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${s.border}`,
        borderRadius: 8,
        color: s.muted,
        fontSize: 11,
        textAlign: "center",
      }}>
        🕐 Varredura automática diária às 7h00 (Vercel Cron) · Fonte: NewsData.io · Idioma: PT-BR
      </div>
    </div>
  );
}
