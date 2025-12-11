'use client';

import { useState, useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { PostStatus } from '@/lib/generated/prisma';

interface PostStatusSelectProps {
  postId: string;
  currentStatus: PostStatus;
  onStatusChange: (id: string, status: PostStatus) => Promise<void>;
}

const statusOptions: { value: PostStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
];

const statusColors: Record<PostStatus, string> = {
  DRAFT: 'text-yellow-600',
  SCHEDULED: 'text-blue-600',
  PUBLISHED: 'text-green-600',
};

export function PostStatusSelect({
  postId,
  currentStatus,
  onStatusChange,
}: PostStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<PostStatus>(currentStatus);

  const handleChange = (newStatus: PostStatus) => {
    if (newStatus === status) return;

    setStatus(newStatus);
    startTransition(async () => {
      try {
        await onStatusChange(postId, newStatus);
        toast.success(`Status updated to ${newStatus.toLowerCase()}`);
      } catch {
        setStatus(currentStatus);
        toast.error('Failed to update status');
      }
    });
  };

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[120px] h-8">
        <SelectValue>
          <span className={statusColors[status]}>
            {statusOptions.find((o) => o.value === status)?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className={statusColors[option.value]}>{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
