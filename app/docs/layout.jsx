import { Navigation } from '@/components/docs/Navigation';
import { Sidebar } from '@/components/docs/Sidebar';
import '@/styles/docs.css';

export const metadata = {
  title: 'ChatBox AI API Documentation',
  description: 'Official API documentation for ChatBox AI — access GPT-4o, Claude 3.5, Gemini Pro and more through one unified, OpenAI-compatible API endpoint.',
  alternates: {
    canonical: 'https://chatboxai.co.in/docs',
  },
  openGraph: {
    title: 'ChatBox AI API Documentation',
    url: 'https://chatboxai.co.in/docs',
    type: 'website',
  },
};

export default function DocsLayout({ children }) {
  return (
    <div className="docs-container">
      <Navigation />
      <div className="docs-main">
        <Sidebar />
        <div className="docs-content">
          <div className="docs-content-inner">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
