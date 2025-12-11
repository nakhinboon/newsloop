'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FolderCard } from './FolderCard';
import { MediaGrid } from './MediaGrid';
import { MediaUploader } from './MediaUploader';
import { FolderContextMenu } from './FolderContextMenu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, List, Plus, Home, Loader2, FolderPlus, Upload } from 'lucide-react';
import type { Media } from '@/lib/generated/prisma';

interface FolderWithCount {
  id: string;
  name: string;
  _count: {
    media: number;
  };
}

interface MediaWithFolder extends Media {
  folder?: { id: string; name: string } | null;
}

interface DriveViewProps {
  folders: FolderWithCount[];
  media: {
    items: MediaWithFolder[];
    page: number;
    totalPages: number;
    total: number;
  };
}

export function DriveView({ folders, media }: DriveViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get('folderId');
  const searchQuery = searchParams.get('search') || '';
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload single file helper
  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    const response = await fetch('/api/admin/media/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      toast.success(`อัปโหลดสำเร็จ: ${file.name}`);
      router.refresh();
    } else {
      const error = await response.json();
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
  }, [currentFolderId, router]);

  // Handle page-level drag events
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDraggingOver(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setDragCounter(0);

    // Skip if drop target is a folder card (it handles its own drop)
    const target = e.target as HTMLElement;
    if (target.closest('[data-folder-card]')) {
      return;
    }

    const files = Array.from(e.dataTransfer?.files || []).filter((file) =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      // Try to handle URL drops from external sources
      const items = e.dataTransfer?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'string' && item.type === 'text/uri-list') {
            item.getAsString(async (url) => {
              try {
                setIsUploading(true);
                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch image');
                
                const contentType = response.headers.get('content-type');
                if (!contentType?.startsWith('image/')) {
                  toast.error('URL does not point to an image');
                  return;
                }
                
                const blob = await response.blob();
                const filename = url.split('/').pop()?.split('?')[0] || 'image';
                const extension = contentType.split('/')[1] || 'png';
                const finalFilename = filename.includes('.') ? filename : `${filename}.${extension}`;
                
                const file = new File([blob], finalFilename, { type: contentType });
                await uploadFile(file);
              } catch {
                toast.error('Failed to load image from URL');
              } finally {
                setIsUploading(false);
              }
            });
          }
        }
      }
      return;
    }

    // Upload files directly
    setIsUploading(true);
    let successCount = 0;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) {
          formData.append('folderId', currentFolderId);
        }

        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          const error = await response.json();
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`อัปโหลดสำเร็จ ${successCount} ไฟล์`);
        router.refresh();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [currentFolderId, router, uploadFile]);

  // Attach drag events to document
  useEffect(() => {
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  // Navigate into folder (not toggle)
  const handleFolderClick = (folderId: string) => {
    const params = new URLSearchParams();
    params.set('folderId', folderId);
    params.set('page', '1');
    router.push(`/dashboard/media?${params.toString()}`);
  };

  // Handle drop media on folder
  const handleDropOnFolder = async (folderId: string, mediaId: string) => {
    try {
      const response = await fetch(`/api/admin/media/${mediaId}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      if (response.ok) {
        toast.success('Media moved to folder');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to move media');
      }
    } catch {
      toast.error('Failed to move media');
    }
  };

  // Handle file drop on folder (upload to specific folder)
  const handleFileDropOnFolder = async (folderId: string, files: File[]) => {
    setIsUploading(true);
    let successCount = 0;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', folderId);

        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          const error = await response.json();
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`อัปโหลดสำเร็จ ${successCount} ไฟล์`);
        router.refresh();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Get current folder info
  const currentFolder = currentFolderId 
    ? folders.find(f => f.id === currentFolderId) 
    : null;

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const response = await fetch('/api/admin/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (response.ok) {
        toast.success('สร้างโฟลเดอร์สำเร็จ');
        setShowCreateFolder(false);
        setNewFolderName('');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create folder');
      }
    } catch {
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle file selection from context menu
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    );
    
    if (files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) {
          formData.append('folderId', currentFolderId);
        }

        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          const error = await response.json();
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`อัปโหลดสำเร็จ ${successCount} ไฟล์`);
        router.refresh();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={`space-y-4 relative min-h-[400px] rounded-lg transition-all ${isDraggingOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''}`}>
          {/* Hidden file input for context menu upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
          
          {/* Uploading Indicator */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium">กำลังอัปโหลด...</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            ยินดีต้อนรับสู่ไดรฟ์
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            จัดการไฟล์และโฟลเดอร์
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="gap-2 shadow-sm h-8 text-xs"
            onClick={() => setShowCreateFolder(true)}
          >
            <FolderPlus className="h-3 w-3" />
            <span>โฟลเดอร์</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-sm h-8 text-xs">
                <Plus className="h-3 w-3" />
                <span>อัปโหลด</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
               <MediaUploader />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breadcrumb when inside folder */}
      {currentFolder && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={() => router.push('/dashboard/media')}
          >
            <Home className="h-4 w-4" />
            Media Library
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{currentFolder.name}</span>
        </div>
      )}

      {/* Folders Section - only show when not inside a folder and no search */}
      {!currentFolderId && !searchQuery && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">
              โฟลเดอร์
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <FolderContextMenu
                key={folder.id}
                folderId={folder.id}
                folderName={folder.name}
                mediaCount={folder._count.media}
              >
                <div>
                  <FolderCard
                    id={folder.id}
                    name={folder.name}
                    count={folder._count.media}
                    onClick={() => handleFolderClick(folder.id)}
                    onDrop={(mediaId) => handleDropOnFolder(folder.id, mediaId)}
                    onFileDrop={(files) => handleFileDropOnFolder(folder.id, files)}
                  />
                </div>
              </FolderContextMenu>
            ))}
            {folders.length === 0 && (
              <div className="col-span-full py-4 text-center text-xs text-slate-500 border-2 border-dashed rounded-lg">
                ยังไม่มีโฟลเดอร์
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">
            ไฟล์ที่แนะนำ
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        <MediaGrid
          items={media.items}
          page={media.page}
          totalPages={media.totalPages}
          total={media.total}
          search={searchQuery}
          folderId={currentFolderId}
          viewMode={viewMode}
        />
      </div>

        {/* Create Folder Dialog */}
        <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>สร้างโฟลเดอร์ใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="folderName">ชื่อโฟลเดอร์</Label>
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="New Folder"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleCreateFolder} disabled={isCreatingFolder || !newFolderName.trim()} className="text-white">
                {isCreatingFolder ? 'กำลังสร้าง...' : 'สร้าง'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-3xl">
            <MediaUploader />
          </DialogContent>
        </Dialog>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => setShowCreateFolder(true)}>
          <FolderPlus className="mr-2 h-4 w-4" />
          สร้างโฟลเดอร์
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          อัปโหลดไฟล์
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setShowUploadDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          อัปโหลด (ขั้นสูง)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
