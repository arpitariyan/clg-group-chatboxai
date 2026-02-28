/**
 * AI API Client for Website Builder  
 * Hybrid approach: a4f.co for prompts, OpenRouter for code generation
 */

import OpenAI from 'openai';

// A4F API keys for prompt enhancement
const A4F_API_KEYS = [
    process.env.NEXT_PUBLIC_A4F_API_KEY,
    process.env.NEXT_PUBLIC_A4F_API_KEY_2,
    process.env.NEXT_PUBLIC_A4F_API_KEY_3,
    process.env.NEXT_PUBLIC_A4F_API_KEY_4,
    process.env.A4F_API_KEY,
].filter(Boolean);

// OpenRouter API keys for code generation
const OPENROUTER_API_KEYS = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
].filter(Boolean);

// console.log(`[AI Client] Loaded ${A4F_API_KEYS.length} A4F keys (prompts) + ${OPENROUTER_API_KEYS.length} OpenRouter keys (code generation)`);

let a4fKeyIndex = 0;
let openrouterKeyIndex = 0;

// Get A4F client
function getA4FClient() {
    const apiKey = A4F_API_KEYS[a4fKeyIndex];
    a4fKeyIndex = (a4fKeyIndex + 1) % A4F_API_KEYS.length;
    return new OpenAI({
        baseURL: "https://api.a4f.co/v1",
        apiKey: apiKey,
    });
}

// Get OpenRouter client
function getOpenRouterClient() {
    const apiKey = OPENROUTER_API_KEYS[openrouterKeyIndex];
    openrouterKeyIndex = (openrouterKeyIndex + 1) % OPENROUTER_API_KEYS.length;
    return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
    });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhance prompt using a4f.co DeepSeek V3
 */
export async function enhancePrompt(userPrompt) {
    const systemPrompt = `You are a world-class web design consultant and UI/UX expert. Transform the user's basic request into a comprehensive, production-ready website specification that will result in a stunning, professional website.

CRITICAL: Provide SPECIFIC, ACTIONABLE details for every aspect. Be prescriptive, not suggestive.

## HERO SECTION (CRITICAL - This is the first impression!)
Design an absolutely stunning hero section that immediately captures attention:
- **Layout Pattern**: Choose from these proven templates:
  * Full-screen hero with centered content and background image/gradient
  * Split hero with image on one side, content on the other
  * Animated gradient background with floating elements
  * Video background with overlay content
  * 3D perspective hero with parallax scrolling
- **Visual Impact**: 
  * Specify exact gradient combinations (e.g., "from-violet-600 via-purple-600 to-indigo-600")
  * Include specific Unsplash image URL for background (use https://images.unsplash.com/photo-[id]?w=1920&q=80)
  * Add glassmorphism/frosted glass effects for content cards
  * Implement smooth scroll animations (fade-in, slide-up, scale effects)
- **Content Structure**:
  * Powerful headline with large, bold typography (text-5xl to text-7xl)
  * Compelling subheadline (text-xl to text-2xl)
  * Clear CTA buttons with contrasting colors and hover effects
  * Trust indicators (logos, stats, testimonials) if applicable

## COLOR PALETTE & DESIGN SYSTEM
Specify a complete, harmonious color scheme:
- **Primary Colors**: Define 2-3 brand colors with exact Tailwind classes (e.g., indigo-600, purple-500)
- **Gradients**: Provide specific gradient combinations (e.g., "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500")
- **Accents**: Specify accent colors for CTAs, highlights, and interactive elements
- **Dark Mode**: Include dark mode color variants if appropriate
- **Neutrals**: Define background (gray-50, gray-900), text (gray-800, gray-100), and border colors

## TYPOGRAPHY & FONTS
- **Font Pairing**: Specify Google Fonts combination (e.g., "Inter for headings, Poppins for body")
- **Hierarchy**: Define exact text sizes for h1 (text-5xl), h2 (text-4xl), h3 (text-3xl), body (text-base), etc.
- **Font Weights**: Specify weights for each text level (font-bold, font-semibold, font-medium)
- **Line Height & Spacing**: Include leading-tight, leading-relaxed as appropriate

## IMAGE INTEGRATION (Use Real, High-Quality Images)
Provide SPECIFIC Unsplash image URLs for each section:
- **Hero Background**: https://images.unsplash.com/photo-[choose based on topic]?w=1920&q=80
- **Feature Images**: 3-6 specific URLs matching the website topic
- **Background Patterns**: Suggest subtle patterns or textures
- **Icon Style**: Specify icon library (Lucide, Heroicons) and style

**IMAGE CATEGORIES BY TOPIC**:
- Business/Corporate: photo-1486406146926-c627a92ad1ab (office), photo-1454165804606-c3d57bc86b40 (desk)
- Technology: photo-1518770660439-4636190af475 (tech), photo-1550751827-4bd374c3f58b (code)
- Education: photo-1523240795612-9a054b0db644 (students), photo-1427504494785-3a9ca7044f45 (graduation)
- E-commerce: photo-1441986300917-64674bd600d8 (shopping), photo-1472851294608-062f824d29cc (products)
- Food/Restaurant: photo-1414235077428-338989a2e8c0 (restaurant), photo-1565299624946-b28f40a0ae38 (pizza)
- Fitness: photo-1534438327276-14e5300c3a48 (gym), photo-1571019614242-c5c5dee9f50b (yoga)
- Travel: photo-1488646953014-85cb44e25828 (travel), photo-1436491865332-7a61a109cc05 (beach)
- Real Estate: photo-1560518883-ce09059eeffa (house), photo-1600596542815-ffad4c1539a9 (modern home)
- Healthcare: photo-1576091160399-112ba8d25d1d (medical), photo-1505751172876-fa1923c5c528 (health)
- Finance: photo-1611974789855-9c2a0a7236a3 (finance), photo-1579621970563-ebec7560ff3e (analysis)

## SECTION-BY-SECTION LAYOUT
Define the complete page structure with specific sections:
1. **Navigation**: Sticky/fixed navbar, logo position, menu items, CTA button
2. **Hero Section**: (detailed above)
3. **Features Section**: 3-column grid with icons, cards with hover effects, specific layout
4. **About/Content Section**: 2-column layout, image placement, content hierarchy
5. **Services/Products**: Card grid (3 or 4 columns), pricing tables, comparison charts
6. **Testimonials**: Carousel or grid layout, avatar images, star ratings
7. **CTA Section**: Full-width banner with gradient, centered or split layout
8. **Footer**: Multi-column footer with links, social icons, newsletter signup

## ANIMATIONS & INTERACTIONS
Specify smooth, professional animations:
- **On Scroll**: Fade-in effects for sections (use Intersection Observer)
- **Hover Effects**: Card lifts (hover:scale-105), button animations, color transitions
- **Page Load**: Staggered animations for hero content
- **Transitions**: Smooth transitions for all interactive elements (transition-all duration-300)
- **Micro-interactions**: Button ripples, input focus effects, loading states

## RESPONSIVE DESIGN
- **Mobile-First**: Design for mobile screens first, then scale up
- **Breakpoints**: Specify behavior for sm, md, lg, xl, 2xl screens
- **Touch-Friendly**: Larger tap targets (min 44px), proper spacing
- **Performance**: Lazy loading for images, optimized animations

## UI PATTERNS & COMPONENTS
Include modern, polished UI elements:
- **Cards**: Rounded corners (rounded-xl), shadows (shadow-lg), hover effects
- **Buttons**: Primary (filled), secondary (outline), sizes, icon buttons
- **Forms**: Floating labels, validation states, modern input styling
- **Glassmorphism**: backdrop-blur-lg, bg-white/30 for overlay elements
- **Gradients**: Mesh gradients, animated gradients for backgrounds
- **Shadows**: Layered shadows for depth, colored shadows for accent

## ACCESSIBILITY & BEST PRACTICES
- **Semantic HTML**: Proper heading hierarchy, landmark elements
- **ARIA Labels**: All interactive elements labeled
- **Color Contrast**: WCAG AA compliance minimum
- **Keyboard Navigation**: Tab order, focus states, skip links
- **Alt Text**: Descriptive alt text for all images

## OUTPUT FORMAT
Transform the user's request into a detailed specification following this structure:

"Create a [adjective] [type] website for [purpose]:

HERO SECTION: [Specific hero design with exact gradient, image URL, text sizes, CTA placement]

COLOR PALETTE: Primary: [colors], Gradients: [specific gradients], Accents: [colors]

TYPOGRAPHY: Headings: [font, sizes], Body: [font, size], Special: [decorative font if needed]

IMAGES: 
- Hero: https://images.unsplash.com/photo-[ID]?w=1920&q=80
- Feature 1: https://images.unsplash.com/photo-[ID]?w=800&q=80
- Feature 2: https://images.unsplash.com/photo-[ID]?w=800&q=80
[etc.]

SECTIONS:
1. Navbar: [specific design]
2. Hero: [full specification]
3. Features: [layout, content, styling]
4. [Additional sections...]
5. Footer: [design]

ANIMATIONS: [Specific effects for each section]

RESPONSIVE: [Mobile, tablet, desktop specifications]"

Remember: Be SPECIFIC. Use exact Tailwind classes, exact image URLs, exact color names. The more detailed you are, the better the final website will be.`;

    // Try a4f.co with multiple keys
    for (let attempt = 1; attempt <= A4F_API_KEYS.length; attempt++) {
        try {
            const client = getA4FClient();
            const keyPreview = client.apiKey?.substring(0, 12) + '...';

            // console.log(`[Prompt Enhancement] Attempt ${attempt}/${A4F_API_KEYS.length} (a4f.co ${keyPreview})`);

            const response = await client.chat.completions.create({
                model: 'provider-8/deepseek-v3',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `User's request: "${userPrompt}"` }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                timeout: 60000,
            });

            const result = response.choices[0]?.message?.content;
            if (result) {
                // console.log(`✅ [Prompt Enhancement] Success with a4f.co ${keyPreview}`);
                return result;
            }
        } catch (error) {
            console.warn(`⚠️ [Prompt Enhancement] Attempt ${attempt} failed: ${error.message}`);
            if (attempt === A4F_API_KEYS.length) {
                console.error('All a4f.co keys failed, using fallback');
            }
        }
    }

    // Fallback
    return `Create a modern, responsive website for: ${userPrompt}. Use clean design, good typography, and smooth animations.`;
}

/**
 * Generate website using OpenRouter DeepSeek R1T2 Chimera (free & excellent for code)
 */
export async function generateWebsite(enhancedPrompt, conversationHistory = []) {
    const systemPrompt = `You are a world-class web developer specializing in creating stunning, production-ready websites.

CRITICAL REQUIREMENTS:

📋 **CODE FORMAT**:
- Return ONLY the complete HTML code
- NO explanations, NO markdown formatting, NO code blocks
- Just pure, clean HTML that can be directly rendered

🎨 **STYLING**:
- Use Tailwind CSS EXCLUSIVELY for ALL styling (include CDN in <head>)
- NO custom CSS, NO style tags, NO inline styles
- Use Tailwind utility classes for everything
- Include smooth transitions (transition-all duration-300) on interactive elements
- Use modern color combinations and gradients exactly as specified in the prompt

✨ **HERO SECTION (CRITICAL)**:
- This is the MOST IMPORTANT part - make it absolutely stunning
- Implement EXACTLY the hero design specified in the enhanced prompt
- Use the EXACT Unsplash image URLs provided
- Full-screen or prominent hero with powerful visual impact
- Large, bold typography for headlines (text-5xl, text-6xl, text-7xl)
- Clear, contrasting CTA buttons with hover effects
- Smooth scroll-triggered animations (fade-in, slide-up)
- Modern effects: glassmorphism, gradients, shadows

🖼️ **IMAGES**:
- Use EXACT Unsplash URLs from the enhanced prompt
- Format: <img src="https://images.unsplash.com/photo-[ID]?w=[width]&q=80" alt="descriptive text">
- Include proper alt text for accessibility
- Use appropriate image sizes: w=1920 for hero, w=800 for features, w=400 for thumbnails
- Add object-cover and proper aspect ratios for responsive images

💫 **ANIMATIONS & INTERACTIONS**:
- Implement Intersection Observer for scroll animations
- Add these CSS classes for animations:
  * opacity-0 → opacity-100 (fade-in)
  * translate-y-10 → translate-y-0 (slide-up)
  * scale-95 → scale-100 (scale-in)
- Hover effects on all cards and buttons (hover:scale-105, hover:shadow-xl)
- Smooth transitions on all interactive elements
- Staggered animations for multiple elements (use setTimeout delays)

🎯 **LAYOUT & SECTIONS**:
- Modern, clean layout with proper spacing (py-16, py-20 for sections)
- Implement ALL sections from the enhanced prompt
- Use semantic HTML5: <header>, <nav>, <main>, <section>, <footer>
- 3 or 4 column grids for features/services (grid-cols-1 md:grid-cols-3)
- Proper content hierarchy with clear visual flow

📱 **RESPONSIVE DESIGN**:
- Mobile-first approach with Tailwind breakpoints
- Perfect layout on mobile (sm:), tablet (md:, lg:), and desktop (xl:, 2xl:)
- Touch-friendly buttons and links (min-h-12, p-4)
- Readable text sizes on all devices
- Collapsible mobile menu with hamburger icon (if needed)

🎨 **UI COMPONENTS**:
- Modern cards with rounded-xl, shadow-lg, and hover effects
- Glassmorphism where appropriate (backdrop-blur-lg, bg-white/10)
- Gradient backgrounds and accents (bg-gradient-to-br)
- Proper button styles: primary (filled bg with hover), secondary (outline)
- Modern form inputs with focus states and validation styling

♿ **ACCESSIBILITY**:
- Proper semantic HTML with correct heading hierarchy (h1 → h6)
- ARIA labels on all interactive elements
- Alt text for all images
- Keyboard navigation support
- Sufficient color contrast (WCAG AA minimum)
- Focus states on all interactive elements (focus:ring-2)

⚡ **PERFORMANCE & QUALITY**:
- Clean, semantic, well-structured HTML
- Efficient use of Tailwind classes (no redundancy)
- Lazy loading for images: loading="lazy"
- Optimized JavaScript (vanilla JS, no frameworks unless specified)
- Include all JavaScript in <script> tags before closing </body>
- Full-featured, interactive, production-ready code

🔧 **TECHNICAL SETUP**:
- Proper DOCTYPE: <!DOCTYPE html>
- Complete <head> with:
  * Meta tags (viewport, charset)
  * Title tag
  * Tailwind CSS CDN
  * Google Fonts if specified in prompt
  * Lucide icons CDN if icons needed
- All JavaScript at bottom of <body> before </body>

🎬 **SAMPLE ANIMATION CODE**:
Include this type of scroll animation implementation:
<script>
  // Smooth scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100', 'translate-y-0', 'scale-100');
        entry.target.classList.remove('opacity-0', 'translate-y-10', 'scale-95');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
</script>

REMEMBER: Follow the enhanced prompt EXACTLY. Use the specific colors, gradients, fonts, images, and layouts provided. The goal is to create a website that looks professional, modern, and polished - something that could be deployed immediately.

Return ONLY the HTML code, nothing else.`;

    // Try OpenRouter with multiple keys
    for (let attempt = 1; attempt <= OPENROUTER_API_KEYS.length; attempt++) {
        try {
            const client = getOpenRouterClient();
            const keyPreview = client.apiKey?.substring(0, 15) + '...';

            // console.log(`[Code Generation] Attempt ${attempt}/${OPENROUTER_API_KEYS.length} (OpenRouter ${keyPreview})`);

            const response = await client.chat.completions.create({
                model: 'tngtech/deepseek-r1t2-chimera:free',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: enhancedPrompt }
                ],
                temperature: 0.8,
                max_tokens: 8000,
                timeout: 180000, // 3 minutes
            });

            let code = response.choices[0]?.message?.content || '';

            // Clean up - remove markdown code blocks
            code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

            // Ensure proper DOCTYPE
            if (!code.toLowerCase().startsWith('<!doctype html>')) {
                code = '<!DOCTYPE html>\n' + code;
            }

            // console.log(`✅ [Code Generation] Success with OpenRouter ${keyPreview}`);
            return code;

        } catch (error) {
            console.warn(`⚠️ [Code Generation] Attempt ${attempt} failed: ${error.message}`);

            // Check if rate limited or payment error
            if (error.status === 429) {
                console.warn('Rate limited, trying next key...');
                continue;
            }
            if (error.status === 402) {
                console.warn('Payment required, trying next key...');
                continue;
            }

            if (attempt === OPENROUTER_API_KEYS.length) {
                throw new Error(`Failed to generate website after ${OPENROUTER_API_KEYS.length} attempts: ${error.message}`);
            }
        }
    }

    throw new Error('Failed to generate website after trying all OpenRouter API keys');
}

/**
 * Generate revision using OpenRouter DeepSeek R1T2 Chimera
 */
export async function generateRevision(currentCode, revisionRequest, conversationHistory = []) {
    const systemPrompt = `You are a world-class web developer updating an existing website.

CRITICAL REQUIREMENTS:

📋 **CODE FORMAT**:
- Return ONLY the complete updated HTML code with the requested changes
- NO explanations, NO markdown formatting, NO code blocks
- Just pure, clean HTML that can be directly rendered

🎨 **MAINTAIN QUALITY**:
- Keep ALL existing styling quality and polish
- Use Tailwind CSS EXCLUSIVELY (NO custom CSS)
- Preserve all animations and interactions unless asked to change them
- Maintain the professional, modern aesthetic
- Keep all Unsplash images unless specifically asked to change them

✨ **APPLY CHANGES**:
- Implement EXACTLY what the user requested
- Make changes while preserving the overall design quality
- If adding new sections, match the existing design style
- If modifying colors, ensure they're harmonious with the palette
- If changing layout, maintain responsiveness and mobile-first approach

💫 **PRESERVE FEATURES**:
- Keep scroll animations and Intersection Observer code
- Maintain hover effects and transitions
- Preserve responsive breakpoints
- Keep accessibility features (ARIA labels, alt text, semantic HTML)
- Maintain proper heading hierarchy

🔧 **TECHNICAL**:
- Ensure complete, valid HTML with proper DOCTYPE
- Include all necessary CDNs (Tailwind, fonts, icons)
- Keep JavaScript at bottom before </body>
- Maintain clean, semantic structure

REMEMBER: Make the requested changes while maintaining the high quality of the original website. Return ONLY the complete updated HTML code, nothing else.`;

    // Try OpenRouter with multiple keys
    for (let attempt = 1; attempt <= OPENROUTER_API_KEYS.length; attempt++) {
        try {
            const client = getOpenRouterClient();
            const keyPreview = client.apiKey?.substring(0, 15) + '...';

            // console.log(`[Code Revision] Attempt ${attempt}/${OPENROUTER_API_KEYS.length} (OpenRouter ${keyPreview})`);

            const response = await client.chat.completions.create({
                model: 'tngtech/deepseek-r1t2-chimera:free',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Current code:\n${currentCode}\n\nUser's request: ${revisionRequest}` }
                ],
                temperature: 0.7,
                max_tokens: 8000,
                timeout: 180000, // 3 minutes
            });

            let code = response.choices[0]?.message?.content || currentCode;

            // Clean up
            code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

            // Ensure proper DOCTYPE
            if (!code.toLowerCase().startsWith('<!doctype html>')) {
                code = '<!DOCTYPE html>\n' + code;
            }

            // console.log(`✅ [Code Revision] Success with OpenRouter ${keyPreview}`);
            return code;

        } catch (error) {
            console.warn(`⚠️ [Code Revision] Attempt ${attempt} failed: ${error.message}`);

            // Check errors
            if (error.status === 429 || error.status === 402) {
                console.warn('Rate limited or payment error, trying next key...');
                continue;
            }

            if (attempt === OPENROUTER_API_KEYS.length) {
                throw new Error(`Failed to generate revision after ${OPENROUTER_API_KEYS.length} attempts: ${error.message}`);
            }
        }
    }

    throw new Error('Failed to generate revision after trying all OpenRouter API keys');
}
