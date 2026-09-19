const { test, expect } = require('@playwright/test');
const { FIXTURE_DATA, mockApi } = require('./helpers');

test.describe('HouseRent Radar (index.html) — testes de leitura E2E', () => {
  test('carrega anúncios e estatísticas da API', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('.item')).toHaveCount(10);
    await expect(page.locator('#s-total')).toHaveText('270');
    await expect(page.locator('#s-coastal')).toHaveText('91');
    await expect(page.locator('#count-sub')).toContainText('10 anúncios correspondem');
  });

  test('popula os portais de origem no filtro a partir da API', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const srcOptions = await page.locator('#f-src option').allTextContents();
    expect(srcOptions.join()).toContain('Imovirtual');
    expect(srcOptions.join()).toContain('Idealista');
    expect(srcOptions.join()).toContain('OLX');
  });

  test('renderiza etiquetas nas listagens (mar, piscina, opção de compra)', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('.tag.sea').first()).toBeVisible();
    await expect(page.locator('.tag.pool').first()).toBeVisible();
    await expect(page.locator('.tag.buy').first()).toBeVisible();
  });

  test('exibe o histórico de logs de envio de email', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('#log .day')).toHaveCount(2);
    await expect(page.locator('#log .day').first()).toContainText('OK');
  });

  test('exibe mensagem de estado vazio quando não há anúncios', async ({ page }) => {
    await mockApi(page, { body: { ...FIXTURE_DATA, count: 0, listings: [] } });
    await page.goto('/');
    await expect(page.locator('.item')).toHaveCount(0);
    await expect(page.locator('.empty')).toBeVisible();
    await expect(page.locator('.empty')).toContainText('Nenhum anúncio corresponde');
  });

  test('exibe mensagem de erro se a API falhar', async ({ page }) => {
    await mockApi(page, { status: 500, body: { ok: false, error: 'Erro de ligação D1' } });
    await page.goto('/');
    await expect(page.locator('#count-sub')).toContainText('Erro ao carregar dados');
  });

  test('XSS: previne injeção de HTML no título do anúncio', async ({ page }) => {
    const malicious = {
      ...FIXTURE_DATA,
      listings: [
        { ...FIXTURE_DATA.listings[0], title: '<script>alert("xss")</script>' }
      ]
    };
    await mockApi(page, { body: malicious });
    await page.goto('/');
    await expect(page.locator('.item .title').first()).toContainText('<script>alert("xss")</script>');
    const innerHTML = await page.locator('#list').innerHTML();
    expect(innerHTML).toContain('&lt;script&gt;');
  });
});
