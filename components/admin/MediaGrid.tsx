'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FolderPicker } from './FolderPicker';
import { FolderCard } from './FolderCard';
import { Copy, Trash2, ExternalLink, ChevronLeft, ChevronRight, Search, FolderInput, Home } from 'lucide-react';
import type { Media } from '@/lib/generated/prisma';
import Link from 'next/link';

interface MediaWithFolder extends Media {
  folder?: { id: string; name: string } | null;
}

interface FolderItem {
  id: string;
  name: string;
  _count: { media: number };
}

interface MediaGridProps {
  items: MediaWithFolder[];
  folders?: FolderItem[];
  page: number;
  totalPages: number;
  total: number;
  search?: string;
  folderId?: string | null;
  currentFolder?: FolderItem | null;
  viewMode?: 'grid' | 'list';
}

/**
 * MediaGrid - Grid display for Media Library page with search and folder filter
 * Requirements: 4.2, 5.3, 5.4
 */
export function MediaGrid({ 
  items, 
  folders = [], 
  page, 
  totalPages, 
  total, 
  search = '', 
  folderId, 
  currentFolder,
  viewMode = 'grid' 
}: MediaGridProps) {
  const router = useRouter();
  const [selectedMedia, setSelectedMedia] = useState<MediaWithFolder | null>(null);
  const [deleteMedia, setDeleteMedia] = useState<MediaWithFolder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId ?? null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);

  // Sync state with props
  useEffect(() => {
    setSearchInput(search);
    setSelectedFolderId(folderId ?? null);
  }, [search, folderId]);

  // Set moveFolderId when selecting media
  useEffect(() => {
    if (selectedMedia) {
      setMoveFolderId(selectedMedia.folderId || null);
    }
  }, [selectedMedia]);

  // Build URL with filters
  const buildUrl = (params: { page?: number; search?: string; folderId?: string | null }) => {
    const url = new URLSearchParams();
    if (params.page && params.page > 1) url.set('page', params.page.toString());
    if (params.search) url.set('search', params.search);
    if (params.folderId) url.set('folderId', params.folderId);
    const queryString = url.toString();
    return `/dashboard/media${queryString ? `?${queryString}` : ''}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ search: searchInput, folderId: selectedFolderId ?? undefined }));
  };

  const handleFolderChange = (newFolderId: string | null) => {
    setSelectedFolderId(newFolderId);
    router.push(buildUrl({ search: searchInput, folderId: newFolderId ?? undefined }));
  };

  // Navigate into folder
  const handleFolderClick = (folderId: string) => {
    router.push(buildUrl({ folderId }));
  };

  // Handle drag start on media
  const handleDragStart = (e: React.DragEvent, mediaId: string) => {
    e.dataTransfer.setData('mediaId', mediaId);
    setDraggedMediaId(mediaId);
  };

  const handleDragEnd = () => {
    setDraggedMediaId(null);
  };

  // Handle drop on folder
  const handleDropOnFolder = async (targetFolderId: string, mediaId: string) => {
    try {
      const response = await fetch(`/api/admin/media/${mediaId}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
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

  const handleMoveToFolder = async () => {
    if (!selectedMedia) return;

    setIsMoving(true);
    try {
      const response = await fetch(`/api/admin/media/${selectedMedia.id}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: moveFolderId }),
      });

      if (response.ok) {
        toast.success('Media moved to folder');
        setSelectedMedia(null);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to move media');
      }
    } catch {
      toast.error('Failed to move media');
    } finally {
      setIsMoving(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const handleDelete = async () => {
    if (!deleteMedia) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/media/${deleteMedia.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Media deleted');
        setDeleteMedia(null);
        setSelectedMedia(null);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete media');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by filename..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs">Search</Button>
        </form>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Folder:</span>
          <div className="w-40">
            <FolderPicker
              selectedFolderId={selectedFolderId}
              onSelect={handleFolderChange}
              allowCreate={false}
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {currentFolder && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => router.push('/dashboard/media')}
          >
            <Home className="h-4 w-4 mr-1" />
            Media Library
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{currentFolder.name}</span>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} image{total !== 1 ? 's' : ''} total
          {search && ` matching "${search}"`}
        </p>
        {(search || folderId) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              setSearchInput('');
              setSelectedFolderId(null);
              router.push('/dashboard/media');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No media uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {/* Folder Cards - only show when not inside a folder */}
              {!folderId && folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  name={folder.name}
                  count={folder._count.media}
                  onClick={() => handleFolderClick(folder.id)}
                  onDrop={(mediaId) => handleDropOnFolder(folder.id, mediaId)}
                />
              ))}
              
              {/* Media Cards */}
              {items.map((media) => (
                <Card
                  key={media.id}
                  className={`cursor-pointer overflow-hidden transition-shadow hover:shadow-md ${
                    draggedMediaId === media.id ? 'opacity-50' : ''
                  }`}
                  onClick={() => setSelectedMedia(media)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, media.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="aspect-video relative">
                    <Image
                      src={media.thumbnailUrl || media.url}
                      alt={media.filename}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                  </div>
                  <CardContent className="px-2 pb-2 pt-1.5">
                    <p className="truncate text-xs font-medium">{media.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(media.size)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Preview</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((media) => (
                    <TableRow
                      key={media.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedMedia(media)}
                    >
                      <TableCell>
                        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={media.thumbnailUrl || media.url}
                            alt={media.filename}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{media.filename}</TableCell>
                      <TableCell>{formatFileSize(media.size)}</TableCell>
                      <TableCell>{media.mimeType}</TableCell>
                      <TableCell>{media.folder?.name || '-'}</TableCell>
                      <TableCell>{new Date(media.uploadedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link href={buildUrl({ page: page - 1, search: search || undefined, folderId: folderId ?? undefined })}>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Link href={buildUrl({ page: page + 1, search: search || undefined, folderId: folderId ?? undefined })}>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Media Detail Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.filename}</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg">
                <Image
                  src={selectedMedia.url}
                  alt={selectedMedia.filename}
                  width={selectedMedia.width || 800}
                  height={selectedMedia.height || 600}
                  className="max-h-96 w-full object-contain"
                />
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span>{formatFileSize(selectedMedia.size)}</span>
                </div>
                {selectedMedia.width && selectedMedia.height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span>{selectedMedia.width} × {selectedMedia.height}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{selectedMedia.mimeType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Folder</span>
                  <span>{selectedMedia.folder?.name || 'No folder'}</span>
                </div>
              </div>

              {/* Move to Folder */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <FolderInput className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Move to:</span>
                <div className="flex-1">
                  <FolderPicker
                    selectedFolderId={moveFolderId}
                    onSelect={setMoveFolderId}
                    allowCreate={false}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleMoveToFolder}
                  disabled={isMoving || moveFolderId === selectedMedia.folderId}
                >
                  {isMoving ? 'Moving...' : 'Move'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyUrl(selectedMedia.url)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  asChild
                >
                  <a href={selectedMedia.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteMedia(selectedMedia)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMedia} onOpenChange={() => setDeleteMedia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteMedia?.filename}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MediaGrid;
