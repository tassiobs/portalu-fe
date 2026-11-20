"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { citizenVerifyEmail } from "@/lib/api/citizen";

function VerifyEmailContent() {
  const { orgSlug, portalSlug } = useParams<{ orgSlug: string; portalSlug: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("No verification token found in the URL.");
      setStatus("error");
      return;
    }
    citizenVerifyEmail(orgSlug, portalSlug, token)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push(`/portal/${orgSlug}/${portalSlug}/auth/sign-in`), 2000);
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Verification failed.";
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [token, orgSlug, portalSlug, router]);

  return (
    <div className="max-w-sm mx-auto">
      <Card className="text-center">
        {status === "verifying" && (
          <CardHeader>
            <CardTitle>Verifying your email…</CardTitle>
            <CardDescription>Please wait a moment.</CardDescription>
          </CardHeader>
        )}
        {status === "success" && (
          <CardHeader>
            <CardTitle>Email verified</CardTitle>
            <CardDescription>Redirecting you to sign in…</CardDescription>
          </CardHeader>
        )}
        {status === "error" && (
          <CardHeader>
            <CardTitle>Verification failed</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
        )}
      </Card>
    </div>
  );
}

export default function CitizenVerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
