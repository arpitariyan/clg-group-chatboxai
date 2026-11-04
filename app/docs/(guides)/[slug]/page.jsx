import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import MarkdownCodeBlock from '../../_components/MarkdownCodeBlock';
import JsonLd from '@/app/_components/JsonLd';

const DOCS_DIR = path.join(process.cwd(), 'app/docs/md');

function formatSlugLabel(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function readDoc(slug) {
  const filePath = path.join(DOCS_DIR, `${slug}.md`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
}

function extractTitle(markdown, slug) {
  const titleLine = markdown
    .split('\n')
    .find((line) => line.trim().startsWith('# '));

  if (titleLine) {
    return titleLine.replace(/^#\s+/, '').trim();
  }

  return formatSlugLabel(slug);
}

/**
 * Extracts a plain-text snippet (first meaningful paragraph) from the markdown body.
 * Used as the SEO meta description for the guide page.
 */
function extractDescription(markdown, title) {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const clean = line.trim();
    // Skip headings, code fences, blank lines, and the title line
    if (!clean || clean.startsWith('#') || clean.startsWith('```') || clean.startsWith('---')) continue;
    if (clean === title) continue;
    // Return the first real paragraph, capped at 155 characters for Google snippet
    return clean.replace(/[`*_]/g, '').slice(0, 155);
  }
  return `ChatBox AI documentation guide: ${title}. Learn how to integrate and use ChatboxAI API in your applications.`;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const markdown = await readDoc(slug);

  if (!markdown) {
    return {
      title: 'Documentation not found | ChatboxAI',
    };
  }

  const title = extractTitle(markdown, slug);
  const description = extractDescription(markdown, title);

  return {
    title: `${title} | ChatboxAI Documentation`,
    description,
    // Explicit canonical prevents any duplicate-content risk from query params or trailing slashes
    alternates: {
      canonical: `https://chatboxai.co.in/docs/${slug}`,
    },
    openGraph: {
      title: `${title} | ChatboxAI Docs`,
      description,
      url: `https://chatboxai.co.in/docs/${slug}`,
      type: 'article',
    },
  };
}

export async function generateStaticParams() {
  const files = await fs.readdir(DOCS_DIR);

  return files
    .filter((file) => file.endsWith('.md') && file !== 'overview.md')
    .map((file) => ({
      slug: file.replace(/\.md$/, ''),
    }));
}

export default async function DocsGuidePage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const markdown = await readDoc(slug);

  if (!markdown) {
    notFound();
  }

  const title = extractTitle(markdown, slug);
  const description = extractDescription(markdown, title);
  const pageUrl = `https://chatboxai.co.in/docs/${slug}`;

  // TechArticle schema: helps Google and AI Overviews (RAG) correctly identify
  // and cite this page as a technical documentation resource.
  const techArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': pageUrl,
    headline: title,
    description,
    url: pageUrl,
    inLanguage: 'en-IN',
    author: {
      '@id': 'https://chatboxai.co.in/#organization',
    },
    publisher: {
      '@id': 'https://chatboxai.co.in/#organization',
    },
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://chatboxai.co.in/#website',
      name: 'ChatBox AI',
      url: 'https://chatboxai.co.in',
    },
  };

  // BreadcrumbList schema: renders clean visual breadcrumbs in Google SERP.
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://chatboxai.co.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Documentation',
        item: 'https://chatboxai.co.in/docs',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={techArticleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <article className="md-content" itemScope itemType="https://schema.org/TechArticle">
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--docs-text-faint)', marginBottom: '10px' }}>
          Documentation
        </div>
        <h1>{title}</h1>
        <p style={{ maxWidth: '820px' }}>
          Explore this guide to learn how ChatboxAI works and how to integrate it into your workflow.
        </p>
        <div style={{ marginTop: '18px' }}>
          <Link href="/docs" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}>
            <span>Back to overview</span>
          </Link>
        </div>
      </div>

        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            h1: ({ children }) => <h1>{children}</h1>,
            h2: ({ children }) => <h2>{children}</h2>,
            h3: ({ children }) => <h3>{children}</h3>,
            h4: ({ children }) => <h4>{children}</h4>,
            a: ({ href, children }) => {
              if (href?.startsWith('/')) {
                return <Link href={href}>{children}</Link>;
              }

              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
            pre: ({ children }) => {
              const codeElement = Array.isArray(children) ? children[0] : children;
              const codeProps = codeElement?.props;
              if (codeProps) {
                const { className, children: codeText } = codeProps;
                const match = /language-(\w+)/.exec(className || '');
                return (
                  <MarkdownCodeBlock
                    language={match?.[1]}
                    code={String(codeText || '').replace(/\n$/, '')}
                  />
                );
              }
              return <pre>{children}</pre>;
            },
            code: ({ className, children }) => {
              return <code className={className}>{children}</code>;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </>
  );
}
