'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FolderCardProps {
  id?: string;
  name: string;
  count: number;
  isSelected?: boolean;
  onClick: () => void;
  onDrop?: (mediaId: string) => void;
  onDelete?: () => void;
  onRename?: () => void;
}

/**
 * FolderCard - Clickable folder card with drag-drop support (Google Drive style)
 * Requirements: 5.6, 5.7, 5.8
 */
export function FolderCard({
  name,
  count,
  isSelected = false,
  onClick,
  onDrop,
  onDelete,
  onRename,
}: FolderCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const mediaId = e.dataTransfer.getData('mediaId');
    if (mediaId && onDrop) {
      onDrop(mediaId);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdown
    if ((e.target as HTMLElement).closest('[data-dropdown]')) {
      return;
    }
    onClick();
  };

  return (
    <Card
      className={cn(
        'cursor-pointer overflow-hidden transition-all hover:shadow-md border p-3',
        isSelected && 'ring-2 ring-primary border-primary',
        isDragOver && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
      )}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className=" flex items-center gap-3 p-0">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          isSelected ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'
        )}>
          <Folder className={cn(
            'h-5 w-5',
            isSelected ? 'text-primary' : 'text-blue-500'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {count} item{count !== 1 ? 's' : ''}
          </p>
        </div>
        {(onDelete || onRename) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-dropdown>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRename && (
                <DropdownMenuItem onClick={onRename}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 pointer-events-none">
            <span className="text-xs font-medium text-blue-600">Drop here</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FolderCard;
