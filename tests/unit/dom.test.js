// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { boot, fixtureListings } from './boot.js';

describe('index.html — boot e interação DOM em jsdom', () => {
  it('arranca com fetch e renderiza estatísticas, lista de anúncios e log', async () => {
    const w = await boot(fixtureListings);
    expect(w.document.querySelectorAll('.item')).toHaveLength(10);
    expect(w.document.getElementById('s-total').textContent).toBe('270');
    expect(w.document.getElementById('s-coastal').textContent).toBe('91');
    expect(w.document.getElementById('s-avg').textContent).toContain('1.240');
    expect(w.document.getElementById('s-min').textContent).toContain('570');
    expect(w.document.getElementById('count-sub').textContent).toContain('10 anúncios');
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
