"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const useAuth = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    // If the user is definitely not logged in, kick them to login
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  return {
    session,
    user: session?.user,
    isLoading,
    isAuthenticated,
  };
};
