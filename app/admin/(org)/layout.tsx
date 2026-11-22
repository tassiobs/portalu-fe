import { AdminGuard } from "@/components/admin/admin-guard";
import { OrgSidebar } from "@/components/admin/org-sidebar";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen">
        <OrgSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AdminGuard>
  );
}
