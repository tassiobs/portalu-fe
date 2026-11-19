"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getPublicPortal, listPublicRequestTypes } from "@/lib/api/citizen";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CitizenLandingPage() {
  const { orgSlug, portalSlug } = useParams<{ orgSlug: string; portalSlug: string }>();
  const router = useRouter();

  const { data: portal } = useQuery({
    queryKey: ["public-portal", orgSlug, portalSlug],
    queryFn: () => getPublicPortal(orgSlug, portalSlug),
  });

  const { data: requestTypes = [], isLoading } = useQuery({
    queryKey: ["public-request-types", orgSlug, portalSlug],
    queryFn: () => listPublicRequestTypes(orgSlug, portalSlug),
  });

  const base = `/portal/${orgSlug}/${portalSlug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{portal?.name ?? "Portal"}</h1>
        {portal?.description && (
          <p className="mt-2 text-muted-foreground">{portal.description}</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Services</h2>
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {requestTypes.map((rt) => (
            <Card key={rt.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{rt.name}</CardTitle>
                {rt.description && <CardDescription>{rt.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push(`${base}/submit/${rt.id}`)}
                  className="w-full"
                >
                  Submit Request <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
