import { describe, it, expect } from 'vitest';
import S from '../../js/shared.js';

describe('esc — HTML escaping', () => {
  it('escapes dangerous HTML characters', () => {
    expect(S.esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(S.esc('a"b')).toBe('a&quot;b');
    expect(S.esc("o'brien")).toBe('o&#39;brien');
    expect(S.esc('a&b')).toBe('a&amp;b');
  });

  it('handles null, undefined and numbers', () => {
    expect(S.esc(null)).toBe('');
    expect(S.esc(undefined)).toBe('');
    expect(S.esc(123)).toBe('123');
  });
});

describe('formatPrice — price formatting', () => {
  it('formats numeric prices with euro sign and pt-PT locale', () => {
    expect(S.formatPrice(650)).toMatch(/€\s?650/);
    expect(S.formatPrice(1000)).toMatch(/€\s?1[ .]?000/);
  });

  it('returns dash for invalid or missing price', () => {
    expect(S.formatPrice(null)).toBe('—');
    expect(S.formatPrice(undefined)).toBe('—');
    expect(S.formatPrice('abc')).toBe('—');
  });
});

describe('formatSource — source portal capitalization', () => {
  it('capitalizes the first letter of source name', () => {
    expect(S.formatSource('imovirtual')).toBe('Imovirtual');
    expect(S.formatSource('idealista')).toBe('Idealista');
  });

  it('returns empty string for missing input', () => {
    expect(S.formatSource('')).toBe('');
    expect(S.formatSource(null)).toBe('');
  });
});

describe('renderTags — badge tags rendering', () => {
  it('renders near_sea, pool, and purchase option tags', () => {
    const item = { near_sea: 1, has_pool: 1, has_purchase_option: 1 };
    const html = S.renderTags(item);
    expect(html).toContain('Junto ao mar');
    expect(html).toContain('Piscina');
    expect(html).toContain('Opção de compra');
  });

  it('returns empty string if no flags active', () => {
    const item = { near_sea: 0, has_pool: 0, has_purchase_option: 0 };
    expect(S.renderTags(item)).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(S.renderTags(null)).toBe('');
  });
});

describe('renderCard — listing item rendering', () => {
  it('renders a listing card with title, source, price, and url', () => {
    const listing = {
      url: 'https://www.idealista.pt/imovel/12345',
      title: 'T2 Matosinhos Centro',
      source: 'Idealista',
      price: 950,
      typology: 'T2',
      location: 'Matosinhos',
      sent_date: '2026-09-19',
      near_sea: 1,
      has_pool: 0,
      has_purchase_option: 0
    };
    const html = S.renderCard(listing);
    expect(html).toContain('Idealista');
    expect(html).toContain('T2 Matosinhos Centro');
    expect(html).toContain('950');
    expect(html).toContain('https://www.idealista.pt/imovel/12345');
    expect(html).toContain('Junto ao mar');
  });

  it('escapes malicious XSS input in title and location', () => {
    const listing = {
      url: 'https://exemplo.pt/xss',
      title: '<script>alert(1)</script>',
      source: 'OLX',
      price: 500,
      typology: 'T2',
      location: 'Porto" onmouseover="alert(2)',
      sent_date: '2026-09-19'
    };
    const html = S.renderCard(listing);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Porto&quot;');
  });
});

describe('renderLogItem — email log entry rendering', () => {
  it('renders OK status entry', () => {
    const log = {
      log_date: '2026-09-19',
      status: 'OK',
      listings_count: 15,
      reason: 'Enviado com sucesso'
    };
    const html = S.renderLogItem(log);
    expect(html).toContain('2026-09-19');
    expect(html).toContain('OK');
    expect(html).toContain('15');
    expect(html).toContain('ok');
  });

  it('renders NOT OK status entry', () => {
    const log = {
      log_date: '2026-09-18',
      status: 'ERROR',
      reason: 'Falha no envio'
    };
    const html = S.renderLogItem(log);
    expect(html).toContain('NOT OK');
    expect(html).toContain('ko');
  });
});

describe('applyFilters / computeStats', () => {
  const rows = [
    { price: 900, archived: 0, typology: 'T2', source: 'OLX', near_sea: 1, sent_date: '2026-09-28' },
    { price: 700, archived: 0, typology: 'T2', source: 'OLX', near_sea: 0, sent_date: '2026-09-28' },
    { price: 1500, archived: 0, typology: 'T3', source: 'Idealista', near_sea: 1, sent_date: '2026-09-29' },
    { price: 2500, archived: 0, typology: 'T3', source: 'OLX', near_sea: 0, sent_date: '2026-09-29' },
    { price: 800, archived: 1, typology: 'T2', source: 'OLX', near_sea: 0, sent_date: '2026-09-01' }
  ];
  const base = { typology: 'all', source: 'all', min: '500', max: '2000', coastal: false, archived: false, sort: 'date' };

  it('aplica preço, exclui arquivados e ordena por data e preço', () => {
    expect(S.applyFilters(rows, base).map((x) => x.price)).toEqual([1500, 700, 900]);
  });

  it('combina tipologia, portal e junto ao mar', () => {
    expect(S.applyFilters(rows, { ...base, typology: 'T2' })).toHaveLength(2);
    expect(S.applyFilters(rows, { ...base, source: 'Idealista' })).toHaveLength(1);
    expect(S.applyFilters(rows, { ...base, coastal: true }).map((x) => x.price)).toEqual([1500, 900]);
  });

  it('ordena por preço e mostra só arquivados quando pedido', () => {
    expect(S.applyFilters(rows, { ...base, sort: 'price_desc' })[0].price).toBe(1500);
    expect(S.applyFilters(rows, { ...base, archived: true })).toHaveLength(1);
  });

  it('calcula estatísticas sobre os filtrados e arquivados sobre o total', () => {
    const f = S.applyFilters(rows, base);
    expect(S.computeStats(f, rows)).toEqual({ total: 3, coastal: 2, avg_price: 1033, min_price: 700, archived: 1 });
    expect(S.computeStats([], rows)).toEqual({ total: 0, coastal: 0, avg_price: 0, min_price: 0, archived: 1 });
  });
});
