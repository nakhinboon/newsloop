'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderPlus, Folder, Loader2 } from 'lucide-react';

interface MediaFolder {
  id: string;
  name: string;
  _count: {
    media: number;
  };
}

interface FolderPickerProps {
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  allowCreate?: boolean;
}

/**
 * FolderPicker - Dropdown to select or create media folders
 * Requirements: 5.2, 5.3
 */
export function FolderPicker({
  selectedFolderId,
  onSelect,
  allowCreate = true,
}: FolderPickerProps) {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/admin/media/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (response.ok) {
        const folder = await response.json();
        // Refetch folders to ensure we have the latest data
        await fetchFolders();
        onSelect(folder.id);
        setNewFolderName('');
        setShowCreateInput(false);
        toast.success('Folder created');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create folder');
      }
    } catch {
      toast.error('Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading folders...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={selectedFolderId || '__none__'}
          onValueChange={(value) => onSelect(value === '__none__' ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No folder</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name} ({folder._count?.media ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allowCreate && !showCreateInput && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowCreateInput(true)}
            title="Create new folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showCreateInput && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="New folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateFolder();
              }
              if (e.key === 'Escape') {
                setShowCreateInput(false);
                setNewFolderName('');
              }
            }}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreateFolder}
            disabled={isCreating || !newFolderName.trim()}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCreateInput(false);
              setNewFolderName('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default FolderPicker;
