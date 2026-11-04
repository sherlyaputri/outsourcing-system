"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    alamat?: string | null;
    kelurahan?: string | null;
    kecamatan?: string | null;
    kabKota?: string | null;
    provinsi?: string | null;
    fotoKtp?: string | null;
    jenisSim?: string | null;
    noSim?: string | null;
    fotoSim?: string | null;
    namaBank?: string | null;
    noRekening?: string | null;
    nik?: string | null;
    id?: string;
    tempatLahir?: string | null;
    tanggalLahir?: string | null;
    noBpjs?: string | null;
    documents?: { id: string; name: string; mimeType: string; createdAt: string }[];
  } | null;
}

interface OSCandidate {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  nik?: string | null;
  fotoKtp?: string | null;
  jenisSim?: string | null;
  noSim?: string | null;
  fotoSim?: string | null;
  alamat?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kabKota?: string | null;
  provinsi?: string | null;
  status: string;
  accountRequest?: { status: string } | null;
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
    alamat?: string | null;
    kelurahan?: string | null;
    kecamatan?: string | null;
    kabKota?: string | null;
    provinsi?: string | null;
    osRequest: { id: string; type: string; jumlah: number; posisi?: string | null; penempatan?: string | null; waktuKerja?: string | null };
  } | null;
}

interface CandidateDraft {
  name: string;
  nik: string;
  fotoKtp: File | null;
  jenisSim: string;
  noSim: string;
  fotoSim: File | null;
  phone: string;
  email: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kabKota: string;
  provinsi: string;
}

interface Region {
  id: string;
  name: string;
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
  hasDokumen: boolean;
  dokumenNama?: string | null;
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
  candidates?: OSCandidate[];
}

function getOSRequestStatus(status: string) {
  const statuses: Record<string, string> = {
    PENDING: "OS_WAITING_GM",
    APPROVED_GM: "OS_WAITING_COO",
    APPROVED_COO: "OS_WAITING_ACTIVATION",
    VENDOR_SELECTED: "OS_WAITING_VENDOR_DATA",
    IN_PROGRESS: "OS_WAITING_SELECTION",
    WAITING_SELECTION: "OS_WAITING_SELECTION",
    WAITING_ACTIVATION: "OS_WAITING_ACTIVATION",
    NOT_SELECTED: "OS_NOT_SELECTED",
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

function RequiredMark() {
  return <span aria-label="wajib diisi" className="font-bold text-red-600"> *</span>;
}

function OptionalMark() {
  return <span className="text-xs text-muted-foreground"> (Opsional)</span>;
}

const fieldClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function MitraManagementPage() {
  const { data: session } = useSession();
  const mitras = useApiData<Mitra[]>("/api/mitra", []);
  const [editingMitra, setEditingMitra] = useState<Mitra | null>(null);
  return (
    <FeaturePage title="Data Mitra OS" description="Daftar mitra OS dan ID yang digunakan untuk request pergantian atau pengurangan." roles={["VENDOR", "VM", "SM"]}>
      <Card><CardContent className="p-0">
        <LoadingError loading={mitras.loading} error={mitras.error} empty={!mitras.data.length} />
        {!mitras.loading && !mitras.error && mitras.data.length > 0 && (
          <DataTable headers={["ID Mitra OS", "Nama", "Email", "Vendor", "Posisi", "Penempatan", "Detail Data", "Status"]}>
            {mitras.data.map((mitra) => (
              <TableRow key={mitra.id}>
                <TableCell>
                  {mitra.mitraProfile?.idMitraOs || "-"}
                </TableCell>
                <TableCell>{mitra.name}</TableCell><TableCell>{mitra.email}</TableCell>
                <TableCell>{mitra.vendor?.name || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.posisi || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.penempatan || "-"}</TableCell>
                <TableCell>
                  {session?.user.role === "VENDOR" && mitra.mitraProfile && (
                    <details>
                      <summary className="cursor-pointer text-primary">Lihat</summary>
                      <div className="mt-2 min-w-56 space-y-1 text-xs">
                        <p>Alamat: {[mitra.mitraProfile.provinsi, mitra.mitraProfile.kabKota, mitra.mitraProfile.kecamatan, mitra.mitraProfile.kelurahan, mitra.mitraProfile.alamat].filter(Boolean).join(", ") || "-"}</p>
                        <p>SIM: {mitra.mitraProfile.jenisSim || "-"} · {mitra.mitraProfile.noSim || "-"}</p>
                        <p>Bank: {mitra.mitraProfile.namaBank || "-"} · Rekening: {mitra.mitraProfile.noRekening || "-"}</p>
                        {mitra.mitraProfile.documents?.map((document) => (
                          <p key={document.id}>
                            <a
                              className="text-primary underline"
                              href={`/api/mitra/${mitra.id}/documents/${document.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {document.name}
                            </a>
                          </p>
                        ))}
                        <div className="flex gap-2">
                          {mitra.mitraProfile.fotoKtp && <img className="h-20 rounded border object-contain" src={mitra.mitraProfile.fotoKtp} alt="Foto KTP" />}
                          {mitra.mitraProfile.fotoSim && <img className="h-20 rounded border object-contain" src={mitra.mitraProfile.fotoSim} alt="Foto SIM" />}
                        </div>
                      </div>
                    </details>
                  )}
                  {session?.user.role !== "VENDOR" && "-"}
                  {session?.user.role === "VENDOR" && (
                    <Button className="mt-2" size="sm" variant="outline" onClick={() => setEditingMitra(mitra)}>
                      Edit data
                    </Button>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={mitra.status} /></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
      {editingMitra && (
        <MitraEditDialog
          mitra={editingMitra}
          onClose={() => setEditingMitra(null)}
          onSaved={() => {
            setEditingMitra(null);
            mitras.reload();
          }}
        />
      )}
    </FeaturePage>
  );
}

function MitraEditDialog({
  mitra,
  onClose,
  onSaved,
}: {
  mitra: Mitra;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const files = form.getAll("documents").filter((file): file is File => file instanceof File && file.size > 0);
      for (const file of files) {
        if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
          throw new Error("Dokumen harus berupa PDF, JPG, atau PNG.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Ukuran setiap dokumen maksimal 5 MB.");
        }
      }

      const documents = await Promise.all(files.map(async (file) => ({
        name: file.name,
        content: await readImage(file),
      })));
      const fotoKtp = form.get("fotoKtp");
      const fotoSim = form.get("fotoSim");

      await sendJson("/api/mitra", "PUT", {
        userId: mitra.id,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        tempatLahir: form.get("tempatLahir"),
        tanggalLahir: form.get("tanggalLahir"),
        alamat: form.get("alamat"),
        kelurahan: form.get("kelurahan"),
        kecamatan: form.get("kecamatan"),
        kabKota: form.get("kabKota"),
        provinsi: form.get("provinsi"),
        noBpjs: form.get("noBpjs"),
        noRekening: form.get("noRekening"),
        namaBank: form.get("namaBank"),
        penempatan: form.get("penempatan"),
        posisi: form.get("posisi"),
        documents,
        ...(fotoKtp instanceof File && fotoKtp.size > 0 ? { fotoKtp: await readImage(fotoKtp) } : {}),
        ...(fotoSim instanceof File && fotoSim.size > 0 ? { fotoSim: await readImage(fotoSim) } : {}),
      });
      onSaved();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal menyimpan data Mitra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogHeader>
        <DialogTitle>Edit data Mitra OS — {mitra.name}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm">
            <p>ID Mitra OS: <strong>{mitra.mitraProfile?.idMitraOs || "-"}</strong> (otomatis, tidak dapat diubah)</p>
            <p>NIK: <strong>{mitra.mitraProfile?.nik || "-"}</strong> (identitas tetap; koreksi perlu dokumen resmi)</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">Nama Mitra<RequiredMark />
              <input className={fieldClass} name="name" defaultValue={mitra.name} required />
            </label>
            <label className="space-y-1 text-sm">Email akun<RequiredMark />
              <input className={fieldClass} type="email" name="email" defaultValue={mitra.email} required />
            </label>
            <label className="space-y-1 text-sm">No. HP<OptionalMark />
              <input className={fieldClass} name="phone" defaultValue={mitra.phone || ""} />
            </label>
            <label className="space-y-1 text-sm">Tempat lahir<OptionalMark />
              <input className={fieldClass} name="tempatLahir" defaultValue={mitra.mitraProfile?.tempatLahir || ""} />
            </label>
            <label className="space-y-1 text-sm">Tanggal lahir<OptionalMark />
              <input className={fieldClass} type="date" name="tanggalLahir" defaultValue={mitra.mitraProfile?.tanggalLahir?.slice(0, 10) || ""} />
            </label>
            <label className="space-y-1 text-sm">No. BPJS<OptionalMark />
              <input className={fieldClass} name="noBpjs" defaultValue={mitra.mitraProfile?.noBpjs || ""} />
            </label>
            <label className="space-y-1 text-sm">Nama bank<OptionalMark />
              <input className={fieldClass} name="namaBank" defaultValue={mitra.mitraProfile?.namaBank || ""} />
            </label>
            <label className="space-y-1 text-sm">No. rekening<OptionalMark />
              <input className={fieldClass} name="noRekening" defaultValue={mitra.mitraProfile?.noRekening || ""} />
            </label>
            <label className="space-y-1 text-sm">Posisi<OptionalMark />
              <input className={fieldClass} name="posisi" defaultValue={mitra.mitraProfile?.posisi || ""} />
            </label>
            <label className="space-y-1 text-sm">Penempatan<OptionalMark />
              <input className={fieldClass} name="penempatan" defaultValue={mitra.mitraProfile?.penempatan || ""} />
            </label>
            <label className="space-y-1 text-sm">Jenis SIM<OptionalMark />
              <select className={fieldClass} name="jenisSim" defaultValue={mitra.mitraProfile?.jenisSim || ""}>
                <option value="">Pilih jenis SIM</option>
                {["A", "B1", "B2", "C", "D"].map((kind) => <option key={kind} value={kind}>SIM {kind}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">Nomor SIM<OptionalMark />
              <input className={fieldClass} name="noSim" defaultValue={mitra.mitraProfile?.noSim || ""} />
            </label>
            <label className="space-y-1 text-sm">Provinsi<OptionalMark />
              <input className={fieldClass} name="provinsi" defaultValue={mitra.mitraProfile?.provinsi || ""} />
            </label>
            <label className="space-y-1 text-sm">Kabupaten/Kota<OptionalMark />
              <input className={fieldClass} name="kabKota" defaultValue={mitra.mitraProfile?.kabKota || ""} />
            </label>
            <label className="space-y-1 text-sm">Kecamatan<OptionalMark />
              <input className={fieldClass} name="kecamatan" defaultValue={mitra.mitraProfile?.kecamatan || ""} />
            </label>
            <label className="space-y-1 text-sm">Kelurahan/Desa<OptionalMark />
              <input className={fieldClass} name="kelurahan" defaultValue={mitra.mitraProfile?.kelurahan || ""} />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">Alamat tempat tinggal<OptionalMark />
              <textarea className={fieldClass} name="alamat" rows={2} defaultValue={mitra.mitraProfile?.alamat || ""} />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">Dokumen tambahan (PDF/JPG/PNG, maks. 5 MB per file)<OptionalMark />
              <input className={fieldClass} type="file" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
            </label>
            <label className="space-y-1 text-sm">Ganti foto KTP (JPG/PNG, maks. 5 MB)<OptionalMark />
              <input className={fieldClass} type="file" name="fotoKtp" accept="image/jpeg,image/png" />
            </label>
            <label className="space-y-1 text-sm">Ganti foto SIM (JPG/PNG, maks. 5 MB)<OptionalMark />
              <input className={fieldClass} type="file" name="fotoSim" accept="image/jpeg,image/png" />
            </label>
          </div>
          {(mitra.mitraProfile?.documents?.length || 0) > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Dokumen yang sudah diunggah</p>
              {mitra.mitraProfile?.documents?.map((document) => (
                <p key={document.id}>
                  <a
                    className="text-primary underline"
                    href={`/api/mitra/${mitra.id}/documents/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {document.name}
                  </a>
                </p>
              ))}
            </div>
          )}
          <FormError error={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan data"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
      <label htmlFor="idMitraOs" className="font-medium">ID Mitra OS<RequiredMark /></label>
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

function emptyCandidate(): CandidateDraft {
  return {
    name: "",
    nik: "",
    fotoKtp: null,
    jenisSim: "",
    noSim: "",
    fotoSim: null,
    phone: "",
    email: "",
    alamat: "",
    kelurahan: "",
    kecamatan: "",
    kabKota: "",
    provinsi: "",
  };
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Foto gagal dibaca."));
    };
    reader.onerror = () => reject(new Error("Foto gagal dibaca."));
    reader.readAsDataURL(file);
  });
}

function RegionPicker({
  value,
  onChange,
}: {
  value: Pick<CandidateDraft, "provinsi" | "kabKota" | "kecamatan" | "kelurahan">;
  onChange: (field: keyof CandidateDraft, regionName: string) => void;
}) {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [regencies, setRegencies] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/region?level=provinces")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Data provinsi gagal dimuat.");
        return result as Region[];
      })
      .then((result) => { if (active) setProvinces(result); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Data wilayah gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setRegencies([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/region?level=regencies&parentId=${provinceId}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Data kabupaten/kota gagal dimuat.");
        return result as Region[];
      })
      .then((result) => { if (active) { setRegencies(result); setError(null); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Data wilayah gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provinceId]);

  useEffect(() => {
    if (!regencyId) {
      setDistricts([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/region?level=districts&parentId=${regencyId}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Data kecamatan gagal dimuat.");
        return result as Region[];
      })
      .then((result) => { if (active) { setDistricts(result); setError(null); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Data wilayah gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [regencyId]);

  useEffect(() => {
    if (!districtId) {
      setVillages([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/region?level=villages&parentId=${districtId}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Data kelurahan/desa gagal dimuat.");
        return result as Region[];
      })
      .then((result) => { if (active) { setVillages(result); setError(null); } })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Data wilayah gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [districtId]);

  return (
    <div className="space-y-4 md:col-span-2">
      <label className="block space-y-1 text-sm">Provinsi<RequiredMark />
        <select
          className={fieldClass}
          required
          disabled={loading && provinces.length === 0}
          value={provinceId}
          onChange={(event) => {
            const selected = provinces.find((region) => region.id === event.target.value);
            setProvinceId(event.target.value);
            setRegencyId("");
            setDistrictId("");
            onChange("provinsi", selected?.name || "");
            onChange("kabKota", "");
            onChange("kecamatan", "");
            onChange("kelurahan", "");
          }}
        >
          <option value="">Pilih provinsi</option>
          {provinces.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-sm">Kabupaten/Kota<RequiredMark />
        <select
          className={fieldClass}
          value={regencyId}
          required
          disabled={!provinceId || loading}
          onChange={(event) => {
            const selected = regencies.find((region) => region.id === event.target.value);
            setRegencyId(event.target.value);
            setDistrictId("");
            onChange("kabKota", selected?.name || "");
            onChange("kecamatan", "");
            onChange("kelurahan", "");
          }}
        >
          <option value="">Pilih kabupaten/kota</option>
          {regencies.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-sm">Kecamatan<RequiredMark />
        <select
          className={fieldClass}
          value={districtId}
          required
          disabled={!regencyId || loading}
          onChange={(event) => {
            const selected = districts.find((region) => region.id === event.target.value);
            setDistrictId(event.target.value);
            onChange("kecamatan", selected?.name || "");
            onChange("kelurahan", "");
          }}
        >
          <option value="">Pilih kecamatan</option>
          {districts.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-sm">Kelurahan/Desa<RequiredMark />
        <select
          className={fieldClass}
          required
          disabled={!districtId || loading}
          value={villages.find((region) => region.name === value.kelurahan)?.id || ""}
          onChange={(event) => {
            const selected = villages.find((region) => region.id === event.target.value);
            onChange("kelurahan", selected?.name || "");
          }}
        >
          <option value="">Pilih kelurahan/desa</option>
          {villages.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">Pilih wilayah berurutan dari provinsi hingga kelurahan/desa.</p>
      <FormError error={error} />
    </div>
  );
}

function CandidateFields({
  candidate,
  index,
  update,
}: {
  candidate: CandidateDraft;
  index: number;
  update: (index: number, field: keyof CandidateDraft, value: string | File | null) => void;
}) {
  return (
    <fieldset className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Data kandidat {index + 1}</legend>
      <label className="space-y-1 text-sm">Nama Mitra<RequiredMark />
        <input className={fieldClass} value={candidate.name} onChange={(event) => update(index, "name", event.target.value)} required />
      </label>
      <label className="space-y-1 text-sm">NIK KTP (16 digit angka)<RequiredMark />
        <input className={fieldClass} type="text" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} value={candidate.nik} onChange={(event) => update(index, "nik", event.target.value.replace(/\D/g, "").slice(0, 16))} required />
      </label>
      <label className="space-y-1 text-sm">Foto KTP (JPG/PNG, maks. 5 MB)<RequiredMark />
        <input className={fieldClass} type="file" accept="image/jpeg,image/png" onChange={(event) => update(index, "fotoKtp", event.target.files?.[0] || null)} required />
      </label>
      <label className="space-y-1 text-sm">Jenis SIM<RequiredMark />
        <select className={fieldClass} value={candidate.jenisSim} onChange={(event) => update(index, "jenisSim", event.target.value)} required>
          <option value="">Pilih jenis SIM</option>
          {["A", "B1", "B2", "C", "D"].map((kind) => <option key={kind} value={kind}>SIM {kind}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm">No. SIM (hanya angka)<RequiredMark />
        <input className={fieldClass} type="text" inputMode="numeric" value={candidate.noSim} onChange={(event) => update(index, "noSim", event.target.value.replace(/\D/g, ""))} required />
      </label>
      <label className="space-y-1 text-sm">Foto SIM (JPG/PNG, maks. 5 MB)<RequiredMark />
        <input className={fieldClass} type="file" accept="image/jpeg,image/png" onChange={(event) => update(index, "fotoSim", event.target.files?.[0] || null)} required />
      </label>
      <label className="space-y-1 text-sm">No. HP (hanya angka: 08xxxxxxxxxxxx)<RequiredMark />
        <input className={fieldClass} type="text" inputMode="numeric" pattern="08[0-9]{8,12}" maxLength={14} placeholder="08xxxxxxxxxxxx" value={candidate.phone} onChange={(event) => update(index, "phone", event.target.value.replace(/\D/g, "").slice(0, 14))} required />
      </label>
      <label className="space-y-1 text-sm">Email (format: nama@domain.com)<RequiredMark />
        <input className={fieldClass} type="email" placeholder="nama@domain.com" value={candidate.email} onChange={(event) => update(index, "email", event.target.value)} required />
      </label>
      <RegionPicker
        value={{
          provinsi: candidate.provinsi,
          kabKota: candidate.kabKota,
          kecamatan: candidate.kecamatan,
          kelurahan: candidate.kelurahan,
        }}
        onChange={(field, value) => update(index, field, value)}
      />
      <label className="space-y-1 text-sm md:col-span-2">Alamat tempat tinggal<RequiredMark />
        <input className={fieldClass} value={candidate.alamat} onChange={(event) => update(index, "alamat", event.target.value)} required />
      </label>
    </fieldset>
  );
}

function VendorCandidateForm({
  request,
  onSubmitted,
  onClose,
}: {
  request: OSRequest;
  onSubmitted: () => void;
  onClose: () => void;
}) {
  const [candidates, setCandidates] = useState<CandidateDraft[]>([emptyCandidate()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateCandidate(index: number, field: keyof CandidateDraft, value: string | File | null) {
    setCandidates((current) => current.map((candidate, candidateIndex) => (
      candidateIndex === index ? { ...candidate, [field]: value } : candidate
    )));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (candidates.length < 1 || candidates.length > 10) {
      setError("Vendor dapat mengirim 1 sampai 10 kandidat untuk setiap request.");
      return;
    }
    if (!window.confirm(`Anda akan submit ${candidates.length} kandidat. Lanjutkan?`)) return;
    setSaving(true);
    try {
      for (const candidate of candidates) {
        if (!candidate.fotoKtp || !candidate.fotoSim) {
          throw new Error("Foto KTP dan SIM wajib diunggah untuk setiap kandidat.");
        }
        if (candidate.fotoKtp.size > 5 * 1024 * 1024 || candidate.fotoSim.size > 5 * 1024 * 1024) {
          throw new Error("Ukuran setiap foto maksimal 5 MB.");
        }
      }

      const payload = await Promise.all(candidates.map(async (candidate) => ({
        ...candidate,
        fotoKtp: await readImage(candidate.fotoKtp!),
        fotoSim: await readImage(candidate.fotoSim!),
      })));
      await sendJson("/api/candidate", "POST", { osRequestId: request.id, candidates: payload });
      onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim data kandidat.");
    } finally {
      setSaving(false);
    }
  }

  if (request.status !== "VENDOR_SELECTED") return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogHeader>
        <DialogTitle>Isi data Mitra OS</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="mb-5 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <p>Jenis Permintaan: <strong>{request.type}</strong></p>
          {request.type === "PERGANTIAN" && <p>ID Pergantian: <strong>{request.idMitraOs || request.idPergantian || "-"}</strong></p>}
          <p>Posisi Kebutuhan: <strong>{request.posisi || "-"}</strong></p>
          <p>Wilayah Operasional: <strong>{request.penempatan || "-"}</strong></p>
          <p>Waktu Kerja: <strong>{request.waktuKerja || "-"}</strong></p>
          <p>Kandidat diajukan: <strong>{candidates.length}</strong></p>
        </div>
        <form onSubmit={submit} className="space-y-6">
          {candidates.map((candidate, index) => (
            <div key={index} className="space-y-2">
              <CandidateFields candidate={candidate} index={index} update={updateCandidate} />
              {candidates.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setCandidates((current) => current.filter((_, candidateIndex) => candidateIndex !== index))}
                >
                  Hapus kandidat {index + 1}
                </Button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Tanda <span className="font-bold text-red-600">*</span> berarti wajib diisi. Foto maks. 5 MB per berkas dan 15 MB total.
          </p>
          <FormError error={error} />
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving || candidates.length >= 10}
                onClick={() => setCandidates((current) => [...current, emptyCandidate()])}
              >
                + Tambah Kandidat
              </Button>
              <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Tutup</Button>
            </div>
            <Button type="submit" disabled={saving || candidates.length < 1 || candidates.length > 10}>
              {saving ? "Mengirim..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
    <FeaturePage title="Aktivasi Akun" description="Aktifkan akun kandidat yang telah lolos seleksi SM." roles={["VM"]}>
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
                        <p>Alamat: {item.candidate.alamat || "-"}, {item.candidate.kelurahan || "-"}, {item.candidate.kecamatan || "-"}, {item.candidate.kabKota || "-"}, {item.candidate.provinsi || "-"}</p>
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
                  <Button disabled={busyId === item.id} onClick={() => decide(item.id, "APPROVED")}>Aktivasi Akun</Button>
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
            <label className="space-y-1 text-sm">Vendor<RequiredMark />
              <select className={fieldClass} name="vendorId" required defaultValue="">
                <option value="" disabled>Pilih vendor</option>
                {vendors.data.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">Bulan<RequiredMark /><input className={fieldClass} type="month" name="bulan" required /></label>
            <label className="space-y-1 text-sm">Jenis klaim<RequiredMark /><input className={fieldClass} name="jenisClaim" placeholder="GAJI, BPJS, LEMBUR..." required /></label>
            <label className="space-y-1 text-sm">Jumlah mitra<RequiredMark /><input className={fieldClass} type="number" min="1" name="jumlahMitra" required /></label>
            <label className="space-y-1 text-sm">Nominal total<RequiredMark /><input className={fieldClass} type="number" min="0" step="any" name="nominal" required /></label>
            <label className="space-y-1 text-sm md:col-span-2">Catatan<OptionalMark /><textarea className={fieldClass} name="catatan" rows={2} /></label>
            <label className="space-y-1 text-sm md:col-span-2">Dokumen klaim (PDF/JPG/PNG, maks. 5 MB)<RequiredMark /><input className={fieldClass} type="file" name="dokumen" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /></label>
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

  async function readInvoiceDocument(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("File invoice gagal dibaca."));
      };
      reader.onerror = () => reject(new Error("File invoice gagal dibaca."));
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
        throw new Error("Pilih file invoice untuk diunggah.");
      }
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        throw new Error("File invoice harus berupa PDF, JPG, atau PNG.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file invoice maksimal 5 MB.");
      }

      await sendJson("/api/invoice", "POST", {
        bulan: form.get("bulan"),
        totalAmount: Number(form.get("totalAmount")),
        tanggalJatuhTempo: form.get("tanggalJatuhTempo") || undefined,
        catatan: form.get("catatan"),
        dokumen: await readInvoiceDocument(file),
        dokumenNama: file.name,
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
            <label className="space-y-1 text-sm">Bulan<RequiredMark /><input className={fieldClass} type="month" name="bulan" required /></label>
            <label className="space-y-1 text-sm">Total tagihan<RequiredMark /><input className={fieldClass} type="number" min="0" step="any" name="totalAmount" required /></label>
            <label className="space-y-1 text-sm">Jatuh tempo<OptionalMark /><input className={fieldClass} type="date" name="tanggalJatuhTempo" /></label>
            <label className="space-y-1 text-sm">Catatan<OptionalMark /><input className={fieldClass} name="catatan" /></label>
            <label className="space-y-1 text-sm md:col-span-2">File invoice (PDF/JPG/PNG, maks. 5 MB)<RequiredMark /><input className={fieldClass} type="file" name="dokumen" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /></label>
            <FormError error={error} />
            <Button type="submit" disabled={saving}>{saving ? "Mengunggah..." : "Upload Invoice"}</Button>
          </form>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0">
        <LoadingError loading={invoices.loading} error={invoices.error} empty={!invoices.data.length} />
        {!invoices.loading && !invoices.error && invoices.data.length > 0 && (
          <DataTable headers={["Nomor", "Bulan", "Vendor", "Total", "Jatuh Tempo", "Dokumen", "Status"]}>
            {invoices.data.map((item) => <TableRow key={item.id}><TableCell>{item.nomorInvoice}</TableCell><TableCell>{item.bulan}</TableCell><TableCell>{item.vendor?.name || "-"}</TableCell><TableCell>{item.totalAmount.toLocaleString("id-ID")}</TableCell><TableCell>{item.tanggalJatuhTempo ? new Date(item.tanggalJatuhTempo).toLocaleDateString("id-ID") : "-"}</TableCell><TableCell>{item.hasDokumen ? <a className="text-primary underline" href={`/api/invoice/${item.id}`} target="_blank" rel="noreferrer">{item.dokumenNama || "Unduh"}</a> : "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}
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
  const [activeCandidateRequestId, setActiveCandidateRequestId] = useState<string | null>(null);
  const [activeReviewRequestId, setActiveReviewRequestId] = useState<string | null>(null);
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);

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

  async function decideCandidate(candidateId: string, decision: "APPROVED" | "REJECTED") {
    setError(null);
    setCandidateActionId(candidateId);
    try {
      await sendJson("/api/candidate", "PATCH", { candidateId, decision });
      requests.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memproses kandidat.");
    } finally {
      setCandidateActionId(null);
    }
  }

  async function requestCandidateAccounts(requestId: string) {
    setError(null);
    setCandidateActionId(requestId);
    try {
      await sendJson("/api/account-request", "POST", {
        action: "REQUEST_CANDIDATE_ACCOUNTS",
        osRequestId: requestId,
      });
      requests.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal mengajukan aktivasi akun.");
    } finally {
      setCandidateActionId(null);
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
    <FeaturePage title="Request OS" description="Ajukan atau pantau permintaan tenaga outsourcing." roles={["SM", "VM", "VENDOR"]}>
      <FormError error={error} />
      {session?.user.role === "SM" && (
        <Card><CardHeader><CardTitle className="text-lg">Buat Request OS</CardTitle></CardHeader><CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Field bertanda <RequiredMark /> wajib diisi.</p>
          <form id="os-request-form" onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              Jenis Permintaan<RequiredMark />
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
              Jumlah<RequiredMark />
              <input className={fieldClass} type="number" min="1" name="jumlah" defaultValue="1" required />
            </label>
            {needsMitraId ? (
              <MitraIdPicker mitras={mitras.data} value={selectedMitraId} onChange={setSelectedMitraId} />
            ) : (
              <div aria-hidden="true" className="min-h-[65px]" />
            )}
            <label className="space-y-1 text-sm">
              Posisi Kebutuhan<RequiredMark />
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
              Wilayah Operasional<RequiredMark />
              <select className={fieldClass} name="penempatan" required defaultValue="">
                <option value="" disabled>Pilih wilayah</option>
                <option value="kantor1">kantor1</option>
                <option value="kantor2">kantor2</option>
                <option value="kantor3">kantor3</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Waktu Kerja<RequiredMark />
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
          <DataTable headers={[
            "Jenis",
            "Jumlah",
            "ID Mitra OS",
            "Posisi",
            "Wilayah Operasional",
            "Waktu Kerja",
            "Pemohon",
            "Vendor",
            "Status",
            ...(session?.user.role === "SM" ? ["Kandidat"] : []),
            ...(session?.user.role === "VENDOR" ? ["Aksi"] : []),
          ]}>
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
                {session?.user.role === "SM" && (
                  <TableCell>
                    {(item.candidates?.length || 0) > 0
                      ? <Button size="sm" variant="outline" onClick={() => setActiveReviewRequestId(item.id)}>Lihat Detail</Button>
                      : "-"}
                  </TableCell>
                )}
                {session?.user.role === "VENDOR" && (
                  <TableCell>
                    {item.status === "VENDOR_SELECTED" ? (
                      <Button
                        variant={activeCandidateRequestId === item.id ? "outline" : "default"}
                        size="sm"
                        onClick={() => setActiveCandidateRequestId(
                          activeCandidateRequestId === item.id ? null : item.id,
                        )}
                      >
                        {activeCandidateRequestId === item.id ? "Tutup" : "Isi data"}
                      </Button>
                    ) : item.status === "NOT_SELECTED" ? (
                      <StatusBadge status="OS_NOT_SELECTED" />
                    ) : item.status === "WAITING_SELECTION" || item.status === "IN_PROGRESS" ? (
                      <Button size="sm" variant="outline" disabled>
                        Request akun
                      </Button>
                    ) : item.status === "WAITING_ACTIVATION" ? (
                      (() => {
                        const candidates = item.candidates || [];
                        const hasUndecided = candidates.some((candidate) => candidate.status === "KANDIDAT");
                        const selected = candidates.filter((candidate) => candidate.status === "TERPILIH");
                        const canRequest = selected.some((candidate) => candidate.accountRequest?.status === "WAITING_SELECTION");
                        const requestSent = selected.length > 0 && selected.every(
                          (candidate) => candidate.accountRequest?.status !== "WAITING_SELECTION",
                        );
                        if (canRequest && !hasUndecided) {
                          return (
                            <Button size="sm" disabled={candidateActionId === item.id} onClick={() => requestCandidateAccounts(item.id)}>
                              {candidateActionId === item.id ? "Mengirim..." : "Request akun"}
                            </Button>
                          );
                        }
                        if (requestSent) {
                          return <Button size="sm" variant="outline" disabled>Menunggu Aktivasi Akun</Button>;
                        }
                        return <Button size="sm" variant="outline" disabled>Menunggu Hasil Seleksi</Button>;
                      })()
                    ) : item.status === "COMPLETED" ? (
                      <StatusBadge status="COMPLETED" />
                    ) : "-"}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
      {session?.user.role === "SM" && (
        <Dialog
          open={Boolean(activeReviewRequestId)}
          onOpenChange={(open) => { if (!open) setActiveReviewRequestId(null); }}
        >
          <DialogHeader>
            <DialogTitle>
              Seleksi Kandidat — {requests.data.find((item) => item.id === activeReviewRequestId)?.posisi || "Request OS"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Request {requests.data.find((item) => item.id === activeReviewRequestId)?.jumlah || 0} orang ·
              {" "}{requests.data.find((item) => item.id === activeReviewRequestId)?.vendor?.name || "Vendor"}
            </p>
          </DialogHeader>
          <DialogContent className="space-y-4">
            {requests.data.find((item) => item.id === activeReviewRequestId)?.candidates?.map((candidate) => (
              <div key={candidate.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{candidate.name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.email || "-"} · {candidate.phone || "-"}</p>
                    <p className="text-sm">NIK: {candidate.nik || "-"}</p>
                    <p className="text-sm">SIM: {candidate.jenisSim || "-"} · {candidate.noSim || "-"}</p>
                    <p className="text-sm">
                      Alamat: {[candidate.provinsi, candidate.kabKota, candidate.kecamatan, candidate.kelurahan, candidate.alamat]
                        .filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {candidate.status === "KANDIDAT" ? (
                      <>
                        <Button disabled={candidateActionId === candidate.id} onClick={() => decideCandidate(candidate.id, "APPROVED")}>
                          Terima
                        </Button>
                        <Button variant="outline" disabled={candidateActionId === candidate.id} onClick={() => decideCandidate(candidate.id, "REJECTED")}>
                          Tolak
                        </Button>
                      </>
                    ) : <StatusBadge status={candidate.status} />}
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  {candidate.fotoKtp && <a href={candidate.fotoKtp} target="_blank" rel="noreferrer"><img className="h-24 rounded border object-contain" src={candidate.fotoKtp} alt={`Foto KTP ${candidate.name}`} /></a>}
                  {candidate.fotoSim && <a href={candidate.fotoSim} target="_blank" rel="noreferrer"><img className="h-24 rounded border object-contain" src={candidate.fotoSim} alt={`Foto SIM ${candidate.name}`} /></a>}
                </div>
              </div>
            ))}
          </DialogContent>
        </Dialog>
      )}
      {session?.user.role === "VENDOR" && activeCandidateRequestId && requests.data
        .filter((item) => item.id === activeCandidateRequestId)
        .map((item) => (
          <VendorCandidateForm
            key={item.id}
            request={item}
            onSubmitted={() => {
              setActiveCandidateRequestId(null);
              requests.reload();
            }}
            onClose={() => setActiveCandidateRequestId(null)}
          />
        ))}
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
