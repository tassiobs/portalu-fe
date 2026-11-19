export function getCitizenToken(orgSlug: string, portalSlug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`portalu_citizen_${orgSlug}_${portalSlug}_token`);
}

export function isCitizenAuthenticated(orgSlug: string, portalSlug: string): boolean {
  return !!getCitizenToken(orgSlug, portalSlug);
}
