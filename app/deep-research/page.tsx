import { Metadata } from "next";
import DeepResearchClient from "./DeepResearchClient";

export const metadata: Metadata = {
  title: "Deep Research Agent",
  description:
    "Explore Deep Research in ChatBox AI: multi-step query decomposition, multi-source web cross-verification, and structured findings with verifiable citations.",
  alternates: {
    canonical: "https://chatboxai.co.in/deep-research",
  },
  openGraph: {
    title: "Deep Research Agent | ChatBox AI",
    description:
      "Explore Deep Research in ChatBox AI: multi-step query decomposition, multi-source web cross-verification, and structured findings with verifiable citations.",
    url: "https://chatboxai.co.in/deep-research",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deep Research Agent | ChatBox AI",
    description:
      "Conduct in-depth web research with autonomous query breakdown and verifiable source citations.",
  },
};

export default function DeepResearchPage() {
  return <DeepResearchClient />;
}
