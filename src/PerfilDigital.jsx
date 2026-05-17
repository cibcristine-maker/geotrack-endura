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

const SCHEMAS = [
  { id: "physician", label: "Schema Physician", desc: "Dados do médico estruturados" },
  { id: "faqpage", label: "Schema FAQPage", desc: "Perguntas e respostas indexáveis por IA" },
];

export default function PerfilDigital({ medicos = [], s = {} }) {
  const [perfis, setPerfis] = useState({});
  const [loading, setLoading] = useState(true);
  const [medicoSel, setMedicoSel] = useState(null);
  const [busca, setBusca] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const card = s.card || "#0A2342";
  const border = s.border || "#1e3a5f";
  const accent = s.accent || "#00879E";
  const muted = s.muted || "#64748b";
  const text = s.text || "#e2e8f0";

  const fetchPerfis = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supa("perfil_digital?select=*");
      const map = {};
      (data || []).forEach(p => { map[p.medico_id] = p; });
      setPerfis(map);
    } catch (e) { setPerfis({}); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPerfis();
    if (medicos.length > 0) setMedicoSel(medicos[0]);
  }, [fetchPerfis, medicos]);

  const perfil = medicoSel ? (perfis[medicoSel.id] || {}) : {};

  function updatePerfil(key, value) {
    if (!medicoSel) return;
    setPerfis(prev => ({ ...prev, [medicoSel.id]: { ...(prev[medicoSel.id] || {}), medico_id: medicoSel.id, [key]: value } }));
  }

  async function savePerfil() {
    if (!medicoSel) return;
    setSaving(true);
    try {
      const data = { ...perfil, medico_id: medicoSel.id };
      const existing = await supa(`perfil_digital?medico_id=eq.${medicoSel.id}&select=id`);
      if (existing && existing.length > 0) {
        await supa(`perfil_digital?id=eq.${existing[0].id}`, { method: "PATCH", body: JSON.stringify(data) });
      } else {
        await supa("perfil_digital", { method: "POST", body: JSON.stringify(data) });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    finally { setSaving(false); }
  }

  const medicosFiltrados = medicos.filter(m => m.nome.toLowerCase().includes(busca.toLowerCase()));

  const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
      background: value ? "#10b981" : border, position: "relative", transition: "background 0.2s"
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s"
      }} />
    </button>
  );

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: accent }}>Carregando...</div>;

  return (
    <div style={{ color: text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: accent, textTransform: "uppercase", fontFamily: "monospace" }}>Perfil Digital</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>Schema · Doctoralia · Reddit · Blog</div>
        </div>
        <button onClick={savePerfil} disabled={saving} style={{
          padding: "8px 16px", borderRadius: 8, border: `1px solid ${accent}`,
          background: saved ? accent : "transparent", color: saved ? "#fff" : accent,
          cursor: "pointer", fontSize: 12, fontFamily: "monospace", textTransform: "uppercase", transition: "all 0.3s"
        }}>{saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar"}</button>
      </div>

      {/* Seletor de médico */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: muted, marginBottom: 4, letterSpacing: 1 }}>MÉDICO</div>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar médico..."
          style={{ background: card, border: `1px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: "100%", marginBottom: 6 }} />
        <select value={medicoSel?.id || ""} onChange={e => { setMedicoSel(medicos.find(m => m.id === e.target.value)); setBusca(""); }}
          style={{ background: card, border: `1px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: "100%" }}>
          {medicosFiltrados.map(m => <option key={m.id} value={m.id}>{m.nome} {m.cidade ? `— ${m.cidade}` : ""}</option>)}
        </select>
      </div>

      {medicoSel && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Schema */}
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "16px" }}>
            <div style={{ fontSize: 12, color: accent, fontWeight: 700, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>Schema Markup</div>
            {SCHEMAS.map(sc => (
              <div key={sc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${border}22` }}>
                <div>
                  <div style={{ fontSize: 13, color: text }}>{sc.label}</div>
                  <div style={{ fontSize: 11, color: muted }}>{sc.desc}</div>
                </div>
                <Toggle value={!!perfil[`schema_${sc.id}`]} onChange={v => updatePerfil(`schema_${sc.id}`, v)} />
              </div>
            ))}
          </div>

          {/* Doctoralia */}
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Doctoralia</div>
              <Toggle value={!!perfil.doctoralia_ativo} onChange={v => updatePerfil("doctoralia_ativo", v)} />
            </div>
            {perfil.doctoralia_ativo && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Avaliações</div>
                  <input type="number" value={perfil.doctoralia_avaliacoes || ""} onChange={e => updatePerfil("doctoralia_avaliacoes", Number(e.target.value))}
                    placeholder="Ex: 47" style={{ background: "#07192B", border: `1px solid ${border}`, color: text, padding: "8px 10px", borderRadius: 6, fontSize: 13, width: "100%" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Estrelas (1-5)</div>
                  <input type="number" min="1" max="5" step="0.1" value={perfil.doctoralia_estrelas || ""} onChange={e => updatePerfil("doctoralia_estrelas", Number(e.target.value))}
                    placeholder="Ex: 4.8" style={{ background: "#07192B", border: `1px solid ${border}`, color: text, padding: "8px 10px", borderRadius: 6, fontSize: 13, width: "100%" }} />
                </div>
              </div>
            )}
          </div>

          {/* Reddit */}
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Reddit</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Menções em comunidades de saúde</div>
              </div>
              <Toggle value={!!perfil.reddit_mencoes} onChange={v => updatePerfil("reddit_mencoes", v)} />
            </div>
          </div>

          {/* Blog */}
          <div style={{ background: card, borderRadius: 10, border: `1px solid ${border}`, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: accent, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Blog</div>
              <Toggle value={!!perfil.blog_ativo} onChange={v => updatePerfil("blog_ativo", v)} />
            </div>
            {perfil.blog_ativo && (
              <div>
                <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Número de artigos publicados</div>
                <input type="number" value={perfil.blog_artigos || ""} onChange={e => updatePerfil("blog_artigos", Number(e.target.value))}
                  placeholder="Ex: 12" style={{ background: "#07192B", border: `1px solid ${border}`, color: text, padding: "8px 10px", borderRadius: 6, fontSize: 13, width: "200px" }} />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
