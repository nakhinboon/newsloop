import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <ShieldX className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
        <p className="mt-4 text-slate-400">
          You don&apos;t have permission to access the admin dashboard.
          Please contact an administrator if you believe this is an error.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </Link>
          <SignOutButton>
            <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
              Sign out and try another account
            </Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
