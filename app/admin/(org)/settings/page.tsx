"use client";
import { useQuery } from "@tanstack/react-query";
import { getOrg, getOrgSettings } from "@/lib/api/admin";

export default function OrgSettingsPage() {
  const { data: org, isLoading: orgLoading } = useQuery({ queryKey: ["org"], queryFn: getOrg });
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["org-settings"],
    queryFn: getOrgSettings,
  });

  const isLoading = orgLoading || settingsLoading;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {org && (
        <div className="rounded-lg border bg-card px-4 py-4 space-y-3">
          <h2 className="text-sm font-semibold">Organization</h2>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{org.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Slug</span>
              <span className="text-sm font-medium font-mono">{org.slug}</span>
            </div>
          </div>
        </div>
      )}
      {settings && (
        <div className="rounded-lg border bg-card px-4 py-4 space-y-3">
          <h2 className="text-sm font-semibold">Identity</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Citizen identity scope</span>
            <span className="text-sm font-medium font-mono">{settings.citizen_identity_scope}</span>
          </div>
        </div>
      )}
    </div>
  );
}
