'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tags,
  Image,
  BarChart3,
  Menu,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'editor'] },
  { href: '/dashboard/posts', label: 'Posts', icon: FileText, roles: ['admin', 'editor'] },
  { href: '/dashboard/categories', label: 'Categories', icon: FolderOpen, roles: ['admin', 'editor'] },
  { href: '/dashboard/tags', label: 'Tags', icon: Tags, roles: ['admin', 'editor'] },
  { href: '/dashboard/media', label: 'Media', icon: Image, roles: ['admin', 'editor'] },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'editor'] },
  { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['admin'] },
];

function NavLink({ href, label, icon: Icon, isActive }: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string;
  
  // Role is determined server-side via lib/auth/roles.ts (including admin email override)
  // Client-side only uses publicMetadata.role which is set by Clerk webhook
  const userRole = role === 'admin' ? 'admin' : 'editor';

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <FileText className="h-6 w-6" />
          <span>NewsLoop Admin</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
          />
        ))}
      </nav>
      <Separator />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/dashboard/sign-in" />
          <span className="text-sm text-muted-foreground">Account</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden border-r bg-muted/40 md:block md:w-64">
        <SidebarContent />
      </div>
    </>
  );
}

export function AdminHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-4">{children}</div>
    </header>
  );
}
