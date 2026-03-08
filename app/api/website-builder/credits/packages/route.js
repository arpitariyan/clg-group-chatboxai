import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { WEBSITE_CREDIT_PACKAGES_COLLECTION_ID } from '@/services/appwrite-collections';
import {
    getCanonicalWebsiteCreditPackages,
    normalizeWebsiteCreditPackage,
} from '@/lib/website-credit-packages';

/**
 * GET /api/website-builder/credits/packages
 * Fetches all available credit packages
 */
export async function GET() {
    try {
        const canonicalPackages = getCanonicalWebsiteCreditPackages();
        let res;
        try {
            res = await databases.listDocuments(DB_ID, WEBSITE_CREDIT_PACKAGES_COLLECTION_ID, [
                Query.equal('is_active', true),
                Query.orderAsc('sort_order'),
                Query.limit(100)
            ]);
        } catch {
            // Fallback for schema variants missing one or more queryable attributes.
            res = await databases.listDocuments(DB_ID, WEBSITE_CREDIT_PACKAGES_COLLECTION_ID, [
                Query.limit(200)
            ]);
        }

        const normalizedPackages = (res?.documents || [])
            .map(normalizeWebsiteCreditPackage)
            .filter((pkg) => pkg.isActive && pkg.credits > 0 && pkg.priceInr > 0)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        const packageByCredits = new Map(normalizedPackages.map((pkg) => [pkg.credits, pkg]));

        // Always return the required catalog; use DB IDs when matching records exist.
        const finalPackages = canonicalPackages.map((pkg) => {
            const dbMatch = packageByCredits.get(pkg.credits);
            if (!dbMatch) return pkg;

            return {
                ...pkg,
                id: dbMatch.id,
                displayName: dbMatch.displayName || pkg.displayName,
            };
        });

        return NextResponse.json({
            success: true,
            packages: finalPackages
        });

    } catch (error) {
        console.error('Error in packages GET endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
