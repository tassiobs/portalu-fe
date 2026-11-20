"use client";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function CheckEmailContent() {
  const { orgSlug, portalSlug } = useParams<{ orgSlug: string; portalSlug: string }>();
  const params = useSearchParams();
  const email = params.get("email");

  return (
    <div className="max-w-sm mx-auto">
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to{" "}
            {email ? <span className="font-medium text-foreground">{email}</span> : "your email address"}.
            Click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Once verified,{" "}
            <Link
              href={`/portal/${orgSlug}/${portalSlug}/auth/sign-in`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              sign in here
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CitizenCheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
