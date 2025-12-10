'use server';

import { requireEditor, getCurrentUser } from '@/lib/auth';
import { adminPostService } from '@/lib/admin/posts';
import { logActivity } from '@/lib/admin/logger';
import { revalidatePath } from 'next/cache';

export async function deletePost(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Ensure user has permission
  await requireEditor();

  await adminPostService.deletePost(id);

  await logActivity({
    action: 'DELETE_POST',
    entityType: 'POST',
    entityId: id,
    userId: user.id
  });

  revalidatePath('/dashboard/posts');
}
