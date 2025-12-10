"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubCategoryNavProps {
  subCategories: {
    name: string;
    slug: string;
  }[];
  locale: string;
}

export function SubCategoryNav({ subCategories, locale }: SubCategoryNavProps) {
  const pathname = usePathname();

  if (!subCategories || subCategories.length === 0) {
    return null;
  }

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
      <ul className="flex items-center min-w-max px-1">
        {subCategories.map((sub) => {
          const href = `/${locale}/category/${sub.slug}`;
          const isActive = pathname === href;

          return (
            <li key={sub.slug}>
              <Link
                href={href}
                className={`block px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-600"
                }`}
              >
                {sub.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
