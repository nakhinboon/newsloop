import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Blog administration dashboard',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-background">
        {children}
        <Toaster position="top-right" />
      </div>
    </ClerkProvider>
  );
}
