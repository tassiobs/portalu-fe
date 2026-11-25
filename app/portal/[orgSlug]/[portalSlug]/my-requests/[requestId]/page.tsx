"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getMyRequest, getCitizenFileSignedUrl } from "@/lib/api/citizen";
import { getCitizenToken } from "@/lib/api/citizen-token";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Download } from "lucide-react";
import type { FieldValueOut, RequestStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open", in_progress: "In Progress", closed: "Closed", rejected: "Rejected",
};

function isFileField(fv: FieldValueOut): boolean {
  if (fv.field_type === "file") return true;
  try {
    const p = JSON.parse(fv.value);
    return typeof p === "object" && p !== null && "storage_path" in p;
  } catch {
    return false;
  }
}

function FileDownloadButton({
  orgSlug, portalSlug, requestId, fieldId, value,
}: {
  orgSlug: string; portalSlug: string; requestId: string; fieldId: string; value: string;
}) {
  const [loading, setLoading] = useState(false);
  let fileName = "file";
  try { fileName = JSON.parse(value).file_name ?? "file"; } catch { /* noop */ }

  async function handleClick() {
    setLoading(true);
    try {
      const { url } = await getCitizenFileSignedUrl(orgSlug, portalSlug, requestId, fieldId);
      window.open(url, "_blank");
    } catch {
      // signed URL fetch failed — silent; user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={loading} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {loading ? "…" : fileName}
    </Button>
  );
}

export default function CitizenRequestDetailPage() {
  const { orgSlug, portalSlug, requestId } = useParams<{ orgSlug: string; portalSlug: string; requestId: string }>();
  const router = useRouter();
  const base = `/portal/${orgSlug}/${portalSlug}`;

  useEffect(() => {
    if (!getCitizenToken(orgSlug, portalSlug)) {
      router.replace(`${base}/auth/sign-in`);
    }
  }, [orgSlug, portalSlug, base, router]);

  const { data: request } = useQuery({
    queryKey: ["my-request", orgSlug, portalSlug, requestId],
    queryFn: () => getMyRequest(orgSlug, portalSlug, requestId),
  });

  if (!request) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`${base}/my-requests`)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <Badge variant={request.status as RequestStatus}>{STATUS_LABELS[request.status]}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Submission Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <dt className="font-medium text-muted-foreground">Submitted</dt>
              <dd className="col-span-2">{new Date(request.created_at).toLocaleString()}</dd>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <dt className="font-medium text-muted-foreground">Status</dt>
              <dd className="col-span-2">{STATUS_LABELS[request.status]}</dd>
            </div>
            {request.field_values?.map((fv) => (
              <div key={fv.field_id} className="grid grid-cols-3 gap-2 text-sm">
                <dt className="font-medium text-muted-foreground">{fv.label ?? fv.field_id}</dt>
                <dd className="col-span-2">
                  {isFileField(fv) ? (
                    <FileDownloadButton
                      orgSlug={orgSlug}
                      portalSlug={portalSlug}
                      requestId={requestId}
                      fieldId={fv.field_id}
                      value={fv.value}
                    />
                  ) : (
                    fv.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
