import { requireEditor } from '@/lib/auth';
import { tagService } from '@/lib/admin/tags';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await requireEditor();
    const tags = await tagService.getAllTags();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
