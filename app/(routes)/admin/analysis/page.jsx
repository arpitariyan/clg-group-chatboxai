'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, TrendingUp, Users, Image, Search as SearchIcon, FileText } from 'lucide-react';

const TIME_RANGES = [
  { label: '1 Day', value: '1d' },
  { label: '3 Days', value: '3d' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
];

export default function AdminAnalysisPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-1">
            Track performance metrics and user engagement
          </p>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium mr-4">Time Range:</span>
            <div className="flex gap-2">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics?.newUsers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className={analytics?.userGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {analytics?.userGrowth >= 0 ? '+' : ''}{analytics?.userGrowth || 0}%
                  </span> from previous period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <SearchIcon className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics?.totalSearches || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {analytics?.avgSearchesPerUser || 0} per user
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card   className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Image Generations</CardTitle>
            <Image className="h-5 w-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics?.totalImages || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.successRate || 0}% success rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Processed</CardTitle>
            <FileText className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics?.totalFiles || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.totalFileSize || '0 MB'} total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts - User Growth */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>Daily new user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : analytics?.userGrowthData && analytics.userGrowthData.length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-2 px-4">
              {analytics.userGrowthData.map((day, index) => {
                const maxValue = Math.max(...analytics.userGrowthData.map(d => d.count));
                const height = maxValue > 0 ? (day.count / maxValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-medium text-primary">{day.count}</div>
                    <div 
                      className="w-full bg-primary rounded-t transition-all hover:opacity-80"
                      style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                      title={`${day.date}: ${day.count} users`}
                    />
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No user growth data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle>Search Activity</CardTitle>
            <CardDescription>Daily search volume</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : analytics?.searchActivityData && analytics.searchActivityData.length > 0 ? (
              <div className="h-48 flex items-end justify-between gap-2 px-4">
                {analytics.searchActivityData.map((day, index) => {
                  const maxValue = Math.max(...analytics.searchActivityData.map(d => d.count));
                  const height = maxValue > 0 ? (day.count / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs font-medium text-purple-500">{day.count}</div>
                      <div 
                        className="w-full bg-purple-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        title={`${day.date}: ${day.count} searches`}
                      />
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No search data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle>Image Generation</CardTitle>
            <CardDescription>Daily image creation volume</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : analytics?.imageActivityData && analytics.imageActivityData.length > 0 ? (
              <div className="h-48 flex items-end justify-between gap-2 px-4">
                {analytics.imageActivityData.map((day, index) => {
                  const maxValue = Math.max(...analytics.imageActivityData.map(d => d.count));
                  const height = maxValue > 0 ? (day.count / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs font-medium text-pink-500">{day.count}</div>
                      <div 
                        className="w-full bg-pink-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        title={`${day.date}: ${day.count} images`}
                      />
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No image generation data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Free vs Pro users</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : analytics?.planDistribution ? (
              <div className="h-48 flex items-center justify-center">
                <div className="space-y-4 w-full max-w-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Free Users</span>
                      <span className="text-sm text-muted-foreground">
                        {analytics.planDistribution.free} ({analytics.planDistribution.freePercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-accent h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${analytics.planDistribution.freePercent}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Pro Users</span>
                      <span className="text-sm text-muted-foreground">
                        {analytics.planDistribution.pro} ({analytics.planDistribution.proPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-accent h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-linear-to-r from-yellow-500 to-orange-500 h-full transition-all"
                        style={{ width: `${analytics.planDistribution.proPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No plan distribution data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
            <CardDescription>Top users by activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : analytics?.topUsers && analytics.topUsers.length > 0 ? (
              <div className="space-y-3">
                {analytics.topUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{user.activity_count}</p>
                      <p className="text-xs text-muted-foreground">actions</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Usage Statistics */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardHeader>
          <CardTitle>Model Usage</CardTitle>
          <CardDescription>Most popular AI models</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : analytics?.modelUsage && analytics.modelUsage.length > 0 ? (
            <div className="space-y-4">
              {analytics.modelUsage.map((model, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{model.name}</span>
                    <span className="text-sm text-muted-foreground">{model.count} uses</span>
                  </div>
                  <div className="w-full bg-accent h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${(model.count / analytics.modelUsage[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No model usage data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
