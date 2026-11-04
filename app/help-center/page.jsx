import HelpCenterClient from './HelpCenterClient';
import JsonLd from '@/app/_components/JsonLd';

export const metadata = {
  title: 'Help Center & Support',
  description: 'Get help and find answers to frequently asked questions about ChatBox AI. Learn about 56+ frontier AI models, AI Website Builder, Deep Research, security, and Pro subscriptions.',
  alternates: {
    canonical: 'https://chatboxai.co.in/help-center',
  },
  openGraph: {
    title: 'Help Center & Support | ChatBox AI',
    description: 'Get help and find answers to frequently asked questions about ChatBox AI. Learn about 56+ frontier AI models, AI Website Builder, Deep Research, security, and Pro subscriptions.',
    url: 'https://chatboxai.co.in/help-center',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Help Center & Support | ChatBox AI',
    description: 'Get help and find answers to frequently asked questions about ChatBox AI.',
  },
};

export default function HelpCenterPage() {
  // SEO FAQ Schema data directly reflecting the answers in the Client component
  const faqSchemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What can I do with ChatBox AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ChatBox AI helps you with Website Builder, Search & Research, Image Generation, Voice AI, text generation, creative writing, coding support, translation, and more. You can use these tools together in one workflow for faster results."
        }
      },
      {
        "@type": "Question",
        "name": "What's included in the Pro plan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Pro plan includes 30,000 monthly paid credits, access to premium AI models like GPT-4o and Claude 3.5, faster Website Builder workflows, higher-quality Image Generation, and priority support."
        }
      },
      {
        "@type": "Question",
        "name": "Can I switch between different AI models?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can select different AI models based on your plan. Free users have access to fast, basic models, while Pro and Max users get access to premium models like GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, we use industry-standard encryption and security measures. Your conversations and data are encrypted in transit and at rest. We never share your personal data with third parties or use it to train public AI models."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chatboxai.co.in' },
      { '@type': 'ListItem', position: 2, name: 'Help Center', item: 'https://chatboxai.co.in/help-center' },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchemaData} />
      <JsonLd data={breadcrumbSchema} />
      <HelpCenterClient />
    </>
  );
}