import { requireEditor } from '@/lib/auth/roles';
import { analyticsService } from '@/lib/admin/analytics';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { StatsCard } from '@/components/admin/StatsCard';
import { AnalyticsChart } from '@/components/admin/AnalyticsChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AnalyticsPage() {
  await requireEditor();
  
  const stats = await analyticsService.getDashboardStats();
  
  // Get views for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const viewsOverTime = await analyticsService.getViewsOverTime({
    start: thirtyDaysAgo,
    end: new Date(),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Analytics" />
        <main className="p-4 md:p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Views"
              value={stats.totalViews.toLocaleString()}
              icon={<Eye className="h-4 w-4" />}
            />
            <StatsCard
              title="Views This Week"
              value={stats.viewsThisWeek.toLocaleString()}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatsCard
              title="Views Today"
              value={stats.viewsToday.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
            />
            <StatsCard
              title="Published Posts"
              value={stats.publishedPosts}
              icon={<FileText className="h-4 w-4" />}
            />
          </div>

          {/* Views Chart */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Views Over Time (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart data={viewsOverTime} />
            </CardContent>
          </Card>

          {/* Popular Posts */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.popularPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-4">
                  {stats.popularPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </span>
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="font-medium hover:underline"
                        >
                          {post.title}
                        </Link>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">
                          {post.viewCount.toLocaleString()}
                        </span>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
