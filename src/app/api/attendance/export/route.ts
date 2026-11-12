import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import ExcelJS from "exceljs";
import { authOptions } from "@/lib/auth";
import { getShiftStartAt } from "@/lib/attendance-shift";
import { getJakartaYmd, parseYmdDate, queryAttendances } from "@/lib/attendance-query";

const MAX_EXPORT_DAYS = 366;

function formatJakartaTime(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatJakartaDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatusMitra(status: string | null | undefined) {
  if (status === "ACTIVE") return "Aktif";
  return status || "-";
}

function formatOffice(penempatan: string | null | undefined) {
  if (!penempatan) return "-";
  return penempatan.toLocaleLowerCase("id-ID") === "kantor1" ? "Kantor1 (Rempoa)" : penempatan;
}

function buildDateColumns(startYmd: string | null, endYmd: string | null, recordKeys: string[]) {
  let fromYmd = startYmd;
  let toYmd = endYmd;

  if (recordKeys.length > 0) {
    const sortedKeys = [...recordKeys].sort();
    if (!fromYmd) fromYmd = sortedKeys[0];
    if (!toYmd) toYmd = sortedKeys[sortedKeys.length - 1];
  } else if (fromYmd && !toYmd) {
    toYmd = fromYmd;
  } else if (!fromYmd && toYmd) {
    fromYmd = toYmd;
  }

  if (!fromYmd || !toYmd) return { columns: [], fromYmd: null, toYmd: null };

  const [normalizedFrom, normalizedTo] = fromYmd <= toYmd ? [fromYmd, toYmd] : [toYmd, fromYmd];
  const [sy, sm, sd] = normalizedFrom.split("-").map(Number);
  const [ey, em, ed] = normalizedTo.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const end = new Date(ey, em - 1, ed, 0, 0, 0, 0);
  const columns: { key: string; label: string }[] = [];

  while (cursor <= end && columns.length < MAX_EXPORT_DAYS) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    columns.push({
      key: `${y}-${m}-${d}`,
      label: `${d}/${m}`,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { columns, fromYmd: normalizedFrom, toYmd: normalizedTo };
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.height = 24;
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "MITRA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const searchQuery = (searchParams.get("q") || "").trim().toLocaleLowerCase("id-ID");
    const startParam = parseYmdDate(searchParams.get("startDate"))
      ? searchParams.get("startDate")
      : null;
    const endParam = parseYmdDate(searchParams.get("endDate"))
      ? searchParams.get("endDate")
      : null;

    const allRecords = await queryAttendances(session.user, searchParams, { takeLimit: 5000 });
    const filteredRecords = searchQuery
      ? allRecords.filter((att) => {
          const profile = att.user?.mitraProfile;
          return [
            att.user?.name,
            profile?.idMitraOs,
            formatStatusMitra(profile?.status),
            profile?.posisi,
            formatOffice(profile?.penempatan),
            att.type,
            att.note,
            getJakartaYmd(att.date),
          ].some((value) => String(value || "").toLocaleLowerCase("id-ID").includes(searchQuery));
        })
      : allRecords;

    const recordDateKeys = filteredRecords.map((record) => getJakartaYmd(record.date));
    const { columns: dateColumns, fromYmd, toYmd } = buildDateColumns(
      startParam,
      endParam,
      recordDateKeys
    );

    const grouped = new Map<
      string,
      {
        name: string;
        idMitraOs: string;
        status: string;
        role: string;
        office: string;
        days: Map<string, (typeof filteredRecords)[number]>;
      }
    >();

    for (const record of filteredRecords) {
      const key = record.user?.id || record.user?.name || record.id;
      const profile = record.user?.mitraProfile;
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: record.user?.name || "-",
          idMitraOs: profile?.idMitraOs || "-",
          status: formatStatusMitra(profile?.status),
          role: profile?.posisi || "-",
          office: formatOffice(profile?.penempatan),
          days: new Map(),
        });
      }
      const employee = grouped.get(key)!;
      const dateKey = getJakartaYmd(record.date);
      if (!employee.days.has(dateKey)) {
        employee.days.set(dateKey, record);
      }
    }

    const employees = Array.from(grouped.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "id", { numeric: true, sensitivity: "base" })
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Outsourcing System";
    workbook.created = new Date();

    // Sheet 1: Rekap Kehadiran (Format Matriks)
    const matrixSheet = workbook.addWorksheet("Rekap Kehadiran");
    const periodText = fromYmd && toYmd ? `${fromYmd} s/d ${toYmd}` : "Semua Data";

    matrixSheet.addRow(["Rekap Kehadiran Mitra OS"]).font = { bold: true, size: 13 };
    matrixSheet.addRow([`Periode: ${periodText}`]).font = { size: 10, color: { argb: "FF475569" } };
    matrixSheet.addRow([]);

    const matrixHeaders = [
      "No",
      "Nama",
      "ID Mitra",
      "Status",
      "Peran",
      "Kode Kantor",
      ...dateColumns.map((col) => col.label),
      "Total Hadir",
      "Total Telat",
    ];
    const matrixHeaderRow = matrixSheet.addRow(matrixHeaders);
    applyHeaderStyle(matrixHeaderRow);

    if (employees.length === 0) {
      matrixSheet.addRow(["-", "Belum ada data absensi untuk filter yang dipilih."]);
    } else {
      employees.forEach((emp, idx) => {
        let totalHadir = 0;
        let totalTelat = 0;

        const dayValues = dateColumns.map((col) => {
          const att = emp.days.get(col.key);
          if (!att) return "-";
          if (att.type === "HADIR") {
            totalHadir += 1;
            const shiftStart = att.checkIn
              ? getShiftStartAt(att.checkIn, att.user?.mitraProfile?.waktuKerja)
              : null;
            const isLate = Boolean(att.checkIn && shiftStart && att.checkIn > shiftStart);
            if (isLate) {
              totalTelat += 1;
              return "HT";
            }
            return "H";
          }
          return att.type;
        });

        const dataRow = matrixSheet.addRow([
          idx + 1,
          emp.name,
          emp.idMitraOs,
          emp.status,
          emp.role,
          emp.office,
          ...dayValues,
          totalHadir,
          totalTelat,
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFF1F5F9" } },
            right: { style: "thin", color: { argb: "FFF1F5F9" } },
          };
          if (colNumber === 1 || colNumber > 6) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle" };
          }
          if (colNumber > 6 && colNumber <= 6 + dateColumns.length) {
            if (cell.value === "HT") {
              cell.font = { bold: true, color: { argb: "FFB45309" } };
            } else if (cell.value === "H") {
              cell.font = { color: { argb: "FF15803D" } };
            }
          }
          if (colNumber > 6 + dateColumns.length) {
            cell.font = { bold: true };
          }
        });
      });
    }

    matrixSheet.columns.forEach((column, idx) => {
      const colNum = idx + 1;
      if (colNum === 1) column.width = 6;
      else if (colNum === 2) column.width = 24;
      else if (colNum === 3) column.width = 16;
      else if (colNum === 4) column.width = 12;
      else if (colNum === 5) column.width = 18;
      else if (colNum === 6) column.width = 18;
      else if (colNum <= 6 + dateColumns.length) column.width = 8;
      else column.width = 13;
    });

    // Sheet 2: Detail Harian
    const detailSheet = workbook.addWorksheet("Detail Harian");
    detailSheet.addRow(["Detail Riwayat Absensi Harian"]).font = { bold: true, size: 13 };
    detailSheet.addRow([`Periode: ${periodText}`]).font = { size: 10, color: { argb: "FF475569" } };
    detailSheet.addRow([]);

    const detailHeaderRow = detailSheet.addRow([
      "No",
      "Nama",
      "ID Mitra",
      "Tanggal",
      "Status",
      "Check-In",
      "Ket. Masuk",
      "Check-Out",
      "Lokasi Check-In (GPS)",
      "Lokasi Check-Out (GPS)",
      "Catatan",
    ]);
    applyHeaderStyle(detailHeaderRow);

    if (filteredRecords.length === 0) {
      detailSheet.addRow(["-", "Belum ada data absensi untuk filter yang dipilih."]);
    } else {
      filteredRecords.forEach((att, idx) => {
        const shiftStart = att.checkIn
          ? getShiftStartAt(att.checkIn, att.user?.mitraProfile?.waktuKerja)
          : null;
        const isLate = Boolean(
          att.type === "HADIR" && att.checkIn && shiftStart && att.checkIn > shiftStart
        );
        const statusLabel = isLate ? "Hadir (telat)" : att.type === "HADIR" ? "Hadir" : att.type;
        const arrivalNote = att.checkIn && shiftStart ? (isLate ? "Telat" : "Tepat waktu") : "-";
        const checkInGps =
          att.latitude != null && att.longitude != null
            ? `${att.latitude.toFixed(6)}, ${att.longitude.toFixed(6)}`
            : "-";
        const checkOutGps =
          att.checkOut && att.latitudeCheckOut != null && att.longitudeCheckOut != null
            ? `${att.latitudeCheckOut.toFixed(6)}, ${att.longitudeCheckOut.toFixed(6)}`
            : "-";

        const row = detailSheet.addRow([
          idx + 1,
          att.user?.name || "-",
          att.user?.mitraProfile?.idMitraOs || "-",
          formatJakartaDate(att.date),
          statusLabel,
          formatJakartaTime(att.checkIn),
          arrivalNote,
          formatJakartaTime(att.checkOut),
          checkInGps,
          checkOutGps,
          att.note || "-",
        ]);
        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFF1F5F9" } },
            right: { style: "thin", color: { argb: "FFF1F5F9" } },
          };
        });
      });
    }

    const detailWidths = [6, 24, 16, 15, 16, 11, 14, 11, 24, 24, 28];
    detailSheet.columns.forEach((col, idx) => {
      col.width = detailWidths[idx] || 16;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename =
      fromYmd && toYmd
        ? `rekap-absensi-${fromYmd}-sd-${toYmd}.xlsx`
        : "rekap-absensi.xlsx";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Attendance Export error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

