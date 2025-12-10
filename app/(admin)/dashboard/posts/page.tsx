import { requireEditor } from '@/lib/auth/roles';
import { adminPostService } from '@/lib/admin/posts';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { DeletePostButton } from '@/components/admin/DeletePostButton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

export default async function PostsPage() {
  await requireEditor();
  
  const posts = await adminPostService.getAllPosts();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Posts" />
        <main className="p-4 md:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">All Posts</h2>
              <p className="text-muted-foreground">
                Manage your blog posts
              </p>
            </div>
            <Link href="/dashboard/posts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Locale</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">No posts yet</p>
                      <Link href="/dashboard/posts/new">
                        <Button variant="link">Create your first post</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => {
                    const coverMedia = post.postMedia?.find((pm) => pm.isCover) || post.postMedia?.[0];
                    const imageUrl = coverMedia?.media?.url;
                    
                    return (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="relative aspect-video w-24 overflow-hidden rounded-md bg-muted">
                            {imageUrl ? (
                              <Image 
                                src={imageUrl} 
                                alt={post.title} 
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/posts/${post.id}`}
                            className="font-medium hover:underline"
                          >
                            {post.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={post.status} />
                        </TableCell>
                        <TableCell>
                          {post.category?.name || '-'}
                        </TableCell>
                        <TableCell className="uppercase">
                          {post.locale}
                        </TableCell>
                        <TableCell>
                          {format(post.createdAt, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/posts/${post.id}`}>
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <DeletePostButton id={post.id} title={post.title} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    </div>
  );
}
