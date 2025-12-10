import { requireAdmin } from '@/lib/auth/roles';
import { UsersPageClient } from './UsersPageClient';

export default async function UsersPage() {
  const currentUser = await requireAdmin();

  return <UsersPageClient currentUserId={currentUser.id} />;
}
