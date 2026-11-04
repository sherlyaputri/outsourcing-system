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
  mitraProfile?: {
    idMitraOs?: string | null;
    posisi?: string | null;
    penempatan?: string | null;
  } | null;
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
  candidate?: {
    id: string;
    nik?: string | null;
    fotoKtp?: string | null;
    jenisSim?: string | null;
    noSim?: string | null;
    fotoSim?: string | null;
    osRequest: { id: string; type: string; jumlah: number; posisi?: string | null; penempatan?: string | null; waktuKerja?: string | null };
  } | null;
}

interface Claim {
  id: string;
  bulan: string;
  jenisClaim: string;
  jumlahMitra: number;
  nominal: number;
  status: string;
  hasDokumen: boolean;
  dokumenNama?: string | null;
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
  idPergantian?: string | null;
  idMitraOs?: string | null;
  posisi?: string | null;
  penempatan?: string | null;
  waktuKerja?: string | null;
  alasan?: string | null;
  vendorId?: string | null;
  requester?: { name: string; role: string };
  vendor?: { name: string } | null;
}

function getOSRequestStatus(status: string) {
  const statuses: Record<string, string> = {
    PENDING: "OS_WAITING_GM",
    APPROVED_GM: "OS_WAITING_COO",
    APPROVED_COO: "OS_WAITING_ACTIVATION",
    VENDOR_SELECTED: "OS_WAITING_ACTIVATION",
    IN_PROGRESS: "OS_WAITING_ACTIVATION",
  };
  return statuses[status] || status;
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
  const { data: session } = useSession();
  const mitras = useApiData<Mitra[]>("/api/mitra", []);
  return (
    <FeaturePage title="Data Mitra OS" description="Daftar mitra OS dan ID yang digunakan untuk request pergantian atau pengurangan." roles={["VENDOR", "VM", "SM"]}>
      <Card><CardContent className="p-0">
        <LoadingError loading={mitras.loading} error={mitras.error} empty={!mitras.data.length} />
        {!mitras.loading && !mitras.error && mitras.data.length > 0 && (
          <DataTable headers={["ID Mitra OS", "Nama", "Email", "Vendor", "Posisi", "Penempatan", "Status"]}>
            {mitras.data.map((mitra) => (
              <TableRow key={mitra.id}>
                <TableCell>
                  {session?.user.role === "VENDOR" ? (
                    <MitraIdEditor mitra={mitra} onSaved={mitras.reload} />
                  ) : (
                    mitra.mitraProfile?.idMitraOs || "-"
                  )}
                </TableCell>
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

function MitraIdEditor({ mitra, onSaved }: { mitra: Mitra; onSaved: () => void }) {
  const [idMitraOs, setIdMitraOs] = useState(mitra.mitraProfile?.idMitraOs || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await sendJson("/api/mitra", "PUT", { userId: mitra.id, idMitraOs });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan ID Mitra OS.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-40 space-y-1">
      <input
        className={fieldClass}
        value={idMitraOs}
        onChange={(event) => setIdMitraOs(event.target.value)}
        aria-label={`ID Mitra OS untuk ${mitra.name}`}
        placeholder="Contoh: 123"
      />
      <button type="button" disabled={saving} className="text-xs font-medium text-primary underline disabled:opacity-50" onClick={save}>
        {saving ? "Menyimpan..." : "Simpan ID"}
      </button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function MitraIdPicker({
  mitras,
  value,
  onChange,
}: {
  mitras: Mitra[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedMitra = mitras.find((mitra) => mitra.mitraProfile?.idMitraOs === value);
  const matches = query.trim()
    ? mitras.filter((mitra) => mitra.status === "ACTIVE").filter((mitra) => {
        const code = mitra.mitraProfile?.idMitraOs || "";
        const search = query.trim().toLocaleLowerCase();
        return code.toLocaleLowerCase().includes(search) || mitra.name.toLocaleLowerCase().includes(search);
      }).slice(0, 8)
    : [];

  return (
    <div className="relative space-y-1 text-sm">
      <label htmlFor="idMitraOs" className="font-medium">ID Mitra OS</label>
      <input
        id="idMitraOs"
        className={fieldClass}
        value={selectedMitra ? `${selectedMitra.mitraProfile?.idMitraOs} - ${selectedMitra.name}` : query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Ketik ID atau nama mitra"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls="mitra-os-options"
        aria-autocomplete="list"
        required
      />
      {open && matches.length > 0 && (
        <ul id="mitra-os-options" role="listbox" className="absolute z-20 max-h-56 w-full overflow-auto rounded-md border bg-white py-1 shadow-lg">
          {matches.map((mitra) => (
            <li key={mitra.id} role="option" aria-selected={mitra.mitraProfile?.idMitraOs === value}>
              <button
                type="button"
                disabled={!mitra.mitraProfile?.idMitraOs}
                className="w-full px-3 py-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const code = mitra.mitraProfile?.idMitraOs;
                  if (code) {
                    onChange(code);
                    setQuery("");
                    setOpen(false);
                  }
                }}
              >
                <span className="font-medium">{mitra.mitraProfile?.idMitraOs || "Belum ada ID Mitra OS"}</span>
                <span className="text-muted-foreground"> — {mitra.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedMitra && <input type="hidden" name="idMitraOs" value={value} />}
      {open && query && matches.length === 0 && (
        <p className="text-xs text-muted-foreground">Tidak ada mitra dengan ID atau nama tersebut.</p>
      )}
    </div>
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
          <DataTable headers={["Nama", "Email", "Telepon", "Vendor/Pemohon", "Request OS", "Status", "Aksi"]}>
            {requests.data.filter((item) => item.status === "PENDING").map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.name}
                  {item.candidate && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-primary">Lihat data kandidat</summary>
                      <div className="mt-2 space-y-2">
                        <p>NIK: {item.candidate.nik || "-"}</p>
                        <p>SIM: {item.candidate.jenisSim || "-"} · {item.candidate.noSim || "-"}</p>
                        <p>Posisi: {item.candidate.osRequest.posisi || "-"} · Wilayah: {item.candidate.osRequest.penempatan || "-"} · Waktu: {item.candidate.osRequest.waktuKerja || "-"}</p>
                        <div className="flex gap-3">
                          {item.candidate.fotoKtp && <img className="h-24 rounded border object-contain" src={item.candidate.fotoKtp} alt="Foto KTP kandidat" />}
                          {item.candidate.fotoSim && <img className="h-24 rounded border object-contain" src={item.candidate.fotoSim} alt="Foto SIM kandidat" />}
                        </div>
                      </div>
                    </details>
                  )}
                </TableCell><TableCell>{item.email}</TableCell>
                <TableCell>{item.phone || "-"}</TableCell><TableCell>{item.requester?.name || "-"}</TableCell>
                <TableCell>{item.candidate ? `${item.candidate.osRequest.type} · ${item.candidate.osRequest.jumlah} orang` : "-"}</TableCell>
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
  const vendors = useApiData<Vendor[]>("/api/vendor", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function readDocument(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Dokumen gagal dibaca."));
      };
      reader.onerror = () => reject(new Error("Dokumen gagal dibaca."));
      reader.readAsDataURL(file);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const file = form.get("dokumen");
      if (!(file instanceof File) || file.size === 0) {
        throw new Error("Pilih dokumen klaim untuk diunggah.");
      }
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        throw new Error("Dokumen harus berupa PDF, JPG, atau PNG.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran dokumen maksimal 5 MB.");
      }
      await sendJson("/api/claim", "POST", {
        vendorId: form.get("vendorId"),
        bulan: form.get("bulan"),
        jenisClaim: form.get("jenisClaim"),
        jumlahMitra: Number(form.get("jumlahMitra")),
        nominal: Number(form.get("nominal")),
        catatan: form.get("catatan"),
        dokumen: await readDocument(file),
        dokumenNama: file.name,
      });
      formElement.reset();
      claims.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim klaim.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage title="Daftar Klaim" description="VM mengunggah data klaim beserta dokumennya. Vendor dapat melihat klaim miliknya." roles={["VENDOR", "VM"]}>
      {session?.user.role === "VM" && (
        <Card><CardHeader><CardTitle className="text-lg">Upload Data Klaim</CardTitle></CardHeader><CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">Vendor
              <select className={fieldClass} name="vendorId" required defaultValue="">
                <option value="" disabled>Pilih vendor</option>
                {vendors.data.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">Bulan<input className={fieldClass} type="month" name="bulan" required /></label>
            <label className="space-y-1 text-sm">Jenis klaim<input className={fieldClass} name="jenisClaim" placeholder="GAJI, BPJS, LEMBUR..." required /></label>
            <label className="space-y-1 text-sm">Jumlah mitra<input className={fieldClass} type="number" min="1" name="jumlahMitra" required /></label>
            <label className="space-y-1 text-sm">Nominal total<input className={fieldClass} type="number" min="0" step="any" name="nominal" required /></label>
            <label className="space-y-1 text-sm md:col-span-2">Catatan<textarea className={fieldClass} name="catatan" rows={2} /></label>
            <label className="space-y-1 text-sm md:col-span-2">Dokumen klaim (PDF/JPG/PNG, maks. 5 MB)<input className={fieldClass} type="file" name="dokumen" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /></label>
            <FormError error={error} />
            {vendors.error && <FormError error={`Data vendor gagal dimuat: ${vendors.error}`} />}
            <Button type="submit" disabled={saving || vendors.loading}>{saving ? "Mengunggah..." : "Upload Klaim"}</Button>
          </form>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <LoadingError loading={claims.loading} error={claims.error} empty={!claims.data.length} />
        {!claims.loading && !claims.error && claims.data.length > 0 && (
          <DataTable headers={["Bulan", "Jenis", "Jumlah Mitra", "Nominal", "Vendor", "Dokumen", "Status"]}>
            {claims.data.map((item) => <TableRow key={item.id}><TableCell>{item.bulan}</TableCell><TableCell>{item.jenisClaim}</TableCell><TableCell>{item.jumlahMitra}</TableCell><TableCell>{item.nominal.toLocaleString("id-ID")}</TableCell><TableCell>{item.vendor?.name || "-"}</TableCell><TableCell>{item.hasDokumen ? <a className="text-primary underline" href={`/api/claim/${item.id}`} target="_blank" rel="noreferrer">{item.dokumenNama || "Unduh"}</a> : "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await sendJson("/api/invoice", "POST", {
        bulan: form.get("bulan"),
        totalAmount: Number(form.get("totalAmount")),
        tanggalJatuhTempo: form.get("tanggalJatuhTempo") || undefined,
        catatan: form.get("catatan"),
      });
      formElement.reset();
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await sendJson("/api/account-request", "POST", {
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
      });
      formElement.reset();
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
  const mitras = useApiData<Mitra[]>("/api/mitra", []);
  const vendors = useApiData<Vendor[]>("/api/vendor", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestType, setRequestType] = useState("PENAMBAHAN");
  const [selectedMitraId, setSelectedMitraId] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const needsMitraId = requestType === "PERGANTIAN" || requestType === "PENGURANGAN";

  async function assignVendor(requestId: string) {
    const vendorId = selectedVendors[requestId];
    if (!vendorId) {
      setError("Pilih vendor untuk request OS terlebih dahulu.");
      return;
    }

    setError(null);
    setAssigningId(requestId);
    try {
      await sendJson(`/api/os-request/${requestId}`, "PATCH", {
        action: "SELECT_VENDOR",
        vendorId,
      });
      requests.reload();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Gagal memilih vendor.");
    } finally {
      setAssigningId(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (needsMitraId && !selectedMitraId) {
      setError("Pilih ID Mitra OS dari daftar terlebih dahulu.");
      return;
    }
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await sendJson("/api/os-request", "POST", {
        type: form.get("type"),
        jumlah: Number(form.get("jumlah")),
        idMitraOs: needsMitraId ? selectedMitraId : null,
        posisi: form.get("posisi"),
        penempatan: form.get("penempatan"),
        waktuKerja: form.get("waktuKerja"),
      });
      formElement.reset();
      setRequestType("PENAMBAHAN");
      setSelectedMitraId("");
      requests.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage title="Request OS" description="Ajukan atau pantau permintaan tenaga outsourcing." roles={["SM", "VM"]}>
      {session?.user.role === "VM" && <FormError error={error} />}
      {session?.user.role === "SM" && (
        <Card><CardHeader><CardTitle className="text-lg">Buat Request OS</CardTitle></CardHeader><CardContent>
          <form id="os-request-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              Jenis Permintaan
              <select
                className={fieldClass}
                name="type"
                value={requestType}
                onChange={(event) => {
                  setRequestType(event.target.value);
                  setSelectedMitraId("");
                }}
              >
                <option value="PENAMBAHAN">Penambahan</option>
                <option value="PERGANTIAN">Pergantian</option>
                <option value="PENGURANGAN">Pengurangan</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Jumlah
              <input className={fieldClass} type="number" min="1" name="jumlah" defaultValue="1" required />
            </label>
            {needsMitraId ? (
              <MitraIdPicker mitras={mitras.data} value={selectedMitraId} onChange={setSelectedMitraId} />
            ) : (
              <div aria-hidden="true" className="min-h-[65px]" />
            )}
            <label className="space-y-1 text-sm">
              Posisi Kebutuhan
              <select className={fieldClass} name="posisi" required defaultValue="">
                <option value="" disabled>Pilih posisi</option>
                <option value="OS001: Sorter">OS001: Sorter</option>
                <option value="OS002: Driver Delivery & Pickup">OS002: Driver Delivery &amp; Pickup</option>
                <option value="OS003: Kurir Perpaket">OS003: Kurir Perpaket</option>
                <option value="OS004: Kurir Dedicated">OS004: Kurir Dedicated</option>
                <option value="OS005: Driver Ondemand">OS005: Driver Ondemand</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Wilayah Operasional
              <select className={fieldClass} name="penempatan" required defaultValue="">
                <option value="" disabled>Pilih wilayah</option>
                <option value="kantor1">kantor1</option>
                <option value="kantor2">kantor2</option>
                <option value="kantor3">kantor3</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Waktu Kerja
              <select className={fieldClass} name="waktuKerja" required defaultValue="">
                <option value="" disabled>Pilih waktu kerja</option>
                <option value="08:00-17:00">08:00-17:00</option>
                <option value="20:00-05:00">20:00-05:00</option>
              </select>
            </label>
            <FormError error={error} />
            {needsMitraId && mitras.error && <FormError error={`Data Mitra OS gagal dimuat: ${mitras.error}`} />}
          </form>
          <div className="mt-6 flex justify-end border-t pt-4">
            <Button type="submit" form="os-request-form" disabled={saving || (needsMitraId && mitras.loading)}>
              {saving ? "Mengirim..." : "Kirim Request"}
            </Button>
          </div>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <LoadingError loading={requests.loading} error={requests.error} empty={!requests.data.length} />
        {!requests.loading && !requests.error && requests.data.length > 0 && (
          <DataTable headers={["Jenis", "Jumlah", "ID Mitra OS", "Posisi", "Wilayah Operasional", "Waktu Kerja", "Pemohon", "Vendor", "Status"]}>
            {requests.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.jumlah}</TableCell>
                <TableCell>{(item.type === "PERGANTIAN" || item.type === "PENGURANGAN") ? item.idMitraOs || item.idPergantian || "-" : "-"}</TableCell>
                <TableCell>{item.posisi || "-"}</TableCell>
                <TableCell>{item.penempatan || "-"}</TableCell>
                <TableCell>{item.waktuKerja || "-"}</TableCell>
                <TableCell>{item.requester?.name || "-"}</TableCell>
                <TableCell>
                  {session?.user.role === "VM" && item.status === "APPROVED_COO" ? (
                    <div className="flex min-w-48 gap-2">
                      <select
                        className={fieldClass}
                        value={selectedVendors[item.id] || ""}
                        onChange={(event) => setSelectedVendors({ ...selectedVendors, [item.id]: event.target.value })}
                      >
                        <option value="">Pilih vendor</option>
                        {vendors.data.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                      </select>
                      <Button disabled={assigningId === item.id || vendors.loading} onClick={() => assignVendor(item.id)}>
                        {assigningId === item.id ? "Menyimpan..." : "Pilih"}
                      </Button>
                    </div>
                  ) : item.vendor?.name || "-"}
                </TableCell>
                <TableCell><StatusBadge status={getOSRequestStatus(item.status)} /></TableCell>
              </TableRow>
            ))}
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
