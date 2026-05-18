import { useState, useEffect } from "react";

const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";
const ACOES_BOOL = [
  { key: "faq_schema",         label: "FAQ Schema" },
  { key: "doctoralia",         label: "Doctoralia" },
  { key: "youtube",            label: "YouTube" },
  { key: "reels",              label: "Reels/Instagram" },
  { key: "google_meu_negocio", label: "Google Meu Negócio" },
];
const ACAO_BLOG = { key: "artigos_blog", label: "Artigos no Blog" };
const ALL_ACOES = [...ACOES_BOOL, ACAO_BLOG];

const PALETTE = {
  navy:       "#0B1F3A",
  teal:       "#0D6E8A",
  tealLight:  "#1A9CB8",
  amber:      "#E8A020",
  amberLight: "#F5C050",
  green:      "#2ECC8A",
  red:        "#E05555",
  gray:       "#8FA3B8",
  grayLight:  "#C8D8E8",
  bg:         "#071428",
  card:       "#0F2040",
  cardBorder: "#1A3560",
};

const DEMO_DATA = [
  { nome: "Dr. Ricardo Guerra",   cidade: "São Paulo",     data_inicio: "2025-11-01",
    acoes: { faq_schema:true, doctoralia:true,  youtube:false, reels:true,  google_meu_negocio:true,  artigos_blog:6 },
    consultas_digital:42, consultas_anterior:18, citacoes_ia:4, citacoes_anterior:1 },
  { nome: "Dr. Jefferson Paes",   cidade: "Fortaleza",     data_inicio: "2025-12-01",
    acoes: { faq_schema:false, doctoralia:true,  youtube:false, reels:true,  google_meu_negocio:false, artigos_blog:2 },
    consultas_digital:28, consultas_anterior:20, citacoes_ia:2, citacoes_anterior:0 },
  { nome: "Dra. Camila Teixeira", cidade: "Rio de Janeiro", data_inicio: "2025-10-15",
    acoes: { faq_schema:true, doctoralia:true,  youtube:true,  reels:true,  google_meu_negocio:true,  artigos_blog:4 },
    consultas_digital:35, consultas_anterior:22, citacoes_ia:3, citacoes_anterior:1 },
  { nome: "Dr. Vilson Lemos",     cidade: "Nova Iguaçu",   data_inicio: "2026-01-10",
    acoes: { faq_schema:false, doctoralia:false, youtube:false, reels:true,  google_meu_negocio:true,  artigos_blog:0 },
    consultas_digital:14, consultas_anterior:12, citacoes_ia:0, citacoes_anterior:0 },
  { nome: "Dr. Fábio Miranda",    cidade: "Rio de Janeiro", data_inicio: "2025-09-01",
    acoes: { faq_schema:true, doctoralia:true,  youtube:false, reels:false, google_meu_negocio:true,  artigos_blog:8 },
    consultas_digital:38, consultas_anterior:19, citacoes_ia:5, citacoes_anterior:2 },
];

function calcGrowth(atual, anterior) {
  if (!anterior) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}
function enrich(data) {
  return data.map(d => ({
    ...d,
    totalAcoesBool: ACOES_BOOL.filter(a => d.acoes[a.key]).length,
    totalAcoes:     ACOES_BOOL.filter(a => d.acoes[a.key]).length + ((d.acoes.artigos_blog || 0) > 0 ? 1 : 0),
    growthConsultas: calcGrowth(d.consultas_digital, d.consultas_anterior),
    growthCitacoes:  calcGrowth(d.citacoes_ia, d.citacoes_anterior),
  }));
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tip({ t }) {
  if (!t) return null;
  return (
    <div style={{
      position:"fixed", left:t.x+14, top:t.y-60, zIndex:9999, pointerEvents:"none",
      background:PALETTE.navy, border:`1px solid ${PALETTE.cardBorder}`,
      borderRadius:10, padding:"10px 14px", fontSize:12, color:"#fff",
      minWidth:190, boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
    }}>{t.body}</div>
  );
}

// ── Bubble Chart ──────────────────────────────────────────────────────────────
function BubbleChart({ data, getG }) {
  const [tip, setTip] = useState(null);
  const W=520, H=300, P={top:24,right:20,bottom:52,left:52};
  const iW=W-P.left-P.right, iH=H-P.top-P.bottom;
  const allG = data.map(getG);
  const maxY = Math.max(...allG, 20), minY = Math.min(...allG, 0);
  const xS = v => P.left + (v/7)*iW;
  const yS = v => P.top + iH - ((v-minY)/(maxY-minY+1))*iH;
  const COLORS = ["#1A9CB8","#E8A020","#2ECC8A","#E05555","#9B72E8"];
  return (
    <div style={{position:"relative"}}>
      <svg width={W} height={H} style={{overflow:"visible"}}>
        {[0,25,50,75,100].filter(v=>v>=minY-5&&v<=maxY+5).map(v=>(
          <g key={v}>
            <line x1={P.left} x2={W-P.right} y1={yS(v)} y2={yS(v)} stroke={PALETTE.cardBorder} strokeDasharray="4 4" strokeWidth={1}/>
            <text x={P.left-7} y={yS(v)+4} textAnchor="end" fill={PALETTE.gray} fontSize={10}>{v}%</text>
          </g>
        ))}
        {[0,1,2,3,4,5,6,7].map(v=>(
          <text key={v} x={xS(v)} y={H-P.bottom+18} textAnchor="middle" fill={PALETTE.gray} fontSize={10}>{v}</text>
        ))}
        <text x={W/2} y={H-4} textAnchor="middle" fill={PALETTE.grayLight} fontSize={11}>Nº de Ações Implementadas</text>
        <text x={13} y={H/2} textAnchor="middle" fill={PALETTE.grayLight} fontSize={11} transform={`rotate(-90,13,${H/2})`}>Crescimento (%)</text>
        {data.map((d,i)=>{
          const x=xS(d.totalAcoes), y=yS(getG(d)), r=13+d.totalAcoes*2.2;
          const sn=d.nome.replace(/Dr[a]?\. /,"").split(" ")[0];
          return (
            <g key={i} style={{cursor:"pointer"}}
              onMouseMove={e=>setTip({x:e.clientX,y:e.clientY,body:(
                <><b style={{display:"block",marginBottom:4}}>{d.nome}</b>
                  <span style={{color:PALETTE.gray}}>{d.cidade}</span><br/>
                  <span style={{color:PALETTE.tealLight}}>Ações: </span>{d.totalAcoes} &nbsp;|&nbsp;
                  <span style={{color:PALETTE.amberLight}}>Artigos: </span>{d.acoes.artigos_blog}<br/>
                  <span style={{color:PALETTE.amber}}>Consultas: </span>+{d.growthConsultas}%<br/>
                  <span style={{color:PALETTE.green}}>Citações IA: </span>+{d.growthCitacoes}%
                </>
              )})}
              onMouseLeave={()=>setTip(null)}>
              <circle cx={x} cy={y} r={r} fill={COLORS[i%COLORS.length]} fillOpacity={0.82} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5}/>
              <text x={x} y={y+4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="700" pointerEvents="none">{sn}</text>
            </g>
          );
        })}
      </svg>
      <Tip t={tip}/>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, getG }) {
  const [tip, setTip] = useState(null);
  const W=520, H=300, P={top:24,right:16,bottom:90,left:52};
  const iW=W-P.left-P.right, iH=H-P.top-P.bottom;

  const results = [
    ...ACOES_BOOL.map(a=>{
      const com=data.filter(d=>d.acoes[a.key]), sem=data.filter(d=>!d.acoes[a.key]);
      const avgC=com.length?com.reduce((s,d)=>s+getG(d),0)/com.length:0;
      const avgS=sem.length?sem.reduce((s,d)=>s+getG(d),0)/sem.length:0;
      return {label:a.label, avgCom:Math.round(avgC), avgSem:Math.round(avgS), delta:Math.round(avgC-avgS), count:com.length};
    }),
    (()=>{
      const alto=data.filter(d=>(d.acoes.artigos_blog||0)>=4);
      const baixo=data.filter(d=>(d.acoes.artigos_blog||0)===0);
      const avgA=alto.length?alto.reduce((s,d)=>s+getG(d),0)/alto.length:0;
      const avgB=baixo.length?baixo.reduce((s,d)=>s+getG(d),0)/baixo.length:0;
      return {label:"Blog (4+ artigos)", avgCom:Math.round(avgA), avgSem:Math.round(avgB), delta:Math.round(avgA-avgB), count:alto.length};
    })(),
  ].sort((a,b)=>b.delta-a.delta);

  const maxVal=Math.max(...results.flatMap(r=>[r.avgCom,r.avgSem]),10);
  const bW=(iW/results.length)*0.33, gap=iW/results.length;
  const yS=v=>P.top+iH-(Math.max(v,0)/maxVal)*iH;

  return (
    <div style={{position:"relative"}}>
      <svg width={W} height={H} style={{overflow:"visible"}}>
        {[0,25,50,75,100].filter(v=>v<=maxVal+10).map(v=>(
          <g key={v}>
            <line x1={P.left} x2={W-P.right} y1={yS(v)} y2={yS(v)} stroke={PALETTE.cardBorder} strokeDasharray="4 4" strokeWidth={1}/>
            <text x={P.left-7} y={yS(v)+4} textAnchor="end" fill={PALETTE.gray} fontSize={10}>{v}%</text>
          </g>
        ))}
        {results.map((r,i)=>{
          const cx=P.left+gap*i+gap/2;
          return (
            <g key={i} style={{cursor:"pointer"}}
              onMouseMove={e=>setTip({x:e.clientX,y:e.clientY,body:(
                <><b style={{display:"block",marginBottom:4}}>{r.label}</b>
                  <span style={{color:PALETTE.tealLight}}>Médicos que fizeram: </span>{r.count}<br/>
                  <span style={{color:PALETTE.tealLight}}>Crescimento (com): </span>+{r.avgCom}%<br/>
                  <span style={{color:PALETTE.gray}}>Crescimento (sem): </span>+{r.avgSem}%<br/>
                  <span style={{color:PALETTE.amberLight,fontWeight:700}}>Delta: +{r.delta}%</span>
                </>
              )})}
              onMouseLeave={()=>setTip(null)}>
              <rect x={cx-bW-2} y={yS(r.avgCom)} width={bW} height={Math.max(P.top+iH-yS(r.avgCom),2)} fill={PALETTE.tealLight} fillOpacity={0.88} rx={3}/>
              <rect x={cx+2} y={yS(r.avgSem)} width={bW} height={Math.max(P.top+iH-yS(r.avgSem),2)} fill={PALETTE.gray} fillOpacity={0.32} rx={3}/>
              {r.delta>0&&<text x={cx} y={yS(r.avgCom)-5} textAnchor="middle" fill={PALETTE.amberLight} fontSize={10} fontWeight="700">+{r.delta}%</text>}
              <text x={cx} y={H-P.bottom+14} textAnchor="end" fill={PALETTE.grayLight} fontSize={9}
                transform={`rotate(-38,${cx},${H-P.bottom+14})`}>{r.label}</text>
            </g>
          );
        })}
        <g transform={`translate(${P.left},${H-10})`}>
          <rect width={10} height={10} fill={PALETTE.tealLight} fillOpacity={0.88} rx={2} y={-10}/>
          <text x={14} fill={PALETTE.grayLight} fontSize={10}>Com a ação</text>
          <rect x={90} width={10} height={10} fill={PALETTE.gray} fillOpacity={0.35} rx={2} y={-10}/>
          <text x={104} fill={PALETTE.grayLight} fontSize={10}>Sem a ação</text>
          <text x={185} fill={PALETTE.amberLight} fontSize={10}>+X% = delta de impacto</text>
        </g>
      </svg>
      <Tip t={tip}/>
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ data, getG }) {
  const [tip, setTip] = useState(null);
  const cW=74, cH=44, lW=152, hH=84;
  const W=lW+ALL_ACOES.length*cW+30, H=hH+data.length*cH+28;
  const maxG=Math.max(...data.map(getG),1);

  function fill(d,a) {
    const done=a.key===ACAO_BLOG.key?(d.acoes.artigos_blog||0)>0:d.acoes[a.key];
    if(!done) return "rgba(255,255,255,0.04)";
    const t=Math.max(getG(d),0)/maxG;
    if(t>0.65) return `rgba(46,204,138,${0.45+t*0.55})`;
    if(t>0.3)  return `rgba(232,160,32,${0.4+t*0.4})`;
    return `rgba(26,156,184,${0.3+t*0.4})`;
  }

  return (
    <div style={{position:"relative",overflowX:"auto"}}>
      <svg width={W} height={H} style={{overflow:"visible"}}>
        {ALL_ACOES.map((a,j)=>(
          <text key={j} x={lW+j*cW+cW/2} y={hH-6} textAnchor="end" fill={PALETTE.grayLight} fontSize={10}
            transform={`rotate(-38,${lW+j*cW+cW/2},${hH-6})`}>{a.label}</text>
        ))}
        {data.map((d,i)=>(
          <g key={i}>
            <text x={8} y={hH+i*cH+cH/2+4}
              fill={getG(d)>50?PALETTE.green:getG(d)>20?PALETTE.amber:PALETTE.gray}
              fontSize={11} fontWeight="700">+{getG(d)}%</text>
            <text x={lW-8} y={hH+i*cH+cH/2+4} textAnchor="end" fill={PALETTE.grayLight} fontSize={11}>
              {d.nome.replace(/Dr[a]?\. /,"").split(" ").slice(0,2).join(" ")}
            </text>
            {ALL_ACOES.map((a,j)=>{
              const isBlog=a.key===ACAO_BLOG.key;
              const done=isBlog?(d.acoes.artigos_blog||0)>0:d.acoes[a.key];
              return (
                <g key={j} style={{cursor:"pointer"}}
                  onMouseMove={e=>setTip({x:e.clientX,y:e.clientY,body:(
                    <><b style={{display:"block",marginBottom:4}}>{d.nome}</b>
                      <span style={{color:PALETTE.grayLight}}>{a.label}: </span>
                      {isBlog
                        ?<span style={{color:PALETTE.amberLight}}>{d.acoes.artigos_blog||0} artigos</span>
                        :done
                          ?<span style={{color:PALETTE.green}}>✓ Implementado</span>
                          :<span style={{color:PALETTE.red}}>✗ Não implementado</span>
                      }<br/>
                      Crescimento: <span style={{color:PALETTE.amber,fontWeight:700}}>+{getG(d)}%</span>
                    </>
                  )})}
                  onMouseLeave={()=>setTip(null)}>
                  <rect x={lW+j*cW+2} y={hH+i*cH+2} width={cW-4} height={cH-4}
                    fill={fill(d,a)} rx={6}
                    stroke={done?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)"} strokeWidth={1}/>
                  <text x={lW+j*cW+cW/2} y={hH+i*cH+cH/2+5} textAnchor="middle"
                    fontSize={isBlog&&done?11:15} fill={done?"#fff":"rgba(255,255,255,0.15)"} pointerEvents="none">
                    {isBlog?(d.acoes.artigos_blog>0?d.acoes.artigos_blog:"·"):(done?"✓":"·")}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
        <g transform={`translate(${lW},${H-14})`}>
          {[
            {color:"rgba(26,156,184,0.6)",  label:"Crescimento baixo"},
            {color:"rgba(232,160,32,0.7)",  label:"Crescimento médio"},
            {color:"rgba(46,204,138,0.9)",  label:"Crescimento alto"},
            {color:"rgba(255,255,255,0.04)",label:"Não implementado"},
          ].map((l,i)=>(
            <g key={i} transform={`translate(${i*148},0)`}>
              <rect width={10} height={10} fill={l.color} rx={2} y={-10}/>
              <text x={14} fill={PALETTE.gray} fontSize={9}>{l.label}</text>
            </g>
          ))}
        </g>
      </svg>
      <Tip t={tip}/>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ImpactoAnalise() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo,  setIsDemo]  = useState(false);
  const [metric,  setMetric]  = useState("consultas");
  const [chart,   setChart]   = useState("bubble");

  useEffect(()=>{ fetchData(); },[]);

  async function fetchData() {
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/medicos?select=*,registros(*)`,
        { headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}` } }
      );
      const medicos = await res.json();
      if (!Array.isArray(medicos)||medicos.length<2) throw new Error();
      const mapped = medicos.map(m=>{
        const regs=m.registros||[], ult=regs[regs.length-1]||{}, pen=regs[regs.length-2]||{};
        return {
          nome:m.nome, cidade:m.cidade||"", data_inicio:m.data_inicio||"",
          acoes:{
            faq_schema:!!ult.faq_schema, doctoralia:!!ult.doctoralia,
            youtube:!!ult.youtube, reels:!!ult.reels,
            google_meu_negocio:!!ult.google_meu_negocio,
            artigos_blog: ult.artigos_blog||0,
          },
          consultas_digital:ult.consultas_digital||0, consultas_anterior:pen.consultas_digital||0,
          citacoes_ia:ult.citacoes_ia||0,             citacoes_anterior:pen.citacoes_ia||0,
        };
      });
      setData(enrich(mapped)); setIsDemo(false);
    } catch {
      setData(enrich(DEMO_DATA)); setIsDemo(true);
    }
    setLoading(false);
  }

  const getG = d => metric==="consultas"?d.growthConsultas:d.growthCitacoes;

  const topMedico = data.length?[...data].sort((a,b)=>getG(b)-getG(a))[0]:null;
  const topAcao = (() => {
    if (!data.length) return null;
    return [...ACOES_BOOL.map(a=>{
      const com=data.filter(d=>d.acoes[a.key]);
      const sem=data.filter(d=>!d.acoes[a.key]);
      const avgC=com.length?com.reduce((s,d)=>s+getG(d),0)/com.length:0;
      const avgS=sem.length?sem.reduce((s,d)=>s+getG(d),0)/sem.length:0;
      return {label:a.label, delta:Math.round(avgC-avgS)};
    })].sort((a,b)=>b.delta-a.delta)[0];
  })();

  const S = {
    wrap:  {minHeight:"100vh",background:PALETTE.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#fff",padding:"24px 20px"},
    hdr:   {marginBottom:24,borderBottom:`1px solid ${PALETTE.cardBorder}`,paddingBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12},
    title: {fontSize:20,fontWeight:700,color:"#E2ECF8",letterSpacing:"-0.3px"},
    badge: {display:"inline-block",background:"rgba(232,160,32,0.15)",border:"1px solid rgba(232,160,32,0.4)",color:PALETTE.amberLight,fontSize:11,padding:"2px 10px",borderRadius:20,marginLeft:10},
    kpiRow:{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"},
    kpi:   {flex:"1 1 140px",background:PALETTE.card,border:`1px solid ${PALETTE.cardBorder}`,borderRadius:12,padding:"14px 16px"},
    kpiL:  {fontSize:10,color:PALETTE.gray,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"},
    kpiV:  {fontSize:22,fontWeight:700,color:"#E2ECF8"},
    kpiS:  {fontSize:11,color:PALETTE.gray,marginTop:3},
    card:  {background:PALETTE.card,border:`1px solid ${PALETTE.cardBorder}`,borderRadius:14,padding:"20px 20px 16px",marginBottom:20},
    cardT: {fontSize:14,fontWeight:600,color:PALETTE.grayLight,marginBottom:16},
    tabs:  {display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"},
    tab:   a=>({padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",border:"none",
                background:a?PALETTE.tealLight:PALETTE.cardBorder,color:a?"#fff":PALETTE.gray,transition:"all .2s"}),
    mTab:  a=>({padding:"5px 14px",borderRadius:20,fontSize:12,cursor:"pointer",
                border:`1px solid ${a?PALETTE.tealLight:PALETTE.cardBorder}`,
                background:a?"rgba(26,156,184,0.15)":"transparent",color:a?PALETTE.tealLight:PALETTE.gray}),
    info:  {background:"rgba(26,156,184,0.08)",border:"1px solid rgba(26,156,184,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:PALETTE.grayLight,marginTop:12},
  };

  if (loading) return (
    <div style={{...S.wrap,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:PALETTE.gray,fontSize:14}}>Carregando dados…</div>
    </div>
  );

  return (
    <div style={S.wrap}>
      <div style={S.hdr}>
        <div>
          <span style={S.title}>📊 Análise de Impacto</span>
          {isDemo&&<span style={S.badge}>⚡ Dados demo — adicione médicos reais</span>}
        </div>
        <div style={{fontSize:12,color:PALETTE.gray}}>{data.length} médicos analisados</div>
      </div>

      {/* KPIs */}
      <div style={S.kpiRow}>
        <div style={S.kpi}>
          <div style={S.kpiL}>🏆 Maior Crescimento</div>
          <div style={{...S.kpiV,fontSize:16}}>{topMedico?.nome.replace(/Dr[a]?\. /,"")||"—"}</div>
          <div style={{...S.kpiS,color:PALETTE.green}}>+{topMedico?getG(topMedico):0}% em {metric==="consultas"?"consultas":"citações IA"}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiL}>⚡ Ação de Maior Impacto</div>
          <div style={{...S.kpiV,fontSize:16}}>{topAcao?.label||"—"}</div>
          <div style={{...S.kpiS,color:PALETTE.amberLight}}>+{topAcao?.delta||0}% vs. quem não fez</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiL}>📝 Total de Artigos</div>
          <div style={S.kpiV}>{data.reduce((s,d)=>s+(d.acoes.artigos_blog||0),0)}</div>
          <div style={S.kpiS}>publicados pelos médicos</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiL}>✅ Média de Ações</div>
          <div style={S.kpiV}>{data.length?(data.reduce((s,d)=>s+d.totalAcoesBool,0)/data.length).toFixed(1):"—"}</div>
          <div style={S.kpiS}>ações por médico</div>
        </div>
      </div>

      {/* Métrica */}
      <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center"}}>
        <span style={{fontSize:12,color:PALETTE.gray,marginRight:4}}>Métrica:</span>
        {[{k:"consultas",l:"Consultas via Digital"},{k:"citacoes",l:"Citações nas IAs"}].map(m=>(
          <button key={m.k} style={S.mTab(metric===m.k)} onClick={()=>setMetric(m.k)}>{m.l}</button>
        ))}
      </div>

      {/* Tabs de gráfico */}
      <div style={S.tabs}>
        {[
          {k:"bubble",  l:"🫧 Crescimento vs. Ações"},
          {k:"bar",     l:"📊 Impacto por Ação"},
          {k:"heatmap", l:"🗺️ Matriz Médico × Ação"},
        ].map(c=>(
          <button key={c.k} style={S.tab(chart===c.k)} onClick={()=>setChart(c.k)}>{c.l}</button>
        ))}
      </div>

      {/* Gráfico */}
      <div style={S.card}>
        {chart==="bubble"&&<>
          <div style={S.cardT}>Quem cresceu mais — e quantas ações fez?</div>
          <BubbleChart data={data} getG={getG}/>
          <div style={S.info}>💡 Bolhas maiores = mais ações. Posição mais alta = maior crescimento. Canto superior direito = melhor combinação esforço × resultado.</div>
        </>}
        {chart==="bar"&&<>
          <div style={S.cardT}>Qual ação gerou maior diferença de resultado?</div>
          <BarChart data={data} getG={getG}/>
          <div style={S.info}>💡 Azul = crescimento médio dos médicos que fizeram. Cinza = dos que não fizeram. O número em laranja é o delta de impacto da ação.</div>
        </>}
        {chart==="heatmap"&&<>
          <div style={S.cardT}>Quem fez o quê — e qual foi o resultado?</div>
          <Heatmap data={data} getG={getG}/>
          <div style={S.info}>💡 Verde escuro = médico fez a ação E cresceu muito. No blog, o número mostra quantos artigos foram publicados. O % à esquerda é o crescimento total.</div>
        </>}
      </div>

      {/* Tabela resumo */}
      <div style={S.card}>
        <div style={S.cardT}>Resumo por Médico</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${PALETTE.cardBorder}`}}>
                {["Médico","Cidade","Ações","Artigos Blog","Data Início","Consultas","Δ Consultas","Citações IA","Δ Citações"].map(h=>(
                  <th key={h} style={{padding:"8px 10px",textAlign:"left",color:PALETTE.gray,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].sort((a,b)=>getG(b)-getG(a)).map((d,i)=>(
                <tr key={i} style={{borderBottom:`1px solid rgba(26,53,96,0.5)`}}>
                  <td style={{padding:"10px",color:"#E2ECF8",fontWeight:600,whiteSpace:"nowrap"}}>{d.nome}</td>
                  <td style={{padding:"10px",color:PALETTE.gray}}>{d.cidade}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>
                    <span style={{background:"rgba(26,156,184,0.2)",color:PALETTE.tealLight,borderRadius:12,padding:"2px 10px",fontWeight:700}}>{d.totalAcoesBool}</span>
                  </td>
                  <td style={{padding:"10px",textAlign:"center",color:PALETTE.amberLight,fontWeight:700}}>{d.acoes.artigos_blog||0}</td>
                  <td style={{padding:"10px",color:PALETTE.gray,whiteSpace:"nowrap"}}>{d.data_inicio||"—"}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>{d.consultas_digital}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>
                    <span style={{color:d.growthConsultas>30?PALETTE.green:d.growthConsultas>0?PALETTE.amber:PALETTE.gray,fontWeight:700}}>+{d.growthConsultas}%</span>
                  </td>
                  <td style={{padding:"10px",textAlign:"center"}}>{d.citacoes_ia}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>
                    <span style={{color:d.growthCitacoes>50?PALETTE.green:d.growthCitacoes>0?PALETTE.amber:PALETTE.gray,fontWeight:700}}>+{d.growthCitacoes}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
