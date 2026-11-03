"use client";

import { ClipboardList, Receipt, UserPlus, Users } from "lucide-react";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import type { DashboardStats } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";

export default function VendorDashboardPage() {
  return (
    <DashboardShell allowedRoles={["VENDOR"]}>
      {(stats: DashboardStats) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Mitra OS"
            value={stats.totalMitra || 0}
            icon={<Users size={24} />}
          />
          <StatCard
            title="Total Klaim"
            value={stats.totalKlaim || 0}
            icon={<ClipboardList size={24} />}
          />
          <StatCard
            title="Total Invoice"
            value={stats.totalInvoice || 0}
            icon={<Receipt size={24} />}
          />
          <StatCard
            title="Pending Akun"
            value={stats.pendingAccountReqs || 0}
            icon={<UserPlus size={24} />}
          />
        </div>
      )}
    </DashboardShell>
  );
}
