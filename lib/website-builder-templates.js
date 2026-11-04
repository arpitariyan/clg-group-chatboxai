import fs from 'node:fs';
import path from 'node:path';

const UI_SOURCE_DIR = path.join(process.cwd(), 'components', 'ui');
const UI_TARGET_PREFIX = 'src/components/ui/';
const MOBILE_HOOK_SOURCE = path.join(process.cwd(), 'hooks', 'use-mobile.js');

function normalizeUiComponentSource(code) {
    if (typeof code !== 'string') return code;

    return code
        .replace(/^\s*['\"]use client['\"];?\s*/gm, '')
        .replace(/from\s+["']@\/lib\/utils["']/g, "from '../../lib/utils'")
        .replace(/from\s+["']@\/components\/ui\//g, "from './")
        .replace(/from\s+["']@\/hooks\/use-mobile["']/g, "from '../../hooks/use-mobile'");
}

function loadGlobalUiTemplateFiles() {
    const files = {};

    try {
        if (fs.existsSync(UI_SOURCE_DIR)) {
            const uiFiles = fs.readdirSync(UI_SOURCE_DIR).filter((name) => name.endsWith('.jsx'));

            for (const fileName of uiFiles) {
                const sourcePath = path.join(UI_SOURCE_DIR, fileName);
                const targetPath = `${UI_TARGET_PREFIX}${fileName}`;
                const sourceCode = fs.readFileSync(sourcePath, 'utf8');
                files[targetPath] = normalizeUiComponentSource(sourceCode);
            }
        }

        if (fs.existsSync(MOBILE_HOOK_SOURCE)) {
            files['src/hooks/use-mobile.js'] = fs.readFileSync(MOBILE_HOOK_SOURCE, 'utf8');
        }
    } catch (error) {
        console.warn('[Website Builder Template] Failed loading global UI bundle:', error.message);
    }

    return files;
}

/**
 * Vite Template — Protected infrastructure files
 *
 * These files are NEVER overridden by AI output.
 * Key improvements:
 * - Google Fonts loaded via <link> in index.html (NOT @import in CSS)
 * - tailwind.config.js extends with gray-950 color and font families
 * - index.css has glass/gradient-text utility classes ready to use
 * - font-family set globally on body so AI doesn't need to import fonts
 */
export function getViteTemplate(projectName = 'my-app') {
    const name = (projectName || 'my-app').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const uiTemplateFiles = loadGlobalUiTemplateFiles();

    return {
        ...uiTemplateFiles,

        // ── package.json ──────────────────────────────────────────────────────
        'package.json': JSON.stringify({
            name:    name || 'my-app',
            private: true,
            version: '0.0.0',
            type:    'module',
            scripts: {
                dev:     'vite',
                build:   'vite build',
                preview: 'vite preview',
            },
            dependencies: {
                'react':            '^18.2.0',
                'react-dom':        '^18.2.0',
                'react-router-dom': '^6.22.0',
                'framer-motion':    '^11.0.0',
                'lucide-react':     '^0.383.0',
                'clsx':             '^2.1.0',
                'class-variance-authority': '^0.7.1',
                'tailwind-merge': '^3.3.1',
                '@radix-ui/react-accordion': '^1.2.2',
                '@radix-ui/react-alert-dialog': '^1.1.4',
                '@radix-ui/react-aspect-ratio': '^1.1.1',
                '@radix-ui/react-avatar': '^1.1.2',
                '@radix-ui/react-checkbox': '^1.1.3',
                '@radix-ui/react-collapsible': '^1.1.2',
                '@radix-ui/react-dialog': '^1.1.4',
                '@radix-ui/react-dropdown-menu': '^2.1.4',
                '@radix-ui/react-hover-card': '^1.1.4',
                '@radix-ui/react-label': '^2.1.1',
                '@radix-ui/react-menubar': '^1.1.4',
                '@radix-ui/react-popover': '^1.1.4',
                '@radix-ui/react-progress': '^1.1.1',
                '@radix-ui/react-radio-group': '^1.2.2',
                '@radix-ui/react-scroll-area': '^1.2.2',
                '@radix-ui/react-select': '^2.1.4',
                '@radix-ui/react-separator': '^1.1.1',
                '@radix-ui/react-slot': '^1.1.1',
                '@radix-ui/react-switch': '^1.1.2',
                '@radix-ui/react-tabs': '^1.1.2',
                '@radix-ui/react-tooltip': '^1.1.6',
                'react-day-picker': '^8.10.1',
                'date-fns': '^4.1.0',
                'react-hook-form': '^7.54.1',
            },
            devDependencies: {
                '@vitejs/plugin-react': '^4.2.0',
                'autoprefixer':         '^10.4.0',
                'postcss':              '^8.4.0',
                'tailwindcss':          '^3.4.0',
                'vite':                 '^5.0.0',
            },
        }, null, 2),

        // ── vite.config.js ────────────────────────────────────────────────────
        'vite.config.js': [
            `import { defineConfig } from 'vite'`,
            `import react from '@vitejs/plugin-react'`,
            `import { fileURLToPath, URL } from 'node:url'`,
            `export default defineConfig({`,
            `  plugins: [react()],`,
            `  resolve: {`,
            `    alias: {`,
            `      '@': fileURLToPath(new URL('./src', import.meta.url)),`,
            `    },`,
            `  },`,
            `  server: { port: 5173, host: true },`,
            `})`,
        ].join('\n'),

        // ── index.html — Google Fonts loaded HERE (not in CSS) ────────────────
        'index.html': [
            `<!DOCTYPE html>`,
            `<html lang="en">`,
            `<head>`,
            `  <meta charset="UTF-8" />`,
            `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
            `  <title>${projectName || 'My App'}</title>`,
            `  <!-- Google Fonts — loaded once here, used by all components via CSS -->`,
            `  <link rel="preconnect" href="https://fonts.googleapis.com" />`,
            `  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
            `  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />`,
            `</head>`,
            `<body>`,
            `  <div id="root"></div>`,
            `  <script type="module" src="/src/main.jsx"></script>`,
            `</body>`,
            `</html>`,
        ].join('\n'),

        // ── tailwind.config.js — extends with gray-950 and font families ──────
        'tailwind.config.js': [
            `/** @type {import('tailwindcss').Config} */`,
            `export default {`,
            `  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],`,
            `  theme: {`,
            `    extend: {`,
            `      fontFamily: {`,
            `        sans:    ['Inter', 'system-ui', 'sans-serif'],`,
            `        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],`,
            `      },`,
            `      colors: {`,
            `        gray: {`,
            `          950: '#0a0a0f',`,
            `        },`,
            `      },`,
            `      backdropBlur: {`,
            `        xs: '2px',`,
            `      },`,
            `    },`,
            `  },`,
            `  plugins: [],`,
            `}`,
        ].join('\n'),

        // ── postcss.config.js ─────────────────────────────────────────────────
        'postcss.config.js': [
            `export default {`,
            `  plugins: {`,
            `    tailwindcss: {},`,
            `    autoprefixer: {},`,
            `  },`,
            `}`,
        ].join('\n'),

        // ── src/main.jsx ──────────────────────────────────────────────────────
        'src/main.jsx': [
            `import React from 'react'`,
            `import ReactDOM from 'react-dom/client'`,
            `import App from './App.jsx'`,
            `import './index.css'`,
            ``,
            `ReactDOM.createRoot(document.getElementById('root')).render(`,
            `  <React.StrictMode>`,
            `    <App />`,
            `  </React.StrictMode>`,
            `)`,
        ].join('\n'),

        // ── src/lib/utils.js — shared class merging helper ──────────────────
        'src/lib/utils.js': [
            `import { clsx } from 'clsx'`,
            `import { twMerge } from 'tailwind-merge'`,
            ``,
            `export function cn(...inputs) {`,
            `  return twMerge(clsx(inputs));`,
            `}`,
        ].join('\n'),

        // ── src/index.css — base styles + utility classes ─────────────────────
        // NOTE: NO @import url() here — fonts are in index.html
        // This prevents PostCSS/WebContainer build failures
        'src/index.css': [
            `@tailwind base;`,
            `@tailwind components;`,
            `@tailwind utilities;`,
            ``,
            `/* ── Reset ──────────────────────────────────────────────────── */`,
            `*, *::before, *::after {`,
            `  box-sizing: border-box;`,
            `  margin: 0;`,
            `  padding: 0;`,
            `}`,
            ``,
            `html {`,
            `  scroll-behavior: smooth;`,
            `}`,
            ``,
            `/* ── Base ───────────────────────────────────────────────────── */`,
            `body {`,
            `  /* Fonts loaded via <link> in index.html — just reference here */`,
            `  font-family: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;`,
            `  background-color: #0a0a0f;`,
            `  color: #f3f4f6;`,
            `  -webkit-font-smoothing: antialiased;`,
            `  -moz-osx-font-smoothing: grayscale;`,
            `  line-height: 1.6;`,
            `}`,
            ``,
            `h1, h2, h3, h4, h5, h6 {`,
            `  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;`,
            `  line-height: 1.2;`,
            `  letter-spacing: -0.02em;`,
            `}`,
            ``,
            `/* ── Utility classes (AI can use these directly) ─────────────── */`,
            `.glass {`,
            `  background: rgba(255, 255, 255, 0.05);`,
            `  backdrop-filter: blur(20px);`,
            `  -webkit-backdrop-filter: blur(20px);`,
            `  border: 1px solid rgba(255, 255, 255, 0.1);`,
            `}`,
            ``,
            `.gradient-text {`,
            `  background: linear-gradient(135deg, #a78bfa, #38bdf8);`,
            `  -webkit-background-clip: text;`,
            `  -webkit-text-fill-color: transparent;`,
            `  background-clip: text;`,
            `}`,
            ``,
            `.gradient-border {`,
            `  border: 1px solid transparent;`,
            `  background-clip: padding-box;`,
            `  background-image: linear-gradient(#0a0a0f, #0a0a0f), linear-gradient(135deg, #a78bfa, #38bdf8);`,
            `  background-origin: border-box;`,
            `}`,
            ``,
            `/* ── Scrollbar ───────────────────────────────────────────────── */`,
            `::-webkit-scrollbar { width: 6px; }`,
            `::-webkit-scrollbar-track { background: #0a0a0f; }`,
            `::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }`,
            `::-webkit-scrollbar-thumb:hover { background: #4b5563; }`,
            ``,
            `/* ── Selection ──────────────────────────────────────────────── */`,
            `::selection { background: rgba(139, 92, 246, 0.3); color: white; }`,
        ].join('\n'),

        ...uiTemplateFiles,
    };
}
