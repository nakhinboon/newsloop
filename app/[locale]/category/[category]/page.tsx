import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import { generateCategoryMetadata } from "@/lib/seo";
import { categoryService } from "@/lib/admin/categories";
import { toPostPreview } from "@/lib/posts";
import { NewsPageLayout } from "@/components/news/NewsPageLayout";
import { CategoryBreadcrumb } from "@/components/CategoryBreadcrumb";
import { SubCategoryNav } from "@/components/news/SubCategoryNav";

interface CategoryPageProps {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
}

const POSTS_PER_PAGE = 20; // Increased to cover hero + list

export async function generateStaticParams() {
  try {
    const categories = await categoryService.getAllCategories();
    return categories.map((category) => ({
      category: category.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { locale, category } = await params;

  if (!isValidLocale(locale)) {
    return { title: "Not Found" };
  }

  const decodedCategory = decodeURIComponent(category);
  const categoryData = await categoryService.getCategoryBySlug(decodedCategory);
  
  // Estimate count or fetch it if needed for metadata
  const count = categoryData ? 10 : 0; 

  return generateCategoryMetadata(decodedCategory, locale as Locale, count);
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { locale, category } = await params;
  const { page } = await searchParams;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const decodedCategory = decodeURIComponent(category);
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  // 1. Get current category
  const categoryData = await categoryService.getCategoryBySlug(decodedCategory);
  
  if (!categoryData) {
    notFound();
  }

  // 2. Fetch main category posts (include descendants so the feed is populated)
  // Requirements: Show mixed feed of all posts in this category tree
  const categoryPostsRaw = await categoryService.getPostsInCategory(categoryData.id, true);
  const categoryPosts = categoryPostsRaw.map(toPostPreview);
  
  // Calculate pagination for the "More News" section
  // Note: We might be showing some posts in Hero, so we need to be careful not to duplicate
  // For simplicity, we pass all posts to layout and it handles slicing
  
  // 3. Fetch subcategories for Navbar
  // Logic: If current category has children, show them.
  // If not (leaf category), show siblings (children of parent) so user can navigate.
  let navCategoriesRaw = await categoryService.getChildrenWithPosts(categoryData.id, 1);

  if (navCategoriesRaw.length === 0 && categoryData.parentId) {
    navCategoriesRaw = await categoryService.getChildrenWithPosts(categoryData.parentId, 1);
  }
  
  const subCategories = navCategoriesRaw.map(sub => ({
    id: sub.id,
    name: sub.name,
    slug: sub.slug,
    posts: [] // No posts needed for nav
  }));

  const totalPages = Math.ceil(categoryPosts.length / POSTS_PER_PAGE);

  // Fetch category with ancestors for breadcrumb navigation (Requirements: 4.1)
  const categoryWithAncestors = await categoryService.getCategoryWithAncestorsBySlug(decodedCategory);
  
  // Extract ancestors (all but the last item) and current category (last item)
  const ancestors = categoryWithAncestors && categoryWithAncestors.length > 1 
    ? categoryWithAncestors.slice(0, -1) 
    : [];
  const currentCategoryData = categoryWithAncestors && categoryWithAncestors.length > 0
    ? categoryWithAncestors[categoryWithAncestors.length - 1]
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Subcategory Nav - Moved to top as requested */}
      <div className=" dark:border-gray-800 mb-4">
        <SubCategoryNav subCategories={subCategories} locale={validLocale} />
      </div>

      {/* Breadcrumb Navigation */}
      {currentCategoryData && (
        <div className="mb-6">
          <CategoryBreadcrumb
            ancestors={ancestors.map(a => ({ id: a.id, name: a.name, slug: a.slug }))}
            currentCategory={{ id: currentCategoryData.id, name: currentCategoryData.name, slug: currentCategoryData.slug }}
            locale={validLocale}
          />
        </div>
      )}
      
      <NewsPageLayout
        mainCategory={{
          name: categoryData.name,
          slug: categoryData.slug,
          description: categoryData.description || undefined
        }}
        mainPosts={categoryPosts}
        subCategories={subCategories} // Passed but handled in layout (layout will skip rendering nav if already rendered here or we can adjust layout)
        locale={validLocale}
        pagination={{
          currentPage,
          totalPages,
          basePath: `/${validLocale}/category/${category}`
        }}
        hideSubNav={true} // Add this prop to NewsPageLayout to avoid double rendering
      />
    </div>
  );
}
