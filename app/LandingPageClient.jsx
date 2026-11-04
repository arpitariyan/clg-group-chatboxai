"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import HeroSection from "./(landing)/_components/HeroSection";
import { useRevealAll } from "./(landing)/_components/ui";
import * as S from "./(landing)/_components/Sections";
import "./(landing)/_components/landing.css";

export default function LandingPageClient() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const ref = useRef(null);

  useRevealAll(ref);

  useEffect(() => {
    if (!loading && currentUser) {
      router.push("/app");
    }
  }, [currentUser, loading, router]);

  return (
    <main ref={ref} className="bg-[#0f0f11] text-[#f2f2f4]">
      <S.Navbar />
      <HeroSection />
      <S.TrustBadges />
      <S.LiveDemo />
      <S.Capability />
      <S.DeepResearch />
      <S.WebsiteBuilder />
      <S.FileIntelligence />
      <S.Integrations />
      <S.AiModels />
      <S.UseCases />
      <S.WhyChatBox />
      <S.TrustSecurity />
      <S.Features />
      <S.HowItWorks />
      <S.MobileApp />
      <S.Stats />
      <S.Testimonials />
      <S.Pricing />
      <S.FAQ />
      <S.CTA />
      <S.Footer />
    </main>
  );
}
