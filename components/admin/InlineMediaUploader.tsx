'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FolderPicker } from './FolderPicker';
import { Upload, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedMedia {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

interface InlineMediaUploaderProps {
  onUploadComplete: (media: UploadedMedia[]) => void;
  onUploadError?: (error: string) => void;
  defaultFolderId?: string;
  maxFiles?: number;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * InlineMediaUploader - Drag & drop uploader for post media
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function InlineMediaUploader({
  onUploadComplete,
  onUploadError,
  defaultFolderId,
  maxFiles = 10,
}: InlineMediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId || null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Please upload PNG, JPG, GIF, or WebP images.';
    }
    if (file.size > MAX_SIZE) {
      return 'File size exceeds 10MB limit.';
    }
    return null;
  };

  const uploadFile = async (file: File, index: number): Promise<UploadedMedia | null> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
    }

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const media = await response.json();
      
      // Update progress to 100%
      setUploadingFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, progress: 100 } : f))
      );

      return media;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadingFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, error: message } : f))
      );
      return null;
    }
  };

  const handleFiles = async (files: File[]) => {
    // Filter and validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files.slice(0, maxFiles)) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
      onUploadError?.(errors[0]);
    }

    if (validFiles.length === 0) return;

    // Initialize uploading state
    setUploadingFiles(validFiles.map((file) => ({ file, progress: 0 })));

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.progress < 90 && !f.error
            ? { ...f, progress: f.progress + 10 }
            : f
        )
      );
    }, 200);

    // Upload all files
    const results = await Promise.all(
      validFiles.map((file, index) => uploadFile(file, index))
    );

    clearInterval(progressInterval);

    // Filter successful uploads
    const uploaded = results.filter((r): r is UploadedMedia => r !== null);

    if (uploaded.length > 0) {
      toast.success(`Uploaded ${uploaded.length} file(s)`);
      onUploadComplete(uploaded);
    }

    // Clear uploading state after a delay
    setTimeout(() => {
      setUploadingFiles([]);
    }, 1000);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        handleFiles(files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folderId]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isUploading = uploadingFiles.some((f) => !f.error && f.progress < 100);

  return (
    <div className="space-y-4">
      {/* Folder Selection & Drop Zone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Upload to folder:</span>
          <div className="w-1/2">
            <FolderPicker
              selectedFolderId={folderId}
              onSelect={setFolderId}
            />
          </div>
        </div>

        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-4 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={isUploading}
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drop images here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 rounded-md border p-2 bg-background',
                item.error && 'border-destructive bg-destructive/5'
              )}
            >
              {item.error ? (
                <AlertCircle className="h-8 w-8 text-destructive" />
              ) : (
                <img
                  src={URL.createObjectURL(item.file)}
                  alt={item.file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{item.file.name}</p>
                {item.error ? (
                  <p className="text-xs text-destructive">{item.error}</p>
                ) : (
                  <div className="h-1 mt-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {item.error ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeUploadingFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              ) : item.progress < 100 ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InlineMediaUploader;
