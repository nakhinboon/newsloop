import { requireEditor } from '@/lib/auth/roles';
import { tagService } from '@/lib/admin/tags';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { TagForm } from '@/components/admin/TagForm';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { revalidatePath } from 'next/cache';

export default async function TagsPage() {
  await requireEditor();
  
  const tags = await tagService.getAllTags();

  async function createTag(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;

    await tagService.createTag({ name, slug });
    revalidatePath('/admin/tags');
  }

  async function deleteTag(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await tagService.deleteTag(id);
    revalidatePath('/admin/tags');
  }

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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <p className="text-muted-foreground">No tags yet</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tags.map((tag) => (
                        <TableRow key={tag.id}>
                          <TableCell className="font-medium">
                            {tag.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tag.slug}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {tag._count.posts} posts
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <form action={deleteTag}>
                                <input type="hidden" name="id" value={tag.id} />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </form>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
