import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { slug: true, name: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({
      slug: category.slug,
      parentSlug: category.parent?.slug || null,
      parentName: category.parent?.name || null,
    });
  } catch (error) {
    console.error("Error fetching category parent:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
