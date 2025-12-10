'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface CategoryFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    parentId?: string | null;
  };
  categories?: CategoryNode[];
}

/**
 * Flattens a category tree into a list with path information for display
 */
function flattenTreeWithPaths(
  nodes: CategoryNode[],
  parentPath: string[] = []
): Array<CategoryNode & { path: string; displayPath: string }> {
  const result: Array<CategoryNode & { path: string; displayPath: string }> = [];

  for (const node of nodes) {
    const currentPath = [...parentPath, node.name];
    const pathString = currentPath.join('/');
    const displayPath = currentPath.join(' > ');

    result.push({
      ...node,
      path: pathString,
      displayPath,
    });

    if (node.children && node.children.length > 0) {
      result.push(...flattenTreeWithPaths(node.children, currentPath));
    }
  }

  return result;
}

export function CategoryForm({ onSubmit, initialData, categories = [] }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [parentId, setParentId] = useState<string>(initialData?.parentId || '');

  // Flatten categories with path information for the dropdown
  const flattenedCategories = useMemo(() => {
    return flattenTreeWithPaths(categories);
  }, [categories]);

  // Get all categories as a flat list for validation
  const allCategoriesFlat = useMemo(() => {
    const flatten = (nodes: CategoryNode[]): CategoryNode[] => {
      const result: CategoryNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          result.push(...flatten(node.children));
        }
      }
      return result;
    };
    return flatten(categories);
  }, [categories]);

  // Determine which categories should be disabled in the dropdown
  const disabledCategoryIds = useMemo(() => {
    const disabled = new Set<string>();

    // If editing, disable self and all descendants
    if (initialData?.id) {
      disabled.add(initialData.id);
      const descendants = getDescendants(initialData.id, allCategoriesFlat);
      descendants.forEach(d => disabled.add(d.id));
    }

    // Disable categories at max depth (can't have children)
    allCategoriesFlat.forEach(cat => {
      if (cat.depth >= MAX_CATEGORY_DEPTH) {
        disabled.add(cat.id);
      }
    });

    return disabled;
  }, [initialData?.id, allCategoriesFlat]);

  const generateSlug = () => {
    const newSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(newSlug);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      // Add parentId to form data
      if (parentId && parentId !== '__none__') {
        formData.set('parentId', parentId);
      } else {
        formData.delete('parentId');
      }
      await onSubmit(formData);
      if (!initialData) {
        setName('');
        setSlug('');
        setParentId('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate indentation based on depth
  const getIndentation = (depth: number) => {
    return '\u00A0\u00A0\u00A0\u00A0'.repeat(depth); // 4 non-breaking spaces per level
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Category' : 'Add Category'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {initialData?.id && (
            <input type="hidden" name="id" value={initialData.id} />
          )}

          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category (optional)</Label>
            <Select
              value={parentId || '__none__'}
              onValueChange={(value) => setParentId(value === '__none__' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select parent category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">None (Root Category)</span>
                </SelectItem>
                {flattenedCategories.map((category) => {
                  const isDisabled = disabledCategoryIds.has(category.id);
                  return (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      disabled={isDisabled}
                    >
                      <span className={isDisabled ? 'text-muted-foreground' : ''}>
                        {getIndentation(category.depth)}
                        {category.name}
                        {category.depth > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({category.displayPath})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Categories can be nested up to {MAX_CATEGORY_DEPTH + 1} levels deep
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">Slug</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateSlug}
              >
                Generate
              </Button>
            </div>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="category-slug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              name="description"
              defaultValue={initialData?.description}
              placeholder="Brief description"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update' : 'Add Category'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default CategoryForm;
