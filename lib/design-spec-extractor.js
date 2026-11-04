import Groq from 'groq-sdk';
import { getNextKey, recordSuccess, recordFailure } from '@/lib/api-key-manager';

/**
 * Design Spec Extractor
 * 
 * Uses Groq API with intelligent key rotation to extract UI structure, colors, and layout
 * from design descriptions (text-based design briefs).
 * 
 * Note: Groq doesn't support image analysis, so this accepts
 * a text description of the design instead.
 */

// Groq API keys from environment
const GROQ_API_KEYS = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
].filter(k => k && typeof k === 'string' && k.trim());

/**
 * Get a Groq client with automatic key rotation
 */
function getGroqClient() {
    const key = getNextKey('groq');
    if (!key) throw new Error('No Groq API keys available for design extraction');
    
    return {
        key,
        client: new Groq({ apiKey: key, timeout: 180_000, maxRetries: 0 })
    };
}

/**
 * Design Specification Schema
 * Structured output from vision analysis
 */
const DesignSpecSchema = {
    type: 'object',
    properties: {
        theme: {
            type: 'object',
            description: 'Color theme extracted from design',
            properties: {
                primaryColor: { type: 'string', description: 'Primary color hex, or name' },
                secondaryColor: { type: 'string', description: 'Secondary color hex or name' },
                accentColor: { type: 'string', description: 'Accent color if any' },
                backgroundColor: { type: 'string', description: 'Main background color' },
                textColor: { type: 'string', description: 'Primary text color' },
                isDarkMode: { type: 'boolean', description: 'Dark or light theme' }
            }
        },
        layout: {
            type: 'object',
            description: 'Layout structure',
            properties: {
                style: { type: 'string', enum: ['minimalist', 'modern', 'classic', 'glassmorphism', 'neumorphism'] },
                spacing: { type: 'string', description: 'Spacing style: compact, comfortable, spacious' },
                alignment: { type: 'string', description: 'Left, center, or justified' }
            }
        },
        typography: {
            type: 'object',
            description: 'Typography details',
            properties: {
                headingFont: { type: 'string', description: 'Font family for headers' },
                bodyFont: { type: 'string', description: 'Font family for body text' },
                headingSize: { type: 'string', description: 'Relative heading size: small, medium, large' },
                fontWeight: { type: 'string', description: 'Bold, semi-bold, or regular' }
            }
        },
        components: {
            type: 'array',
            description: 'Key UI components identified',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Component name' },
                    style: { type: 'string', description: 'Style: solid, outline, ghost, rounded, sharp' },
                    primaryColor: { type: 'string', description: 'Component primary color' }
                }
            }
        },
        pages: {
            type: 'array',
            description: 'Pages/sections visible in design',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Page/section name' },
                    sections: { type: 'array', items: { type: 'string' }, description: 'Sections within page' },
                    purpose: { type: 'string', description: 'What this page does' }
                }
            }
        },
        animations: {
            type: 'array',
            description: 'Hint at animation style if indicated',
            items: { type: 'string' }
        },
        notes: {
            type: 'array',
            description: 'Additional design notes or constraints',
            items: { type: 'string' }
        }
    }
};

/**
 * Extract design spec from a text description with automatic key rotation
 * @param {string} designDescription - Text description of the design
 * @param {string} userHint - Optional additional design hints
 * @returns {Promise<object>} Design specification
 */
export async function extractDesignSpecFromImage(designDescription, userHint = null) {
    if (!GROQ_API_KEYS.length) {
        throw new Error('No Groq API keys configured');
    }

    const maxAttempts = GROQ_API_KEYS.length;
    let attemptCount = 0;

    while (attemptCount < maxAttempts) {
        attemptCount++;
        
        let clientInfo;
        try {
            clientInfo = getGroqClient();
        } catch (e) {
            console.error(`[Design Spec] ❌ No available Groq keys: ${e.message}`);
            throw e;
        }

        const { key, client } = clientInfo;
        const keyNum = GROQ_API_KEYS.indexOf(key) + 1;

        try {
            console.log(`[Design Spec] 🚀 Analyzing with Key #${keyNum}/${GROQ_API_KEYS.length}`);

            const response = await client.chat.completions.create({
                model: 'mixtral-8x7b-32768',
                max_tokens: 1024,
                messages: [
                    {
                        role: 'user',
                        content: buildDesignExtractionPrompt(designDescription, userHint)
                    }
                ]
            });

            const responseText = response.choices[0]?.message?.content || '';
            
            if (!responseText.trim()) {
                console.warn(`[Design Spec] Empty response from Key #${keyNum}, trying next key`);
                recordFailure('groq', key, 'Empty response');
                continue;
            }
            
            // Parse JSON response
            const designSpec = parseDesignSpec(responseText);
            
            console.log(`[Design Spec] ✅ Successfully extracted design spec with Key #${keyNum}`);
            recordSuccess('groq', key);
            return designSpec;

        } catch (error) {
            const errMsg = error.message || '';
            const status = Number(error?.status || error?.response?.status || 0);
            
            // Rate limit: Retry after delay
            if (status === 429 || errMsg.includes('rate_limit')) {
                console.warn(`[Design Spec] 429 Rate Limited on Key #${keyNum}. Retrying...`);
                recordFailure('groq', key, '429 Rate Limit');
                await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
                continue;
            }
            
            // Any other error: Try next key
            console.warn(`[Design Spec] ❌ Key #${keyNum} failed: ${errMsg.slice(0, 80)}`);
            recordFailure('groq', key, errMsg);
        }
    }

    throw new Error(`Failed to extract design spec: exhausted all ${GROQ_API_KEYS.length} API keys`);
}

/**
 * Build the prompt for design extraction from text description
 */
function buildDesignExtractionPrompt(designDescription, userHint = null) {
    const hint = userHint ? `\n\nAdditional hint: ${userHint}` : '';
    
    return `You are a UI/UX designer analyzing a design description.
Extract the design system, color palette, typography, layout style, and component details from the description.

Design Description:
${designDescription}${hint}

IMPORTANT: Respond with ONLY a JSON object (no markdown, no code blocks, no explanations) following this structure:
{
  "theme": {
    "primaryColor": "#HEX or color name",
    "secondaryColor": "#HEX or color name",
    "accentColor": "#HEX or color name",
    "backgroundColor": "#HEX or color name",
    "textColor": "#HEX or color name",
    "isDarkMode": true/false
  },
  "layout": {
    "style": "minimalist|modern|classic|glassmorphism|neumorphism",
    "spacing": "compact|comfortable|spacious",
    "alignment": "left|center|justified"
  },
  "typography": {
    "headingFont": "Font family name",
    "bodyFont": "Font family name",
    "headingSize": "small|medium|large",
    "fontWeight": "normal|600|700"
  },
  "components": [
    { "name": "button", "style": "solid|outline|ghost|rounded|sharp", "primaryColor": "#HEX" }
  ],
  "pages": [
    { "name": "Home", "sections": ["Hero", "Features"], "purpose": "Landing page" }
  ],
  "animations": ["fade-in", "slide-up"],
  "notes": ["Use glassmorphism", "Mobile-first"]
}

Extract from the description:
1. Colors/theme mentioned
2. Layout structure and spacing
3. Typography/font preferences
4. UI components described
5. Pages/sections mentioned
6. Animation hints if any
7. Any design notes or constraints`;
}

/**
 * Parse design spec from response text
 */
function parseDesignSpec(text) {
    try {
        // Try to find JSON in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('[Design Spec] No JSON found in response');
            return getDefaultDesignSpec();
        }

        const spec = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize
        return normalizeDesignSpec(spec);
    } catch (parseErr) {
        console.warn('[Design Spec] Failed to parse response:', parseErr.message);
        return getDefaultDesignSpec();
    }
}

/**
 * Normalize design spec to ensure all required fields
 */
function normalizeDesignSpec(spec) {
    return {
        theme: {
            primaryColor: spec?.theme?.primaryColor || '#0ea5e9',
            secondaryColor: spec?.theme?.secondaryColor || '#06b6d4',
            accentColor: spec?.theme?.accentColor || '#ec4899',
            backgroundColor: spec?.theme?.backgroundColor || '#0f0f0f',
            textColor: spec?.theme?.textColor || '#ffffff',
            isDarkMode: spec?.theme?.isDarkMode !== false
        },
        layout: {
            style: spec?.layout?.style || 'modern',
            spacing: spec?.layout?.spacing || 'comfortable',
            alignment: spec?.layout?.alignment || 'center'
        },
        typography: {
            headingFont: spec?.typography?.headingFont || 'Inter, system-ui, sans-serif',
            bodyFont: spec?.typography?.bodyFont || 'Inter, system-ui, sans-serif',
            headingSize: spec?.typography?.headingSize || 'large',
            fontWeight: spec?.typography?.fontWeight || '700'
        },
        components: (spec?.components || []).map(c => ({
            name: c.name || 'component',
            style: c.style || 'solid',
            primaryColor: c.primaryColor || '#0ea5e9'
        })),
        pages: (spec?.pages || []).map(p => ({
            name: p.name || 'Page',
            sections: p.sections || [],
            purpose: p.purpose || ''
        })),
        animations: spec?.animations || ['fade-in', 'slide-up'],
        notes: spec?.notes || []
    };
}

/**
 * Get default design spec fallback
 */
function getDefaultDesignSpec() {
    return {
        theme: {
            primaryColor: '#0ea5e9',
            secondaryColor: '#06b6d4',
            accentColor: '#ec4899',
            backgroundColor: '#0f0f0f',
            textColor: '#ffffff',
            isDarkMode: true
        },
        layout: {
            style: 'modern',
            spacing: 'comfortable',
            alignment: 'center'
        },
        typography: {
            headingFont: 'Inter, system-ui, sans-serif',
            bodyFont: 'Inter, system-ui, sans-serif',
            headingSize: 'large',
            fontWeight: '700'
        },
        components: [
            { name: 'button', style: 'solid', primaryColor: '#0ea5e9' },
            { name: 'card', style: 'rounded', primaryColor: '#ffffff' }
        ],
        pages: [],
        animations: ['fade-in', 'slide-up'],
        notes: ['Dark theme', 'Modern style']
    };
}

/**
 * Convert design spec to AI prompt for code generation
 */
export function designSpecToPrompt(spec) {
    const parts = [
        `Design Constraints:`,
        `- Theme: ${spec.theme.isDarkMode ? 'Dark' : 'Light'} mode`,
        `- Primary Color: ${spec.theme.primaryColor}`,
        `- Layout Style: ${spec.layout.style}`,
        `- Typography: ${spec.typography.headingFont} (headings), ${spec.typography.bodyFont} (body)`,
        `- Spacing: ${spec.layout.spacing}`,
        spec.components.length > 0 ? `- Components: ${spec.components.map(c => c.name).join(', ')}` : null,
        spec.pages.length > 0 ? `- Pages/Sections: ${spec.pages.map(p => p.name).join(', ')}` : null,
        spec.animations.length > 0 ? `- Animations: ${spec.animations.join(', ')}` : null,
        spec.notes.length > 0 ? `- Notes: ${spec.notes.join('; ')}` : null
    ].filter(Boolean).join('\n');

    return `Use this design specification as the source of truth:\n${parts}`;
}
