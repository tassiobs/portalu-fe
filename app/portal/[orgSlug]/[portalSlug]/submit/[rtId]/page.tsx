"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { listPublicRequestTypes, submitRequest, uploadCitizenFile } from "@/lib/api/citizen";
import { getCitizenToken } from "@/lib/api/citizen-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestTypeFieldOut, FileUploadOut } from "@/lib/api/types";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

export default function SubmitRequestPage() {
  const { orgSlug, portalSlug, rtId } = useParams<{ orgSlug: string; portalSlug: string; rtId: string }>();
  const router = useRouter();
  const base = `/portal/${orgSlug}/${portalSlug}`;

  useEffect(() => {
    if (!getCitizenToken(orgSlug, portalSlug)) {
      router.replace(`${base}/auth/sign-in`);
    }
  }, [orgSlug, portalSlug, base, router]);

  const [fileUploads, setFileUploads] = useState<Record<string, FileUploadOut>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [fileRequired, setFileRequired] = useState<Record<string, string>>({});

  const { data: requestTypes = [] } = useQuery({
    queryKey: ["public-request-types", orgSlug, portalSlug],
    queryFn: () => listPublicRequestTypes(orgSlug, portalSlug),
  });

  const rt = requestTypes.find((r) => r.id === rtId);
  const fields: RequestTypeFieldOut[] = rt?.fields ?? [];

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<Record<string, string>>();

  const isUploading = Object.keys(uploadProgress).length > 0;

  async function handleFileChange(fieldId: string, file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUploadErrors((p) => ({ ...p, [fieldId]: "File must be under 10 MB" }));
      return;
    }
    setUploadErrors((p) => { const n = { ...p }; delete n[fieldId]; return n; });
    setFileRequired((p) => { const n = { ...p }; delete n[fieldId]; return n; });
    setUploadProgress((p) => ({ ...p, [fieldId]: 0 }));
    try {
      const result = await uploadCitizenFile(orgSlug, portalSlug, file, (pct) =>
        setUploadProgress((p) => ({ ...p, [fieldId]: pct }))
      );
      setFileUploads((p) => ({ ...p, [fieldId]: result }));
    } catch {
      setUploadErrors((p) => ({ ...p, [fieldId]: "Upload failed — please try again" }));
    } finally {
      setUploadProgress((p) => { const n = { ...p }; delete n[fieldId]; return n; });
    }
  }

  function removeUpload(fieldId: string) {
    setFileUploads((p) => { const n = { ...p }; delete n[fieldId]; return n; });
  }

  const { mutate } = useMutation({
    mutationFn: (fieldValues: Record<string, string>) =>
      submitRequest(orgSlug, portalSlug, {
        request_type_id: rtId,
        title: `${rt?.name ?? "Request"} — ${new Date().toLocaleDateString()}`,
        field_values: Object.entries(fieldValues).map(([field_id, value]) => ({ field_id, value })),
      }),
    onSuccess: () => {
      toast.success("Request submitted!");
      router.push(`${base}/my-requests`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Submission failed";
      toast.error(msg);
    },
  });

  function onSubmit(data: Record<string, string>) {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.field_type === "file" && field.required && !fileUploads[field.id]) {
        errors[field.id] = "This attachment is required";
      }
    }
    if (Object.keys(errors).length > 0) {
      setFileRequired(errors);
      return;
    }
    const merged: Record<string, string> = { ...data };
    for (const field of fields) {
      if (field.field_type === "file" && fileUploads[field.id]) {
        merged[field.id] = JSON.stringify(fileUploads[field.id]);
      }
    }
    mutate(merged);
  }

  function renderField(field: RequestTypeFieldOut) {
    const id = field.id;
    switch (field.field_type) {
      case "file": {
        const upload = fileUploads[id];
        const progress = uploadProgress[id];
        const error = uploadErrors[id] ?? fileRequired[id];
        if (upload) {
          return (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="flex-1 truncate text-muted-foreground">{upload.file_name}</span>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => removeUpload(id)}>
                Remove
              </Button>
            </div>
          );
        }
        if (progress !== undefined) {
          return (
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              Uploading… {progress}%
            </div>
          );
        }
        return (
          <div className="space-y-1">
            <Input
              type="file"
              accept={ACCEPTED}
              className="cursor-pointer"
              onChange={(e) => handleFileChange(id, e.target.files?.[0])}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      }
      case "textarea":
        return <Textarea id={id} {...register(id)} />;
      case "select":
        return (
          <Select onValueChange={(v) => setValue(id, v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case "number":
        return <Input id={id} type="number" {...register(id)} />;
      case "date":
        return <Input id={id} type="date" {...register(id)} />;
      default:
        return <Input id={id} type="text" {...register(id)} />;
    }
  }

  if (!rt) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{rt.name}</CardTitle>
          {rt.description && <p className="text-sm text-muted-foreground">{rt.description}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No fields defined for this request type.</p>
            )}
            {fields
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push(base)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isUploading ? "Uploading…" : isSubmitting ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
