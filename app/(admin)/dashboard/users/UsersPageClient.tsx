'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar, AdminHeader } from '@/components/admin/Sidebar';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: 'ADMIN' | 'EDITOR';
  createdAt: string;
  postCount: number;
  mediaCount: number;
}

interface Invitation {
  id: string;
  emailAddress: string;
  role: 'ADMIN' | 'EDITOR';
  status: string;
  createdAt: string;
}

interface UsersPageClientProps {
  currentUserId: string;
}

export function UsersPageClient({ currentUserId }: UsersPageClientProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, invitationsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/invitations'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.invitations);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <AdminHeader title="User Management" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users & Invitations</CardTitle>
              <InviteUserDialog onInviteSent={fetchData} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <UserManagementTable
                  users={users}
                  invitations={invitations}
                  currentUserId={currentUserId}
                  onRefresh={fetchData}
                />
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
