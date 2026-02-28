import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET(request) {
  try {
    // Get total users count
    const { count: totalUsers } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true });

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', thirtyDaysAgo.toISOString());

    // Get pro users count
    const { count: proUsers } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro');

    // Get total image generations
    const { count: totalImageGenerations } = await supabase
      .from('ImageGeneration')
      .select('*', { count: 'exact', head: true });

    // Get today's image generations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: imageGenerationsToday } = await supabase
      .from('ImageGeneration')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get total searches and research (from Library table)
    const { count: totalSearches } = await supabase
      .from('Library')
      .select('*', { count: 'exact', head: true });

    const { count: searchesToday } = await supabase
      .from('Library')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', today.toISOString());

    // Calculate pro percentage
    const proPercentage = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;

    // Get recent activity (last 5 activities)
    const { data: recentImages } = await supabase
      .from('ImageGeneration')
      .select('userEmail, prompt, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentActivity = recentImages?.map(item => ({
      title: 'Image Generated',
      description: `${item.userEmail} generated an image`,
      time: new Date(item.created_at).toLocaleString(),
      bgColor: 'bg-purple-500/10',
      icon: '🎨',
    })) || [];

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
