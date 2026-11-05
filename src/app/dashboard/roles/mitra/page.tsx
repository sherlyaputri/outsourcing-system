"use client";

import { Camera, CheckCircle, Clock } from "lucide-react";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import type { DashboardStats } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";

export default function MitraDashboardPage() {
  return (
    <DashboardShell allowedRoles={["MITRA"]}>
      {(stats: DashboardStats) => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Absensi"
              value={stats.totalAbsensi || 0}
              icon={<Camera size={24} />}
              href="/dashboard/riwayat-absensi"
            />
            <StatCard
              title="Status Hari Ini"
              value={stats.sudahAbsenHariIni ? "Sudah Absen" : "Belum Absen"}
              icon={<CheckCircle size={24} />}
              className={
                stats.sudahAbsenHariIni
                  ? "border-green-200"
                  : "border-yellow-200"
              }
              href="/dashboard/absensi"
            />
            <StatCard
              title="Jam Check-In"
              value={
                stats.absensiHariIni?.checkIn
                  ? new Date(stats.absensiHariIni.checkIn).toLocaleTimeString(
                      "id-ID",
                      { hour: "2-digit", minute: "2-digit" }
                    )
                  : "-"
              }
              icon={<Clock size={24} />}
              href="/dashboard/absensi"
            />
          </div>
          {!stats.sudahAbsenHariIni && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="flex items-center gap-4 p-6">
                <Camera size={32} className="text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">
                    Anda belum absen hari ini
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Silakan lakukan absensi melalui menu Absensi.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
