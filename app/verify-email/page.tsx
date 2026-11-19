"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { verifyEmail, resendVerification } from "@/lib/api/admin";

const resendSchema = z.object({ email: z.string().email("Enter a valid email") });
type ResendForm = z.infer<typeof resendSchema>;

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "resend">(
    token ? "verifying" : "resend"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResendForm>({
    resolver: zodResolver(resendSchema),
    defaultValues: { email: params.get("email") ?? "" },
  });

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/admin/login"), 2000);
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Verification failed.";
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [token, router]);

  async function onResend(data: ResendForm) {
    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email`;
      await resendVerification(data.email, redirectUrl);
      toast.success("Verification email sent — check your inbox.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Could not resend email.";
      toast.error(msg);
    }
  }

  if (status === "verifying") {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Verifying your email…</CardTitle>
          <CardDescription>Please wait a moment.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Email verified</CardTitle>
          <CardDescription>Redirecting you to sign in…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        {status === "error" ? (
          <>
            <CardTitle>Verification failed</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </>
        ) : (
          <>
            <CardTitle>Resend verification email</CardTitle>
            <CardDescription>Enter your email and we&apos;ll send a new link.</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onResend)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Resend verification email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
