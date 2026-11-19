"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resendVerification } from "@/lib/api/admin";

function CheckEmailContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const devToken = params.get("token");
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email`;
      await resendVerification(email, redirectUrl);
      toast.success("Verification email sent — check your inbox.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Could not resend email.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a verification link to{" "}
            {email ? <span className="font-medium text-foreground">{email}</span> : "your email address"}.
            Click the link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Didn&apos;t get it? Check your spam folder or resend below.</p>
          <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending || !email}>
            {resending ? "Sending…" : "Resend verification email"}
          </Button>
          {devToken && (
            <div className="rounded-md border border-dashed p-3 text-left space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dev shortcut</p>
              <p className="text-xs text-muted-foreground break-all">Token: {devToken}</p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/verify-email?token=${devToken}`}>Verify now</Link>
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/login" className="underline underline-offset-4 hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
