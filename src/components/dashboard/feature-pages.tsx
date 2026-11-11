"use client";

import { Children, FormEvent, isValidElement, ReactNode, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from "lucide-react";

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
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  removalReason?: string | null;
  removedAt?: string | null;
  _count?: { users: number };
}

interface Mitra {
  id: string;
  name: string;
  email: string;
  status: string;
  initialPassword?: string | null;
  phone?: string | null;
  vendor?: { name: string } | null;
  mitraProfile?: {
    idMitraOs?: string | null;
    vendorId?: string;
    waktuKerja?: string | null;
    posisi?: string | null;
    penempatan?: string | null;
    alamat?: string | null;
    kelurahan?: string | null;
    kecamatan?: string | null;
    kabKota?: string | null;
    provinsi?: string | null;
    domisiliSesuaiKtp?: boolean;
    domisiliAlamat?: string | null;
    domisiliKelurahan?: string | null;
    domisiliKecamatan?: string | null;
    domisiliKabKota?: string | null;
    domisiliProvinsi?: string | null;
    dokumenDeadlineAt?: string | null;
    fotoKtp?: string | null;
    jenisSim?: string | null;
    noSim?: string | null;
    fotoSim?: string | null;
    skck?: string | null;
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
  skck?: string | null;
  alamat?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kabKota?: string | null;
  provinsi?: string | null;
  discType?: string | null;
  discReport?: string | null;
  domisiliSesuaiKtp?: boolean;
  domisiliAlamat?: string | null;
  domisiliKelurahan?: string | null;
  domisiliKecamatan?: string | null;
  domisiliKabKota?: string | null;
  domisiliProvinsi?: string | null;
  status: string;
  alasanKeputusan?: string | null;
  hasSkbn?: boolean;
  skbnIsImage?: boolean;
  accountRequest?: { status: string } | null;
}

function getMissingCandidateFields(candidate: OSCandidate): string[] {
  const requiredFields: [string, string | null | undefined][] = [
    ["Nama Mitra", candidate.name],
    ["NIK", candidate.nik],
    ["Foto KTP", candidate.fotoKtp],
    ["Jenis SIM", candidate.jenisSim],
    ["Nomor SIM", candidate.noSim],
    ["Foto SIM", candidate.fotoSim],
    ["SKCK", candidate.skck],
    ["No. HP", candidate.phone],
    ["Email", candidate.email],
    ["Alamat", candidate.alamat],
    ["Kelurahan/Desa", candidate.kelurahan],
    ["Kecamatan", candidate.kecamatan],
    ["Kabupaten/Kota", candidate.kabKota],
    ["Provinsi", candidate.provinsi],
  ];
  return requiredFields.filter(([, value]) => !value?.trim()).map(([label]) => label);
}

interface AccountRequest {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt?: string;
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
    skck?: string | null;
    hasSkbn?: boolean;
    skbnIsImage?: boolean;
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
  skck: File | null;
  phone: string;
  email: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kabKota: string;
  provinsi: string;
  domisiliSesuaiKtp: string;
  domisiliAlamat: string;
  domisiliKelurahan: string;
  domisiliKecamatan: string;
  domisiliKabKota: string;
  domisiliProvinsi: string;
  discType: string;
  discReport: File | null;
}

interface VendorEmployee {
  id: string;
  status: string;
  name: string;
  nik: string;
  jenisSim: string;
  noSim: string;
  email: string;
  phone: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kabKota: string;
  provinsi: string;
  domisiliSesuaiKtp: boolean;
  domisiliAlamat?: string | null;
  domisiliKelurahan?: string | null;
  domisiliKecamatan?: string | null;
  domisiliKabKota?: string | null;
  domisiliProvinsi?: string | null;
  hasSkck: boolean;
}

interface CandidateSubmissionDraft extends CandidateDraft {
  source: "NEW" | "EMPLOYEE";
  employeeId: string;
}

interface Region {
  id: string;
  name: string;
}

interface Claim {
  id: string;
  createdAt?: string;
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
  createdAt?: string;
  nomorInvoice: string;
  bulan: string;
  totalAmount: number;
  status: string;
  hasDokumen: boolean;
  dokumenNama?: string | null;
  hasBuktiTransfer: boolean;
  buktiTransferNama?: string | null;
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
  mitraTargets?: string[] | null;
  posisi?: string | null;
  penempatan?: string | null;
  waktuKerja?: string | null;
  alasan?: string | null;
  vendorId?: string | null;
  vendorNotifiedAt?: string | null;
  createdAt?: string;
  requester?: { name: string; role: string };
  vendor?: { name: string } | null;
  candidates?: OSCandidate[];
}

function getOSRequestStatus(status: string) {
  const statuses: Record<string, string> = {
    PENDING: "OS_WAITING_GM",
    APPROVED_GM: "OS_WAITING_COO",
    APPROVED_COO: "OS_WAITING_VM_VENDOR",
    VENDOR_SELECTED: "OS_WAITING_VENDOR_DATA",
    IN_PROGRESS: "OS_WAITING_SELECTION",
    WAITING_SELECTION: "OS_WAITING_SELECTION",
    WAITING_VENDOR_REQUEST: "OS_WAITING_VENDOR_REQUEST",
    WAITING_ACTIVATION: "OS_WAITING_ACTIVATION",
    NOT_SELECTED: "OS_NOT_SELECTED",
  };
  return statuses[status] || status;
}

interface Approval {
  id: string;
  createdAt?: string;
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
  window.dispatchEvent(new Event("dashboard:notifications-refresh"));
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
  const [sort, setSort] = useState<{ column: number; direction: "asc" | "desc" } | null>(null);
  const rows = Children.toArray(children);
  const sortedRows = sort
    ? [...rows].sort((left, right) => {
        const getCellText = (row: ReactNode, column: number) => {
          if (!isValidElement<{ children?: ReactNode }>(row)) return "";
          const cells = Children.toArray(row.props.children);
          const cell = cells[column];
          return isValidElement<{ children?: ReactNode }>(cell)
            ? getSortableText(cell.props.children)
            : getSortableText(cell);
        };
        const comparison = getCellText(left, sort.column).localeCompare(
          getCellText(right, sort.column),
          "id",
          { numeric: true, sensitivity: "base" },
        );
        return sort.direction === "asc" ? comparison : -comparison;
      })
    : rows;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header, column) => (
            <TableHead key={header} aria-sort={
              sort?.column === column
                ? sort.direction === "asc" ? "ascending" : "descending"
                : "none"
            }>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-left"
                onClick={() => setSort((current) => ({
                  column,
                  direction: current?.column === column && current.direction === "asc" ? "desc" : "asc",
                }))}
              >
                {header}
                <span className="text-xs text-muted-foreground">
                  {sort?.column === column ? (sort.direction === "asc" ? "A-Z" : "Z-A") : "↕"}
                </span>
              </button>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{sortedRows}</TableBody>
    </Table>
  );
}

function getSortableText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(getSortableText).join(" ");
  if (isValidElement<{ children?: ReactNode; status?: string; "aria-label"?: string }>(value)) {
    return getSortableText(
      value.props.children ?? value.props["aria-label"] ?? value.props.status ?? "",
    );
  }
  return "";
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
  const [detailMitra, setDetailMitra] = useState<Mitra | null>(null);
  return (
    <FeaturePage title="Data Mitra OS" description="Daftar mitra OS dan ID yang digunakan untuk request pergantian atau pengurangan." roles={["VENDOR", "VM", "SM"]}>
      <Card><CardContent className="p-0">
        <LoadingError loading={mitras.loading} error={mitras.error} empty={!mitras.data.length} />
        {!mitras.loading && !mitras.error && mitras.data.length > 0 && (
          <DataTable headers={[
            "ID Mitra OS", "Nama", "Email", "Vendor", "Posisi", "Penempatan", "Shift",
            ...(session?.user.role === "VENDOR" || session?.user.role === "VM" ? ["Kredensial Awal"] : []),
            ...(session?.user.role === "VENDOR" || session?.user.role === "VM" ? ["Dokumen Tambahan"] : []),
            "Detail Data", "Status",
          ]}>
            {mitras.data.map((mitra) => (
              <TableRow key={mitra.id}>
                <TableCell>
                  {mitra.mitraProfile?.idMitraOs || "-"}
                </TableCell>
                <TableCell>{mitra.name}</TableCell><TableCell>{mitra.email}</TableCell>
                <TableCell>{mitra.vendor?.name || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.posisi || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.penempatan || "-"}</TableCell>
                <TableCell>{mitra.mitraProfile?.waktuKerja || "Belum diatur"}</TableCell>
                {(session?.user.role === "VENDOR" || session?.user.role === "VM") && (
                  <TableCell>
                    {mitra.initialPassword ? (
                      <details>
                        <summary className="cursor-pointer text-primary">Lihat kredensial</summary>
                        <div className="mt-1 space-y-1 text-xs">
                          <p>Username: {mitra.email}</p>
                          <p>Password awal: <code>{mitra.initialPassword}</code></p>
                        </div>
                      </details>
                    ) : "Tidak tersedia"}
                  </TableCell>
                )}
                {(session?.user.role === "VENDOR" || session?.user.role === "VM") && (
                  <TableCell>
                    {mitra.mitraProfile?.dokumenDeadlineAt ? (() => {
                      const requiredDocuments = ["Ijazah", "Kartu Keluarga", "Foto Seluruh Badan", "SKBN"];
                      const uploadedNames = new Set(mitra.mitraProfile.documents?.map((document) => document.name) || []);
                      const missingCount = requiredDocuments.filter((name) => !uploadedNames.has(name)).length;
                      return (
                        <div className="min-w-36 text-xs">
                          <p>Tenggat: {new Date(mitra.mitraProfile.dokumenDeadlineAt).toLocaleDateString("id-ID")}</p>
                          <p>{missingCount === 0 ? "Dokumen lengkap" : `${missingCount} dokumen belum lengkap`}</p>
                        </div>
                      );
                    })() : "-"}
                  </TableCell>
                )}
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
                  {(session?.user.role === "SM" || session?.user.role === "VM") && (
                    <Button size="sm" variant="outline" onClick={() => setDetailMitra(mitra)}>
                      Lihat Detail
                    </Button>
                  )}
                  {session?.user.role !== "VENDOR" && session?.user.role !== "SM" && session?.user.role !== "VM" && "-"}
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
      {detailMitra && (
        <Dialog open onOpenChange={(open) => { if (!open) setDetailMitra(null); }}>
          <DialogHeader>
            <DialogTitle>Detail Mitra OS — {detailMitra.name}</DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="font-medium">ID Mitra OS:</span> {detailMitra.mitraProfile?.idMitraOs || "-"}</p>
              <p><span className="font-medium">NIK:</span> {detailMitra.mitraProfile?.nik || "-"}</p>
              <p><span className="font-medium">Email:</span> {detailMitra.email}</p>
              <p><span className="font-medium">No. HP:</span> {detailMitra.phone || "-"}</p>
              <p><span className="font-medium">Tempat, tanggal lahir:</span> {[detailMitra.mitraProfile?.tempatLahir, detailMitra.mitraProfile?.tanggalLahir?.slice(0, 10)].filter(Boolean).join(", ") || "-"}</p>
              <p><span className="font-medium">Vendor:</span> {detailMitra.vendor?.name || "-"}</p>
              <p><span className="font-medium">Posisi:</span> {detailMitra.mitraProfile?.posisi || "-"}</p>
              <p><span className="font-medium">Penempatan:</span> {detailMitra.mitraProfile?.penempatan || "-"}</p>
              <p><span className="font-medium">No. BPJS:</span> {detailMitra.mitraProfile?.noBpjs || "-"}</p>
              <p><span className="font-medium">SIM:</span> {[detailMitra.mitraProfile?.jenisSim, detailMitra.mitraProfile?.noSim].filter(Boolean).join(" · ") || "-"}</p>
              <p><span className="font-medium">Bank:</span> {detailMitra.mitraProfile?.namaBank || "-"}</p>
              <p><span className="font-medium">No. rekening:</span> {detailMitra.mitraProfile?.noRekening || "-"}</p>
              <p><span className="font-medium">Jadwal shift:</span> {detailMitra.mitraProfile?.waktuKerja || "-"}</p>
              <p className="sm:col-span-2">
                <span className="font-medium">Alamat sesuai KTP:</span>{" "}
                {[detailMitra.mitraProfile?.provinsi, detailMitra.mitraProfile?.kabKota, detailMitra.mitraProfile?.kecamatan, detailMitra.mitraProfile?.kelurahan, detailMitra.mitraProfile?.alamat]
                  .filter(Boolean).join(", ") || "-"}
              </p>
              <p className="sm:col-span-2">
                <span className="font-medium">Alamat domisili:</span>{" "}
                {detailMitra.mitraProfile?.domisiliSesuaiKtp === false
                  ? [detailMitra.mitraProfile?.domisiliProvinsi, detailMitra.mitraProfile?.domisiliKabKota, detailMitra.mitraProfile?.domisiliKecamatan, detailMitra.mitraProfile?.domisiliKelurahan, detailMitra.mitraProfile?.domisiliAlamat].filter(Boolean).join(", ")
                  : "Sesuai dengan KTP"}
              </p>
            </div>
            {detailMitra.mitraProfile && (
              <>
                <div className="flex flex-wrap gap-4">
                  {detailMitra.mitraProfile.fotoKtp && (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Foto KTP</p>
                      <img className="h-36 max-w-full rounded border object-contain" src={detailMitra.mitraProfile.fotoKtp} alt={`Foto KTP ${detailMitra.name}`} />
                    </div>
                  )}
                  {detailMitra.mitraProfile.fotoSim && (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Foto SIM</p>
                      <img className="h-36 max-w-full rounded border object-contain" src={detailMitra.mitraProfile.fotoSim} alt={`Foto SIM ${detailMitra.name}`} />
                    </div>
                  )}
                  {detailMitra.mitraProfile.skck && (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">SKCK</p>
                      {detailMitra.mitraProfile.skck.startsWith("data:image/") ? (
                        <a href={detailMitra.mitraProfile.skck} target="_blank" rel="noreferrer">
                          <img className="h-36 max-w-full rounded border object-contain" src={detailMitra.mitraProfile.skck} alt={`SKCK ${detailMitra.name}`} />
                        </a>
                      ) : (
                        <a className="text-primary underline" href={detailMitra.mitraProfile.skck} target="_blank" rel="noreferrer">Lihat dokumen SKCK</a>
                      )}
                    </div>
                  )}
                </div>
                {(detailMitra.mitraProfile.documents?.length || 0) > 0 && (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Dokumen tambahan</p>
                    {detailMitra.mitraProfile.documents?.map((document) => (
                      <p key={document.id}>
                        <a
                          className="text-primary underline"
                          href={`/api/mitra/${detailMitra.id}/documents/${document.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {document.name}
                        </a>
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
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
  const [address, setAddress] = useState({
    provinsi: mitra.mitraProfile?.provinsi || "",
    kabKota: mitra.mitraProfile?.kabKota || "",
    kecamatan: mitra.mitraProfile?.kecamatan || "",
    kelurahan: mitra.mitraProfile?.kelurahan || "",
  });
  const [domicileSameAsKtp, setDomicileSameAsKtp] = useState(mitra.mitraProfile?.domisiliSesuaiKtp !== false);
  const [domicileAddress, setDomicileAddress] = useState({
    provinsi: mitra.mitraProfile?.domisiliProvinsi || "",
    kabKota: mitra.mitraProfile?.domisiliKabKota || "",
    kecamatan: mitra.mitraProfile?.domisiliKecamatan || "",
    kelurahan: mitra.mitraProfile?.domisiliKelurahan || "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const files = form.getAll("documents").filter((file): file is File => file instanceof File && file.size > 0);
      const additionalDocuments = [
        ["ijazah", "Ijazah"],
        ["kartuKeluarga", "Kartu Keluarga"],
        ["fotoSeluruhBadan", "Foto Seluruh Badan"],
        ["skbn", "SKBN"],
      ].flatMap(([field, name]) => {
        const file = form.get(field);
        return file instanceof File && file.size > 0 ? [{ file, name }] : [];
      });
      files.push(...additionalDocuments.map(({ file }) => file));
      for (const file of files) {
        if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
          throw new Error("Dokumen harus berupa PDF, JPG, atau PNG.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Ukuran setiap dokumen maksimal 5 MB.");
        }
      }

      const documents = await Promise.all(files.map(async (file) => ({
        name: additionalDocuments.find((item) => item.file === file)?.name || file.name,
        content: await readImage(file),
      })));
      const fotoKtp = form.get("fotoKtp");
      const fotoSim = form.get("fotoSim");
      const skck = form.get("skck");
      if (skck instanceof File && skck.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran SKCK maksimal 5 MB.");
      }
      if (skck instanceof File && skck.size > 0 && !["application/pdf", "image/jpeg", "image/png"].includes(skck.type)) {
        throw new Error("SKCK harus berupa PDF, JPG, atau PNG.");
      }

      await sendJson("/api/mitra", "PUT", {
        userId: mitra.id,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        waktuKerja: form.get("waktuKerja"),
        tempatLahir: form.get("tempatLahir"),
        tanggalLahir: form.get("tanggalLahir"),
        alamat: form.get("alamat"),
        ...address,
        domisiliSesuaiKtp: domicileSameAsKtp,
        domisiliAlamat: domicileSameAsKtp ? "" : form.get("domisiliAlamat"),
        domisiliKelurahan: domicileSameAsKtp ? "" : domicileAddress.kelurahan,
        domisiliKecamatan: domicileSameAsKtp ? "" : domicileAddress.kecamatan,
        domisiliKabKota: domicileSameAsKtp ? "" : domicileAddress.kabKota,
        domisiliProvinsi: domicileSameAsKtp ? "" : domicileAddress.provinsi,
        noBpjs: form.get("noBpjs"),
        noRekening: form.get("noRekening"),
        namaBank: form.get("namaBank"),
        jenisSim: form.get("jenisSim"),
        noSim: form.get("noSim"),
        documents,
        ...(skck instanceof File && skck.size > 0 ? { skck: await readImage(skck) } : {}),
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
            <label className="space-y-1 text-sm">Posisi (tidak dapat diubah)
              <input className={`${fieldClass} cursor-not-allowed bg-muted`} value={mitra.mitraProfile?.posisi || "-"} readOnly />
            </label>
            <label className="space-y-1 text-sm">Penempatan (tidak dapat diubah)
              <input className={`${fieldClass} cursor-not-allowed bg-muted`} value={mitra.mitraProfile?.penempatan || "-"} readOnly />
            </label>
            <label className="space-y-1 text-sm">Jadwal shift<RequiredMark />
              <select className={fieldClass} name="waktuKerja" defaultValue={mitra.mitraProfile?.waktuKerja || "08:00-17:00"} required>
                <option value="08:00-17:00">08.00–17.00</option>
                <option value="20:00-05:00">20.00–05.00</option>
              </select>
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
            <p className="text-sm font-medium md:col-span-2">Alamat sesuai KTP</p>
            <RegionPicker value={address} required={false} onChange={(field, value) => {
              if (field === "provinsi" || field === "kabKota" || field === "kecamatan" || field === "kelurahan") {
                setAddress((current) => ({ ...current, [field]: value }));
              }
            }} />
            <label className="space-y-1 text-sm md:col-span-2">Alamat sesuai KTP<OptionalMark />
              <textarea className={fieldClass} name="alamat" rows={2} defaultValue={mitra.mitraProfile?.alamat || ""} />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">Alamat domisili
              <select className={fieldClass} value={domicileSameAsKtp ? "SAMA" : "BERBEDA"} onChange={(event) => setDomicileSameAsKtp(event.target.value === "SAMA")}>
                <option value="SAMA">Sesuai dengan KTP</option>
                <option value="BERBEDA">Berbeda dengan KTP</option>
              </select>
            </label>
            {!domicileSameAsKtp && (
              <>
                <RegionPicker value={domicileAddress} onChange={(field, value) => {
                  if (field === "provinsi" || field === "kabKota" || field === "kecamatan" || field === "kelurahan") {
                    setDomicileAddress((current) => ({ ...current, [field]: value }));
                  }
                }} />
                <label className="space-y-1 text-sm md:col-span-2">Alamat domisili<RequiredMark />
                  <textarea className={fieldClass} name="domisiliAlamat" rows={2} defaultValue={mitra.mitraProfile?.domisiliAlamat || ""} required />
                </label>
              </>
            )}
            <label className="space-y-1 text-sm md:col-span-2">Dokumen tambahan (PDF/JPG/PNG, maks. 5 MB per file)<OptionalMark />
              <input className={fieldClass} type="file" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
            </label>
            <div className="space-y-3 rounded-md border p-3 text-sm md:col-span-2">
              <div>
                <p className="font-medium">Dokumen tambahan Mitra OS</p>
                <p className="text-muted-foreground">
                  SKBN wajib diunggah sebelum request akun. Lengkapi ijazah, KK, dan foto seluruh badan dalam 14 hari setelah akun Mitra OS diaktifkan.
                  {mitra.mitraProfile?.dokumenDeadlineAt && ` Tenggat: ${new Date(mitra.mitraProfile.dokumenDeadlineAt).toLocaleDateString("id-ID")}.`}
                </p>
              </div>
              {[
                ["ijazah", "Ijazah"],
                ["kartuKeluarga", "Kartu Keluarga"],
                ["fotoSeluruhBadan", "Foto Seluruh Badan"],
                ["skbn", "SKBN"],
              ].map(([field, name]) => {
                const uploaded = mitra.mitraProfile?.documents?.some((document) => document.name === name);
                return (
                  <label key={field} className="block space-y-1">
                    {name}<OptionalMark />
                    <input className={fieldClass} type="file" name={field} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
                    <span className="text-xs text-muted-foreground">{uploaded ? "Sudah diunggah; pilih file untuk mengganti." : "Belum diunggah."}</span>
                  </label>
                );
              })}
            </div>
            <label className="space-y-1 text-sm md:col-span-2">
              SKCK (PDF/JPG/PNG, maks. 5 MB){mitra.mitraProfile?.skck ? <OptionalMark /> : <RequiredMark />}
              <input
                className={fieldClass}
                type="file"
                name="skck"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                required={!mitra.mitraProfile?.skck}
              />
              <span className="block text-xs text-muted-foreground">
                {mitra.mitraProfile?.skck ? "SKCK sudah tersimpan. Pilih file jika ingin menggantinya." : "SKCK belum tersedia. Unggah dokumen SKCK asli untuk melengkapi data."}
              </span>
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

function emptyCandidate(): CandidateDraft {
  return {
    name: "",
    nik: "",
    fotoKtp: null,
    jenisSim: "",
    noSim: "",
    fotoSim: null,
    skck: null,
    phone: "",
    email: "",
    alamat: "",
    kelurahan: "",
    kecamatan: "",
    kabKota: "",
    provinsi: "",
    domisiliSesuaiKtp: "SAMA",
    domisiliAlamat: "",
    domisiliKelurahan: "",
    domisiliKecamatan: "",
    domisiliKabKota: "",
    domisiliProvinsi: "",
    discType: "",
    discReport: null,
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
  required = true,
}: {
  value: Pick<CandidateDraft, "provinsi" | "kabKota" | "kecamatan" | "kelurahan">;
  onChange: (field: keyof CandidateDraft, regionName: string) => void;
  required?: boolean;
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
    if (!provinceId && provinces.length > 0 && value.provinsi) {
      setProvinceId(provinces.find((region) => region.name === value.provinsi)?.id || "");
    }
  }, [provinceId, provinces, value.provinsi]);

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
    if (!regencyId && regencies.length > 0 && value.kabKota) {
      setRegencyId(regencies.find((region) => region.name === value.kabKota)?.id || "");
    }
  }, [regencyId, regencies, value.kabKota]);

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
    if (!districtId && districts.length > 0 && value.kecamatan) {
      setDistrictId(districts.find((region) => region.name === value.kecamatan)?.id || "");
    }
  }, [districtId, districts, value.kecamatan]);

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
      <label className="block space-y-1 text-sm">Provinsi{required ? <RequiredMark /> : <OptionalMark />}
        <select
          className={fieldClass}
          required={required}
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
      <label className="block space-y-1 text-sm">Kabupaten/Kota{required ? <RequiredMark /> : <OptionalMark />}
        <select
          className={fieldClass}
          value={regencyId}
          required={required}
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
      <label className="block space-y-1 text-sm">Kecamatan{required ? <RequiredMark /> : <OptionalMark />}
        <select
          className={fieldClass}
          value={districtId}
          required={required}
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
      <label className="block space-y-1 text-sm">Kelurahan/Desa{required ? <RequiredMark /> : <OptionalMark />}
        <select
          className={fieldClass}
          required={required}
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
  includeDisc = false,
}: {
  candidate: CandidateDraft;
  index: number;
  update: (index: number, field: keyof CandidateDraft, value: string | File | null) => void;
  includeDisc?: boolean;
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
      <label className="space-y-1 text-sm">SKCK (PDF/JPG/PNG, maks. 5 MB)<RequiredMark />
        <input className={fieldClass} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => update(index, "skck", event.target.files?.[0] || null)} required />
      </label>
      <label className="space-y-1 text-sm">No. HP (hanya angka: 08xxxxxxxxxxxx)<RequiredMark />
        <input className={fieldClass} type="text" inputMode="numeric" pattern="08[0-9]{8,12}" maxLength={14} placeholder="08xxxxxxxxxxxx" value={candidate.phone} onChange={(event) => update(index, "phone", event.target.value.replace(/\D/g, "").slice(0, 14))} required />
      </label>
      <label className="space-y-1 text-sm">Email (format: nama@domain.com)<RequiredMark />
        <input className={fieldClass} type="email" placeholder="nama@domain.com" value={candidate.email} onChange={(event) => update(index, "email", event.target.value)} required />
      </label>
      <p className="text-sm font-medium md:col-span-2">Alamat sesuai KTP</p>
      <RegionPicker
        value={{
          provinsi: candidate.provinsi,
          kabKota: candidate.kabKota,
          kecamatan: candidate.kecamatan,
          kelurahan: candidate.kelurahan,
        }}
        onChange={(field, value) => update(index, field, value)}
      />
      <label className="space-y-1 text-sm md:col-span-2">Alamat sesuai KTP<RequiredMark />
        <input className={fieldClass} value={candidate.alamat} onChange={(event) => update(index, "alamat", event.target.value)} required />
      </label>
      <fieldset className="space-y-3 md:col-span-2">
        <legend className="text-sm font-medium">Alamat domisili</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name={`domisili-${index}`} value="SAMA" checked={candidate.domisiliSesuaiKtp === "SAMA"} onChange={() => update(index, "domisiliSesuaiKtp", "SAMA")} />
            Sesuai dengan KTP
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name={`domisili-${index}`} value="BERBEDA" checked={candidate.domisiliSesuaiKtp === "BERBEDA"} onChange={() => update(index, "domisiliSesuaiKtp", "BERBEDA")} />
            Berbeda dengan KTP
          </label>
        </div>
        {candidate.domisiliSesuaiKtp === "BERBEDA" && (
          <>
            <RegionPicker
              value={{
                provinsi: candidate.domisiliProvinsi,
                kabKota: candidate.domisiliKabKota,
                kecamatan: candidate.domisiliKecamatan,
                kelurahan: candidate.domisiliKelurahan,
              }}
              onChange={(field, value) => {
                if (field === "provinsi") update(index, "domisiliProvinsi", value);
                if (field === "kabKota") update(index, "domisiliKabKota", value);
                if (field === "kecamatan") update(index, "domisiliKecamatan", value);
                if (field === "kelurahan") update(index, "domisiliKelurahan", value);
              }}
            />
            <label className="block space-y-1 text-sm">Alamat domisili<RequiredMark />
              <input className={fieldClass} value={candidate.domisiliAlamat} onChange={(event) => update(index, "domisiliAlamat", event.target.value)} required />
            </label>
          </>
        )}
      </fieldset>
      {includeDisc && (
        <>
          <label className="space-y-1 text-sm">Hasil utama DISC<RequiredMark />
            <select className={fieldClass} value={candidate.discType} onChange={(event) => update(index, "discType", event.target.value)} required>
              <option value="">Pilih tipe DISC</option>
              {["D", "I", "S", "C"].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Laporan DISC (PDF/JPG/PNG, maks. 5 MB)<RequiredMark />
            <input className={fieldClass} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => update(index, "discReport", event.target.files?.[0] || null)} required />
          </label>
        </>
      )}
    </fieldset>
  );
}

export function VendorEmployeesPage() {
  const employees = useApiData<VendorEmployee[]>("/api/vendor-employee", []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CandidateDraft>(emptyCandidate());
  const [editingEmployee, setEditingEmployee] = useState<VendorEmployee | null>(null);
  const [employeeAddress, setEmployeeAddress] = useState({ provinsi: "", kabKota: "", kecamatan: "", kelurahan: "" });
  const [employeeDomicileAddress, setEmployeeDomicileAddress] = useState({ provinsi: "", kabKota: "", kecamatan: "", kelurahan: "" });
  const [employeeDomicileSameAsKtp, setEmployeeDomicileSameAsKtp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateDraft(_index: number, field: keyof CandidateDraft, value: string | File | null) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!draft.fotoKtp || !draft.fotoSim || !draft.skck) {
      setError("Foto KTP, foto SIM, dan SKCK wajib diunggah untuk data karyawan.");
      return;
    }
    if ([draft.fotoKtp, draft.fotoSim, draft.skck].some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Ukuran setiap foto/dokumen maksimal 5 MB.");
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(draft.skck.type)) {
      setError("SKCK harus berupa PDF, JPG, atau PNG.");
      return;
    }

    setSaving(true);
    try {
      await sendJson("/api/vendor-employee", "POST", {
        ...draft,
        domisiliSesuaiKtp: draft.domisiliSesuaiKtp === "SAMA",
        fotoKtp: await readImage(draft.fotoKtp),
        fotoSim: await readImage(draft.fotoSim),
        skck: await readImage(draft.skck),
      });
      setDraft(emptyCandidate());
      setDialogOpen(false);
      employees.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal menyimpan data karyawan.");
    } finally {
      setSaving(false);
    }
  }

  async function editEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEmployee) return;
    setError(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const skck = form.get("skck");
      if (skck instanceof File && skck.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran SKCK maksimal 5 MB.");
      }
      if (skck instanceof File && skck.size > 0 && !["application/pdf", "image/jpeg", "image/png"].includes(skck.type)) {
        throw new Error("SKCK harus berupa PDF, JPG, atau PNG.");
      }
      await sendJson("/api/vendor-employee", "PATCH", {
        employeeId: editingEmployee.id,
        name: form.get("name"),
        nik: form.get("nik"),
        jenisSim: form.get("jenisSim"),
        noSim: form.get("noSim"),
        phone: form.get("phone"),
        email: form.get("email"),
        alamat: form.get("alamat"),
        ...employeeAddress,
        domisiliSesuaiKtp: employeeDomicileSameAsKtp,
        domisiliAlamat: form.get("domisiliAlamat"),
        domisiliKelurahan: employeeDomicileAddress.kelurahan,
        domisiliKecamatan: employeeDomicileAddress.kecamatan,
        domisiliKabKota: employeeDomicileAddress.kabKota,
        domisiliProvinsi: employeeDomicileAddress.provinsi,
        ...(skck instanceof File && skck.size > 0 ? { skck: await readImage(skck) } : {}),
      });
      setEditingEmployee(null);
      employees.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gagal menyimpan data karyawan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage
      title="Data Karyawan"
      description="Kelola data karyawan Vendor yang dapat diajukan sebagai kandidat untuk Request OS."
      roles={["VENDOR"]}
    >
      <div className="flex justify-end">
        <Button onClick={() => { setError(null); setDialogOpen(true); }}>Tambah Karyawan</Button>
      </div>
      <FormError error={error} />
      <Card><CardContent className="overflow-x-auto p-0">
        <LoadingError loading={employees.loading} error={employees.error} empty={!employees.data.length} />
        {!employees.loading && !employees.error && employees.data.length > 0 && (
          <DataTable headers={["Nama", "NIK", "Email", "No. HP", "Alamat", "Edit Data Karyawan", "Status"]}>
            {employees.data.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.nik}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{[employee.provinsi, employee.kabKota, employee.kecamatan, employee.kelurahan, employee.alamat].filter(Boolean).join(", ")}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => {
                    setError(null);
                    setEditingEmployee(employee);
                    setEmployeeAddress({ provinsi: employee.provinsi, kabKota: employee.kabKota, kecamatan: employee.kecamatan, kelurahan: employee.kelurahan });
                    setEmployeeDomicileAddress({
                      provinsi: employee.domisiliProvinsi || "",
                      kabKota: employee.domisiliKabKota || "",
                      kecamatan: employee.domisiliKecamatan || "",
                      kelurahan: employee.domisiliKelurahan || "",
                    });
                    setEmployeeDomicileSameAsKtp(employee.domisiliSesuaiKtp);
                  }}>
                    Edit data karyawan
                  </Button>
                </TableCell>
                <TableCell><StatusBadge status={employee.status} /></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
      {dialogOpen && (
        <Dialog open onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false); }}>
          <DialogHeader><DialogTitle>Tambah Data Karyawan</DialogTitle></DialogHeader>
          <DialogContent>
            <form onSubmit={submit} className="space-y-4">
              <CandidateFields candidate={draft} index={0} update={updateDraft} />
              <p className="text-xs text-muted-foreground">
                Data ini tersimpan sebagai roster Vendor, bukan akun Mitra OS. Akun Mitra dibuat setelah kandidat lolos seleksi dan diaktivasi VM.
              </p>
              <FormError error={error} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Karyawan"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editingEmployee && (
        <Dialog open onOpenChange={(open) => { if (!open && !saving) setEditingEmployee(null); }}>
          <DialogHeader><DialogTitle>Edit Data Karyawan — {editingEmployee.name}</DialogTitle></DialogHeader>
          <DialogContent>
            <form onSubmit={editEmployee} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">Nama karyawan<RequiredMark /><input className={fieldClass} name="name" defaultValue={editingEmployee.name} required /></label>
              <label className="space-y-1 text-sm">NIK KTP (16 digit)<RequiredMark /><input className={fieldClass} name="nik" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} defaultValue={editingEmployee.nik} required /></label>
              <label className="space-y-1 text-sm">Email<RequiredMark /><input className={fieldClass} name="email" type="email" defaultValue={editingEmployee.email} required /></label>
              <label className="space-y-1 text-sm">No. HP<RequiredMark /><input className={fieldClass} name="phone" inputMode="numeric" pattern="08[0-9]{8,12}" defaultValue={editingEmployee.phone} required /></label>
              <label className="space-y-1 text-sm">Jenis SIM<RequiredMark />
                <select className={fieldClass} name="jenisSim" defaultValue={editingEmployee.jenisSim} required>
                  {["A", "B1", "B2", "C", "D"].map((kind) => <option key={kind} value={kind}>SIM {kind}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">Nomor SIM<RequiredMark /><input className={fieldClass} name="noSim" inputMode="numeric" defaultValue={editingEmployee.noSim} required /></label>
              <p className="text-sm font-medium md:col-span-2">Alamat sesuai KTP</p>
              <RegionPicker value={employeeAddress} onChange={(field, value) => {
                if (field === "provinsi" || field === "kabKota" || field === "kecamatan" || field === "kelurahan") {
                  setEmployeeAddress((current) => ({ ...current, [field]: value }));
                }
              }} />
              <label className="space-y-1 text-sm md:col-span-2">Alamat sesuai KTP<RequiredMark /><textarea className={fieldClass} name="alamat" rows={2} defaultValue={editingEmployee.alamat} required /></label>
              <label className="space-y-1 text-sm md:col-span-2">Alamat domisili
                <select className={fieldClass} value={employeeDomicileSameAsKtp ? "SAMA" : "BERBEDA"} onChange={(event) => setEmployeeDomicileSameAsKtp(event.target.value === "SAMA")}>
                  <option value="SAMA">Sesuai dengan KTP</option><option value="BERBEDA">Berbeda dengan KTP</option>
                </select>
              </label>
              {!employeeDomicileSameAsKtp && (
                <>
                  <RegionPicker value={employeeDomicileAddress} onChange={(field, value) => {
                    if (field === "provinsi" || field === "kabKota" || field === "kecamatan" || field === "kelurahan") {
                      setEmployeeDomicileAddress((current) => ({ ...current, [field]: value }));
                    }
                  }} />
                  <label className="space-y-1 text-sm md:col-span-2">Alamat domisili<RequiredMark /><textarea className={fieldClass} name="domisiliAlamat" rows={2} defaultValue={editingEmployee.domisiliAlamat || ""} required /></label>
                </>
              )}
              <label className="space-y-1 text-sm md:col-span-2">
                SKCK (PDF/JPG/PNG, maks. 5 MB){!editingEmployee.hasSkck && <RequiredMark />}
                <input
                  className={fieldClass}
                  type="file"
                  name="skck"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  required={!editingEmployee.hasSkck}
                />
                <span className="block text-xs text-muted-foreground">
                  {editingEmployee.hasSkck ? "SKCK sudah tersimpan. Pilih file hanya jika ingin mengganti." : "SKCK belum diunggah, silakan pilih file."}
                </span>
              </label>
              <FormError error={error} />
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setEditingEmployee(null)}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </FeaturePage>
  );
}

export function VendorManagementPage() {
  const vendors = useApiData<Vendor[]>("/api/vendor", []);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function removeVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVendor || !reason.trim()) {
      setError("Alasan remove wajib diisi.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await sendJson("/api/vendor", "PATCH", {
        vendorId: selectedVendor.id,
        reason: reason.trim(),
      });
      setSelectedVendor(null);
      setReason("");
      vendors.reload();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Gagal melakukan remove Vendor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeaturePage
      title="Data Vendor"
      description="Daftar vendor OS dan status kerja sama."
      roles={["VM"]}
    >
      <Card><CardContent className="overflow-x-auto p-0">
        <FormError error={error} />
        <LoadingError loading={vendors.loading} error={vendors.error} empty={!vendors.data.length} />
        {!vendors.loading && !vendors.error && vendors.data.length > 0 && (
          <DataTable headers={["Nama Vendor", "Email", "Telepon", "Jumlah Mitra OS", "Status", "Alasan Remove", "Aksi"]}>
            {vendors.data.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>{vendor.email || "-"}</TableCell>
                <TableCell>{vendor.phone || "-"}</TableCell>
                <TableCell>{vendor._count?.users || 0}</TableCell>
                <TableCell><StatusBadge status={vendor.status} /></TableCell>
                <TableCell className="max-w-64 whitespace-normal">{vendor.removalReason || "-"}</TableCell>
                <TableCell>
                  {vendor.status === "ACTIVE" ? (
                    <Button size="sm" variant="outline" onClick={() => {
                      setError(null);
                      setSelectedVendor(vendor);
                    }}>
                      Tandai Tidak Digunakan
                    </Button>
                  ) : vendor.removedAt ? new Date(vendor.removedAt).toLocaleDateString("id-ID") : "-"}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
      {selectedVendor && (
        <Dialog open onOpenChange={(open) => {
          if (!open && !saving) {
            setSelectedVendor(null);
            setReason("");
          }
        }}>
          <DialogHeader><DialogTitle>Nonaktifkan Vendor — {selectedVendor.name}</DialogTitle></DialogHeader>
          <DialogContent>
            <form onSubmit={removeVendor} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ini hanya menandai Vendor tidak digunakan: data Vendor, invoice, dan riwayat tidak dihapus.
                Akun Vendor dan Mitra di bawahnya dinonaktifkan. Vendor dengan Request OS yang masih berjalan
                belum dapat dinonaktifkan.
              </p>
              <label className="block space-y-1 text-sm">
                Alasan remove<RequiredMark />
                <textarea
                  className={fieldClass}
                  rows={4}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                />
              </label>
              <FormError error={error} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => {
                  setSelectedVendor(null);
                  setReason("");
                  setError(null);
                }}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? "Memproses..." : "Nonaktifkan Vendor"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </FeaturePage>
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
  const employees = useApiData<VendorEmployee[]>("/api/vendor-employee?available=true", []);
  const targetMitras = useApiData<Mitra[]>("/api/mitra", []);
  const initialCandidateCount = request.type === "PERGANTIAN" ? request.jumlah : 1;
  const [candidates, setCandidates] = useState<CandidateSubmissionDraft[]>(
    Array.from({ length: initialCandidateCount }, () => ({
      ...emptyCandidate(),
      source: "NEW",
      employeeId: "",
    })),
  );
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
    if (request.type === "PERGANTIAN" && candidates.length !== request.jumlah) {
      setError("Jumlah kandidat harus sama dengan jumlah Mitra OS yang diganti.");
      return;
    }
    if (candidates.some((candidate) => candidate.source === "EMPLOYEE" && !candidate.employeeId)) {
      setError("Pilih data karyawan untuk setiap kandidat yang menggunakan roster.");
      return;
    }
    if (candidates.some((candidate) => !candidate.discType || !candidate.discReport)) {
      setError("Hasil utama dan laporan DISC wajib diisi untuk setiap kandidat.");
      return;
    }
    if (candidates.some((candidate) => candidate.discReport && (
      candidate.discReport.size > 5 * 1024 * 1024
      || !["application/pdf", "image/jpeg", "image/png"].includes(candidate.discReport.type)
    ))) {
      setError("Laporan DISC harus berupa PDF/JPG/PNG maksimal 5 MB.");
      return;
    }
    const selectedEmployeeIds = candidates
      .filter((candidate) => candidate.source === "EMPLOYEE")
      .map((candidate) => candidate.employeeId);
    if (new Set(selectedEmployeeIds).size !== selectedEmployeeIds.length) {
      setError("Data karyawan yang sama tidak dapat dipilih untuk lebih dari satu kandidat.");
      return;
    }
    if (!window.confirm(`Anda akan submit ${candidates.length} kandidat. Lanjutkan?`)) return;
    setSaving(true);
    try {
      for (const candidate of candidates.filter((item) => item.source === "NEW")) {
        if (!candidate.fotoKtp || !candidate.fotoSim || !candidate.skck) {
          throw new Error("Foto KTP, foto SIM, dan SKCK wajib diunggah untuk setiap kandidat.");
        }
        if ([candidate.fotoKtp, candidate.fotoSim, candidate.skck].some((file) => file.size > 5 * 1024 * 1024)) {
          throw new Error("Ukuran setiap foto/dokumen maksimal 5 MB.");
        }
        if (!["application/pdf", "image/jpeg", "image/png"].includes(candidate.skck.type)) {
          throw new Error("SKCK harus berupa PDF, JPG, atau PNG.");
        }
      }

      const payload = await Promise.all(candidates.map(async (candidate) => {
        const discFields = {
          discType: candidate.discType,
          discReport: await readImage(candidate.discReport!),
        };
        if (candidate.source === "EMPLOYEE") return { employeeId: candidate.employeeId, ...discFields };
        return {
          ...discFields,
          name: candidate.name,
          nik: candidate.nik,
          fotoKtp: await readImage(candidate.fotoKtp!),
          jenisSim: candidate.jenisSim,
          noSim: candidate.noSim,
          fotoSim: await readImage(candidate.fotoSim!),
          skck: await readImage(candidate.skck!),
          phone: candidate.phone,
          email: candidate.email,
          alamat: candidate.alamat,
          kelurahan: candidate.kelurahan,
          kecamatan: candidate.kecamatan,
          kabKota: candidate.kabKota,
          provinsi: candidate.provinsi,
          domisiliSesuaiKtp: candidate.domisiliSesuaiKtp === "SAMA",
          domisiliAlamat: candidate.domisiliAlamat,
          domisiliKelurahan: candidate.domisiliKelurahan,
          domisiliKecamatan: candidate.domisiliKecamatan,
          domisiliKabKota: candidate.domisiliKabKota,
          domisiliProvinsi: candidate.domisiliProvinsi,
        };
      }));
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
          {request.type === "PERGANTIAN" && (
            <p className="sm:col-span-2">
              ID Mitra yang diganti: <strong>{request.mitraTargets?.map((profileId) => (
                targetMitras.data.find((mitra) => mitra.mitraProfile?.id === profileId)?.mitraProfile?.idMitraOs || "-"
              )).join(", ") || request.idMitraOs || request.idPergantian || "-"}</strong>
            </p>
          )}
          <p>Posisi Kebutuhan: <strong>{request.posisi || "-"}</strong></p>
          <p>Wilayah Operasional: <strong>{request.penempatan || "-"}</strong></p>
          <p>Waktu Kerja: <strong>{request.waktuKerja || "-"}</strong></p>
          <p>Kandidat diajukan: <strong>{candidates.length}</strong></p>
        </div>
        <form onSubmit={submit} className="space-y-6">
          {candidates.map((candidate, index) => (
            <div key={index} className="space-y-2">
              <fieldset className="rounded-md border p-4">
                <legend className="px-1 text-sm font-medium">
                  Kandidat {index + 1}
                  {request.type === "PERGANTIAN" && (() => {
                    const targetId = request.mitraTargets?.[index];
                    const target = targetMitras.data.find((mitra) => mitra.mitraProfile?.id === targetId);
                    return target ? ` · Mengganti ${target.mitraProfile?.idMitraOs || target.name}` : "";
                  })()}
                </legend>
                {request.type === "PERGANTIAN" && targetMitras.data.find(
                  (mitra) => mitra.mitraProfile?.id === request.mitraTargets?.[index],
                ) && (() => {
                  const target = targetMitras.data.find(
                    (mitra) => mitra.mitraProfile?.id === request.mitraTargets?.[index],
                  );
                  return (
                    <div className="mb-3 rounded-md bg-muted p-3 text-sm">
                      <p>Nama: {target?.name || "-"}</p>
                      <p>Posisi: {target?.mitraProfile?.posisi || "-"}</p>
                      <p>Wilayah: {target?.mitraProfile?.penempatan || "-"}</p>
                      <p>Waktu kerja: {target?.mitraProfile?.waktuKerja || "-"}</p>
                    </div>
                  );
                })()}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                    <input
                      type="radio"
                      name={`candidate-source-${index}`}
                      checked={candidate.source === "EMPLOYEE"}
                      onChange={() => setCandidates((current) => current.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, source: "EMPLOYEE", employeeId: "" } : item
                      )))}
                    />
                    Pilih dari data karyawan
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                    <input
                      type="radio"
                      name={`candidate-source-${index}`}
                      checked={candidate.source === "NEW"}
                      onChange={() => setCandidates((current) => current.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, source: "NEW", employeeId: "" } : item
                      )))}
                    />
                    Isi data baru
                  </label>
                </div>
                {candidate.source === "EMPLOYEE" ? (
                  <div className="space-y-3">
                    <label className="block space-y-1 text-sm">
                      Pilih karyawan<RequiredMark />
                      <select
                        className={fieldClass}
                        value={candidate.employeeId}
                        disabled={employees.loading || employees.data.length === 0}
                        onChange={(event) => setCandidates((current) => current.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, employeeId: event.target.value } : item
                        )))}
                        required
                      >
                        <option value="">
                          {employees.loading ? "Memuat data karyawan..." : "Pilih karyawan"}
                        </option>
                        {employees.data.map((employee) => (
                          <option
                            key={employee.id}
                            value={employee.id}
                            disabled={candidates.some((item, itemIndex) => (
                              itemIndex !== index
                              && item.source === "EMPLOYEE"
                              && item.employeeId === employee.id
                            ))}
                          >
                            {employee.name} — {employee.nik}
                          </option>
                        ))}
                      </select>
                    </label>
                    {employees.error && <FormError error={`Data karyawan gagal dimuat: ${employees.error}`} />}
                    {!employees.loading && employees.data.length === 0 && !employees.error && (
                      <p className="text-sm text-muted-foreground">
                        Belum ada data karyawan yang tersedia. Tambahkan melalui menu Data Karyawan.
                      </p>
                    )}
                    {candidate.employeeId && (() => {
                      const employee = employees.data.find((item) => item.id === candidate.employeeId);
                      return employee ? (
                        <div className="rounded-md bg-muted p-3 text-sm">
                          <p>{employee.email} · {employee.phone}</p>
                          <p>{[employee.provinsi, employee.kabKota, employee.kecamatan, employee.kelurahan, employee.alamat].filter(Boolean).join(", ")}</p>
                        </div>
                      ) : null;
                    })()}
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm">Hasil utama DISC<RequiredMark />
                        <select className={fieldClass} value={candidate.discType} onChange={(event) => updateCandidate(index, "discType", event.target.value)} required>
                          <option value="">Pilih tipe DISC</option>
                          {["D", "I", "S", "C"].map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">Laporan DISC (PDF/JPG/PNG, maks. 5 MB)<RequiredMark />
                        <input className={fieldClass} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => updateCandidate(index, "discReport", event.target.files?.[0] || null)} required />
                      </label>
                    </div>
                  </div>
                ) : (
                  <CandidateFields candidate={candidate} index={index} update={updateCandidate} includeDisc />
                )}
              </fieldset>
              {candidates.length > 1 && request.type !== "PERGANTIAN" && (
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
              {request.type !== "PERGANTIAN" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving || candidates.length >= 10}
                  onClick={() => setCandidates((current) => [...current, { ...emptyCandidate(), source: "NEW", employeeId: "" }])}
                >
                  + Tambah Kandidat
                </Button>
              )}
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
          <DataTable headers={["Tanggal", "Nama", "Email", "Telepon", "Vendor/Pemohon", "Request OS", "Status", "Aksi"]}>
            {requests.data.filter((item) => item.status === "PENDING").map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell>
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
                          {item.candidate.skck && <a href={item.candidate.skck} target="_blank" rel="noreferrer">{item.candidate.skck.startsWith("data:image/") ? <img className="h-24 rounded border object-contain" src={item.candidate.skck} alt="SKCK kandidat" /> : <span className="text-primary underline">Lihat SKCK (PDF)</span>}</a>}
                          {item.candidate.hasSkbn && <a href={`/api/candidate/${item.candidate.id}/skbn`} target="_blank" rel="noreferrer">{item.candidate.skbnIsImage ? <img className="h-24 rounded border object-contain" src={`/api/candidate/${item.candidate.id}/skbn`} alt="SKBN kandidat" /> : <span className="text-primary underline">Lihat SKBN (PDF)</span>}</a>}
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
          <DataTable headers={["Tanggal", "Bulan", "Jenis", "Jumlah Mitra", "Nominal", "Vendor", "Dokumen", "Status"]}>
            {claims.data.map((item) => <TableRow key={item.id}><TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell><TableCell>{item.bulan}</TableCell><TableCell>{item.jenisClaim}</TableCell><TableCell>{item.jumlahMitra}</TableCell><TableCell>{item.nominal.toLocaleString("id-ID")}</TableCell><TableCell>{item.vendor?.name || "-"}</TableCell><TableCell>{item.hasDokumen ? <a className="text-primary underline" href={`/api/claim/${item.id}`} target="_blank" rel="noreferrer">{item.dokumenNama || "Unduh"}</a> : "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}
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
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);

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

  async function uploadPaymentProof(invoiceId: string, file: File) {
    setError(null);
    setUploadingInvoiceId(invoiceId);
    try {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        throw new Error("Bukti transfer harus berupa PDF, JPG, atau PNG.");
      }
      if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran bukti transfer maksimal 5 MB.");
      }
      await sendJson(`/api/invoice/${invoiceId}`, "PATCH", {
        buktiTransfer: await readInvoiceDocument(file),
        buktiTransferNama: file.name,
      });
      invoices.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gagal mengunggah bukti transfer.");
    } finally {
      setUploadingInvoiceId(null);
    }
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
      <FormError error={error} />
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
          <DataTable headers={["Tanggal", "Nomor", "Bulan", "Vendor", "Total", "Jatuh Tempo", "Dokumen", "Bukti Transfer", "Status"]}>
            {invoices.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                <TableCell>{item.nomorInvoice}</TableCell>
                <TableCell>{item.bulan}</TableCell>
                <TableCell>{item.vendor?.name || "-"}</TableCell>
                <TableCell>{item.totalAmount.toLocaleString("id-ID")}</TableCell>
                <TableCell>{item.tanggalJatuhTempo ? new Date(item.tanggalJatuhTempo).toLocaleDateString("id-ID") : "-"}</TableCell>
                <TableCell>{item.hasDokumen ? <a className="text-primary underline" href={`/api/invoice/${item.id}`} target="_blank" rel="noreferrer">{item.dokumenNama || "Unduh"}</a> : "-"}</TableCell>
                <TableCell className="min-w-52">
                  {item.hasBuktiTransfer ? (
                    <a className="text-primary underline" href={`/api/invoice/${item.id}?type=transfer`} target="_blank" rel="noreferrer">
                      {item.buktiTransferNama || "Lihat bukti"}
                    </a>
                  ) : session?.user.role === "VM" ? (
                    <label className="block space-y-1 text-xs">
                      {uploadingInvoiceId === item.id ? "Mengunggah..." : "Upload bukti transfer"}
                      <input
                        className="block w-full text-xs"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        disabled={Boolean(uploadingInvoiceId) || item.status === "PAID"}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadPaymentProof(item.id, file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : "-"}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
              </TableRow>
            ))}
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
  const [selectedMitraIds, setSelectedMitraIds] = useState<string[]>([""]);
  const [selectedMitraOffice, setSelectedMitraOffice] = useState("");
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [requestPosition, setRequestPosition] = useState("");
  const [requestPlacement, setRequestPlacement] = useState("");
  const [requestWorkHours, setRequestWorkHours] = useState("");
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [activeCandidateRequestId, setActiveCandidateRequestId] = useState<string | null>(null);
  const [activeReviewRequestId, setActiveReviewRequestId] = useState<string | null>(null);
  const [activeSkbnRequestId, setActiveSkbnRequestId] = useState<string | null>(null);
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);
  const [uploadingSkbnCandidateId, setUploadingSkbnCandidateId] = useState<string | null>(null);
  const [candidateDecision, setCandidateDecision] = useState<{
    candidateId: string;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  const [candidateDecisionReason, setCandidateDecisionReason] = useState("");

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

  async function decideCandidate() {
    if (!candidateDecision || !candidateDecisionReason.trim()) {
      setError("Alasan diterima atau ditolak wajib diisi.");
      return;
    }
    setError(null);
    setCandidateActionId(candidateDecision.candidateId);
    try {
      await sendJson("/api/candidate", "PATCH", {
        ...candidateDecision,
        alasanKeputusan: candidateDecisionReason.trim(),
      });
      requests.reload();
      setCandidateDecision(null);
      setCandidateDecisionReason("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memproses kandidat.");
    } finally {
      setCandidateActionId(null);
    }
  }

  function startCandidateDecision(candidateId: string, decision: "APPROVED" | "REJECTED") {
    setError(null);
    setCandidateDecision({ candidateId, decision });
    setCandidateDecisionReason("");
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

  async function uploadCandidateSkbn(candidateId: string, file: File) {
    setError(null);
    setUploadingSkbnCandidateId(candidateId);
    try {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        throw new Error("SKBN harus berupa PDF, JPG, atau PNG.");
      }
      if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran SKBN maksimal 5 MB.");
      }
      await sendJson(`/api/candidate/${candidateId}/skbn`, "PUT", { skbn: await readImage(file) });
      requests.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gagal mengunggah SKBN.");
    } finally {
      setUploadingSkbnCandidateId(null);
    }
  }

  function resizeMitraTargets(quantity: number) {
    const safeQuantity = Math.min(10, Math.max(1, quantity || 1));
    setRequestQuantity(safeQuantity);
    setSelectedMitraIds((current) => Array.from(
      { length: safeQuantity },
      (_, index) => current[index] || "",
    ));
  }

  function updateMitraTarget(index: number, idMitraOs: string) {
    const next = [...selectedMitraIds];
    next[index] = idMitraOs;
    setSelectedMitraIds(next);
    const firstSelected = mitras.data.find(
      (mitra) => mitra.mitraProfile?.idMitraOs === next.find(Boolean),
    );
    setRequestPosition(firstSelected?.mitraProfile?.posisi || "");
    setRequestPlacement(firstSelected?.mitraProfile?.penempatan || "");
    setRequestWorkHours(firstSelected?.mitraProfile?.waktuKerja || "");
    setSelectedMitraOffice(firstSelected?.mitraProfile?.penempatan || "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (needsMitraId && selectedMitraIds.length !== requestQuantity) {
      setError("Pilih satu ID Mitra OS untuk setiap mitra yang dikurangi atau diganti.");
      return;
    }
    if (needsMitraId && selectedMitraIds.some((id) => !id)) {
      setError("Lengkapi semua pilihan ID Mitra OS.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (needsMitraId && !String(form.get("alasan") || "").trim()) {
      setError("Alasan pergantian atau pengurangan wajib diisi.");
      return;
    }
    const selectedProfiles = selectedMitraIds.map((id) => (
      mitras.data.find((mitra) => mitra.mitraProfile?.idMitraOs === id)
    ));
    if (needsMitraId && !selectedMitraOffice) {
      setError("Pilih kode kantor terlebih dahulu.");
      return;
    }
    if (needsMitraId && selectedProfiles.some((mitra) => mitra?.mitraProfile?.penempatan !== selectedMitraOffice)) {
      setError("Semua mitra harus berasal dari kode kantor yang dipilih.");
      return;
    }
    if (needsMitraId && new Set(selectedProfiles.map((mitra) => mitra?.mitraProfile?.penempatan)).size > 1) {
      setError("Wilayah operasional semua mitra yang dipilih harus sama dalam satu request.");
      return;
    }
    setSaving(true);
    try {
      await sendJson("/api/os-request", "POST", {
        type: form.get("type"),
        jumlah: requestQuantity,
        mitraOsIds: needsMitraId ? selectedMitraIds : [],
        alasan: form.get("alasan"),
        posisi: requestPosition,
        penempatan: needsMitraId ? selectedMitraOffice : requestPlacement,
        waktuKerja: requestWorkHours,
      });
      formElement.reset();
      setRequestType("PENAMBAHAN");
      setSelectedMitraIds([""]);
      setSelectedMitraOffice("");
      setRequestQuantity(1);
      setRequestPosition("");
      setRequestPlacement("");
      setRequestWorkHours("");
      setRequestFormOpen(false);
      requests.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim request.");
    } finally {
      setSaving(false);
    }
  }

  const isFinishedRequest = (item: OSRequest) =>
    ["COMPLETED", "NOT_SELECTED", "REJECTED"].includes(item.status);
  const pendingRequests = requests.data
    .filter((item) => !isFinishedRequest(item))
    .sort((a, b) => Number(b.status === "WAITING_SELECTION") - Number(a.status === "WAITING_SELECTION"));
  const finishedRequests = requests.data.filter(isFinishedRequest);
  const recentVendorNotifications = requests.data.filter((item) =>
    (item.type === "PERGANTIAN" || item.type === "PENGURANGAN")
    &&
    item.vendorNotifiedAt
    && new Date(item.vendorNotifiedAt).getTime() >= Date.now() - 14 * 24 * 60 * 60 * 1000,
  );
  const activeReviewRequest = requests.data.find((item) => item.id === activeReviewRequestId);
  const activeSkbnRequest = requests.data.find((item) => item.id === activeSkbnRequestId);
  const activeSkbnSelectedCandidates = activeSkbnRequest?.candidates?.filter(
    (candidate) => candidate.status === "TERPILIH",
  ) || [];
  const activeSkbnHasMissing = activeSkbnSelectedCandidates.some((candidate) => !candidate.hasSkbn);
  const acceptedCandidateCount = activeReviewRequest?.candidates?.filter(
    (candidate) => candidate.status === "TERPILIH" || candidate.status === "ACTIVATED",
  ).length || 0;
  const hasSelectionCapacity = Boolean(
    activeReviewRequest && acceptedCandidateCount < activeReviewRequest.jumlah,
  );
  const tableHeaders = [
    "Tanggal",
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
  ];
  const renderRequestRows = (items: OSRequest[]) => (
    <DataTable headers={tableHeaders}>
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell>
          <TableCell>{item.type}</TableCell>
          <TableCell>{item.jumlah}</TableCell>
          <TableCell>
            {(item.type === "PERGANTIAN" || item.type === "PENGURANGAN") ? (
              item.mitraTargets?.length
                ? item.mitraTargets.map((profileId) => {
                    const target = mitras.data.find((mitra) => mitra.mitraProfile?.id === profileId);
                    return target?.mitraProfile?.idMitraOs || "-";
                  }).join(", ")
                : item.idMitraOs || item.idPergantian || "-"
            ) : "-"}
          </TableCell>
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
              {getOSRequestStatus(item.status) === "OS_WAITING_SELECTION" ? (
                <Button size="sm" variant="default" onClick={() => setActiveReviewRequestId(item.id)}>
                  Tinjau Kandidat
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setActiveReviewRequestId(item.id)}>
                  Lihat Detail
                </Button>
              )}
            </TableCell>
          )}
          {session?.user.role === "VENDOR" && (
            <TableCell>
              {item.status === "VENDOR_SELECTED" ? (
                <Button
                  variant={activeCandidateRequestId === item.id ? "outline" : "default"}
                  size="sm"
                  onClick={() => setActiveCandidateRequestId(activeCandidateRequestId === item.id ? null : item.id)}
                >
                  {activeCandidateRequestId === item.id ? "Tutup" : "Isi data"}
                </Button>
              ) : item.status === "NOT_SELECTED" ? (
                <StatusBadge status="OS_NOT_SELECTED" />
              ) : item.status === "WAITING_SELECTION" || item.status === "IN_PROGRESS" ? (
                <Button size="sm" variant="outline" disabled>Request akun</Button>
              ) : item.status === "WAITING_VENDOR_REQUEST" ? (
                (() => {
                  const candidates = item.candidates || [];
                  const hasUndecided = candidates.some((candidate) => candidate.status === "KANDIDAT");
                  const selected = candidates.filter((candidate) => candidate.status === "TERPILIH");
                  const hasMissingSkbn = selected.some((candidate) => !candidate.hasSkbn);
                  if (selected.length > 0 && !hasUndecided) {
                    if (hasMissingSkbn) {
                      return (
                        <Button size="sm" onClick={() => setActiveSkbnRequestId(item.id)}>
                          Unggah SKBN
                        </Button>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={candidateActionId === item.id}
                          onClick={() => requestCandidateAccounts(item.id)}
                        >
                          {candidateActionId === item.id ? "Mengirim..." : "Request akun"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setActiveSkbnRequestId(item.id)}>
                          Lihat SKBN
                        </Button>
                      </div>
                    );
                  }
                  return <Button size="sm" variant="outline" disabled>Menunggu Hasil Seleksi</Button>;
                })()
              ) : item.status === "WAITING_ACTIVATION" ? (
                <Button size="sm" variant="outline" disabled>Menunggu Aktivasi Akun</Button>
              ) : item.status === "COMPLETED" ? (
                <StatusBadge status="COMPLETED" />
              ) : "-"}
            </TableCell>
          )}
        </TableRow>
      ))}
    </DataTable>
  );

  return (
    <FeaturePage title="Request OS" description="Ajukan atau pantau permintaan tenaga outsourcing." roles={["SM", "VM", "VENDOR"]}>
      <FormError error={error} />
      {session?.user.role === "SM" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => { setError(null); setRequestFormOpen(true); }}>
              Buat Request OS
            </Button>
          </div>
          <Dialog
            open={requestFormOpen}
            onOpenChange={(open) => { if (!saving) setRequestFormOpen(open); }}
          >
            <DialogHeader><DialogTitle>Buat Request OS</DialogTitle></DialogHeader>
            <DialogContent>
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
                  setSelectedMitraIds([""]);
                  setSelectedMitraOffice("");
                  setRequestQuantity(1);
                  setRequestPosition("");
                  setRequestPlacement("");
                  setRequestWorkHours("");
                }}
              >
                <option value="PENAMBAHAN">Penambahan</option>
                <option value="PERGANTIAN">Pergantian</option>
                <option value="PENGURANGAN">Pengurangan</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Jumlah<RequiredMark />
              <input
                className={fieldClass}
                type="number"
                min="1"
                max="10"
                name="jumlah"
                value={requestQuantity}
                onChange={(event) => resizeMitraTargets(Number(event.target.value))}
                required
              />
            </label>
            {needsMitraId ? (
              <div className="space-y-4 md:col-span-2">
                <label className="block max-w-md space-y-1 text-sm">
                  Kode Kantor<RequiredMark />
                  <select
                    className={fieldClass}
                    value={selectedMitraOffice}
                    onChange={(event) => {
                      setSelectedMitraOffice(event.target.value);
                      setSelectedMitraIds(Array.from({ length: requestQuantity }, () => ""));
                      setRequestPosition("");
                      setRequestPlacement(event.target.value);
                      setRequestWorkHours("");
                    }}
                    required
                  >
                    <option value="">Pilih kode kantor</option>
                    {["kantor1", "kantor2", "kantor3"].map((office) => (
                      <option key={office} value={office}>{office}</option>
                    ))}
                  </select>
                </label>
                {selectedMitraIds.map((id, index) => {
                  const selected = mitras.data.find((mitra) => mitra.mitraProfile?.idMitraOs === id);
                  return (
                    <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        Nama Mitra OS {index + 1}<RequiredMark />
                        <select
                          id={`mitraOs-${index}`}
                          className={fieldClass}
                          value={id}
                          disabled={!selectedMitraOffice || mitras.loading}
                          onChange={(event) => updateMitraTarget(index, event.target.value)}
                          required
                        >
                          <option value="">
                            {!selectedMitraOffice
                              ? "Pilih kode kantor terlebih dahulu"
                              : mitras.loading ? "Memuat data Mitra OS..." : "Pilih nama Mitra OS"}
                          </option>
                          {mitras.data
                            .filter((mitra) => mitra.status === "ACTIVE")
                            .filter((mitra) => mitra.mitraProfile?.penempatan === selectedMitraOffice)
                            .filter((mitra) => !selectedMitraIds.some(
                              (selectedId, selectedIndex) => selectedIndex !== index
                                && selectedId === mitra.mitraProfile?.idMitraOs,
                            ))
                            .map((mitra) => (
                              <option key={mitra.id} value={mitra.mitraProfile?.idMitraOs || ""}>
                                {mitra.name} — {mitra.mitraProfile?.idMitraOs}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="rounded-md bg-muted p-3 text-sm">
                        {selected ? (
                          <>
                            <p><span className="font-medium">Posisi:</span> {selected.mitraProfile?.posisi || "-"}</p>
                            <p><span className="font-medium">Wilayah:</span> {selected.mitraProfile?.penempatan || "-"}</p>
                            <p><span className="font-medium">Waktu kerja:</span> {selected.mitraProfile?.waktuKerja || "-"}</p>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Pilih Mitra OS untuk mengisi detail otomatis.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div aria-hidden="true" className="min-h-[65px]" />
            )}
            {needsMitraId && (
              <label className="space-y-1 text-sm md:col-span-2">
                Alasan pergantian/pengurangan<RequiredMark />
                <textarea className={fieldClass} name="alasan" rows={3} maxLength={2000} required />
              </label>
            )}
            {!needsMitraId && (
              <>
                <label className="space-y-1 text-sm">
                  Posisi Kebutuhan<RequiredMark />
                  <select className={fieldClass} name="posisi" required value={requestPosition} onChange={(event) => setRequestPosition(event.target.value)}>
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
                  <select className={fieldClass} name="penempatan" required value={requestPlacement} onChange={(event) => setRequestPlacement(event.target.value)}>
                    <option value="" disabled>Pilih wilayah</option>
                    <option value="kantor1">kantor1</option>
                    <option value="kantor2">kantor2</option>
                    <option value="kantor3">kantor3</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  Waktu Kerja<RequiredMark />
                  <select className={fieldClass} name="waktuKerja" required value={requestWorkHours} onChange={(event) => setRequestWorkHours(event.target.value)}>
                    <option value="" disabled>Pilih waktu kerja</option>
                    <option value="08:00-17:00">08:00-17:00</option>
                    <option value="20:00-05:00">20:00-05:00</option>
                  </select>
                </label>
              </>
            )}
            <FormError error={error} />
            {needsMitraId && mitras.error && <FormError error={`Data Mitra OS gagal dimuat: ${mitras.error}`} />}
          </form>
          <div className="mt-6 flex justify-end border-t pt-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setRequestFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" form="os-request-form" disabled={saving || (needsMitraId && mitras.loading)}>
                {saving ? "Mengirim..." : "Kirim Request"}
              </Button>
            </div>
          </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      {session?.user.role === "VENDOR" && recentVendorNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pemberitahuan Mitra OS</CardTitle>
            <p className="text-sm text-muted-foreground">Request penambahan, pergantian, atau pengurangan dalam 14 hari terakhir.</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentVendorNotifications.map((item) => {
                const targetMitras = (item.mitraTargets || []).map((profileId) =>
                  mitras.data.find((mitra) => mitra.mitraProfile?.id === profileId),
                );
                return (
                  <div key={item.id} className="rounded-md border p-3">
                    <p className="font-medium">{item.type} · {item.jumlah} mitra</p>
                    <p className="text-muted-foreground">
                      {item.vendorNotifiedAt && new Date(item.vendorNotifiedAt).toLocaleDateString("id-ID")}
                      {" · "}{getOSRequestStatus(item.status)}
                    </p>
                    <p className="mt-1">
                      Mitra terkait: {targetMitras.length > 0
                        ? targetMitras.map((mitra) => (
                          `${mitra?.name || "Mitra"} (${mitra?.mitraProfile?.idMitraOs || item.idMitraOs || "-"})`
                        )).join(", ")
                        : item.idMitraOs || "-"}
                    </p>
                    <p>Alasan: {item.alasan || "Tidak dicantumkan"}</p>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}
      {["SM", "VENDOR", "VM"].includes(session?.user.role || "") ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proses Berjalan</CardTitle>
              <p className="text-sm text-muted-foreground">Request yang masih berjalan; menunggu seleksi kandidat ditampilkan lebih dahulu.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <LoadingError loading={requests.loading} error={requests.error} empty={!pendingRequests.length} />
              {!requests.loading && !requests.error && pendingRequests.length > 0 && renderRequestRows(pendingRequests)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Riwayat Rekrutmen</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <LoadingError loading={requests.loading} error={requests.error} empty={!finishedRequests.length} />
              {!requests.loading && !requests.error && finishedRequests.length > 0 && renderRequestRows(finishedRequests)}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="overflow-x-auto p-0">
          <LoadingError loading={requests.loading} error={requests.error} empty={!requests.data.length} />
          {!requests.loading && !requests.error && requests.data.length > 0 && renderRequestRows(requests.data)}
        </CardContent></Card>
      )}
      {session?.user.role === "SM" && (
        <Dialog
          open={Boolean(activeReviewRequestId)}
          onOpenChange={(open) => { if (!open) setActiveReviewRequestId(null); }}
        >
          <DialogHeader>
            <DialogTitle>
              Seleksi Kandidat — {activeReviewRequest?.posisi || "Request OS"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Request {activeReviewRequest?.jumlah || 0} orang ·
              {" "}{activeReviewRequest?.vendor?.name || "Vendor"}
            </p>
            <p className="text-sm text-muted-foreground">
              Kandidat diterima: {acceptedCandidateCount} / {activeReviewRequest?.jumlah || 0}
              {!hasSelectionCapacity && " · Kuota penerimaan sudah terpenuhi."}
            </p>
          </DialogHeader>
          <DialogContent className="space-y-4">
            {(!activeReviewRequest?.candidates || activeReviewRequest.candidates.length === 0) ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>Belum ada data kandidat yang dikirim oleh vendor untuk permintaan ini.</p>
                <p className="mt-1 text-xs">Status saat ini: <span className="font-medium text-foreground">{getOSRequestStatus(activeReviewRequest?.status || "")}</span></p>
              </div>
            ) : (
              activeReviewRequest.candidates.map((candidate) => {
                const missingFields = getMissingCandidateFields(candidate);
                return (
              <div key={candidate.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{candidate.name}</p>
                    <p className="text-sm text-muted-foreground">{candidate.email || "-"} · {candidate.phone || "-"}</p>
                    <p className="text-sm">NIK: {candidate.nik || "-"}</p>
                    <p className="text-sm">SIM: {candidate.jenisSim || "-"} · {candidate.noSim || "-"}</p>
                    {candidate.alasanKeputusan && (
                      <p className="text-sm">Alasan keputusan: {candidate.alasanKeputusan}</p>
                    )}
                    <p className="text-sm">
                      Alamat: {[candidate.provinsi, candidate.kabKota, candidate.kecamatan, candidate.kelurahan, candidate.alamat]
                        .filter(Boolean).join(", ") || "-"}
                    </p>
                    <p className="text-sm">
                      Alamat domisili: {candidate.domisiliSesuaiKtp === false
                        ? [candidate.domisiliProvinsi, candidate.domisiliKabKota, candidate.domisiliKecamatan, candidate.domisiliKelurahan, candidate.domisiliAlamat].filter(Boolean).join(", ")
                        : "Sesuai dengan KTP"}
                    </p>
                    <p className="text-sm">Hasil utama DISC: {candidate.discType || "-"}</p>
                    {candidate.discType && (
                      <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                        <p className="font-medium">Ringkasan DISC — {candidate.name}</p>
                        <p>{({
                          D: "Dominance: cenderung tegas, berorientasi pada hasil, dan nyaman mengambil keputusan.",
                          I: "Influence: cenderung komunikatif, persuasif, dan nyaman berinteraksi dengan orang lain.",
                          S: "Steadiness: cenderung sabar, konsisten, dan menghargai kestabilan serta kerja sama.",
                          C: "Compliance: cenderung teliti, analitis, dan memperhatikan prosedur serta standar.",
                        } as Record<string, string>)[candidate.discType] || "Tipe DISC belum dikenali."}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Gambaran umum berdasarkan tipe utama yang dilaporkan; bukan penilaian psikologis lengkap.
                        </p>
                      </div>
                    )}
                    {missingFields.length > 0 && (
                      <p className="text-sm font-medium text-red-600">
                        Data wajib belum lengkap: {missingFields.join(", ")}. Data lain yang opsional tidak perlu dilengkapi.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {candidate.status === "KANDIDAT" ? (
                      <>
                        <Button
                          disabled={candidateActionId === candidate.id || !hasSelectionCapacity || missingFields.length > 0}
                          onClick={() => startCandidateDecision(candidate.id, "APPROVED")}
                        >
                          Terima
                        </Button>
                        <Button variant="outline" disabled={candidateActionId === candidate.id} onClick={() => startCandidateDecision(candidate.id, "REJECTED")}>
                          Tolak
                        </Button>
                      </>
                    ) : <StatusBadge status={candidate.status} />}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {candidate.fotoKtp && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Foto KTP</span>
                      <a href={candidate.fotoKtp} target="_blank" rel="noreferrer" className="block">
                        <img className="h-24 rounded border object-contain hover:opacity-90 transition" src={candidate.fotoKtp} alt={`Foto KTP ${candidate.name}`} />
                      </a>
                    </div>
                  )}
                  {candidate.fotoSim && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Foto SIM</span>
                      <a href={candidate.fotoSim} target="_blank" rel="noreferrer" className="block">
                        <img className="h-24 rounded border object-contain hover:opacity-90 transition" src={candidate.fotoSim} alt={`Foto SIM ${candidate.name}`} />
                      </a>
                    </div>
                  )}
                  {candidate.skck && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">SKCK</span>
                      <a href={candidate.skck} target="_blank" rel="noreferrer" className="block">
                        {candidate.skck.startsWith("data:application/pdf") ? (
                          <div className="flex h-24 w-24 flex-col items-center justify-center rounded border bg-muted/40 p-2 text-center hover:bg-muted/70 transition">
                            <FileText className="h-8 w-8 text-primary" />
                            <span className="mt-1 text-[10px] font-medium leading-tight">SKCK (PDF)</span>
                          </div>
                        ) : (
                          <img className="h-24 rounded border object-contain hover:opacity-90 transition" src={candidate.skck} alt={`SKCK ${candidate.name}`} />
                        )}
                      </a>
                    </div>
                  )}
                  {candidate.discReport && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Laporan DISC</span>
                      <a href={candidate.discReport} target="_blank" rel="noreferrer" className="block">
                        {candidate.discReport.startsWith("data:application/pdf") ? (
                          <div className="flex h-24 w-24 flex-col items-center justify-center rounded border bg-muted/40 p-2 text-center hover:bg-muted/70 transition">
                            <FileText className="h-8 w-8 text-primary" />
                            <span className="mt-1 text-[10px] font-medium leading-tight">DISC (PDF)</span>
                          </div>
                        ) : (
                          <img className="h-24 rounded border object-contain hover:opacity-90 transition" src={candidate.discReport} alt={`Laporan DISC ${candidate.name}`} />
                        )}
                      </a>
                    </div>
                  )}
                  {candidate.hasSkbn && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">SKBN</span>
                      <a href={`/api/candidate/${candidate.id}/skbn`} target="_blank" rel="noreferrer" className="block">
                        {candidate.skbnIsImage
                          ? <img className="h-24 rounded border object-contain hover:opacity-90 transition" src={`/api/candidate/${candidate.id}/skbn`} alt={`SKBN ${candidate.name}`} />
                          : <div className="flex h-24 w-24 flex-col items-center justify-center rounded border bg-muted/40 p-2 text-center hover:bg-muted/70 transition"><FileText className="h-8 w-8 text-primary" /><span className="mt-1 text-[10px] font-medium leading-tight text-primary underline">Lihat SKBN (PDF)</span></div>}
                      </a>
                    </div>
                  )}
                </div>
                {candidateDecision?.candidateId === candidate.id && (
                  <div className="mt-4 space-y-3 rounded-md bg-muted p-3">
                    <label className="block space-y-1 text-sm">
                      Alasan {candidateDecision.decision === "APPROVED" ? "diterima" : "ditolak"}<RequiredMark />
                      <textarea
                        className={fieldClass}
                        rows={3}
                        value={candidateDecisionReason}
                        onChange={(event) => setCandidateDecisionReason(event.target.value)}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCandidateDecision(null)}>
                        Batal
                      </Button>
                      <Button
                        type="button"
                        disabled={candidateActionId === candidate.id || !candidateDecisionReason.trim()}
                        onClick={decideCandidate}
                      >
                        {candidateActionId === candidate.id ? "Menyimpan..." : "Simpan keputusan"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              );
            })
          )}
          </DialogContent>
        </Dialog>
      )}
      {session?.user.role === "VENDOR" && (
        <Dialog
          open={Boolean(activeSkbnRequestId)}
          onOpenChange={(open) => { if (!open) setActiveSkbnRequestId(null); }}
        >
          <DialogHeader>
            <DialogTitle>
              Unggah Dokumen SKBN — {activeSkbnRequest?.posisi || "Request OS"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Request {activeSkbnRequest?.jumlah || 0} orang · {activeSkbnRequest?.penempatan || "-"}
            </p>
            <p className="text-xs text-muted-foreground">
              SKBN wajib diunggah untuk semua Mitra OS yang diterima sebelum mengajukan aktivasi akun (format: PDF, JPG, PNG, maks. 5 MB).
            </p>
          </DialogHeader>
          <DialogContent className="space-y-4">
            <FormError error={error} />
            <div className="space-y-3">
              {activeSkbnSelectedCandidates.map((candidate) => (
                <div key={candidate.id} className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">{candidate.email || "-"} · {candidate.phone || "-"}</p>
                    </div>
                    {candidate.hasSkbn ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                        SKBN Terunggah
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                        Belum Diunggah
                      </span>
                    )}
                  </div>
                  {candidate.hasSkbn && (
                    <div>
                      <a
                        className="text-xs text-primary underline font-medium"
                        href={`/api/candidate/${candidate.id}/skbn`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lihat dokumen SKBN
                      </a>
                    </div>
                  )}
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">
                      {uploadingSkbnCandidateId === candidate.id
                        ? "Mengunggah..."
                        : candidate.hasSkbn
                          ? "Ganti dokumen SKBN"
                          : "Pilih file SKBN"}
                    </span>
                    <input
                      className={fieldClass}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      disabled={uploadingSkbnCandidateId !== null || candidateActionId === activeSkbnRequestId}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadCandidateSkbn(candidate.id, file);
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setActiveSkbnRequestId(null)}>
                Tutup
              </Button>
              <Button
                type="button"
                disabled={activeSkbnHasMissing || candidateActionId === activeSkbnRequestId}
                onClick={async () => {
                  if (activeSkbnRequestId) {
                    await requestCandidateAccounts(activeSkbnRequestId);
                    setActiveSkbnRequestId(null);
                  }
                }}
              >
                {candidateActionId === activeSkbnRequestId
                  ? "Mengirim..."
                  : activeSkbnHasMissing
                    ? "Lengkapi SKBN untuk request akun"
                    : "Request akun"}
              </Button>
            </div>
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
          <DataTable headers={["Tanggal", "Level", "Jenis", "Jumlah", "Posisi", "Pemohon", "Status", "Aksi"]}>
            {approvals.data.map((item) => <TableRow key={item.id}><TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell><TableCell>{item.level}</TableCell><TableCell>{item.osRequest.type}</TableCell><TableCell>{item.osRequest.jumlah}</TableCell><TableCell>{item.osRequest.posisi || "-"}</TableCell><TableCell>{item.osRequest.requester?.name || "-"}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell><TableCell>{item.status === "PENDING" && <div className="flex gap-2"><Button disabled={busyId === item.id} onClick={() => decide(item.id, "APPROVED")}>Setujui</Button><Button variant="outline" disabled={busyId === item.id} onClick={() => decide(item.id, "REJECTED")}>Tolak</Button></div>}</TableCell></TableRow>)}
          </DataTable>
        )}
      </CardContent></Card>
    </FeaturePage>
  );
}
