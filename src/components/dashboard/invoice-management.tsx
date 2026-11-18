"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Vendor = { id: string; name: string };
type Claim = { id: string; jenisClaim: string; nominal: number; catatan?: string | null; createdAt: string };
type Worker = { nama: string; idMitra: string; hub: string; role: string; hariHadir: number; hariTidakHadir: number | null; tarif: number; totalBiaya: number };
type Hub = { nama: string; jumlahMitra: number; totalHariKerja: number; biayaVendor: number };
type Invoice = {
  id: string; vendorId: string; nomorInvoice: string; bulan: string; totalAmount: number; biayaVendor: number; totalKlaim: number; ppn: number; pph: number; totalTagihan: number;
  status: string; statusPembayaran: string; periodeMulai?: string | null; periodeAkhir?: string | null; createdAt: string; publishedAt?: string | null; cancelledAt?: string | null; cancellationReason?: string | null; nominalPembayaran?: number | null; tanggalPembayaran?: string | null;
  buktiTransferNama?: string | null; claims: Claim[]; vendor: Vendor; details?: { hubs: Hub[]; mitra: Worker[] } | null;
};

async function request(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleDateString("id-ID") : "-";
const claimTotal = (invoice: Invoice) => invoice.status === "DRAFT" ? invoice.claims.reduce((sum, claim) => sum + claim.nominal, 0) : invoice.totalKlaim;
const invoicePpn = (invoice: Invoice) => invoice.status === "DRAFT" ? Math.round(invoice.biayaVendor * 0.11) : invoice.ppn;
const invoicePph = (invoice: Invoice) => invoice.status === "DRAFT" ? Math.round(invoice.biayaVendor * 0.025) : invoice.pph;
const invoiceTotal = (invoice: Invoice) => invoice.status === "DRAFT"
  ? Math.max(0, invoice.biayaVendor + invoicePpn(invoice) - invoicePph(invoice) - claimTotal(invoice))
  : invoice.totalTagihan;

export function InvoiceManagementPage() {
  const { data: session } = useSession();
  const isVm = session?.user.role === "VM";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  async function reload() {
    try { const data = await request("/api/invoice"); setInvoices(data); setSelected((current) => current ? data.find((item: Invoice) => item.id === current.id) || current : null); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat invoice."); }
  }
  useEffect(() => { void reload(); if (isVm) void request("/api/vendor").then(setVendors).catch(() => undefined); }, [isVm]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const formElement = event.currentTarget; const form = new FormData(formElement);
    try { await request("/api/invoice", "POST", { vendorId: form.get("vendorId"), periodeMulai: form.get("periodeMulai"), periodeAkhir: form.get("periodeAkhir") }); await reload(); formElement.reset(); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat draft invoice."); }
    finally { setBusy(false); }
  }
  async function publish(invoice: Invoice) {
    if (!window.confirm(`Publikasikan invoice ${invoice.nomorInvoice}? Setelah dipublikasikan, invoice tidak dapat diedit.`)) return;
    setError(""); setBusy(true);
    try { await request("/api/invoice", "POST", { action: "publish", invoiceId: invoice.id }); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal memublikasikan invoice."); }
    finally { setBusy(false); }
  }
  async function cancel(invoice: Invoice) {
    const reason = window.prompt(`Alasan pembatalan invoice ${invoice.nomorInvoice}:`);
    if (!reason?.trim()) return;
    setError(""); setBusy(true);
    try { await request("/api/invoice", "POST", { action: "cancel", invoiceId: invoice.id, reason }); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal membatalkan invoice."); }
    finally { setBusy(false); }
  }
  async function deleteDraft(invoice: Invoice) {
    if (!window.confirm(`Hapus draft invoice ${invoice.nomorInvoice}? Klaim yang terhubung juga akan dihapus.`)) return;
    setError(""); setBusy(true);
    try { await request(`/api/invoice/${invoice.id}`, "DELETE"); await reload(); if (selected?.id === invoice.id) setSelected(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal menghapus draft invoice."); }
    finally { setBusy(false); }
  }
  async function addClaim(event: FormEvent<HTMLFormElement>, invoice: Invoice) {
    event.preventDefault(); setError(""); setBusy(true);
    const formElement = event.currentTarget; const form = new FormData(formElement);
    try { await request("/api/claim", "POST", { invoiceId: invoice.id, jenisClaim: form.get("jenisClaim"), nominal: Number(form.get("nominal")), catatan: form.get("catatan") }); await reload(); formElement.reset(); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal menambahkan klaim."); }
    finally { setBusy(false); }
  }
  async function pay(event: FormEvent<HTMLFormElement>, invoice: Invoice) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget); const file = form.get("proof");
    try {
      if (!(file instanceof File) || !file.size) throw new Error("Pilih bukti transfer.");
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Bukti harus PDF/JPG/PNG maksimal 5 MB.");
      const proof = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("File gagal dibaca.")); reader.readAsDataURL(file); });
      await request(`/api/invoice/${invoice.id}`, "PATCH", { nominalPembayaran: Number(form.get("nominalPembayaran")), tanggalPembayaran: form.get("tanggalPembayaran"), catatanPembayaran: form.get("catatanPembayaran"), buktiTransfer: proof, buktiTransferNama: file.name });
      setPaymentId(null); await reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran."); }
    finally { setBusy(false); }
  }
  function downloadClaims(invoice: Invoice) {
    const rows = [["Tanggal klaim", "Jenis", "Keterangan", "Nominal"], ...invoice.claims.map((claim) => [new Date(claim.createdAt).toLocaleDateString("id-ID"), claim.jenisClaim, claim.catatan || "", String(claim.nominal)])];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `klaim-${invoice.nomorInvoice}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <DashboardLayout allowedRoles={["VM", "VENDOR"]}>
    <div className="space-y-5 p-4 md:p-6">
      <div><h1 className="text-2xl font-bold">Invoice</h1><p className="text-sm text-muted-foreground">{isVm ? "Buat draft, kelola klaim, publikasikan invoice, dan konfirmasi pembayaran." : "Invoice dan rincian pembayaran untuk vendor Anda."}</p></div>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {isVm && <form onSubmit={generate} className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4 md:items-end">
        <label className="text-sm">Vendor<select name="vendorId" required className="mt-1 w-full rounded-md border bg-background p-2"><option value="">Pilih vendor</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <label className="text-sm">Periode mulai<input name="periodeMulai" type="date" required className="mt-1 w-full rounded-md border bg-background p-2" /></label>
        <label className="text-sm">Periode akhir<input name="periodeAkhir" type="date" required className="mt-1 w-full rounded-md border bg-background p-2" /></label>
        <Button disabled={busy}>Generate Draft Invoice</Button>
      </form>}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-muted/50"><tr>{["No. Transaksi", "Vendor", "Periode", "Hub", "Mitra", "Hari Hadir", "Biaya Vendor", "Klaim", "PPN", "PPh", "Total Tagihan", "Invoice", "Pembayaran", "Tanggal Bayar", "Aksi"].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{invoices.map(invoice => <tr key={invoice.id} className="border-t"><td className="p-3 font-mono">{invoice.nomorInvoice}</td><td className="p-3">{invoice.vendor?.name}</td><td className="p-3">{dateLabel(invoice.periodeMulai)} – {dateLabel(invoice.periodeAkhir)}</td><td className="p-3">{invoice.details?.hubs.length ?? "-"}</td><td className="p-3">{invoice.details?.mitra.length ?? "-"}</td><td className="p-3">{invoice.details?.mitra.reduce((s, m) => s + m.hariHadir, 0) ?? "-"}</td><td className="p-3">{formatCurrency(invoice.biayaVendor)}</td><td className="p-3">{formatCurrency(claimTotal(invoice))}</td><td className="p-3">{formatCurrency(invoicePpn(invoice))}</td><td className="p-3">{formatCurrency(invoicePph(invoice))}</td><td className="p-3 font-semibold">{formatCurrency(invoiceTotal(invoice))}</td><td className="p-3">{invoice.status}</td><td className="p-3">{invoice.statusPembayaran === "PAID" ? "Paid" : invoice.status === "PUBLISHED" ? "Unpaid" : "-"}</td><td className="p-3">{dateLabel(invoice.tanggalPembayaran)}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(invoice)}>Detail</Button>{isVm && invoice.status === "DRAFT" && <><Button size="sm" variant="outline" onClick={() => setSelected(invoice)}>Tambah Klaim</Button><Button size="sm" disabled={busy} onClick={() => void publish(invoice)}>Publish</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void deleteDraft(invoice)}>Hapus Draft</Button></>}{isVm && invoice.status === "PUBLISHED" && invoice.statusPembayaran !== "PAID" && <><Button size="sm" onClick={() => setPaymentId(invoice.id)}>Konfirmasi Pembayaran</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void cancel(invoice)}>Batalkan</Button></>}{invoice.statusPembayaran === "PAID" && <a className="rounded border px-2 py-1 text-xs" href={`/api/invoice/${invoice.id}?type=transfer`} target="_blank">Bukti Transfer</a>}<Button size="sm" variant="outline" onClick={() => window.print()}>Cetak</Button></div></td></tr>)}
          {!invoices.length && <tr><td className="p-6 text-center text-muted-foreground" colSpan={15}>Belum ada invoice.</td></tr>}</tbody>
        </table>
      </div>
      {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true"><div className="mx-auto my-8 max-w-5xl space-y-4 rounded-xl bg-background p-5 shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-bold">Detail Invoice {selected.nomorInvoice}</h2><button onClick={() => setSelected(null)} aria-label="Tutup">✕</button></div><p>{selected.vendor?.name} · {dateLabel(selected.periodeMulai)} – {dateLabel(selected.periodeAkhir)} · {selected.status}</p>
        <h3 className="font-semibold">Biaya per Hub</h3><table className="w-full text-sm"><thead><tr>{["Hub", "Jumlah Mitra", "Hari Kerja", "Biaya"].map(x => <th className="p-2 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{selected.details?.hubs.map(h => <tr className="border-t" key={h.nama}><td className="p-2">{h.nama}</td><td className="p-2">{h.jumlahMitra}</td><td className="p-2">{h.totalHariKerja}</td><td className="p-2">{formatCurrency(h.biayaVendor)}</td></tr>)}</tbody></table>
        <h3 className="font-semibold">Rincian Mitra</h3><div className="max-h-56 overflow-auto"><table className="w-full text-sm"><thead><tr>{["Nama", "ID", "Hub", "Role", "Hari Hadir", "Tidak Hadir", "Tarif", "Total"].map(x => <th className="p-2 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{selected.details?.mitra.map(m => <tr className="border-t" key={m.idMitra + m.nama}><td className="p-2">{m.nama}</td><td className="p-2">{m.idMitra}</td><td className="p-2">{m.hub}</td><td className="p-2">{m.role}</td><td className="p-2">{m.hariHadir}</td><td className="p-2">{m.hariTidakHadir ?? "-"}</td><td className="p-2">{formatCurrency(m.tarif)}</td><td className="p-2">{formatCurrency(m.totalBiaya)}</td></tr>)}</tbody></table></div>
        <div className="flex items-center justify-between"><h3 className="font-semibold">Data Klaim</h3><Button size="sm" variant="outline" onClick={() => downloadClaims(selected)}>Unduh Data Klaim</Button></div><table className="w-full text-sm"><thead><tr>{["Tanggal", "Jenis", "Keterangan", "Nominal"].map(x => <th className="p-2 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{selected.claims.map(c => <tr className="border-t" key={c.id}><td className="p-2">{dateLabel(c.createdAt)}</td><td className="p-2">{c.jenisClaim}</td><td className="p-2">{c.catatan || "-"}</td><td className="p-2">{formatCurrency(c.nominal)}</td></tr>)}</tbody></table>
        <div className="space-y-1 border-t pt-3 text-right text-sm"><p>Biaya vendor: {formatCurrency(selected.biayaVendor)}</p><p>Total klaim: −{formatCurrency(claimTotal(selected))}</p><p>PPN (11%): {formatCurrency(invoicePpn(selected))}</p><p>PPh (2,5%): −{formatCurrency(invoicePph(selected))}</p><p className="text-lg font-bold">Total tagihan: {formatCurrency(invoiceTotal(selected))}</p>{selected.status === "PUBLISHED" && selected.statusPembayaran !== "PAID" ? <p>Invoice menunggu pembayaran.</p> : null}{selected.statusPembayaran === "PAID" && <p>Dibayar {formatCurrency(selected.nominalPembayaran || 0)} pada {dateLabel(selected.tanggalPembayaran)} · {selected.buktiTransferNama}</p>}{selected.status === "CANCELLED" && <p className="text-red-700">Dibatalkan {dateLabel(selected.cancelledAt)}: {selected.cancellationReason}</p>}</div>
        {isVm && selected.status === "DRAFT" && <form onSubmit={e => void addClaim(e, selected)} className="grid gap-2 rounded-lg border p-3 md:grid-cols-4"><label>Jenis klaim<input required name="jenisClaim" className="mt-1 w-full rounded border bg-background p-2" /></label><label>Nominal<input required min="1" type="number" name="nominal" className="mt-1 w-full rounded border bg-background p-2" /></label><label>Keterangan<input name="catatan" className="mt-1 w-full rounded border bg-background p-2" /></label><Button disabled={busy} className="self-end">Tambah Klaim</Button></form>}
        {selected.status === "DRAFT" && <p className="text-xs text-muted-foreground">Draft: biaya dihitung dari jumlah absensi HADIR × Rp100.000. Pajak dihitung dari biaya vendor; total klaim dikurangkan penuh.</p>}
      </div></div>}
      {paymentId && (() => { const invoice = invoices.find(i => i.id === paymentId); return invoice ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={e => void pay(e, invoice)} className="w-full max-w-md space-y-3 rounded-xl bg-background p-5"><h2 className="text-lg font-bold">Konfirmasi Pembayaran</h2><p>Total invoice: {formatCurrency(invoice.totalTagihan)}</p><label className="block text-sm">Nominal pembayaran<input required type="number" name="nominalPembayaran" defaultValue={invoice.totalTagihan} className="mt-1 w-full rounded border bg-background p-2" /></label><label className="block text-sm">Tanggal pembayaran<input required type="date" name="tanggalPembayaran" className="mt-1 w-full rounded border bg-background p-2" /></label><label className="block text-sm">Bukti transfer<input required type="file" name="proof" accept=".pdf,.jpg,.jpeg,.png" className="mt-1 w-full" /></label><label className="block text-sm">Keterangan (opsional)<input name="catatanPembayaran" className="mt-1 w-full rounded border bg-background p-2" /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPaymentId(null)}>Batal</Button><Button disabled={busy}>Konfirmasi Paid</Button></div></form></div> : null; })()}
    </div>
  </DashboardLayout>;
}

export function ClaimsManagementPage() {
  return <InvoiceManagementPage />;
}
