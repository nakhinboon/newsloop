'use client';

import * as React from 'react';
import { X, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TagWithCount } from '@/lib/admin/tags';

interface TagSelectorProps {
  selectedTagIds: string[];
  onSelect: (tagIds: string[]) => void;
  initialTags?: TagWithCount[];
}

export function TagSelector({
  selectedTagIds,
  onSelect,
  initialTags = [],
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [tags, setTags] = React.useState<TagWithCount[]>(initialTags);
  const [isLoading, setIsLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');

  // Fetch tags if not provided or to refresh
  const fetchTags = React.useCallback(async () => {
    if (initialTags.length > 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialTags.length]);

  React.useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const selectedTags = React.useMemo(() => {
    return tags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  const handleSelect = (tagId: string) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onSelect(newSelectedIds);
  };

  const handleRemove = (tagId: string) => {
    onSelect(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="pl-2 pr-1 py-1">
            {tag.name}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-4 w-4 ml-1 hover:bg-transparent text-muted-foreground hover:text-foreground"
              onClick={() => handleRemove(tag.id)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag.name}</span>
            </Button>
          </Badge>
        ))}
        {selectedTags.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No tags selected</p>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Select tags...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search tags..." 
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!isLoading && (
                <CommandEmpty>No tags found.</CommandEmpty>
              )}
              <CommandGroup>
                {tags
                  .filter(tag => 
                    tag.name.toLowerCase().includes(query.toLowerCase())
                  )
                  .map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleSelect(tag.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTagIds.includes(tag.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span>{tag.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tag._count?.posts ?? 0} posts
                        </span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
