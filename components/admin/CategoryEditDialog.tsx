'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { CategoryNode } from '@/lib/categories/tree';
import { getDescendants } from '@/lib/categories/tree';
import { MAX_CATEGORY_DEPTH } from '@/lib/categories/validation';

interface CategoryEditDialogProps {
  category: CategoryNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (formData: FormData) => Promise<void>;
  categories: CategoryNode[];
  allCategoriesFlat: CategoryNode[];
}

function flattenTreeWithPaths(
  nodes: CategoryNode[],
  parentPath: string[] = []
): Array<CategoryNode & { displayPath: string }> {
  const result: Array<CategoryNode & { displayPath: string }> = [];
  for (const node of nodes) {
    const currentPath = [...parentPath, node.name];
    result.push({ ...node, displayPath: currentPath.join(' > ') });
    if (node.children?.length) {
      result.push(...flattenTreeWithPaths(node.children, currentPath));
    }
  }
  return result;
}

export function CategoryEditDialog({
  category,
  open,
  onOpenChange,
  onSave,
  categories,
  allCategoriesFlat,
}: CategoryEditDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || '');
      setParentId(category.parentId || '');
    }
  }, [category]);

  const flattenedCategories = useMemo(() => flattenTreeWithPaths(categories), [categories]);

  const disabledCategoryIds = useMemo(() => {
    const disabled = new Set<string>();
    if (category?.id) {
      disabled.add(category.id);
      getDescendants(category.id, allCategoriesFlat).forEach(d => disabled.add(d.id));
    }
    allCategoriesFlat.forEach(cat => {
      if (cat.depth >= MAX_CATEGORY_DEPTH) disabled.add(cat.id);
    });
    return disabled;
  }, [category?.id, allCategoriesFlat]);

  const generateSlug = () => {
    setSlug(
      name.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('id', category.id);
      formData.set('name', name);
      formData.set('slug', slug);
      formData.set('description', description);
      if (parentId && parentId !== '__none__') {
        formData.set('parentId', parentId);
      }
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIndentation = (depth: number) => '\u00A0\u00A0\u00A0\u00A0'.repeat(depth);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-parent">Parent Category</Label>
            <Select value={parentId || '__none__'} onValueChange={v => setParentId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">None (Root Category)</span>
                </SelectItem>
                {flattenedCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} disabled={disabledCategoryIds.has(cat.id)}>
                    <span className={disabledCategoryIds.has(cat.id) ? 'text-muted-foreground' : ''}>
                      {getIndentation(cat.depth)}{cat.name}
                      {cat.depth > 0 && <span className="ml-2 text-xs text-muted-foreground">({cat.displayPath})</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cat-name">Name</Label>
            <Input id="edit-cat-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-cat-slug">Slug</Label>
              <Button type="button" variant="ghost" size="sm" onClick={generateSlug}>Generate</Button>
            </div>
            <Input id="edit-cat-slug" value={slug} onChange={e => setSlug(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-cat-desc">Description</Label>
            <Input id="edit-cat-desc" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
