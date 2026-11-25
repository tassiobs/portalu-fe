"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, FileText } from "lucide-react";
import {
  getPortalRequest, updatePortalRequest,
  listTasks, completeTask,
  listComments, addComment,
  getAdminFileSignedUrl,
} from "@/lib/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldValueOut, RequestStatus } from "@/lib/api/types";

function isFileField(fv: FieldValueOut): boolean {
  if (fv.field_type === "file") return true;
  try {
    const p = JSON.parse(fv.value);
    return typeof p === "object" && p !== null && "storage_path" in p;
  } catch {
    return false;
  }
}

function FileViewButton({ portalId, requestId, fieldId, value }: {
  portalId: string; requestId: string; fieldId: string; value: string;
}) {
  const [loading, setLoading] = useState(false);
  let fileName = "file";
  try { fileName = JSON.parse(value).file_name ?? "file"; } catch { /* noop */ }

  async function handleClick() {
    setLoading(true);
    try {
      const { url } = await getAdminFileSignedUrl(portalId, requestId, fieldId);
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={loading} className="gap-1.5">
      <FileText className="h-3.5 w-3.5" />
      {loading ? "…" : fileName}
    </Button>
  );
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open", in_progress: "In Progress", closed: "Closed", rejected: "Rejected",
};

export default function RequestDetailPage() {
  const { portalId, requestId } = useParams<{ portalId: string; requestId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>("");
  const [comment, setComment] = useState("");

  const { data: request } = useQuery({
    queryKey: ["request", portalId, requestId],
    queryFn: () => getPortalRequest(portalId, requestId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", portalId, requestId],
    queryFn: () => listTasks(portalId, requestId),
  });

  const firstTask = tasks[0];
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", portalId, requestId, firstTask?.id],
    queryFn: () => listComments(portalId, requestId, firstTask!.id),
    enabled: !!firstTask?.id,
  });

  const statusMutation = useMutation({
    mutationFn: () => updatePortalRequest(portalId, requestId, { status: newStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request", portalId, requestId] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(portalId, requestId, firstTask!.id, { body: comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", portalId, requestId, firstTask?.id] });
      setComment("");
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, outcome }: { taskId: string; outcome: string }) =>
      completeTask(portalId, requestId, taskId, { outcome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", portalId, requestId] });
      toast.success("Task completed");
    },
    onError: () => toast.error("Failed to complete task"),
  });

  if (!request) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/portals/${portalId}/requests`)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <Badge variant={request.status as RequestStatus} className="ml-2">
          {STATUS_LABELS[request.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Submitted Data</CardTitle></CardHeader>
        <CardContent>
          {request.field_values?.length ? (
            <dl className="space-y-2">
              {request.field_values.map((fv) => (
                <div key={fv.field_id} className="grid grid-cols-3 gap-2 text-sm">
                  <dt className="font-medium text-muted-foreground">{fv.label ?? fv.field_id}</dt>
                  <dd className="col-span-2">
                    {isFileField(fv) ? (
                      <FileViewButton
                        portalId={portalId}
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
          ) : (
            <p className="text-sm text-muted-foreground">No field values recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Select value={newStatus || request.status} onValueChange={setNewStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["open", "in_progress", "closed", "rejected"] as RequestStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending || !newStatus}>
            Save
          </Button>
        </CardContent>
      </Card>

      {tasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{t.name ?? "Task"}</p>
                  <p className="text-xs text-muted-foreground">Status: {t.status} {t.outcome ? `· Outcome: ${t.outcome}` : ""}</p>
                </div>
                {t.status !== "completed" && (
                  <div className="flex gap-2">
                    {["approved", "rejected", "clarification_requested"].map((o) => (
                      <Button
                        key={o}
                        size="sm"
                        variant="outline"
                        onClick={() => completeMutation.mutate({ taskId: t.id, outcome: o })}
                        disabled={completeMutation.isPending}
                      >
                        {o.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {firstTask && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comments</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="border rounded-md p-3 text-sm">
                <p>{c.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
              </div>
            ))}
            <div className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => commentMutation.mutate()}
                disabled={commentMutation.isPending || !comment.trim()}
              >
                {commentMutation.isPending ? "Posting…" : "Add Comment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
