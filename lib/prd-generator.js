/**
 * PRD Generator — Type-Aware Planning Layer
 *
 * Pipeline:
 * 1. detectWebsiteType(prompt) → classify into 12 supported types
 * 2. getTypeConfig(type) → load type-specific pages/components/design
 * 3. AI generates PRD seeded with type config (pages, components, design)
 * 4. Task generation creates ordered build tasks for type-specific components
 */

import Groq from 'groq-sdk';
import { detectWebsiteType, getWebsiteTypeLabel } from '@/lib/website-type-detector';
import { getTypeConfig } from '@/lib/website-type-configs';

const GROQ_API_KEYS = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
].filter(Boolean);

let groqKeyIndex = 0;

function getGroqClient() {
    if (GROQ_API_KEYS.length === 0) {
        throw new Error('No Groq API keys configured');
    }
    const apiKey = GROQ_API_KEYS[groqKeyIndex];
    groqKeyIndex = (groqKeyIndex + 1) % GROQ_API_KEYS.length;
    return new Groq({ apiKey });
}

// Keep PRD generation on a Groq-native model.
const PRD_TASK_MODEL = 'llama-3.3-70b-versatile';

function extractJSON(text) {
    if (!text) throw new Error('Empty response from AI');
    try { return JSON.parse(text.trim()); } catch { /* continue */ }
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ } }
    const raw = text.match(/\{[\s\S]*\}/);
    if (raw) { try { return JSON.parse(raw[0]); } catch { /* continue */ } }
    throw new Error('Could not extract valid JSON from AI response');
}

async function callGroqWithFallback(messages, maxTokens, temperature = 0.3) {
    const errors = [];
    for (let attempt = 0; attempt < Math.max(GROQ_API_KEYS.length, 1); attempt++) {
        try {
            const client   = getGroqClient();
            const response = await client.chat.completions.create({
                model: PRD_TASK_MODEL,
                messages,
                max_tokens: maxTokens,
                temperature,
            });
            const content = response.choices[0]?.message?.content;
            if (content) return content;
            throw new Error('Empty content');
        } catch (err) {
            errors.push(err.message);
            console.warn(`[PRD Generator] Attempt ${attempt + 1} failed: ${err.message}`);
            if (attempt < GROQ_API_KEYS.length - 1) {
                await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
            }
        }
    }
    throw new Error(`PRD/Task generation failed. Last error: ${errors[errors.length - 1]}`);
}

// ── Step 1: Generate PRD (Type-Aware) ───────────────────────────────────────────────
export async function generatePRD(userPrompt) {

    // ─ Step 0: Detect website type instantly (no API call) ───────────────────
    const websiteType = detectWebsiteType(userPrompt);
    const typeConfig  = getTypeConfig(websiteType);
    const typeLabel   = getWebsiteTypeLabel(websiteType);

    console.log(`[PRD Generator] Detected website type: ${websiteType} (${typeLabel})`);

    // Serialize type-specific pages and components as examples for the AI
    const pagesExample = JSON.stringify(typeConfig.pages.slice(0, 4));
    const compsExample = JSON.stringify(typeConfig.components.slice(0, 7));
    const dsExample    = JSON.stringify(typeConfig.designSystem);

    const system = `You are a senior product architect for premium React web apps.
The user wants a ${typeLabel} website. Use the examples below to create an accurate PRD.

Return ONLY valid JSON — no markdown, no explanation. Start with { end with }.

Schema:
{
  "projectName": "kebab-case-name",
  "websiteType": "${websiteType}",
  "description": "2-3 sentence summary of the website purpose and target audience",
  "techStack": ["React 18", "Vite", "Tailwind CSS", "React Router v6", "Framer Motion", "Lucide React"],
  "pages": ${pagesExample},
    "components": ${compsExample},
    "folderContract": {
        "componentsRoot": "src/components",
        "uiRoot": "src/components/ui",
        "requiredSrcFolders": ["src/context", "src/data", "src/hooks", "src/lib", "src/pages"]
    },
  "designSystem": ${dsExample},
  "features": ["dark theme", "framer motion animations", "glassmorphism cards", "responsive design", "real Unsplash images"],
  "dataRequirements": "hardcoded realistic mock data — no lorem ipsum"
}

Rules:
- Keep the pages and components appropriate for a ${typeLabel} website
- Customize projectName and description based on the user prompt
- Always use theme: "dark" and animationLibrary: "framer-motion"
- Add/modify pages and components if the user prompt requires extra functionality
- Components must include a type from: layout, section, component, context
- Follow folder contract with src/components/ui plus src/context, src/data, src/hooks, src/lib, src/pages`;

    const content = await callGroqWithFallback([
        { role: 'system', content: system },
        { role: 'user',   content: `Create PRD for this ${typeLabel}: ${userPrompt}` }
    ], 2500);

    const prd = extractJSON(content);

    // Enforce required fields with type-aware defaults
    if (!prd.projectName) prd.projectName = 'my-website';
    prd.websiteType = websiteType; // always stamp the detected type

    if (!prd.pages || !Array.isArray(prd.pages) || prd.pages.length === 0) {
        prd.pages = typeConfig.pages;
    }
    if (!prd.components || !Array.isArray(prd.components) || prd.components.length === 0) {
        prd.components = typeConfig.components;
    }
    if (!prd.designSystem) {
        prd.designSystem = typeConfig.designSystem;
    }
    if (!prd.folderContract || typeof prd.folderContract !== 'object') {
        prd.folderContract = {};
    }
    prd.folderContract.componentsRoot = 'src/components';
    prd.folderContract.uiRoot = 'src/components/ui';
    prd.folderContract.requiredSrcFolders = ['src/context', 'src/data', 'src/hooks', 'src/lib', 'src/pages'];

    // Always enforce premium design choices
    prd.designSystem.theme            = 'dark';
    prd.designSystem.animationLibrary = 'framer-motion';
    if (!prd.designSystem.fonts)     prd.designSystem.fonts     = 'Inter, Plus Jakarta Sans';
    if (!prd.designSystem.cardStyle) prd.designSystem.cardStyle = 'glassmorphic';

    return prd;
}

// ── Step 2: Build Task List (Deterministic — no AI call) ─────────────────────
/**
 * Builds a task list directly from the PRD components + pages.
 *
 * KEY RULE: ONE file per task — no batching of components.
 * This guarantees each component gets full token budget and is completely generated.
 *
 * Task order:
 *   1. Layout components (Navbar, Footer) — used by every page
 *   2. Section / feature components — one task each
 *   3. Pages — one task each
 *   4. App.jsx — ALWAYS LAST (all imports exist by the time it's generated)
 */

const REQUIRED_CUSTOM_COMPONENTS = [
    'Navbar',
    'Footer',
    'NavLink',
    'PageTransition',
    'ScrollToTop',
    'FloatingButtons',
];

const STRUCTURE_FOUNDATION_FILES = [
    {
        title: 'Build src/lib/utils.js',
        description: 'Create src/lib/utils.js with cn(...inputs) helper using clsx + tailwind-merge. Export cn named export.',
        files: ['src/lib/utils.js'],
        type: 'foundation',
    },
    {
        title: 'Build src/data/siteData.js',
        description: 'Create src/data/siteData.js with realistic website data exports used by pages/components: navLinks, stats, testimonials, faqItems. Export named constants.',
        files: ['src/data/siteData.js'],
        type: 'foundation',
    },
    {
        title: 'Build src/hooks/useScrollToTop.js',
        description: 'Create src/hooks/useScrollToTop.js hook using useEffect + useLocation from react-router-dom to scroll window to top on pathname change. Export default useScrollToTop.',
        files: ['src/hooks/useScrollToTop.js'],
        type: 'foundation',
    },
    {
        title: 'Build src/context/AppContext.jsx',
        description: 'Create src/context/AppContext.jsx with AppProvider and useAppContext hook. Include minimal shared UI state (isMenuOpen, setIsMenuOpen). Export AppProvider + useAppContext.',
        files: ['src/context/AppContext.jsx'],
        type: 'foundation',
    },
];

function toFileName(name) {
    // Ensure CamelCase component name → PascalCase filename
    // e.g. "hero section" → "HeroSection", "Navbar" → "Navbar"
    return String(name || '')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
        .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
        .replace(/^[a-z]/, c => c.toUpperCase());
}

function buildTaskListFromPRD(prd) {
    const tasks  = [];
    let   taskId = 1;

    const components = Array.isArray(prd.components) ? prd.components : [];
    const pages      = Array.isArray(prd.pages)      ? prd.pages      : [];

    // ── Part 1: Generate foundational src folders/files ─────────────────────
    for (const foundation of STRUCTURE_FOUNDATION_FILES) {
        tasks.push({
            id: taskId++,
            title: foundation.title,
            description: foundation.description,
            files: foundation.files,
            dependsOn: [],
            type: foundation.type,
        });
    }

    // Merge PRD components with required custom shell components
    const componentMap = new Map();
    for (const comp of components) {
        const normalizedName = toFileName(comp?.name);
        if (!normalizedName) continue;
        componentMap.set(normalizedName, {
            name: normalizedName,
            type: comp?.type || 'component',
            description: comp?.description || '',
        });
    }

    for (const requiredName of REQUIRED_CUSTOM_COMPONENTS) {
        if (!componentMap.has(requiredName)) {
            componentMap.set(requiredName, {
                name: requiredName,
                type: ['Navbar', 'Footer'].includes(requiredName) ? 'layout' : 'component',
                description: `Create reusable ${requiredName} component for App-level composition and premium transitions/interactions.`,
            });
        }
    }

    // ── Part A: Layout components (Navbar, Footer) ────────────────────────────
    // These are separated first because pages depend on them.
    const allComponents = Array.from(componentMap.values());
    const layoutComps  = allComponents.filter(c =>
        c.type === 'layout' ||
        ['Navbar', 'Footer'].includes(toFileName(c.name))
    );

    for (const comp of layoutComps) {
        const fileName = toFileName(comp.name);
        tasks.push({
            id:          taskId++,
            title:       `Build ${fileName} (Layout)`,
            description: comp.description ||
                `Create ${fileName}: glassmorphic sticky design, gradient logo, nav links, CTA button, mobile hamburger with Framer Motion animation`,
            files:       [`src/components/${fileName}.jsx`],
            dependsOn:   [],
            type:        'component',
        });
    }

    // ── Part B: Section / feature components — ONE task per component ─────────
    const otherComps = allComponents.filter(c =>
        c.type !== 'layout' &&
        !['Navbar', 'Footer'].includes(toFileName(c.name))
    );

    for (const comp of otherComps) {
        const fileName = toFileName(comp.name);
        const filePath = comp.type === 'context'
            ? `src/context/${fileName}.jsx`
            : `src/components/${fileName}.jsx`;
        tasks.push({
            id:          taskId++,
            title:       `Build ${fileName}`,
            description: comp.description ||
                `Create ${fileName}: dark glassmorphic card design, Framer Motion scroll-reveal animations, Lucide React icons, real Unsplash images`,
            files:       [filePath],
            dependsOn:   [],
            type:        'component',
        });
    }

    // ── Part C: Pages — ONE task per page ────────────────────────────────────
    for (const page of pages) {
        const pageName = toFileName(page.name);
        tasks.push({
            id:          taskId++,
            title:       `Build ${pageName} Page`,
            description: (page.description || `Create ${pageName} page`) +
                                `\nImport and compose components from src/components and ui primitives from src/components/ui. Use Navbar/Footer, context hooks, and page-level Framer Motion animations.`,
            files:       [`src/pages/${pageName}.jsx`],
            dependsOn:   [],
            type:        'page',
        });
    }

    // ── Part D: App.jsx — ALWAYS LAST ─────────────────────────────────────────
        const customImports = [
                `import ScrollToTop from './components/ScrollToTop';`,
                `import PageTransition from './components/PageTransition';`,
                `import FloatingButtons from './components/FloatingButtons';`,
                `import { AppProvider } from './context/AppContext';`,
        ].join('\n');

    const pageImports = pages.map(p => {
        const pName = toFileName(p.name);
        return `import ${pName} from './pages/${pName}';`;
    }).join('\n');

    const routeList = pages.map(p => {
        const pName = toFileName(p.name);
        const route = p.route || `/${pName.toLowerCase()}`;
                return `            <Route path="${route}" element={<${pName} />} />`;
    }).join('\n');

    const appJsxDescription = `ROOT APP WITH ROUTING — EXPLICIT STRUCTURE REQUIRED

⚡ IMPORTS (DO NOT SKIP OR PARAPHRASE):
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
${customImports}
${pageImports}

⚡ COMPONENT STRUCTURE (EXACT FORMAT):
export default function App() {
  return (
        <AppProvider>
            <BrowserRouter>
                <ScrollToTop />
                <Navbar />
                <PageTransition>
                    <Routes>
${routeList}
                        <Route path="*" element={null} />
                    </Routes>
                </PageTransition>
                <FloatingButtons />
                <Footer />
            </BrowserRouter>
        </AppProvider>
  );
}

⚠️  CRITICAL ROUTING RULES:
1. Use BrowserRouter (NOT Router or Switch)
2. Routes wrapper MUST contain all Route children
3. List all specific routes FIRST, catch-all <Route path="*" element={null} /> LAST
4. Each route uses exact syntax: <Route path="/path" element={<PageName />} />
5. Catch-all route MUST be element={null} to prevent "404 - Page Not Found" errors
6. Export as: export default function App() { ... }
7. AppProvider wraps the full app tree
8. Navbar wraps above Routes, Footer wraps below Routes
9. Keep ScrollToTop, PageTransition, and FloatingButtons connected in App.jsx`;

    tasks.push({
        id:          taskId++,
        title:       'Build App.jsx (Routes)',
        description: appJsxDescription,
        files:       ['src/App.jsx'],
        dependsOn:   [],
        type:        'core',
    });

    return tasks;
}

export async function generateTasks(prd) {
    // Build deterministically — no AI call, zero risk of batching components.
    // The PRD already has the full component + page list; we convert directly.
    const tasks = buildTaskListFromPRD(prd);

    console.log(`[Task Generator] Built ${tasks.length} tasks deterministically:`);
    tasks.forEach(t => console.log(`  Task ${t.id}: ${t.title} → [${t.files.join(', ')}]`));

    return tasks;
}
