'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Linkedin, Github, Heart, Shield, Lock, CreditCard, Instagram } from 'lucide-react';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#080810] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <div>
            <Link href="/" className="inline-block mb-5">
              <Image
                src="/Chatboxai_logo_main_2.png"
                alt="ChatBox AI"
                width={180}
                height={45}
                className="h-8 w-auto brightness-200"
              />
            </Link>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-xs">
              Experience the future of AI-powered conversations with cutting-edge artificial intelligence.
            </p>
            {/* Social Links */}
            <div className="flex space-x-2">
              {[
                {
                  href: 'https://www.instagram.com/chatboxai_uiux/?igsh=amxzamd0OWxpaWhi#',
                  icon: Instagram,
                  label: 'Instagram',
                },
                {
                  href: 'https://www.linkedin.com/in/arpit-ariyan-maharana-21a62524a/',
                  icon: Linkedin,
                  label: 'LinkedIn',
                },
                {
                  href: 'https://github.com/arpitariyan',
                  icon: Github,
                  label: 'GitHub',
                },
                {
                  href: 'mailto:arpitariyanm@gmail.com',
                  icon: Mail,
                  label: 'Email',
                },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-violet-500/10 hover:border-violet-500/20 transition-all duration-200 group"
                  aria-label={label}
                >
                  <Icon className="w-3.5 h-3.5 text-gray-600 group-hover:text-violet-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
              Product
            </h3>
            <ul className="space-y-3">
              {[
                ['#features', 'Features'],
                ['#pricing', 'Pricing'],
                ['/sign-up', 'Get Started'],
              ].map(([href, label]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 hover:text-gray-300 transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
              Legal
            </h3>
            <ul className="space-y-3">
              {[
                ['/help-center', 'Help Center'],
                ['/privacy-policy', 'Privacy Policy'],
                ['/terms-conditions', 'Terms of Service'],
              ].map(([href, label]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 hover:text-gray-300 transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="border-t border-white/[0.04] pt-8 mb-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-700">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure Payments</span>
            </div>
            <div className="w-1 h-1 bg-white/10 rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>SSL Encrypted</span>
            </div>
            <div className="w-1 h-1 bg-white/10 rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Razorpay Secured</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/[0.04] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <p className="text-xs text-gray-700">
              © {currentYear} ChatBox AI by Technon Pvt Ltd. All rights reserved.
            </p>
            <p className="text-xs text-gray-700 flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> in India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
