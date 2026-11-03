"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

interface ApiState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Vendor {
  id: string;
  name: string;
  status: string;
  _count?: { users: number };
}

interface Mitra {
  id: string;
  name: string;
  email: string;
  status: string;
  phone?: string | null;
  vendor?: { name: string } | null;
  mitraProfile?: { posisi?: string | null; penempatan?: string | null } | null;
}

interface AccountRequest {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  catatan?: string | null;
  requester?: { name: string; role: string };
  handler?: { name: string; role: string } | null;
}

interface Claim {
  id: string;
  bulan: string;
  jenisClaim: string;
  jumlahMitra: number;
  nominal: number;
  status: string;
  vendor?: { name: string };
}

interface Invoice {
  id: string;
  nomorInvoice: string;
  bulan: string;
  totalAmount: number;
  status: string;
  tanggalJatuhTempo?: string | null;
  vendor?: { name: string };
}

interface OSRequest {
  id: string;
  type: string;
  status: string;
  jumlah: number;
  posisi?: string | null;
  penempatan?: string | null;
  alasan?: string | null;
  requester?: { name: string; role: string };
  vendor?: { name: string } | null;
}

interface Approval {
  id: string;
  status: string;
  level: string;
  catatan?: string | null;
  osRequest: OSRequest;
}

function useApiData<T>(url: string, initialData: T): ApiState<T> {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `Permintaan gagal (${response.status})`);
        }
        return response.json() as Promise<T>;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat data");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, url]);

  return { data, loading, error, reload: () => setRevision((value) => value + 1) };
}

async function sendJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Permintaan gagal (${response.status})`);
  }
  return result;
}

function FeaturePage({
  title,
  description,
  roles,
  children,
}: {
  title: string;
  description: string;
  roles: string[];
  children: ReactNode;
}) {
  return (
    <DashboardLayout allowedRoles={roles}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function LoadingError({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
}) {
  if (loading) return <p className="p-6 text-muted-foreground">Memuat data...</p>;
  if (error) return <p role="alert" className="p-6 text-red-600">{error}</p>;
  if (empty) return <p className="p-6 text-muted-foreground">Belum ada data.</p>;
  return null;
}

function FormError({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null;
}

const fieldClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function MitraManagementPage() {
  const mitras = useApiData<Mitra[]>("/api/mitra", []);
  return (
    <FeaturePage title="Data Mitra OS" description="Daftar mitra yang terdaftar pada vendor Anda." roles={["VENDOR", "VM"]}>
      <Card><CardContent className="p-0">
        <LoadingError loading={mitras.loading} error={mitras.error} empty={!mitras.data.length} />
        {!mitras.loading && !mitras.error && mitras.data.length > 0 && (
          <DataTable headers={["Nama", "Email", "Vendor", "Posisi", "Penempatan", "Status"]}>
            {mitras.data.map((mitra) => (
              <TableRow key={mitra.id}>
                <TableCell>{mitra.name}</TableCell><TableCell>{mitra.email}</TableCell>
                <TableCell>{mitra.vendor?.name || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.posisi || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.penempatan || "-"}</TableCell>
                <TableCell><StatusBadge status={mitra.status} /></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function VendorSelectionPage() {
  const requests = useApiData<OSRequest[]>("/api/os-request", []);
  const vendors = useApiData<Vendor[]>("/api/vendor", []);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function assignVendor(requestId: string) {
    const vendorId = selections[requestId];
    if (!vendorId) {
      setError("Pilih vendor terlebih dahulu.");
      return;
    }
    setError(null);
    setBusyId(requestId);
    try {
      await sendJson(`/api/os-request/${requestId}`, "PATCH", { action: "SELECT_VENDOR", vendorId });
      requests.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memilih vendor.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FeaturePage title="Pilih Vendor" description="Tentukan vendor untuk request OS yang siap diproses." roles={["VM"]}>
      <FormError error={error} />
      <Card><CardContent className="p-0">
        <LoadingError loading={requests.loading || vendors.loading} error={requests.error || vendors.error} empty={!requests.data.some((item) => item.status === "APPROVED_COO")} />
        {!requests.loading && !requests.error && requests.data.filter((item) => item.status === "APPROVED_COO").length > 0 && (
          <DataTable headers={["Tipe", "Jumlah", "Posisi", "Penempatan", "Pemohon", "Vendor", "Aksi"]}>
            {requests.data.filter((item) => item.status === "APPROVED_COO").map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.type}</TableCell><TableCell>{item.jumlah}</TableCell>
                <TableCell>{item.posisi || "-"}</TableCell><TableCell>{item.penempatan || "-"}</TableCell>
                <TableCell>{item.requester?.name || "-"}</TableCell>
                <TableCell>
                  <select className={fieldClass} value={selections[item.id] || ""} onChange={(event) => setSelections({ ...selections, [item.id]: event.target.value })}>
                    <option value="">Pilih vendor</option>
                    {vendors.data.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                  </select>
                </TableCell>
                <TableCell><Button disabled={busyId === item.id} onClick={() => assignVendor(item.id)}>{busyId === item.id ? "Menyimpan..." : "Pilih"}</Button></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function AccountApprovalPage() {
  const requests = useApiData<AccountRequest[]>("/api/account-request", []);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(requestId: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setBusyId(requestId);
    try {
      await sendJson("/api/account-request", "PATCH", { requestId, status });
      requests.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memproses request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FeaturePage title="Approval Akun" description="Tinjau permintaan pembuatan akun mitra dari vendor." roles={["VM"]}>
      <FormError error={error} />
      <Card><CardContent className="p-0">
        <LoadingError loading={requests.loading} error={requests.error} empty={!requests.data.some((item) => item.status === "PENDING")} />
        {!requests.loading && !requests.error && requests.data.filter((item) => item.status === "PENDING").length > 0 && (
          <DataTable headers={["Nama", "Email", "Telepon", "Vendor/Pemohon", "Status", "Aksi"]}>
            {requests.data.filter((item) => item.status === "PENDING").map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell><TableCell>{item.email}</TableCell>
                <TableCell>{item.phone || "-"}</TableCell><TableCell>{item.requester?.name || "-"}</TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell className="space-x-2">
                  <Button disabled={busyId === item.id} onClick={() => decide(item.id, "APPROVED")}>Setujui</Button>
                  <Button variant="outline" disabled={busyId === item.id} onClick={() => decide(item.id, "REJECTED")}>Tolak</Button>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function ClaimsPage() {
  const { data: session } = useSession();
  const claims = useApiData<Claim[]>("/api/claim", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await sendJson("/api/claim", "POST", {
        bulan: form.get("bulan"),
        jenisClaim: form.get("jenisClaim"),
        jumlahMitra: Number(form.get("jumlahMitra")),
        nominal: Number(form.get("nominal")),
        catatan: form.get("catatan"),
      });
      event.currentTarget.reset();
      claims.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim klaim.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage title="Daftar Klaim" description="Lihat klaim atau ajukan klaim bulanan." roles={["VENDOR", "VM"]}>
      {session?.user.role === "VENDOR" && (
        <Card><CardHeader><CardTitle className="text-lg">Ajukan Klaim</CardTitle></CardHeader><CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">Bulan<input className={fieldClass} type="month" name="bulan" required /></label>
            <label className="space-y-1 text-sm">Jenis klaim<input className={fieldClass} name="jenisClaim" placeholder="GAJI, BPJS, LEMBUR..." required /></label>
            <label className="space-y-1 text-sm">Jumlah mitra<input className={fieldClass} type="number" min="1" name="jumlahMitra" required /></label>
            <label className="space-y-1 text-sm">Nominal total<input className={fieldClass} type="number" min="0" step="any" name="nominal" required /></label>
            <label className="space-y-1 text-sm md:col-span-2">Catatan<textarea className={fieldClass} name="catatan" rows={2} /></label>
            <FormError error={error} />
            <Button type="submit" disabled={saving}>{saving ? "Mengirim..." : "Ajukan Klaim"}</Button>
          </form>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <LoadingError loading={claims.loading} error={claims.error} empty={!claims.data.length} />
        {!claims.loading && !claims.error && claims.data.length > 0 && (
          <DataTable headers={["Bulan", "Jenis", "Jumlah Mitra", "Nominal", "Vendor", "Status"]}>
            {claims.data.map((item) => <TableRow key={item.id}><TableCell>{item.bulan}</TableCell><TableCell>{item.jenisClaim}</TableCell><TableCell>{item.jumlahMitra}</TableCell><TableCell>{item.nominal.toLocaleString("id-ID")}</TableCell><TableCell>{item.vendor?.name || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function InvoicesPage() {
  const { data: session } = useSession();
  const invoices = useApiData<Invoice[]>("/api/invoice", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await sendJson("/api/invoice", "POST", {
        bulan: form.get("bulan"),
        totalAmount: Number(form.get("totalAmount")),
        tanggalJatuhTempo: form.get("tanggalJatuhTempo") || undefined,
        catatan: form.get("catatan"),
      });
      event.currentTarget.reset();
      invoices.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage title="Invoice" description="Lihat invoice vendor atau kirim invoice baru." roles={["VENDOR", "VM"]}>
      {session?.user.role === "VENDOR" && (
        <Card><CardHeader><CardTitle className="text-lg">Buat Invoice</CardTitle></CardHeader><CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">Bulan<input className={fieldClass} type="month" name="bulan" required /></label>
            <label className="space-y-1 text-sm">Total tagihan<input className={fieldClass} type="number" min="0" step="any" name="totalAmount" required /></label>
            <label className="space-y-1 text-sm">Jatuh tempo<input className={fieldClass} type="date" name="tanggalJatuhTempo" /></label>
            <label className="space-y-1 text-sm">Catatan<input className={fieldClass} name="catatan" /></label>
            <FormError error={error} />
            <Button type="submit" disabled={saving}>{saving ? "Mengirim..." : "Kirim Invoice"}</Button>
          </form>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <LoadingError loading={invoices.loading} error={invoices.error} empty={!invoices.data.length} />
        {!invoices.loading && !invoices.error && invoices.data.length > 0 && (
          <DataTable headers={["Nomor", "Bulan", "Vendor", "Total", "Jatuh Tempo", "Status"]}>
            {invoices.data.map((item) => <TableRow key={item.id}><TableCell>{item.nomorInvoice}</TableCell><TableCell>{item.bulan}</TableCell><TableCell>{item.vendor?.name || "-"}</TableCell><TableCell>{item.totalAmount.toLocaleString("id-ID")}</TableCell><TableCell>{item.tanggalJatuhTempo ? new Date(item.tanggalJatuhTempo).toLocaleDateString("id-ID") : "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function AccountRequestPage() {
  const requests = useApiData<AccountRequest[]>("/api/account-request", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await sendJson("/api/account-request", "POST", {
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
      });
      event.currentTarget.reset();
      requests.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengajukan akun.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage title="Ajukan Akun Mitra" description="Kirim permintaan pembuatan akun mitra kepada Vendor Manager." roles={["VENDOR"]}>
      <Card><CardHeader><CardTitle className="text-lg">Data Mitra Baru</CardTitle></CardHeader><CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">Nama<input className={fieldClass} name="name" required /></label>
          <label className="space-y-1 text-sm">Email<input className={fieldClass} name="email" type="email" required /></label>
          <label className="space-y-1 text-sm">Telepon<input className={fieldClass} name="phone" type="tel" /></label>
          <FormError error={error} />
          <Button type="submit" disabled={saving}>{saving ? "Mengirim..." : "Ajukan Akun"}</Button>
        </form>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <LoadingError loading={requests.loading} error={requests.error} empty={!requests.data.length} />
        {!requests.loading && !requests.error && requests.data.length > 0 && (
          <DataTable headers={["Nama", "Email", "Telepon", "Status", "Catatan"]}>
            {requests.data.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.email}</TableCell><TableCell>{item.phone || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell>{item.catatan || "-"}</TableCell></TableRow>)}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function OSRequestPage() {
  const { data: session } = useSession();
  const requests = useApiData<OSRequest[]>("/api/os-request", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await sendJson("/api/os-request", "POST", {
        type: form.get("type"),
        jumlah: Number(form.get("jumlah")),
        posisi: form.get("posisi"),
        penempatan: form.get("penempatan"),
        alasan: form.get("alasan"),
      });
      event.currentTarget.reset();
      requests.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage title="Request OS" description="Ajukan atau pantau permintaan tenaga outsourcing." roles={["SM", "VM"]}>
      {session?.user.role === "SM" && (
        <Card><CardHeader><CardTitle className="text-lg">Buat Request OS</CardTitle></CardHeader><CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">Jenis request<select className={fieldClass} name="type"><option value="PENAMBAHAN">Penambahan</option><option value="PERGANTIAN">Pergantian</option><option value="PENGURANGAN">Pengurangan</option></select></label>
            <label className="space-y-1 text-sm">Jumlah<input className={fieldClass} type="number" min="1" name="jumlah" defaultValue="1" required /></label>
            <label className="space-y-1 text-sm">Posisi<input className={fieldClass} name="posisi" /></label>
            <label className="space-y-1 text-sm">Penempatan<input className={fieldClass} name="penempatan" /></label>
            <label className="space-y-1 text-sm md:col-span-2">Alasan<textarea className={fieldClass} name="alasan" rows={3} /></label>
            <FormError error={error} />
            <Button type="submit" disabled={saving}>{saving ? "Mengirim..." : "Kirim Request"}</Button>
          </form>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <LoadingError loading={requests.loading} error={requests.error} empty={!requests.data.length} />
        {!requests.loading && !requests.error && requests.data.length > 0 && (
          <DataTable headers={["Jenis", "Jumlah", "Posisi", "Penempatan", "Pemohon", "Vendor", "Status"]}>
            {requests.data.map((item) => <TableRow key={item.id}><TableCell>{item.type}</TableCell><TableCell>{item.jumlah}</TableCell><TableCell>{item.posisi || "-"}</TableCell><TableCell>{item.penempatan || "-"}</TableCell><TableCell>{item.requester?.name || "-"}</TableCell><TableCell>{item.vendor?.name || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}

export function ApprovalPage() {
  const approvals = useApiData<Approval[]>("/api/approval", []);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(approvalId: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setBusyId(approvalId);
    try {
      await sendJson("/api/approval", "POST", { approvalId, status });
      approvals.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memproses approval.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FeaturePage title="Approval Request" description="Tinjau dan berikan keputusan untuk request OS." roles={["GM", "COO"]}>
      <FormError error={error} />
      <Card><CardContent className="p-0">
        <LoadingError loading={approvals.loading} error={approvals.error} empty={!approvals.data.length} />
        {!approvals.loading && !approvals.error && approvals.data.length > 0 && (
          <DataTable headers={["Level", "Jenis", "Jumlah", "Posisi", "Pemohon", "Status", "Aksi"]}>
            {approvals.data.map((item) => <TableRow key={item.id}><TableCell>{item.level}</TableCell><TableCell>{item.osRequest.type}</TableCell><TableCell>{item.osRequest.jumlah}</TableCell><TableCell>{item.osRequest.posisi || "-"}</TableCell><TableCell>{item.osRequest.requester?.name || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell>{item.status === "PENDING" && <div className="flex gap-2"><Button disabled={busyId === item.id} onClick={() => decide(item.id, "APPROVED")}>Setujui</Button><Button variant="outline" disabled={busyId === item.id} onClick={() => decide(item.id, "REJECTED")}>Tolak</Button></div>}</TableCell></TableRow>)}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}
