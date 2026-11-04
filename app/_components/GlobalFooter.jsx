'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, useInView } from '@/lib/animations';
import { Instagram, Linkedin, Github, Mail, Heart } from 'lucide-react';

export default function GlobalFooter() {
  const [ref, isInView] = useInView({ threshold: 0.1, once: true });
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      href: 'https://www.instagram.com/chatboxai_uiux/',
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
  ];

  return (
    <footer className="bg-[#0c0a09] relative pt-24 pb-12 border-t border-white/5">
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/6 to-transparent" />

      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16"
        >
          {/* Brand Column */}
          <motion.div variants={fadeInUp} className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/Chatboxai_logo_main_2.png"
                alt="ChatboxAI Logo"
                width={150}
                height={28}
                className="h-7 w-auto brightness-200 object-contain"
              />
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed mb-8 max-w-sm">
              Your intelligent AI companion for seamless productivity and creativity.
              Unlock the power of conversational AI tailored for modern workflows.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('mailto') ? undefined : '_blank'}
                  rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  aria-label={label}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all duration-200"
                >
                  <Icon size={18} strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Product Column */}
          <motion.div variants={fadeInUp}>
            <h4 className="text-white font-medium mb-6">Product</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/#models" className="text-neutral-400 hover:text-white transition-colors">AI Models</Link></li>
              <li><Link href="/#deep-research" className="text-neutral-400 hover:text-white transition-colors">Deep Research</Link></li>
              <li><Link href="/#integrations" className="text-neutral-400 hover:text-white transition-colors">Integrations</Link></li>`r`n              <li><Link href="/mobile-app" className="text-neutral-400 hover:text-white transition-colors">Android App</Link></li>
              <li><Link href="/#pricing" className="text-neutral-400 hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </motion.div>

          {/* Solutions Column */}
          <motion.div variants={fadeInUp}>
            <h4 className="text-white font-medium mb-6">Solutions</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/#use-cases" className="text-neutral-400 hover:text-white transition-colors">For Developers</Link></li>
              <li><Link href="/#use-cases" className="text-neutral-400 hover:text-white transition-colors">For Creators</Link></li>
              <li><Link href="/#use-cases" className="text-neutral-400 hover:text-white transition-colors">For Students</Link></li>
              <li><Link href="/#use-cases" className="text-neutral-400 hover:text-white transition-colors">For Teams</Link></li>
            </ul>
          </motion.div>

          {/* Company Column */}
          <motion.div variants={fadeInUp}>
            <h4 className="text-white font-medium mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/help-center" className="text-neutral-400 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/docs" className="text-neutral-400 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/privacy-policy" className="text-neutral-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-conditions" className="text-neutral-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-500"
        >
          <p>© {currentYear} ChatBox AI · Developed by Arpit Ariyan Mahanarana (Technon). All rights reserved.</p>
          <span className="flex items-center gap-1.5">
            Made with{' '}
            <Heart
              size={14}
              className="text-purple-500 fill-purple-500 inline-block"
              strokeWidth={0}
            />
            {' '}in India
          </span>
        </motion.div>
      </div>
    </footer>
  );
}

