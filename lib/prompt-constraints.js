/**
 * PROMPT CONSTRAINTS — Error Prevention System
 *
 * Hyper-specific rules that guide code generation to prevent errors
 * before they happen. Pattern from forgeai-master/inngest/prompt.ts
 *
 * Usage:
 *   - getPreGenerationConstraints() → for Step 2 (Enhance prompt)
 *   - getCodeGenerationConstraints() → for Step 6 (Generate code)
 *   - getRevisionConstraints(errorContext) → for revisions
 */

// ───────────────────────────────────────────────────────────────────────────
// PRE-GENERATION CONSTRAINTS
// Applied before code generation starts
// ───────────────────────────────────────────────────────────────────────────

export function getPreGenerationConstraints() {
  return [
    // ── DEPENDENCY RULES ──────────────────────────────────────────────────
    {
      rule: 'EXPLICIT DEPENDENCY DECLARATION',
      description: 'Every imported package MUST be listed in the PRD. Do not assume unlisted packages exist.',
      examples: [
        '✅ PRD says: "Use recharts for charts" → import recharts',
        '❌ Do not guess packages → no "import axios" if not in PRD',
      ],
    },
    {
      rule: 'NO BRAND ICON IMPORTS FROM LUCIDE',
      description: 'Lucide-react does NOT have: Google, Twitter, Instagram, Facebook, Apple, Discord, Slack, Github, Youtube, Linkedin, etc. These will crash immediately.',
      examples: [
        '❌ CRASH: import { Twitter } from "lucide-react"',
        '✅ SAFE: import { MessageCircle, Share2, MessageSquare } from "lucide-react"',
      ],
    },
    {
      rule: 'PREFER GENERIC ICONS OVER BRAND ICONS',
      description: 'Use generic alternatives: Share2 (Twitter), Search (Google), Camera (Instagram), Play (YouTube), Users (Discord), Slack variations',
      mapping: {
        'Twitter/X': 'MessageCircle, Share2, or MessageSquare',
        'Google': 'Search, Globe, or Zap',
        'Instagram': 'Camera or Heart',
        'Facebook': 'Share2 or Users',
        'YouTube': 'Play or Video',
        'GitHub': 'Code or GitBranch',
        'Discord': 'MessageCircle or Users',
        'Slack': 'MessageCircle or MessageSquare',
        'LinkedIn': 'Users or Briefcase',
        'Apple': 'Apple (actually exists in lucide-react v0.383+)',
      },
    },

    // ── UI COMPONENT REUSE RULES ──────────────────────────────────────────
    {
      rule: 'NEVER GENERATE UI COMPONENT FILES',
      description: 'DO NOT create button.jsx, card.jsx, dialog.jsx, input.jsx, form.jsx, select.jsx, textarea.jsx, checkbox.jsx, etc. These are pre-built. IMPORT from @/components/ui/ instead.',
      importExamples: {
        'Button component': 'import { Button } from "@/components/ui/button"',
        'Form component': 'import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"',
        'Dialog component': 'import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"',
        'Table component': 'import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"',
        'Select component': 'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"',
        'Input component': 'import { Input } from "@/components/ui/input"',
        'Textarea component': 'import { Textarea } from "@/components/ui/textarea"',
        'Checkbox component': 'import { Checkbox } from "@/components/ui/checkbox"',
        'RadioGroup component': 'import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"',
        'Switch component': 'import { Switch } from "@/components/ui/switch"',
        'Accordion component': 'import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"',
        'Tabs component': 'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"',
        'Card component': 'import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"',
        'Alert component': 'import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"',
        'Badge component': 'import { Badge } from "@/components/ui/badge"',
        'Avatar component': 'import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"',
      },
      examples: [
        '✅ CORRECT: import { Button } from "@/components/ui/button"\\nexport function MyAction() { return <Button onClick={...}>Action</Button> }',
        '❌ WRONG: export function Button() { return <button className="...">Click</button> } (DO NOT create button.jsx)',
        '✅ CORRECT: Use composition: export function PrimaryButton() { return <Button variant="primary" size="lg">Click</Button> }',
      ],
      availableComponents: [
        'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar',
        'badge', 'breadcrumb', 'button', 'calendar', 'card', 'checkbox',
        'collapsible', 'dialog', 'dropdown-menu', 'form', 'hover-card',
        'input', 'label', 'menubar', 'popover', 'progress', 'radio-group',
        'scroll-area', 'select', 'separator', 'sheet', 'sidebar', 'skeleton',
        'switch', 'table', 'tabs', 'textarea', 'tooltip'
      ],
    },
    {
      rule: 'COMPOSITION OVER GENERATION FOR UI VARIANTS',
      description: 'Instead of creating a new UI component, compose using the global library with custom className or variant prop.',
      examples: [
        '✅ export function GradientButton() { return <Button className="bg-linear-to-r from-violet-600 to-indigo-600">Click</Button> }',
        '❌ export function GradientButton() { return <button className="...">Click</button> } (creates buttton.jsx, CRASH)',
      ],
    },
    // ── FILE STRUCTURE RULES ──────────────────────────────────────────────
    {
      rule: 'PASCALCASE FOR COMPONENTS, kebab-case FOR UTILITIES',
      description: 'Component files MUST be PascalCase (Button.jsx, NavBar.jsx). Utility files MUST be kebab-case (utils.js, hooks.js).',
      examples: [
        '✅ components/NavBar.jsx (PascalCase)',
        '❌ components/navbar.jsx (should be NavBar)',
        '✅ lib/hook-utils.js (kebab-case)',
        '❌ lib/HookUtils.js (should be hook-utils)',
      ],
    },
    {
      rule: 'SINGLE EXPORT PER FILE',
      description: 'Each component file exports ONE component. Utilities can export multiple functions.',
      examples: [
        '✅ Button.jsx: export default function Button() {}',
        '❌ Button.jsx: export function Button() {} + export function Icon() {}',
      ],
    },
    {
      rule: 'ALL IMPORTS MUST EXIST',
      description: 'Before importing a file, verify it will be created in this task or already exists.',
      examples: [
        '✅ import { Button } from "@/components/Button" (file will be created)',
        '❌ import { getConfig } from "@/lib/config" (file does not exist, crash)',
      ],
    },

    // ── CONTEXT & PROVIDER RULES ──────────────────────────────────────────
    {
      rule: 'ALWAYS WRAP APP.JSX WITH PROVIDERS',
      description: 'If any context or hook is created (CartContext, ThemeContext, etc.), MUST inject provider into App.jsx wrapper.',
      examples: [
        '✅ App.jsx: <CartProvider><ThemeProvider><Routes/></ThemeProvider></CartProvider>',
        '❌ Create CartContext but forget provider → useCart() hook crashes everywhere',
      ],
    },
    {
      rule: 'NO DUPLICATE PROVIDERS',
      description: 'If App.jsx already has a provider (e.g., ThemeProvider), do not add another equivalent provider.',
      examples: [
        '✅ Reuse existing ThemeProvider if it exists',
        '❌ Create new ThemeProvider alongside existing one',
      ],
    },

    // ── NAMING & IDENTIFIER CONSISTENCY ───────────────────────────────────
    {
      rule: 'CONSISTENT NAMING ACROSS IMPORTS & USAGE',
      description: 'If a component is created as Navbar.jsx, ALL imports must use "Navbar", not "NavBar" or "navbar".',
      examples: [
        '✅ Create: Navbar.jsx, Import: "Navbar", Use: <Navbar />',
        '❌ Create: Navbar.jsx, Import: "NavBar" → "Cannot find module NavBar"',
      ],
    },
    {
      rule: 'AVOID FILENAME CASE COLLISIONS',
      description: 'On case-sensitive systems, Button.jsx and button.jsx are different files. Use ONE case convention.',
      examples: [
        '✅ All components: PascalCase (Button, NavBar, Footer)',
        '❌ Mix: Button.jsx and button.jsx in same folder',
      ],
    },

    // ── TYPESCRIPT/JSX RULES ──────────────────────────────────────────────
    {
      rule: 'NO DYNAMIC IMPORTS FROM LUCIDE WITHOUT SAFE ALTERNATIVES',
      description: 'Do not dynamically import icons by string name. Always hardcode icon imports.',
      examples: [
        '❌ const icon = dynamicImport(iconName) from lucide-react → crash if iconName is invalid',
        '✅ const icons = { Twitter: MessageCircle, ... }; const Icon = icons[name]',
      ],
    },

    // ── DATA & STATE RULES ────────────────────────────────────────────────
    {
      rule: 'INITIALIZE ALL STATE IN USEEFFECT',
      description: 'Do not initialize state directly if it depends on window/document.',
      examples: [
        '✅ useState(null); useEffect(() => setState(window.innerWidth))',
        '❌ useState(window.innerWidth) → SSR error',
      ],
    },

    // ── PATH & IMPORT RULES ───────────────────────────────────────────────
    {
      rule: 'USE "@" ALIAS FOR IMPORTS, NEVER "/" ABSOLUTE',
      description: 'All imports use "@/" (e.g., "@/components/Button"). Never "/app" or absolute paths.',
      examples: [
        '✅ import { Button } from "@/components/ui/Button"',
        '❌ import { Button } from "/app/components/Button"',
      ],
    },
    {
      rule: 'DO NOT USE ABSOLUTE PATHS IN ASSET REFERENCES',
      description: 'Images and assets use "/public/" path, not absolute file system paths.',
      examples: [
        '✅ <Image src="/images/hero.jpg" />',
        '❌ <Image src="C:\\Users\\...\\public\\images\\hero.jpg" />',
      ],
    },
  ];
}

// ───────────────────────────────────────────────────────────────────────────
// CODE GENERATION CONSTRAINTS
// Applied during Step 6 (Generate code)
// ───────────────────────────────────────────────────────────────────────────

export function getCodeGenerationConstraints() {
  return [
    // ── REACT COMPONENT RULES ─────────────────────────────────────────────
    {
      rule: 'EXPORT DEFAULT FOR EACH COMPONENT',
      description: 'Each component file must export a default component function. Custom components MUST be imported as default.',
      examples: [
        '✅ export default function Button() { return <button>...</button> }',
        '❌ export function Button() {} with no default',
      ],
    },
    {
      rule: 'IMPORT CUSTOM COMPONENTS AS DEFAULT',
      description: 'Since custom components (in components/ or pages/) are exported as default, you MUST import them as default. Do NOT use named imports for custom components. (Note: Shadcn components in components/ui/ still use named imports).',
      examples: [
        '✅ import Navbar from "../components/Navbar"',
        '❌ import { Navbar } from "../components/Navbar" → CRASHES Vite with "No matching export"',
        '✅ import { Button } from "@/components/ui/button" (Shadcn uses named)',
      ],
    },
    {
      rule: 'JSDOC FOR COMPLEX PROPS ONLY',
      description: 'Use JSDoc for complex component props if needed, but do not add prop-types or new validation packages.',
      examples: [
        '✅ /** @param {{ label: string, onClick: () => void }} props */',
        '❌ import PropTypes from "prop-types"; Button.propTypes = { ... }',
      ],
    },
    {
      rule: 'USE CONDITIONAL RENDERING FOR OPTIONAL SECTIONS',
      description: 'Do NOT render undefined/null directly. Use && or ternary operator.',
      examples: [
        '✅ {data && <Section data={data} />}',
        '❌ <Section data={undefined} /> → crash',
      ],
    },

    // ── STYLING RULES ────────────────────────────────────────────────────
    {
      rule: 'TAILWIND ONLY, NO CSS FILES',
      description: 'All styling via Tailwind utility classes. Never create or modify .css/.scss files.',
      examples: [
        '✅ <div className="flex items-center gap-4 bg-slate-900">',
        '❌ Create custom.css or import CSS files',
      ],
    },
    {
      rule: 'USE CN() UTILITY FOR CONDITIONAL CLASSES',
      description: 'Import cn from "@/lib/utils" for safe class name merging.',
      examples: [
        '✅ className={cn("base-class", isActive && "active-state")}',
        '❌ className={"base-class" + (isActive ? "active-state" : "")}',
      ],
    },
    {
      rule: 'RESPONSIVE CLASSES REQUIRED',
      description: 'All layouts must include sm:, md:, lg: breakpoints. Never hardcode desktop-only layouts.',
      examples: [
        '✅ className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"',
        '❌ className="flex gap-8" (breaks on mobile)',
      ],
    },

    // ── SANITY CHECKS ─────────────────────────────────────────────────────
    {
      rule: 'VERIFY FILE COMPLETENESS',
      description: 'Every generated file must be syntactically complete. No incomplete tags, missing closing braces, etc.',
      examples: [
        '✅ Files end with closing } or ); → syntactically valid',
        '❌ export default function Button() { return <div> ... (missing closing tag)',
      ],
    },
    {
      rule: 'VALIDATE IMPORT REFERENCES',
      description: 'Every import statement must reference a file path that will exist in the project.',
      examples: [
        '✅ import { Button } from "@/components/ui/Button" (Button.jsx will be created)',
        '❌ import { missing } from "@/lib/none" (none.js does not exist)',
      ],
    },

    // ── VITE / REACT ROUTER RULES ────────────────────────────────────────
    {
      rule: 'USE STANDARD IMG TAGS OR BACKGROUND IMAGES FOR STATIC ASSETS',
      description: 'This builder generates Vite apps, so do not use next/image. Use <img> or CSS background-image with proper alt text and dimensions.',
      examples: [
        '✅ <img src="/photo.jpg" width="800" height="600" alt="..." />',
        '✅ <div style={{ backgroundImage: "url(/photo.jpg)" }} />',
      ],
    },
    {
      rule: 'USE REACT ROUTER FOR INTERNAL NAVIGATION',
      description: 'Never use next/link. Use react-router-dom Link, NavLink, and Route primitives instead.',
      examples: [
        '✅ import { Link } from "react-router-dom"; <Link to="/about">About</Link>',
        '❌ import Link from "next/link"; <Link href="/about">About</Link>',
      ],
    },

    // ── PERFORMANCE RULES ─────────────────────────────────────────────────
    {
      rule: 'LAZY LOAD HEAVY COMPONENTS',
      description: 'Use dynamic imports for large components to reduce initial bundle size.',
      examples: [
        '✅ const Chart = dynamic(() => import("@/components/Chart"), { ssr: false })',
      ],
    },
    {
      rule: 'MEMOIZE EXPENSIVE COMPUTATIONS',
      description: 'Use useMemo for expensive calculations and useCallback for event handlers.',
      examples: [
        '✅ const items = useMemo(() => data.filter(...), [data])',
      ],
    },
  ];
}

// ───────────────────────────────────────────────────────────────────────────
// REVISION CONSTRAINTS
// Applied when fixing errors
// ───────────────────────────────────────────────────────────────────────────

export function getRevisionConstraints(errorContext = {}) {
  const { errorType, errorMessage, failedFile } = errorContext;
  
  const baseConstraints = [
    {
      rule: 'FIX ONLY THE ERROR, PRESERVE FUNCTIONALITY',
      description: 'Make minimal changes. Do not refactor working code.',
      examples: [
        '✅ Remove invalid icon import, replace with safe alternative',
        '❌ Rewrite entire component while fixing one icon',
      ],
    },
    {
      rule: 'MAINTAIN EXISTING FILE STRUCTURE',
      description: 'Do not move files or reorganize folder structure during revision.',
      examples: [
        '✅ Fix Button.jsx in place',
        '❌ Move Button.jsx to components/ui/Button.jsx',
      ],
    },
  ];

  // Add error-specific constraints
  if (errorType === 'MISSING_PROVIDER') {
    baseConstraints.push({
      rule: 'PROVIDER INJECTION SPECIFIC',
      description: 'Find the missing provider, create it if needed, and inject into App.jsx.'
    });
  }

  if (errorType === 'INVALID_EXPORT' || errorType === 'REFERENCE_ERROR') {
    baseConstraints.push({
      rule: 'EXACT REPLACEMENT REQUIRED',
      description: 'Replace invalid export/reference with exact safe alternative from lucide-react.'
    });
  }

  if (errorType === 'IMPORT_ERROR') {
    baseConstraints.push({
      rule: 'FILENAME CASE MUST MATCH',
      description: 'Check PascalCase consistency: if file is Button.jsx, import as Button, not button.'
    });
  }

  if (errorType === 'SYNTAX_ERROR') {
    baseConstraints.push({
      rule: 'VALIDATE FINAL SYNTAX',
      description: 'Ensure all tags are closed, all braces match, all quotes are paired.'
    });
  }

  return baseConstraints;
}

// ───────────────────────────────────────────────────────────────────────────
// BUILD PROMPT STRINGS FROM CONSTRAINTS
// ───────────────────────────────────────────────────────────────────────────

export function buildConstraintPrompt(constraints, context = '') {
  let prompt = '';
  
  if (context) {
    prompt += `${context}\n\n`;
  }
  
  prompt += '# CODE GENERATION CONSTRAINTS\n\n';
  prompt += 'Follow these rules strictly to prevent errors:\n\n';
  
  constraints.forEach((c, idx) => {
    prompt += `## ${idx + 1}. ${c.rule}\n`;
    if (c.description) {
      prompt += `**${c.description}**\n\n`;
    }
    if (c.examples) {
      prompt += 'Examples:\n';
      c.examples.forEach(ex => {
        prompt += `${ex}\n`;
      });
      prompt += '\n';
    }
    if (c.mapping) {
      prompt += 'Mapping:\n';
      Object.entries(c.mapping).forEach(([k, v]) => {
        prompt += `- ${k}: ${v}\n`;
      });
      prompt += '\n';
    }
  });
  
  return prompt;
}

// ───────────────────────────────────────────────────────────────────────────
// EXPORT ALL CONSTRAINT SETS
// ───────────────────────────────────────────────────────────────────────────

export const CONSTRAINT_SETS = {
  preGeneration: getPreGenerationConstraints(),
  codeGeneration: getCodeGenerationConstraints(),
  revision: getRevisionConstraints(),
};
