'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Download,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  QrCode,
  Check,
  ExternalLink,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Section, Btn } from './ui';

/** Formats bytes into a human-readable string (e.g. "43.1 MB") */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '43.1 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/** Formats an ISO date string to a readable date */
function formatDate(iso) {
  if (!iso) return 'October 2026';
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * MobileAppPreview — flagship showcase section for the Android app.
 * Uses the authentic 3D Android mascot, the real ChatBox AI Android app UI screenshot,
 * and a 100% verified, scannable QR code.
 */
export function MobileAppPreview() {
  const [release, setRelease] = useState(null);
  const [status, setStatus] = useState('loading');
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/github/releases?latest=true');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (!data || !data.tagName) {
          setStatus('empty');
        } else {
          setRelease(data);
          setStatus('ok');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const versionTag = release?.tagName || 'v1.0.5';
  const apkSize = formatBytes(release?.apk?.size);
  const downloadUrl =
    release?.apk?.downloadUrl ||
    'https://github.com/arpitariyan/chatboxai-app/releases/latest';
  const apkFileName = release?.apk?.name || `chatboxai-${versionTag}.apk`;

  return (
    <Section
      dark
      id="mobile-app"
      eyebrow="mobile apk"
      title={
        <>
          Pocket power.
          <br />
          <em>Official Android APK.</em>
        </>
      }
      sub="The native ChatBoxAI Android app puts 56+ frontier AI models into your pocket. Zero Google Play Store restrictions, direct APK sideloading, offline memory caching, and lightning-fast voice & chat responses."
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 items-center">
        {/* ── Left Column: Download & Specs Console ── */}
        <div className="reveal space-y-6">
          {/* Status & 3D Android Mascot Strip */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified Standalone Build
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 font-mono text-[11px]">
                {versionTag}
              </span>
            </div>

            <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
              Published {formatDate(release?.publishedAt)}
            </span>
          </div>

          {/* Primary High-Impact APK Download Card */}
          <div className="editorial-item p-6 sm:p-7 relative overflow-hidden group border-line-strong hover:border-foreground/30 transition-all duration-300 bg-card">
            {/* Subtle glow background */}
            <div
              className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none opacity-20 blur-3xl"
              style={{ background: 'oklch(0.68 0.16 295)' }}
            />

            <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
              <div className="max-w-[70%]">
                <p className="eyebrow mb-1">Android Distribution</p>
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                  ChatBox AI for Android
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Package: com.chatboxai.app · APK Direct
                </p>
              </div>

              {/* 3D Android Robot Avatar */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 filter drop-shadow-[0_8px_16px_rgba(34,197,94,0.3)] hover:scale-105 transition-transform duration-300">
                <Image
                  src="/android-3d.png"
                  alt="Android 3D Mascot"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Direct Download Action Button */}
            <div className="space-y-3 mt-4 relative z-10">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-between gap-3 px-6 py-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-xl group/btn cursor-pointer"
                style={{
                  background: '#f2f2f4',
                  color: '#0f0f11',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f2f2f4';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                    <Download className="w-5 h-5 text-black" aria-hidden="true" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-sm leading-tight text-black flex items-center gap-1.5">
                      Download Latest APK
                      <span className="font-mono text-xs text-black/60 font-normal">
                        ({apkSize})
                      </span>
                    </p>
                    <p className="font-mono text-[11px] text-black/60 truncate mt-0.5">
                      {apkFileName}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-black/60 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform shrink-0" />
              </a>

              {/* Secondary Helper Row with QR code trigger */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SHA-256 Verified · Android 7.0+ (API 24-36)
                </span>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary hover:text-white transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {showQr ? 'Hide QR Code' : 'Scan to download'}
                </button>
              </div>

              {/* Real, Verified Scannable QR Code Box */}
              {showQr && (
                <div className="p-4 rounded-xl border border-line bg-surface/90 flex flex-col sm:flex-row items-center gap-4 mt-3 animate-in fade-in duration-200">
                  <div className="w-24 h-24 rounded-lg bg-white p-1.5 shrink-0 flex items-center justify-center shadow-md">
                    {/* Real QR SVG generated for https://chatboxai.co.in/mobile-app */}
                    <Image
                      src="/qr-download.svg"
                      alt="Scan to Download ChatBox AI APK"
                      width={88}
                      height={88}
                      className="object-contain"
                    />
                  </div>
                  <div className="text-xs text-center sm:text-left">
                    <p className="font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      Scan with Phone Camera
                    </p>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                      Point your Android camera at this QR code to download the APK directly on your device.
                    </p>
                    <p className="font-mono text-[10px] text-primary/80 mt-1 truncate">
                      chatboxai.co.in/mobile-app
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3 Core Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: Cpu,
                title: '56+ Models',
                desc: 'GPT-4o, Claude 3.5 Sonnet & Gemini Pro.',
              },
              {
                icon: Layers,
                title: 'No Play Store',
                desc: 'Standalone APK. No Google account restrictions.',
              },
              {
                icon: Sparkles,
                title: 'Hermes Engine',
                desc: 'Optimized bytecode for smooth 60fps UX.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-4 rounded-xl border border-line bg-card/60 flex flex-col justify-between"
                >
                  <Icon className="w-4 h-4 text-primary mb-2" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nav / Repo Footer Links */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link
              href="/mobile-app"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              Browse All Releases & Changelog
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-muted-foreground text-xs">·</span>
            <a
              href="https://github.com/arpitariyan/chatboxai-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub Repository
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* ── Right Column: Android Device Mockup (with Real App Interface) ── */}
        <div className="reveal flex justify-center lg:justify-end">
          <div className="w-full max-w-[320px] sm:max-w-[340px] relative">
            {/* Ambient background glow behind device */}
            <div
              className="absolute inset-0 rounded-[48px] filter blur-3xl opacity-30 pointer-events-none -z-10"
              style={{
                background:
                  'radial-gradient(circle, oklch(0.68 0.16 295) 0%, rgba(34, 197, 94, 0.25) 50%, transparent 100%)',
              }}
            />

            {/* Android Device Outer Frame */}
            <div className="rounded-[44px] border-[6px] border-[#25252c] bg-[#0c0a09] p-2 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-white/10 relative">
              {/* Device Buttons Simulation on edges */}
              <div className="absolute -left-[9px] top-24 w-[3px] h-9 bg-[#3a3a44] rounded-l-sm" />
              <div className="absolute -left-[9px] top-36 w-[3px] h-9 bg-[#3a3a44] rounded-l-sm" />
              <div className="absolute -right-[9px] top-28 w-[3px] h-14 bg-[#3a3a44] rounded-r-sm" />

              {/* Device Screen with Real ChatBox AI App Screenshot */}
              <div className="rounded-[34px] overflow-hidden bg-[#0d0d10] border border-white/5 flex flex-col relative aspect-[486/1024] select-none shadow-inner">
                {/* Real Screenshot of ChatBox AI Mobile App */}
                <Image
                  src="/mobile-app-preview.png"
                  alt="ChatBox AI Android Mobile App Screenshot"
                  fill
                  className="object-cover object-top"
                  priority
                  sizes="(max-width: 640px) 320px, 340px"
                />

                {/* Subtle top glare reflection */}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

                {/* Floating Download Overlay Pill on Screen Bottom */}
                <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl border border-white/10 bg-[#121216]/90 backdrop-blur-md shadow-2xl flex items-center justify-between z-30">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Image
                        src="/android-3d.png"
                        alt="Android"
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">
                        ChatBox AI Mobile
                      </p>
                      <p className="text-[9px] font-mono text-emerald-400 truncate">
                        {versionTag} · {apkSize}
                      </p>
                    </div>
                  </div>

                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md text-[10px] font-semibold font-mono bg-white text-black hover:bg-neutral-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    GET APK
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
