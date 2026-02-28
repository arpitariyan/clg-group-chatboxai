import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '3d':
        startDate.setDate(startDate.getDate() - 3);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get new users in range
    const { count: newUsers } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get total searches in range
    const { count: totalSearches } = await supabase
      .from('Library')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', startDate.toISOString());

    // Get total images in range
    const { count: totalImages } = await supabase
      .from('ImageGeneration')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get successful images
    const { count: successfulImages } = await supabase
      .from('ImageGeneration')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    const successRate = totalImages > 0 ? Math.round((successfulImages / totalImages) * 100) : 0;

    // Get top active users
    const { data: topUsers } = await supabase
      .from('Library')
      .select('userEmail, Users!inner(name, email)')
      .gte('createdAt', startDate.toISOString())
      .limit(100);

    // Count activities per user
    const userActivityMap = {};
    topUsers?.forEach(item => {
      const email = item.userEmail;
      if (!userActivityMap[email]) {
        userActivityMap[email] = {
          email,
          name: item.Users?.name || 'Unknown',
          activity_count: 0,
        };
      }
      userActivityMap[email].activity_count++;
    });

    const topActiveUsers = Object.values(userActivityMap)
      .sort((a, b) => b.activity_count - a.activity_count)
      .slice(0, 5);

    // Get model usage statistics
    const { data: modelUsageData } = await supabase
      .from('Library')
      .select('selectedModel')
      .gte('createdAt', startDate.toISOString());

    const modelUsageMap = {};
    modelUsageData?.forEach(item => {
      const model = item.selectedModel || 'Unknown';
      modelUsageMap[model] = (modelUsageMap[model] || 0) + 1;
    });

    const modelUsage = Object.entries(modelUsageMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average searches per user
    const { count: totalUsers } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true });

    const avgSearchesPerUser = totalUsers > 0 ? Math.round(totalSearches / totalUsers) : 0;

    // Get user growth data by day
    const { data: usersByDay } = await supabase
      .from('Users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get search activity by day
    const { data: searchesByDay } = await supabase
      .from('Library')
      .select('createdAt')
      .gte('createdAt', startDate.toISOString())
      .order('createdAt', { ascending: true });

    // Get image activity by day
    const { data: imagesByDay } = await supabase
      .from('ImageGeneration')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Helper function to group data by date
    const groupByDate = (data, dateField) => {
      const grouped = {};
      data?.forEach(item => {
        const date = new Date(item[dateField]).toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });
      return grouped;
    };

    // Create date range array
    const getDaysInRange = () => {
      const days = [];
      const current = new Date(startDate);
      const end = new Date(now);
      
      while (current <= end) {
        days.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    };

    const dateRange = getDaysInRange();
    const userGrowthMap = groupByDate(usersByDay, 'created_at');
    const searchActivityMap = groupByDate(searchesByDay, 'createdAt');
    const imageActivityMap = groupByDate(imagesByDay, 'created_at');

    // Format data for charts
    const userGrowthData = dateRange.map(date => ({
      date,
      count: userGrowthMap[date] || 0,
    }));

    const searchActivityData = dateRange.map(date => ({
      date,
      count: searchActivityMap[date] || 0,
    }));

    const imageActivityData = dateRange.map(date => ({
      date,
      count: imageActivityMap[date] || 0,
    }));

    // Get plan distribution
    const { count: freeUsersCount } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free');

    const { count: proUsersCount } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro');

    const totalUsersForPlan = (freeUsersCount || 0) + (proUsersCount || 0);
    const planDistribution = {
      free: freeUsersCount || 0,
      pro: proUsersCount || 0,
      freePercent: totalUsersForPlan > 0 ? Math.round((freeUsersCount / totalUsersForPlan) * 100) : 0,
      proPercent: totalUsersForPlan > 0 ? Math.round((proUsersCount / totalUsersForPlan) * 100) : 0,
    };

    return NextResponse.json({
      newUsers: newUsers || 0,
      userGrowth: 0, // Could calculate from previous period
      totalSearches: totalSearches || 0,
      avgSearchesPerUser,
      totalImages: totalImages || 0,
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
