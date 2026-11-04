/**
 * Website Type Detector
 * Fast keyword-based classification — no API calls, instant.
 * Supports 12 distinct website types + 'generic' fallback.
 */

const TYPE_PATTERNS = [
    {
        type: 'portfolio',
        keywords: [
            'portfolio', 'personal website', 'my work', 'showcase', 'freelance',
            'cv website', 'resume site', 'developer portfolio', 'designer portfolio',
            'photographer portfolio', 'artist portfolio', 'ux designer', 'graphic designer',
        ],
    },
    {
        type: 'ecommerce',
        keywords: [
            'shop', 'online store', 'e-commerce', 'ecommerce', 'sell products',
            'buy online', 'cart', 'checkout', 'marketplace', 'clothing store',
            'fashion store', 'jewelry', 'jewellery', 'electronics store', 'dropshipping',
            'product catalog', 'woocommerce',
        ],
    },
    {
        type: 'saas',
        keywords: [
            'saas', 'software as a service', 'platform', 'analytics tool', 'dashboard',
            'productivity tool', 'crm', 'project management tool', 'api service',
            'b2b software', 'subscription app', 'app landing', 'tool landing',
            'web app', 'product landing',
        ],
    },
    {
        type: 'restaurant',
        keywords: [
            'restaurant', 'cafe', 'coffee shop', 'food', 'menu', 'dining',
            'bakery', 'pizza', 'sushi', 'burger', 'bar', 'pub', 'eatery',
            'catering', 'cloud kitchen',
        ],
    },
    {
        type: 'blog',
        keywords: [
            'blog', 'magazine', 'news website', 'articles', 'journal',
            'newsletter site', 'content website', 'writer', 'tech blog',
            'lifestyle blog', 'travel blog', 'personal blog',
        ],
    },
    {
        type: 'agency',
        keywords: [
            'agency', 'design studio', 'creative studio', 'marketing agency',
            'branding agency', 'web agency', 'digital agency', 'advertising agency',
            'it company', 'consulting firm', 'development agency',
        ],
    },
    {
        type: 'healthcare',
        keywords: [
            'hospital', 'clinic', 'doctor', 'medical', 'dentist', 'dental',
            'pharmacy', 'healthcare', 'health center', 'therapist', 'psychologist',
            'pediatric', 'wellness center', 'physiotherapy',
        ],
    },
    {
        type: 'education',
        keywords: [
            'school', 'course website', 'e-learning', 'learning platform',
            'online courses', 'tutorial site', 'academy', 'university website',
            'training platform', 'bootcamp', 'coaching', 'edtech',
        ],
    },
    {
        type: 'realestate',
        keywords: [
            'real estate', 'property', 'apartments for rent', 'houses for sale',
            'property listing', 'realtor', 'housing website', 'buy home',
            'rent apartment', 'real estate agency',
        ],
    },
    {
        type: 'startup',
        keywords: [
            'startup', 'product launch', 'coming soon', 'waitlist',
            'early access', 'beta launch', 'mvp landing', 'new product launch',
        ],
    },
    {
        type: 'events',
        keywords: [
            'event website', 'conference', 'concert', 'wedding website',
            'meetup', 'summit', 'hackathon', 'exhibition', 'festival',
            'seminar', 'webinar landing',
        ],
    },
    {
        type: 'nonprofit',
        keywords: [
            'ngo', 'nonprofit', 'charity', 'donation website', 'volunteer',
            'foundation', 'cause website', 'humanitarian', 'social impact',
            'fundraising',
        ],
    },
];

/**
 * Detect website type from prompt text.
 * Multi-word keyword matches score higher (more specific).
 * Returns type ID string or 'generic'.
 */
export function detectWebsiteType(prompt = '') {
    const lower = prompt.toLowerCase();

    let bestType  = 'generic';
    let bestScore = 0;

    for (const { type, keywords } of TYPE_PATTERNS) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                // Multi-word phrases score higher (more specific match)
                score += kw.split(' ').length + 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestType  = type;
        }
    }

    return bestScore >= 2 ? bestType : 'generic';
}

export const WEBSITE_TYPE_LABELS = {
    portfolio:  'Portfolio / Personal',
    ecommerce:  'E-Commerce Store',
    saas:       'SaaS / Product Landing',
    restaurant: 'Restaurant / Food & Beverage',
    blog:       'Blog / Magazine',
    agency:     'Creative Agency / Studio',
    healthcare: 'Healthcare / Medical',
    education:  'Education / E-Learning',
    realestate: 'Real Estate',
    startup:    'Startup / Product Launch',
    events:     'Events / Conference',
    nonprofit:  'NGO / Nonprofit',
    generic:    'General Purpose',
};

export function getWebsiteTypeLabel(type) {
    return WEBSITE_TYPE_LABELS[type] || 'General Purpose';
}
