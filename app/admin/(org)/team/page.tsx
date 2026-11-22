"use client";
import { useQuery } from "@tanstack/react-query";
import { listUsers } from "@/lib/api/admin";

export default function TeamPage() {
  const { data, isLoading } = useQuery({ queryKey: ["org-users"], queryFn: () => listUsers() });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Team</h1>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {data && (
        <div className="space-y-2">
          {data.data.map((user) => (
            <div key={user.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name ?? user.email}</p>
                {user.name && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
              </div>
              <span className="ml-auto text-xs text-muted-foreground capitalize">{user.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
