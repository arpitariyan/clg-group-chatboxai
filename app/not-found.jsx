'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Smartphone, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @font-face {
          font-family: "Geist Mono:SemiBold";
          font-style: normal;
          font-weight: 600;
          font-display: swap;
          src: url("https://static.figma.com/font/GeistMono_wght__1") format("woff2");
        }
        
        .font-geist-mono-custom {
          font-family: "Geist Mono:SemiBold", var(--font-mono), monospace;
        }

        .text-gradient-404 {
          background: linear-gradient(
            225deg,
            #ffffff 0%,
            rgba(255, 255, 255, 0.85) 45%,
            rgba(255, 255, 255, 0.3) 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
          
        .heading-404 {
          font-size: clamp(96px, 24vw, 240px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          text-shadow: 0 4px 30px rgba(0, 0, 0, 0.8);
        }
        
        .message-404 {
          font-size: clamp(14px, 4vw, 20px);
          line-height: 1.45;
          letter-spacing: -0.02em;
        }

        @media (min-width: 768px) {
          .heading-404 {
            font-size: clamp(180px, 22vw, 290px);
            letter-spacing: -0.08em;
          }
          .message-404 {
            font-size: 22px;
            letter-spacing: -0.03em;
          }
        }
      `,
        }}
      />

      {/* 
        Full-viewport overlay with z-[99999] so it cleanly overlays any layout
        elements while being completely responsive across mobile (iPhone/Android)
        and desktop viewports.
      */}
      <main
        style={{ zIndex: 99999 }}
        className="fixed inset-0 w-screen min-h-[100dvh] h-full bg-[#0a0a0c] overflow-y-auto overflow-x-hidden flex flex-col justify-between"
      >
        {/* ── Background Video Container ── */}
        <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className="w-full h-full min-h-[100dvh] object-cover object-center opacity-90 transition-opacity duration-700"
          >
            <source src="/404%20Video.mp4" type="video/mp4" />
            <source src="/404 Video.mp4" type="video/mp4" />
          </video>

          {/* Dark ambient contrast scrim for readability on mobile */}
          <div className="absolute inset-0 bg-black/45 sm:bg-black/35 pointer-events-none" />

          {/* Radial vignette for cinematic depth */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />
        </div>

        {/* ── Top Header / Logo ── */}
        <header className="relative z-20 w-full pt-6 sm:pt-10 px-6 flex items-center justify-between max-w-6xl mx-auto shrink-0">
          <Link
            href="/"
            aria-label="ChatBox AI Home"
            className="inline-flex items-center gap-2 group transition-opacity hover:opacity-90"
          >
            <div className="relative w-32 h-8 sm:w-40 sm:h-10">
              <Image
                src="/Chatboxai_logo_main_2.png"
                alt="ChatBox AI"
                fill
                className="object-contain brightness-200"
                priority
              />
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono transition-all backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </header>

        {/* ── Center Content: 404 + Message + Actions ── */}
        <section className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-5 py-8 my-auto w-full max-w-xl mx-auto">
          {/* Status Chip */}
          <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-md text-[11px] font-mono text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            HTTP 404 · PAGE NOT FOUND
          </div>

          {/* 404 Typography */}
          <h1 className="font-geist-mono-custom font-semibold text-gradient-404 heading-404 m-0 p-0 select-none">
            404
          </h1>

          {/* Clean Thin Divider */}
          <div className="w-24 sm:w-48 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent my-4 sm:my-6 shrink-0" />

          {/* Descriptive Message */}
          <p className="font-geist-mono-custom font-semibold text-white/90 message-404 max-w-md mx-auto mb-6 sm:mb-8 text-balance">
            The path may be broken, but the journey isn't. Let's get you back to the workspace.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-geist-mono-custom rounded-xl px-6 py-3.5 text-sm font-semibold text-black bg-white hover:bg-neutral-200 transition-all duration-200 shadow-xl cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return Home
            </Link>

            <Link
              href="/mobile-app"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-geist-mono-custom rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-3.5 text-sm font-medium text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Get Android App
            </Link>
          </div>
        </section>

        {/* ── Bottom Micro-Footer ── */}
        <footer className="relative z-20 w-full pb-6 px-6 text-center shrink-0">
          <p className="text-[11px] font-mono text-white/40">
            ChatBox AI · Multi-Model Workspace · &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </>
  );
}
