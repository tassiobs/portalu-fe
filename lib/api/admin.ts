import { adminApi } from "./client";
import type {
  AuthResponse, SignUpResponse, OrgOut, OrgSettingsOut, UserOut, UserDetailOut, RoleOut,
  PortalOut, RequestTypeOut, RequestTypeFieldOut, RequestOut,
  TaskInstanceOut, TaskCommentOut, Pagination, FieldType, InvitationOut, InvitationDetailOut,
  PermissionOut, PortalUserOut, SignedUrlOut,
} from "./types";

// Auth
export const signUp = (data: { org_name: string; name: string; email: string; password: string; redirect_url: string }) =>
  adminApi.post<SignUpResponse>("/api/v1/auth/sign-up", data).then((r) => r.data);

export const verifyEmail = (token: string) =>
  adminApi.post("/api/v1/auth/verify-email", { token }).then((r) => r.data);

export const resendVerification = (email: string, redirect_url: string) =>
  adminApi.post<SignUpResponse>("/api/v1/auth/resend-verification", { email, redirect_url }).then((r) => r.data);

export const signIn = (email: string, password: string) =>
  adminApi.post<AuthResponse>("/api/v1/auth/sign-in", { email, password }).then((r) => r.data);

export const signOut = (refreshToken: string) =>
  adminApi.post("/api/v1/auth/sign-out", { refresh_token: refreshToken });

export const getMe = () =>
  adminApi.get<UserOut>("/api/v1/auth/me").then((r) => r.data);

// Org
export const getOrg = () =>
  adminApi.get<OrgOut>("/api/v1/org").then((r) => r.data);

export const updateOrg = (data: { name?: string; slug?: string }) =>
  adminApi.patch<OrgOut>("/api/v1/org", data).then((r) => r.data);

export const getOrgSettings = () =>
  adminApi.get<OrgSettingsOut>("/api/v1/org/settings").then((r) => r.data);

export const updateOrgSettings = (data: { citizen_identity_scope?: string }) =>
  adminApi.patch<OrgSettingsOut>("/api/v1/org/settings", data).then((r) => r.data);

// Users
export const listUsers = (page = 1, perPage = 20) =>
  adminApi.get<Pagination<UserOut>>("/api/v1/org/users", { params: { page, per_page: perPage } }).then((r) => r.data);

export const getUser = (userId: string) =>
  adminApi.get<UserDetailOut>(`/api/v1/org/users/${userId}`).then((r) => r.data);

export const inviteUser = (email: string, name?: string) =>
  adminApi.post("/api/v1/org/users", { email, name }).then((r) => r.data);

export const deactivateUser = (userId: string) =>
  adminApi.post(`/api/v1/org/users/${userId}/deactivate`);

export const reactivateUser = (userId: string) =>
  adminApi.patch(`/api/v1/org/users/${userId}`, { status: "active" });

export const getUserRoles = (userId: string) =>
  adminApi.get<RoleOut[]>(`/api/v1/org/users/${userId}/roles`).then((r) => r.data);

export const assignRole = (userId: string, roleId: string) =>
  adminApi.post(`/api/v1/org/users/${userId}/roles`, { role_id: roleId });

export const removeRole = (userId: string, roleId: string) =>
  adminApi.delete(`/api/v1/org/users/${userId}/roles/${roleId}`);

// Invitations
export const listInvitations = (page = 1, perPage = 20) =>
  adminApi.get<Pagination<InvitationDetailOut>>("/api/v1/org/invitations", { params: { page, per_page: perPage } }).then((r) => r.data);

export const resendInvitation = (invitationId: string) =>
  adminApi.post(`/api/v1/org/invitations/${invitationId}/resend`);

export const cancelInvitation = (invitationId: string) =>
  adminApi.post(`/api/v1/org/invitations/${invitationId}/cancel`);

// Roles
export const listRoles = () =>
  adminApi.get<RoleOut[]>("/api/v1/org/roles").then((r) => r.data);

export const createRole = (data: { name: string; description?: string; level?: string; permissions?: string[] }) =>
  adminApi.post<RoleOut>("/api/v1/org/roles", data).then((r) => r.data);

export const updateRole = (roleId: string, data: { name?: string; description?: string; permissions?: string[] }) =>
  adminApi.patch<RoleOut>(`/api/v1/org/roles/${roleId}`, data).then((r) => r.data);

export const deleteRole = (roleId: string) =>
  adminApi.delete(`/api/v1/org/roles/${roleId}`);

export const listPermissions = () =>
  adminApi.get("/api/v1/org/permissions").then((r) => {
    const d = r.data;
    if (Array.isArray(d)) return d as PermissionOut[];
    // grouped: { org: [...], portal: [...] }
    if (d.org || d.portal) {
      return [
        ...(d.org ?? []).map((p: PermissionOut) => ({ ...p, level: "org" as const })),
        ...(d.portal ?? []).map((p: PermissionOut) => ({ ...p, level: "portal" as const })),
      ];
    }
    // paginated: { data: [...] }
    return (d.data ?? []) as PermissionOut[];
  });

// Portals
export const listPortals = () =>
  adminApi.get<PortalOut[]>("/api/v1/org/portals").then((r) => r.data);

export const createPortal = (data: { name: string; slug: string; description?: string }) =>
  adminApi.post<PortalOut>("/api/v1/org/portals", data).then((r) => r.data);

export const updatePortal = (portalId: string, data: { name?: string; description?: string }) =>
  adminApi.patch<PortalOut>(`/api/v1/org/portals/${portalId}`, data).then((r) => r.data);

export const deletePortal = (portalId: string) =>
  adminApi.delete(`/api/v1/org/portals/${portalId}`);

// Portal Users
export const listPortalUsers = (portalId: string) =>
  adminApi.get<PortalUserOut[]>(`/api/v1/org/portals/${portalId}/users`).then((r) => r.data);

export const assignPortalUser = (portalId: string, data: { user_id: string; role_id: string }) =>
  adminApi.post<PortalUserOut>(`/api/v1/org/portals/${portalId}/users`, data).then((r) => r.data);

export const removePortalUser = (portalId: string, userId: string) =>
  adminApi.delete(`/api/v1/org/portals/${portalId}/users/${userId}`);

// Request Types
export const listRequestTypes = (portalId: string) =>
  adminApi.get<RequestTypeOut[]>(`/api/v1/org/portals/${portalId}/request-types`).then((r) => r.data);

export const createRequestType = (portalId: string, data: { name: string; description?: string }) =>
  adminApi.post<RequestTypeOut>(`/api/v1/org/portals/${portalId}/request-types`, data).then((r) => r.data);

export const updateRequestType = (portalId: string, rtId: string, data: { name?: string; description?: string }) =>
  adminApi.patch<RequestTypeOut>(`/api/v1/org/portals/${portalId}/request-types/${rtId}`, data).then((r) => r.data);

export const deleteRequestType = (portalId: string, rtId: string) =>
  adminApi.delete(`/api/v1/org/portals/${portalId}/request-types/${rtId}`);

// Fields
export const listFields = (portalId: string, rtId: string) =>
  adminApi.get<RequestTypeFieldOut[]>(`/api/v1/org/portals/${portalId}/request-types/${rtId}/fields`).then((r) => r.data);

export const createField = (
  portalId: string,
  rtId: string,
  data: { label: string; field_type: FieldType; required?: boolean; order?: number; options?: string[] }
) =>
  adminApi.post<RequestTypeFieldOut>(`/api/v1/org/portals/${portalId}/request-types/${rtId}/fields`, data).then((r) => r.data);

export const updateField = (
  portalId: string,
  rtId: string,
  fieldId: string,
  data: Partial<{ label: string; field_type: FieldType; required: boolean; order: number; options: string[] }>
) =>
  adminApi.patch<RequestTypeFieldOut>(`/api/v1/org/portals/${portalId}/request-types/${rtId}/fields/${fieldId}`, data).then((r) => r.data);

export const deleteField = (portalId: string, rtId: string, fieldId: string) =>
  adminApi.delete(`/api/v1/org/portals/${portalId}/request-types/${rtId}/fields/${fieldId}`);

// Portal Request Files
export const getAdminFileSignedUrl = (portalId: string, requestId: string, fieldId: string) =>
  adminApi
    .get<SignedUrlOut>(`/api/v1/org/portals/${portalId}/requests/${requestId}/fields/${fieldId}/signed-url`)
    .then((r) => r.data);

// Portal Requests
export const listPortalRequests = (portalId: string, params?: { status?: string }) =>
  adminApi.get<RequestOut[]>(`/api/v1/org/portals/${portalId}/requests`, { params }).then((r) => r.data);

export const getPortalRequest = (portalId: string, requestId: string) =>
  adminApi.get<RequestOut>(`/api/v1/org/portals/${portalId}/requests/${requestId}`).then((r) => r.data);

export const updatePortalRequest = (portalId: string, requestId: string, data: { status?: string; title?: string }) =>
  adminApi.patch<RequestOut>(`/api/v1/org/portals/${portalId}/requests/${requestId}`, data).then((r) => r.data);

// Tasks
export const listTasks = (portalId: string, requestId: string) =>
  adminApi.get<TaskInstanceOut[]>(`/api/v1/org/portals/${portalId}/requests/${requestId}/tasks`).then((r) => r.data);

export const completeTask = (portalId: string, requestId: string, taskId: string, data: { outcome: string; notes?: string }) =>
  adminApi.post<TaskInstanceOut>(`/api/v1/org/portals/${portalId}/requests/${requestId}/tasks/${taskId}/complete`, data).then((r) => r.data);

// Comments
export const listComments = (portalId: string, requestId: string, taskId: string) =>
  adminApi.get<TaskCommentOut[]>(`/api/v1/org/portals/${portalId}/requests/${requestId}/tasks/${taskId}/comments`).then((r) => r.data);

export const addComment = (portalId: string, requestId: string, taskId: string, data: { body?: string }) =>
  adminApi.post<TaskCommentOut>(`/api/v1/org/portals/${portalId}/requests/${requestId}/tasks/${taskId}/comments`, data).then((r) => r.data);
