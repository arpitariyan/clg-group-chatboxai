export const DEFAULT_WEBSITE_CREDIT_PACKAGES = [
    {
        id: 'default_10',
        credits: 10,
        priceInr: 49,
        displayName: '10 Credits',
        sortOrder: 10,
        isActive: true,
    },
    {
        id: 'default_20',
        credits: 20,
        priceInr: 69,
        displayName: '20 Credits',
        sortOrder: 20,
        isActive: true,
    },
    {
        id: 'default_50',
        credits: 50,
        priceInr: 79,
        displayName: '50 Credits',
        sortOrder: 50,
        isActive: true,
    },
    {
        id: 'default_100',
        credits: 100,
        priceInr: 99,
        displayName: '100 Credits',
        sortOrder: 100,
        isActive: true,
    },
];

export function normalizeWebsiteCreditPackage(pkg) {
    const credits = Number(pkg.credits || 0);
    const priceInr = Number(pkg.price_inr ?? pkg.price ?? 0);
    const displayName = pkg.display_name || pkg.name || `${credits} Credits`;
    const sortOrder = Number(pkg.sort_order ?? credits ?? 999);
    const isActive = typeof pkg.is_active === 'boolean'
        ? pkg.is_active
        : String(pkg.is_active).toLowerCase() !== 'false';

    return {
        id: pkg.$id,
        credits,
        priceInr,
        displayName,
        sortOrder,
        isActive,
        source: 'db',
    };
}

export function getDefaultWebsitePackageById(packageId) {
    return DEFAULT_WEBSITE_CREDIT_PACKAGES.find((pkg) => pkg.id === packageId) || null;
}

export function getCanonicalWebsiteCreditPackages() {
    return [...DEFAULT_WEBSITE_CREDIT_PACKAGES];
}
