"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { listRequestTypes, createRequestType, deleteRequestType } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RequestTypesPage() {
  const { portalId } = useParams<{ portalId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["request-types", portalId],
    queryFn: () => listRequestTypes(portalId),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => createRequestType(portalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request-types", portalId] });
      setOpen(false);
      toast.success("Request type created");
      reset();
    },
    onError: () => toast.error("Failed to create request type"),
  });

  const deleteMutation = useMutation({
    mutationFn: (rtId: string) => deleteRequestType(portalId, rtId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request-types", portalId] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/portals")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Request Types</h1>
        <div className="ml-auto">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Type
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((rt) => (
          <Card key={rt.id}>
            <CardHeader>
              <CardTitle className="text-base">{rt.name}</CardTitle>
              {rt.description && <CardDescription>{rt.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/admin/portals/${portalId}/request-types/${rt.id}/fields`)}
              >
                Edit Fields
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/admin/portals/${portalId}/requests`)}
              >
                View Requests
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete "${rt.name}"?`)) deleteMutation.mutate(rt.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Request Type</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
