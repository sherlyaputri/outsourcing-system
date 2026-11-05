"use client";

import { CheckCircle, Clock, FileText } from "lucide-react";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import type { DashboardStats } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";

export default function SMDashboardPage() {
  return (
    <DashboardShell allowedRoles={["SM"]}>
      {(stats: DashboardStats) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Request"
            value={stats.myRequests || 0}
            icon={<FileText size={24} />}
            href="/dashboard/request-os"
          />
          <StatCard
            title="Request Pending"
            value={stats.pendingRequests || 0}
            icon={<Clock size={24} />}
            href="/dashboard/request-os"
          />
          <StatCard
            title="Request Selesai"
            value={stats.approvedRequests || 0}
            icon={<CheckCircle size={24} />}
            href="/dashboard/request-os"
          />
        </div>
      )}
    </DashboardShell>
  );
}
