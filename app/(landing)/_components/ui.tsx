'use client';

import React, { useEffect, useRef, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SIGN_UP = "/sign-up";
export const PRICING = "/pricing";

export function useRevealAll(scope: RefObject<HTMLElement | null> | { current: HTMLElement | null } | any) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
          gsap.from(el, {
            y: 24,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
            clearProps: "transform",
          });
        });
        gsap.utils.toArray<HTMLElement>(".scroll-wordmark").forEach((el) => {
          gsap.to(el, {
            xPercent: -3,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
          });
        });
      });
    }, scope);
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [scope]);
}

export function Section({
  id,
  eyebrow,
  title,
  sub,
  children,
  dark,
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className={`editorial-band ${dark ? "tone-dark" : ""}`}>
      <section id={id} className={`section-inner section-${id ?? eyebrow.replace(/\s+/g, "-")}`}>
        <div className="section-heading reveal">
          <p className="eyebrow sec-num">{eyebrow}</p>
          <div className="min-w-0">
            <h2>{title}</h2>
            {sub && <p className="section-sub">{sub}</p>}
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`reveal editorial-item ${className}`}>{children}</div>;
}
export function Btn({
  href,
  children,
  ghost,
}: {
  href: string;
  children: ReactNode;
  ghost?: boolean;
}) {
  return (
    <Button asChild variant={ghost ? "outline" : "default"} className="h-11 max-w-full gap-5 px-5">
      <Link href={href}>
        {children}
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </Button>
  );
}
export function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const m = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
    if (!el || !m?.[2] || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseFloat(m[2].replace(/,/g, "")),
      dec = (m[2].split(".")[1] ?? "").length;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / 1100);
        el.textContent =
          (m[1] ?? "") +
          (target * (1 - Math.pow(1 - k, 3))).toLocaleString("en-US", {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec,
          }) +
          (m[3] ?? "");
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return <span ref={ref}>{value}</span>;
}
