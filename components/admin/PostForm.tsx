'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Calendar, ImagePlus, Maximize2, Minimize2 } from 'lucide-react';
import { PostSection } from './PostSection';
import { RichTextEditor } from './RichTextEditor';
import { DateTimePicker } from './DateTimePicker';
import { InlineMediaUploader } from './InlineMediaUploader';
import { PostMediaGallery } from './PostMediaGallery';
import { CoverImageSelector } from './CoverImageSelector';
import { MediaPickerDialog } from './MediaPickerDialog';
import { TagSelector } from './TagSelector';
import type { AdminPost } from '@/lib/admin/posts';
import type { CategoryNode } from '@/lib/categories/tree';
import type { TagWithCount } from '@/lib/admin/tags';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  locale: z.string().min(1, 'Locale is required'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  scheduledAt: z.date().optional().nullable(),
  featured: z.boolean().optional(),
});

type PostFormData = z.infer<typeof postSchema>;

interface PostFormProps {
  post?: AdminPost;
  categories: CategoryNode[];
  tags: TagWithCount[];
  onSubmit: (data: PostFormData) => Promise<void | { id: string }>;
}

/**
 * Flattens a category tree into a list with path information for display
 * Used to show categories hierarchically in the dropdown with full paths
 * 
 * Requirements: 5.1, 5.3
 */
function flattenTreeWithPaths(
  nodes: CategoryNode[],
  parentPath: string[] = []
): Array<CategoryNode & { path: string; displayPath: string }> {
  const result: Array<CategoryNode & { path: string; displayPath: string }> = [];

  for (const node of nodes) {
    const currentPath = [...parentPath, node.name];
    const pathString = currentPath.join('/');
    const displayPath = currentPath.join(' > ');

    result.push({
      ...node,
      path: pathString,
      displayPath,
    });

    if (node.children && node.children.length > 0) {
      result.push(...flattenTreeWithPaths(node.children, currentPath));
    }
  }

  return result;
}

export function PostForm({ post, categories, tags: initialTags, onSubmit }: PostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useRichEditor, setUseRichEditor] = useState(true);
  
  // Media state - Requirements: 2.4, 3.1, 3.2
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const [coverImage, setCoverImage] = useState<MediaItem | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Flatten categories with path information for the dropdown
  // This enables hierarchical display with full paths (e.g., "Technology > Web Development > React")
  // Requirements: 5.1, 5.3
  const flattenedCategories = useMemo(() => {
    return flattenTreeWithPaths(categories);
  }, [categories]);

  // Generate indentation based on depth for visual hierarchy
  const getIndentation = (depth: number) => {
    return '\u00A0\u00A0\u00A0\u00A0'.repeat(depth); // 4 non-breaking spaces per level
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      content: post?.content || '',
      excerpt: post?.excerpt || '',
      locale: post?.locale || 'en',
      status: post?.status || 'DRAFT',
      categoryId: post?.categoryId || undefined,
      tagIds: post?.tags.map((t) => t.tagId) || [],
      scheduledAt: post?.scheduledAt ? new Date(post.scheduledAt) : undefined,
      featured: post?.featured || false,
    },
  });

  const title = watch('title');
  const content = watch('content');
  const status = watch('status');
  const scheduledAt = watch('scheduledAt');
  const tagIds = watch('tagIds') || [];

  // Show date picker when status is SCHEDULED
  useEffect(() => {
    if (status === 'SCHEDULED' && !scheduledAt) {
      // Set default scheduled time to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setValue('scheduledAt', tomorrow);
    } else if (status !== 'SCHEDULED') {
      setValue('scheduledAt', null);
    }
  }, [status, scheduledAt, setValue]);

  // Load existing media when editing - Requirements: 3.4
  useEffect(() => {
    if (post?.id) {
      loadPostMedia(post.id);
    }
  }, [post?.id]);

  const loadPostMedia = async (postId: string) => {
    setIsLoadingMedia(true);
    try {
      const response = await fetch(`/api/admin/posts/${postId}/media`);
      if (response.ok) {
        const data = await response.json();
        const mediaItems = data.map((item: { media: MediaItem; isCover: boolean }) => item.media);
        setAttachedMedia(mediaItems);
        
        // Find cover image
        const coverItem = data.find((item: { isCover: boolean }) => item.isCover);
        if (coverItem) {
          setCoverImage(coverItem.media);
        }
      }
    } catch (error) {
      console.error('Failed to load post media:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Media handlers - Requirements: 3.1, 3.2
  const handleMediaUpload = useCallback((uploaded: MediaItem[]) => {
    setAttachedMedia((prev) => [...prev, ...uploaded]);
  }, []);

  const handleMediaRemove = useCallback((mediaId: string) => {
    setAttachedMedia((prev) => prev.filter((m) => m.id !== mediaId));
    if (coverImage?.id === mediaId) {
      setCoverImage(null);
    }
  }, [coverImage]);

  const handleSetCover = useCallback((mediaId: string) => {
    const media = attachedMedia.find((m) => m.id === mediaId);
    if (media) {
      setCoverImage(media);
    }
  }, [attachedMedia]);

  const handleCoverSelect = useCallback((media: MediaItem | null) => {
    setCoverImage(media);
    // Add to attached media if not already there
    if (media && !attachedMedia.find((m) => m.id === media.id)) {
      setAttachedMedia((prev) => [...prev, media]);
    }
  }, [attachedMedia]);

  const handleMediaPickerSelect = useCallback((selected: MediaItem[]) => {
    setAttachedMedia((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newMedia = selected.filter((m) => !existingIds.has(m.id));
      return [...prev, ...newMedia];
    });
  }, []);

  // Auto-generate slug from title
  const generateSlug = () => {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setValue('slug', slug);
  };

  // Save media associations after post save - Requirements: 2.5, 3.3
  const savePostMedia = async (postId: string) => {
    const mediaData = attachedMedia.map((media, index) => ({
      mediaId: media.id,
      isCover: media.id === coverImage?.id,
      order: index,
    }));

    await fetch(`/api/admin/posts/${postId}/media`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: mediaData }),
    });
  };

  const handleFormSubmit = async (data: PostFormData) => {
    setIsSubmitting(true);
    try {
      // onSubmit should return the post ID for new posts
      const result = await onSubmit(data);
      
      // Save media associations if we have a post ID
      const postId = post?.id || result?.id;
      if (postId) {
        await savePostMedia(postId);
      }
      
      toast.success(post ? 'Post updated' : 'Post created');
      router.push('/dashboard/posts');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionStatus = (hasError: boolean = false) => {
    if (isSubmitting) return 'saving';
    if (hasError) return 'error';
    // Ideally we would track dirty fields per section, but for now we'll assume saved if not submitting/error
    return 'saved';
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Content & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Content Section */}
          <PostSection 
            title="Content" 
            status={getSectionStatus(!!(errors.title || errors.slug || errors.content))}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter post title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">Slug</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateSlug}
                  >
                    Generate from title
                  </Button>
                </div>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="post-url-slug"
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Content</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseRichEditor(!useRichEditor)}
                  >
                    {useRichEditor ? 'Switch to MDX' : 'Switch to Rich Editor'}
                  </Button>
                </div>
                {useRichEditor ? (
                  <RichTextEditor
                    content={content}
                    onChange={(html) => setValue('content', html)}
                    placeholder="Write your post content..."
                  />
                ) : (
                  <textarea
                    id="content"
                    {...register('content')}
                    className="min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Write your post content in MDX format..."
                  />
                )}
                {errors.content && (
                  <p className="text-sm text-destructive">{errors.content.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt (optional)</Label>
                <textarea
                  id="excerpt"
                  {...register('excerpt')}
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Brief description of the post..."
                />
              </div>
            </div>
          </PostSection>

          {/* 4. Preview Section */}
          <PostSection 
            title="Preview" 
            status={getSectionStatus()}
            defaultExpanded={false}
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreenPreview(true)}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Full Screen Preview
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/30 p-6 prose prose-sm max-w-none dark:prose-invert">
                <h1>{title || 'Untitled'}</h1>
                <div className="whitespace-pre-wrap">{content || 'No content yet...'}</div>
              </div>
            </div>
          </PostSection>
        </div>

        {/* Right Column: Media & Settings */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            <div className="flex justify-end gap-4 mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/posts')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {post ? 'Update' : 'Publish'}
              </Button>
            </div>

            {/* 3. Settings Section */}
            <PostSection 
              title="Settings" 
              status={getSectionStatus()}
              defaultExpanded={true}
            >
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      defaultValue={post?.status || 'DRAFT'}
                      onValueChange={(value) => setValue('status', value as PostFormData['status'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Locale</Label>
                    <Select
                      defaultValue={post?.locale || 'en'}
                      onValueChange={(value) => setValue('locale', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="th">ไทย</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      defaultValue={post?.categoryId || undefined}
                      onValueChange={(value) => setValue('categoryId', value === '__none__' ? undefined : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No category</SelectItem>
                        {flattenedCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span>
                              {getIndentation(cat.depth)}
                              {cat.name}
                              {cat.depth > 0 && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({cat.displayPath})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <TagSelector
                      selectedTagIds={tagIds}
                      onSelect={(ids) => setValue('tagIds', ids)}
                      initialTags={initialTags}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Checkbox
                    id="featured"
                    {...register('featured')}
                  />
                  <Label htmlFor="featured" className="cursor-pointer">
                    Featured Post
                  </Label>
                </div>

                {/* Scheduling Section */}
                {status === 'SCHEDULED' && (
                  <div className="space-y-2 rounded-lg border bg-muted/50 p-4 mt-4">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Publication
                    </Label>
                    <DateTimePicker
                      date={scheduledAt || undefined}
                      onDateChange={(date) => setValue('scheduledAt', date || null)}
                      placeholder="Select publish date"
                      minDate={new Date()}
                    />
                    {scheduledAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Will publish on{' '}
                        <span className="font-medium">
                          {scheduledAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </PostSection>

            {/* 2. Media Section */}
            <PostSection 
              title="Media" 
              status={getSectionStatus()}
              defaultExpanded={false}
            >
              <div className="space-y-6">
                {/* Cover Image Selector */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <CoverImageSelector
                    coverImage={coverImage}
                    onSelect={handleCoverSelect}
                    availableMedia={attachedMedia}
                  />
                </div>

                {/* Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Upload Images</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowMediaPicker(true)}
                    >
                      Open Library
                    </Button>
                  </div>
                  <InlineMediaUploader
                    onUploadComplete={handleMediaUpload}
                  />
                </div>

                {/* Attached Media Gallery */}
                <div className="space-y-2">
                  <Label>Attached Media ({attachedMedia.length})</Label>
                  {isLoadingMedia ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <PostMediaGallery
                      media={attachedMedia}
                      coverImageId={coverImage?.id || null}
                      onRemove={handleMediaRemove}
                      onSetCover={handleSetCover}
                    />
                  )}
                </div>

                {/* Media Picker Dialog */}
                <MediaPickerDialog
                  open={showMediaPicker}
                  onOpenChange={setShowMediaPicker}
                  onSelect={handleMediaPickerSelect}
                  multiple={true}
                  selectedIds={attachedMedia.map((m) => m.id)}
                />
              </div>
            </PostSection>
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Post Preview</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreenPreview(false)}
            >
              <Minimize2 className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-8">
            <article className="prose prose-lg mx-auto dark:prose-invert">
              <h1>{title || 'Untitled'}</h1>
              {coverImage && (
                <img 
                  src={coverImage.url} 
                  alt={title}
                  className="mb-8 w-full rounded-lg object-cover"
                  style={{ maxHeight: '400px' }}
                />
              )}
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </article>
          </div>
        </div>
      )}
    </form>
  );
}

export default PostForm;
