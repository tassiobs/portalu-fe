"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { listUsers, inviteUser, getMe, getUserRoles, listRoles } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const inviteSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Valid email required"),
});
type InviteForm = z.infer<typeof inviteSchema>;

export default function TeamPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["org-users", page],
    queryFn: () => listUsers(page),
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["my-roles", me?.id],
    queryFn: () => getUserRoles(me!.id),
    enabled: !!me?.id,
  });
  const canManage = myRoles.some((r) => r.permissions?.includes("org.users.manage"));

  const { data: allRoles = [] } = useQuery({
    queryKey: ["org-roles"],
    queryFn: listRoles,
    enabled: inviteOpen,
  });
  const orgRoles = allRoles.filter((r) => r.level === "org");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  const { mutate: invite, isPending: inviting } = useMutation({
    mutationFn: (d: InviteForm) => inviteUser(d.email, d.name || undefined, selectedRoleId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-users"] });
      setInviteOpen(false);
      toast.success("Invitation sent");
      reset();
      setInviteError("");
      setSelectedRoleId("");
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setInviteError("This email is already registered");
      } else {
        toast.error("Failed to send invitation");
      }
    },
  });

  const users = data?.data ?? [];
  const totalPages = data?.pagination.total_pages ?? 1;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
        {canManage && (
          <Button onClick={() => { setInviteError(""); setSelectedRoleId(""); reset(); setInviteOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Invite User
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && users.length === 0 && (
        <p className="text-muted-foreground text-sm">No users yet.</p>
      )}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/admin/team/${user.id}`)}
              >
                <td className="px-4 py-3 font-medium">{user.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={user.status === "active" ? "default" : "secondary"} className="capitalize">
                    {user.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => invite(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...register("name")} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
            </div>
            {orgRoles.length > 0 && (
              <div className="space-y-1">
                <Label>Role <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No role assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>{inviting ? "Sending…" : "Send Invitation"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
