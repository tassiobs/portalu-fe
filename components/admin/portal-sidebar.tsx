"use client";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Inbox, FileText, Users, ArrowLeft, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { clearAdminTokens, getAdminOrgSlug } from "@/lib/api/client";
import { listPortals } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";

export function PortalSidebar() {
  const { portalId } = useParams<{ portalId: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const { data: portals = [] } = useQuery({ queryKey: ["portals"], queryFn: listPortals });
  const portal = portals.find((p) => p.id === portalId);
  const orgSlug = getAdminOrgSlug();

  const nav = [
    { href: `/admin/portals/${portalId}`, icon: LayoutDashboard, label: "Dashboard", exact: true },
    { href: `/admin/portals/${portalId}/requests`, icon: Inbox, label: "Requests" },
    { href: `/admin/portals/${portalId}/request-types`, icon: FileText, label: "Request Types" },
    { href: `/admin/portals/${portalId}/users`, icon: Users, label: "Users & Roles" },
  ];

  function handleSignOut() {
    clearAdminTokens();
    router.push("/admin/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4 gap-2">
        <Link href="/admin/portals" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Portal</p>
          <p className="text-sm font-semibold truncate">{portal?.name ?? "…"}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        {orgSlug && portal && (
          <a
            href={`/portal/${orgSlug}/${portal.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent mt-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open client portal
          </a>
        )}
      </nav>
      <div className="p-3 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
          <ArrowLeft className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
