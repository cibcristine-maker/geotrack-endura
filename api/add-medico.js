// api/add-medico.js — endpoint temporario para insert direto
const SUPA_URL = 'https://ojbbjgqfjzygdenwtwrz.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qYmJqZ3Fmanp5Z2Rlbnd0d3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzM0MTksImV4cCI6MjA5NDQ0OTQxOX0.aMFG3M9Ll5iGQZamREUK9LvN3YhK40RBg8R0gH5bVFg';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = {
    nome: 'Dra. Maithe Pimentel Tomarchio',
    slug: 'dra-maithe-pimentel-tomarchio',
    especialidade: 'Endocrinologista',
    cidade: 'Sao Paulo'
  };

  const r = await fetch(SUPA_URL + '/rest/v1/medicos', {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=ignore-duplicates'
    },
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  const data = text ? JSON.parse(text) : {};

  if (!r.ok) return res.status(r.status).json({ error: text });
  return res.status(200).json({ ok: true, inserted: data });
}
