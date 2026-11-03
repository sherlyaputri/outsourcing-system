"use client";

import DashboardShell from "@/components/dashboard/dashboard-shell";
import type { DashboardStats } from "@/components/dashboard/dashboard-shell";
import ApprovalStats from "@/components/dashboard/approval-stats";

export default function COODashboardPage() {
  return (
    <DashboardShell allowedRoles={["COO"]}>
      {(stats: DashboardStats) => <ApprovalStats stats={stats} />}
    </DashboardShell>
  );
}
