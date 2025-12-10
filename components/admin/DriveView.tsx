'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FolderCard } from './FolderCard';
import { MediaGrid } from './MediaGrid';
import { MediaUploader } from './MediaUploader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { LayoutGrid, List, Plus, Home } from 'lucide-react';
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

  // Get current folder info
  const currentFolder = currentFolderId 
    ? folders.find(f => f.id === currentFolderId) 
    : null;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/dashboard/media?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            ยินดีต้อนรับสู่ไดรฟ์
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            จัดการไฟล์และโฟลเดอร์ของคุณ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-sm h-8 text-xs">
                <Plus className="h-3 w-3" />
                <span>ใหม่</span>
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
              <FolderCard
                key={folder.id}
                name={folder.name}
                count={folder._count.media}
                onClick={() => handleFolderClick(folder.id)}
                onDrop={(mediaId) => handleDropOnFolder(folder.id, mediaId)}
              />
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
    </div>
  );
}
