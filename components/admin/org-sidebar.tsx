"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe, Users, Shield, Mail, Settings, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { clearAdminTokens } from "@/lib/api/client";
import { getMe, getUserRoles, signOut } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin/portals", icon: Globe, label: "Portals", gated: false },
  { href: "/admin/team", icon: Users, label: "Team", gated: true },
  { href: "/admin/roles", icon: Shield, label: "Roles", gated: true },
  { href: "/admin/invitations", icon: Mail, label: "Invitations", gated: true },
  { href: "/admin/settings", icon: Settings, label: "Settings", gated: false },
];

export function OrgSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["my-roles", me?.id],
    queryFn: () => getUserRoles(me!.id),
    enabled: !!me?.id,
  });

  const canManageUsers = myRoles.some((r) => r.permissions?.includes("org.users.manage"));

  const visibleNav = NAV_ITEMS.filter((item) => !item.gated || canManageUsers);

  async function handleSignOut() {
    const refreshToken = localStorage.getItem("portalu_admin_refresh_token");
    if (refreshToken) {
      try {
        await signOut(refreshToken);
      } catch {
        // proceed with local cleanup regardless
      }
    }
    clearAdminTokens();
    router.push("/admin/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold text-lg">Portalu</span>
        <span className="ml-1 text-xs text-muted-foreground">Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {visibleNav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
              pathname.startsWith(href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t space-y-1">
        {me && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{me.name ?? me.email}</p>
            {me.name && (
              <p className="text-xs text-muted-foreground truncate">{me.email}</p>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
