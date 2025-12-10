import { requireEditor, getCurrentUser } from '@/lib/auth';
import { categoryService } from '@/lib/admin/categories';
import { logActivity } from '@/lib/admin/logger';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { revalidatePath } from 'next/cache';
import { CategoriesClient } from './CategoriesClient';

export default async function CategoriesPage() {
  await requireEditor();
  const user = await getCurrentUser();
  
  // Get category tree for hierarchical display
  const categoryTree = await categoryService.getCategoryTree();
  
  // Get all categories flat for validation purposes
  const allCategories = await categoryService.getAllCategories();
  const allCategoriesFlat = allCategories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    parentId: c.parentId,
    depth: c.depth,
    postCount: c._count.posts,
  }));

  async function createCategory(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const parentId = formData.get('parentId') as string | null;

    const category = await categoryService.createCategory({ 
      name, 
      slug, 
      description,
      parentId: parentId || null,
    });

    if (user) {
      await logActivity({
        action: 'CREATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: category.id,
        userId: user.id,
        details: { name, slug }
      });
    }

    revalidatePath('/admin/categories');
  }

  async function updateCategory(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;

    await categoryService.updateCategory(id, { name, slug, description });

    if (user) {
      await logActivity({
        action: 'UPDATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        userId: user.id,
        details: { name, slug }
      });
    }

    revalidatePath('/admin/categories');
  }

  async function deleteCategory(id: string, reassignTo?: string) {
    'use server';
    await categoryService.deleteCategory(id, reassignTo);

    if (user) {
      await logActivity({
        action: 'DELETE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        userId: user.id,
        details: { reassignTo }
      });
    }

    revalidatePath('/admin/categories');
  }

  async function moveCategory(id: string, newParentId: string | null) {
    'use server';
    await categoryService.moveCategory(id, newParentId);

    if (user) {
      await logActivity({
        action: 'UPDATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        userId: user.id,
        details: { action: 'move', newParentId }
      });
    }

    revalidatePath('/admin/categories');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Categories" />
        <main className="p-4 md:p-6">
          <CategoriesClient
            categoryTree={categoryTree}
            allCategoriesFlat={allCategoriesFlat}
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            moveCategory={moveCategory}
          />
        </main>
      </div>
    </div>
  );
}
