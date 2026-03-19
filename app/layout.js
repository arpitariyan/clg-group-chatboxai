import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
// import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// import AppSidebar from "./_components/AppSidebar";
// import { AuthProvider } from "@/contexts/AuthContext";
// import Image from "next/image";
import LayoutContent from "./_components/LayoutContent";
import Provider from "./Provider";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Metadata for the application
export const metadata = {
  title: 'Chatbox AI',
  description: 'ChatBox Ai - Your intelligent chat companion',
  icons: {
    icon: '/favicon.ico',
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6210524582644706"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        /> */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Script id="dynamic-title-manager" strategy="afterInteractive">
          {`
            (function () {
              var APP_NAME = 'Chatbox AI';
              var TITLE_SUFFIX = ' | ' + APP_NAME;
              var SEARCH_PREFIX = '/search/';
              var IMAGE_PREFIX = '/image-gen/';
              var STATIC_PATHS = {
                '/': true,
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

                if (STATIC_PATHS[pathname]) {
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
                  var url = '/api/search/history?libId=' + encodeURIComponent(conversation.libId);
                  var res = await fetch(url, { method: 'GET', credentials: 'same-origin' });
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

              function dispatchRouteChange() {
                window.dispatchEvent(new Event('chatbox-route-change'));
              }

              var originalPushState = history.pushState;
              var originalReplaceState = history.replaceState;

              history.pushState = function () {
                var ret = originalPushState.apply(this, arguments);
                dispatchRouteChange();
                return ret;
              };

              history.replaceState = function () {
                var ret = originalReplaceState.apply(this, arguments);
                dispatchRouteChange();
                return ret;
              };

              window.addEventListener('popstate', updateTitle);
              window.addEventListener('chatbox-route-change', updateTitle);
              window.addEventListener('pageshow', updateTitle);

              updateTitle();
            })();
          `}
        </Script>
        <ThemeProvider>
          <LayoutContent>
            <Provider >
              {children}
            </Provider>
          </LayoutContent>
        </ThemeProvider>
      </body>
    </html>
  );
}
