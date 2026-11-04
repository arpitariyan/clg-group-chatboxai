# ChatBox AI — Route Inventory & Scope Classification

This inventory documents all routes discovered in `chatboxai-renewal`, classifying them into In-Scope (for standardization and alignment), Protected (never redesigned), and Public/Informational.

| Route Pattern | Physical File Path | Classification | Owning Layout / Shell | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `app/page.jsx`, `app/LandingPageClient.jsx` | **PROTECTED** | Fullscreen Editorial Canvas | Preserved untouched |
| `/sign-in` | `app/(auth)/sign-in/page.jsx` | **PROTECTED** | `app/(auth)/layout.jsx` | Preserved untouched |
| `/sign-up` | `app/(auth)/sign-up/page.jsx` | **PROTECTED** | `app/(auth)/layout.jsx` | Preserved untouched |
| `/forgot-password` | `app/(auth)/forgot-password/page.jsx` | **PROTECTED** | `app/(auth)/layout.jsx` | Preserved untouched |
| `/ai-models` | `app/ai-models/page.tsx` | **PROTECTED** | Public Minimal Canvas | Preserved untouched |
| `/deep-research` | `app/deep-research/page.tsx` | **PROTECTED** | Public Minimal Canvas | Preserved untouched |
| `/security` | `app/security/page.tsx` | **PROTECTED** | Public Minimal Canvas | Preserved untouched |
| `/developers` | `app/developers/page.tsx` | **PROTECTED** | Public Minimal Canvas | Preserved untouched |
| `/researchers` | `app/researchers/page.tsx` | **PROTECTED** | Public Minimal Canvas | Preserved untouched |
| `/creators` | `app/creators/page.tsx` | **PROTECTED** | Public Minimal Canvas | Preserved untouched |
| `/help-center` | `app/help-center/page.jsx` | **PUBLIC LEGAL/HELP** | Public Layout (`LayoutContent`) | Preserved / Verified |
| `/privacy-policy` | `app/privacy-policy/page.jsx` | **PUBLIC LEGAL** | Public Layout (`LayoutContent`) | Preserved / Verified |
| `/terms-conditions` | `app/terms-conditions/page.jsx` | **PUBLIC LEGAL** | Public Layout (`LayoutContent`) | Preserved / Verified |
| `/docs` | `app/docs/page.jsx` | **PUBLIC DOCS** | Public Layout (`LayoutContent`) | Preserved / Verified |
| `/app` | `app/(routes)/app/page.js` | **IN-SCOPE (Phase 3)** | `AppSidebar` + Header Shell | Target for standardization |
| `/app/connections` | `app/(routes)/app/connections/page.jsx` | **IN-SCOPE (Phase 9)** | `AppSidebar` + Header Shell | Target for standardization |
| `/search/[libId]` | `app/(routes)/search/[libId]/page.jsx` | **IN-SCOPE (Phase 4)** | `AppSidebar` + Header Shell | Target for standardization |
| `/image-gen/[libId]` | `app/(routes)/image-gen/[libId]/page.jsx` | **IN-SCOPE (Phase 5)** | `AppSidebar` + Header Shell | Target for standardization |
| `/settings` | `app/(routes)/settings/page.jsx` | **IN-SCOPE (Phase 6)** | `AppSidebar` + Header Shell | Target for standardization |
| `/library` | `app/(routes)/library/page.jsx` | **IN-SCOPE (Phase 7)** | `AppSidebar` + Header Shell | Target for standardization |
| `/discover` | `app/(routes)/discover/page.jsx` | **IN-SCOPE (Phase 7)** | `AppSidebar` + Header Shell | Target for standardization |
| `/snapshot` | `app/(routes)/snapshot/page.jsx` | **IN-SCOPE (Phase 7)** | `AppSidebar` + Header Shell | Target for standardization |
| `/website-builder/[projectId]` | `app/(routes)/website-builder/[projectId]/page.jsx` | **IN-SCOPE (Phase 8)** | Dedicated Fullscreen Shell | Target for standardization |
| `/website-builder/preview/...` | `app/(routes)/website-builder/preview/...` | **IN-SCOPE (Phase 8)** | Isolated Iframe Wrapper | Target for standardization |
| `/figma` | `app/(routes)/figma/page.jsx` | **IN-SCOPE (Phase 8)** | `AppSidebar` + Header Shell | Target for standardization |
| `/voice-ai` | `app/(routes)/voice-ai/page.jsx` | **IN-SCOPE (Phase 9)** | `AppSidebar` + Header Shell | Target for standardization |
| `/support` | `app/(routes)/support/page.jsx` | **IN-SCOPE (Phase 9)** | `AppSidebar` + Header Shell | Target for standardization |
| `/pricing` | `app/(routes)/pricing/page.jsx` | **IN-SCOPE (Phase 9)** | Public Fullscreen Shell | Target for standardization |

---
## Summary of Scope
- **Total Discovered Routes**: 28
- **Protected Routes**: 10
- **Public Legal/Docs Routes**: 4
- **In-Scope Internal App Routes**: 14
