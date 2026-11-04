import { NextResponse } from 'next/server';

const GITHUB_REPO = 'arpitariyan/chatboxai-app';
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Normalizes a single GitHub release object into the shape our UI expects.
 * @param {object} release - Raw release object from GitHub API
 * @returns {object} Normalized release
 */
function normalizeRelease(release) {
  if (!release) return null;
  const apkAsset = release.assets?.find((a) => a.name?.toLowerCase().endsWith('.apk')) ?? null;

  return {
    id: release.id,
    tagName: release.tag_name,
    name: release.name || release.tag_name,
    body: release.body || '',
    publishedAt: release.published_at,
    htmlUrl: release.html_url,
    prerelease: release.prerelease ?? false,
    draft: release.draft ?? false,
    apk: apkAsset
      ? {
          name: apkAsset.name,
          downloadUrl: apkAsset.browser_download_url,
          size: apkAsset.size,
          downloadCount: apkAsset.download_count,
          contentType: apkAsset.content_type,
        }
      : null,
    assets: (release.assets ?? []).map((a) => ({
      name: a.name,
      downloadUrl: a.browser_download_url,
      size: a.size,
      downloadCount: a.download_count,
    })),
  };
}

/**
 * GET /api/github/releases
 * Query params:
 *   ?latest=true  → returns only the latest release (with fallback to first release)
 *   ?per_page=N   → number of releases to fetch (default 10, max 30)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const latestOnly = searchParams.get('latest') === 'true';
  const perPage = Math.min(30, parseInt(searchParams.get('per_page') || '10', 10));

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ChatBoxAI-Landing/1.0',
  };

  // Attach token if available (raises rate limit from 60 to 5000/hour)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    if (latestOnly) {
      // First try /releases/latest
      let res = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`, {
        headers,
        next: { revalidate: 3600 },
      });

      // If 404 (e.g. only prereleases exist), fallback to /releases?per_page=1
      if (!res.ok) {
        res = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases?per_page=1`, {
          headers,
          next: { revalidate: 3600 },
        });

        if (res.ok) {
          const list = await res.json();
          const first = Array.isArray(list) && list.length > 0 ? list[0] : null;
          return NextResponse.json(normalizeRelease(first), {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
            },
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(normalizeRelease(data), {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
          },
        });
      }

      return NextResponse.json(null, { status: 200 });
    }

    // List of releases
    const endpoint = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases?per_page=${perPage}`;
    const res = await fetch(endpoint, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[GitHub Releases API] HTTP ${res.status}:`, errorBody);
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    const normalized = (Array.isArray(data) ? data : []).map(normalizeRelease);

    return NextResponse.json(normalized, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[GitHub Releases API] Fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub releases' },
      { status: 500 }
    );
  }
}
