"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { listFields, createField, deleteField } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { FieldType } from "@/lib/api/types";

const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "date", "select"];

const schema = z.object({
  label: z.string().min(1),
  field_type: z.enum(["text", "textarea", "number", "date", "select"]),
  required: z.boolean().default(false),
  order: z.coerce.number().default(0),
  options: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function FieldsPage() {
  const { portalId, rtId } = useParams<{ portalId: string; rtId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [fieldType, setFieldType] = useState<FieldType>("text");

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ["fields", portalId, rtId],
    queryFn: () => listFields(portalId, rtId),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const options = data.field_type === "select" && data.options
        ? data.options.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined;
      return createField(portalId, rtId, {
        label: data.label,
        field_type: data.field_type,
        required: data.required,
        order: data.order,
        ...(options ? { options } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields", portalId, rtId] });
      toast.success("Field added");
      reset();
    },
    onError: () => toast.error("Failed to add field"),
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldId: string) => deleteField(portalId, rtId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields", portalId, rtId] });
      toast.success("Field deleted");
    },
    onError: () => toast.error("Failed to delete field"),
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { field_type: "text", required: false, order: 0 },
  });

  const watchedType = watch("field_type");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/portals/${portalId}/request-types`)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Fields</h1>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Label</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-left font-medium">Required</th>
              <th className="px-4 py-2 text-left font-medium">Order</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="px-4 py-2">{f.label}</td>
                <td className="px-4 py-2"><Badge variant="outline">{f.field_type}</Badge></td>
                <td className="px-4 py-2">{f.required ? "Yes" : "No"}</td>
                <td className="px-4 py-2">{f.order}</td>
                <td className="px-4 py-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Delete field?")) deleteMutation.mutate(f.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No fields yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border rounded-md p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Field</h2>
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Label</Label>
            <Input {...register("label")} />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              defaultValue="text"
              onValueChange={(v) => { setValue("field_type", v as FieldType); setFieldType(v as FieldType); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Order</Label>
            <Input type="number" {...register("order")} />
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input type="checkbox" id="required" {...register("required")} className="h-4 w-4" />
            <Label htmlFor="required">Required</Label>
          </div>
          {watchedType === "select" && (
            <div className="col-span-2 space-y-1">
              <Label>Options (comma-separated)</Label>
              <Input {...register("options")} placeholder="Option 1, Option 2, Option 3" />
            </div>
          )}
          <div className="col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add Field"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
