import LandingPageClient from "./LandingPageClient";
import JsonLd from "./_components/JsonLd";

export const metadata = {
  title: "ChatBox AI - Advanced Multi-Model AI Assistant",
  description: "ChatBox AI gives you access to 56+ frontier AI models — GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and Llama 3.3. Search the web with AI, generate images, write code, build Next.js websites, and analyze files — all in one platform. Free to start.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  // Extract FAQ schema directly for the landing page
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is ChatBox AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ChatBox AI is a comprehensive AI workspace providing unified access to 56+ frontier AI models including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and DeepSeek R1. It integrates AI chat, interactive Next.js/React website building with live sandbox preview, deep research with citations, voice AI, image generation, and file intelligence in a single workspace."
        }
      },
      {
        "@type": "Question",
        "name": "How does the free plan work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The free plan gives you access to basic AI models with daily usage credits, image generations, and conversation history. It allows you to explore the platform without any mandatory subscription or payment."
        }
      },
      {
        "@type": "Question",
        "name": "What's included in the Pro plan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Pro plan (₹499/month) provides 30,000 monthly credits, unlocking access to frontier models like GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and DeepSeek R1, along with the AI Website Builder sandbox, Deep Research agent, high-resolution image generation, and priority processing."
        }
      },
      {
        "@type": "Question",
        "name": "Which AI models do you support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ChatBox AI supports 56+ state-of-the-art AI models across reasoning, vision, code, and chat: OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, Meta Llama 3.3 70B, DeepSeek R1, Mistral Large, Qwen 2.5, and more. Users can switch between models with a single click."
        }
      },
      {
        "@type": "Question",
        "name": "Is my data secure and private?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. ChatBox AI enforces strict contractual zero model training guarantees. All conversations and files are encrypted using TLS 1.3 in transit and AES-256 at rest, complying with Indian DPDP Act standards. Your prompts are never used to train public AI models."
        }
      },
      {
        "@type": "Question",
        "name": "How do I cancel my subscription?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can manage or cancel your subscription anytime directly from Account Settings. You retain full paid benefits until the end of your billing cycle, after which your account seamlessly transitions to the Free plan."
        }
      }
    ]
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ChatBox AI",
    "url": "https://chatboxai.co.in/",
    "description": "Advanced Multi-Model AI Assistant Workspace. Access 56+ frontier AI models including GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and DeepSeek R1. Features AI website builder, deep research with citations, image generation, code assistance, and file analysis in one platform.",
    "applicationCategory": "AIApplication",
    "operatingSystem": "Web",
    "inLanguage": "en-IN",
    "author": {
      "@id": "https://chatboxai.co.in/#organization"
    },
    "publisher": {
      "@id": "https://chatboxai.co.in/#organization"
    },
    "offers": [
      {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR",
        "name": "Free Plan",
        "description": "Basic AI models with daily usage credits. Free forever."
      },
      {
        "@type": "Offer",
        "price": "499",
        "priceCurrency": "INR",
        "name": "Pro Plan",
        "description": "30,000 monthly paid credits. Access to GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and all premium features."
      },
      {
        "@type": "Offer",
        "price": "1999",
        "priceCurrency": "INR",
        "name": "Max Plan",
        "description": "Highest credit allowance with priority access to all premium AI models and features."
      }
    ]
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={softwareSchema} />
      <LandingPageClient />
    </>
  );
}
