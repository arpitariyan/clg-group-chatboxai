import { Metadata } from "next";
import DevelopersClient from "./DevelopersClient";

export const metadata: Metadata = {
  title: "For Developers",
  description:
    "Build faster with ChatBox AI: code generation, refactoring, prototyping, and unified OpenAI-compatible API gateway with 56+ frontier models.",
  alternates: {
    canonical: "https://chatboxai.co.in/developers",
  },
  openGraph: {
    title: "For Developers | ChatBox AI",
    description:
      "Build faster with ChatBox AI: code generation, refactoring, prototyping, and unified OpenAI-compatible API gateway with 56+ frontier models.",
    url: "https://chatboxai.co.in/developers",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Developers | ChatBox AI",
    description: "Code generation and OpenAI-compatible API gateway accessing 56+ models.",
  },
};

export default function DevelopersPage() {
  return <DevelopersClient />;
}
