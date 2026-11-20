import { citizenApi } from "./client";
import { getCitizenToken } from "./citizen-token";
import type { CitizenAuthResponse, CitizenOut, CitizenRequestOut, RequestTypeOut } from "./types";

function portalBase(org: string, portal: string) {
  return `/api/v1/customer/${org}/${portal}`;
}

function authedConfig(org: string, portal: string) {
  const token = getCitizenToken(org, portal);
  return {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    _orgSlug: org,
    _portalSlug: portal,
  };
}

// Public
export const getPublicPortal = (org: string, portal: string) =>
  citizenApi.get(`${portalBase(org, portal)}`).then((r) => r.data);

export const listPublicRequestTypes = (org: string, portal: string) =>
  citizenApi.get<RequestTypeOut[]>(`${portalBase(org, portal)}/request-types`).then((r) => r.data);

// Auth
export const citizenSignUp = (org: string, portal: string, data: { email: string; password: string; name?: string; redirect_url: string }) =>
  citizenApi.post(`${portalBase(org, portal)}/auth/sign-up`, data).then((r) => r.data);

export const citizenVerifyEmail = (org: string, portal: string, token: string) =>
  citizenApi.post(`${portalBase(org, portal)}/auth/verify-email`, { token }).then((r) => r.data);

export const citizenSignIn = (org: string, portal: string, data: { email: string; password: string }) =>
  citizenApi.post<CitizenAuthResponse>(`${portalBase(org, portal)}/auth/sign-in`, data).then((r) => r.data);

export const citizenSignOut = (org: string, portal: string, refreshToken: string) =>
  citizenApi.post(`${portalBase(org, portal)}/auth/sign-out`, { refresh_token: refreshToken }, authedConfig(org, portal));

export const getCitizenMe = (org: string, portal: string) =>
  citizenApi.get<CitizenOut>(`${portalBase(org, portal)}/auth/me`, authedConfig(org, portal)).then((r) => r.data);

// Requests
export const listMyRequests = (org: string, portal: string) =>
  citizenApi.get<CitizenRequestOut[]>(`${portalBase(org, portal)}/requests`, authedConfig(org, portal)).then((r) => r.data);

export const getMyRequest = (org: string, portal: string, requestId: string) =>
  citizenApi.get<CitizenRequestOut>(`${portalBase(org, portal)}/requests/${requestId}`, authedConfig(org, portal)).then((r) => r.data);

export const submitRequest = (
  org: string,
  portal: string,
  data: { request_type_id: string; title: string; field_values?: { field_id: string; value: string }[] }
) =>
  citizenApi.post<CitizenRequestOut>(`${portalBase(org, portal)}/requests`, data, authedConfig(org, portal)).then((r) => r.data);
