"use client";

import DashboardShell from "@/components/dashboard/dashboard-shell";
import { Receipt } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export default function FinanceDashboardPage() {
  return <DashboardShell allowedRoles={["FINANCE"]}>
    {(stats) => <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <StatCard title="Invoice" value={stats.totalInvoice || 0} icon={<Receipt size={24} />} href="/dashboard/invoice" />
      <StatCard title="Klaim" value={stats.totalKlaim || 0} icon={<Receipt size={24} />} href="/dashboard/invoice" />
    </div>}
  </DashboardShell>;
}
