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

export interface CurrentUser {
  id: string
  name: string
  email: string
  status: string
  org_roles: OrgRole[]
}

export function can(user: CurrentUser | null | undefined, permission: string): boolean {
  if (!user) return false
  return user.org_roles.some(r => r.permissions.includes(permission))
}

export function canAny(user: CurrentUser | null | undefined, permissions: string[]): boolean {
  return permissions.some(p => can(user, p))
}
