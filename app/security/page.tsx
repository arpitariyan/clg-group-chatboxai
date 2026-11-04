import { Metadata } from "next";
import SecurityClient from "./SecurityClient";
import JsonLd from "@/app/_components/JsonLd";

export const metadata: Metadata = {
  title: "Security & Privacy Architecture",
  description:
    "How ChatBox AI safeguards your data: contractual zero model training guarantees, TLS 1.3 & AES-256 encryption, hashed API keys, DPDP Act compliance, and PCI-DSS Level 1 payment isolation.",
  alternates: {
    canonical: "https://chatboxai.co.in/security",
  },
  openGraph: {
    title: "Security & Privacy Architecture | ChatBox AI",
    description:
      "How ChatBox AI safeguards your data: contractual zero model training guarantees, TLS 1.3 & AES-256 encryption, hashed API keys, DPDP Act compliance, and PCI-DSS Level 1 payment isolation.",
    url: "https://chatboxai.co.in/security",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security & Privacy Architecture | ChatBox AI",
    description:
      "Zero model training guarantees, AES-256 encryption, and Indian DPDP Act compliance.",
  },
};

export default function SecurityPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chatboxai.co.in' },
      { '@type': 'ListItem', position: 2, name: 'Security & Privacy', item: 'https://chatboxai.co.in/security' },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <SecurityClient />
    </>
  );
}
