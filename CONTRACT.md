# Technisch contract voor klantdemo's

Demo's worden getoond op `https://voorbeeld.themarketlab.nl/{slug}/…`. Dit project
**proxyt** elk request onder `/{slug}` naar de eigen Vercel-deployment van de klant.
De HTML wordt niet herschreven. Een site werkt daarom alleen goed als hij aan dit
contract voldoet. Willekeurige bestaande websites werken **niet** gegarandeerd.

Gebruik na het registreren in `/admin` altijd **Contract controleren**.

## Modus `basePath` (standaard, verplicht voor frameworks)

De site wordt gebouwd alsof hij op `/{slug}` draait. De proxy stuurt het volledige pad
ongewijzigd door: `/{slug}/over-ons` → `https://klant-x.vercel.app/{slug}/over-ons`.

| Framework | Instelling |
|---|---|
| Next.js | `basePath: '/{slug}'` in `next.config` |
| Vite / React / Vue | `base: '/{slug}/'` in `vite.config`, router met `basename: '/{slug}'` |
| Astro | `base: '/{slug}'` in `astro.config` |
| SvelteKit | `kit.paths.base = '/{slug}'` |
| Nuxt | `app.baseURL: '/{slug}/'` |

Gevolg: op het eigen Vercel-adres staat de site óók op `/{slug}`. Voeg desgewenst een
redirect `/` → `/{slug}` toe in het klantproject.

## Modus `root-static` (beperkt)

Alleen voor eenvoudige statische HTML-sites die op hun eigen root draaien en
**uitsluitend relatieve paden** gebruiken (`./css/style.css`, `contact.html`). De proxy
haalt `/{slug}` van het pad af, en `/{slug}` wordt doorgestuurd naar `/{slug}/`.
Next.js-, SPA- en andere framework-sites zijn in deze modus **niet** ondersteund.

## Eisen (beide modi)

1. **Geen root-paden.** Er staan geen hardgecodeerde `/…`-URL's in HTML, CSS (`url()`) of JS die buiten
   `/{slug}` vallen. Gebruik de link-, image- en asset-helpers van het framework of relatieve paden.
2. **Geen absolute URL's naar `*.vercel.app`.** Canonical, Open Graph, sitemap, e-mails en
   API-calls gebruiken `https://voorbeeld.themarketlab.nl/{slug}`. Leg dat vast in een env var,
   bijvoorbeeld `NEXT_PUBLIC_SITE_URL`.
3. **Alleen relatieve redirects binnen `/{slug}`.** Geen redirects op basis van de host, geen
   `www`- of `https`-redirect, geen geforceerde redirect naar een eigen domein. Een absolute
   `Location` naar `*.vercel.app` stuurt de bezoeker weg van het demodomein.
4. **Cookies alleen met `Path=/{slug}` en zonder `Domain`.** Alle demo's delen één domein.
   Login of sessies van derden (OAuth-callbacks e.d.) worden niet ondersteund.
5. **Geen afhankelijkheid van de Host-header.** Geen domein-gebaseerde i18n of middleware.
6. **Geen service worker** met scope `/`. Service workers zijn in demo's niet toegestaan.
7. **Externe diensten** die domeinen whitelisten (Maps-keys, reCAPTCHA, formulierdiensten,
   CORS) moeten `voorbeeld.themarketlab.nl` toestaan.
8. **Formulieren** posten naar een route binnen `/{slug}` of naar een externe dienst.
9. **Niet indexeren.** De proxy voegt `X-Robots-Tag: noindex, nofollow` toe. Voeg geen eigen
   sitemap of robots-regels toe die het tegendeel zeggen.
10. **Deployment Protection.** Staat die aan, maak dan in het klantproject een
    *Protection Bypass for Automation*-geheim aan (Settings → Deployment Protection) en vul het
    in bij de demo in `/admin`.
11. **Vertrouwde code.** Demo's draaien op hetzelfde domein als `/admin`. Alleen code die door
    The MarketLab zelf is gebouwd en gecontroleerd mag als demo worden geregistreerd. Geen
    scripts van onbekende derden.

## Welke Vercel-URL registreer je?

- **Productiedomein van het project** (`klant-x.vercel.app`): de demo volgt elke nieuwe
  productie-deploy.
- **Specifieke deployment-URL** (`klant-x-abc123-….vercel.app`): de demo blijft bevroren op
  die versie.

Het adres moet bij een project in het Vercel-team van The MarketLab horen. Dat wordt bij
het opslaan gecontroleerd.
