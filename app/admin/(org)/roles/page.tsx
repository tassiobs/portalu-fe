"use client";
import { useQuery } from "@tanstack/react-query";
import { listRoles } from "@/lib/api/admin";

export default function RolesPage() {
  const { data: roles = [], isLoading } = useQuery({ queryKey: ["org-roles"], queryFn: listRoles });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Roles</h1>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role.id} className="rounded-lg border bg-card px-4 py-3 space-y-1">
            <p className="text-sm font-medium">{role.name}</p>
            {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
            {role.permissions && role.permissions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {role.permissions.map((p) => (
                  <span key={p} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{p}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
