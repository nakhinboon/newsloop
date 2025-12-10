import { requireEditor } from '@/lib/auth/roles';
import { analyticsService } from '@/lib/admin/analytics';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  await requireEditor();
  
  const stats = await analyticsService.getDashboardStats();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Dashboard" />
        <main className="p-4 md:p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Posts"
              value={stats.totalPosts}
              description={`${stats.publishedPosts} published`}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatsCard
              title="Total Views"
              value={stats.totalViews.toLocaleString()}
              description={`${stats.viewsToday} today`}
              icon={<Eye className="h-4 w-4" />}
            />
            <StatsCard
              title="Views This Week"
              value={stats.viewsThisWeek.toLocaleString()}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatsCard
              title="Drafts"
              value={stats.draftPosts}
              description={`${stats.scheduledPosts} scheduled`}
              icon={<Clock className="h-4 w-4" />}
            />
          </div>

          {/* Popular Posts */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Popular Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.popularPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts yet</p>
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
                          href={`/dashboard/posts/${post.id}`}
                          className="font-medium hover:underline"
                        >
                          {post.title}
                        </Link>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {post.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/posts/new">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">New Post</h3>
                    <p className="text-sm text-muted-foreground">
                      Create a new blog post
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/media">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <Eye className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Media Library</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your images
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/analytics">
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Analytics</h3>
                    <p className="text-sm text-muted-foreground">
                      View detailed stats
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
