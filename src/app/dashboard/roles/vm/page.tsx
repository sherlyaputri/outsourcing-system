"use client";

import {
  Building2,
  CheckCircle,
  ClipboardList,
  FileText,
  Receipt,
  Users,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import type { DashboardStats } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";

export default function VMDashboardPage() {
  return (
    <DashboardShell allowedRoles={["VM"]}>
      {(stats: DashboardStats) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Vendor Aktif"
            value={stats.totalVendor || 0}
            icon={<Building2 size={24} />}
          />
          <StatCard
            title="Mitra OS Aktif"
            value={stats.totalMitra || 0}
            icon={<Users size={24} />}
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingApprovals || 0}
            icon={<CheckCircle size={24} />}
          />
          <StatCard
            title="Request OS"
            value={stats.pendingRequests || 0}
            icon={<FileText size={24} />}
          />
          <StatCard
            title="Klaim Pending"
            value={stats.totalKlaim || 0}
            icon={<ClipboardList size={24} />}
          />
          <StatCard
            title="Invoice Pending"
            value={stats.totalInvoice || 0}
            icon={<Receipt size={24} />}
          />
        </div>
      )}
    </DashboardShell>
  );
}
