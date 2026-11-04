# Advanced SEO & AI Discoverability - Phase 2 (Memory)

Based on the extreme optimization research, here is how the strategies apply to the ChatBox AI Next.js App Router codebase and what actions were taken.

## 1. Semantic Web & Knowledge Graph (Wikidata)
- **Concept:** Creating Wikidata entities and linking them via `sameAs`.
- **Application:** We have updated the `Organization` schema to include the founder (Arpit Ariyan Maharana) and social profiles. 
- **Action Required by User:** You need to manually create a Wikidata profile for "ChatBox AI" and yourself. Once created, we can add the `QXXXXX` URLs to the `sameAs` array in the schema.

## 2. Advanced NLP, BERT & Content
- **Concept:** TF-IDF, Topic Modeling, Sentiment, Passage Ranking.
- **Application:** Since this is a single landing page without a blog, these primarily apply to how the text was written. The current landing page text uses positive sentiment and emotional triggers.
- **Action Taken:** Extracted FAQs directly into `FAQPage` schema to dominate featured snippets (Zero-Click Search Optimization).

## 3. Core Web Vitals (LCP, FID, CLS)
- **Concept:** `< 2.5s` LCP, minimizing CLS, optimizing JavaScript.
- **Application:** Next.js automatically handles much of this (code splitting, prefetching). However, the Hero section has a background video.
- **Action Taken:** Updated the `next.config.mjs` and Layout/Hero to ensure critical assets (like the Hero video) are optimized for LCP.

## 4. Advanced Schema Markup (E-A-T)
- **Concept:** Expertise, Authoritativeness, Trustworthiness.
- **Application:** Added Founder (`Person`) schema to the Organization schema to establish E-A-T signals for the brand.

## Next Steps / Future Roadmap
When you add a blog or multiple pages in the future:
1. Implement Breadcrumb Schema (`BreadcrumbList`).
2. Implement Article/Author Schema for blog posts.
3. Handle pagination with `rel="next"` and `rel="prev"`.
4. Build Localized pages if targeting specific regions (e.g., `/mumbai/` with `hreflang`).
