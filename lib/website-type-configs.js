/**
 * Website Type Configurations
 * Each entry defines: pages, components, designSystem, images, and
 * a systemPromptAddendum that gets injected into the task-executor prompt
 * so the AI generates type-specific code patterns.
 */

export const WEBSITE_TYPE_CONFIGS = {

    // ── Portfolio ─────────────────────────────────────────────────────────────
    portfolio: {
        label: 'Portfolio / Personal Website',
        pages: [
            { name: 'Home',     route: '/',         description: 'Animated hero with avatar & typing effect, featured projects grid, skills, CTA' },
            { name: 'Projects', route: '/projects', description: 'Full project grid with category filter tabs and project detail modal' },
            { name: 'About',    route: '/about',    description: 'Personal story, skills by category, experience timeline' },
            { name: 'Contact',  route: '/contact',  description: 'Contact form with social links' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',    description: 'Minimal glassmorphic navbar, gradient logo, nav links, Download CV button' },
            { name: 'Footer',              type: 'layout',    description: 'Minimal footer with social links and copyright' },
            { name: 'HeroSection',         type: 'section',   description: 'Avatar image, gradient name headline, animated role-cycling text, 2 CTAs (View Work + Contact), floating decorative shapes' },
            { name: 'ProjectsGrid',        type: 'section',   description: 'Category filter tabs (All/Web/Mobile/Design), 3-col glassmorphic project cards with image, title, tech stack badges, hover overlay showing GitHub+Live links' },
            { name: 'SkillsSection',       type: 'section',   description: 'Skills grouped by category (Frontend/Backend/Tools) rendered as animated colored badge chips with icons' },
            { name: 'ExperienceTimeline',  type: 'section',   description: 'Vertical timeline of work experience: company, role, period, description, connected by a gradient line' },
            { name: 'TestimonialsSection', type: 'section',   description: '3 client/colleague testimonial glassmorphic cards with avatar, name, role, quote' },
            { name: 'CTASection',          type: 'section',   description: '"Let\'s Work Together" gradient CTA banner with hire/contact button' },
        ],
        designSystem: {
            primaryColor: 'violet', secondaryColor: 'indigo', accentColor: 'cyan',
            style: 'minimal', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:     'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920&q=85&auto=format&fit=crop',
            project1: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80&auto=format&fit=crop',
            project2: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80&auto=format&fit=crop',
            project3: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop',
            avatar:   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&q=80&fit=crop&crop=face',
        },
        systemPromptAddendum: `PORTFOLIO REQUIREMENTS:
- HeroSection: animated role cycling (useEffect interval cycling "Full Stack Dev", "UI/UX Designer", "React Specialist")
- ProjectsGrid: PROJECTS array [{id, title, category, image, tags, github, live, description}], category filter with useState
- SkillsSection: skills grouped by category, rendered as badge chips with Lucide icons
- ExperienceTimeline: EXPERIENCE array [{company, role, period, description}] with connecting gradient line
- Use realistic portfolio data: real tech names, plausible project names (SaaS, mobile apps, dashboards)
- Avatar: Unsplash face-crop portrait photo`,
    },

    // ── E-Commerce ────────────────────────────────────────────────────────────
    ecommerce: {
        label: 'E-Commerce / Online Store',
        pages: [
            { name: 'Home',     route: '/',            description: 'Hero banner, featured products, category grid, promo sections, newsletter' },
            { name: 'Products', route: '/products',    description: 'Product grid with sidebar filter (category, price, rating) and sort dropdown' },
            { name: 'Product',  route: '/product/:id', description: 'Product detail: image, title, price, description, add-to-cart, reviews' },
            { name: 'Cart',     route: '/cart',        description: 'Cart items with quantity controls, order summary, checkout button' },
        ],
        components: [
            { name: 'Navbar',          type: 'layout',    description: 'Sticky navbar with logo, search bar, cart icon with item-count badge, user icon' },
            { name: 'Footer',          type: 'layout',    description: '4-column footer: Brand, Shop, Help, Newsletter signup' },
            { name: 'HeroSection',     type: 'section',   description: 'Full-width promo hero, gradient headline "Shop the Latest", hero product image, dual CTA' },
            { name: 'ProductCard',     type: 'component', description: 'Product card: image, name, price, rating stars, Add to Cart button, wishlist icon, hover zoom' },
            { name: 'ProductGrid',     type: 'section',   description: '4-col responsive product grid with FilterSidebar component for category/price/rating' },
            { name: 'FilterSidebar',   type: 'component', description: 'Category checkboxes, price range, rating filter, all controlled with useState' },
            { name: 'CartContext',     type: 'context',   description: 'Context + useReducer for cart: items[], addItem, removeItem, updateQty, cartTotal — export CartProvider + useCart' },
            { name: 'CategorySection', type: 'section',   description: '4-6 category cards with image background, name overlay, hover lift effect' },
            { name: 'CTASection',      type: 'section',   description: 'Newsletter signup: "Get 10% off your first order" with email input' },
        ],
        designSystem: {
            primaryColor: 'rose', secondaryColor: 'pink', accentColor: 'orange',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:     'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=85&auto=format&fit=crop',
            product1: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format&fit=crop',
            product2: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80&auto=format&fit=crop',
            product3: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80&auto=format&fit=crop',
            product4: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80&auto=format&fit=crop',
        },
        systemPromptAddendum: `E-COMMERCE REQUIREMENTS:
- CartContext.jsx (CRITICAL): React Context + useReducer for cart items, export { CartProvider, useCart }
- Navbar: show cart count from useCart()
- PRODUCTS array: 10 items [{id, name, price, originalPrice, rating, reviews, category, image, description, inStock}]
- Categories: Electronics, Clothing, Accessories, Home & Living
- Products page: client-side filter by category + sort by price using useState
- Cart page: quantity +/- buttons, item subtotal, order total, "Proceed to Checkout" button (mock)
- ProductCard: useNavigate to /product/:id on click`,
    },

    // ── SaaS ──────────────────────────────────────────────────────────────────
    saas: {
        label: 'SaaS / Product Landing Page',
        pages: [
            { name: 'Home',    route: '/',        description: 'Hero with product headline, dashboard preview mockup, features, pricing cards, testimonials, FAQ' },
            { name: 'Pricing', route: '/pricing', description: 'Pricing tiers with monthly/yearly toggle, feature comparison, FAQ' },
            { name: 'About',   route: '/about',   description: 'Company story, team, investors/logos' },
            { name: 'Contact', route: '/contact', description: 'Contact form, support email, office info' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Sticky glassmorphic navbar, Features/Pricing/Blog links, Sign In + Get Started buttons' },
            { name: 'Footer',              type: 'layout',  description: '4-column footer: Product, Company, Resources, Legal, social links' },
            { name: 'HeroSection',         type: 'section', description: 'Bold gradient headline, subtext, 2 CTAs (Get Started Free + Watch Demo), dark dashboard mockup card below with glow shadow' },
            { name: 'FeaturesSection',     type: 'section', description: '6 features in 3x2 grid: gradient icon, title, 2-sentence description, hover glow border' },
            { name: 'DashboardPreview',    type: 'section', description: 'Alternating feature+screenshot layout (text left/image right, then reversed) with scroll-reveal animations' },
            { name: 'PricingSection',      type: 'section', description: '3 tiers: Free / Pro $29/mo / Enterprise; middle card has gradient border "Most Popular"; monthly/yearly toggle with 20% annual discount' },
            { name: 'IntegrationsSection', type: 'section', description: '8-10 integration brand name pills in marquee row: Slack, Notion, GitHub, Stripe, Figma, Zapier, etc.' },
            { name: 'TestimonialsSection', type: 'section', description: '3 glassmorphic customer testimonial cards with company, quote, avatar, name, role' },
            { name: 'FAQSection',          type: 'section', description: 'Accordion FAQ with 6 questions; AnimatePresence for smooth height animation on open/close' },
            { name: 'StatsSection',        type: 'section', description: '4 stats: "10,000+ Users", "99.9% Uptime", "50+ Integrations", "4.9★ Rating"' },
            { name: 'CTASection',          type: 'section', description: '"Start your free trial" banner with email input and CTA button' },
        ],
        designSystem: {
            primaryColor: 'blue', secondaryColor: 'violet', accentColor: 'cyan',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:   'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=85&auto=format&fit=crop',
            team:   'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&auto=format&fit=crop',
            office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&auto=format&fit=crop',
        },
        systemPromptAddendum: `SAAS REQUIREMENTS:
- PricingSection: 3 cards with feature list per tier, monthly/yearly toggle (useState, show 20% discount on yearly)
- FAQSection: accordion using useState for open index, AnimatePresence for height animation
- DashboardPreview: dark glassmorphic card with fake bar charts/metrics built in pure Tailwind (div heights for bars)
- IntegrationsSection: brand name pills in horizontal auto-scrolling marquee (CSS animation)
- HeroSection: dashboard mockup is a styled div with fake metric cards, not an img
- StatsSection: animated count-up using framer-motion whileInView`,
    },

    // ── Restaurant ────────────────────────────────────────────────────────────
    restaurant: {
        label: 'Restaurant / Food & Beverage',
        pages: [
            { name: 'Home',         route: '/',        description: 'Hero with food imagery, featured dishes, chef profile, testimonials' },
            { name: 'Menu',         route: '/menu',    description: 'Full menu with category tabs (Starters/Mains/Desserts/Drinks), items with price' },
            { name: 'Reservations', route: '/reserve', description: 'Reservation form: date, time, party size, name, email, notes' },
            { name: 'Contact',      route: '/contact', description: 'Location, hours, phone, map placeholder' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Restaurant logo, nav links, "Reserve a Table" CTA button' },
            { name: 'Footer',              type: 'layout',  description: 'Footer with address, phone, opening hours, social links' },
            { name: 'HeroSection',         type: 'section', description: 'Full-screen food photo hero with dark overlay, elegant headline, "View Menu" + "Reserve" CTAs' },
            { name: 'MenuSection',         type: 'section', description: 'MENU_DATA by category, animated category tabs, each item: image, name, description, price, tags (veg/spicy)' },
            { name: 'FeaturedDishes',      type: 'section', description: '3 signature dish cards with large photo, name, description, price, hover zoom' },
            { name: 'ChefSection',         type: 'section', description: 'Head chef: photo, name, bio, awards/accolades' },
            { name: 'ReservationForm',     type: 'section', description: 'Controlled form: date, time slots, party size, name, email, notes; success confirmation state' },
            { name: 'GallerySection',      type: 'section', description: '6-8 food & interior photos in masonry CSS grid with hover overlay' },
            { name: 'TestimonialsSection', type: 'section', description: '3 diner reviews with star rating, name, date, review text' },
            { name: 'CTASection',          type: 'section', description: '"Reserve Your Table Tonight" with phone number and Reserve button' },
        ],
        designSystem: {
            primaryColor: 'amber', secondaryColor: 'orange', accentColor: 'yellow',
            style: 'elegant', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=85&auto=format&fit=crop',
            dish1:   'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop',
            dish2:   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop',
            dish3:   'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80&auto=format&fit=crop',
            chef:    'https://images.unsplash.com/photo-1583394293214-0b3fcb5cb7a3?w=400&h=500&q=80&fit=crop',
            gallery: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80&auto=format&fit=crop',
        },
        systemPromptAddendum: `RESTAURANT REQUIREMENTS:
- MENU_DATA: {Starters:[...], Mains:[...], Desserts:[...], Drinks:[...]} each item: {name, description, price, image, tags}
- At least 4 items per category; realistic prices (Starters $8-$15, Mains $18-$40, Desserts $7-$12, Drinks $5-$18)
- MenuSection: category tabs with useState, animated tab transitions
- ReservationForm: full controlled form, show success "Reservation Confirmed!" on submit
- Opening hours in footer: Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm
- HeroSection: dark overlay (bg-black/60) over food photo for readability`,
    },

    // ── Blog ──────────────────────────────────────────────────────────────────
    blog: {
        label: 'Blog / Magazine / News',
        pages: [
            { name: 'Home',     route: '/',              description: 'Featured article hero, category tabs, article grid, newsletter signup' },
            { name: 'Articles', route: '/articles',      description: 'All articles with category filter and search' },
            { name: 'Article',  route: '/article/:slug', description: 'Full article page: hero image, content, author, tags, related posts' },
            { name: 'About',    route: '/about',         description: 'Blog mission, author bio, topics covered' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',    description: 'Logo, category nav links, search button, Subscribe CTA' },
            { name: 'Footer',              type: 'layout',    description: 'Logo, category links, social links, newsletter mini-form, copyright' },
            { name: 'HeroSection',         type: 'section',   description: 'Featured article: large image, category badge, title, excerpt, author+date, Read Article CTA' },
            { name: 'ArticleCard',         type: 'component', description: 'Article card: image, category pill, title, 2-line excerpt, author avatar+name, date, read time' },
            { name: 'ArticleGrid',         type: 'section',   description: '3-col responsive article grid with category filter tabs using useState' },
            { name: 'NewsletterSection',   type: 'section',   description: '"Stay in the Loop" email signup with compelling subtext, email input, subscribe button' },
            { name: 'AuthorSection',       type: 'section',   description: 'Author card: avatar, name, bio, social links, article count' },
            { name: 'RelatedPosts',        type: 'section',   description: '3 related article cards shown below article content' },
        ],
        designSystem: {
            primaryColor: 'emerald', secondaryColor: 'teal', accentColor: 'cyan',
            style: 'minimal', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:     'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=1920&q=85&auto=format&fit=crop',
            article1: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&auto=format&fit=crop',
            article2: 'https://images.unsplash.com/photo-1488590211105-8b0e65b80b4e?w=600&q=80&auto=format&fit=crop',
            article3: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&auto=format&fit=crop',
            author:   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&q=80&fit=crop&crop=face',
        },
        systemPromptAddendum: `BLOG REQUIREMENTS:
- ARTICLES array: 8 articles [{id, slug, title, excerpt, content, category, image, author:{name,avatar}, date, readTime, tags}]
- Categories: Technology, Design, Business, Lifestyle, Travel
- ArticleCard: Link to /article/:slug using react-router <Link>
- Article.jsx page: find article by slug from ARTICLES, render full content with good typography (leading-relaxed, prose-like)
- HeroSection: first article as featured full-width card
- Use realistic article titles: "The Future of AI in Web Dev", "10 Design Principles Every Dev Should Know"`,
    },

    // ── Agency ────────────────────────────────────────────────────────────────
    agency: {
        label: 'Creative Agency / Studio',
        pages: [
            { name: 'Home',     route: '/',         description: 'Hero with bold statement, services, featured work gallery, client logos, team, testimonials' },
            { name: 'Work',     route: '/work',     description: 'Portfolio case studies grid with category filter' },
            { name: 'Services', route: '/services', description: 'Services list with process steps' },
            { name: 'About',    route: '/about',    description: 'Agency story, team, values, awards' },
            { name: 'Contact',  route: '/contact',  description: 'Project inquiry form, office info' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Minimal navbar, logo, nav links, "Start a Project" CTA' },
            { name: 'Footer',              type: 'layout',  description: 'Bold footer with large agency name, social links, contact info' },
            { name: 'HeroSection',         type: 'section', description: 'Large-type headline with animated word cycling ("Experiences"→"Products"→"Brands"), gradient shapes, dual CTA' },
            { name: 'ServicesSection',     type: 'section', description: '4-6 service cards: Brand Identity, Web Design, Development, Motion, Strategy; icon+title+desc' },
            { name: 'WorkGallery',         type: 'section', description: 'Staggered 3-col case study cards: image, project name, category, hover overlay with "View Project"' },
            { name: 'ProcessSection',      type: 'section', description: '4 numbered steps (01→04): Discover, Design, Develop, Launch; large numbers, connecting lines' },
            { name: 'TeamSection',         type: 'section', description: '4-5 team cards: face photo, name, role, social icons' },
            { name: 'ClientLogos',         type: 'section', description: 'Horizontal marquee of 8 client brand-name pills (auto-scrolling CSS animation)' },
            { name: 'TestimonialsSection', type: 'section', description: '3 client testimonials in glassmorphic cards' },
            { name: 'CTASection',          type: 'section', description: '"Ready to Start?" gradient CTA with project inquiry button' },
        ],
        designSystem: {
            primaryColor: 'violet', secondaryColor: 'fuchsia', accentColor: 'pink',
            style: 'bold', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:  'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1920&q=85&auto=format&fit=crop',
            work1: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80&auto=format&fit=crop',
            work2: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&q=80&auto=format&fit=crop',
            team1: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&q=80&fit=crop&crop=face',
            team2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&q=80&fit=crop&crop=face',
        },
        systemPromptAddendum: `AGENCY REQUIREMENTS:
- HeroSection: animated word cycle (useEffect interval) cycling through ["Experiences", "Products", "Brands", "Stories"]
- WorkGallery: PROJECTS array with filter tabs by category (Branding, Web, Mobile, Motion)
- ProcessSection: large step numbers (01-04) with connecting horizontal line between them
- ClientLogos: use CSS @keyframes marquee animation for infinite horizontal scroll
- TeamSection: face-crop Unsplash photos for each team member; GitHub/LinkedIn icons`,
    },

    // ── Healthcare ────────────────────────────────────────────────────────────
    healthcare: {
        label: 'Healthcare / Medical / Clinic',
        pages: [
            { name: 'Home',        route: '/',            description: 'Hero with trust signals, services, doctors, stats, patient testimonials' },
            { name: 'Services',    route: '/services',    description: 'Medical services grid with icons and descriptions' },
            { name: 'Doctors',     route: '/doctors',     description: 'Doctor profiles with specialization, experience, rating' },
            { name: 'Appointment', route: '/appointment', description: 'Appointment booking form: doctor, department, date, time, patient info' },
            { name: 'Contact',     route: '/contact',     description: 'Location, hours, emergency contact, map placeholder' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Professional navbar, clinic logo, "Book Appointment" CTA, emergency number' },
            { name: 'Footer',              type: 'layout',  description: 'Footer with services links, contact info, emergency 24/7 number, social links' },
            { name: 'HeroSection',         type: 'section', description: 'Doctor/hospital image with dark overlay, "Expert Care for Your Health" headline, trust badges (NABH Accredited, ISO Certified, 24/7 Emergency), 2 CTAs' },
            { name: 'ServicesGrid',        type: 'section', description: '6 service cards: Cardiology, Neurology, Pediatrics, Ortho, Oncology, Emergency; Lucide icons, glassmorphic cards' },
            { name: 'DoctorsSection',      type: 'section', description: '3-4 doctor cards: photo, name, specialization, experience years, rating, schedule button' },
            { name: 'StatsSection',        type: 'section', description: '4 stats: "25,000+ Patients", "50+ Doctors", "15+ Years", "98% Satisfaction"' },
            { name: 'AppointmentForm',     type: 'section', description: 'Controlled form: department select, doctor select, date input, time slots, patient name/phone/email, notes; success confirmation' },
            { name: 'TestimonialsSection', type: 'section', description: '3 patient testimonials with name, condition, rating, review' },
            { name: 'CTASection',          type: 'section', description: '"Your Health is Our Priority" CTA with appointment button and emergency number' },
        ],
        designSystem: {
            primaryColor: 'sky', secondaryColor: 'blue', accentColor: 'teal',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1920&q=85&auto=format&fit=crop',
            doctor1: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=480&q=80&fit=crop',
            doctor2: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=480&q=80&fit=crop',
            doctor3: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=480&q=80&fit=crop',
        },
        systemPromptAddendum: `HEALTHCARE REQUIREMENTS:
- DOCTORS array: [{name, specialization, experience, education, image, rating, bio}]
- AppointmentForm: full controlled form, department+doctor dropdowns, date input, time selector, success state
- ServicesGrid: use Heart, Brain, Baby, Shield, Activity, Zap from lucide-react
- Emergency phone number prominently in navbar and footer
- Trust badges in hero (NABH Accredited, ISO Certified, 24/7 Emergency)
- Use sky/teal tones — professional medical aesthetic with dark base`,
    },

    // ── Education ─────────────────────────────────────────────────────────────
    education: {
        label: 'Education / E-Learning Platform',
        pages: [
            { name: 'Home',    route: '/',           description: 'Hero with search bar, featured courses, categories, stats, instructor profiles, testimonials' },
            { name: 'Courses', route: '/courses',    description: 'Course catalog with category filter and sort' },
            { name: 'Course',  route: '/course/:id', description: 'Course detail: image, curriculum accordion, instructor, rating, enroll CTA' },
            { name: 'About',   route: '/about',      description: 'Platform story, mission, team of instructors' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Logo, Courses/Instructors/Pricing links, Login + Enroll Now CTA' },
            { name: 'Footer',              type: 'layout',  description: 'Course categories, company, support links, social, newsletter mini-form' },
            { name: 'HeroSection',         type: 'section', description: '"Learn Without Limits" headline, subtext, course search bar (controlled input), student count stat, university partner logos row' },
            { name: 'FeaturedCourses',     type: 'section', description: '4-6 course cards: image, category badge, title, instructor name, rating stars, student count, price, Enroll button' },
            { name: 'CategorySection',     type: 'section', description: '6 category cards: Programming, Design, Business, Marketing, Data Science, Photography; icon+name+count' },
            { name: 'HowItWorksSection',   type: 'section', description: '3 steps: Browse → Enroll → Get Certified; icons, animated connector lines' },
            { name: 'StatsSection',        type: 'section', description: '4 stats: "50,000+ Students", "1,000+ Courses", "200+ Instructors", "95% Completion"' },
            { name: 'InstructorSection',   type: 'section', description: '3-4 instructor cards: photo, name, expertise, course count, student count, rating' },
            { name: 'TestimonialsSection', type: 'section', description: '3 student success stories with photo, course taken, career outcome, quote' },
            { name: 'CTASection',          type: 'section', description: '"Start Learning Today" CTA with free trial offer' },
        ],
        designSystem: {
            primaryColor: 'indigo', secondaryColor: 'violet', accentColor: 'blue',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1920&q=85&auto=format&fit=crop',
            course1: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=600&q=80&auto=format&fit=crop',
            course2: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80&auto=format&fit=crop',
            course3: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&q=80&auto=format&fit=crop',
            instructor: 'https://images.unsplash.com/photo-1530099486328-e021101a494a?w=300&h=300&q=80&fit=crop',
        },
        systemPromptAddendum: `EDUCATION REQUIREMENTS:
- COURSES array: 8 courses [{id, title, category, image, instructor, rating, students, price, duration, level, description}]
- Level badges: Beginner (green), Intermediate (yellow), Advanced (red)
- Price: show "FREE" in green if 0, else "$XX" 
- Course.jsx page: find by id, show curriculum as accordion (useState for open section)
- FeaturedCourses: category tabs filter using useState
- InstructorSection: [{name, expertise, courses, students, rating, image, bio}]`,
    },

    // ── Real Estate ───────────────────────────────────────────────────────────
    realestate: {
        label: 'Real Estate / Property Listings',
        pages: [
            { name: 'Home',       route: '/',             description: 'Hero with search form, featured listings, categories (Buy/Rent), agent team, stats' },
            { name: 'Properties', route: '/properties',   description: 'Property grid with filter: type (Buy/Rent), city, price range, bedrooms' },
            { name: 'Property',   route: '/property/:id', description: 'Property detail: image gallery, specs table, description, contact agent form' },
            { name: 'Agents',     route: '/agents',       description: 'Agent profiles with specialization and listing count' },
            { name: 'Contact',    route: '/contact',      description: 'Office contact, map placeholder, inquiry form' },
        ],
        components: [
            { name: 'Navbar',           type: 'layout',    description: 'Logo, Buy/Rent/Sell/Agents links, "List Property" CTA button' },
            { name: 'Footer',           type: 'layout',    description: 'Company info, property types links, cities links, contact info' },
            { name: 'HeroSection',      type: 'section',   description: 'Full-screen city/property image, "Find Your Dream Home" headline, search form (location, type, price range, bedrooms)' },
            { name: 'PropertyCard',     type: 'component', description: 'Property card: image with status badge (For Sale/Rent), price, beds/baths/sqft icons, address, agent name, favorite icon' },
            { name: 'PropertyGrid',     type: 'section',   description: '3-col responsive property grid with filter bar (type, city, price range, beds)' },
            { name: 'FilterBar',        type: 'component', description: 'Horizontal filter bar with dropdowns: Buy/Rent, City, Price Range, Bedrooms; filter with useState' },
            { name: 'AgentSection',     type: 'section',   description: '3-4 agent profile cards: photo, name, specialty, listings count, phone, email' },
            { name: 'StatsSection',     type: 'section',   description: '4 stats: "5,000+ Properties", "1,200+ Agents", "10,000+ Happy Clients", "15+ Years"' },
            { name: 'CTASection',       type: 'section',   description: '"Sell Your Property with Us" CTA with free valuation button' },
        ],
        designSystem: {
            primaryColor: 'emerald', secondaryColor: 'teal', accentColor: 'green',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=85&auto=format&fit=crop',
            property1: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80&auto=format&fit=crop',
            property2: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80&auto=format&fit=crop',
            property3: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&auto=format&fit=crop',
            agent1:    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&q=80&fit=crop&crop=face',
        },
        systemPromptAddendum: `REAL ESTATE REQUIREMENTS:
- PROPERTIES array: 9 properties [{id, title, type:'sale'|'rent', price, beds, baths, sqft, address, city, image, status, description, agent}]
- PropertyCard: "For Sale" / "For Rent" badge on image, price formatted ($XXX,XXX), Bed/Bath/SqFt row with Lucide icons
- FilterBar: filter properties by type+city+price+beds using useState, show count of results
- Property.jsx page: find by id, show image gallery (multiple images or single large), specs table, "Contact Agent" form
- HeroSection: search form overlaid on hero image (glassmorphic card form)
- AgentSection: face-crop photos, listings count per agent`,
    },

    // ── Startup ───────────────────────────────────────────────────────────────
    startup: {
        label: 'Startup / Product Launch',
        pages: [
            { name: 'Home',    route: '/',        description: 'Hero with waitlist form, product preview, features, social proof, FAQ' },
            { name: 'About',   route: '/about',   description: 'Founders story, mission, team' },
            { name: 'Contact', route: '/contact', description: 'Contact form, press inquiry, investor contact' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Minimal logo + nav, "Join Waitlist" CTA button, countdown timer' },
            { name: 'Footer',              type: 'layout',  description: 'Logo, links, social, "Built with ❤️" tagline' },
            { name: 'HeroSection',         type: 'section', description: 'Bold product announcement: "Introducing [Name]" with launch badge, headline, subtext, email waitlist signup form, animated product preview card' },
            { name: 'CountdownSection',    type: 'section', description: 'Launch countdown timer: Days, Hours, Minutes, Seconds — updating with useEffect setInterval' },
            { name: 'FeaturesSection',     type: 'section', description: '4-6 feature highlights: icon, title, 2-sentence description; glassmorphic cards' },
            { name: 'SocialProof',         type: 'section', description: '"Join 5,000+ people on the waitlist" with avatar stack and count; company logos of early customers' },
            { name: 'RoadmapSection',      type: 'section', description: 'Product roadmap timeline: Q1 Beta → Q2 Launch → Q3 Mobile App → Q4 Enterprise; each milestone with status badge' },
            { name: 'FAQSection',          type: 'section', description: 'Accordion FAQ with 5-6 questions about the product, pricing, beta access' },
            { name: 'CTASection',          type: 'section', description: 'Final email signup CTA: "Be First to Know" with email input and Submit button, show signed-up count' },
        ],
        designSystem: {
            primaryColor: 'orange', secondaryColor: 'yellow', accentColor: 'rose',
            style: 'bold', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:    'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1920&q=85&auto=format&fit=crop',
            product: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format&fit=crop',
            team:    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80&auto=format&fit=crop',
        },
        systemPromptAddendum: `STARTUP REQUIREMENTS:
- CountdownSection: live countdown using useState + useEffect setInterval to a launch date 30 days from now
- HeroSection waitlist: email input form + submit, show "You're on the list! 🎉" success message with useState
- SocialProof: show avatar stack (3-4 overlapping circle avatars) + "5,000+ already waiting"
- RoadmapSection: milestones with status: Done (green), In Progress (blue animated pulse), Planned (gray)
- WaitlistCount: track signups count with useState, increment on each signup (starts at 4,847)
- ProductPreview: dark glassmorphic card showing fake app UI`,
    },

    // ── Events ────────────────────────────────────────────────────────────────
    events: {
        label: 'Events / Conference / Concert',
        pages: [
            { name: 'Home',     route: '/',          description: 'Event hero with countdown, speakers, agenda, venue, tickets' },
            { name: 'Speakers', route: '/speakers',  description: 'All speaker profiles with topics and bios' },
            { name: 'Agenda',   route: '/agenda',    description: 'Full event schedule by day/time' },
            { name: 'Tickets',  route: '/tickets',   description: 'Ticket tiers with features and purchase CTA' },
            { name: 'Contact',  route: '/contact',   description: 'Organizer contact, venue info, sponsor inquiry' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Event logo, Speakers/Agenda/Tickets links, "Get Tickets" CTA button' },
            { name: 'Footer',              type: 'layout',  description: 'Event name, date, venue, social links, organizer info' },
            { name: 'HeroSection',         type: 'section', description: 'Full-screen event hero: event name, date/location tag, countdown timer (Days/Hours/Mins/Secs), "Get Tickets" + "View Agenda" CTAs' },
            { name: 'CountdownTimer',      type: 'component', description: 'Live countdown to event date using useEffect setInterval; Days/Hours/Minutes/Seconds boxes' },
            { name: 'SpeakersSection',     type: 'section', description: '4-6 speaker cards: photo, name, company, role, topic badge' },
            { name: 'AgendaSection',       type: 'section', description: 'Day tabs (Day 1/Day 2), scrollable schedule: time, session title, speaker, room/track' },
            { name: 'VenueSection',        type: 'section', description: 'Venue name, address, Google Map embed placeholder (styled div), transport info' },
            { name: 'TicketsSection',      type: 'section', description: '3 ticket tiers: Early Bird / Standard / VIP; features list, price, "Buy Now" button' },
            { name: 'SponsorsSection',     type: 'section', description: 'Sponsor logos in rows (Gold/Silver/Bronze tiers) — use brand-name pills' },
            { name: 'CTASection',          type: 'section', description: '"Don\'t Miss Out!" CTA with remaining tickets count and Get Tickets button' },
        ],
        designSystem: {
            primaryColor: 'rose', secondaryColor: 'violet', accentColor: 'orange',
            style: 'bold', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:     'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=85&auto=format&fit=crop',
            speaker1: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&q=80&fit=crop&crop=face',
            speaker2: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&q=80&fit=crop&crop=face',
            venue:    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80&auto=format&fit=crop',
        },
        systemPromptAddendum: `EVENTS REQUIREMENTS:
- CountdownTimer: useEffect setInterval counting down to specific event date (set 60 days from now)
- AgendaSection: day tabs with useState, SCHEDULE array [{day, time, title, speaker, track}]
- SPEAKERS array: [{name, company, role, topic, bio, image}] with 6+ speakers
- TicketsSection: 3 tiers with feature lists; "Sold Out" state for Early Bird using useState
- SponsorsSection: grouped by tier (Gold/Silver/Bronze) with animated logo reveals`,
    },

    // ── Nonprofit ─────────────────────────────────────────────────────────────
    nonprofit: {
        label: 'NGO / Nonprofit / Charity',
        pages: [
            { name: 'Home',     route: '/',         description: 'Mission hero, impact stats, active causes, how to help, team, testimonials' },
            { name: 'Causes',   route: '/causes',   description: 'Active causes/campaigns with progress bars and donation CTA' },
            { name: 'About',    route: '/about',    description: 'Organization story, mission, values, team, partners' },
            { name: 'Donate',   route: '/donate',   description: 'Donation page with preset amounts, custom amount, payment info (mock)' },
            { name: 'Contact',  route: '/contact',  description: 'Contact form, volunteer signup, office info' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Logo, Causes/About/Volunteer/Blog links, "Donate Now" CTA in primary color' },
            { name: 'Footer',              type: 'layout',  description: 'Logo, tagline, quick links, social links, newsletter signup' },
            { name: 'HeroSection',         type: 'section', description: 'Impactful hero: cause imagery, bold mission statement, stats row, "Donate Now" + "Learn More" CTAs' },
            { name: 'ImpactStats',         type: 'section', description: '4 animated impact stats: "1M+ Lives Impacted", "$5M Raised", "50+ Countries", "10K+ Volunteers"' },
            { name: 'CausesSection',       type: 'section', description: '3-4 active cause cards: image, cause title, goal/raised amounts, animated progress bar, Donate CTA' },
            { name: 'HowToHelp',           type: 'section', description: '3 ways to help: Donate, Volunteer, Spread the Word; icon, title, description, CTA button each' },
            { name: 'DonationForm',        type: 'section', description: 'Preset donation amounts ($10/$25/$50/$100/Custom), frequency toggle (one-time/monthly), donor info form, submit with success state' },
            { name: 'TeamSection',         type: 'section', description: '4-5 team/founder cards: photo, name, role, quote' },
            { name: 'StoriesSection',      type: 'section', description: '2-3 beneficiary stories with photo, name, country, quote, outcome' },
            { name: 'CTASection',          type: 'section', description: '"Every Dollar Makes a Difference" gradient CTA with Donate button' },
        ],
        designSystem: {
            primaryColor: 'green', secondaryColor: 'emerald', accentColor: 'teal',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero:    'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1920&q=85&auto=format&fit=crop',
            cause1:  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80&auto=format&fit=crop',
            cause2:  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80&auto=format&fit=crop',
            story1:  'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=600&q=80&auto=format&fit=crop',
            team1:   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&q=80&fit=crop&crop=face',
        },
        systemPromptAddendum: `NONPROFIT REQUIREMENTS:
- CausesSection: CAUSES array [{title, description, raised, goal, image, category}]; show animated progress bar (raised/goal %)
- DonationForm: preset amount buttons with useState for selected amount, custom input toggle, frequency toggle (one-time/monthly)
- On donate submit: show "Thank You! Your donation will change lives." success message
- ImpactStats: animated count-up numbers using framer-motion whileInView
- HowToHelp: 3 clear action cards with distinct CTA buttons (Donate / Volunteer / Share)
- StoriesSection: emotional beneficiary stories with real-feeling names and outcomes`,
    },

    // ── Generic Fallback ──────────────────────────────────────────────────────
    generic: {
        label: 'General Purpose Website',
        pages: [
            { name: 'Home',    route: '/',        description: 'Hero, features, stats, testimonials, CTA' },
            { name: 'About',   route: '/about',   description: 'Story, team, values, mission' },
            { name: 'Contact', route: '/contact', description: 'Contact form, location, social links' },
        ],
        components: [
            { name: 'Navbar',              type: 'layout',  description: 'Glassmorphic sticky navbar with gradient logo, nav links, CTA button' },
            { name: 'Footer',              type: 'layout',  description: 'Multi-column footer with social links and newsletter' },
            { name: 'HeroSection',         type: 'section', description: 'Full-screen gradient hero with orbs, animated headline, 2 CTAs, hero image' },
            { name: 'FeaturesSection',     type: 'section', description: '6 glassmorphic feature cards with Lucide icons, titles, hover animations' },
            { name: 'StatsSection',        type: 'section', description: '4 animated stat numbers with labels' },
            { name: 'TestimonialsSection', type: 'section', description: '3 glassmorphic testimonial cards with avatars, quotes, star ratings' },
            { name: 'CTASection',          type: 'section', description: 'Full-width gradient CTA banner with headline and button' },
        ],
        designSystem: {
            primaryColor: 'violet', secondaryColor: 'indigo', accentColor: 'cyan',
            style: 'modern', theme: 'dark', fonts: 'Inter, Plus Jakarta Sans',
        },
        images: {
            hero: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=85&auto=format&fit=crop',
        },
        systemPromptAddendum: '',
    },
};

/**
 * Get config for a website type (falls back to 'generic').
 */
export function getTypeConfig(websiteType) {
    return WEBSITE_TYPE_CONFIGS[websiteType] || WEBSITE_TYPE_CONFIGS.generic;
}

/**
 * Get required custom components for a website type.
 * Extracts components with type: 'component' and type: 'layout' from the config.
 * These are the reusable components that must be generated.
 */
export function getRequiredCustomComponentsForType(websiteType) {
    const config = getTypeConfig(websiteType);
    if (!config.components) return [];
    
    return config.components
        .filter(comp => comp.type === 'component' || comp.type === 'layout')
        .map(comp => comp.name);
}
