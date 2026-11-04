'use client';

import React, { useRef, type ReactNode } from "react";
import Link from "next/link";
import { Navbar, Footer } from "./Sections";
import { useRevealAll, Btn, SIGN_UP } from "./ui";
import { DOCS_URL } from "./models-data";
import "./landing.css";

export function SubPage({
  eyebrow,
  title,
  lead,
  variant,
  children,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: ReactNode;
  variant: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useRevealAll(ref);
  return (
    <main ref={ref} className={`subpage subpage-${variant}`}>
      <Navbar />
      <header className="sp-hero">
        <div className="sp-hero-copy">
          <p className="sp-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="sp-lead">{lead}</p>
          <div className="sp-actions">
            <Btn href={SIGN_UP}>Start for Free</Btn>
            <Link href={DOCS_URL} className="sp-link">
              Read the documentation ↗
            </Link>
          </div>
        </div>
        {aside && <div className="sp-hero-aside">{aside}</div>}
      </header>
      {children}
      <Footer />
    </main>
  );
}

export function SpSection({
  label,
  title,
  children,
  id,
}: {
  label: string;
  title: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="sp-section">
      <div className="sp-section-head reveal">
        <p className="sp-eyebrow">{label}</p>
        <h2>{title}</h2>
      </div>
      <div className="sp-section-body">{children}</div>
    </section>
  );
}

export function SpClosing({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <section className="sp-closing reveal">
      <h2>{title}</h2>
      {children}
      <div className="sp-actions">
        <Btn href={SIGN_UP}>Try ChatBoxAI Free</Btn>
        <Link href="/#workspace" className="sp-link">
          See the workspace ↓
        </Link>
      </div>
    </section>
  );
}
