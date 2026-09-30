// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { boot, fixtureListings } from './boot.js';

describe('index.html — boot e interação DOM em jsdom', () => {
  it('arranca com fetch e renderiza estatísticas, lista de anúncios e log', async () => {
    const w = await boot(fixtureListings);
    expect(w.document.querySelectorAll('.item')).toHaveLength(10);
    expect(w.document.getElementById('s-total').textContent).toBe('10');
    expect(w.document.getElementById('s-coastal').textContent).toBe('4');
    expect(w.document.getElementById('s-avg').textContent).toContain('1.110');
    expect(w.document.getElementById('s-min').textContent).toContain('650');
    expect(w.document.getElementById('count-sub').textContent).toContain('10 anúncios');
  });

  it('pede o dataset completo uma única vez e filtra em memória', async () => {
    const w = await boot(fixtureListings);
    expect(w.fetch).toHaveBeenCalledTimes(1);
    expect(w.fetch.mock.calls[0][0]).toContain('all=1');
    const typ = w.document.getElementById('f-typ');
    typ.value = 'T3';
    typ.dispatchEvent(new w.Event('change'));
    expect(w.document.querySelectorAll('.item')).toHaveLength(3);
    const sea = w.document.getElementById('f-sea');
    sea.checked = true;
    sea.dispatchEvent(new w.Event('change'));
    expect(w.document.querySelectorAll('.item')).toHaveLength(2);
    expect(w.document.getElementById('s-coastal').textContent).toBe('2');
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

  it('filtro de preço aplica-se localmente com debounce', async () => {
    const w = await boot(fixtureListings);
    const max = w.document.getElementById('f-max');
    max.value = '1000';
    max.dispatchEvent(new w.Event('input'));
    await w.flush();
    expect(w.document.querySelectorAll('.item')).toHaveLength(5);
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

  it('toggle de arquivados mostra apenas os arquivados', async () => {
    const w = await boot(fixtureListings);
    const t = w.document.getElementById('f-arch');
    t.checked = true;
    t.dispatchEvent(new w.Event('change'));
    expect(w.document.querySelectorAll('.item')).toHaveLength(1);
    expect(w.document.getElementById('count-sub').textContent).toContain('arquivados');
    expect(w.document.getElementById('s-arch').textContent).toBe('1');
  });

  it('popula opções de portais a partir da resposta da API', async () => {
    const w = await boot(fixtureListings);
    const srcOptions = [...w.document.getElementById('f-src').options].map((o) => o.value);
    expect(srcOptions).toContain('Idealista');
    expect(srcOptions).toContain('Imovirtual');
    expect(srcOptions).toContain('OLX');
  });

  it('exibe mensagem de estado vazio quando não há anúncios', async () => {
    const emptyResponse = { ...fixtureListings, count: 0, listings: [] };
    const w = await boot(emptyResponse);
    expect(w.document.querySelectorAll('.item')).toHaveLength(0);
    expect(w.document.querySelector('.empty').textContent).toContain('Nenhum anúncio corresponde');
  });

  it('exibe mensagem de erro na falha da API', async () => {
    const w = await boot(fixtureListings, { failApi: true });
    expect(w.document.getElementById('count-sub').textContent).toContain('Erro ao carregar dados');
  });
  it('renderiza foto do imóvel quando image_url é seguro', async () => {
    const w = await boot(fixtureListings);
    const img = w.document.querySelector('.item .photo img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://images.example.com/house.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

});
