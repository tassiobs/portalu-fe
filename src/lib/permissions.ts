export type Permission =
  | 'requests:read'
  | 'requests:create'
  | 'requests:update'
  | 'requests:delete'
  | 'org.users.manage'
  | 'org.portals.manage'

export interface OrgRole {
  id: string
  name: string
  permissions: string[]
  is_default: boolean
}

export interface PortalRole {
  id: string
  name: string
  permissions: string[]
  portal_id: string
  portal_name: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  status: string
  org_id: string
  org_slug: string
  org_roles: OrgRole[]
  portal_roles: PortalRole[]
}

export function can(user: CurrentUser | null | undefined, permission: string): boolean {
  if (!user) return false
  return user.org_roles.some(r => Array.isArray(r.permissions) && r.permissions.includes(permission))
}

export function canAny(user: CurrentUser | null | undefined, permissions: string[]): boolean {
  return permissions.some(p => can(user, p))
}

export function canPortal(
  user: CurrentUser | null | undefined,
  portalId: string,
  permission: string,
): boolean {
  if (!user) return false
  if (can(user, 'org.portals.manage')) return true
  return user.portal_roles
    .filter(r => r.portal_id === portalId)
    .some(r => Array.isArray(r.permissions) && r.permissions.includes(permission))
}
