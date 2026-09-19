# HouseRent Radar

Dashboard de oportunidades de arrendamento no Distrito do Porto, com layout inspirado na Apple e no [Scout Radar](https://scout-radar-dashboard.vercel.app/).

- **Frontend**: HTML + JavaScript puro, sem framework (`index.html`)
- **Backend**: serverless function Vercel (`api/listings.js`) a consultar o **Cloudflare D1**
- **Dados**: tabela `sent_listings` (anúncios enviados no digest diário) e `email_log` (auditoria de envios OK/NOT OK)
- **Actualização diária**: todos os dias às 8h um agente Base44 pesquisa 10 portais imobiliários, envia o digest por email e grava os novos anúncios no D1

## Estrutura

```
index.html                    # dashboard (filtros + data list + log de envios)
api/listings.js               # serverless function (queries ao D1)
vercel.json                   # config Vercel
.github/workflows/deploy.yml  # CI/CD (GitHub Actions → Vercel)
```

## Variáveis de ambiente (Vercel)

| Nome | Descrição |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | conta Cloudflare |
| `CLOUDFLARE_D1_DATABASE_ID` | base D1 `houserent-seeker` |
| `CLOUDFLARE_API_TOKEN` | token Cloudflare com permissão D1 |

## CI/CD

O workflow `.github/workflows/deploy.yml` faz deploy de produção em cada push para `main` e deploy de preview em cada PR. Requer os secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` no repositório.

Além do GitHub Action, o repositório está ligado ao Vercel Git Integration: cada push dispara também o deploy nativo do Vercel, visível no dashboard.
