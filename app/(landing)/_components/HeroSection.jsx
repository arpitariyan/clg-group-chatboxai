'use client';

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeroCanvas } from "./HeroCanvas";
import { SIGN_UP, Btn } from "./ui";

export default function HeroSection() {
  const ref = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hz-in", {
          y: 14,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.07,
          ease: "power3.out",
          clearProps: "opacity,visibility,transform",
        });
        gsap.from(".hz-p", {
          y: 26,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.12,
          delay: 0.2,
          ease: "power3.out",
          clearProps: "opacity,visibility,transform",
        });
      });
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(".hz-mark", {
          yPercent: -6,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: 1 },
        });
      });
    }, ref);
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={ref}
      className="hz"
      id="top"
      style={{ "--hz-img": "url(/chrome-study.jpg)" }}
    >
      <div className="hz-inner">
        <div className="hz-copy">
          <p className="hz-eyebrow hz-in">Multi-Model AI Workspace</p>
          <h1 className="hz-in">
            <span>The Ultimate</span>
            <span>Multi-Model</span>
            <span className="text-muted-foreground">AI Workspace.</span>
          </h1>
          <p className="hz-desc hz-in">
            Generate Next.js websites, create breathtaking AI art, conduct deep web research, and
            converse with 56+ frontier models including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and DeepSeek R1—all inside one unified, lightning-fast
            platform.
          </p>
          <div className="hz-actions hz-in">
            <Btn href={SIGN_UP}>Start for Free</Btn>
            <a href="#workspace" className="hz-link">
              Explore the workspace ↓
            </a>
          </div>
        </div>
        <HeroCanvas />
      </div>
      <div className="hz-mark" aria-hidden="true">
        ChatBox <span>AI</span>
      </div>
    </section>
  );
}
