"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const result = await signIn("google", {
      callbackUrl: "/dashboard", // Where to go after success
      redirect: true,
    });

    if (result?.error) {
      setIsLoading(false);
      // Handle error (e.g., toast notification)
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md border border-border bg-card p-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">QueryGen</h1>
          <p className="mt-2 text-muted-foreground">
            AI-Powered MySQL Query Generator
          </p>
        </div>

        {/* Sign in section */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full border border-border bg-card px-4 py-3 font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Sign in to access QueryGen and start generating SQL queries
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
