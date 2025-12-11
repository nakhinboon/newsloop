'use client';

import { useState } from 'react';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { CategoryTreeView } from '@/components/admin/CategoryTreeView';
import { CategoryEditDialog } from '@/components/admin/CategoryEditDialog';
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEdit = (category: CategoryNode) => {
    setEditingCategory(category);
    setEditDialogOpen(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Category Form - สำหรับสร้างใหม่เท่านั้น */}
      <div className="lg:col-span-1">
        <CategoryForm
          onSubmit={createCategory}
          categories={categoryTree}
        />
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

      {/* Edit Dialog */}
      <CategoryEditDialog
        category={editingCategory}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={updateCategory}
        categories={categoryTree}
        allCategoriesFlat={allCategoriesFlat}
      />
    </div>
  );
}
