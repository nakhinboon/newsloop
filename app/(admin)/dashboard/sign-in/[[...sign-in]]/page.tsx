import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-slate-400">Sign in to manage your blog</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-white shadow-xl',
              footer: 'hidden', // Hide sign-up link
            },
          }}
          routing="path"
          path="/dashboard/sign-in"
          afterSignInUrl="/dashboard"
        />
      </div>
    </div>
  );
}
