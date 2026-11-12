"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, History } from "lucide-react";
import { toast } from "sonner";
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

function formatLocalYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MAX_MATRIX_DAYS = 62;
const PAGE_SIZE = 25;

function buildAttendanceDateParams(startDate: string, endDate: string) {
  const params = new URLSearchParams();
  const hasStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const hasEnd = /^\d{4}-\d{2}-\d{2}$/.test(endDate);
  if (hasStart && hasEnd && startDate > endDate) {
    params.set("startDate", endDate);
    params.set("endDate", startDate);
  } else {
    if (hasStart) params.set("startDate", startDate);
    if (hasEnd) params.set("endDate", endDate);
  }
  return params;
}

function TablePagination({
  totalItems,
  currentPage,
  onPageChange,
}: {
  totalItems: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, totalItems);

  return (
    <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-muted-foreground">
        Menampilkan {startItem}–{endItem} dari {totalItems} baris
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Sebelumnya
        </Button>
        <span className="min-w-24 text-center text-xs text-muted-foreground">
          Halaman {safePage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Berikutnya
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getDateColumns(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return [];
  }
  const [fromYmd, toYmd] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
  const [sy, sm, sd] = fromYmd.split("-").map(Number);
  const [ey, em, ed] = toYmd.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const end = new Date(ey, em - 1, ed, 0, 0, 0, 0);
  const sameMonth = sy === ey && sm === em;
  const columns: { key: string; label: string }[] = [];

  while (cursor <= end && columns.length <= MAX_MATRIX_DAYS) {
    columns.push({
      key: formatLocalYmd(cursor),
      label: sameMonth
        ? String(cursor.getDate())
        : `${cursor.getDate()}/${cursor.getMonth() + 1}`,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return columns;
}

function AttendanceDetailTable({
  records,
  showName = true,
  alwaysShowPagination = false,
  sort = null,
  onSort,
  onPhoto,
}: {
  records: AttendanceRecord[];
  showName?: boolean;
  alwaysShowPagination?: boolean;
  sort?: { column: string; direction: "asc" | "desc" } | null;
  onSort?: (column: string) => void;
  onPhoto: (photo: { src: string; title: string }) => void;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [records]);

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRecords = records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns = [
    ...(showName ? [{ key: "name", label: "Nama" }] : []),
    { key: "date", label: "Tanggal" },
    { key: "checkIn", label: "Check-In" },
    { key: "checkOut", label: "Check-Out" },
    { key: "location", label: "Lokasi GPS" },
    { key: "photo", label: "Foto" },
    { key: "status", label: "Status" },
    { key: "note", label: "Catatan" },
  ];

  return (
    <div>
      <Table>
      <TableHeader>
        <TableRow>
          {columns.map(({ key, label }) => (
            <TableHead
              key={key}
              aria-sort={
                onSort
                  ? sort?.column === key
                    ? sort.direction === "asc" ? "ascending" : "descending"
                    : "none"
                  : undefined
              }
            >
              {onSort ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left"
                  onClick={() => onSort(key)}
                >
                  {label}
                  <span className="text-xs text-muted-foreground">
                    {sort?.column === key ? (sort.direction === "asc" ? "A-Z" : "Z-A") : "↕"}
                  </span>
                </button>
              ) : (
                label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedRecords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-6 text-center text-muted-foreground">
              Belum ada data absensi.
            </TableCell>
          </TableRow>
        ) : (
          paginatedRecords.map((att) => {
            const shift = att.user?.mitraProfile?.waktuKerja;
            const scheduledStart = att.checkIn
              ? getShiftStartAt(new Date(att.checkIn), shift)
              : null;
            const isLate = att.type === "HADIR" &&
              Boolean(scheduledStart && new Date(att.checkIn!) > scheduledStart);
            const employeeLabel = att.user?.name ? ` - ${att.user.name}` : "";
            return (
              <TableRow key={att.id}>
                {showName && (
                  <TableCell className="font-medium">{att.user?.name || "-"}</TableCell>
                )}
                <TableCell className="whitespace-nowrap">
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
                      <button
                        type="button"
                        onClick={() => onPhoto({ src: att.fotoCheckIn!, title: `Foto check-in${employeeLabel}` })}
                        aria-label="Lihat foto check-in"
                      >
                        <img className="h-12 w-12 rounded border object-cover" src={att.fotoCheckIn} alt="Foto check-in" />
                      </button>
                    )}
                    {att.fotoCheckOut && (
                      <button
                        type="button"
                        onClick={() => onPhoto({ src: att.fotoCheckOut!, title: `Foto check-out${employeeLabel}` })}
                        aria-label="Lihat foto check-out"
                      >
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
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
      {(alwaysShowPagination || records.length > PAGE_SIZE) && (
        <TablePagination
          totalItems={records.length}
          currentPage={safePage}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

interface EmployeeMatrixGroup {
  userId?: string;
  name: string;
  idMitraOs: string;
  status: string;
  role: string;
  office: string;
  days: Map<string, AttendanceRecord>;
  all: AttendanceRecord[];
}

function AttendanceMatrix({
  records,
  dateColumns,
  filter,
  sort,
  onSort,
  onPhoto,
  onSelectEmployee,
  onSelectRecord,
}: {
  records: AttendanceRecord[];
  dateColumns: { key: string; label: string }[];
  filter: string;
  sort: { column: string; direction: "asc" | "desc" } | null;
  onSort: (column: string) => void;
  onPhoto: (photo: { src: string; title: string }) => void;
  onSelectEmployee: (employee: EmployeeMatrixGroup) => void;
  onSelectRecord: (record: AttendanceRecord, employeeName: string) => void;
}) {
  const todayKey = formatLocalYmd(new Date());
  const grouped = new Map<string, EmployeeMatrixGroup>();

  for (const record of records) {
    const key = record.user?.id || record.user?.name || record.id;
    const profile = record.user?.mitraProfile;
    if (!grouped.has(key)) {
      grouped.set(key, {
        userId: record.user?.id,
        name: record.user?.name || "-",
        idMitraOs: profile?.idMitraOs || "-",
        status: profile?.status === "ACTIVE" ? "Aktif" : profile?.status || "-",
        role: profile?.posisi || "-",
        office: profile?.penempatan?.toLocaleLowerCase("id-ID") === "kantor1" ? "Kantor1 (Rempoa)" : profile?.penempatan || "-",
        days: new Map(),
        all: [],
      });
    }
    const row = grouped.get(key)!;
    const dateKey = formatLocalYmd(new Date(record.date));
    if (!row.days.has(dateKey)) row.days.set(dateKey, record);
    row.all.push(record);
  }

  let rows = Array.from(grouped.values());
  if (sort) {
    rows.sort((a, b) => {
      const value = (row: EmployeeMatrixGroup) => {
        if (sort.column === "total") {
          return Array.from(row.days.values()).filter((item) => item.type === "HADIR").length;
        }
        const todayRecord = row.days.get(todayKey);
        if (sort.column === "checkIn") return todayRecord?.checkIn || "";
        if (sort.column === "checkOut") return todayRecord?.checkOut || "";
        return ({ name: row.name, id: row.idMitraOs, status: row.status, role: row.role, office: row.office } as Record<string, string>)[sort.column] || "";
      };
      const first = value(a);
      const second = value(b);
      const compared = typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second), "id", { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? compared : -compared;
    });
  }

  const query = filter.trim().toLocaleLowerCase("id-ID");
  const visibleRows = query
    ? rows.filter((row) => [row.name, row.idMitraOs, row.status, row.role, row.office].some((value) => value.toLocaleLowerCase("id-ID").includes(query)))
    : rows;

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filter, records, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = visibleRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const headers: { key: string; label: string; subLabel?: string }[] = [
    { key: "name", label: "Nama" },
    { key: "id", label: "ID Mitra" },
    { key: "status", label: "Status" },
    { key: "role", label: "Peran" },
    { key: "office", label: "Kode Kantor" },
    { key: "checkIn", label: "Jam Masuk", subLabel: "Hari ini" },
    { key: "checkOut", label: "Jam Keluar", subLabel: "Hari ini" },
    { key: "photo", label: "Foto", subLabel: "Hari ini" },
  ];

  const totalColumns = headers.length + dateColumns.length + 1;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map(({ key, label, subLabel }) => (
              <TableHead key={key}>
                <button type="button" className="text-left" onClick={() => onSort(key)}>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    {label} {sort?.column === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                  {subLabel && (
                    <span className="block whitespace-nowrap text-[11px] font-normal text-muted-foreground">
                      {subLabel}
                    </span>
                  )}
                </button>
              </TableHead>
            ))}
            {dateColumns.map((column) => (
              <TableHead key={column.key} className="min-w-9 text-center">
                {column.label}
              </TableHead>
            ))}
            <TableHead>
              <button type="button" onClick={() => onSort("total")}>
                Total Hadir {sort?.column === "total" ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColumns} className="py-6 text-center text-muted-foreground">
                Tidak ada data absensi yang sesuai pencarian.
              </TableCell>
            </TableRow>
          ) : (
            paginatedRows.map((row) => {
              const todayRecord = row.days.get(todayKey);
              const total = Array.from(row.days.values()).filter((item) => item.type === "HADIR").length;
              return (
                <TableRow key={(row.userId || row.idMitraOs) + row.name}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      onClick={() => onSelectEmployee(row)}
                      title="Klik untuk melihat keseluruhan riwayat absensi"
                      className="text-left font-medium text-primary hover:underline"
                    >
                      {row.name}
                    </button>
                  </TableCell>
                  <TableCell>{row.idMitraOs}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.office}</TableCell>
                  <TableCell>
                    {todayRecord?.checkIn
                      ? new Date(todayRecord.checkIn).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {todayRecord?.checkOut
                      ? new Date(todayRecord.checkOut).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {todayRecord?.fotoCheckIn || todayRecord?.fotoCheckOut ? (
                      <div className="flex gap-1">
                        {todayRecord.fotoCheckIn && (
                          <button
                            type="button"
                            onClick={() => onPhoto({ src: todayRecord.fotoCheckIn!, title: `Foto masuk ${row.name}` })}
                            aria-label={`Foto masuk ${row.name}`}
                          >
                            <img className="h-10 w-10 rounded border object-cover transition hover:opacity-80" src={todayRecord.fotoCheckIn} alt="Foto masuk" />
                          </button>
                        )}
                        {todayRecord.fotoCheckOut && (
                          <button
                            type="button"
                            onClick={() => onPhoto({ src: todayRecord.fotoCheckOut!, title: `Foto keluar ${row.name}` })}
                            aria-label={`Foto keluar ${row.name}`}
                          >
                            <img className="h-10 w-10 rounded border object-cover transition hover:opacity-80" src={todayRecord.fotoCheckOut} alt="Foto keluar" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {dateColumns.map((column) => {
                    const attendance = row.days.get(column.key);
                    const shiftStart = attendance?.checkIn ? getShiftStartAt(new Date(attendance.checkIn), attendance.user?.mitraProfile?.waktuKerja) : null;
                    const late = attendance?.type === "HADIR" && Boolean(shiftStart && new Date(attendance!.checkIn!) > shiftStart);
                    const value = !attendance ? "-" : attendance.type === "HADIR" ? late ? "HT" : "H" : attendance.type;
                    return (
                      <TableCell key={column.key} className="text-center">
                        {attendance ? (
                          <button
                            type="button"
                            onClick={() => onSelectRecord(attendance, row.name)}
                            title="Klik untuk melihat detail absensi tanggal ini"
                            className={`inline-flex min-w-7 items-center justify-center rounded px-1.5 py-0.5 underline decoration-dotted underline-offset-2 transition hover:bg-muted ${
                              late ? "font-semibold text-amber-700" : "font-medium text-foreground"
                            }`}
                          >
                            {value}
                          </button>
                        ) : (
                          value
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-semibold">{total}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        totalItems={visibleRows.length}
        currentPage={safePage}
        onPageChange={setPage}
      />
    </div>
  );
}

export default function RiwayatAbsensiPage() {
  const { data: session } = useSession();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; title: string } | null>(null);
  const [detailModal, setDetailModal] = useState<{
    title: string;
    subtitle?: string;
    records: AttendanceRecord[];
    loading?: boolean;
  } | null>(null);
  const detailRequestIdRef = useRef(0);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => formatLocalYmd(new Date()));

  useEffect(() => {
    let cancelled = false;
    const params = buildAttendanceDateParams(startDate, endDate);
    const query = params.toString();
    setLoading(true);
    fetch(`/api/attendance${query ? `?${query}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAttendances(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = buildAttendanceDateParams(startDate, endDate);
      if (filter.trim()) params.set("q", filter.trim());
      const res = await fetch(`/api/attendance/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Gagal mengunduh rekap absensi.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || "rekap-absensi.xlsx";
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh rekap absensi.");
    } finally {
      setExporting(false);
    }
  };

  const handleSelectEmployee = (employee: EmployeeMatrixGroup) => {
    const requestId = ++detailRequestIdRef.current;
    const fallbackRecords = [...employee.all].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const subtitleParts = [
      employee.idMitraOs !== "-" ? `ID: ${employee.idMitraOs}` : "",
      employee.role !== "-" ? employee.role : "",
      employee.office !== "-" ? employee.office : "",
    ].filter(Boolean);

    setDetailModal({
      title: `Riwayat Absensi — ${employee.name}`,
      subtitle: subtitleParts.join(" · ") || "Keseluruhan riwayat absensi",
      records: fallbackRecords,
      loading: Boolean(employee.userId),
    });

    if (!employee.userId) return;

    fetch(`/api/attendance?userId=${encodeURIComponent(employee.userId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (detailRequestIdRef.current !== requestId) return;
        setDetailModal((current) =>
          current
            ? {
                ...current,
                records: Array.isArray(data) ? data : fallbackRecords,
                loading: false,
              }
            : current
        );
      })
      .catch(() => {
        if (detailRequestIdRef.current !== requestId) return;
        setDetailModal((current) => (current ? { ...current, loading: false } : current));
      });
  };

  const handleSelectRecord = (record: AttendanceRecord, employeeName: string) => {
    detailRequestIdRef.current += 1;
    setDetailModal({
      title: `Detail Absensi — ${employeeName}`,
      subtitle: new Date(record.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      records: [record],
      loading: false,
    });
  };

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

  const dateColumns = session?.user.role !== "MITRA" ? getDateColumns(startDate, endDate) : [];
  const showMatrix = dateColumns.length > 0 && dateColumns.length <= MAX_MATRIX_DAYS;

  return (
    <DashboardLayout allowedRoles={["MITRA", "VENDOR", "VM"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Riwayat Absensi</h1>
            <p className="text-muted-foreground">
              {session?.user.role === "MITRA"
                ? "Riwayat absensi Anda"
                : "Data absensi mitra OS"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Filter riwayat absensi"
              placeholder="Cari nama/status/catatan"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-56"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="attendance-start-date" className="whitespace-nowrap">Tanggal:</Label>
              <Input
                id="attendance-start-date"
                aria-label="Tanggal mulai absensi"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <Input
                id="attendance-end-date"
                aria-label="Tanggal akhir absensi"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            {session?.user.role !== "MITRA" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleExport}
                disabled={exporting || loading}
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Mengunduh..." : "Unduh Rekap"}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
            ) : attendances.length === 0 ? (
              <EmptyState
                title="Belum ada data absensi"
                description={
                  startDate || endDate
                    ? "Data absensi untuk rentang tanggal ini belum tersedia."
                    : "Data absensi belum tersedia."
                }
                icon={<History size={32} className="text-muted-foreground" />}
              />
            ) : showMatrix ? (
              <AttendanceMatrix
                records={attendances}
                dateColumns={dateColumns}
                filter={filter}
                sort={sort}
                onSort={(column) => setSort((current) => ({
                  column,
                  direction: current?.column === column && current.direction === "asc" ? "desc" : "asc",
                }))}
                onPhoto={setSelectedPhoto}
                onSelectEmployee={handleSelectEmployee}
                onSelectRecord={handleSelectRecord}
              />
            ) : (
              <AttendanceDetailTable
                records={sortedAttendances}
                showName={session?.user.role !== "MITRA"}
                alwaysShowPagination
                sort={sort}
                onSort={(column) => setSort((current) => ({
                  column,
                  direction: current?.column === column && current.direction === "asc" ? "desc" : "asc",
                }))}
                onPhoto={setSelectedPhoto}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={Boolean(detailModal)}
        onOpenChange={(open) => {
          if (!open) {
            if (selectedPhoto) return;
            detailRequestIdRef.current += 1;
            setDetailModal(null);
          }
        }}
        className="max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle>{detailModal?.title || "Detail Absensi"}</DialogTitle>
          {detailModal?.subtitle && (
            <p className="text-sm text-muted-foreground">
              {detailModal.subtitle}
              {detailModal.loading ? " · Memuat seluruh riwayat..." : ` · ${detailModal.records.length} catatan`}
            </p>
          )}
        </DialogHeader>
        <DialogContent className="pt-4">
          {detailModal && (
            <div className="overflow-x-auto rounded-md border">
              <AttendanceDetailTable
                records={detailModal.records}
                showName={false}
                onPhoto={setSelectedPhoto}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
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
