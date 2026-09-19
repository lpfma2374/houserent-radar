const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const ORDER = {
  date: "sent_date DESC, price ASC",
  price_asc: "price ASC",
  price_desc: "price DESC"
};

async function d1(sql, params = []) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || "D1 query failed");
  return (j.result && j.result[0] && j.result[0].results) || [];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  try {
    const sp = new URL(req.url, `https://${req.headers.host || "localhost"}`).searchParams;
    const min = Math.max(0, parseInt(sp.get("min") || "500", 10) || 500);
    const max = Math.min(10000, parseInt(sp.get("max") || "2000", 10) || 2000);
    const typology = sp.get("typology") || "all";
    const source = sp.get("source") || "all";
    const coastal = sp.get("coastal") === "1";
    const sort = ORDER[sp.get("sort")] ? sp.get("sort") : "date";
    const limit = Math.min(parseInt(sp.get("limit") || "200", 10) || 200, 500);

    const where = ["price >= ?", "price <= ?"];
    const params = [min, max];
    if (typology !== "all") { where.push("typology = ?"); params.push(typology); }
    if (source !== "all") { where.push("source = ?"); params.push(source); }
    if (coastal) where.push("near_sea = 1");
    const W = where.join(" AND ");

    const listings = await d1(
      `SELECT url, title, source, price, typology, location, sent_date, has_pool, has_purchase_option, near_sea
       FROM sent_listings WHERE ${W} ORDER BY ${ORDER[sort]} LIMIT ?`,
      [...params, limit]
    );

    const statsRows = await d1(
      `SELECT COUNT(*) AS total, COALESCE(SUM(near_sea),0) AS coastal,
              COALESCE(AVG(price),0) AS avg_price, COALESCE(MIN(price),0) AS min_price
       FROM sent_listings WHERE ${W}`,
      params
    );
    const stats = statsRows[0] || {};

    const emailLog = await d1(
      `SELECT log_date, status, reason, detail, listings_count FROM email_log
       ORDER BY log_date DESC, created_at DESC LIMIT 7`
    );

    const sources = await d1(
      `SELECT DISTINCT source FROM sent_listings ORDER BY source`
    );

    return res.status(200).json({
      ok: true,
      count: listings.length,
      listings,
      stats: {
        total: stats.total || 0,
        coastal: stats.coastal || 0,
        avg_price: Math.round(stats.avg_price || 0),
        min_price: stats.min_price || 0
      },
      sources: sources.map(s => s.source),
      email_log: emailLog
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
