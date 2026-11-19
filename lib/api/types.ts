export interface UserOut {
  id: string;
  email: string;
  name?: string;
  status: string;
  created_at: string;
}

export interface OrgOut {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface OrgSettingsOut {
  citizen_identity_scope: string;
  lockout?: unknown;
  mfa?: unknown;
}

export interface RoleOut {
  id: string;
  name: string;
  description?: string;
  level?: string;
  permissions?: string[];
}

export interface PortalOut {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

export type FieldType = "text" | "textarea" | "number" | "date" | "select";

export interface RequestTypeFieldOut {
  id: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  order: number;
  options?: string[];
}

export interface RequestTypeOut {
  id: string;
  name: string;
  description?: string;
  fields?: RequestTypeFieldOut[];
  created_at: string;
}

export type RequestStatus = "open" | "in_progress" | "closed" | "rejected";

export interface FieldValueOut {
  field_id: string;
  value: string;
  label?: string;
}

export interface RequestOut {
  id: string;
  title: string;
  status: RequestStatus;
  request_type?: RequestTypeOut;
  request_type_id?: string;
  field_values?: FieldValueOut[];
  created_at: string;
  updated_at?: string;
}

export interface TaskInstanceOut {
  id: string;
  name?: string;
  status: string;
  outcome?: string;
  notes?: string;
  assigned_to_user_id?: string;
  created_at: string;
}

export interface TaskCommentOut {
  id: string;
  body?: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
}

export interface CitizenOut {
  id: string;
  email: string;
  name?: string;
}

export interface CitizenRequestOut {
  id: string;
  title: string;
  status: RequestStatus;
  request_type_id?: string;
  request_type?: RequestTypeOut;
  field_values?: FieldValueOut[];
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserOut;
}

export interface SignUpResponse {
  user: UserOut;
  verification_token?: string; // non-prod only
}

export interface CitizenAuthResponse {
  access_token: string;
  refresh_token: string;
  citizen: CitizenOut;
}

export interface Pagination<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
