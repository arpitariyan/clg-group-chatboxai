'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Twitter, Linkedin, Github, Heart, Shield, Lock, CreditCard,Instagram } from 'lucide-react';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <div>
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/Chatboxai_logo_main_2.png"
                alt="ChatBox AI"
                width={180}
                height={45}
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Experience the future of AI-powered conversations with cutting-edge artificial intelligence.
            </p>
            {/* Social Links */}
            <div className="flex space-x-3">
              <a
                href="https://www.instagram.com/chatboxai_uiux/?igsh=amxzamd0OWxpaWhi#"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </a>
              <a
                href="https://www.linkedin.com/in/arpit-ariyan-maharana-21a62524a/?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app&original_referer=https%3A%2F%2Fproject-creations.netlify.app%2F"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </a>
              <a
                href="https://github.com/arpitariyan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </a>
              <a
                href="mailto:arpitariyanm@gmail.com"
                className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/help-center"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-conditions"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="border-t border-gray-200 dark:border-gray-900 pt-8 mb-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure Payments</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full hidden sm:block" />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>SSL Encrypted</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full hidden sm:block" />
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Razorpay Secured</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 dark:border-gray-900 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              © {currentYear} ChatBox AI by Technon Pvt Ltd. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
              Made with <Heart className="w-3 h-3 mx-1 text-red-500 fill-red-500" /> in India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

