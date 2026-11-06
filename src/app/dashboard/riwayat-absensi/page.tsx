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
import { getShiftStartAt } from "@/lib/attendance-shift";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  type: string;
  note?: string | null;
  fotoCheckIn?: string | null;
  fotoCheckOut?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  latitudeCheckOut?: number | null;
  longitudeCheckOut?: number | null;
  user?: { name: string; mitraProfile?: { waktuKerja?: string | null } | null };
}

function LocationLink({ latitude, longitude, label }: {
  latitude?: number | null;
  longitude?: number | null;
  label: string;
}) {
  if (latitude == null || longitude == null) {
    return <span className="text-muted-foreground">{label}: belum tersedia</span>;
  }
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  return (
    <a className="text-primary underline" href={mapUrl} target="_blank" rel="noreferrer">
      {label}: {latitude.toFixed(6)}, {longitude.toFixed(6)}
    </a>
  );
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
                    <TableHead>Lokasi GPS</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((att) => (
                    (() => {
                      const shift = att.user?.mitraProfile?.waktuKerja;
                      const scheduledStart = att.checkIn
                        ? getShiftStartAt(new Date(att.checkIn), shift)
                        : null;
                      const isLate = att.type === "HADIR" &&
                        Boolean(scheduledStart && new Date(att.checkIn!) > scheduledStart);
                      return <TableRow key={att.id}>
                      {session?.user.role !== "MITRA" && (
                        <TableCell className="font-medium">{att.user?.name || "-"}</TableCell>
                      )}
                      <TableCell>
                        {new Date(att.date).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {att.checkIn ? (
                          <div className="flex flex-col items-start gap-1">
                            <span>{new Date(att.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                            {scheduledStart && (
                              <span className={`text-xs font-medium ${isLate ? "text-red-600" : "text-green-600"}`}>
                                {isLate ? "Telat" : "Tepat waktu"}
                              </span>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {att.checkOut
                          ? new Date(att.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-48 flex-col gap-1 text-xs">
                          <LocationLink latitude={att.latitude} longitude={att.longitude} label="Check-in" />
                          {att.checkOut && (
                            <LocationLink
                              latitude={att.latitudeCheckOut}
                              longitude={att.longitudeCheckOut}
                              label="Check-out"
                            />
                          )}
                        </div>
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
                      <TableCell>
                        {isLate ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            Hadir (telat)
                          </span>
                        ) : (
                          <StatusBadge status={att.type} />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{att.note || "-"}</TableCell>
                    </TableRow>;
                    })()
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
