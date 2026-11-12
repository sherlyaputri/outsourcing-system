"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";

const dashboardPaths: Record<string, string> = {
  MITRA: "/dashboard/roles/mitra",
  VENDOR: "/dashboard/roles/vendor",
  VM: "/dashboard/roles/vm",
  SM: "/dashboard/roles/sm",
  GM: "/dashboard/roles/gm",
  COO: "/dashboard/roles/coo",
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const dashboardPath = session ? dashboardPaths[session.user.role] : undefined;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (dashboardPath) {
      router.replace(dashboardPath)
    }
  }, [dashboardPath, router, status]);

  if (status === "authenticated" && !dashboardPath) {
    return (
      <DashboardLayout>
        <p>Role akun ini belum memiliki dashboard.</p>
      </DashboardLayout>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}
