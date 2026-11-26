"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { listPortalRequests } from "@/lib/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RequestStatus } from "@/lib/api/types";

const STATUSES = ["all", "open", "in_progress", "closed", "rejected"] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  rejected: "Rejected",
};

export default function RequestsInboxPage() {
  const { portalId } = useParams<{ portalId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["portal-requests", portalId, status],
    queryFn: () => listPortalRequests(portalId, status !== "all" ? { status } : undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/portals/${portalId}/request-types`)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Requests</h1>
        <div className="ml-auto w-40">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ref</th>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr
                key={r.id}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/30"
                onClick={() => router.push(`/admin/portals/${portalId}/requests/${r.id}`)}
              >
                <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                  #{r.reference ?? r.number}
                </td>
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.status as RequestStatus}>{STATUS_LABELS[r.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {requests.length === 0 && !isLoading && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
