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
import { Trash2, Edit2, FolderOpen } from 'lucide-react';

interface FolderContextMenuProps {
  folderId: string;
  folderName: string;
  mediaCount: number;
  children: React.ReactNode;
  onDeleted?: () => void;
  onRenamed?: () => void;
}

export function FolderContextMenu({ 
  folderId, 
  folderName, 
  mediaCount,
  children, 
  onDeleted, 
  onRenamed 
}: FolderContextMenuProps) {
  const router = useRouter();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(folderName);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenFolder = () => {
    router.push(`/dashboard/media?folderId=${folderId}`);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === folderName) {
      setShowRenameDialog(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/media/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        toast.success('เปลี่ยนชื่อโฟลเดอร์สำเร็จ');
        setShowRenameDialog(false);
        onRenamed?.();
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to rename folder');
      }
    } catch {
      toast.error('Failed to rename folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // Use force=true to delete folder along with all media inside
      const response = await fetch(`/api/admin/media/folders/${folderId}?force=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('ลบโฟลเดอร์สำเร็จ');
        setShowDeleteDialog(false);
        onDeleted?.();
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete folder');
      }
    } catch {
      toast.error('Failed to delete folder');
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
          <ContextMenuItem onClick={handleOpenFolder}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => {
            setNewName(folderName);
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
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder name</Label>
              <Input
                id="folderName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{folderName}&quot;?
              {mediaCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ โฟลเดอร์นี้มี {mediaCount} ไฟล์ ไฟล์ทั้งหมดจะถูกลบด้วย
                </span>
              )}
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
