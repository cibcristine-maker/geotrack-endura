// api/cleanup.js — remove artigos de médicos sem relação com obesidade
const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";

const OBESITY_TERMS = [
  "obesidade","obeso","obesa","sobrepeso","overweight","obesity",
  "emagrecimento","emagrecer","perda de peso","weight loss",
  "ozempic","wegovy","semaglutida","semaglutide","mounjaro","tirzepatida","tirzepatide",
  "glp-1","glp1","saxenda","victoza","rybelsus",
  "gastroplastia","gastric sleeve","sleeve","bypass","bariátrica","bariatrica","baríatrica",
  "gastrectomia","balão intragástrico","balao intragastrico","intragastric balloon",
  "endoscopic sleeve","endobariatria","esg",
  "imc","índice de massa corporal","reganho de peso","compulsão alimentar",
  "apetite","caneta emagrecedora","inibidor de apetite",
];

function isObesityRelated(titulo) {
  const t = (titulo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return OBESITY_TERMS.some(w => t.includes(w));
}

async function supa(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json", "Prefer": "return=representation" },
    ...opts,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Buscar TODOS os artigos de médicos parceiros
    const articles = await supa(
      "media_alerts?select=id,titulo,medico_nome&tag=eq.M%C3%A9dico%20Parceiro&limit=500"
    ) || [];

    // Separar os que NÃO têm relação com obesidade
    const toDelete = articles.filter(a => !isObesityRelated(a.titulo));
    const toKeep   = articles.filter(a =>  isObesityRelated(a.titulo));

    if (req.query.dry === "1") {
      // Modo preview — só mostra o que seria deletado
      return res.status(200).json({
        total: articles.length,
        manter: toKeep.length,
        deletar: toDelete.length,
        exemplos_deletar: toDelete.slice(0, 20).map(a => ({ id: a.id, titulo: a.titulo, medico: a.medico_nome })),
      });
    }

    // Deletar em lotes de 20
    let deleted = 0;
    const ids = toDelete.map(a => a.id);
    for (let i = 0; i < ids.length; i += 20) {
      const batch = ids.slice(i, i + 20);
      const inList = batch.map(id => `"${id}"`).join(",");
      await supa(`media_alerts?id=in.(${inList})`, { method: "DELETE" });
      deleted += batch.length;
    }

    return res.status(200).json({
      ok: true,
      total_antes: articles.length,
      deletados: deleted,
      mantidos: toKeep.length,
      exemplos_mantidos: toKeep.slice(0, 5).map(a => a.titulo),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
