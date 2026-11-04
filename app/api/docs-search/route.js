import fs from 'fs/promises';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (!query || query.length < 2) {
    return Response.json([]);
  }

  try {
    const docsDir = path.join(process.cwd(), 'app/docs/md');
    const files = await fs.readdir(docsDir);

    const results = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(docsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      const lines = content.split('\n');
      let title = file.replace('.md', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      // Extract first H1 as title
      for (const line of lines) {
        if (line.startsWith('# ')) {
          title = line.replace('# ', '').replace(/\*\*/g, '').trim();
          break;
        }
      }

      const contentLower = content.toLowerCase();
      const titleLower = title.toLowerCase();

      // Check if query exists in title or content
      const titleMatch = titleLower.includes(query);
      const contentMatchIndex = contentLower.indexOf(query);

      if (titleMatch || contentMatchIndex !== -1) {
        let snippet = '';
        
        if (contentMatchIndex !== -1) {
          // Extract a 100 character window around the match
          const start = Math.max(0, contentMatchIndex - 50);
          const end = Math.min(content.length, contentMatchIndex + query.length + 50);
          snippet = content.substring(start, end).replace(/\n/g, ' ').replace(/`/g, '').trim();
          
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
        } else {
          // If only title matched, grab the first paragraph as snippet
          for (const line of lines) {
            if (line.trim().length > 20 && !line.startsWith('#')) {
              snippet = line.substring(0, 100).replace(/`/g, '') + '...';
              break;
            }
          }
        }

        results.push({
          title,
          slug: file === 'overview.md' ? '/docs' : `/docs/${file.replace('.md', '')}`,
          snippet,
          score: titleMatch ? 100 : 10 // Give massive weight to title matches
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Return top 8 results
    return Response.json(results.slice(0, 8));

  } catch (error) {
    console.error('Docs search error:', error);
    return Response.json({ error: 'Failed to search documentation' }, { status: 500 });
  }
}
