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
  title: 'ChatBox Ai',
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
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6210524582644706"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
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
