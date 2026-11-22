"use client";
import { useQuery } from "@tanstack/react-query";
import { listInvitations } from "@/lib/api/admin";

export default function InvitationsPage() {
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["org-invitations"],
    queryFn: listInvitations,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Invitations</h1>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!isLoading && invitations.length === 0 && (
        <p className="text-muted-foreground text-sm">No pending invitations.</p>
      )}
      <div className="space-y-2">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{inv.name ?? inv.email}</p>
              {inv.name && <p className="text-xs text-muted-foreground truncate">{inv.email}</p>}
            </div>
            <span className="ml-auto text-xs text-muted-foreground capitalize">{inv.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
