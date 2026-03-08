import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
  LIBRARY_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all count queries in parallel
    const [
      totalUsersRes,
      activeUsersRes,
      proUsersRes,
      totalImageGenRes,
      imagesTodayRes,
      totalSearchesRes,
      searchesTodayRes,
      recentImagesRes,
    ] = await Promise.all([
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [Query.limit(1)]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.greaterThanEqual('last_login', thirtyDaysAgo.toISOString()),
        Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('plan', 'pro'),
        Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [Query.limit(1)]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', today.toISOString()),
        Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [Query.limit(1)]),
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', today.toISOString()),
        Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(5),
      ]),
    ]);

    const totalUsers = totalUsersRes.total;
    const activeUsers = activeUsersRes.total;
    const proUsers = proUsersRes.total;
    const totalImageGenerations = totalImageGenRes.total;
    const imageGenerationsToday = imagesTodayRes.total;
    const totalSearches = totalSearchesRes.total;
    const searchesToday = searchesTodayRes.total;
    const recentImages = recentImagesRes.documents;

    // Calculate pro percentage
    const proPercentage = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;

    const recentActivity = recentImages.map(item => ({
      title: 'Image Generated',
      description: `${item.userEmail} generated an image`,
      time: new Date(item.$createdAt).toLocaleString(),
      bgColor: 'bg-purple-500/10',
      icon: '🎨',
    }));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      proUsers: proUsers || 0,
      proPercentage,
      totalImageGenerations: totalImageGenerations || 0,
      imageGenerationsToday: imageGenerationsToday || 0,
      totalSearches: totalSearches || 0,
      searchesToday: searchesToday || 0,
      totalFiles: 0, // Will be calculated from Library table uploadedFiles
      totalFileSize: '0 MB',
      monthlyRevenue: '₹0', // Will need subscription data
      newSubscriptionsThisMonth: 0,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
