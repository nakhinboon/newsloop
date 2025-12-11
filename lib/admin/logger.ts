import { prisma } from '@/lib/db/prisma';

export type ActivityAction = 
  | 'LOGIN'
  | 'CREATE_POST'
  | 'UPDATE_POST'
  | 'DELETE_POST'
  | 'PUBLISH_POST'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'UPLOAD_MEDIA'
  | 'RENAME_MEDIA'
  | 'DELETE_MEDIA'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'INVITE_USER';

export type EntityType = 'POST' | 'CATEGORY' | 'TAG' | 'MEDIA' | 'USER' | 'SYSTEM';

interface LogActivityParams {
  action: ActivityAction;
  entityType?: EntityType;
  entityId?: string;
  details?: Record<string, any>;
  userId: string;
  ipAddress?: string;
}

export async function logActivity({
  action,
  entityType = 'SYSTEM',
  entityId,
  details,
  userId,
  ipAddress
}: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
        userId,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw, we don't want to break the app flow for logging
  }
}
