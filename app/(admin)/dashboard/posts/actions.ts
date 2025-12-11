'use server';

import { requireEditor, getCurrentUser } from '@/lib/auth';
import { adminPostService } from '@/lib/admin/posts';
import { logActivity } from '@/lib/admin/logger';
import { revalidatePath } from 'next/cache';
import type { PostStatus } from '@/lib/generated/prisma';

export async function deletePost(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  await requireEditor();

  await adminPostService.deletePost(id);

  await logActivity({
    action: 'DELETE_POST',
    entityType: 'POST',
    entityId: id,
    userId: user.id,
  });

  revalidatePath('/dashboard/posts');
}

export async function updatePostStatus(id: string, status: PostStatus) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  await requireEditor();

  await adminPostService.updatePost(id, { status });

  await logActivity({
    action: 'UPDATE_POST',
    entityType: 'POST',
    entityId: id,
    userId: user.id,
    details: { status },
  });

  revalidatePath('/dashboard/posts');
}
