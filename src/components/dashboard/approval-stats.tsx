import { Clock, CheckCircle, XCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { DashboardStats } from "./dashboard-shell";

export default function ApprovalStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Menunggu Approval"
        value={stats.pendingApprovals || 0}
        icon={<Clock size={24} />}
        className={stats.pendingApprovals ? "border-yellow-200" : ""}
      />
      <StatCard
        title="Disetujui"
        value={stats.approvedTotal || 0}
        icon={<CheckCircle size={24} />}
      />
      <StatCard
        title="Ditolak"
        value={stats.rejectedTotal || 0}
        icon={<XCircle size={24} />}
      />
    </div>
  );
}
