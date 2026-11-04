/**
 * Vite Template for e2b Sandbox
 * 
 * Provides the base Vite environment that will run in e2b.
 * This is a minimal Next.js-compatible Vite setup.
 */

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
    console.warn('[Website Builder E2B Template] Failed loading global UI bundle:', error.message);
  }

  return files;
}

export function getViteE2bTemplate(projectName = 'my-website') {
    const safeName = (projectName || 'my-website').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const uiTemplateFiles = loadGlobalUiTemplateFiles();

    return {
    ...uiTemplateFiles,

        // ── Infrastructure ──────────────────────────────────────────────────
        'package.json': JSON.stringify({
            name: safeName,
            version: '1.0.0',
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
            },
            dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
            'react-router-dom': '^6.22.0',
                'framer-motion': '^10.16.4',
            'lucide-react': '^0.263.1',
            'clsx': '^2.1.0',
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
            'react-hook-form': '^7.54.1'
            },
            devDependencies: {
                '@vitejs/plugin-react': '^4.0.0',
                tailwindcss: '^3.3.0',
                'postcss': '^8.4.24',
                'postcss-nesting': '^12.0.1',
                vite: '^4.3.9'
            }
        }, null, 2),

        'vite.config.js': `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
`,

        'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"><\/script>
  </body>
</html>
`,

        'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,

        'src/lib/utils.js': `import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
`,

        'src/hooks/use-mobile.js': `import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(undefined);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      \`(max-width: ${MOBILE_BREAKPOINT - 1}px)\`
    );
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mediaQuery.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
`,

        'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow-x: hidden;
  background: #0f0f0f;
  color: #ffffff;
}

@layer components {
  .glass {
    @apply bg-white/10 backdrop-blur-md border border-white/20 rounded-lg;
  }

  .gradient-text {
    @apply bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent;
  }

  .glow {
    @apply shadow-lg shadow-cyan-500/50;
  }

  .btn-primary {
    @apply px-6 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors;
  }

  .btn-secondary {
    @apply px-6 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors;
  }
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 200, 255, 0.7);
}
`,

        'tailwind.config.js': `export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f0f0f',
        'dark-secondary': '#1a1a1a'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
};
`,

        'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    'postcss-nesting': {}
  }
};
`,

        'src/App.jsx': `export default function App() {
  return (
    <div className="min-h-screen bg-linear-to-b from-dark-bg to-dark-secondary">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-6xl font-bold gradient-text mb-4 font-heading">
          Welcome
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Your website is ready. Add components to customize it.
        </p>
      </div>
    </div>
  );
}
`,

        'src/pages/.gitkeep': '',
        'src/components/.gitkeep': ''
    };
}
