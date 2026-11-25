"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { listDepartments, createDepartment, updateDepartment, deleteDepartment, getMe, getUserRoles } from "@/lib/api/admin";
import type { DepartmentOut } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function DepartmentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentOut | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentOut | null>(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["org-departments"],
    queryFn: listDepartments,
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["my-roles", me?.id],
    queryFn: () => getUserRoles(me!.id),
    enabled: !!me?.id,
  });
  const canManage = myRoles.some((r) => r.permissions?.includes("org.departments.manage"));

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: "", description: "" });
    setModalOpen(true);
  }

  function openEdit(dept: DepartmentOut) {
    setEditing(dept);
    reset({ name: dept.name, description: dept.description ?? "" });
    setModalOpen(true);
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: FormData) =>
      editing
        ? updateDepartment(editing.id, { name: data.name, description: data.description || undefined })
        : createDepartment({ name: data.name, description: data.description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      setModalOpen(false);
      toast.success(editing ? "Department updated" : "Department created");
    },
    onError: () => toast.error(editing ? "Failed to update department" : "Failed to create department"),
  });

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      setDeleteTarget(null);
      toast.success("Department deleted");
    },
    onError: () => toast.error("Failed to delete department"),
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments</h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Department
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && departments.length === 0 && (
        <p className="text-muted-foreground text-sm">No departments yet.</p>
      )}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-left font-medium">Members</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr
                key={dept.id}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/admin/departments/${dept.id}`)}
              >
                <td className="px-4 py-3 font-medium">{dept.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{dept.description ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{dept.member_count}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(dept)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => save(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea {...register("description")} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the department and remove all its members. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteTarget && remove(deleteTarget.id)}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
