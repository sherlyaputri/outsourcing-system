"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";

export interface DashboardStats {
  totalAbsensi?: number;
  sudahAbsenHariIni?: boolean;
  absensiHariIni?: { checkIn?: string | null } | null;
  totalMitra?: number;
  totalKlaim?: number;
  totalInvoice?: number;
  pendingAccountReqs?: number;
  totalVendor?: number;
  pendingApprovals?: number;
  pendingRequests?: number;
  myRequests?: number;
  approvedRequests?: number;
  approvedTotal?: number;
  rejectedTotal?: number;
}

interface DashboardShellProps {
  allowedRoles: string[];
  children: (stats: DashboardStats) => React.ReactNode;
}

export default function DashboardShell({
  allowedRoles,
  children,
}: DashboardShellProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Dashboard API returned ${response.status}`);
        }
        return response.json();
      })
      .then((data: DashboardStats) => setStats(data))
      .catch((fetchError: unknown) => {
        console.error("Dashboard stats error:", fetchError);
        setError("Data dashboard gagal dimuat. Silakan muat ulang halaman.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout allowedRoles={allowedRoles}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang, {session?.user.name}!
          </p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className="animate-pulse">
                <CardContent className="h-28 rounded-lg bg-muted p-6" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          children(stats)
        )}
      </div>
    </DashboardLayout>
  );
}
