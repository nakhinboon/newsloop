/**
 * Invitation Service
 * 
 * Handles user invitations through Clerk's invitation API.
 * Only admins can create invitations.
 */

import { clerkClient } from '@clerk/nextjs/server';

export interface InvitationInput {
  email: string;
  role: 'ADMIN' | 'EDITOR';
}

export interface Invitation {
  id: string;
  emailAddress: string;
  role: 'ADMIN' | 'EDITOR';
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: Date;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Create a new invitation
 */
export async function createInvitation(input: InvitationInput): Promise<Invitation> {
  const { email, role } = input;

  // Validate email
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  const client = await clerkClient();

  // Check if user already exists
  const existingUsers = await client.users.getUserList({
    emailAddress: [email.trim()],
  });

  if (existingUsers.data.length > 0) {
    throw new Error('A user with this email already exists');
  }

  // Check if invitation already exists
  const existingInvitations = await client.invitations.getInvitationList();
  const pendingInvitation = existingInvitations.data.find(
    (inv) => inv.emailAddress === email.trim() && inv.status === 'pending'
  );

  if (pendingInvitation) {
    throw new Error('An invitation for this email is already pending');
  }

  // Create invitation with role in public metadata
  const invitation = await client.invitations.createInvitation({
    emailAddress: email.trim(),
    publicMetadata: {
      role: role,
    },
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/sign-in`,
  });

  return {
    id: invitation.id,
    emailAddress: invitation.emailAddress,
    role: role,
    status: invitation.status as 'pending' | 'accepted' | 'revoked',
    createdAt: new Date(invitation.createdAt),
  };
}

/**
 * List all pending invitations
 */
export async function listPendingInvitations(): Promise<Invitation[]> {
  const client = await clerkClient();
  
  const invitations = await client.invitations.getInvitationList({
    status: 'pending',
  });

  return invitations.data.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    role: (inv.publicMetadata?.role as 'ADMIN' | 'EDITOR') || 'EDITOR',
    status: inv.status as 'pending' | 'accepted' | 'revoked',
    createdAt: new Date(inv.createdAt),
  }));
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const client = await clerkClient();
  
  await client.invitations.revokeInvitation(invitationId);
}
