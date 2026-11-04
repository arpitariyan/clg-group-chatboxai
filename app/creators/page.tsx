import { Metadata } from "next";
import CreatorsClient from "./CreatorsClient";

export const metadata: Metadata = {
  title: "For Creators",
  description:
    "Brainstorm, write, generate high-resolution AI visuals, and build responsive Next.js landing pages with ChatBox AI's unified creator suite.",
  alternates: {
    canonical: "https://chatboxai.co.in/creators",
  },
  openGraph: {
    title: "For Creators | ChatBox AI",
    description:
      "Brainstorm, write, generate high-resolution AI visuals, and build responsive Next.js landing pages with ChatBox AI's unified creator suite.",
    url: "https://chatboxai.co.in/creators",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Creators | ChatBox AI",
    description: "AI writing, image generation, and Next.js website builder in one platform.",
  },
};

export default function CreatorsPage() {
  return <CreatorsClient />;
}
