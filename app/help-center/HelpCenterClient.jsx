'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/app/(landing)/_components/Sections';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Search,
  X,
  Mail,
  Bug,
  BookOpen,
  Crown,
  ArrowUpRight,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

const FAQ_DATA = [
  // Getting Started
  {
    id: 'start-1',
    category: 'Getting Started',
    question: 'How do I create an account on ChatBox AI?',
    answer:
      'Click on "Start for Free" in the navigation bar. You can sign up using your email address and password. Upon verification, your account is immediately credited with daily free tokens, allowing you to start chatting with foundational AI models instantly without entering a credit card.',
  },
  {
    id: 'start-2',
    category: 'Getting Started',
    question: 'What core tools and capabilities does ChatBox AI provide?',
    answer:
      'ChatBox AI is a unified multi-model AI workspace. In one dashboard, you get: Multi-Model AI Chat with 56+ models, an autonomous AI Website Builder (generating React and Tailwind code with live preview), a Deep Research Engine with multi-source web synthesis, high-fidelity Image Generation, and real-time Voice AI synthesis.',
  },
  {
    id: 'start-3',
    category: 'Getting Started',
    question: 'How do daily and monthly credits work?',
    answer:
      'Every query, code generation, or image synthesis consumes computational credits proportional to the underlying model tier. Free Plan users receive 5,000 daily credits that refresh automatically every day at 00:00 UTC. Pro subscribers receive 30,000 monthly paid credits, and Max users receive 150,000 monthly credits to power intensive workflows.',
  },

  // Pro & Credits
  {
    id: 'pro-1',
    category: 'Pro & Credits',
    question: 'What is included in the Pro Plan and how much does it cost?',
    answer:
      'The Pro plan is ₹499 per month. It includes 30,000 monthly paid credits, unrestricted access to frontier intelligence models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro), faster Website Builder prototype rendering, up to 50 daily image generations, developer API access, and priority support routing.',
  },
  {
    id: 'pro-2',
    category: 'Pro & Credits',
    question: 'What is the Max Plan and who is it designed for?',
    answer:
      'The Max plan is ₹1,999 per month, engineered for power users, agencies, and software developers. It provides 150,000 monthly credits, priority queueing, access to deep reasoning models (o1/o3-mini class), maximum context windows (up to 200k tokens), 250 daily image generations, and highest rate limits (120 req/min).',
  },
  {
    id: 'pro-3',
    category: 'Pro & Credits',
    question: 'What happens if I exhaust my monthly paid credits?',
    answer:
      'If your paid credit pool reaches zero before your monthly renewal date, you do not lose access! Your account automatically falls back to utilizing your daily free credit pool on standard models (e.g., Gemini Flash, Llama 3), ensuring uninterrupted workflow until your next billing cycle resets.',
  },
  {
    id: 'pro-4',
    category: 'Pro & Credits',
    question: 'Do unused monthly credits roll over to the next month?',
    answer:
      'No. Monthly paid credits represent allocated compute time for that active 30-day billing cycle and reset to your plan’s maximum allowance (30,000 or 150,000) on your renewal date.',
  },

  // AI Models
  {
    id: 'models-1',
    category: 'AI Models',
    question: 'Which AI foundation models are integrated into ChatBox AI?',
    answer:
      'ChatBox AI integrates over 56 state-of-the-art models from top research labs: OpenAI (GPT-4o, GPT-4o mini, o1-preview, o3-mini), Anthropic (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus), Google (Gemini 1.5 Pro, Gemini 2.0 Flash, Gemini 1.5 Flash), Meta (Llama 3.3 70B, Llama 3.1 405B), DeepSeek (DeepSeek V3, DeepSeek R1), Mistral, and Cohere.',
  },
  {
    id: 'models-2',
    category: 'AI Models',
    question: 'Can I switch models in the middle of a conversation thread?',
    answer:
      'Yes. In the chat interface, the model selector dropdown in the top control bar allows you to switch between models at any point. Your prior messages, uploaded attachments, and thread context remain intact so you can compare how different models reason through the same problem.',
  },
  {
    id: 'models-3',
    category: 'AI Models',
    question: 'Which model should I use for coding and debugging?',
    answer:
      'For complex software architecture, full-stack React components, and deep refactoring, Claude 3.5 Sonnet and Qwen3 Coder are documented as top-tier performers. For fast unit tests and code explanations, Gemini 1.5 Flash and GPT-4o mini offer lightning-fast, token-efficient turnaround.',
  },

  // Website Builder
  {
    id: 'web-1',
    category: 'Website Builder',
    question: 'How does the AI Website Builder work?',
    answer:
      'Navigate to the Website Builder tab and type what you need (e.g., "A modern dark SaaS landing page for an AI accounting tool with pricing and testimonials"). The engine generates modular React components, applies Tailwind CSS classes, and provides a real-time responsive browser sandbox where you can preview mobile and desktop layouts and download the code.',
  },
  {
    id: 'web-2',
    category: 'Website Builder',
    question: 'Can I download the source code of my generated website?',
    answer:
      'Yes! Every generated site prototype includes a "Download Code" and "Copy Component" button. The output uses standard Next.js / Vite React + Tailwind CSS syntax with zero proprietary lock-in, so you can paste it directly into your local codebase.',
  },

  // Security & Privacy
  {
    id: 'sec-1',
    category: 'Security & Privacy',
    question: 'Does ChatBox AI train foundation models on my prompts or code?',
    answer:
      'NO. ChatBox AI operates under strict enterprise commercial agreements with OpenAI, Anthropic, and Google that legally prohibit using user prompts, uploaded documents, or generated code to train public machine learning models. Your intellectual property remains strictly confidential.',
  },
  {
    id: 'sec-2',
    category: 'Security & Privacy',
    question: 'How is my data encrypted and protected?',
    answer:
      'All traffic between your client device and our servers is secured over TLS 1.3 (HTTPS). Databases and file volumes are stored behind AES-256 encrypted volumes. Developer API keys are stored hashed with SHA-256, and we adhere to India’s Digital Personal Data Protection (DPDP) Act.',
  },
  {
    id: 'sec-3',
    category: 'Security & Privacy',
    question: 'How do I enable Multi-Factor Authentication (MFA)?',
    answer:
      'Open Settings → Security → Multi-Factor Authentication. Enter your verified email address to receive one-time authentication codes (OTP). Once activated, MFA ensures no unauthorized login can occur even if your password is compromised.',
  },

  // Billing & Payments
  {
    id: 'bill-1',
    category: 'Billing & Payments',
    question: 'Which payment methods are accepted?',
    answer:
      'We accept all major payment methods through our certified gateway partners: UPI (Google Pay, PhonePe, Paytm), RuPay cards, Visa, Mastercard, Netbanking across 50+ Indian banks via Razorpay, and international credit cards via Paddle.',
  },
  {
    id: 'bill-2',
    category: 'Billing & Payments',
    question: 'How do I cancel my subscription?',
    answer:
      'Cancellation is 100% self-service. Go to Settings → Subscription → Cancel Subscription. You will not be charged again, and you will continue to enjoy your full Pro or Max benefits until the end of your current prepaid billing cycle.',
  },
  {
    id: 'bill-3',
    category: 'Billing & Payments',
    question: 'Can I get a GST invoice for corporate tax deductions?',
    answer:
      'Yes. When subscribing or updating your profile in Settings, enter your legal corporate name and GSTIN. Every automated billing invoice sent to your email will reflect your GST details for business input tax credit.',
  },

  // Developer & API
  {
    id: 'dev-1',
    category: 'Developer & API',
    question: 'Does ChatBox AI provide an OpenAI-compatible API?',
    answer:
      'Yes. Pro and Max subscribers can generate developer API keys from the Settings panel. Our endpoint baseURL is "https://chatboxai.co.in/v1", which works as a drop-in replacement with the standard OpenAI Node.js, Python, or curl SDKs.',
  },
  {
    id: 'dev-2',
    category: 'Developer & API',
    question: 'What are the API rate limits?',
    answer:
      'Free Plan users are capped at 10 requests per minute. Pro Plan subscribers receive up to 60 requests per minute. Max Plan accounts receive up to 120 requests per minute with higher concurrency allowances.',
  },
];

const CATEGORIES = [
  'All Topics',
  'Getting Started',
  'Pro & Credits',
  'AI Models',
  'Website Builder',
  'Security & Privacy',
  'Billing & Payments',
  'Developer & API',
];

export default function HelpCenterClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Topics');

  // Filtered FAQs based on category & search query
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        activeCategory === 'All Topics' || item.category === activeCategory;
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="help-page">
      <Navbar />

      {/* Hero Section */}
      <header className="help-hero">
        <p className="legal-eyebrow">03 / Support &amp; Knowledge Base</p>
        <h1 className="legal-title">
          Help Center &amp; Support.
          <br />
          <span className="text-muted-foreground">Find answers, guides and technical support.</span>
        </h1>
        <p className="legal-lead">
          Explore documentation on our 56+ AI models, credit accounting, the AI website builder,
          secure billing workflows, and OpenAI-compatible developer APIs.
        </p>

        {/* Live Search Input */}
        <div className="help-search-box">
          <Search className="help-search-icon" />
          <input
            type="text"
            className="help-search-input"
            placeholder="Search questions, billing, models, API, or credits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search help articles and questions"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="help-search-clear"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="help-categories" role="tablist">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            const count =
              cat === 'All Topics'
                ? FAQ_DATA.length
                : FAQ_DATA.filter((f) => f.category === cat).length;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                className={`help-cat-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </header>

      {/* Main FAQ Container */}
      <main className="help-container">
        <div className="help-faq-header">
          <h2>Frequently Asked Questions</h2>
          <span className="help-count-badge">
            Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'answer' : 'answers'}
            {searchQuery && ` for "${searchQuery}"`}
          </span>
        </div>

        {filteredFaqs.length > 0 ? (
          <Accordion type="single" collapsible className="border-t border-border">
            {filteredFaqs.map((faq, i) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="gap-3 sm:gap-4 py-4 sm:py-6 text-sm sm:text-base md:text-lg text-left">
                  <span className="flex min-w-0 items-center gap-3 sm:gap-5">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      Q{i < 9 ? `0${i + 1}` : i + 1}
                    </span>
                    <span className="leading-snug">
                      {faq.question}
                      <span className="ml-3 hidden sm:inline-block font-mono text-[10px] uppercase text-muted-foreground border border-line-strong px-2 py-0.5 rounded-full">
                        {faq.category}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="max-w-3xl pl-7 sm:pl-12 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <p>{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="py-16 text-center border-t border-border">
            <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No matching topics found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              We couldn&apos;t find any questions matching &quot;{searchQuery}&quot;. Try adjusting your search keywords or clear filters to view all questions.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All Topics');
              }}
              className="help-cat-pill active inline-block"
            >
              Reset Search &amp; Show All
            </button>
          </div>
        )}

        {/* Direct Human Support Channels */}
        <section className="help-support-grid">
          <div className="help-support-card">
            <div>
              <Mail className="w-5 h-5 text-foreground" />
              <h3>Email Support Desk</h3>
              <p>
                Reach our engineering and support desk directly. We guarantee a human response within 24 hours.
              </p>
            </div>
            <a
              href="mailto:arpitariyanm@gmail.com"
              className="card-cta"
            >
              arpitariyanm@gmail.com <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="help-support-card">
            <div>
              <Bug className="w-5 h-5 text-foreground" />
              <h3>In-App Bug Reports</h3>
              <p>
                Experiencing unexpected model behavior or an edge-case error? Submit logs directly from your workspace.
              </p>
            </div>
            <Link href="/app" className="card-cta">
              Open App Settings <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="help-support-card">
            <div>
              <BookOpen className="w-5 h-5 text-foreground" />
              <h3>Developer Documentation</h3>
              <p>
                Explore API references, model parameter guidelines, function calling schemas, and integration quickstarts.
              </p>
            </div>
            <Link href="/docs" className="card-cta">
              Read the Docs <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Pro Priority Support Note */}
        <div className="mt-12 p-5 border border-line-strong bg-canvas rounded-lg flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong className="text-foreground">Pro &amp; Max Priority SLA:</strong> Paid subscribers receive prioritized support queueing and dedicated resolution desk access.
            </p>
          </div>
          <Link
            href="/#pricing"
            className="text-xs font-mono text-foreground hover:underline inline-flex items-center gap-1.5"
          >
            Explore Plans <Sparkles className="w-3 h-3 text-amber-500" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
