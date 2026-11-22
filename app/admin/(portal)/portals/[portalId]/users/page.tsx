"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  listPortalUsers,
  assignPortalUser,
  removePortalUser,
  listUsers,
  listRoles,
} from "@/lib/api/admin";
import type { PortalUserOut } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PortalUsersPage() {
  const { portalId } = useParams<{ portalId: string }>();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<PortalUserOut | null>(null);

  const { data: portalUsers = [], isLoading } = useQuery({
    queryKey: ["portal-users", portalId],
    queryFn: () => listPortalUsers(portalId),
  });

  const { data: orgUsers } = useQuery({
    queryKey: ["org-users"],
    queryFn: () => listUsers(),
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["org-roles"],
    queryFn: listRoles,
  });

  const portalRoles = allRoles.filter((r) => r.level === "portal");

  const assignedUserIds = new Set(portalUsers.map((pu) => pu.user_id));
  const availableUsers = (orgUsers?.data ?? []).filter((u) => !assignedUserIds.has(u.id));

  function openAssign() {
    setSelectedUserId("");
    setSelectedRoleId("");
    setDialogOpen(true);
  }

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: () => assignPortalUser(portalId, { user_id: selectedUserId, role_id: selectedRoleId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-users", portalId] });
      setDialogOpen(false);
      toast.success("User assigned");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to assign user";
      toast.error(msg);
    },
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (userId: string) => removePortalUser(portalId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-users", portalId] });
      setRemoveTarget(null);
      toast.success("Access removed");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to remove user";
      toast.error(msg);
    },
  });

  const canAssign = !!selectedUserId && !!selectedRoleId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <Button onClick={openAssign} disabled={availableUsers.length === 0 || portalRoles.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && portalUsers.length === 0 && (
        <p className="text-muted-foreground text-sm">No users have been assigned to this portal yet.</p>
      )}

      {portalUsers.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {portalUsers.map((pu) => (
                <tr key={pu.user_id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{pu.user.name ?? pu.user.email}</p>
                    {pu.user.name && (
                      <p className="text-xs text-muted-foreground">{pu.user.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{pu.role.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(pu)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {portalRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {portalRoles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No portal-level roles exist yet. Create one in the Roles section first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canAssign || assigning} onClick={() => assign()}>
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove access for &ldquo;{removeTarget?.user.name ?? removeTarget?.user.email}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            They will lose all access to this portal immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => removeTarget && remove(removeTarget.user_id)}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
