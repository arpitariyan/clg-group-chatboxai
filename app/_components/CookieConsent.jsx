'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { ArrowUpRight, Cookie, ShieldCheck } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'chatboxai-cookie-consent';

export default function CookieConsent() {
  const [consent, setConsent] = useState(null);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    try {
      setConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    } catch {
      setConsent('declined');
    }
  }, []);

  const updateConsent = (value) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setConsent(value);
  };

  return (
    <>
      {measurementId && consent === 'accepted' && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {consent === null && (
        <aside
          role="dialog"
          aria-label="Cookie preferences"
          aria-describedby="cookie-consent-description"
          aria-live="polite"
          className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 z-[100] w-auto sm:w-[380px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#2a2a30] bg-[#17171a]/95 text-[#f2f2f4] shadow-[0_24px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl duration-300 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#2a2a30] bg-[#202024] text-[#f2f2f4]">
                  <Cookie className="size-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-semibold tracking-tight text-[#f2f2f4]">
                    Cookie Preferences
                  </h2>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#71737a] bg-[#202024] px-2 py-0.5 rounded border border-[#2a2a30]">
                Consent
              </span>
            </div>

            <p id="cookie-consent-description" className="text-xs sm:text-[13px] leading-relaxed text-[#a4a6ad]">
              We use strictly necessary storage for authentication and optional privacy-first analytics to improve ChatBoxAI. No personal data is ever sold.
            </p>

            <div className="mt-2.5">
              <Link
                href="/privacy-policy#cookies"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#a4a6ad] hover:text-[#f2f2f4] transition-colors underline decoration-[#3a3a42] underline-offset-4"
              >
                Read our Privacy Policy
                <ArrowUpRight className="size-3 text-[#71737a]" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-[#2a2a30] pt-3.5">
              <button
                type="button"
                onClick={() => updateConsent('rejected')}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#2a2a30] bg-transparent px-3.5 font-mono text-xs text-[#a4a6ad] transition-all hover:bg-[#202024] hover:text-[#f2f2f4] hover:border-[#3a3a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2f2f4]/40 cursor-pointer"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => updateConsent('accepted')}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#f2f2f4] px-4 font-mono text-xs font-semibold text-[#0f0f11] transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(242,242,244,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2f2f4]/60 cursor-pointer"
              >
                Accept All
                <ShieldCheck className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}