"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle, Clock } from "lucide-react";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import type { DashboardStats } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { getEligibleCheckoutAt } from "@/lib/attendance-shift";

export default function MitraDashboardPage() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

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
          {stats.absensiHariIni?.checkIn && !stats.absensiHariIni.checkOut && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="space-y-2 p-6">
                <h3 className="font-semibold text-blue-900">Status Check-Out</h3>
                {!stats.waktuKerja ? (
                  <p className="text-sm text-amber-800">
                    Jadwal shift belum tersedia. Silakan hubungi vendor atau administrator.
                  </p>
                ) : (
                  (() => {
                    const checkOutAt = getEligibleCheckoutAt(
                      new Date(stats.absensiHariIni.checkIn!),
                      stats.waktuKerja,
                    );
                    if (!checkOutAt) {
                      return <p className="text-sm text-amber-800">Jadwal shift belum tersedia.</p>;
                    }
                    if (now < checkOutAt) {
                      return (
                        <p className="text-sm text-blue-800">
                          Check-out belum dapat dilakukan. Shift berakhir pukul {new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(checkOutAt)} WIB.
                        </p>
                      );
                    }
                    const lateMinutes = Math.floor((now.getTime() - checkOutAt.getTime()) / 60_000);
                    return lateMinutes > 0 ? (
                      <p className="text-sm text-orange-800">
                        Anda terlambat check-out selama {Math.floor(lateMinutes / 60) ? `${Math.floor(lateMinutes / 60)} jam ` : ""}{lateMinutes % 60} menit. Silakan segera check-out.
                      </p>
                    ) : (
                      <p className="text-sm text-green-800">Anda sudah dapat check-out sesuai jadwal shift.</p>
                    );
                  })()
                )}
                <a className="inline-block text-sm font-medium text-blue-700 underline" href="/dashboard/absensi">
                  Buka menu Absensi
                </a>
              </CardContent>
            </Card>
          )}
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
