import { useState } from "react";
const P = ["ChatGPT","Gemini","Perplexity","Copilot","Claude"];
const Q = [
  {id:1,t:"Parei o Mounjaro e voltei a engordar, o que fazer?"},
  {id:2,t:"Tratamento definitivo para quem parou ozempic e engordou?"},
  {id:3,t:"O que é gastroplastia endoscópica e como funciona?"},
  {id:4,t:"Gastroplastia endoscópica é melhor do que continuar GLP-1?"},
  {id:5,t:"Qual procedimento para emagrecer sem cirurgia bariátrica?"},
  {id:6,t:"Quanto custa gastroplastia endoscópica e tem no plano?"},
  {id:7,t:"Qual médico faz gastroplastia endoscópica em [cidade]?"},
  {id:8,t:"Posso fazer gastroplastia endoscópica depois de GLP-1?"},
  {id:9,t:"Gastroplastia endoscópica tem risco? É segura?"},
  {id:10,t:"Qual o resultado da gastroplastia endoscópica a longo prazo?"},
];
const C = ["#ef4444","#f59e0b","#3b82f6","#10b981"];
const L = ["Invisível","ESG mencionada","ESG+GLP-1","Médico citado"];
export default function GeoMonitor({medicos=[]}) {
  const [sc,setSc] = useState({});
  const [med,setMed] = useState(0);
  const [pl,setPl] = useState(0);
  const s=(m,q,p)=>sc[m]?.[q]?.[p]??null;
  const set=(m,q,p,v)=>setSc(x=>({...x,[m]:{...x[m],[q]:{...x[m]?.[q],[p]:v}}}));
  const pct=(m,p)=>{const v=Q.map(q=>s(m,q.id,p)??0);return Math.round(v.reduce((a,b)=>a+b,0)/(v.length*3)*100);};
  const overall=(m)=>Math.round(P.flatMap((_,i)=>Q.map(q=>s(m,q.id,i)??0)).reduce((a,b)=>a+b,0)/(P.length*Q.length*3)*100);
  const grade=n=>n>=70?"#10b981":n>=40?"#f59e0b":"#ef4444";
  const m=medicos[med];
  return (
    <div style={{color:"#e2e8f0"}}>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {medicos.map((x,i)=><button key={i} onClick={()=>setMed(i)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid",borderColor:med===i?"#00879E":"#1e3a5f",background:med===i?"#00879E22":"transparent",color:med===i?"#00879E":"#64748b",cursor:"pointer",fontSize:12}}>{x.nome} <b style={{color:grade(overall(x.id))}}>{overall(x.id)}%</b></button>)}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {P.map((x,i)=><button key={i} onClick={()=>setPl(i)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid",borderColor:pl===i?"#00879E":"#1e3a5f",background:pl===i?"#00879E22":"transparent",color:pl===i?"#00879E":"#64748b",cursor:"pointer",fontSize:11}}>{x} <b style={{color:grade(m?pct(m.id,i):0)}}>{m?pct(m.id,i):0}%</b></button>)}
      </div>
      {m&&Q.map(q=>{const cur=s(m.id,q.id,pl);return(
        <div key={q.id} style={{background:"#0A2342",borderRadius:8,padding:"10px 12px",marginBottom:6,border:"1px solid #1e3a5f"}}>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>"{q.t}"</div>
          <div style={{display:"flex",gap:4}}>
            {[0,1,2,3].map(v=><button key={v} onClick={()=>set(m.id,q.id,pl,v)} style={{width:28,height:28,borderRadius:5,border:"2px solid",borderColor:cur===v?C[v]:"#1e3a5f",background:cur===v?C[v]+"33":"transparent",color:cur===v?C[v]:"#475569",cursor:"pointer",fontSize:12,fontWeight:700}}>{v}</button>)}
            {cur!==null&&<span style={{fontSize:11,color:C[cur],alignSelf:"center",marginLeft:4}}>{L[cur]}</span>}
          </div>
        </div>
      );})}
      <div style={{marginTop:12,fontSize:11,color:"#475569"}}>0 Invisível · 1 ESG mencionada · 2 ESG+GLP-1 · 3 Médico citado por nome</div>
    </div>
  );
}
