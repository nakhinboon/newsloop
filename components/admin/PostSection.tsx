import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PostSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  status?: 'saved' | 'saving' | 'error' | 'unsaved';
}

export function PostSection({
  title,
  children,
  defaultExpanded = true,
  className,
  status
}: PostSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("border-b py-6 first:pt-0 last:border-0", className)}>
      <div 
        className="flex items-center justify-between cursor-pointer py-2 hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          {status && (
            <div className="flex items-center text-sm font-medium">
              {status === 'saved' && (
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <Check className="mr-1 h-3 w-3" />
                  Saved
                </span>
              )}
              {status === 'saving' && (
                <span className="flex items-center text-muted-foreground">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {status === 'unsaved' && (
                <span className="flex items-center text-amber-600 dark:text-amber-400">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Unsaved
                </span>
              )}
              {status === 'error' && (
                <span className="flex items-center text-destructive">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Error
                </span>
              )}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle section</span>
        </Button>
      </div>
      {isExpanded && (
        <div className="mt-6 animate-in slide-in-from-top-2 fade-in-50 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
