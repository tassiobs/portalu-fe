"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { clearCitizenTokens } from "@/lib/api/client";
import { getCitizenToken } from "@/lib/api/citizen-token";
import { Button } from "@/components/ui/button";

export function CitizenNav() {
  const params = useParams<{ orgSlug: string; portalSlug: string }>();
  const router = useRouter();
  const orgSlug = params?.orgSlug ?? "";
  const portalSlug = params?.portalSlug ?? "";
  const base = `/portal/${orgSlug}/${portalSlug}`;
  const isAuth = typeof window !== "undefined" && !!getCitizenToken(orgSlug, portalSlug);

  function handleSignOut() {
    clearCitizenTokens(orgSlug, portalSlug);
    router.push(base);
  }

  return (
    <header className="border-b bg-card">
      <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
        <Link href={base} className="font-semibold text-lg">Portalu</Link>
        <nav className="flex items-center gap-3">
          {isAuth ? (
            <>
              <Link href={`${base}/my-requests`} className="text-sm text-muted-foreground hover:text-foreground">
                My Requests
              </Link>
              <Button size="sm" variant="ghost" onClick={handleSignOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Link href={`${base}/auth/sign-in`} className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              <Button size="sm" asChild>
                <Link href={`${base}/auth/sign-up`}>Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
