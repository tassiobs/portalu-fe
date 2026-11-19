"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getOrg, updateOrg, getOrgSettings, updateOrgSettings } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const orgSchema = z.object({ name: z.string().min(1) });
type OrgForm = z.infer<typeof orgSchema>;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["org"], queryFn: getOrg });
  const { data: settings } = useQuery({ queryKey: ["org-settings"], queryFn: getOrgSettings });

  const orgForm = useForm<OrgForm>({ resolver: zodResolver(orgSchema) });

  useEffect(() => {
    if (org) orgForm.reset({ name: org.name });
  }, [org]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOrgMutation = useMutation({
    mutationFn: (data: OrgForm) => updateOrg(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["org"] }); toast.success("Org updated"); },
    onError: () => toast.error("Failed to update org"),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (scope: string) => updateOrgSettings({ citizen_identity_scope: scope }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["org-settings"] }); toast.success("Settings updated"); },
    onError: () => toast.error("Failed to update settings"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={orgForm.handleSubmit((d) => updateOrgMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Org Name</Label>
              <Input {...orgForm.register("name")} />
            </div>
            {org && (
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input value={org.slug} disabled />
                <p className="text-xs text-muted-foreground">Slug is permanent and cannot be changed here.</p>
              </div>
            )}
            <Button type="submit" disabled={updateOrgMutation.isPending}>
              {updateOrgMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Citizen Identity Scope</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Controls whether citizens are shared across all portals (org-level) or are separate per portal (portal-level).
          </p>
          {settings && (
            <Select
              defaultValue={settings.citizen_identity_scope}
              onValueChange={(v) => updateSettingsMutation.mutate(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">Org-level</SelectItem>
                <SelectItem value="portal">Portal-level</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
