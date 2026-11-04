import { Metadata } from "next";
import ResearchersClient from "./ResearchersClient";

export const metadata: Metadata = {
  title: "For Researchers",
  description:
    "Explore topics, compare viewpoints, synthesize uploaded documents, and draft structured findings with ChatBox AI — backed by verifiable web citations.",
  alternates: {
    canonical: "https://chatboxai.co.in/researchers",
  },
  openGraph: {
    title: "For Researchers | ChatBox AI",
    description:
      "Explore topics, compare viewpoints, synthesize uploaded documents, and draft structured findings with ChatBox AI — backed by verifiable web citations.",
    url: "https://chatboxai.co.in/researchers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Researchers | ChatBox AI",
    description: "Multi-source research, source comparison, and citation synthesis with 56+ AI models.",
  },
};

export default function ResearchersPage() {
  return <ResearchersClient />;
}
