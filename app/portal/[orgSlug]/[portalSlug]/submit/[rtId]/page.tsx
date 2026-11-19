"use client";
import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { listPublicRequestTypes, submitRequest } from "@/lib/api/citizen";
import { getCitizenToken } from "@/lib/api/citizen-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RequestTypeFieldOut } from "@/lib/api/types";

export default function SubmitRequestPage() {
  const { orgSlug, portalSlug, rtId } = useParams<{ orgSlug: string; portalSlug: string; rtId: string }>();
  const router = useRouter();
  const base = `/portal/${orgSlug}/${portalSlug}`;

  useEffect(() => {
    if (!getCitizenToken(orgSlug, portalSlug)) {
      router.replace(`${base}/auth/sign-in`);
    }
  }, [orgSlug, portalSlug, base, router]);

  const { data: requestTypes = [] } = useQuery({
    queryKey: ["public-request-types", orgSlug, portalSlug],
    queryFn: () => listPublicRequestTypes(orgSlug, portalSlug),
  });

  const rt = requestTypes.find((r) => r.id === rtId);
  const fields: RequestTypeFieldOut[] = rt?.fields ?? [];

  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<Record<string, string>>();

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

  function renderField(field: RequestTypeFieldOut) {
    const id = field.id;
    switch (field.field_type) {
      case "textarea":
        return <Textarea id={id} {...register(id)} />;
      case "select":
        return (
          <Select onValueChange={(v) => setValue(id, v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
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
          <form
            onSubmit={handleSubmit((data) => mutate(data))}
            className="space-y-5"
          >
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
