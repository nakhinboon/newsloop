'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Edit2, Copy, ExternalLink } from 'lucide-react';
import type { Media } from '@/lib/generated/prisma';

interface MediaWithFolder extends Media {
  folder?: { id: string; name: string } | null;
}

interface MediaContextMenuProps {
  media: MediaWithFolder;
  children: React.ReactNode;
  onDeleted?: () => void;
  onRenamed?: () => void;
}

export function MediaContextMenu({ media, children, onDeleted, onRenamed }: MediaContextMenuProps) {
  const router = useRouter();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFilename, setNewFilename] = useState(media.filename);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(media.url);
    toast.success('URL copied');
  };

  const handleOpenInNewTab = () => {
    window.open(media.url, '_blank');
  };

  const handleRename = async () => {
    if (!newFilename.trim() || newFilename === media.filename) {
      setShowRenameDialog(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/media/${media.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: newFilename.trim() }),
      });

      if (response.ok) {
        toast.success('เปลี่ยนชื่อสำเร็จ');
        setShowRenameDialog(false);
        onRenamed?.();
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to rename');
      }
    } catch {
      toast.error('Failed to rename');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/media/${media.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('ลบสำเร็จ');
        setShowDeleteDialog(false);
        onDeleted?.();
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </ContextMenuItem>
          <ContextMenuItem onClick={handleOpenInNewTab}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => {
            setNewFilename(media.filename);
            setShowRenameDialog(true);
          }}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isLoading} className="text-white">
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{media.filename}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
