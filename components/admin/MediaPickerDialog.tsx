'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FolderPicker } from './FolderPicker';
import { Search, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem[]) => void;
  multiple?: boolean;
  selectedIds?: string[];
}

/**
 * MediaPickerDialog - Modal to browse and select media from library
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  selectedIds = [],
}: MediaPickerDialogProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      });
      
      if (search) {
        params.set('search', search);
      }
      if (folderId) {
        params.set('folderId', folderId);
      }

      const response = await fetch(`/api/admin/media?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.items);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, folderId]);

  useEffect(() => {
    if (open) {
      fetchMedia();
    }
  }, [open, fetchMedia]);

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds]);

  // Reset page when search or folder changes
  useEffect(() => {
    setPage(1);
  }, [search, folderId]);

  const handleToggleSelect = (item: MediaItem) => {
    if (multiple) {
      const newSelected = new Set(selected);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelected(newSelected);
    } else {
      setSelected(new Set([item.id]));
    }
  };

  const handleConfirm = () => {
    const selectedMedia = media.filter((m) => selected.has(m.id));
    onSelect(selectedMedia);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-48">
              <FolderPicker
                selectedFolderId={folderId}
                onSelect={setFolderId}
                allowCreate={false}
              />
            </div>
          </div>

          {/* Media Grid */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : media.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                No media found
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {media.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      'cursor-pointer overflow-hidden transition-all p-0',
                      selected.has(item.id)
                        ? 'ring-2 ring-primary'
                        : 'hover:shadow-md'
                    )}
                    onClick={() => handleToggleSelect(item)}
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={item.thumbnailUrl || item.url}
                        alt={item.filename}
                        fill
                        className="object-cover"
                        sizes="25vw"
                      />
                      {selected.has(item.id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="rounded-full bg-primary p-1">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="px-2 pb-2 pt-1.5">
                      <p className="truncate text-xs">{item.filename}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">
                {total} item{total !== 1 ? 's' : ''} total
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Select {selected.size > 0 && `(${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MediaPickerDialog;
