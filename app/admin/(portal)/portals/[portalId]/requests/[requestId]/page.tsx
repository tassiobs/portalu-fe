"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, FileText, Paperclip, X } from "lucide-react";
import {
  getPortalRequest, updatePortalRequest,
  listTasks, completeTask,
  listComments, addComment,
  getAdminFileSignedUrl,
  listRequestComments, addRequestComment, uploadAdminFile,
  updateRequestAssignment,
  listUsers, listRoles,
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

const UNASSIGNED = "__none__";

export default function RequestDetailPage() {
  const { portalId, requestId } = useParams<{ portalId: string; requestId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [newStatus, setNewStatus] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignRoleId, setAssignRoleId] = useState<string>("");
  const [commentBody, setCommentBody] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load request + comments in parallel
  const { data: request } = useQuery({
    queryKey: ["request", portalId, requestId],
    queryFn: () => getPortalRequest(portalId, requestId),
  });

  const { data: internalComments = [] } = useQuery({
    queryKey: ["request-comments", portalId, requestId],
    queryFn: () => listRequestComments(portalId, requestId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", portalId, requestId],
    queryFn: () => listTasks(portalId, requestId),
  });

  const firstTask = tasks[0];
  const { data: taskComments = [] } = useQuery({
    queryKey: ["task-comments", portalId, requestId, firstTask?.id],
    queryFn: () => listComments(portalId, requestId, firstTask!.id),
    enabled: !!firstTask?.id,
  });

  const { data: usersData } = useQuery({
    queryKey: ["org-users-all"],
    queryFn: () => listUsers(1, 100),
  });
  const { data: allRoles = [] } = useQuery({
    queryKey: ["org-roles"],
    queryFn: listRoles,
  });
  const orgRoles = allRoles.filter((r) => r.level === "org");
  const orgUsers = usersData?.data ?? [];

  // Sync assignment selects with loaded request (once)
  const [assignSynced, setAssignSynced] = useState(false);
  if (request && !assignSynced) {
    setAssignUserId(request.assigned_to_user_id ?? UNASSIGNED);
    setAssignRoleId(request.assigned_to_role_id ?? UNASSIGNED);
    setAssignSynced(true);
  }

  const statusMutation = useMutation({
    mutationFn: () => updatePortalRequest(portalId, requestId, { status: newStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request", portalId, requestId] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const assignMutation = useMutation({
    mutationFn: () => updateRequestAssignment(portalId, requestId, {
      assigned_to_user_id: assignUserId === UNASSIGNED ? null : assignUserId,
      assigned_to_role_id: assignRoleId === UNASSIGNED ? null : assignRoleId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request", portalId, requestId] });
      toast.success("Assignment saved");
    },
    onError: () => toast.error("Failed to save assignment"),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (commentFile) {
        const uploaded = await uploadAdminFile(portalId, commentFile, setUploadPct);
        fileUrl = uploaded.url;
        fileName = uploaded.file_name;
      }
      return addRequestComment(portalId, requestId, {
        body: commentBody.trim() || undefined,
        file_url: fileUrl,
        file_name: fileName,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request-comments", portalId, requestId] });
      setCommentBody("");
      setCommentFile(null);
      setUploadPct(0);
      toast.success("Comment posted");
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const taskCompleteMutation = useMutation({
    mutationFn: ({ taskId, outcome }: { taskId: string; outcome: string }) =>
      completeTask(portalId, requestId, taskId, { outcome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", portalId, requestId] });
      toast.success("Task completed");
    },
    onError: () => toast.error("Failed to complete task"),
  });

  const taskCommentMutation = useMutation({
    mutationFn: (body: string) => addComment(portalId, requestId, firstTask!.id, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", portalId, requestId, firstTask?.id] });
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  if (!request) return <p className="text-muted-foreground text-sm">Loading…</p>;

  const canPostComment = !commentMutation.isPending && (commentBody.trim().length > 0 || !!commentFile);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/portals/${portalId}/requests`)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <Badge variant={request.status as RequestStatus}>
              {STATUS_LABELS[request.status]}
            </Badge>
          </div>
          {(request.reference ?? request.number) && (
            <span className="text-xs font-mono text-muted-foreground">
              #{request.reference ?? request.number}
            </span>
          )}
        </div>
      </div>

      {/* Submitted Data */}
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
                      <FileViewButton portalId={portalId} requestId={requestId} fieldId={fv.field_id} value={fv.value} />
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

      {/* Assignment */}
      <Card>
        <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">User</p>
              <Select value={assignUserId || UNASSIGNED} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="No user assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>No user assigned</SelectItem>
                  {orgUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Role</p>
              <Select value={assignRoleId || UNASSIGNED} onValueChange={setAssignRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="No role assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>No role assigned</SelectItem>
                  {orgRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? "Saving…" : "Save Assignment"}
          </Button>
        </CardContent>
      </Card>

      {/* Update Status */}
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

      {/* Internal Comments */}
      <Card>
        <CardHeader><CardTitle className="text-base">Internal Comments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {internalComments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {internalComments.map((c) => (
            <div key={c.id} className="border rounded-md p-3 text-sm space-y-1">
              {c.body && <p>{c.body}</p>}
              {c.file_url && (
                <a
                  href={c.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {c.file_name ?? "attachment"}
                </a>
              )}
              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
            </div>
          ))}

          <div className="space-y-2 pt-1">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
            />
            {commentFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{commentFile.name}</span>
                {uploadPct > 0 && uploadPct < 100 && (
                  <span className="text-xs">{uploadPct}%</span>
                )}
                <button
                  type="button"
                  onClick={() => { setCommentFile(null); setUploadPct(0); }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-1" /> Attach file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setCommentFile(e.target.files?.[0] ?? null)}
              />
              <Button size="sm" onClick={() => commentMutation.mutate()} disabled={!canPostComment}>
                {commentMutation.isPending ? "Posting…" : "Post"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Tasks */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{t.name ?? "Task"}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {t.status}{t.outcome ? ` · Outcome: ${t.outcome}` : ""}
                  </p>
                </div>
                {t.status !== "completed" && (
                  <div className="flex gap-2">
                    {["approved", "rejected", "clarification_requested"].map((o) => (
                      <Button
                        key={o}
                        size="sm"
                        variant="outline"
                        onClick={() => taskCompleteMutation.mutate({ taskId: t.id, outcome: o })}
                        disabled={taskCompleteMutation.isPending}
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

      {/* Workflow Comments (task-scoped) */}
      {firstTask && (
        <WorkflowComments
          comments={taskComments}
          onPost={(body) => taskCommentMutation.mutate(body)}
          posting={taskCommentMutation.isPending}
        />
      )}
    </div>
  );
}

function WorkflowComments({
  comments, onPost, posting,
}: {
  comments: { id: string; body?: string; created_at: string }[];
  onPost: (body: string) => void;
  posting: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Workflow Comments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="border rounded-md p-3 text-sm">
            <p>{c.body}</p>
            <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
          </div>
        ))}
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" rows={3} />
          <Button
            size="sm"
            onClick={() => { onPost(text); setText(""); }}
            disabled={posting || !text.trim()}
          >
            {posting ? "Posting…" : "Add Comment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
