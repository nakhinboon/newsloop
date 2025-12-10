import { requireEditor, getCurrentUser } from '@/lib/auth';
import { adminPostService } from '@/lib/admin/posts';
import { categoryService } from '@/lib/admin/categories';
import { tagService } from '@/lib/admin/tags';
import { logActivity } from '@/lib/admin/logger';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { PostForm } from '@/components/admin/PostForm';
import { notFound } from 'next/navigation';
import readingTime from 'reading-time';

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  await requireEditor();
  
  const { id } = await params;
  
  // Use getCategoryTree() to get hierarchical categories for the dropdown
  // Requirements: 5.1, 5.3
  const [post, categories, tags] = await Promise.all([
    adminPostService.getPostById(id),
    categoryService.getCategoryTree(),
    tagService.getAllTags(),
  ]);

  if (!post) {
    notFound();
  }

  async function updatePost(data: {
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

    await adminPostService.updatePost(id, {
      ...data,
      readingTime: Math.ceil(stats.minutes),
    });

    await logActivity({
      action: 'UPDATE_POST',
      entityType: 'POST',
      entityId: id,
      details: { title: data.title, status: data.status },
      userId: user.id
    });

    // Return post ID so PostForm can save media associations before redirecting
    return { id };
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Edit Post" />
        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-4xl">
            <PostForm
              post={post}
              categories={categories}
              tags={tags}
              onSubmit={updatePost}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
