import PrivacyClient from './PrivacyClient';
import JsonLd from '@/app/_components/JsonLd';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Learn how ChatBox AI protects your data, ensures privacy, and complies with Indian DPDP Act regulations with strict zero model training guarantees.',
  alternates: {
    canonical: 'https://chatboxai.co.in/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | ChatBox AI',
    description: 'Learn how ChatBox AI protects your data, ensures privacy, and complies with Indian DPDP Act regulations with strict zero model training guarantees.',
    url: 'https://chatboxai.co.in/privacy-policy',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy | ChatBox AI',
    description: 'Learn how ChatBox AI protects your data, ensures privacy, and complies with Indian DPDP Act regulations.',
  },
};

export default function PrivacyPolicyPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chatboxai.co.in' },
      { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: 'https://chatboxai.co.in/privacy-policy' },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <PrivacyClient />
    </>
  );
}