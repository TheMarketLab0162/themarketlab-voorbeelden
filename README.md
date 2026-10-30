# themarketlab-voorbeelden

Centraal demo-beheer voor The MarketLab op **voorbeeld.themarketlab.nl**.

- `/` – landingspagina
- `/admin` – beveiligd beheer (GitHub-login, alleen toegestane accounts)
- `/{slug}/…` – geproxyde klantdemo, zie [CONTRACT.md](./CONTRACT.md)

## Hoe het werkt

```
browser → voorbeeld.themarketlab.nl/{slug}/…
            └─ proxy.ts ── leest demo_{slug} uit Global Config (Edge Config)
                 └─ rewrite → https://{klant}.vercel.app/…  (Vercel proxyt; URL blijft gelijk)
/admin → server actions → Vercel REST API → schrijft Global Config
```

- **Geen redeploy per klant:** de routetabel staat in Global Config. Wijzigingen zijn binnen enkele seconden live.
- **SSRF-bescherming:** alleen `https://*.vercel.app`-hosts die via de Vercel API aantoonbaar bij een
  project in ons team horen. De upstream-host komt altijd uit de opgeslagen configuratie, nooit uit het request.
- **Geen open redirects:** onbekende of uitgeschakelde slugs geven 404/410. Auth-redirects blijven binnen `/admin`.
- **Admin-cookies** hebben `Path=/admin` en worden ook nog actief uit doorgestuurde requests gestript.
- **Autorisatie** wordt in elke admin-pagina en server action gecontroleerd (`lib/admin.ts`), niet alleen in de proxy.
- `/admin` krijgt een CSP met nonce, `frame-ancestors 'none'` en `Cache-Control: no-store`.
- **Uitschakelen** zet `enabled: false` (de URL geeft 410). **Verwijderen** wist de configuratie. Daarvoor moet
  je bevestigen en maximaal 15 minuten geleden zijn ingelogd.

## Eenmalige configuratie

1. **Global Config-store** aanmaken: Vercel → Storage → Edge/Global Config → *Create*, en koppelen aan
   project `themarketlab-voorbeelden`. De env var met de leesverbinding (`GLOBAL_CONFIG` of `EDGE_CONFIG`) wordt
   dan automatisch gezet. Zet daarnaast `GLOBAL_CONFIG_ID` op het store-ID (`ecfg_…`).
2. **Vercel API-token**: Account Settings → Tokens. Scope: team *The MarketLab*, met een vervaldatum.
   Zet het als `VERCEL_API_TOKEN`, met `VERCEL_TEAM_ID`.
3. **GitHub OAuth-app**: GitHub → Settings → Developer settings → OAuth Apps → *New*.
   - Homepage: `https://voorbeeld.themarketlab.nl`
   - Callback: `https://voorbeeld.themarketlab.nl/admin/api/auth/callback/github`
   - Zet `AUTH_GITHUB_ID` en `AUTH_GITHUB_SECRET`.
4. `AUTH_SECRET`: `openssl rand -base64 32`.
5. `ADMIN_GITHUB_IDS`: komma-gescheiden **numerieke** GitHub-ID's (`https://api.github.com/users/<naam>` → `id`).
6. Aanbevolen: een Vercel Firewall-rate-limit op `/admin/api/auth/*`.

Zie `.env.example` voor alle variabelen.

## Ontwikkelen

```bash
npm install
npm test          # unit-tests voor validatie, URL-opbouw en cookie-stripping
npm run typecheck
npm run dev
```
