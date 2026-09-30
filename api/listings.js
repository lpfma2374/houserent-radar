const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Um unico pedido HTTP ao D1 por chamada (antes eram 5 sequenciais): o D1 aceita
// varias instrucoes separadas por ";" e devolve um resultado por instrucao.
// A tabela e pequena e so muda uma vez por dia, por isso filtros e estatisticas
// fazem-se em memoria.
const ALL_SQL = `SELECT url, title, source, price, typology, location, sent_date, has_pool,
  has_purchase_option, near_sea, image_url, archived, archived_date
  FROM sent_listings ORDER BY sent_date DESC, price ASC;
SELECT log_date, status, reason, detail, listings_count FROM email_log
  ORDER BY log_date DESC, created_at DESC LIMIT 7`;

// Cache em memoria da instancia quente da funcao (evita ida ao D1 em pedidos seguidos)
const MEM_TTL_MS = 30_000;
let memCache = { at: 0, data: null };

async function d1Multi(sql) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql })
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || "D1 query failed");
  return (j.result || []).map((x) => x.results || []);
}

async function allData() {
  if (memCache.data && Date.now() - memCache.at < MEM_TTL_MS) return { ...memCache.data, hit: true };
  const [rows, emailLog] = await d1Multi(ALL_SQL);
  memCache = { at: Date.now(), data: { rows, emailLog } };
  return { rows, emailLog, hit: false };
}

const SORTS = {
  date: (a, b) => String(b.sent_date || "").localeCompare(String(a.sent_date || "")) || (a.price - b.price),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  try {
    const t0 = Date.now();
    const { rows, emailLog, hit } = await allData();
    const tD1 = Date.now() - t0;
    const sp = new URL(req.url, `https://${req.headers.host || "localhost"}`).searchParams;

    // CDN da Vercel serve a resposta durante 60s e revalida em background ate 5 min
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    res.setHeader("Server-Timing", `d1;dur=${tD1};desc="${hit ? "mem-hit" : "d1"}"`);

    const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))].sort();

    // Modo usado pelo frontend: dataset completo, filtros aplicados no browser
    if (sp.get("all") === "1") {
      return res.status(200).json({ ok: true, sources, count: rows.length, listings: rows, email_log: emailLog });
    }

    // Modo compativel (data-quality, integracoes): mesma semantica dos filtros anteriores
    const min = Math.max(0, parseInt(sp.get("min") || "500", 10) || 500);
    const max = Math.min(10000, parseInt(sp.get("max") || "2000", 10) || 2000);
    const typology = sp.get("typology") || "all";
    const source = sp.get("source") || "all";
    const coastal = sp.get("coastal") === "1";
    const showArchived = sp.get("archived") === "1";
    const sort = SORTS[sp.get("sort")] ? sp.get("sort") : "date";
    const limit = Math.min(parseInt(sp.get("limit") || "200", 10) || 200, 500);

    const filtered = rows.filter((x) =>
      x.price >= min && x.price <= max && x.archived === (showArchived ? 1 : 0) &&
      (typology === "all" || x.typology === typology) &&
      (source === "all" || x.source === source) &&
      (!coastal || x.near_sea === 1)
    ).sort(SORTS[sort]);
    const prices = filtered.map((x) => x.price);

    return res.status(200).json({
      ok: true,
      count: Math.min(filtered.length, limit),
      listings: filtered.slice(0, limit),
      stats: {
        total: filtered.length,
        coastal: filtered.filter((x) => x.near_sea === 1).length,
        avg_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
        min_price: prices.length ? Math.min(...prices) : 0,
        archived: rows.filter((r) => r.archived === 1).length
      },
      sources,
      email_log: emailLog
    });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
