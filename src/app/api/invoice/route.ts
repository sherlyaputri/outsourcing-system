import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPositionCode, parseVendorServicePricing } from "@/lib/vendor-service-pricing";

const DAY_RATE = 100_000;
const parseMonth = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return { start: new Date(`${value}-01T00:00:00+07:00`), end: new Date(new Date(`${nextMonth}-01T00:00:00+07:00`).getTime() - 1) };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VM", "VENDOR", "FINANCE"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const invoices = await prisma.invoice.findMany({
      where: session.user.role === "VENDOR"
        ? { vendorId: session.user.vendorId || "__none__", status: { in: ["PUBLISHED", "PAID"] } }
        : { status: { not: "CANCELLED" } },
      include: { vendor: { select: { id: true, name: true } }, claims: { select: { id: true, bulan: true, jenisClaim: true, nominal: true, catatan: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices.map((invoice) => ({ ...invoice, hasDokumen: Boolean(invoice.dokumenNama), hasBuktiTransfer: Boolean(invoice.buktiTransferNama), details: invoice.detailSnapshot ? JSON.parse(invoice.detailSnapshot) : null })));
  } catch (error) {
    console.error("Invoice GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "FINANCE") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    if (body.action === "cancel") {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
      if (!reason) return NextResponse.json({ error: "Alasan pembatalan wajib diisi." }, { status: 400 });
      const invoice = await prisma.invoice.findUnique({ where: { id: String(body.invoiceId || "") } });
      if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
      if (invoice.status !== "PUBLISHED" || invoice.statusPembayaran === "PAID") return NextResponse.json({ error: "Hanya invoice Published yang belum dibayar dapat dibatalkan." }, { status: 409 });
      await prisma.$transaction([
        prisma.claim.deleteMany({ where: { invoiceId: invoice.id } }),
        prisma.invoice.delete({ where: { id: invoice.id } }),
      ]);
      console.info("Invoice cancelled and deleted", { invoiceId: invoice.id, invoiceNumber: invoice.nomorInvoice, actorId: session.user.id, reason });
      return NextResponse.json({ deleted: true, id: invoice.id });
    }

    if (body.action === "publish") {
      const invoice = await prisma.invoice.findUnique({ where: { id: String(body.invoiceId || "") }, include: { claims: true } });
      if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
      if (invoice.status !== "DRAFT") return NextResponse.json({ error: "Hanya invoice Draft yang dapat dipublikasikan." }, { status: 409 });
      const biayaVendor = invoice.biayaVendor;
      const detail = invoice.detailSnapshot ? JSON.parse(invoice.detailSnapshot) as { mitra?: { managementFee?: number }[] } : null;
      const feeSnapshot = detail?.mitra;
      const hasPerWorkerFeeSnapshot = Array.isArray(feeSnapshot) && feeSnapshot.every((worker) => typeof worker.managementFee === "number");
      const managementFee = hasPerWorkerFeeSnapshot
        ? feeSnapshot.reduce((sum, worker) => sum + worker.managementFee!, 0)
        : invoice.managementFee || Math.round(biayaVendor * invoice.managementFeeRate);
      const totalKlaim = invoice.claims.reduce((sum, claim) => sum + claim.nominal, 0);
      const ppn = Math.round(managementFee * 0.11);
      const pph = Math.round(managementFee * 0.025);
      const totalTagihan = Math.max(0, biayaVendor + managementFee + ppn - pph - totalKlaim);
      const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { managementFee, totalKlaim, ppn, pph, totalTagihan, totalAmount: totalTagihan, status: "PUBLISHED", publishedAt: new Date() } });
      return NextResponse.json(updated);
    }

    const month = parseMonth(body.bulan);
    if (typeof body.vendorId !== "string" || !month) return NextResponse.json({ error: "Vendor dan bulan invoice tidak valid." }, { status: 400 });
    const start = month.start;
    const end = month.end;
    const vendor = await prisma.vendor.findFirst({ where: { id: body.vendorId, status: "ACTIVE" }, select: { id: true, managementFeeRate: true, servicePricing: true } });
    if (!vendor) return NextResponse.json({ error: "Vendor tidak ditemukan atau tidak aktif." }, { status: 400 });
    const monthKey = String(body.bulan);
    const servicePricing = parseVendorServicePricing(vendor.servicePricing);
    const monthInvoices = await prisma.invoice.findMany({
      where: { vendorId: vendor.id, bulan: monthKey },
      select: { id: true, nomorInvoice: true, status: true },
    });
    const cancelledInvoices = monthInvoices.filter((invoice) => invoice.status.trim().toUpperCase() === "CANCELLED");
    if (cancelledInvoices.length) {
      const cancelledIds = cancelledInvoices.map((invoice) => invoice.id);
      await prisma.$transaction([
        prisma.claim.deleteMany({ where: { invoiceId: { in: cancelledIds } } }),
        prisma.invoice.deleteMany({ where: { id: { in: cancelledIds } } }),
      ]);
    }
    const blockingInvoice = monthInvoices.find((invoice) => invoice.status.trim().toUpperCase() !== "CANCELLED");
    if (blockingInvoice) {
      return NextResponse.json({
        error: `Invoice untuk vendor dan bulan tersebut sudah ada (${blockingInvoice.nomorInvoice}, status ${blockingInvoice.status}).`,
      }, { status: 409 });
    }

    const attendance = await prisma.attendance.findMany({
      where: { date: { gte: start, lt: new Date(end.getTime() + 24 * 60 * 60 * 1000) }, user: { role: "MITRA", vendorId: vendor.id } },
      include: { user: { select: { id: true, name: true, mitraProfile: { select: { idMitraOs: true, penempatan: true, posisi: true } } } } },
    });
    const workers = new Map<string, { userId: string; name: string; idMitra: string; hub: string; role: string; days: Set<string>; absentDays: Set<string> }>();
    const vendorWorkers = await prisma.user.findMany({
      where: { role: "MITRA", vendorId: vendor.id },
      select: { id: true, name: true, mitraProfile: { select: { idMitraOs: true, penempatan: true, posisi: true } } },
    });
    for (const user of vendorWorkers) {
      workers.set(user.id, { userId: user.id, name: user.name, idMitra: user.mitraProfile?.idMitraOs || "-", hub: user.mitraProfile?.penempatan || "Belum ditentukan", role: user.mitraProfile?.posisi || "-", days: new Set<string>(), absentDays: new Set<string>() });
    }
    for (const row of attendance) {
      const profile = row.user.mitraProfile;
      const worker = workers.get(row.userId) || { userId: row.userId, name: row.user.name, idMitra: profile?.idMitraOs || "-", hub: profile?.penempatan || "Belum ditentukan", role: profile?.posisi || "-", days: new Set<string>(), absentDays: new Set<string>() };
      const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(row.date);
      if (row.type === "HADIR") worker.days.add(ymd); else worker.absentDays.add(ymd);
      workers.set(row.userId, worker);
    }
    const mitra = Array.from(workers.values()).map((worker) => {
      const positionCode = getPositionCode(worker.role);
      const pricing = servicePricing.find((item) => item.positionCode === positionCode && item.locationCode === worker.hub);
      const tarif = pricing?.dailyRate ?? DAY_RATE;
      const managementFeeRate = pricing?.managementFeeRate ?? vendor.managementFeeRate;
      const totalBiaya = worker.days.size * tarif;
      return {
        userId: worker.userId,
        nama: worker.name,
        idMitra: worker.idMitra,
        hub: worker.hub,
        role: worker.role,
        hariHadir: worker.days.size,
        hariTidakHadir: worker.absentDays.size,
        tarif,
        totalBiaya,
        managementFeeRate,
        managementFee: Math.round(totalBiaya * managementFeeRate),
      };
    });
    const hubs = new Map<string, { nama: string; jumlahMitra: number; totalHariKerja: number; biayaVendor: number }>();
    for (const worker of mitra) {
      const hub = hubs.get(worker.hub) || { nama: worker.hub, jumlahMitra: 0, totalHariKerja: 0, biayaVendor: 0 };
      hub.jumlahMitra += 1; hub.totalHariKerja += worker.hariHadir; hub.biayaVendor += worker.totalBiaya; hubs.set(worker.hub, hub);
    }
    const biayaVendor = mitra.reduce((sum, worker) => sum + worker.totalBiaya, 0);
    const managementFee = mitra.reduce((sum, worker) => sum + worker.managementFee, 0);
    let sequence = (await prisma.invoice.count()) + 1;
    let nomorInvoice = `INV-${monthKey.replace("-", "")}-${String(sequence).padStart(4, "0")}`;
    while (await prisma.invoice.findUnique({ where: { nomorInvoice }, select: { id: true } })) {
      sequence += 1;
      nomorInvoice = `INV-${monthKey.replace("-", "")}-${String(sequence).padStart(4, "0")}`;
    }
    const invoice = await prisma.invoice.create({ data: {
      vendorId: vendor.id, nomorInvoice, bulan: monthKey, totalAmount: biayaVendor, status: "DRAFT", periodeMulai: start, periodeAkhir: end, biayaVendor, managementFeeRate: vendor.managementFeeRate, managementFee,
      detailSnapshot: JSON.stringify({ hubs: Array.from(hubs.values()), mitra }),
    } });
    return NextResponse.json({ id: invoice.id }, { status: 201 });
  } catch (error) {
    console.error("Invoice POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
