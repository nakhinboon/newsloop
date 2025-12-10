import { requireEditor } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { folderService } from '@/lib/admin/folders';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { DriveView } from '@/components/admin/DriveView';

interface MediaPageProps {
  searchParams: Promise<{ page?: string; search?: string; folderId?: string }>;
}

/**
 * Media Library Page - Browse, upload, and manage media
 * Requirements: 4.2, 5.2, 5.3, 5.4
 */
export default async function MediaPage({ searchParams }: MediaPageProps) {
  await requireEditor();
  
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const folderId = params.folderId || undefined;

  // Fetch media and folders in parallel
  const [media, folders] = await Promise.all([
    search
      ? mediaService.searchMedia(search, page, 20, folderId)
      : mediaService.getAllMedia(page, 20, folderId),
    folderService.getFolders()
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Media Library" />
        <main className="p-4 md:p-6">
          <DriveView 
            folders={folders}
            media={media}
          />
        </main>
      </div>
    </div>
  );
}
