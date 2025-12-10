'use client';

import { useState } from 'react';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { CategoryTreeView } from '@/components/admin/CategoryTreeView';
import type { CategoryNode } from '@/lib/categories/tree';

interface CategoriesClientProps {
  categoryTree: CategoryNode[];
  allCategoriesFlat: CategoryNode[];
  createCategory: (formData: FormData) => Promise<void>;
  updateCategory: (formData: FormData) => Promise<void>;
  deleteCategory: (id: string, reassignTo?: string) => Promise<void>;
  moveCategory: (id: string, newParentId: string | null) => Promise<void>;
}

export function CategoriesClient({
  categoryTree,
  allCategoriesFlat,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
}: CategoriesClientProps) {
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);

  const handleEdit = (category: CategoryNode) => {
    setEditingCategory(category);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleSubmit = async (formData: FormData) => {
    if (editingCategory) {
      await updateCategory(formData);
      setEditingCategory(null);
    } else {
      await createCategory(formData);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Category Form */}
      <div className="lg:col-span-1">
        <CategoryForm
          onSubmit={handleSubmit}
          initialData={
            editingCategory
              ? {
                  id: editingCategory.id,
                  name: editingCategory.name,
                  slug: editingCategory.slug,
                  description: editingCategory.description || undefined,
                  parentId: editingCategory.parentId,
                }
              : undefined
          }
          categories={categoryTree}
        />
        {editingCategory && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="mt-2 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel editing
          </button>
        )}
      </div>

      {/* Categories Tree View */}
      <div className="lg:col-span-2">
        <CategoryTreeView
          categories={categoryTree}
          allCategoriesFlat={allCategoriesFlat}
          onEdit={handleEdit}
          onDelete={deleteCategory}
          onMove={moveCategory}
        />
      </div>
    </div>
  );
}
