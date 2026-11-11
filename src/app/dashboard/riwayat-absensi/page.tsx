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
  user?: { id?: string; name: string; mitraProfile?: { waktuKerja?: string | null; idMitraOs?: string | null; status?: string | null; posisi?: string | null; penempatan?: string | null } | null };
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

function AttendanceMatrix({ records, month, filter, sort, onSort, onPhoto }: {
  records: AttendanceRecord[];
  month: string;
  filter: string;
  sort: { column: string; direction: "asc" | "desc" } | null;
  onSort: (column: string) => void;
  onPhoto: (photo: { src: string; title: string }) => void;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const grouped = new Map<string, { name: string; idMitraOs: string; status: string; role: string; office: string; days: Map<number, AttendanceRecord>; all: AttendanceRecord[] }>();
  for (const record of records) {
    const key = record.user?.id || record.user?.name || record.id;
    const profile = record.user?.mitraProfile;
    if (!grouped.has(key)) grouped.set(key, {
      name: record.user?.name || "-", idMitraOs: profile?.idMitraOs || "-",
      status: profile?.status === "ACTIVE" ? "Aktif" : profile?.status || "-",
      role: profile?.posisi || "-",
      office: profile?.penempatan?.toLocaleLowerCase("id-ID") === "kantor1" ? "Kantor1 (Rempoa)" : profile?.penempatan || "-",
      days: new Map(), all: [],
    });
    const row = grouped.get(key)!;
    row.days.set(new Date(record.date).getDate(), record);
    row.all.push(record);
  }
  let rows = Array.from(grouped.values());
  if (sort) {
    rows.sort((a, b) => {
      const value = (row: typeof rows[number]) => {
        if (sort.column === "total") return Array.from(row.days.values()).filter((item) => item.type === "HADIR").length;
        return ({ name: row.name, id: row.idMitraOs, status: row.status, role: row.role, office: row.office } as Record<string, string>)[sort.column]
          || (sort.column === "checkIn" ? row.all.find((item: AttendanceRecord) => item.checkIn)?.checkIn || "" : sort.column === "checkOut" ? [...row.all].reverse().find((item: AttendanceRecord) => item.checkOut)?.checkOut || "" : "");
      };
      const first = value(a); const second = value(b);
      const compared = typeof first === "number" && typeof second === "number" ? first - second : String(first).localeCompare(String(second), "id", { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? compared : -compared;
    });
  }
  const headers: [string, string][] = [["name", "Nama"], ["id", "ID Mitra"], ["status", "Status"], ["role", "Peran"], ["office", "Kode Kantor"], ["checkIn", "Jam Masuk"], ["checkOut", "Jam Keluar"], ["photo", "Foto"]];
  return <Table><TableHeader><TableRow>
    {headers.map(([key, label]) => <TableHead key={key}><button type="button" className="text-left" onClick={() => onSort(key)}>{label} {sort?.column === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</button></TableHead>)}
    {Array.from({ length: dayCount }, (_, index) => <TableHead key={index + 1} className="min-w-9 text-center">{index + 1}</TableHead>)}
    <TableHead><button type="button" onClick={() => onSort("total")}>Total Hadir {sort?.column === "total" ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</button></TableHead>
  </TableRow></TableHeader><TableBody>
    {rows.map((row) => {
      const query = filter.trim().toLocaleLowerCase("id-ID");
      if (query && ![row.name, row.idMitraOs, row.status, row.role, row.office].some((value) => value.toLocaleLowerCase("id-ID").includes(query))) return null;
      const latest = [...row.all].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const total = Array.from(row.days.values()).filter((item) => item.type === "HADIR").length;
      return <TableRow key={row.idMitraOs + row.name}>
        <TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.idMitraOs}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.role}</TableCell><TableCell>{row.office}</TableCell>
        <TableCell>{latest?.checkIn ? new Date(latest.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
        <TableCell>{latest?.checkOut ? new Date(latest.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
        <TableCell><div className="flex gap-1">{latest?.fotoCheckIn && <button type="button" onClick={() => onPhoto({ src: latest.fotoCheckIn!, title: `Foto masuk ${row.name}` })}><img className="h-10 w-10 rounded border object-cover" src={latest.fotoCheckIn} alt="Foto masuk" /></button>}{latest?.fotoCheckOut && <button type="button" onClick={() => onPhoto({ src: latest.fotoCheckOut!, title: `Foto keluar ${row.name}` })}><img className="h-10 w-10 rounded border object-cover" src={latest.fotoCheckOut} alt="Foto keluar" /></button>}</div></TableCell>
        {Array.from({ length: dayCount }, (_, index) => {
          const attendance = row.days.get(index + 1);
          const shiftStart = attendance?.checkIn ? getShiftStartAt(new Date(attendance.checkIn), attendance.user?.mitraProfile?.waktuKerja) : null;
          const late = attendance?.type === "HADIR" && Boolean(shiftStart && new Date(attendance!.checkIn!) > shiftStart);
          const value = !attendance ? "-" : attendance.type === "HADIR" ? late ? "HT" : "H" : attendance.type;
          return <TableCell key={index + 1} className={`text-center ${late ? "font-semibold text-amber-700" : ""}`}>{value}</TableCell>;
        })}
        <TableCell className="text-center font-semibold">{total}</TableCell>
      </TableRow>;
    })}
  </TableBody></Table>;
}

export default function RiwayatAbsensiPage() {
  const { data: session } = useSession();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; title: string } | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
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

  const columns = [
    ...(session?.user.role !== "MITRA" ? [{ key: "name", label: "Nama" }] : []),
    { key: "date", label: "Tanggal" },
    { key: "checkIn", label: "Check-In" },
    { key: "checkOut", label: "Check-Out" },
    { key: "location", label: "Lokasi GPS" },
    { key: "photo", label: "Foto" },
    { key: "status", label: "Status" },
    { key: "note", label: "Catatan" },
  ];
  const filteredAttendances = attendances.filter((attendance) => {
    const query = filter.trim().toLocaleLowerCase("id-ID");
    return !query || [attendance.user?.name, attendance.type, attendance.note, attendance.date]
      .some((value) => String(value || "").toLocaleLowerCase("id-ID").includes(query));
  });
  const sortedAttendances = sort
    ? [...filteredAttendances].sort((left, right) => {
        const getValue = (attendance: AttendanceRecord): string | number => {
          switch (sort.column) {
            case "name": return attendance.user?.name || "";
            case "date": return new Date(attendance.date).getTime();
            case "checkIn": return attendance.checkIn ? new Date(attendance.checkIn).getTime() : "";
            case "checkOut": return attendance.checkOut ? new Date(attendance.checkOut).getTime() : "";
            case "location": return `${attendance.latitude ?? ""} ${attendance.longitude ?? ""}`;
            case "photo": return Number(Boolean(attendance.fotoCheckIn || attendance.fotoCheckOut));
            case "status": {
              const start = attendance.checkIn
                ? getShiftStartAt(new Date(attendance.checkIn), attendance.user?.mitraProfile?.waktuKerja)
                : null;
              return attendance.type === "HADIR" && start && new Date(attendance.checkIn!) > start
                ? "Hadir (telat)"
                : attendance.type;
            }
            default: return attendance.note || "";
          }
        };
        const leftValue = getValue(left);
        const rightValue = getValue(right);
        const comparison = typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "id", { numeric: true, sensitivity: "base" });
        return sort.direction === "asc" ? comparison : -comparison;
      })
    : filteredAttendances;

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
            <Input aria-label="Filter riwayat absensi" placeholder="Cari nama/status/catatan" value={filter} onChange={(event) => setFilter(event.target.value)} className="w-56" />
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
            ) : session?.user.role !== "MITRA" ? (
                <AttendanceMatrix
                  records={attendances}
                  month={month}
                  filter={filter}
                  sort={sort}
                  onSort={(column) => setSort((current) => ({
                    column,
                    direction: current?.column === column && current.direction === "asc" ? "desc" : "asc",
                  }))}
                  onPhoto={setSelectedPhoto}
                />
              ) : <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(({ key, label }) => (
                      <TableHead key={key} aria-sort={
                        sort?.column === key
                          ? sort.direction === "asc" ? "ascending" : "descending"
                          : "none"
                      }>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => setSort((current) => ({
                            column: key,
                            direction: current?.column === key && current.direction === "asc" ? "desc" : "asc",
                          }))}
                        >
                          {label}
                          <span className="text-xs text-muted-foreground">
                            {sort?.column === key ? (sort.direction === "asc" ? "A-Z" : "Z-A") : "↕"}
                          </span>
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAttendances.map((att) => (
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
              </Table>}
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
