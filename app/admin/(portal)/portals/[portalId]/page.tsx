"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { listPortalRequests } from "@/lib/api/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  rejected: "Rejected",
};

export default function PortalDashboardPage({ params }: { params: Promise<{ portalId: string }> }) {
  const { portalId } = use(params);
  const router = useRouter();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["requests", portalId],
    queryFn: () => listPortalRequests(portalId),
  });

  const counts = requests.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {}
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["open", "in_progress", "closed", "rejected"] as RequestStatus[]).map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{STATUS_LABELS[s]}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{counts[s] ?? 0}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Requests</h2>
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!isLoading && requests.length === 0 && (
          <p className="text-muted-foreground text-sm">No requests yet.</p>
        )}
        {requests.length > 0 && (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 10).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/portals/${portalId}/requests/${r.id}`)}
                  >
                    <td className="px-4 py-2">{r.title}</td>
                    <td className="px-4 py-2">
                      <Badge variant={r.status as RequestStatus}>{STATUS_LABELS[r.status]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
