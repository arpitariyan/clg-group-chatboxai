'use client';

import { MotionConfig } from 'framer-motion';
import LandingNavbar from './(landing)/_components/LandingNavbar';
import HeroSection from './(landing)/_components/HeroSection';
import TrustBadgesSection from './(landing)/_components/TrustBadgesSection';
import FeaturesSection from './(landing)/_components/FeaturesSection';
import StatsSection from './(landing)/_components/StatsSection';
import PricingSection from './(landing)/_components/PricingSection';
import TestimonialsSection from './(landing)/_components/TestimonialsSection';
import FAQSection from './(landing)/_components/FAQSection';
import LandingFooter from './(landing)/_components/LandingFooter';

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <LandingNavbar />
        <main>
          <HeroSection />
          <TrustBadgesSection />
          <FeaturesSection />
          <StatsSection />
          <PricingSection />
          <TestimonialsSection />
          <FAQSection />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}

