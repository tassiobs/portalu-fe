import { AdminGuard } from "@/components/admin/admin-guard";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-muted/30">{children}</div>
    </AdminGuard>
  );
}
