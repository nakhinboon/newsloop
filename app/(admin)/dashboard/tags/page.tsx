import { requireEditor } from '@/lib/auth/roles';
import { tagService } from '@/lib/admin/tags';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { TagForm } from '@/components/admin/TagForm';
import { TagsClient } from './TagsClient';
import { createTag, deleteTag, updateTag } from './actions';

export default async function TagsPage() {
  await requireEditor();
  
  const tags = await tagService.getAllTags();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="Tags" />
        <main className="p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tag Form */}
            <div className="lg:col-span-1">
              <TagForm onSubmit={createTag} />
            </div>

            {/* Tags List */}
            <div className="lg:col-span-2">
              <TagsClient tags={tags} onDelete={deleteTag} onUpdate={updateTag} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
