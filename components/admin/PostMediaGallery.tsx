'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon, Star } from 'lucide-react';
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

interface PostMediaGalleryProps {
  media: MediaItem[];
  coverImageId: string | null;
  onRemove: (mediaId: string) => void;
  onSetCover: (mediaId: string) => void;
}

/**
 * PostMediaGallery - Grid display of media attached to a post
 * Requirements: 3.1, 3.2
 */
export function PostMediaGallery({
  media,
  coverImageId,
  onRemove,
  onSetCover,
}: PostMediaGalleryProps) {
  if (media.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No media attached yet
          </p>
          <p className="text-xs text-muted-foreground">
            Upload images or select from library
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {media.map((item) => {
        const isCover = item.id === coverImageId;
        
        return (
          <Card
            key={item.id}
            className={cn(
              'group relative overflow-hidden border-0 p-0',
              isCover && 'ring-2 ring-primary'
            )}
          >
            <div className="aspect-video relative">
              <Image
                src={item.thumbnailUrl || item.url}
                alt={item.filename}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
            </div>

            {/* Cover Badge */}
            {isCover && (
              <div className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                Cover
              </div>
            )}

            {/* Hover Actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {!isCover && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSetCover(item.id)}
                  title="Set as cover"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemove(item.id)}
                title="Remove"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default PostMediaGallery;
