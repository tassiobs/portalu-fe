"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listInvitations, resendInvitation, cancelInvitation, getMe, getUserRoles } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function InvitationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; email: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["org-invitations", page],
    queryFn: () => listInvitations(page),
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["my-roles", me?.id],
    queryFn: () => getUserRoles(me!.id),
    enabled: !!me?.id,
  });
  const canManage = myRoles.some((r) => r.permissions?.includes("org.users.manage"));

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: () => toast.success("Invitation resent"),
    onError: () => toast.error("Failed to resend invitation"),
  });

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-invitations"] });
      setCancelTarget(null);
      toast.success("Invitation cancelled");
    },
    onError: () => toast.error("Failed to cancel invitation"),
  });

  const invitations = data?.data ?? [];
  const totalPages = data?.pagination.total_pages ?? 1;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Invitations</h1>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {!isLoading && invitations.length === 0 && (
        <p className="text-muted-foreground text-sm">No invitations yet.</p>
      )}

      {invitations.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Invited by</th>
                <th className="px-4 py-2 text-left font-medium">Sent</th>
                <th className="px-4 py-2 text-left font-medium">Expires</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                {canManage && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{inv.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.invited_by.name ?? inv.invited_by.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={inv.status === "pending" ? "default" : inv.status === "accepted" ? "secondary" : "outline"}
                      className="capitalize"
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {inv.status === "pending" && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resending}
                            onClick={() => resend(inv.id)}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setCancelTarget({ id: inv.id, email: inv.email })}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel invitation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The invitation sent to <strong>{cancelTarget?.email}</strong> will be cancelled and can no longer be accepted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Keep</Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={() => cancelTarget && cancel(cancelTarget.id)}
            >
              {cancelling ? "Cancelling…" : "Cancel Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
