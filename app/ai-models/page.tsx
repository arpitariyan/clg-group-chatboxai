import { Metadata } from "next";
import AiModelsClient from "./AiModelsClient";

export const metadata: Metadata = {
  title: "AI Models Catalog",
  description:
    "Browse the 56+ ChatBox AI model catalog: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, Llama 3.3, FLUX, and voice models with Free and Paid tiers.",
  alternates: {
    canonical: "https://chatboxai.co.in/ai-models",
  },
  openGraph: {
    title: "AI Models Catalog | ChatBox AI",
    description:
      "Browse the 56+ ChatBox AI model catalog: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, Llama 3.3, FLUX, and voice models with Free and Paid tiers.",
    url: "https://chatboxai.co.in/ai-models",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Models Catalog | ChatBox AI",
    description:
      "Browse 56+ frontier AI models on ChatBox AI: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, DeepSeek R1, and more.",
  },
};

export default function AiModelsPage() {
  return <AiModelsClient />;
}
