'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  MoveVertical,
  FolderOpen,
  Folder,
} from 'lucide-react';
import type { CategoryNode } from '@/lib/categories/tree';
import { getDescendants } from '@/lib/categories/tree';
import { MAX_CATEGORY_DEPTH } from '@/lib/categories/validation';

interface CategoryTreeViewProps {
  categories: CategoryNode[];
  allCategoriesFlat: CategoryNode[];
  onEdit: (category: CategoryNode) => void;
  onDelete: (id: string, reassignTo?: string) => Promise<void>;
  onMove: (id: string, newParentId: string | null) => Promise<void>;
}

interface CategoryTreeItemProps {
  category: CategoryNode;
  allCategoriesFlat: CategoryNode[];
  onEdit: (category: CategoryNode) => void;
  onDelete: (id: string, reassignTo?: string) => Promise<void>;
  onMove: (id: string, newParentId: string | null) => Promise<void>;
  level: number;
}

function CategoryTreeItem({
  category,
  allCategoriesFlat,
  onEdit,
  onDelete,
  onMove,
  level,
}: CategoryTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [moveTarget, setMoveTarget] = useState<string>('__none__');

  const hasChildren = category.children && category.children.length > 0;
  const postCount = category.postCount || 0;

  // Get descendants for this category (to exclude from move targets)
  const descendants = getDescendants(category.id, allCategoriesFlat);
  const descendantIds = new Set([category.id, ...descendants.map(d => d.id)]);

  // Get valid move targets (exclude self, descendants, and categories at max depth)
  const validMoveTargets = allCategoriesFlat.filter(cat => {
    if (descendantIds.has(cat.id)) return false;
    if (cat.depth >= MAX_CATEGORY_DEPTH) return false;
    return true;
  });

  // Get valid reassignment targets for posts (any category except the one being deleted)
  const validReassignTargets = allCategoriesFlat.filter(cat => cat.id !== category.id);

  // Get affected subcategories for delete confirmation
  const affectedSubcategories = descendants;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(category.id, reassignTarget || undefined);
    } finally {
      setIsDeleting(false);
      setReassignTarget('');
    }
  };

  const handleMove = async () => {
    setIsMoving(true);
    try {
      const newParentId = moveTarget === '__none__' ? null : moveTarget;
      await onMove(category.id, newParentId);
    } finally {
      setIsMoving(false);
      setMoveTarget('__none__');
    }
  };

  // Generate path display for a category
  const getCategoryPath = (cat: CategoryNode): string => {
    const path: string[] = [];
    let current: CategoryNode | undefined = cat;
    while (current) {
      path.unshift(current.name);
      current = allCategoriesFlat.find(c => c.id === current?.parentId);
    }
    return path.join(' > ');
  };

  return (
    <div className="border-l border-border">
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 group"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-muted rounded"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Folder icon */}
        {hasChildren && isExpanded ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Category name */}
        <span className="font-medium flex-1">{category.name}</span>

        {/* Slug */}
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {category.slug}
        </span>

        {/* Post count */}
        <Badge variant="secondary" className="ml-2">
          {postCount} {postCount === 1 ? 'post' : 'posts'}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(category)}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* Move dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoveVertical className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Move &quot;{category.name}&quot; to a different parent category.
                  {descendants.length > 0 && (
                    <span className="block mt-2">
                      This will also move {descendants.length} subcategories.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Select value={moveTarget} onValueChange={setMoveTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">None (Make Root Category)</span>
                    </SelectItem>
                    {validMoveTargets.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {'\u00A0'.repeat(cat.depth * 4)}
                        {cat.name}
                        {cat.depth > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({getCategoryPath(cat)})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMove} disabled={isMoving}>
                  {isMoving ? 'Moving...' : 'Move Category'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{category.name}&quot;?
                  {affectedSubcategories.length > 0 && (
                    <span className="block mt-2 font-medium">
                      This category has {affectedSubcategories.length} subcategories that will be
                      moved to the parent level:
                      <ul className="list-disc list-inside mt-1">
                        {affectedSubcategories.slice(0, 5).map((sub) => (
                          <li key={sub.id}>{sub.name}</li>
                        ))}
                        {affectedSubcategories.length > 5 && (
                          <li>...and {affectedSubcategories.length - 5} more</li>
                        )}
                      </ul>
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {postCount > 0 && (
                <div className="py-4">
                  <p className="text-sm text-destructive mb-2">
                    This category has {postCount} posts. Please select a category to reassign them to:
                  </p>
                  <Select value={reassignTarget} onValueChange={setReassignTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category for posts" />
                    </SelectTrigger>
                    <SelectContent>
                      {validReassignTargets.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {'\u00A0'.repeat(cat.depth * 4)}
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting || (postCount > 0 && !reassignTarget)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Category'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              allCategoriesFlat={allCategoriesFlat}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeView({
  categories,
  allCategoriesFlat,
  onEdit,
  onDelete,
  onMove,
}: CategoryTreeViewProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No categories yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-4 text-sm font-medium">
        <span className="flex-1">Category</span>
        <span className="hidden sm:inline w-32">Slug</span>
        <span className="w-24 text-center">Posts</span>
        <span className="w-28 text-right">Actions</span>
      </div>
      {categories.map((category) => (
        <CategoryTreeItem
          key={category.id}
          category={category}
          allCategoriesFlat={allCategoriesFlat}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          level={0}
        />
      ))}
    </div>
  );
}

export default CategoryTreeView;
