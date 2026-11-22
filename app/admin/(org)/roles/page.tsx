"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { listRoles, listPermissions, createRole, updateRole, deleteRole } from "@/lib/api/admin";
import type { RoleOut } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  level: z.enum(["org", "portal"]),
});
type FormData = z.infer<typeof schema>;

export default function RolesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleOut | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<RoleOut | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["org-roles"],
    queryFn: listRoles,
  });
  const { data: permissionCatalogue = [] } = useQuery({
    queryKey: ["org-permissions"],
    queryFn: listPermissions,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { level: "org" },
  });

  const selectedLevel = watch("level");
  const filteredPermissions = permissionCatalogue.filter((p) => p.level === selectedLevel);

  function openCreate() {
    setEditingRole(null);
    reset({ name: "", description: "", level: "org" });
    setSelectedPermissions([]);
    setDialogOpen(true);
  }

  function openEdit(role: RoleOut) {
    setEditingRole(role);
    reset({
      name: role.name,
      description: role.description ?? "",
      level: (role.level as "org" | "portal") ?? "org",
    });
    setSelectedPermissions(role.permissions ?? []);
    setDialogOpen(true);
  }

  function togglePermission(key: string) {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: FormData) =>
      editingRole
        ? updateRole(editingRole.id, {
            name: data.name,
            description: data.description,
            permissions: selectedPermissions,
          })
        : createRole({ ...data, permissions: selectedPermissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-roles"] });
      setDialogOpen(false);
      toast.success(editingRole ? "Role updated" : "Role created");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong";
      toast.error(msg);
    },
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-roles"] });
      setDeleteTarget(null);
      toast.success("Role deleted");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to delete role";
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Role
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-lg border bg-card px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{role.name}</p>
                  {role.level && (
                    <Badge variant="secondary" className="capitalize text-xs">
                      {role.level}
                    </Badge>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
                {role.permissions && role.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {role.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(role)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(role)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "New Role"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => save(d))} className="space-y-5">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input {...register("description")} />
            </div>
            <div className="space-y-1">
              <Label>Level</Label>
              <div className="flex gap-2">
                {(["org", "portal"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    disabled={!!editingRole}
                    onClick={() => {
                      setValue("level", lvl);
                      setSelectedPermissions([]);
                    }}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors",
                      selectedLevel === lvl
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-accent",
                      editingRole && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              {editingRole && (
                <p className="text-xs text-muted-foreground">Level cannot be changed after creation.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              {filteredPermissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No permissions available for this level.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                  {filteredPermissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-primary"
                        checked={selectedPermissions.includes(perm.key)}
                        onChange={() => togglePermission(perm.key)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{perm.label}</p>
                        {perm.description && (
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => deleteTarget && remove(deleteTarget.id)}
            >
              {removing ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
