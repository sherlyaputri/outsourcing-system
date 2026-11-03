"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Building2, ClipboardList, Receipt, Camera, CheckCircle,
  FileText, Clock, XCircle, UserPlus
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!session) return null;

  const renderDashboard = () => {
    const role = session.user.role;

    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-28 bg-muted rounded-lg" />
            </Card>
          ))}
        </div>
      );
    }

    switch (role) {
      case "MITRA":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Total Absensi"
                value={stats.totalAbsensi || 0}
                icon={<Camera size={24} />}
              />
              <StatCard
                title="Status Hari Ini"
                value={stats.sudahAbsenHariIni ? "Sudah Absen" : "Belum Absen"}
                icon={<CheckCircle size={24} />}
                className={stats.sudahAbsenHariIni ? "border-green-200" : "border-yellow-200"}
              />
              <StatCard
                title="Jam Check-In"
                value={
                  stats.absensiHariIni?.checkIn
                    ? new Date(stats.absensiHariIni.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                    : "-"
                }
                icon={<Clock size={24} />}
              />
            </div>
            {!stats.sudahAbsenHariIni && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-6 flex items-center gap-4">
                  <Camera size={32} className="text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Anda belum absen hari ini</h3>
                    <p className="text-sm text-yellow-700">Silakan lakukan absensi melalui menu Absensi.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "VENDOR":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Mitra OS" value={stats.totalMitra || 0} icon={<Users size={24} />} />
            <StatCard title="Total Klaim" value={stats.totalKlaim || 0} icon={<ClipboardList size={24} />} />
            <StatCard title="Total Invoice" value={stats.totalInvoice || 0} icon={<Receipt size={24} />} />
            <StatCard title="Pending Akun" value={stats.pendingAccountReqs || 0} icon={<UserPlus size={24} />} />
          </div>
        );

      case "VM":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Vendor Aktif" value={stats.totalVendor || 0} icon={<Building2 size={24} />} />
            <StatCard title="Mitra OS Aktif" value={stats.totalMitra || 0} icon={<Users size={24} />} />
            <StatCard title="Pending Approval" value={stats.pendingApprovals || 0} icon={<CheckCircle size={24} />} />
            <StatCard title="Request OS" value={stats.pendingRequests || 0} icon={<FileText size={24} />} />
            <StatCard title="Klaim Pending" value={stats.totalKlaim || 0} icon={<ClipboardList size={24} />} />
            <StatCard title="Invoice Pending" value={stats.totalInvoice || 0} icon={<Receipt size={24} />} />
          </div>
        );

      case "SM":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Request" value={stats.myRequests || 0} icon={<FileText size={24} />} />
            <StatCard title="Request Pending" value={stats.pendingRequests || 0} icon={<Clock size={24} />} />
            <StatCard title="Request Selesai" value={stats.approvedRequests || 0} icon={<CheckCircle size={24} />} />
          </div>
        );

      case "GM":
      case "COO":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Menunggu Approval"
              value={stats.pendingApprovals || 0}
              icon={<Clock size={24} />}
              className={stats.pendingApprovals > 0 ? "border-yellow-200" : ""}
            />
            <StatCard title="Disetujui" value={stats.approvedTotal || 0} icon={<CheckCircle size={24} />} />
            <StatCard title="Ditolak" value={stats.rejectedTotal || 0} icon={<XCircle size={24} />} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang, {session.user.name}!
          </p>
        </div>
        {renderDashboard()}
      </div>
    </DashboardLayout>
  );
}
