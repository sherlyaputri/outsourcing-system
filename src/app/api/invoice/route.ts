import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_RATE = 100_000;
const TAX_PPN = 0.11;
const TAX_PPH = 0.025;
const parseDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T00:00:00+07:00`) : null;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VM", "VENDOR"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const invoices = await prisma.invoice.findMany({
      where: session.user.role === "VENDOR" ? { vendorId: session.user.vendorId || "__none__", status: "PUBLISHED" } : {},
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
    if (!session || session.user.role !== "VM") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    if (body.action === "cancel") {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
      if (!reason) return NextResponse.json({ error: "Alasan pembatalan wajib diisi." }, { status: 400 });
      const invoice = await prisma.invoice.findUnique({ where: { id: String(body.invoiceId || "") } });
      if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
      if (invoice.status !== "PUBLISHED" || invoice.statusPembayaran === "PAID") return NextResponse.json({ error: "Hanya invoice Published yang belum dibayar dapat dibatalkan." }, { status: 409 });
      const history = invoice.changeHistory ? JSON.parse(invoice.changeHistory) : [];
      history.push({ action: "CANCELLED", reason, at: new Date().toISOString(), actorId: session.user.id });
      const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason, changeHistory: JSON.stringify(history) } });
      return NextResponse.json(updated);
    }

    if (body.action === "publish") {
      const invoice = await prisma.invoice.findUnique({ where: { id: String(body.invoiceId || "") }, include: { claims: true } });
      if (!invoice) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
      if (invoice.status !== "DRAFT") return NextResponse.json({ error: "Hanya invoice Draft yang dapat dipublikasikan." }, { status: 409 });
      const biayaVendor = invoice.biayaVendor;
      const totalKlaim = invoice.claims.reduce((sum, claim) => sum + claim.nominal, 0);
      const ppn = Math.round(biayaVendor * TAX_PPN);
      const pph = Math.round(biayaVendor * TAX_PPH);
      const totalTagihan = Math.max(0, biayaVendor + ppn - pph - totalKlaim);
      const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { totalKlaim, ppn, pph, totalTagihan, totalAmount: totalTagihan, status: "PUBLISHED", publishedAt: new Date() } });
      return NextResponse.json(updated);
    }

    const start = parseDate(body.periodeMulai);
    const end = parseDate(body.periodeAkhir);
    if (typeof body.vendorId !== "string" || !start || !end || start > end) return NextResponse.json({ error: "Vendor dan periode invoice tidak valid." }, { status: 400 });
    const vendor = await prisma.vendor.findFirst({ where: { id: body.vendorId, status: "ACTIVE" }, select: { id: true } });
    if (!vendor) return NextResponse.json({ error: "Vendor tidak ditemukan atau tidak aktif." }, { status: 400 });
    const monthKey = String(body.periodeMulai).slice(0, 7);
    const existing = await prisma.invoice.findFirst({ where: { vendorId: vendor.id, periodeMulai: start, periodeAkhir: end, status: { in: ["DRAFT", "PUBLISHED", "PAID"] } } });
    if (existing) return NextResponse.json({ error: "Invoice untuk vendor dan periode tersebut sudah ada." }, { status: 409 });

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
    const mitra = Array.from(workers.values()).map((worker) => ({ userId: worker.userId, nama: worker.name, idMitra: worker.idMitra, hub: worker.hub, role: worker.role, hariHadir: worker.days.size, hariTidakHadir: worker.absentDays.size, tarif: DAY_RATE, totalBiaya: worker.days.size * DAY_RATE }));
    const hubs = new Map<string, { nama: string; jumlahMitra: number; totalHariKerja: number; biayaVendor: number }>();
    for (const worker of mitra) {
      const hub = hubs.get(worker.hub) || { nama: worker.hub, jumlahMitra: 0, totalHariKerja: 0, biayaVendor: 0 };
      hub.jumlahMitra += 1; hub.totalHariKerja += worker.hariHadir; hub.biayaVendor += worker.totalBiaya; hubs.set(worker.hub, hub);
    }
    const biayaVendor = mitra.reduce((sum, worker) => sum + worker.totalBiaya, 0);
    const count = await prisma.invoice.count();
    const nomorInvoice = `INV-${monthKey.replace("-", "")}-${String(count + 1).padStart(4, "0")}`;
    const invoice = await prisma.invoice.create({ data: {
      vendorId: vendor.id, nomorInvoice, bulan: monthKey, totalAmount: biayaVendor, status: "DRAFT", periodeMulai: start, periodeAkhir: end, biayaVendor,
      detailSnapshot: JSON.stringify({ hubs: Array.from(hubs.values()), mitra }),
    } });
    return NextResponse.json({ id: invoice.id }, { status: 201 });
  } catch (error) {
    console.error("Invoice POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
