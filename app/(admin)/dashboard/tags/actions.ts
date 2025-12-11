'use server';

import { tagService } from '@/lib/admin/tags';
import { revalidatePath } from 'next/cache';

export async function createTag(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  await tagService.createTag({ name, slug });
  revalidatePath('/dashboard/tags');
}

export async function updateTag(id: string, data: { name: string; slug: string }) {
  await tagService.updateTag(id, data);
  revalidatePath('/dashboard/tags');
}

export async function deleteTag(id: string) {
  await tagService.deleteTag(id);
  revalidatePath('/dashboard/tags');
}
