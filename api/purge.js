// api/purge.js — limpa artigos de médicos sem relação com obesidade
const SUPA_URL = "https://ojbbjgqfjzygdenwtwrz.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg";

const KEEP = ["obesidade","obeso","sobrepeso","overweight","obesity","emagrecimento",
  "emagrecer","perda de peso","weight loss","ozempic","wegovy","semaglutida",
  "semaglutide","mounjaro","tirzepatida","tirzepatide","glp-1","glp1","saxenda",
  "gastroplastia","sleeve","bypass","bariatrica","bariátrica","gastrectomia",
  "balao intragastrico","balão intragástrico","intragastric balloon","endobariatria",
  "imc","reganho","compulsao alimentar","compulsão alimentar","apetite","caneta emagrecedora"];

function ok(titulo) {
  // Sem regex unicode — só toLowerCase e includes
  const t = (titulo || "").toLowerCase();
  return KEEP.some(w => t.includes(w));
}

async function db(path, opts) {
  const r = await fetch(SUPA_URL + "/rest/v1/" + path, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: "Bearer " + SUPA_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    ...opts
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(txt);
  return txt ? JSON.parse(txt) : [];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    // Buscar artigos de médicos
    const all = await db("media_alerts?select=id,titulo&tag=eq.M%C3%A9dico%20Parceiro&limit=500");
    const bad = all.filter(a => !ok(a.titulo));
    const good = all.filter(a => ok(a.titulo));

    if (bad.length === 0) {
      return res.status(200).json({ ok: true, msg: "Nada para deletar", mantidos: good.length });
    }

    // Deletar 1 por 1 para evitar problemas com lista de UUIDs
    let deleted = 0;
    for (const a of bad) {
      try {
        await db("media_alerts?id=eq." + a.id, { method: "DELETE" });
        deleted++;
      } catch(e) {
        // ignora e continua
      }
    }

    return res.status(200).json({
      ok: true,
      total_antes: all.length,
      deletados: deleted,
      mantidos: good.length,
      exemplos_deletados: bad.slice(0, 5).map(a => a.titulo)
    });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
