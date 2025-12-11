import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateMethod } from "@/lib/security/headers";

const ALLOWED_METHODS = ['GET'] as const;

/**
 * GET /api/categories/[slug]/parent - Get parent category info
 * Requirements: 5.4 - Method validation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
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
