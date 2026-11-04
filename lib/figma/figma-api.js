/**
 * Figma API Client
 * Handles all communication with the Figma REST API (api.figma.com/v1)
 * Includes automatic rate limiting retry with exponential backoff (up to 3 retries)
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * Makes a request to the Figma API with automatic rate limit handling.
 * On 429 responses, retries up to 3 times with exponential backoff,
 * respecting the Retry-After header if present.
 */
async function figmaFetch(accessToken, endpoint, options = {}) {
  const url = `${FIGMA_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.status === 429) {
        if (attempt >= MAX_RETRIES) {
          throw new Error('Figma API rate limit exceeded after maximum retries');
        }

        // Use Retry-After header if available, otherwise exponential backoff
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_BACKOFF_MS * Math.pow(2, attempt);

        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Figma API error (${response.status}): ${errorBody || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      // Only retry on rate limit (handled above) — other errors throw immediately
      if (!error.message?.includes('rate limit')) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Figma API request failed after retries');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a Figma file by its file key.
 * Returns the full file document including pages, components, and styles.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The file key from the Figma URL
 * @returns {Promise<object>} FigmaFileResponse
 */
export async function getFigmaFile(accessToken, fileKey) {
  return figmaFetch(accessToken, `/files/${fileKey}`);
}

/**
 * Get specific nodes from a Figma file.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The file key from the Figma URL
 * @param {string[]} nodeIds - Array of node IDs to retrieve
 * @returns {Promise<object>} FigmaNodesResponse
 */
export async function getFigmaNodes(accessToken, fileKey, nodeIds) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  return figmaFetch(accessToken, `/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`);
}

/**
 * Get rendered images for nodes in a Figma file.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The file key from the Figma URL
 * @param {string[]} nodeIds - Array of node IDs to render
 * @param {string} [format='png'] - Image format: png, jpg, svg, pdf
 * @param {number} [scale=1] - Image scale (0.01 to 4)
 * @returns {Promise<object>} FigmaImagesResponse
 */
export async function getFigmaImages(accessToken, fileKey, nodeIds, format = 'png', scale = 1) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  const params = new URLSearchParams({
    ids,
    format,
    scale: String(scale),
  });
  return figmaFetch(accessToken, `/images/${fileKey}?${params.toString()}`);
}

/**
 * Get published styles for a Figma file.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The file key from the Figma URL
 * @returns {Promise<object>} FigmaStylesResponse
 */
export async function getFigmaFileStyles(accessToken, fileKey) {
  return figmaFetch(accessToken, `/files/${fileKey}/styles`);
}

/**
 * Get local variables for a Figma file.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} fileKey - The file key from the Figma URL
 * @returns {Promise<object>} FigmaVariablesResponse
 */
export async function getFigmaVariables(accessToken, fileKey) {
  return figmaFetch(accessToken, `/files/${fileKey}/variables/local`);
}

/**
 * Get projects for a Figma team.
 * @param {string} accessToken - Figma OAuth access token
 * @param {string} teamId - The team ID
 * @returns {Promise<object>} FigmaProjectsResponse
 */
export async function getFigmaTeamProjects(accessToken, teamId) {
  return figmaFetch(accessToken, `/teams/${teamId}/projects`);
}

/**
 * Get the authenticated user's info.
 * @param {string} accessToken - Figma OAuth access token
 * @returns {Promise<object>} FigmaUserResponse
 */
export async function getFigmaUserInfo(accessToken) {
  return figmaFetch(accessToken, '/me');
}
