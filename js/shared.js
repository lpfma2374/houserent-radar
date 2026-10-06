(function (root, factory) {
  const exports = factory();
  if (typeof window !== 'undefined') {
    window.HouseRentShared = exports;
  }
  if (typeof define === 'function' && define.amd) {
    define([], function () { return exports; });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  } else {
    root.HouseRentShared = exports;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  const formatPrice = (price) => {
    if (price === null || price === undefined || Number.isNaN(Number(price))) return "—";
    const num = Number(price);
    if (Number.isNaN(num)) return "—";
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "€" + parts.join(",");
  };

  const formatSource = (s) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const renderTags = (x) => {
    if (!x) return "";
    const tags = [
      x.archived ? '<span class="tag arch">Archived</span>' : "",
      x.near_sea ? '<span class="tag sea">🌊 Junto ao mar</span>' : "",
      x.has_pool ? '<span class="tag pool">🏊 Piscina</span>' : "",
      x.has_condo_pool ? '<span class="tag pool">🏡 Condomínio fechado</span>' : "",
      x.has_purchase_option ? '<span class="tag buy">🔑 Opção de compra</span>' : ""
    ].filter(Boolean).join("");
    return tags ? `<div class="tags">${tags}</div>` : "";
  };

  const safeImageUrl = (value) => {
    if (!value) return "";
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" ? url.href : "";
    } catch (_) {
      return "";
    }
  };

  const renderCard = (x) => {
    const imageUrl = safeImageUrl(x.image_url);
    const imageHTML = imageUrl
      ? `<a class="photo" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="Ver anúncio: ${esc(x.title || "imóvel")}">
          <img src="${esc(imageUrl)}" alt="Foto de ${esc(x.title || "imóvel")}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.photo').classList.add('photo-error');this.remove()">
        </a>`
      : `<div class="photo photo-empty" aria-hidden="true"><span>Sem foto</span></div>`;
    const tags = [
      x.archived ? '<span class="tag arch">Archived</span>' : "",
      x.near_sea ? '<span class="tag sea">🌊 Junto ao mar</span>' : "",
      x.has_pool ? '<span class="tag pool">🏊 Piscina</span>' : "",
      x.has_condo_pool ? '<span class="tag pool">🏡 Condomínio fechado</span>' : "",
      x.has_purchase_option ? '<span class="tag buy">🔑 Opção de compra</span>' : ""
    ].filter(Boolean).join("");
    const tagsHTML = tags ? `<div class="tags">${tags}</div>` : "";
    return `<article class="item">
        ${imageHTML}
        <div class="item-copy">
          <div class="src">${esc(x.source)} · ${esc(x.typology)} · ${esc(x.sent_date)}</div>
          <div class="title"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a></div>
          <div class="meta">📍 ${esc(x.location || "Distrito do Porto")}</div>
          ${tagsHTML}
        </div>
        <div class="item-action">
          <div class="price">€${Number(x.price).toLocaleString("pt-PT")}<small>/mês</small></div>
          <a class="view" href="${esc(x.url)}" target="_blank" rel="noopener">Ver anúncio →</a>
        </div>
      </article>`;
  };

  const renderLogItem = (e) => {
    const ok = e.status === "OK";
    return `<div class="day" title="${esc(e.detail || e.reason || "")}">
      <div class="d">${esc(e.log_date)}</div>
      <div class="s"><span class="dot ${ok ? "ok" : "ko"}"></span>${ok ? "OK" : "NOT OK"}${e.listings_count ? " · " + e.listings_count : ""}</div>
      <div class="r">${esc(e.reason || "")}</div>
    </div>`;
  };

  // Filtragem, ordenacao e estatisticas em memoria (sem ida a rede por filtro)
  const SORTS = {
    date: (a, b) => String(b.sent_date || "").localeCompare(String(a.sent_date || "")) || (a.price - b.price),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price
  };

  const applyFilters = (rows, f) => {
    const min = Number(f.min) || 0;
    const max = f.max === "" || f.max == null ? Infinity : Number(f.max);
    const arch = f.archived ? 1 : 0;
    return (rows || []).filter((x) =>
      Number(x.price) >= min && Number(x.price) <= max &&
      Number(x.archived || 0) === arch &&
      (!f.typology || f.typology === "all" || x.typology === f.typology) &&
      (!f.source || f.source === "all" || x.source === f.source) &&
      (!f.coastal || Number(x.near_sea) === 1) &&
      (!f.condoPool || Number(x.has_condo_pool) === 1)
    ).sort(SORTS[f.sort] || SORTS.date);
  };

  const computeStats = (filtered, all) => {
    const prices = filtered.map((x) => Number(x.price)).filter((p) => !Number.isNaN(p));
    return {
      total: filtered.length,
      coastal: filtered.filter((x) => Number(x.near_sea) === 1).length,
      avg_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      min_price: prices.length ? Math.min(...prices) : 0,
      archived: (all || []).filter((x) => Number(x.archived) === 1).length
    };
  };

  return {
    applyFilters,
    computeStats,
    esc,
    formatPrice,
    formatSource,
    renderTags,
    safeImageUrl,
    renderCard,
    renderLogItem
  };
}));
