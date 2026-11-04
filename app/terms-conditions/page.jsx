import TermsClient from './TermsClient';
import JsonLd from '@/app/_components/JsonLd';

export const metadata = {
  title: 'Terms of Service',
  description: 'Read the Terms of Service for ChatBox AI. Understand the rules, billing terms, acceptable use, and developer agreements for using our multi-model AI platform.',
  alternates: {
    canonical: 'https://chatboxai.co.in/terms-conditions',
  },
  openGraph: {
    title: 'Terms of Service | ChatBox AI',
    description: 'Read the Terms of Service for ChatBox AI. Understand the rules, billing terms, acceptable use, and developer agreements for using our multi-model AI platform.',
    url: 'https://chatboxai.co.in/terms-conditions',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service | ChatBox AI',
    description: 'Read the Terms of Service for ChatBox AI. Understand user rules and platform guidelines.',
  },
};

export default function TermsConditionsPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chatboxai.co.in' },
      { '@type': 'ListItem', position: 2, name: 'Terms of Service', item: 'https://chatboxai.co.in/terms-conditions' },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <TermsClient />
    </>
  );
}