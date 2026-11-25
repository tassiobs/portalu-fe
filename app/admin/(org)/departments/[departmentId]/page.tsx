"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Search } from "lucide-react";
import {
  getDepartment, addDepartmentMember, removeDepartmentMember,
  listUsers, getMe, getUserRoles,
} from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function DepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: dept, isLoading } = useQuery({
    queryKey: ["org-department", departmentId],
    queryFn: () => getDepartment(departmentId),
  });

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["my-roles", me?.id],
    queryFn: () => getUserRoles(me!.id),
    enabled: !!me?.id,
  });
  const canManage = myRoles.some((r) => r.permissions?.includes("org.departments.manage"));

  const { data: usersData } = useQuery({
    queryKey: ["org-users-all"],
    queryFn: () => listUsers(1, 100),
    enabled: canManage,
  });

  const memberIds = useMemo(
    () => new Set((dept?.members ?? []).map((m) => m.user.id)),
    [dept?.members]
  );

  const availableUsers = useMemo(() => {
    const all = usersData?.data ?? [];
    const q = search.toLowerCase();
    return all
      .filter((u) => !memberIds.has(u.id) && u.status === "active")
      .filter((u) =>
        !q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
  }, [usersData, memberIds, search]);

  const { mutate: addMember, isPending: adding } = useMutation({
    mutationFn: (userId: string) => addDepartmentMember(departmentId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-department", departmentId] });
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      setPopoverOpen(false);
      setSearch("");
      toast.success("Member added");
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? "User is already a member" : "Failed to add member");
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (userId: string) => removeDepartmentMember(departmentId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-department", departmentId] });
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm px-6 py-10">Loading…</p>;
  if (!dept) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/departments")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{dept.name}</h1>
          {dept.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{dept.description}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            Members <span className="text-muted-foreground font-normal">({dept.member_count})</span>
          </CardTitle>
          {canManage && (
            <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) setSearch(""); }}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">Add Member</Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="flex items-center border-b px-3">
                  <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 h-10 px-0"
                    placeholder="Search users…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-4 text-center">No users found</p>
                  )}
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      disabled={adding}
                      onClick={() => addMember(u.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <p className="font-medium">{u.name ?? u.email}</p>
                      {u.name && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          {dept.members.length === 0 && (
            <p className="text-sm text-muted-foreground px-6 py-4">No members yet.</p>
          )}
          {dept.members.map((m) => (
            <div key={m.user.id} className="flex items-center justify-between gap-2 px-6 py-2">
              <div>
                <p className="text-sm font-medium">{m.user.name ?? m.user.email}</p>
                {m.user.name && <p className="text-xs text-muted-foreground">{m.user.email}</p>}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeMember(m.user.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
