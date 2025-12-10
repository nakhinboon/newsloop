import { Badge } from '@/components/ui/badge';

type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

const statusConfig: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SCHEDULED: { label: 'Scheduled', variant: 'outline' },
  PUBLISHED: { label: 'Published', variant: 'default' },
};

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export default StatusBadge;
