"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MotionConfig } from "framer-motion";
import LandingNavbar from "./(landing)/_components/LandingNavbar";
import HeroSection from "./(landing)/_components/HeroSection";
import TrustBadgesSection from "./(landing)/_components/TrustBadgesSection";
import FeaturesSection from "./(landing)/_components/FeaturesSection";
import HowItWorksSection from "./(landing)/_components/HowItWorksSection";
import StatsSection from "./(landing)/_components/StatsSection";
import PricingSection from "./(landing)/_components/PricingSection";
import TestimonialsSection from "./(landing)/_components/TestimonialsSection";
import FAQSection from "./(landing)/_components/FAQSection";
import CTASection from "./(landing)/_components/CTASection";
import LandingFooter from "./(landing)/_components/LandingFooter";

export default function LandingPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push("/app");
    }
  }, [currentUser, loading, router]);

  if (loading || currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-800 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0a0a0f]">
        <LandingNavbar />
        <main>
          <HeroSection />
          <TrustBadgesSection />
          <HowItWorksSection />
          <FeaturesSection />
          <StatsSection />
          <PricingSection />
          <TestimonialsSection />
          <FAQSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
