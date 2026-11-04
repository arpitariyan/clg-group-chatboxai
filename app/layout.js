import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
// import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// import AppSidebar from "./_components/AppSidebar";
// import { AuthProvider } from "@/contexts/AuthContext";
// import Image from "next/image";
import LayoutContent from "./_components/LayoutContent";
import Provider from "./Provider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import JsonLd from "./_components/JsonLd";
import CookieConsent from "./_components/CookieConsent";

// Metadata for the application
export const metadata = {
  metadataBase: new URL('https://chatboxai.co.in'),
  title: {
    template: '%s | ChatBox AI',
    default: 'ChatBox AI - Advanced Multi-Model AI Assistant',
  },
  description: 'ChatBox AI gives you access to 56+ frontier AI models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and Llama 3.3. Search the web with AI, generate images, write code, build Next.js websites, and analyze files — all in one platform. Built by Arpit Ariyan Maharana.',
  keywords: [
    'ChatBox AI', 'AI chat', 'artificial intelligence', 'GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro',
    'DeepSeek R1', 'Llama 3.3', 'image generation', 'AI assistant', 'code assistant', 'multi-model AI',
    'ChatBox', 'AI search engine', 'deep research AI', 'website builder AI', 'React website builder',
    'AI platform India', 'free AI chat', 'AI tool India', 'Arpit Ariyan Maharana', 'Technon', 'AI writing assistant'
  ],
  authors: [{ name: 'Arpit Ariyan Maharana', url: 'https://technon.co.in' }],
  creator: 'Arpit Ariyan Maharana',
  publisher: 'Arpit Ariyan Maharana',
  applicationName: 'ChatBox AI',
  alternates: {
    canonical: 'https://chatboxai.co.in/',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any', type: 'image/png' },
      { url: '/app-icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/app-icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/app-icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://chatboxai.co.in/',
    title: 'ChatBox AI - Advanced Multi-Model AI Assistant',
    description: 'ChatBox AI gives you access to 56+ frontier AI models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and Llama 3.3. Search the web with AI, generate images, write code, and build websites — all in one platform.',
    siteName: 'ChatBox AI',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ChatBox AI - Advanced Multi-Model AI Assistant Platform',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatBox AI - Advanced Multi-Model AI Assistant',
    description: 'ChatBox AI gives you access to 56+ frontier AI models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and Llama 3.3. Search the web with AI, generate images, write code, and build websites.',
    creator: '@chatboxai',
    site: '@chatboxai',
    images: [
      {
        url: '/og-image.jpg',
        alt: 'ChatBox AI Platform Preview',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }) {
  // JSON-LD Schemas for the root
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://chatboxai.co.in/#organization",
    "name": "ChatBox AI",
    "alternateName": ["Chatbox AI", "ChatboxAI", "ChatBox"],
    "url": "https://chatboxai.co.in/",
    "logo": {
      "@type": "ImageObject",
      "@id": "https://chatboxai.co.in/#logo",
      "url": "https://chatboxai.co.in/Chatboxai_logo_main.png",
      "contentUrl": "https://chatboxai.co.in/Chatboxai_logo_main.png",
      "width": 512,
      "height": 512,
      "caption": "ChatBox AI Logo",
      "inLanguage": "en-IN"
    },
    "image": {
      "@id": "https://chatboxai.co.in/#logo"
    },
    "description": "ChatBox AI is an advanced multi-model AI assistant workspace providing access to 56+ frontier AI models including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and Llama 3.3. AI search, image generation, code assistance, website builder, and voice AI — all in one platform.",
    "foundingDate": "2024",
    "founder": {
      "@type": "Person",
      "name": "Arpit Ariyan Maharana",
      "jobTitle": "Founder & Independent AI Developer",
      "url": "https://technon.co.in",
      "sameAs": [
        "https://www.linkedin.com/in/arpit-ariyan-maharana-21a62524a/",
        "https://github.com/arpitariyan",
        "https://www.instagram.com/chatboxai_uiux/"
      ]
    },
    "sameAs": [
      "https://www.instagram.com/chatboxai_uiux/",
      "https://www.linkedin.com/in/arpit-ariyan-maharana-21a62524a/",
      "https://github.com/arpitariyan"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "arpitariyanm@gmail.com",
      "contactType": "customer support",
      "availableLanguage": ["English", "Hindi"]
    },
    "areaServed": "IN",
    "knowsAbout": [
      "Artificial Intelligence",
      "Machine Learning",
      "Large Language Models",
      "AI Image Generation",
      "AI Code Generation",
      "Natural Language Processing",
      "Deep Research",
      "AI Website Builder"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://chatboxai.co.in/#website",
    "name": "ChatBox AI",
    "alternateName": ["Chatbox AI", "ChatboxAI", "ChatBox"],
    "url": "https://chatboxai.co.in/",
    "description": "Advanced Multi-Model AI Assistant - Access GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and 56+ models in one platform.",
    "inLanguage": "en-IN",
    "publisher": {
      "@id": "https://chatboxai.co.in/#organization"
    }
  };

  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0c0a09" />
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        {/* <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6210524582644706"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        /> */}
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <Script id="dynamic-title-manager" strategy="afterInteractive">
          {`
            (function () {
              var APP_NAME = 'ChatBox AI';
              var TITLE_SUFFIX = ' | ' + APP_NAME;
              var SEARCH_PREFIX = '/search/';
              var IMAGE_PREFIX = '/image-gen/';
              // Pages where the title manager should NOT override the server-rendered title.
              // The homepage '/' gets its SEO-optimized title from Next.js metadata.
              var SKIP_PATHS = {
                '/': true,
                '/privacy-policy': true,
                '/terms-conditions': true,
                '/help-center': true,
                '/docs': true,
                '/pricing': true,
                '/ai-models': true,
                '/deep-research': true,
                '/security': true,
                '/developers': true,
                '/researchers': true,
                '/creators': true
              };
              // App pages where we set a simple app name title
              var APP_PATHS = {
                '/app': true,
                '/library': true,
                '/snapshot': true
              };
              var requestToken = 0;

              function normalizePath(pathname) {
                if (!pathname) return '/';
                if (pathname.length > 1 && pathname.endsWith('/')) {
                  return pathname.slice(0, -1);
                }
                return pathname;
              }

              function firstThreeWords(text) {
                if (!text || typeof text !== 'string') return '';
                return text.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean).slice(0, 3).join(' ');
              }

              function parseConversation(pathname) {
                if (pathname.startsWith(SEARCH_PREFIX)) {
                  var searchId = pathname.slice(SEARCH_PREFIX.length).split('/')[0];
                  return { type: 'search', libId: searchId || '' };
                }
                if (pathname.startsWith(IMAGE_PREFIX)) {
                  var imageId = pathname.slice(IMAGE_PREFIX.length).split('/')[0];
                  return { type: 'image', libId: imageId || '' };
                }
                return null;
              }

              function getQuestionFromPayload(data) {
                var record = data && data.record ? data.record : data;
                var chats = record && Array.isArray(record.Chats) ? record.Chats : [];
                var firstChat = chats[0] || {};

                var candidates = [
                  record && record.searchInput,
                  record && record.userSearchInput,
                  record && record.prompt,
                  firstChat && firstChat.searchInput,
                  firstChat && firstChat.userSearchInput,
                  firstChat && firstChat.prompt,
                  firstChat && firstChat.question,
                  firstChat && firstChat.userQuestion
                ];

                for (var i = 0; i < candidates.length; i++) {
                  if (typeof candidates[i] === 'string' && candidates[i].trim()) {
                    return candidates[i].trim();
                  }
                }
                return '';
              }

              function setFallbackTitle(routeType) {
                if (routeType === 'search') {
                  document.title = 'Search' + TITLE_SUFFIX;
                  return;
                }
                if (routeType === 'image') {
                  document.title = 'Image Generate' + TITLE_SUFFIX;
                  return;
                }
                document.title = APP_NAME;
              }

              async function updateTitle() {
                var pathname = normalizePath(window.location.pathname);
                var token = ++requestToken;

                // Don't override server-rendered SEO titles on public pages
                if (SKIP_PATHS[pathname]) {
                  return;
                }

                // Set simple app name for app-internal pages
                if (APP_PATHS[pathname]) {
                  document.title = APP_NAME;
                  return;
                }

                var conversation = parseConversation(pathname);
                if (!conversation || !conversation.libId) {
                  document.title = APP_NAME;
                  return;
                }

                setFallbackTitle(conversation.type);

                try {
                  var url = conversation.type === 'image'
                    ? '/api/generate-image?libId=' + encodeURIComponent(conversation.libId)
                    : '/api/search/history?libId=' + encodeURIComponent(conversation.libId);
                  var headers = {};
                  
                  // Try to get Firebase token from localStorage
                  try {
                    var authKey = Object.keys(localStorage).find(function(key) {
                      return key.includes('firebase:authUser:');
                    });
                    if (authKey) {
                      var authData = JSON.parse(localStorage.getItem(authKey));
                      if (authData && authData.stsTokenManager && authData.stsTokenManager.accessToken) {
                        headers['Authorization'] = 'Bearer ' + authData.stsTokenManager.accessToken;
                      }
                    }
                  } catch (e) {
                    // Silently fail if token extraction fails
                  }
                  
                  var res = await fetch(url, { method: 'GET', credentials: 'same-origin', headers: headers });
                  if (!res.ok) return;

                  var data = await res.json();
                  if (token !== requestToken) return;
                  if (normalizePath(window.location.pathname) !== pathname) return;

                  var question = getQuestionFromPayload(data);
                  var shortTitle = firstThreeWords(question);
                  if (shortTitle) {
                    document.title = shortTitle + TITLE_SUFFIX;
                  }
                } catch (_) {
                  // Keep fallback title for this route when request fails.
                }
              }

              // Avoid overriding history APIs because this can conflict with
              // Next.js router/HMR lifecycle during development.
              var lastPathname = normalizePath(window.location.pathname);
              var intervalId = null;

              function maybeUpdateTitleForRouteChange() {
                var nextPathname = normalizePath(window.location.pathname);
                if (nextPathname !== lastPathname) {
                  lastPathname = nextPathname;
                  updateTitle();
                }
              }

              window.addEventListener('popstate', updateTitle);
              window.addEventListener('pageshow', updateTitle);

              // Poll route changes instead of monkey-patching history.
              intervalId = window.setInterval(maybeUpdateTitleForRouteChange, 300);

              if (window.__chatboxTitleManagerCleanup) {
                try {
                  window.__chatboxTitleManagerCleanup();
                } catch (_) {}
              }

              window.__chatboxTitleManagerCleanup = function () {
                if (intervalId) {
                  window.clearInterval(intervalId);
                  intervalId = null;
                }
                window.removeEventListener('popstate', updateTitle);
                window.removeEventListener('pageshow', updateTitle);
              };

              updateTitle();
            })();
          `}
        </Script>
        <ThemeProvider>
          <LayoutContent>
            <Provider>
              {children}
            </Provider>
          </LayoutContent>
        </ThemeProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
