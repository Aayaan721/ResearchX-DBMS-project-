import type { SessionUser } from './auth';

export function canViewGlobalAudit(user: SessionUser | null): boolean {
  return user?.role_name === 'Admin';
}

export function canViewProjectAudit(user: SessionUser | null, ownerId: number): boolean {
  return !!user && (user.role_name === 'Admin' || user.role_name === 'Faculty' ||
    (user.role_name === 'Student' && user.user_id === ownerId));
}
