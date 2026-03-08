import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import {
  USERS_COLLECTION_ID,
  LIBRARY_COLLECTION_ID,
  IMAGE_GENERATION_COLLECTION_ID,
} from '@/services/appwrite-collections';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case '1d': startDate.setDate(startDate.getDate() - 1); break;
      case '3d': startDate.setDate(startDate.getDate() - 3); break;
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      case '3m': startDate.setMonth(startDate.getMonth() - 3); break;
      default: startDate.setDate(startDate.getDate() - 7);
    }

    const startIso = startDate.toISOString();

    // Run parallel count + data queries
    const [
      newUsersRes,
      totalSearchesRes,
      totalImagesRes,
      successfulImagesRes,
      topUsersRes,
      modelUsageRes,
      totalUsersRes,
      usersByDayRes,
      searchesByDayRes,
      imagesByDayRes,
      freeUsersRes,
      proUsersRes,
    ] = await Promise.all([
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso), Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso), Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso), Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso),
        Query.equal('status', 'completed'),
        Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso),
        Query.limit(100),
      ]),
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso),
        Query.limit(500),
      ]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [Query.limit(1)]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso),
        Query.orderAsc('$createdAt'),
        Query.limit(500),
      ]),
      databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso),
        Query.orderAsc('$createdAt'),
        Query.limit(500),
      ]),
      databases.listDocuments(DB_ID, IMAGE_GENERATION_COLLECTION_ID, [
        Query.greaterThanEqual('$createdAt', startIso),
        Query.orderAsc('$createdAt'),
        Query.limit(500),
      ]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('plan', 'free'), Query.limit(1),
      ]),
      databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('plan', 'pro'), Query.limit(1),
      ]),
    ]);

    const newUsers = newUsersRes.total;
    const totalSearches = totalSearchesRes.total;
    const totalImages = totalImagesRes.total;
    const successfulImages = successfulImagesRes.total;
    const successRate = totalImages > 0 ? Math.round((successfulImages / totalImages) * 100) : 0;
    const totalUsers = totalUsersRes.total;

    // 2-step JOIN: top active users from Library + Users
    const libDocs = topUsersRes.documents;
    const uniqueEmails = [...new Set(libDocs.map(d => d.userEmail).filter(Boolean))];
    let userNameMap = {};
    if (uniqueEmails.length > 0) {
      const usersRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('email', uniqueEmails),
        Query.limit(uniqueEmails.length + 10),
      ]);
      usersRes.documents.forEach(u => { userNameMap[u.email] = u.name; });
    }

    const userActivityMap = {};
    libDocs.forEach(item => {
      const email = item.userEmail;
      if (!userActivityMap[email]) {
        userActivityMap[email] = {
          email,
          name: userNameMap[email] || 'Unknown',
          activity_count: 0,
        };
      }
      userActivityMap[email].activity_count++;
    });

    const topActiveUsers = Object.values(userActivityMap)
      .sort((a, b) => b.activity_count - a.activity_count)
      .slice(0, 5);

    // Model usage
    const modelUsageMap = {};
    modelUsageRes.documents.forEach(item => {
      const model = item.selectedModel || 'Unknown';
      modelUsageMap[model] = (modelUsageMap[model] || 0) + 1;
    });
    const modelUsage = Object.entries(modelUsageMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const avgSearchesPerUser = totalUsers > 0 ? Math.round(totalSearches / totalUsers) : 0;

    // Helper: group by date
    const groupByDate = (docs, dateField) => {
      const grouped = {};
      docs.forEach(item => {
        const date = new Date(item[dateField]).toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });
      return grouped;
    };

    // Create date range array
    const dateRange = [];
    const cur = new Date(startDate);
    while (cur <= now) {
      dateRange.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    const userGrowthMap = groupByDate(usersByDayRes.documents, '$createdAt');
    const searchActivityMap = groupByDate(searchesByDayRes.documents, '$createdAt');
    const imageActivityMap = groupByDate(imagesByDayRes.documents, '$createdAt');

    const userGrowthData = dateRange.map(date => ({ date, count: userGrowthMap[date] || 0 }));
    const searchActivityData = dateRange.map(date => ({ date, count: searchActivityMap[date] || 0 }));
    const imageActivityData = dateRange.map(date => ({ date, count: imageActivityMap[date] || 0 }));

    const freeUsersCount = freeUsersRes.total;
    const proUsersCount = proUsersRes.total;
    const totalUsersForPlan = freeUsersCount + proUsersCount;
    const planDistribution = {
      free: freeUsersCount,
      pro: proUsersCount,
      freePercent: totalUsersForPlan > 0 ? Math.round((freeUsersCount / totalUsersForPlan) * 100) : 0,
      proPercent: totalUsersForPlan > 0 ? Math.round((proUsersCount / totalUsersForPlan) * 100) : 0,
    };

    return NextResponse.json({
      newUsers,
      userGrowth: 0,
      totalSearches,
      avgSearchesPerUser,
      totalImages,
      successRate,
      totalFiles: 0,
      totalFileSize: '0 MB',
      topUsers: topActiveUsers,
      modelUsage,
      userGrowthData,
      searchActivityData,
      imageActivityData,
      planDistribution,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
