"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { listMyRequests } from "@/lib/api/citizen";
import { getCitizenToken } from "@/lib/api/citizen-token";
import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open", in_progress: "In Progress", closed: "Closed", rejected: "Rejected",
};

export default function MyRequestsPage() {
  const { orgSlug, portalSlug } = useParams<{ orgSlug: string; portalSlug: string }>();
  const router = useRouter();
  const base = `/portal/${orgSlug}/${portalSlug}`;

  useEffect(() => {
    if (!getCitizenToken(orgSlug, portalSlug)) {
      router.replace(`${base}/auth/sign-in`);
    }
  }, [orgSlug, portalSlug, base, router]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-requests", orgSlug, portalSlug],
    queryFn: () => listMyRequests(orgSlug, portalSlug),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Requests</h1>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr
                key={r.id}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/30"
                onClick={() => router.push(`${base}/my-requests/${r.id}`)}
              >
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
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
