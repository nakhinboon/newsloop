'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MediaPickerDialog } from './MediaPickerDialog';
import { Image as ImageIcon, X, ImagePlus } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

interface CoverImageSelectorProps {
  coverImage: MediaItem | null;
  onSelect: (media: MediaItem | null) => void;
  availableMedia?: MediaItem[];
}

/**
 * CoverImageSelector - Preview and select cover image for a post
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export function CoverImageSelector({
  coverImage,
  onSelect,
  availableMedia = [],
}: CoverImageSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectFromLibrary = (media: MediaItem[]) => {
    if (media.length > 0) {
      onSelect(media[0]);
    }
  };

  const handleSelectFromGallery = (mediaId: string) => {
    const media = availableMedia.find((m) => m.id === mediaId);
    if (media) {
      onSelect(media);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Preview Area */}
        <div className="group relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          {coverImage ? (
            <>
              <Image
                src={coverImage.thumbnailUrl || coverImage.url}
                alt={coverImage.filename}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                 <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPicker(true)}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onSelect(null)}
                >
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => setShowPicker(true)}>
              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
              <span className="text-sm font-medium">No cover image</span>
              <span className="text-xs opacity-70 mt-1">Click to select</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-3">
          {!coverImage && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowPicker(true)}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Browse Library
            </Button>
          )}

          {/* Quick select from attached media */}
          {availableMedia.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Quick select from attached:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableMedia.slice(0, 5).map((media) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => handleSelectFromGallery(media.id)}
                    className={`relative h-12 w-12 overflow-hidden rounded-md border-2 transition-all ${
                      coverImage?.id === media.id
                        ? 'border-primary ring-2 ring-primary ring-offset-1'
                        : 'border-transparent hover:border-muted-foreground/50'
                    }`}
                    title={media.filename}
                  >
                    <Image
                      src={media.thumbnailUrl || media.url}
                      alt={media.filename}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={handleSelectFromLibrary}
        multiple={false}
        selectedIds={coverImage ? [coverImage.id] : []}
      />
    </>
  );
}

export default CoverImageSelector;
