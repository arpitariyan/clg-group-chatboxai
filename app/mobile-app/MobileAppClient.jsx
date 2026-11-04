'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Smartphone,
  Download,
  ArrowUpRight,
  Tag,
  Calendar,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import '../(landing)/_components/landing.css';
import { useRevealAll } from '../(landing)/_components/ui';
import * as S from '../(landing)/_components/Sections';

function GithubIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

/* ──────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/** Parses minimal Markdown-ish release notes into safe text paragraphs */
function ReleaseBody({ body }) {
  if (!body) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No release notes provided.
      </p>
    );
  }
  const lines = body.split('\n').filter((l) => l.trim().length > 0);
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        const clean = line.replace(/^[-*#]+\s*/, '').trim();
        if (!clean) return null;
        const isBullet = /^[-*]/.test(line.trim());
        const isHeader = /^#{1,3}\s/.test(line.trim());
        if (isHeader) {
          return (
            <li key={i} className="font-semibold text-foreground text-sm mt-3">
              {clean}
            </li>
          );
        }
        return (
          <li
            key={i}
            className={`text-sm text-muted-foreground leading-relaxed flex gap-2 ${
              isBullet ? '' : 'list-none'
            }`}
          >
            {isBullet && <span className="text-primary shrink-0">›</span>}
            <span>{clean}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ──────────────────────────────────────────────
   Skeleton loader
────────────────────────────────────────────── */
function ReleaseSkeleton() {
  return (
    <div className="editorial-item space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-6 w-20 rounded-full bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="h-5 w-48 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-3/4 rounded bg-muted" />
        <div className="h-3.5 w-5/6 rounded bg-muted" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-36 rounded-lg bg-muted" />
        <div className="h-10 w-28 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Single Release Card
────────────────────────────────────────────── */
function ReleaseCard({ release, isLatest }) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <article className="editorial-item">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[11px] tracking-tight"
            style={{
              background: release.prerelease
                ? 'rgba(245,158,11,0.08)'
                : 'rgba(139,92,246,0.08)',
              borderColor: release.prerelease
                ? 'rgba(245,158,11,0.25)'
                : 'rgba(139,92,246,0.25)',
              color: release.prerelease ? '#f59e0b' : 'oklch(0.68 0.16 295)',
            }}
          >
            <Tag className="w-3 h-3" aria-hidden="true" />
            {release.tagName}
          </span>

          {isLatest && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold font-mono uppercase tracking-wider">
              <CheckCircle className="w-3 h-3" aria-hidden="true" /> Latest Build
            </span>
          )}

          {release.prerelease && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-semibold font-mono uppercase tracking-wider">
              Beta
            </span>
          )}
        </div>

        {/* Date + time ago */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Clock className="w-3 h-3" aria-hidden="true" />
          <span>{formatDate(release.publishedAt)}</span>
          <span className="opacity-60">· {timeAgo(release.publishedAt)}</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-foreground mb-3">{release.name}</h2>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        {release.apk && (
          <>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="w-3.5 h-3.5" aria-hidden="true" />
              {formatBytes(release.apk.size)}
            </span>
            {release.apk.downloadCount > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {release.apk.downloadCount.toLocaleString()} downloads
              </span>
            )}
          </>
        )}
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          {release.assets.length} asset{release.assets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Release notes (collapsible) */}
      {release.body && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3 cursor-pointer"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {expanded ? 'Hide' : 'Show'} release notes
          </button>

          {expanded && (
            <div className="pl-4 border-l border-border/60">
              <ReleaseBody body={release.body} />
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
        {release.apk ? (
          <a
            href={release.apk.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
            style={{ background: 'oklch(0.68 0.16 295)', color: '#fff' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.88';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download APK
            <span className="font-mono text-[11px] opacity-75">{release.apk.name}</span>
          </a>
        ) : null}

        <a
          href={release.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          View on GitHub
        </a>

        {!release.apk && (
          <span className="text-xs text-muted-foreground italic">No APK asset in this release</span>
        )}
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────
   Main Page Component
────────────────────────────────────────────── */
export default function MobileAppClient() {
  const ref = useRef(null);
  useRevealAll(ref);

  const [releases, setReleases] = useState([]);
  const [status, setStatus] = useState('loading');
  const [lastFetched, setLastFetched] = useState(null);

  async function loadReleases() {
    setStatus('loading');
    try {
      const res = await fetch('/api/github/releases?per_page=20');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setReleases(data);
        setStatus('ok');
      } else {
        setReleases([]);
        setStatus('empty');
      }
    } catch {
      setStatus('error');
    }
    setLastFetched(new Date());
  }

  useEffect(() => {
    loadReleases();
  }, []);

  return (
    <main ref={ref} className="bg-[#0f0f11] text-[#f2f2f4] min-h-screen">
      <S.Navbar />

      {/* ── Hero / Page Header ── */}
      <section className="section-inner" style={{ paddingTop: 'clamp(96px, 14vw, 160px)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div className="reveal max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="eyebrow sec-num">mobile</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                ● Android APK Direct
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.07] mb-6">
              ChatBoxAI
              <br />
              <em className="text-muted-foreground">for Android.</em>
            </h1>
            <p className="section-sub">
              The native Android app brings the full ChatBoxAI workspace to your pocket.
              All releases are published directly from GitHub — what you see here is always
              the latest version, auto-updated every hour without third-party app stores.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-8">
              {releases[0]?.apk ? (
                <a
                  href={releases[0].apk.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-sm font-semibold transition-all shadow-lg hover:scale-102"
                  style={{ background: '#f2f2f4', color: '#0f0f11' }}
                >
                  <Download className="w-4 h-4 text-black" aria-hidden="true" />
                  Download Latest APK
                  {releases[0]?.tagName && (
                    <span className="font-mono text-xs opacity-75">({releases[0].tagName})</span>
                  )}
                </a>
              ) : null}

              <a
                href="https://github.com/arpitariyan/chatboxai-app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <GithubIcon className="w-4 h-4" />
                GitHub Repository
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Hero 3D Mascot & QR Card */}
          <div className="reveal flex justify-center lg:justify-end">
            <div className="editorial-item p-6 rounded-2xl bg-card border-line-strong flex items-center gap-6 max-w-sm w-full">
              <div className="relative w-24 h-24 shrink-0 filter drop-shadow-[0_10px_20px_rgba(34,197,94,0.3)]">
                <Image
                  src="/android-3d.png"
                  alt="Android 3D Mascot"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="text-xs space-y-1.5">
                <p className="font-semibold text-foreground text-sm">Standalone APK</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Direct sideload for Android 7.0 to 15. No Google account required.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SHA-256 Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Highlights Strip ── */}
      <div className="editorial-band">
        <div className="section-inner" style={{ padding: '40px 5%' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-border divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              ['Exclusive to Android', 'Optimised native APK — no Play Store required.'],
              ['Open Source Releases', 'Every version is published openly via GitHub Releases.'],
              ['Auto-Updated', 'This page refreshes automatically when new versions ship.'],
            ].map(([title, desc]) => (
              <div key={title} className="editorial-item rounded-none border-0 bg-transparent">
                <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Releases List ── */}
      <section className="section-inner">
        <div className="section-heading reveal">
          <p className="eyebrow sec-num">releases</p>
          <div className="min-w-0">
            <h2>
              All Versions
              <br />
              <em>release history.</em>
            </h2>
          </div>
        </div>

        {/* Refresh bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className="text-xs text-muted-foreground font-mono">
            {lastFetched
              ? `Last refreshed: ${lastFetched.toLocaleTimeString('en-IN')}`
              : 'Loading…'}
          </p>
          <button
            onClick={loadReleases}
            disabled={status === 'loading'}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>

        {/* States */}
        {status === 'loading' && (
          <div className="space-y-4">
            <ReleaseSkeleton />
            <ReleaseSkeleton />
            <ReleaseSkeleton />
          </div>
        )}

        {status === 'error' && (
          <div className="editorial-item flex items-start gap-4 border-amber-500/30">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground mb-1">Could not load releases</p>
              <p className="text-sm text-muted-foreground mb-3">
                There was an error fetching the release data from GitHub. This might be a temporary
                issue or a network restriction.
              </p>
              <a
                href="https://github.com/arpitariyan/chatboxai-app/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2"
              >
                Browse releases on GitHub <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}

        {status === 'empty' && (
          <div className="editorial-item text-center py-12">
            <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" aria-hidden="true" />
            <p className="font-semibold text-foreground mb-2">No releases yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              The first APK release will appear here automatically once it is published to GitHub.
            </p>
            <a
              href="https://github.com/arpitariyan/chatboxai-app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2"
            >
              <GithubIcon className="w-4 h-4" />
              Watch the repository <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        )}

        {status === 'ok' && (
          <div className="space-y-4">
            {releases.map((release, idx) => (
              <ReleaseCard key={release.id} release={release} isLatest={idx === 0} />
            ))}
          </div>
        )}
      </section>

      {/* ── Installation Guide with QR Code ── */}
      <div className="editorial-band">
        <section className="section-inner">
          <div className="section-heading reveal">
            <p className="eyebrow sec-num">install</p>
            <div className="min-w-0">
              <h2>
                How to install
                <br />
                <em>the APK.</em>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              ['01', 'Download the APK', 'Tap the "Download APK" button above or scan the QR code with your phone camera.'],
              ['02', 'Allow Unknown Sources', 'On your Android device, go to Settings → Security → Install unknown apps and allow your browser.'],
              ['03', 'Open the APK File', 'Locate the downloaded file in your Downloads folder and tap it to begin installation.'],
              ['04', 'Launch ChatBoxAI', 'Once installed, open the app and start using 56+ AI models immediately.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="reveal editorial-item">
                <p className="font-mono text-xs text-muted-foreground mb-3">{num}</p>
                <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Camera Sideload Banner */}
          <div className="reveal editorial-item p-6 rounded-2xl bg-card border-line-strong flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center shadow-lg">
                <Image
                  src="/qr-download.svg"
                  alt="QR Code to Download ChatBox AI APK"
                  width={76}
                  height={76}
                  className="object-contain"
                />
              </div>
              <div className="text-xs">
                <p className="text-base font-semibold text-foreground flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  Instant Mobile Sideload
                </p>
                <p className="text-muted-foreground mt-1 max-w-md text-xs leading-relaxed">
                  Open your phone's default camera app, point it directly at this QR code, and tap the link that appears to download the APK instantly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-line">
                chatboxai.co.in/mobile-app
              </span>
            </div>
          </div>
        </section>
      </div>

      <S.Footer />
    </main>
  );
}
