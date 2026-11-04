# SEO Comprehensive Upgrade - Aug 11, 2026

## Summary
Full SEO upgrade for `chatboxai.co.in` based on Google Search Central Official Guidelines (SEO Starter Guide, In-depth Search Architecture, E-E-A-T/Helpful Content, Generative AI/AI Overviews & RAG Optimization).

---

## Files Modified

### `app/sitemap.js` — Dynamic Sitemap Engine
- Upgraded from 5 static URLs to dynamic sitemap
- Auto-reads `app/docs/md/*.md` at build time using `fs.readdirSync` + `fs.statSync`
- Generates entries for all 38+ documentation guide pages (`/docs/${slug}`)
- File-based `lastModified` timestamps (uses actual file mtime, not hardcoded `new Date()`)
- Priority scores: `/` = 1.0, `/docs` = 0.9, `/help-center` = 0.8, guide pages = 0.8, legal = 0.5
- `changeFrequency`: homepage = daily, docs = weekly, legal = monthly

### `app/robots.js` — AI Bot & Crawler Rules Expanded
- Added `Google-Extended` (Gemini / AI Overviews) as explicit allow
- Added `anthropic-ai`, `Applebot-Extended` in AI bot group
- Explicit `allow` list for public paths
- Added `/_next/` to disallow (prevents build asset crawling noise)
- Added `host:` field for canonical domain declaration

### `app/layout.js` — OpenGraph & E-E-A-T Schema Upgrade
- `og:image`: changed from `/app-icons/icon-512x512.png` (512x512) to `/og-image.jpg` (1200x630, `image/jpeg`)
- Twitter card: `summary` → `summary_large_image` for higher CTR on social shares
- Description: updated to real model names (GPT-4o, Claude 3.5 Sonnet, Gemini Pro) + India audience targeting
- Keywords: expanded to 19 keywords including `AI platform India`, `deep research AI`, `website builder AI`
- Organization JSON-LD schema: Added `parentOrganization` (Technon Pvt Ltd), `areaServed: IN`, `knowsAbout` array with 6 AI knowledge domains
- Organization description: updated to "40+ AI models" with full feature list

### `app/page.jsx` — Homepage Metadata & SoftwareApplication Schema
- Description: Updated to accurate models + features + "Free to start" CTR hook
- SoftwareApplication schema: 
  - Added `inLanguage: en-IN`, `publisher` reference
  - Corrected currency from USD → INR
  - Added 3rd offer: Max Plan at ₹1999

### `app/docs/(guides)/[slug]/page.jsx` — TechArticle + Breadcrumb per Guide Page
- Added `JsonLd` import
- Added `extractDescription()` helper (first meaningful paragraph, 155 chars)
- `generateMetadata`: Now includes `alternates.canonical`, `openGraph` (type: article, URL, description)
- `TechArticle` schema: headline, description, author, publisher, isPartOf WebSite
- `BreadcrumbList` schema: 3-level (Home → Documentation → Guide Title)
- Article tag: `itemScope itemType="https://schema.org/TechArticle"` added
- JSX Fragment wrapper `<>` added to support multiple JSON-LD nodes

### `app/docs/page.jsx` — Docs Overview Canonical + Breadcrumb
- Added `JsonLd` import
- Metadata: improved title, description, `alternates.canonical`, `openGraph` with type
- `BreadcrumbList` schema: 2-level (Home → Documentation)
- Fragment wrapper added

### `app/docs/layout.jsx` — Layout Metadata Canonical + OG type
- Improved description with real model names
- Added `alternates.canonical`
- Added `openGraph.type: 'website'`

### `app/help-center/page.jsx` — BreadcrumbList Schema
- Added `BreadcrumbList` schema: Home → Help Center
- Alongside existing FAQPage schema

### `app/privacy-policy/page.jsx` — BreadcrumbList Schema
- Added `JsonLd` import
- Added `BreadcrumbList` schema: Home → Privacy Policy

### `app/terms-conditions/page.jsx` — BreadcrumbList Schema
- Added `JsonLd` import
- Added `BreadcrumbList` schema: Home → Terms of Service

---

## What Improves in Google Search

| Area | Before | After |
|------|--------|-------|
| Sitemap coverage | 5 URLs | 43+ URLs (38 docs + 5 static) |
| OG image | 512x512 app icon | 1200x630 banner (standard) |
| Twitter card | `summary` (no preview) | `summary_large_image` (big preview) |
| AI Overviews | Neutral | Google-Extended explicitly allowed |
| Breadcrumbs | Missing | Home→Docs→Guide on every page |
| TechArticle schema | Missing | On all 38 guide pages |
| Canonical URLs | Partial | All public pages covered |
| E-E-A-T signals | Basic | Publisher + founder + areaServed + knowsAbout |
| SoftwareApplication | USD pricing, 2 offers | INR pricing, 3 offers (Free/Pro/Max) |
| Description quality | Vague ("GPT-5.5, Claude Fable 5") | Accurate + CTA ("Free to start") |

## Verification Steps
1. Visit `/sitemap.xml` — should show 43+ URLs
2. Visit `/robots.txt` — should show Google-Extended + GPTBot allow rules
3. Open page source of `/docs/quickstart` — should have TechArticle and BreadcrumbList JSON-LD
4. Open page source of `/` — should have og:image as `/og-image.jpg`
5. Test in Google Rich Results Test: https://search.google.com/test/rich-results
