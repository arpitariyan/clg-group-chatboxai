import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://chatboxai.co.in';

// Static priority/frequency config for known routes
const STATIC_ROUTES = [
  {
    url: BASE_URL,
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/docs`,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/help-center`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/pricing`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/ai-models`,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/deep-research`,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/security`,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/developers`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/researchers`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/creators`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/privacy-policy`,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${BASE_URL}/terms-conditions`,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
];

/**
 * Reads all .md files from app/docs/md and generates dynamic sitemap entries
 * for every documentation guide page. This runs at build time / on request,
 * so no manual updates are needed when new guides are added.
 */
function getDocsSitemapEntries() {
  try {
    const docsDir = path.join(process.cwd(), 'app', 'docs', 'md');
    const files = fs.readdirSync(docsDir);

    return files
      .filter((file) => file.endsWith('.md') && file !== 'overview.md')
      .map((file) => {
        const slug = file.replace(/\.md$/, '');
        // Use file modification time as lastModified for accuracy
        let lastModified;
        try {
          const stat = fs.statSync(path.join(docsDir, file));
          lastModified = stat.mtime;
        } catch {
          // If the source timestamp is unavailable, omit lastModified rather than
          // claiming that the document was updated recently.
        }

        return {
          url: `${BASE_URL}/docs/${slug}`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      });
  } catch (err) {
    console.warn('[sitemap] Could not read docs directory:', err.message);
    return [];
  }
}

export default function sitemap() {
  const docsRoutes = getDocsSitemapEntries();
  return [...STATIC_ROUTES, ...docsRoutes];
}
