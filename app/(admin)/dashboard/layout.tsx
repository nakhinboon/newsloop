import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { RoleProvider } from '@/lib/auth/RoleContext';
import { getUserRoleFromClerk } from '@/lib/auth/roles';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Blog administration dashboard',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRoleFromClerk();

  return (
    <ClerkProvider>
      <RoleProvider role={role}>
        <div className="min-h-screen bg-background">
          {children}
          <Toaster position="top-right" />
        </div>
      </RoleProvider>
    </ClerkProvider>
  );
}
