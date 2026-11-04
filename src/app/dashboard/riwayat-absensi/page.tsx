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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  type: string;
  note?: string | null;
  fotoCheckIn?: string | null;
  fotoCheckOut?: string | null;
  user?: { name: string };
}

export default function RiwayatAbsensiPage() {
  const { data: session } = useSession();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; title: string } | null>(null);
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
                    <TableHead>Foto</TableHead>
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
                      <TableCell>
                        <div className="flex gap-2">
                          {att.fotoCheckIn && (
                            <button type="button" onClick={() => setSelectedPhoto({ src: att.fotoCheckIn!, title: "Foto check-in" })} aria-label="Lihat foto check-in">
                              <img className="h-12 w-12 rounded border object-cover" src={att.fotoCheckIn} alt="Foto check-in" />
                            </button>
                          )}
                          {att.fotoCheckOut && (
                            <button type="button" onClick={() => setSelectedPhoto({ src: att.fotoCheckOut!, title: "Foto check-out" })} aria-label="Lihat foto check-out">
                              <img className="h-12 w-12 rounded border object-cover" src={att.fotoCheckOut} alt="Foto check-out" />
                            </button>
                          )}
                          {!att.fotoCheckIn && !att.fotoCheckOut && "-"}
                        </div>
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
      <Dialog
        open={Boolean(selectedPhoto)}
        onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }}
      >
        <DialogHeader>
          <DialogTitle>{selectedPhoto?.title || "Foto absensi"}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {selectedPhoto && (
            <img className="mx-auto max-h-[70vh] max-w-full rounded object-contain" src={selectedPhoto.src} alt={selectedPhoto.title} />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
