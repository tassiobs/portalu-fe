"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import {
  getUser, getMe, getUserRoles, listRoles,
  assignRole, removeRole, deactivateUser, reactivateUser,
} from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["org-user", userId],
    queryFn: () => getUser(userId),
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["my-roles", me?.id],
    queryFn: () => getUserRoles(me!.id),
    enabled: !!me?.id,
  });
  const canManage = myRoles.some((r) => r.permissions?.includes("org.users.manage"));

  const { data: allRoles = [] } = useQuery({ queryKey: ["org-roles"], queryFn: listRoles });
  const orgRoles = allRoles.filter((r) => r.level === "org");

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: () => assignRole(userId, selectedRoleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-user", userId] });
      setSelectedRoleId("");
      toast.success("Role assigned");
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? "Role already assigned" : "Failed to assign role");
    },
  });

  const { mutate: unassign } = useMutation({
    mutationFn: (roleId: string) => removeRole(userId, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-user", userId] });
      toast.success("Role removed");
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const { mutate: deactivate, isPending: deactivating } = useMutation({
    mutationFn: () => deactivateUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-user", userId] });
      setDeactivateOpen(false);
      toast.success("User deactivated");
    },
    onError: () => toast.error("Failed to deactivate user"),
  });

  const { mutate: reactivate, isPending: reactivating } = useMutation({
    mutationFn: () => reactivateUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-user", userId] });
      toast.success("User reactivated");
    },
    onError: () => toast.error("Failed to reactivate user"),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm px-6 py-10">Loading…</p>;
  if (!user) return null;

  const isActive = user.status === "active";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/team")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{user.name ?? user.email}</h1>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <CardTitle className="text-base">Profile</CardTitle>
          {canManage && (
            isActive ? (
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled={reactivating} onClick={() => reactivate()}>
                {reactivating ? "Reactivating…" : "Reactivate"}
              </Button>
            )
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={isActive ? "default" : "secondary"} className="capitalize">{user.status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email verified</span>
            <span>{user.email_verified ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Joined</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Org roles */}
      <Card>
        <CardHeader><CardTitle className="text-base">Org Roles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {user.org_roles.length === 0 && (
            <p className="text-sm text-muted-foreground">No org roles assigned.</p>
          )}
          {user.org_roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{role.name}</p>
                {role.permissions.length > 0 && (
                  <p className="text-xs text-muted-foreground">{role.permissions.join(", ")}</p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => unassign(role.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}

          {canManage && orgRoles.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a role to assign…" />
                </SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedRoleId || assigning}
                onClick={() => assign()}
              >
                {assigning ? "Assigning…" : "Assign"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portal roles (read-only) */}
      {user.portal_roles.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Portal Roles</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {user.portal_roles.map((role, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{role.name}</span>
                <span className="text-muted-foreground">{role.portal_name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Departments (read-only) */}
      {user.departments?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Departments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {user.departments.map((dept) => (
              <div key={dept.id} className="text-sm">
                <p className="font-medium">{dept.name}</p>
                {dept.description && (
                  <p className="text-xs text-muted-foreground">{dept.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Deactivate confirmation */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {user.name ?? user.email}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            They will lose access to all portals immediately. You can reactivate them at any time.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deactivating} onClick={() => deactivate()}>
              {deactivating ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
