"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History } from "lucide-react";

export default function RiwayatAbsensiPage() {
  const { data: session } = useSession();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance?month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        setAttendances(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [month]);

  return (
    <DashboardLayout allowedRoles={["MITRA", "VENDOR", "VM"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Riwayat Absensi</h1>
            <p className="text-muted-foreground">
              {session?.user.role === "MITRA"
                ? "Riwayat absensi Anda"
                : "Data absensi mitra OS"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label>Bulan:</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
            ) : attendances.length === 0 ? (
              <EmptyState
                title="Belum ada data absensi"
                description="Data absensi untuk bulan ini belum tersedia."
                icon={<History size={32} className="text-muted-foreground" />}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {session?.user.role !== "MITRA" && <TableHead>Nama</TableHead>}
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((att) => (
                    <TableRow key={att.id}>
                      {session?.user.role !== "MITRA" && (
                        <TableCell className="font-medium">{att.user?.name || "-"}</TableCell>
                      )}
                      <TableCell>
                        {new Date(att.date).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {att.checkIn
                          ? new Date(att.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {att.checkOut
                          ? new Date(att.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </TableCell>
                      <TableCell><StatusBadge status={att.type} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{att.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
