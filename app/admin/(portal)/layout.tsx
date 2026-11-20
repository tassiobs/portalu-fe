import { AdminGuard } from "@/components/admin/admin-guard";
import { PortalSidebar } from "@/components/admin/portal-sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen">
        <PortalSidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
