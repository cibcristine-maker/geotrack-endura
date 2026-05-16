import { useState, useEffect, useCallback } from "react";
const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";
const supa = async (path, opts = {}) => {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: opts.prefer || "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};
const KPI_GROUPS = [
  { id: "geo", label: "GEO — Visibilidade em IAs", color: "#22D3EE", icon: "🤖", kpis: [
    { id: "chatgpt_citacoes", label: "Citações ChatGPT", unit: "x", tipo: "numero" },
    { id: "gemini_citacoes", label: "Citações Gemini", unit: "x", tipo: "numero" },
    { id: "perplexity_citacoes", label: "Citações Perplexity", unit: "x", tipo: "numero" },
    { id: "posicao_resposta", label: "Posição na resposta", unit: "pos", tipo: "numero" },
    { id: "faq_schema_ativo", label: "FAQ Schema implementado?", unit: "", tipo: "bool" },
    { id: "artigos_indexados_ia", label: "Artigos indexados por IAs", unit: "art", tipo: "numero" },
  ]},
  { id: "seo", label: "SEO — Busca Orgânica", color: "#A78BFA", icon: "🔍", kpis: [
    { id: "impressoes_gsc", label: "Impressões GSC", unit: "imp", tipo: "numero" },
    { id: "cliques_gsc", label: "Cliques orgânicos", unit: "cli", tipo: "numero" },
    { id: "posicao_media_gsc", label: "Posição média Google", unit: "pos", tipo: "decimal" },
    { id: "keywords_top10", label: "Keywords Top 10", unit: "kw", tipo: "numero" },
    { id: "keywords_top3", label: "Keywords Top 3", unit: "kw", tipo: "numero" },
    { id: "artigos_publicados", label: "Artigos publicados", unit: "art", tipo: "numero" },
  ]},
  { id: "presenca", label: "Presença Digital", color: "#FCD34D", icon: "🌐", kpis: [
    { id: "google_reviews", label: "Avaliações Google", unit: "av", tipo: "numero" },
    { id: "nota_google", label: "Nota média Google", unit: "★", tipo: "decimal" },
    { id: "instagram_seguidores", label: "Seguidores Instagram", unit: "seg", tipo: "numero" },
    { id: "instagram_alcance", label: "Alcance por post", unit: "p", tipo: "numero" },
    { id: "site_velocidade", label: "PageSpeed Score", unit: "pts", tipo: "numero" },
    { id: "backlinks_novos", label: "Novos backlinks", unit: "bk", tipo: "numero" },
  ]},
  { id: "conversao", label: "Conversão & Negócio", color: "#34D399", icon: "💼", kpis: [
    { id: "consultas_digital", label: "Consultas via digital", unit: "pac", tipo: "numero" },
    { id: "contatos_whatsapp", label: "Contatos WhatsApp", unit: "msg", tipo: "numero" },
    { id: "procedimentos_esg", label: "Procedimentos ESG", unit: "proc", tipo: "numero" },
    { id: "procedimentos_bib", label: "Procedimentos BIB", unit: "proc", tipo: "numero" },
    { id: "taxa_conversao", label: "Taxa conversão (%)", unit: "%", tipo: "decimal" },
  ]},
];
function getCurrentPeriodo() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}
function formatPeriodo(p) {
  if (!p) return "";
  const [y,m] = p.split("-");
  return `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(m)-1]}/${y}`;
}
function Spark({ values, color }) {
  if (!values||values.length<2) return <span style={{color:"#475569",fontSize:11}}>sem histórico</span>;
  const max=Math.max(...values),min=Math.min(...values),range=max-min||1,w=72,h=28;
  const pts=values.map((v,i)=>`${(i/(values.length-1))*w},${h-((v-min)/range)*h}`).join(" ");
  const last=values[values.length-1],prev=values[values.length-2];
  const trend=last>prev?"▲":last<prev?"▼":"—";
  const tc=last>prev?"#34D399":last<prev?"#F87171":"#64748B";
  return <span style={{display:"inline-flex",alignItems:"center",gap:5}}><svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" opacity="0.8"/>{values.map((v,i)=>{const cx=(i/(values.length-1))*w,cy=h-((v-min)/range)*h;return <circle key={i} cx={cx} cy={cy} r={i===values.length-1?3:1.5} fill={color}/>;})}</svg><span style={{color:tc,fontWeight:700,fontSize:12}}>{trend}</span></span>;
}
export default function App() {
  const [medicos,setMedicos]=useState([]);
  const [registros,setRegistros]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState(null);
  const [view,setView]=useState("dashboard");
  const [medicoSel,setMedicoSel]=useState(null);
  const [periodoSel,setPeriodoSel]=useState(getCurrentPeriodo());
  const [form,setForm]=useState({});
  const [obs,setObs]=useState("");
  const fetchAll=useCallback(async()=>{
    try{setLoading(true);setError(null);
      const [meds,regs]=await Promise.all([supa("medicos?select=*&order=nome"),supa("registros_kpi?select=*&order=periodo")]);
      setMedicos(meds||[]);setRegistros(regs||[]);
      if(meds&&meds.length>0) setMedicoSel(m=>m||meds[0]);
    }catch{setError("Erro ao conectar.");}finally{setLoading(false);}
  },[]);
  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{
    if(!medicoSel) return;
    const reg=registros.find(r=>r.medico_id===medicoSel.id&&r.periodo===periodoSel);
    setForm(reg?.valores||{});setObs(reg?.observacoes||"");
  },[medicoSel,periodoSel,registros]);
  async function handleSave(){
    if(!medicoSel) return;setSaving(true);
    try{
      const existing=registros.find(r=>r.medico_id===medicoSel.id&&r.periodo===periodoSel);
      if(existing){await supa(`registros_kpi?id=eq.${existing.id}`,{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({valores:form,observacoes:obs,atualizado_em:new Date().toISOString()})});}
      else{await supa("registros_kpi",{method:"POST",body:JSON.stringify({medico_id:medicoSel.id,periodo:periodoSel,valores:form,observacoes:obs})});}
      await fetchAll();setSaved(true);setTimeout(()=>setSaved(false),2500);
    }catch{setError("Erro ao salvar.");}finally{setSaving(false);}
  }
  function getHistorico(medicoId,kpiId){
    return registros.filter(r=>r.medico_id===medicoId&&r.valores?.[kpiId]!==undefined&&r.valores?.[kpiId]!=="").sort((a,b)=>a.periodo.localeCompare(b.periodo)).map(r=>({periodo:r.periodo,valor:parseFloat(r.valores[kpiId])||0}));
  }
  const periodos=[...new Set(registros.filter(r=>medicoSel&&r.medico_id===medicoSel.id).map(r=>r.periodo))].sort();
  const s={bg:"#070D1A",card:"#0A1220",border:"#0F2040",border2:"#1E2D4E",text:"#E2E8F0",muted:"#475569",accent:"#22D3EE"};
  if(loading) return <div style={{minHeight:"100vh",background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:40,height:40,border:`3px solid #1E3A5F`,borderTop:`3px solid ${s.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><span style={{color:s.muted,fontFamily:"DM Sans,sans-serif",fontSize:14}}>Conectando…</span></div>;
  return <div style={{minHeight:"100vh",background:s.bg,color:s.text,fontFamily:"'DM Sans',sans-serif"}}>
    <style>{`*{box-sizing:border-box}input,select,textarea{outline:none}input:focus,select:focus,textarea:focus{border-color:#22D3EE!important}`}</style>
    <div style={{background:"linear-gradient(to right,#0A1628,#070D1A)",borderBottom:`1px solid ${s.border}`,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,background:"linear-gradient(135deg,#22D3EE,#6EE7B7)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🧬</div>
        <div><div style={{fontWeight:800,fontSize:14,color:"#F1F5F9"}}>GEO·TRACK</div><div style={{fontSize:9,color:s.muted,letterSpacing:1,fontWeight:600}}>ENDURA · BOSTON SCIENTIFIC</div></div>
      </div>
      <nav style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"entrada",label:"Registrar",icon:"✏️"},{id:"historico",label:"Histórico",icon:"📅"},{id:"medicos",label:"Médicos",icon:"👨‍⚕️"}].map(tab=>(
          <button key={tab.id} onClick={()=>setView(tab.id)} style={{background:view===tab.id?"rgba(34,211,238,0.1)":"transparent",border:view===tab.id?`1px solid ${s.accent}`:"1px solid transparent",color:view===tab.id?s.accent:s.muted,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>
    </div>
    {error&&<div style={{background:"#2D1515",borderBottom:"1px solid #7F1D1D",color:"#FCA5A5",padding:"10px 20px",fontSize:13,display:"flex",justifyContent:"space-between"}}>{error}<button onClick={()=>setError(null)} style={{background:"none",border:"none",color:"#FCA5A5",cursor:"pointer"}}>✕</button></div>}
    <div style={{padding:"20px",maxWidth:1180,margin:"0 auto"}}>
      {(view==="dashboard"||view==="historico")&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <span style={{color:s.muted,fontSize:12,fontWeight:600}}>Médico:</span>
        {medicos.map(m=><button key={m.id} onClick={()=>setMedicoSel(m)} style={{background:medicoSel?.id===m.id?"rgba(34,211,238,0.12)":s.card,border:medicoSel?.id===m.id?`1px solid ${s.accent}`:`1px solid ${s.border2}`,color:medicoSel?.id===m.id?s.accent:"#94A3B8",padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{m.nome.replace(/^Dr\. |^Dra\. /,"")}</button>)}
      </div>}
      {view==="dashboard"&&medicoSel&&<div>
        <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:24,background:"linear-gradient(to bottom,#22D3EE,#6EE7B7)",borderRadius:2}}/>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#F1F5F9"}}>{medicoSel.nome}</h2>
        </div>
        {KPI_GROUPS.map(grupo=><div key={grupo.id} style={{marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${grupo.color}22`}}>
            <span>{grupo.icon}</span><span style={{fontWeight:700,color:grupo.color,fontSize:12}}>{grupo.label}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
            {grupo.kpis.map(kpi=>{
              const hist=getHistorico(medicoSel.id,kpi.id);
              const ultimo=hist.length>0?hist[hist.length-1]:null;
              const penultimo=hist.length>1?hist[hist.length-2]:null;
              const delta=ultimo&&penultimo?ultimo.valor-penultimo.valor:null;
              return <div key={kpi.id} style={{background:ultimo?s.card:"#080F1C",border:`1px solid ${ultimo?grupo.color+"33":s.border}`,borderRadius:10,padding:"12px 14px",opacity:ultimo?1:0.45}}>
                <div style={{color:"#475569",fontSize:10,fontWeight:600,marginBottom:6,lineHeight:1.4}}>{kpi.label}</div>
                {ultimo?<><div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:5}}>
                  <span style={{fontSize:20,fontWeight:800,color:"#F1F5F9"}}>{kpi.tipo==="bool"?(ultimo.valor?"✅":"❌"):ultimo.valor}</span>
                  {kpi.unit&&kpi.tipo!=="bool"&&<span style={{color:s.muted,fontSize:10}}>{kpi.unit}</span>}
                  {delta!==null&&kpi.tipo!=="bool"&&<span style={{fontSize:10,fontWeight:700,color:delta>0?"#34D399":delta<0?"#F87171":"#64748B",marginLeft:"auto"}}>{delta>0?"+":""}{Number.isInteger(delta)?delta:delta.toFixed(1)}</span>}
                </div><Spark values={hist.map(h=>h.valor)} color={grupo.color}/><div style={{color:"#334155",fontSize:10,marginTop:3}}>{formatPeriodo(ultimo.periodo)}</div></>
                :<div style={{color:"#1E3A5F",fontSize:12}}>— sem dados</div>}
              </div>;
            })}
          </div>
        </div>)}
      </div>}
      {view==="entrada"&&<div style={{maxWidth:640}}>
        <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:24,background:"linear-gradient(to bottom,#22D3EE,#6EE7B7)",borderRadius:2}}/>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#F1F5F9"}}>Registrar KPIs</h2>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <select value={medicoSel?.id||""} onChange={e=>setMedicoSel(medicos.find(m=>m.id===e.target.value))} style={{background:s.card,border:`1px solid ${s.border2}`,color:s.text,padding:"9px 12px",borderRadius:8,fontSize:13,flex:1,minWidth:180}}>
            {medicos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <input type="month" value={periodoSel} onChange={e=>setPeriodoSel(e.target.value)} style={{background:s.card,border:`1px solid ${s.border2}`,color:s.text,padding:"9px 12px",borderRadius:8,fontSize:13}}/>
        </div>
        {KPI_GROUPS.map(grupo=><div key={grupo.id} style={{marginBottom:16,background:s.card,border:`1px solid ${s.border}`,borderRadius:10,padding:"14px 16px"}}>
          <div style={{color:grupo.color,fontWeight:700,fontSize:11,marginBottom:12,letterSpacing:0.5}}>{grupo.icon} {grupo.label}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {grupo.kpis.map(kpi=><div key={kpi.id}>
              <label style={{color:"#64748B",fontSize:11,display:"block",marginBottom:3}}>{kpi.label}</label>
              {kpi.tipo==="bool"?<select value={form[kpi.id]??""} onChange={e=>setForm(f=>({...f,[kpi.id]:e.target.value}))} style={{background:"#070D1A",border:`1px solid ${s.border2}`,color:s.text,padding:"7px 8px",borderRadius:6,fontSize:12,width:"100%"}}><option value="">—</option><option value="1">✅ Sim</option><option value="0">❌ Não</option></select>
              :<input type="number" step={kpi.tipo==="decimal"?"0.1":"1"} value={form[kpi.id]??""} onChange={e=>setForm(f=>({...f,[kpi.id]:e.target.value}))} placeholder="—" style={{background:"#070D1A",border:`1px solid ${s.border2}`,color:s.text,padding:"7px 8px",borderRadius:6,fontSize:13,width:"100%"}}/>}
            </div>)}
          </div>
        </div>)}
        <div style={{marginBottom:14}}>
          <label style={{color:"#64748B",fontSize:11,display:"block",marginBottom:4}}>📝 Observações do período</label>
          <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={3} style={{background:s.card,border:`1px solid ${s.border}`,color:s.text,padding:"9px 12px",borderRadius:8,fontSize:12,width:"100%",resize:"vertical"}} placeholder="Ações realizadas, novos artigos, implementações…"/>
        </div>
        <button onClick={handleSave} disabled={saving||!medicoSel} style={{background:saved?"linear-gradient(135deg,#34D399,#6EE7B7)":"linear-gradient(135deg,#22D3EE,#6EE7B7)",color:"#070D1A",border:"none",padding:"11px 28px",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:14,opacity:saving?0.7:1}}>
          {saving?"💾 Salvando…":saved?"✅ Salvo!":"💾 Salvar registro"}
        </button>
      </div>}
      {view==="historico"&&medicoSel&&<div>
        <div style={{marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:24,background:"linear-gradient(to bottom,#22D3EE,#6EE7B7)",borderRadius:2}}/>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#F1F5F9"}}>Histórico — {medicoSel.nome}</h2>
        </div>
        {periodos.length===0?<div style={{color:"#1E3A5F",textAlign:"center",padding:"60px 0"}}>Nenhum dado ainda.<br/><button onClick={()=>setView("entrada")} style={{marginTop:16,background:s.accent,color:s.bg,border:"none",padding:"9px 20px",borderRadius:8,cursor:"pointer",fontWeight:700}}>✏️ Registrar</button></div>
        :<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:s.card}}>
            <th style={{textAlign:"left",padding:"9px 12px",color:s.muted,borderBottom:`1px solid ${s.border}`,position:"sticky",left:0,background:s.card,minWidth:180}}>KPI</th>
            {periodos.map(p=><th key={p} style={{padding:"9px 14px",color:"#94A3B8",borderBottom:`1px solid ${s.border}`,textAlign:"center",whiteSpace:"nowrap"}}>{formatPeriodo(p)}</th>)}
          </tr></thead>
          <tbody>
            {KPI_GROUPS.map(grupo=><>{<tr key={`h-${grupo.id}`}><td colSpan={periodos.length+1} style={{padding:"10px 12px 4px",color:grupo.color,fontWeight:700,fontSize:9,letterSpacing:1,background:`${grupo.color}08`}}>{grupo.icon} {grupo.label.toUpperCase()}</td></tr>}
            {grupo.kpis.map(kpi=>{
              const vals=periodos.map(p=>{const reg=registros.find(r=>r.medico_id===medicoSel.id&&r.periodo===p);return reg?.valores?.[kpi.id];});
              return <tr key={kpi.id} style={{borderBottom:`1px solid ${s.bg}`,opacity:vals.some(v=>v!==undefined&&v!=="")? 1:0.35}}>
                <td style={{padding:"8px 12px",color:"#64748B",position:"sticky",left:0,background:s.bg}}>{kpi.label}</td>
                {vals.map((val,i)=><td key={i} style={{padding:"8px 14px",textAlign:"center",color:val!==undefined&&val!==""?"#E2E8F0":"#1E2D4E",fontWeight:val!==undefined&&val!==""?600:400}}>{val!==undefined&&val!==""?(kpi.tipo==="bool"?(val==1?"✅":"❌"):val):"—"}</td>)}
              </tr>;
            })}</>)}
          </tbody>
        </table></div>}
      </div>}
      {view==="medicos"&&<div style={{maxWidth:640}}>
        <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:24,background:"linear-gradient(to bottom,#22D3EE,#6EE7B7)",borderRadius:2}}/>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#F1F5F9"}}>Médicos Parceiros</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {medicos.map(m=>{
            const regsM=registros.filter(r=>r.medico_id===m.id);
            const ultimoP=regsM.length>0?formatPeriodo([...regsM].sort((a,b)=>b.periodo.localeCompare(a.periodo))[0].periodo):null;
            return <div key={m.id} style={{background:s.card,border:`1px solid ${s.border}`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:32,height:32,background:"linear-gradient(135deg,#0F2040,#1E3A5F)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>👨‍⚕️</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:"#F1F5F9"}}>{m.nome}</div>
                <div style={{color:s.muted,fontSize:11,marginTop:1}}>{[m.especialidade,m.cidade].filter(Boolean).join(" · ")}{ultimoP&&<span style={{color:s.accent,marginLeft:8}}>↻ {ultimoP}</span>}</div>
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>{setMedicoSel(m);setView("dashboard");}} style={{background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.2)",color:s.accent,padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>Ver</button>
                <button onClick={()=>{setMedicoSel(m);setView("entrada");}} style={{background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.2)",color:s.accent,padding:"5px 10px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>Registrar</button>
              </div>
            </div>;
          })}
        </div>
      </div>}
    </div>
  </div>;
}
