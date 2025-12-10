import { requireEditor, getCurrentUser } from '@/lib/auth';
import { categoryService } from '@/lib/admin/categories';
import { tagService } from '@/lib/admin/tags';
import { adminPostService } from '@/lib/admin/posts';
import { logActivity } from '@/lib/admin/logger';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { PostForm } from '@/components/admin/PostForm';

import readingTime from 'reading-time';

export default async function NewPostPage() {
  await requireEditor();
  
  // Use getCategoryTree() to get hierarchical categories for the dropdown
  // Requirements: 5.1, 5.3
  const [categories, tags] = await Promise.all([
    categoryService.getCategoryTree(),
    tagService.getAllTags(),
  ]);

  async function createPost(data: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    locale: string;
    status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
    categoryId?: string;
    tagIds?: string[];
    featured?: boolean;
  }): Promise<{ id: string }> {
    'use server';
    
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const stats = readingTime(data.content);

    const post = await adminPostService.createPost({
      ...data,
      authorId: user.id,
      readingTime: Math.ceil(stats.minutes),
    });

    await logActivity({
      action: 'CREATE_POST',
      entityType: 'POST',
      entityId: post.id,
      details: { title: data.title, status: data.status },
      userId: user.id
    });

    // Return post ID so PostForm can save media associations before redirecting
    return { id: post.id };
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="New Post" />
        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-4xl">
            <PostForm
              categories={categories}
              tags={tags}
              onSubmit={createPost}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
