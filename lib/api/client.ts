import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://portalu-production.up.railway.app";

export const adminApi = axios.create({ baseURL: API_BASE });
export const citizenApi = axios.create({ baseURL: API_BASE });

function getAdminTokens() {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: localStorage.getItem("portalu_admin_token"),
    refresh: localStorage.getItem("portalu_admin_refresh_token"),
  };
}

function getCitizenTokens(orgSlug: string, portalSlug: string) {
  if (typeof window === "undefined") return { access: null, refresh: null };
  const key = `portalu_citizen_${orgSlug}_${portalSlug}`;
  return {
    access: localStorage.getItem(`${key}_token`),
    refresh: localStorage.getItem(`${key}_refresh_token`),
  };
}

export function setAdminTokens(access: string, refresh: string) {
  localStorage.setItem("portalu_admin_token", access);
  localStorage.setItem("portalu_admin_refresh_token", refresh);
}

export function clearAdminTokens() {
  localStorage.removeItem("portalu_admin_token");
  localStorage.removeItem("portalu_admin_refresh_token");
  localStorage.removeItem("portalu_admin_org_slug");
}

export function setAdminOrgSlug(slug: string) {
  localStorage.setItem("portalu_admin_org_slug", slug);
}

export function getAdminOrgSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("portalu_admin_org_slug");
}

export function setCitizenTokens(orgSlug: string, portalSlug: string, access: string, refresh: string) {
  const key = `portalu_citizen_${orgSlug}_${portalSlug}`;
  localStorage.setItem(`${key}_token`, access);
  localStorage.setItem(`${key}_refresh_token`, refresh);
}

export function clearCitizenTokens(orgSlug: string, portalSlug: string) {
  const key = `portalu_citizen_${orgSlug}_${portalSlug}`;
  localStorage.removeItem(`${key}_token`);
  localStorage.removeItem(`${key}_refresh_token`);
}

export function setOrgRefreshToken(orgSlug: string, token: string) {
  localStorage.setItem(`rt:${orgSlug}`, token);
}

export function getOrgRefreshToken(orgSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`rt:${orgSlug}`);
}

export function clearOrgRefreshToken(orgSlug: string) {
  localStorage.removeItem(`rt:${orgSlug}`);
}

// Admin request interceptor
adminApi.interceptors.request.use((config) => {
  const { access } = getAdminTokens();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

// Admin response interceptor — refresh on 401
let adminRefreshing = false;
adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !adminRefreshing) {
      original._retry = true;
      adminRefreshing = true;
      try {
        const { refresh } = getAdminTokens();
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, { refresh_token: refresh });
        setAdminTokens(data.access_token, data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return adminApi(original);
      } catch {
        clearAdminTokens();
        if (typeof window !== "undefined") window.location.href = "/admin/login";
      } finally {
        adminRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Citizen interceptors — set dynamically per request via headers
citizenApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const orgSlug = original._orgSlug as string;
    const portalSlug = original._portalSlug as string;
    if (error.response?.status === 401 && !original._retry && orgSlug && portalSlug) {
      original._retry = true;
      try {
        const { refresh } = getCitizenTokens(orgSlug, portalSlug);
        const { data } = await axios.post(
          `${API_BASE}/api/v1/customer/${orgSlug}/${portalSlug}/auth/refresh`,
          { refresh_token: refresh }
        );
        setCitizenTokens(orgSlug, portalSlug, data.access_token, data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return citizenApi(original);
      } catch {
        clearCitizenTokens(orgSlug, portalSlug);
        if (typeof window !== "undefined")
          window.location.href = `/portal/${orgSlug}/${portalSlug}/auth/sign-in`;
      }
    }
    return Promise.reject(error);
  }
);
