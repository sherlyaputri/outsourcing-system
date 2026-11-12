"use client";

import { Children, FormEvent, isValidElement, ReactNode, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DEFAULT_PAGE_SIZE, TablePagination } from "@/components/ui/table-pagination";
import { FileText, User, Mail, Phone, MapPin, Briefcase, CreditCard, Shield, ExternalLink, Calendar, Edit, Eye, Check, Upload, Search, RotateCcw, Copy, KeyRound } from "lucide-react";
import { cn, formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";

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
  npwp?: string | null;
  picName?: string | null;
  picPhone?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  companyTaxStatus?: string | null;
  removalReason?: string | null;
  removedAt?: string | null;
  _count?: { users: number };
}

interface Mitra {
  id: string;
  name: string;
  email: string;
  status: string;
  avatar?: string | null;
  initialPassword?: string | null;
  phone?: string | null;
  vendor?: { name: string } | null;
  mitraProfile?: {
    idMitraOs?: string | null;
    vendorId?: string;
    waktuKerja?: string | null;
    posisi?: string | null;
    penempatan?: string | null;
    fotoSelfie?: string | null;
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
  type: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt?: string;
  vendorName?: string | null;
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
    domisiliSesuaiKtp?: boolean | null;
    domisiliAlamat?: string | null;
    domisiliKelurahan?: string | null;
    domisiliKecamatan?: string | null;
    domisiliKabKota?: string | null;
    domisiliProvinsi?: string | null;
    discType?: string | null;
    discReport?: string | null;
    alasanKeputusan?: string | null;
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
  fotoKtp?: string | null;
  fotoSim?: string | null;
  skck?: string | null;
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
  vendorId?: string;
  createdAt?: string;
  bulan: string;
  jenisClaim: string;
  jumlahMitra: number;
  nominal: number;
  status: string;
  catatan?: string | null;
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
  totalPotonganKlaim?: number;
  totalBersih?: number;
  claims?: Array<{ id: string; jenisClaim: string; nominal: number; catatan?: string | null }>;
  status: string;
  hasDokumen: boolean;
  dokumenNama?: string | null;
  hasBuktiTransfer: boolean;
  buktiTransferNama?: string | null;
  tanggalJatuhTempo?: string | null;
  catatan?: string | null;
  vendor?: { id?: string; name: string };
}

interface OSRequestApproval {
  id: string;
  level: string;
  status: string;
  catatan?: string | null;
  updatedAt?: string;
  approver?: { name: string; role: string };
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
  catatan?: string | null;
  vendorId?: string | null;
  vendorNotifiedAt?: string | null;
  createdAt?: string;
  requester?: { name: string; role: string };
  vendor?: { name: string } | null;
  approvals?: OSRequestApproval[];
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
  pageSize,
}: {
  headers: string[];
  children: ReactNode;
  pageSize?: number;
}) {
  const [sort, setSort] = useState<{ column: number; direction: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const rows = Children.toArray(children);

  useEffect(() => {
    setPage(1);
  }, [rows.length, sort]);

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

  const hasPagination = Boolean(pageSize && pageSize > 0);
  const totalPages = hasPagination ? Math.max(1, Math.ceil(sortedRows.length / pageSize!)) : 1;
  const safePage = Math.min(page, totalPages);
  const displayedRows = hasPagination
    ? sortedRows.slice((safePage - 1) * pageSize!, safePage * pageSize!)
    : sortedRows;

  return (
    <div>
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
        <TableBody>{displayedRows}</TableBody>
      </Table>
      {hasPagination && (
        <TablePagination
          totalItems={sortedRows.length}
          currentPage={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
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
  const [credentialMitra, setCredentialMitra] = useState<Mitra | null>(null);
  return (
    <FeaturePage title="Data Mitra OS" description="Daftar mitra OS dan ID yang digunakan untuk request pergantian atau pengurangan." roles={["VENDOR", "VM", "SM"]}>
      <Card><CardContent className="p-0">
        <LoadingError loading={mitras.loading} error={mitras.error} empty={!mitras.data.length} />
        {!mitras.loading && !mitras.error && mitras.data.length > 0 && (
          <DataTable
            pageSize={DEFAULT_PAGE_SIZE}
            headers={[
              "ID Mitra OS", "Nama", "Email", "Vendor", "Posisi", "Penempatan", "Shift",
              ...(session?.user.role === "VENDOR" || session?.user.role === "VM" ? ["Kredensial Awal"] : []),
              ...(session?.user.role === "VENDOR" || session?.user.role === "VM" ? ["Dokumen Tambahan"] : []),
              "Detail Data", "Status",
            ]}
          >
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1.5 text-xs h-7 px-2.5 font-medium"
                        onClick={() => setCredentialMitra(mitra)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Lihat
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Tidak tersedia</span>
                    )}
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
                  <div className="flex flex-col gap-1.5 items-start">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1.5 text-xs h-7 px-2.5 font-medium"
                      onClick={() => setDetailMitra(mitra)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Lihat
                    </Button>
                    {session?.user.role === "VENDOR" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={() => setEditingMitra(mitra)}
                      >
                        <Edit className="h-3 w-3" />
                        Edit data
                      </Button>
                    )}
                  </div>
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
        <MitraDetailDialog
          mitra={detailMitra}
          onClose={() => setDetailMitra(null)}
          onEdit={() => {
            const target = detailMitra;
            setDetailMitra(null);
            setEditingMitra(target);
          }}
          canEdit={session?.user.role === "VENDOR"}
        />
      )}
      {credentialMitra && credentialMitra.initialPassword && (
        <MitraCredentialDialog
          mitra={credentialMitra}
          onClose={() => setCredentialMitra(null)}
        />
      )}
    </FeaturePage>
  );
}

function MitraCredentialDialog({
  mitra,
  onClose,
}: {
  mitra: Mitra;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<"email" | "password" | "both" | null>(null);

  async function copyText(field: "email" | "password" | "both", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 2000);
    } catch {
      // Fallback ignored if clipboard permission unavailable
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
          <KeyRound className="h-5 w-5 text-primary" />
          Kredensial Awal Mitra OS
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 p-4">
          <div>
            <p className="font-semibold text-foreground">{mitra.name}</p>
            <p className="text-xs text-muted-foreground">
              {mitra.mitraProfile?.idMitraOs ? `ID: ${mitra.mitraProfile.idMitraOs}` : "ID Belum diatur"}
              {mitra.vendor?.name ? ` · ${mitra.vendor.name}` : ""}
            </p>
          </div>
          <StatusBadge status={mitra.status} />
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">Username / Email</span>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <code className="text-sm font-medium text-foreground break-all">{mitra.email}</code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                onClick={() => copyText("email", mitra.email)}
              >
                {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedField === "email" ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground block">Password Awal</span>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <code className="text-sm font-semibold tracking-wide text-foreground break-all">{mitra.initialPassword}</code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                onClick={() => copyText("password", mitra.initialPassword || "")}
              >
                {copiedField === "password" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedField === "password" ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Sampaikan kredensial awal ini kepada Mitra OS untuk login pertama kali, dan sarankan segera mengubah password setelah berhasil masuk.
        </p>
      </DialogContent>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          onClick={() => copyText("both", `Username: ${mitra.email}\nPassword awal: ${mitra.initialPassword || ""}`)}
        >
          {copiedField === "both" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copiedField === "both" ? "Semua Tersalin" : "Salin Semua"}
        </Button>
        <Button type="button" onClick={onClose}>
          Tutup
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function MitraDetailDialog({
  mitra,
  onClose,
  onEdit,
  canEdit,
}: {
  mitra: Mitra;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}) {
  const profile = mitra.mitraProfile;
  const profilePhotoDoc = profile?.documents?.find(
    (d) =>
      (d.name === "Foto Seluruh Badan" ||
        d.name === "Foto Profil" ||
        d.name === "Pas Foto" ||
        d.name.toLowerCase().includes("foto") ||
        d.name.toLowerCase().includes("badan") ||
        d.name.toLowerCase().includes("profil")) &&
      d.mimeType?.startsWith("image/")
  );
  const photo =
    mitra.avatar ||
    profile?.fotoSelfie ||
    (profilePhotoDoc ? `/api/mitra/${mitra.id}/documents/${profilePhotoDoc.id}` : null);
  const initials = (mitra.name || "M")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
          <User className="h-5 w-5 text-primary" />
          Detail Data Mitra OS
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="p-0 max-h-[85vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* SISI KIRI: FOTO PROFIL & RINGKASAN (~35%) */}
          <div className="md:col-span-4 flex flex-col items-center text-center p-5 bg-muted/30 rounded-xl border space-y-3.5 h-fit">
            {/* Foto Profil */}
            <div className="mt-1">
              {photo ? (
                <img
                  src={photo}
                  alt={mitra.name}
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-md border-2 border-primary/20"
                />
              ) : (
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center text-primary shadow-xs">
                  <span className="text-3xl font-bold tracking-wider">{initials}</span>
                  <span className="text-[11px] text-muted-foreground mt-1">Belum ada foto</span>
                </div>
              )}
            </div>

            {/* Status Badge terpisah dengan jarak proporsional dan tidak menimpa foto */}
            <div>
              <StatusBadge status={mitra.status} className="px-3 py-1 text-xs font-semibold shadow-xs" />
            </div>

            {/* Nama & ID */}
            <div className="w-full space-y-1.5">
              <h3 className="font-bold text-lg text-foreground leading-tight">{mitra.name}</h3>
              <p className="text-xs font-mono font-medium text-primary bg-primary/10 py-0.5 px-2.5 rounded-full inline-block">
                {profile?.idMitraOs ? `ID: ${profile.idMitraOs}` : "ID Belum diatur"}
              </p>
            </div>

            <div className="w-full text-left text-xs space-y-2.5 pt-3 border-t">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{profile?.posisi || "-"}</p>
                  <p className="text-[11px] text-muted-foreground">{mitra.vendor?.name || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">{profile?.penempatan || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">{profile?.waktuKerja || "Shift belum diatur"}</span>
              </div>
            </div>

            {canEdit && onEdit && (
              <Button
                variant="default"
                size="sm"
                className="w-full mt-2 gap-1.5 text-xs"
                onClick={onEdit}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Data Mitra
              </Button>
            )}
          </div>

          {/* SISI KANAN: DATA LENGKAP (~65%) */}
          <div className="md:col-span-8 space-y-4">
            {/* 1. DATA PRIBADI & KONTAK */}
            <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-primary" />
                Data Pribadi & Kontak
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">NIK</span>
                  <span className="font-medium text-foreground">{profile?.nik || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tempat, Tanggal Lahir</span>
                  <span className="font-medium text-foreground">
                    {[profile?.tempatLahir, profile?.tanggalLahir ? new Date(profile.tanggalLahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null].filter(Boolean).join(", ") || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Email</span>
                  <span className="font-medium text-foreground">{mitra.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nomor Handphone</span>
                  <span className="font-medium text-foreground">{mitra.phone || "-"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Alamat KTP</span>
                  <span className="font-medium text-foreground leading-relaxed">
                    {[profile?.provinsi, profile?.kabKota, profile?.kecamatan, profile?.kelurahan, profile?.alamat].filter(Boolean).join(", ") || "-"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Alamat Domisili</span>
                  <span className="font-medium text-foreground leading-relaxed">
                    {profile?.domisiliSesuaiKtp === false
                      ? [profile?.domisiliProvinsi, profile?.domisiliKabKota, profile?.domisiliKecamatan, profile?.domisiliKelurahan, profile?.domisiliAlamat].filter(Boolean).join(", ") || "-"
                      : "Sesuai dengan alamat KTP"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. LEGALITAS & FINANSIAL */}
            <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Legalitas & Finansial
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">No. BPJS Ketenagakerjaan</span>
                  <span className="font-medium text-foreground">{profile?.noBpjs || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Surat Izin Mengemudi (SIM)</span>
                  <span className="font-medium text-foreground">
                    {[profile?.jenisSim, profile?.noSim].filter(Boolean).join(" · ") || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Bank Penerima</span>
                  <span className="font-medium text-foreground">{profile?.namaBank || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nomor Rekening</span>
                  <span className="font-medium text-foreground">{profile?.noRekening || "-"}</span>
                </div>
              </div>
            </div>

            {/* 3. LAMPIRAN DOKUMEN */}
            <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Lampiran Dokumen & Identitas
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photo && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">Foto Profil / Pas Foto</span>
                    <a href={photo} target="_blank" rel="noreferrer" className="block group overflow-hidden rounded-lg border bg-muted/20">
                      <img src={photo} alt="Foto Profil" className="h-24 w-full object-contain group-hover:scale-105 transition-transform" />
                    </a>
                  </div>
                )}
                {profile?.fotoKtp && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">Foto KTP</span>
                    <a href={profile.fotoKtp} target="_blank" rel="noreferrer" className="block group overflow-hidden rounded-lg border bg-muted/20">
                      <img src={profile.fotoKtp} alt="KTP" className="h-24 w-full object-contain group-hover:scale-105 transition-transform" />
                    </a>
                  </div>
                )}
                {profile?.fotoSim && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">Foto SIM</span>
                    <a href={profile.fotoSim} target="_blank" rel="noreferrer" className="block group overflow-hidden rounded-lg border bg-muted/20">
                      <img src={profile.fotoSim} alt="SIM" className="h-24 w-full object-contain group-hover:scale-105 transition-transform" />
                    </a>
                  </div>
                )}
                {profile?.skck && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">SKCK</span>
                    {profile.skck.startsWith("data:image/") ? (
                      <a href={profile.skck} target="_blank" rel="noreferrer" className="block group overflow-hidden rounded-lg border bg-muted/20">
                        <img src={profile.skck} alt="SKCK" className="h-24 w-full object-contain group-hover:scale-105 transition-transform" />
                      </a>
                    ) : (
                      <a href={profile.skck} target="_blank" rel="noreferrer" className="flex items-center justify-center h-24 rounded-lg border bg-muted/20 text-xs text-primary underline p-2 text-center">
                        Lihat SKCK
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Dokumen Tambahan */}
              {profile?.documents && profile.documents.length > 0 && (
                <div className="pt-2 border-t space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground block">Dokumen Tambahan:</span>
                  <div className="flex flex-wrap gap-2">
                    {profile.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={`/api/mitra/${mitra.id}/documents/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-foreground border transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>{doc.name}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!profile?.fotoKtp && !profile?.fotoSim && !profile?.skck && (!profile?.documents || profile.documents.length === 0) && (
                <p className="text-xs text-muted-foreground italic py-1">Belum ada lampiran dokumen yang diunggah.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t p-4 px-6 flex justify-between sm:justify-between items-center bg-muted/20">
          <span className="text-xs text-muted-foreground">Tekan tombol Esc atau klik Tutup untuk kembali</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentFileInput({
  name,
  label,
  accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
  required = false,
  existingFileName,
  existingUrl,
  helpText,
  multiple = false,
}: {
  name: string;
  label: string;
  accept?: string;
  required?: boolean;
  existingFileName?: string | null;
  existingUrl?: string | null;
  helpText?: string;
  multiple?: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasExisting = Boolean(existingFileName);

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground cursor-pointer" onClick={() => inputRef.current?.click()}>
        {label}
        {required ? <RequiredMark /> : <OptionalMark />}
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors shadow-xs",
          selectedFile
            ? "border-blue-400 bg-blue-50/40 text-blue-900"
            : hasExisting
            ? "border-green-300 bg-green-50/30 text-green-900"
            : "border-input bg-background hover:bg-muted/40 text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <FileText className={cn("h-4 w-4 shrink-0", selectedFile ? "text-blue-600" : hasExisting ? "text-green-600" : "text-muted-foreground")} />
          <span className="truncate">
            {selectedFile ? (
              <span className="text-foreground font-medium">{selectedFile} (Siap diunggah)</span>
            ) : hasExisting ? (
              <span className="text-foreground font-semibold">{existingFileName}</span>
            ) : (
              <span className="text-muted-foreground italic">Belum ada file dipilih...</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasExisting && existingUrl && !selectedFile && (
            <a
              href={existingUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                if (existingUrl.startsWith("data:")) {
                  e.preventDefault();
                  const win = window.open("");
                  if (win) {
                    if (existingUrl.startsWith("data:application/pdf")) {
                      win.document.write(`<title>${existingFileName || "Dokumen"}</title><body style="margin:0;"><iframe src="${existingUrl}" style="border:none;width:100vw;height:100vh;"></iframe></body>`);
                    } else {
                      win.document.write(`<title>${existingFileName || "Foto"}</title><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${existingUrl}" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);" /></body>`);
                    }
                  }
                }
              }}
              className="text-primary hover:underline px-2 py-1 text-[11px] font-medium rounded hover:bg-primary/10 transition-colors"
            >
              Lihat
            </a>
          )}
          <span className="px-2.5 py-1 rounded bg-muted font-medium text-foreground text-[11px] hover:bg-muted/80 border">
            {hasExisting || selectedFile ? "Ganti File" : "Pilih File"}
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          required={required && !hasExisting && !selectedFile}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              if (multiple && files.length > 1) {
                setSelectedFile(`${files.length} file dipilih`);
              } else {
                setSelectedFile(files[0].name);
              }
            } else {
              setSelectedFile(null);
            }
          }}
        />
      </div>

      {helpText && <p className="text-[11px] text-muted-foreground leading-relaxed">{helpText}</p>}
    </div>
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

  const profile = mitra.mitraProfile;
  const existingSelfieUrl = mitra.avatar || profile?.fotoSelfie || null;
  const existingSelfieName = existingSelfieUrl ? "Pas Foto Profil Mitra (Tersimpan)" : null;

  const existingKtpUrl = profile?.fotoKtp || null;
  const existingKtpName = existingKtpUrl ? "Foto KTP Mitra (Tersimpan)" : null;

  const existingSimUrl = profile?.fotoSim || null;
  const existingSimName = existingSimUrl ? "Foto SIM Mitra (Tersimpan)" : null;

  const existingSkckUrl = profile?.skck || null;
  const existingSkckName = existingSkckUrl ? "Dokumen SKCK (Tersimpan)" : null;

  const skbnDoc = profile?.documents?.find((d) => d.name === "SKBN");
  const existingSkbnUrl = skbnDoc ? `/api/mitra/${mitra.id}/documents/${skbnDoc.id}` : null;
  const existingSkbnName = skbnDoc ? "Dokumen SKBN (Tersimpan)" : null;

  const badanDoc = profile?.documents?.find((d) => d.name === "Foto Seluruh Badan");
  const existingBadanUrl = badanDoc ? `/api/mitra/${mitra.id}/documents/${badanDoc.id}` : null;
  const existingBadanName = badanDoc ? "Foto Seluruh Badan (Tersimpan)" : null;

  const ijazahDoc = profile?.documents?.find((d) => d.name === "Ijazah");
  const existingIjazahUrl = ijazahDoc ? `/api/mitra/${mitra.id}/documents/${ijazahDoc.id}` : null;
  const existingIjazahName = ijazahDoc ? "Dokumen Ijazah (Tersimpan)" : null;

  const kkDoc = profile?.documents?.find((d) => d.name === "Kartu Keluarga");
  const existingKkUrl = kkDoc ? `/api/mitra/${mitra.id}/documents/${kkDoc.id}` : null;
  const existingKkName = kkDoc ? "Dokumen Kartu Keluarga (Tersimpan)" : null;

  const otherDocs =
    profile?.documents?.filter((d) => !["Foto Seluruh Badan", "Ijazah", "Kartu Keluarga", "SKBN"].includes(d.name)) || [];

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
      const fotoSelfie = form.get("fotoSelfie");
      const skck = form.get("skck");
      if (skck instanceof File && skck.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran SKCK maksimal 5 MB.");
      }
      if (skck instanceof File && skck.size > 0 && !["application/pdf", "image/jpeg", "image/png"].includes(skck.type)) {
        throw new Error("SKCK harus berupa PDF, JPG, atau PNG.");
      }
      if (fotoSelfie instanceof File && fotoSelfie.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran Foto Profil maksimal 5 MB.");
      }
      if (fotoSelfie instanceof File && fotoSelfie.size > 0 && !["image/jpeg", "image/png"].includes(fotoSelfie.type)) {
        throw new Error("Foto Profil harus berupa JPG atau PNG.");
      }

      let selfiePayload: string | undefined;
      if (fotoSelfie instanceof File && fotoSelfie.size > 0) {
        selfiePayload = await readImage(fotoSelfie);
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
        ...(selfiePayload ? { fotoSelfie: selfiePayload } : {}),
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
            {/* GRUP TUNGGAL: FOTO & DOKUMEN PERSYARATAN MITRA OS */}
            <div className="space-y-4 rounded-xl border p-4 bg-muted/20 md:col-span-2 shadow-xs">
              <div className="flex items-center gap-2.5 border-b pb-2.5">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Foto & Dokumen Persyaratan Mitra OS</h4>
                  <p className="text-xs text-muted-foreground">
                    Unggah pas foto profil, foto seluruh badan, kartu identitas, dan berkas persyaratan resmi Mitra OS.
                    {mitra.mitraProfile?.dokumenDeadlineAt && ` Tenggat: ${new Date(mitra.mitraProfile.dokumenDeadlineAt).toLocaleDateString("id-ID")}.`}
                  </p>
                </div>
              </div>
              <div className="grid gap-3.5 md:grid-cols-2 pt-1">
                {/* 1. FOTO DIRI: PAS FOTO & FOTO SELURUH BADAN */}
                <DocumentFileInput
                  name="fotoSelfie"
                  label="Foto Profil / Pas Foto Mitra (Wajah / Setengah Badan)"
                  accept="image/jpeg,image/png"
                  existingFileName={existingSelfieName}
                  existingUrl={existingSelfieUrl}
                  helpText="Pas foto formal wajah/setengah badan latar polos untuk avatar profil akun & absensi."
                />
                <DocumentFileInput
                  name="fotoSeluruhBadan"
                  label="Foto Seluruh Badan / Full Body (JPG/PNG, maks. 5 MB)"
                  accept="image/jpeg,image/png"
                  existingFileName={existingBadanName}
                  existingUrl={existingBadanUrl}
                  helpText="Foto berdiri tegak kepala hingga kaki dengan seragam/pakaian rapi untuk verifikasi postur fisik."
                />

                {/* 2. IDENTITAS RESMI: KTP & SIM */}
                <DocumentFileInput
                  name="fotoKtp"
                  label="Foto KTP (JPG/PNG, maks. 5 MB)"
                  accept="image/jpeg,image/png"
                  existingFileName={existingKtpName}
                  existingUrl={existingKtpUrl}
                  helpText="Unggah foto e-KTP asli yang jelas dan tidak buram."
                />
                <DocumentFileInput
                  name="fotoSim"
                  label="Foto SIM (JPG/PNG, maks. 5 MB)"
                  accept="image/jpeg,image/png"
                  existingFileName={existingSimName}
                  existingUrl={existingSimUrl}
                  helpText="Unggah foto SIM (opsional, jika posisi pengemudi atau memiliki SIM)."
                />

                {/* 3. SURAT KETERANGAN RESMI: SKCK & SKBN */}
                <DocumentFileInput
                  name="skck"
                  label="SKCK (PDF/JPG/PNG, maks. 5 MB)"
                  required={!profile?.skck}
                  existingFileName={existingSkckName}
                  existingUrl={existingSkckUrl}
                  helpText="Surat Keterangan Catatan Kepolisian yang masih berlaku."
                />
                <DocumentFileInput
                  name="skbn"
                  label="SKBN - Bebas Narkoba (PDF/JPG/PNG, maks. 5 MB)"
                  existingFileName={existingSkbnName}
                  existingUrl={existingSkbnUrl}
                  helpText="Surat Keterangan Bebas Narkoba resmi dari klinik/RS/BNN."
                />

                {/* 4. BERKAS PENDIDIKAN & KELUARGA: IJAZAH & KK */}
                <DocumentFileInput
                  name="ijazah"
                  label="Ijazah Terakhir (PDF/JPG/PNG, maks. 5 MB)"
                  existingFileName={existingIjazahName}
                  existingUrl={existingIjazahUrl}
                  helpText="Ijazah pendidikan terakhir Mitra."
                />
                <DocumentFileInput
                  name="kartuKeluarga"
                  label="Kartu Keluarga (PDF/JPG/PNG, maks. 5 MB)"
                  existingFileName={existingKkName}
                  existingUrl={existingKkUrl}
                  helpText="Kartu Keluarga asli atau fotokopi jelas."
                />

                {/* 5. DOKUMEN TAMBAHAN LAINNYA */}
                <div className="md:col-span-2">
                  <DocumentFileInput
                    name="documents"
                    label="Dokumen Tambahan Lainnya (Sertifikat / Berkas Pendukung)"
                    multiple
                    existingFileName={otherDocs.length > 0 ? `${otherDocs.length} berkas tambahan sudah tersimpan` : null}
                    helpText="Pilih berkas pendukung lainnya jika ada (PDF/JPG/PNG, maks. 5 MB per file)."
                  />
                </div>
              </div>
            </div>
          </div>
          {otherDocs.length > 0 && (
            <div className="space-y-1.5 text-xs bg-muted/30 p-3 rounded-lg border">
              <p className="font-semibold text-foreground">Dokumen tambahan lain yang tersimpan:</p>
              <div className="flex flex-wrap gap-2">
                {otherDocs.map((document) => (
                  <a
                    key={document.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-primary hover:underline text-xs"
                    href={`/api/mitra/${mitra.id}/documents/${document.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {document.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
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

function VendorEmployeeDetailDialog({
  employee,
  onClose,
  onEdit,
}: {
  employee: VendorEmployee;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const initials = (employee.name || "K")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
            <User className="h-5 w-5 text-primary" />
            Detail Data Karyawan
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
            {/* SISI KIRI: RINGKASAN (~35%) */}
            <div className="md:col-span-4 flex flex-col items-center text-center p-5 bg-muted/30 rounded-xl border space-y-3.5 h-fit">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary/10 border-2 border-primary/20 flex flex-col items-center justify-center text-primary shadow-xs">
                <span className="text-3xl font-bold tracking-wider">{initials}</span>
              </div>

              <div>
                <StatusBadge status={employee.status} className="px-3 py-1 text-xs font-semibold shadow-xs" />
              </div>

              <div className="w-full space-y-1">
                <h3 className="font-bold text-lg text-foreground leading-tight">{employee.name}</h3>
                <p className="text-xs font-mono font-medium text-primary bg-primary/10 py-0.5 px-2.5 rounded-full inline-block">
                  NIK: {employee.nik}
                </p>
              </div>

              <div className="w-full text-left text-xs space-y-2.5 pt-3 border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">SIM {employee.jenisSim} · {employee.noSim}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">{employee.phone}</span>
                </div>
              </div>

              {onEdit && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full mt-2 gap-1.5 text-xs"
                  onClick={onEdit}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Data Karyawan
                </Button>
              )}
            </div>

            {/* SISI KANAN: DATA LENGKAP & DOKUMEN (~65%) */}
            <div className="md:col-span-8 space-y-4">
              {/* 1. DATA PRIBADI & KONTAK */}
              <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Data Pribadi & Kontak
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nama Lengkap</span>
                    <span className="font-medium text-foreground">{employee.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">NIK KTP (16 digit)</span>
                    <span className="font-medium font-mono text-foreground">{employee.nik}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email</span>
                    <span className="font-medium text-foreground">{employee.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nomor Handphone</span>
                    <span className="font-medium text-foreground">{employee.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Surat Izin Mengemudi</span>
                    <span className="font-medium text-foreground">SIM {employee.jenisSim} ({employee.noSim})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Status Karyawan</span>
                    <span className="font-medium text-foreground">{employee.status === "ACTIVE" ? "Aktif (Tersedia diajukan)" : "Nonaktif"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Alamat Sesuai KTP</span>
                    <span className="font-medium text-foreground leading-relaxed">
                      {[employee.provinsi, employee.kabKota, employee.kecamatan, employee.kelurahan, employee.alamat].filter(Boolean).join(", ") || "-"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Alamat Domisili</span>
                    <span className="font-medium text-foreground leading-relaxed">
                      {employee.domisiliSesuaiKtp === false
                        ? [employee.domisiliProvinsi, employee.domisiliKabKota, employee.domisiliKecamatan, employee.domisiliKelurahan, employee.domisiliAlamat].filter(Boolean).join(", ") || "-"
                        : "Sesuai dengan alamat KTP"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. LAMPIRAN DOKUMEN & FOTO */}
              <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  Lampiran Dokumen & Foto Karyawan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Foto KTP */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">Foto KTP</span>
                    {employee.fotoKtp ? (
                      <div
                        onClick={() => setPreviewDoc({ title: `Foto KTP - ${employee.name}`, url: employee.fotoKtp! })}
                        className="group relative cursor-pointer overflow-hidden rounded-lg border bg-muted/20 hover:border-primary/50 transition-all shadow-2xs"
                      >
                        <img
                          src={employee.fotoKtp}
                          alt="Foto KTP"
                          className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                          <Eye className="h-4 w-4" />
                          Lihat
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center bg-muted/10">
                        <span>Belum dilampirkan</span>
                      </div>
                    )}
                  </div>

                  {/* Foto SIM */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">Foto SIM {employee.jenisSim}</span>
                    {employee.fotoSim ? (
                      <div
                        onClick={() => setPreviewDoc({ title: `Foto SIM - ${employee.name}`, url: employee.fotoSim! })}
                        className="group relative cursor-pointer overflow-hidden rounded-lg border bg-muted/20 hover:border-primary/50 transition-all shadow-2xs"
                      >
                        <img
                          src={employee.fotoSim}
                          alt="Foto SIM"
                          className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                          <Eye className="h-4 w-4" />
                          Lihat
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center bg-muted/10">
                        <span>Belum dilampirkan</span>
                      </div>
                    )}
                  </div>

                  {/* Dokumen SKCK */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground block">Dokumen SKCK</span>
                    {employee.skck ? (
                      employee.skck.startsWith("data:image/") ? (
                        <div
                          onClick={() => setPreviewDoc({ title: `Dokumen SKCK - ${employee.name}`, url: employee.skck! })}
                          className="group relative cursor-pointer overflow-hidden rounded-lg border bg-muted/20 hover:border-primary/50 transition-all shadow-2xs"
                        >
                          <img
                            src={employee.skck}
                            alt="SKCK"
                            className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                            <Eye className="h-4 w-4" />
                            Lihat
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setPreviewDoc({ title: `Dokumen SKCK - ${employee.name}`, url: employee.skck! })}
                          className="h-28 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer flex flex-col items-center justify-center p-3 text-center transition-colors group"
                        >
                          <FileText className="h-8 w-8 text-primary mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium text-foreground">Dokumen PDF</span>
                          <span className="text-[11px] text-primary underline mt-0.5">Klik untuk melihat</span>
                        </div>
                      )
                    ) : (
                      <div className="h-28 rounded-lg border border-dashed flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center bg-muted/10">
                        <span>Belum dilampirkan</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Lampiran Fullscreen / Lightbox */}
      {previewDoc && (
        <Dialog open onOpenChange={() => setPreviewDoc(null)} className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-4 w-4 text-primary" />
              {previewDoc.title}
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 flex flex-col items-center">
            {previewDoc.url.startsWith("data:application/pdf") ? (
              <iframe
                src={previewDoc.url}
                className="w-full h-[70vh] rounded-lg border shadow-xs"
                title={previewDoc.title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center overflow-auto max-h-[70vh] p-2 bg-muted/20 rounded-lg">
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[68vh] w-auto max-w-full object-contain rounded shadow-md"
                />
              </div>
            )}
            <DialogFooter className="w-full flex justify-end pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function VendorEmployeesPage() {
  const employees = useApiData<VendorEmployee[]>("/api/vendor-employee", []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CandidateDraft>(emptyCandidate());
  const [detailEmployee, setDetailEmployee] = useState<VendorEmployee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<VendorEmployee | null>(null);
  const [employeeAddress, setEmployeeAddress] = useState({ provinsi: "", kabKota: "", kecamatan: "", kelurahan: "" });
  const [employeeDomicileAddress, setEmployeeDomicileAddress] = useState({ provinsi: "", kabKota: "", kecamatan: "", kelurahan: "" });
  const [employeeDomicileSameAsKtp, setEmployeeDomicileSameAsKtp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenEdit(employee: VendorEmployee) {
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
  }

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
      const fotoKtp = form.get("fotoKtp");
      const fotoSim = form.get("fotoSim");
      const skck = form.get("skck");

      if (fotoKtp instanceof File && fotoKtp.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran Foto KTP maksimal 5 MB.");
      }
      if (fotoSim instanceof File && fotoSim.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran Foto SIM maksimal 5 MB.");
      }
      if (skck instanceof File && skck.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran SKCK maksimal 5 MB.");
      }
      if (skck instanceof File && skck.size > 0 && !["application/pdf", "image/jpeg", "image/png"].includes(skck.type)) {
        throw new Error("SKCK harus berupa PDF, JPG, atau PNG.");
      }

      const payload: Record<string, unknown> = {
        employeeId: editingEmployee.id,
        name: form.get("name"),
        nik: form.get("nik"),
        jenisSim: form.get("jenisSim"),
        noSim: form.get("noSim"),
        phone: form.get("phone"),
        email: form.get("email"),
        status: form.get("status"),
        alamat: form.get("alamat"),
        ...employeeAddress,
        domisiliSesuaiKtp: employeeDomicileSameAsKtp,
        domisiliAlamat: form.get("domisiliAlamat"),
        domisiliKelurahan: employeeDomicileAddress.kelurahan,
        domisiliKecamatan: employeeDomicileAddress.kecamatan,
        domisiliKabKota: employeeDomicileAddress.kabKota,
        domisiliProvinsi: employeeDomicileAddress.provinsi,
      };

      if (fotoKtp instanceof File && fotoKtp.size > 0) {
        payload.fotoKtp = await readImage(fotoKtp);
      }
      if (fotoSim instanceof File && fotoSim.size > 0) {
        payload.fotoSim = await readImage(fotoSim);
      }
      if (skck instanceof File && skck.size > 0) {
        payload.skck = await readImage(skck);
      }

      await sendJson("/api/vendor-employee", "PATCH", payload);
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
          <DataTable headers={["Karyawan", "Kontak", "SIM", "Alamat Domisili", "Aksi", "Status"]}>
            {employees.data.map((employee) => {
              const initials = (employee.name || "K")
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const domicileCity = employee.domisiliSesuaiKtp
                ? [employee.kabKota, employee.provinsi].filter(Boolean).join(", ")
                : [employee.domisiliKabKota, employee.domisiliProvinsi].filter(Boolean).join(", ");

              const domicileAddress = employee.domisiliSesuaiKtp
                ? employee.alamat
                : employee.domisiliAlamat || employee.alamat;

              return (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm leading-tight">{employee.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">NIK: {employee.nik}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <p className="font-medium text-foreground">{employee.email}</p>
                      <p className="text-muted-foreground">{employee.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-muted text-foreground border">
                        SIM {employee.jenisSim}
                      </span>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{employee.noSim}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs space-y-0.5 text-xs">
                      <p className="font-medium text-foreground">{domicileCity || "-"}</p>
                      <p className="text-muted-foreground truncate" title={domicileAddress}>
                        {domicileAddress || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-1.5 items-start">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1 text-xs h-7 px-2.5 font-medium"
                        onClick={() => setDetailEmployee(employee)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={() => handleOpenEdit(employee)}
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={employee.status} /></TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        )}
      </CardContent></Card>
      {dialogOpen && (
        <Dialog open onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false); }} className="max-w-2xl">
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
      {detailEmployee && (
        <VendorEmployeeDetailDialog
          employee={detailEmployee}
          onClose={() => setDetailEmployee(null)}
          onEdit={() => {
            const target = detailEmployee;
            setDetailEmployee(null);
            handleOpenEdit(target);
          }}
        />
      )}
      {editingEmployee && (
        <Dialog open onOpenChange={(open) => { if (!open && !saving) setEditingEmployee(null); }} className="max-w-2xl">
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
              <label className="space-y-1 text-sm md:col-span-2">
                Status Karyawan<RequiredMark />
                <select className={fieldClass} name="status" defaultValue={editingEmployee.status || "ACTIVE"} required>
                  <option value="ACTIVE">Aktif (Dapat diajukan sebagai kandidat)</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </label>
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

              {/* DOKUMEN & LAMPIRAN FOTO */}
              <div className="md:col-span-2 pt-3 border-t space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Dokumen & Lampiran Foto Karyawan
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lihat file yang sudah tersimpan atau pilih file baru jika ingin memperbarui.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DocumentFileInput
                    name="fotoKtp"
                    label="Foto KTP (JPG/PNG, maks. 5 MB)"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    existingFileName={editingEmployee.fotoKtp ? "Foto KTP (Tersimpan)" : null}
                    existingUrl={editingEmployee.fotoKtp || undefined}
                    helpText="Unggah foto e-KTP asli yang jelas dan tidak buram."
                  />
                  <DocumentFileInput
                    name="fotoSim"
                    label="Foto SIM (JPG/PNG, maks. 5 MB)"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    existingFileName={editingEmployee.fotoSim ? "Foto SIM (Tersimpan)" : null}
                    existingUrl={editingEmployee.fotoSim || undefined}
                    helpText="Unggah foto SIM yang masih berlaku."
                  />
                  <DocumentFileInput
                    name="skck"
                    label="Dokumen SKCK (PDF/JPG/PNG, maks. 5 MB)"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    existingFileName={editingEmployee.skck ? "Dokumen SKCK (Tersimpan)" : null}
                    existingUrl={editingEmployee.skck || undefined}
                    helpText="Surat Keterangan Catatan Kepolisian yang masih berlaku."
                  />
                </div>
              </div>

              <FormError error={error} />
              <div className="flex justify-end gap-2 md:col-span-2 pt-2 border-t">
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
    const candidateIdentities = candidates.map((candidate) => {
      if (candidate.source === "EMPLOYEE") {
        const employee = employees.data.find((item) => item.id === candidate.employeeId);
        return {
          nik: (employee?.nik || "").trim(),
          email: (employee?.email || "").trim().toLowerCase(),
        };
      }
      return {
        nik: candidate.nik.trim(),
        email: candidate.email.trim().toLowerCase(),
      };
    });
    const niks = candidateIdentities.map((item) => item.nik).filter(Boolean);
    if (new Set(niks).size !== niks.length) {
      setError("NIK setiap kandidat harus berbeda dalam satu pengajuan.");
      return;
    }
    const emails = candidateIdentities.map((item) => item.email).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      setError("Email setiap kandidat harus berbeda dalam satu pengajuan.");
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
                {candidate.source === "EMPLOYEE" ? (() => {
                  const availableEmployees = employees.data.filter((employee) => (
                    !candidates.some((item, itemIndex) => (
                      itemIndex !== index
                      && item.source === "EMPLOYEE"
                      && item.employeeId === employee.id
                    ))
                  ));
                  return (
                  <div className="space-y-3">
                    <label className="block space-y-1 text-sm">
                      Pilih karyawan<RequiredMark />
                      <select
                        className={fieldClass}
                        value={candidate.employeeId}
                        disabled={employees.loading || availableEmployees.length === 0}
                        onChange={(event) => {
                          const nextEmployeeId = event.target.value;
                          setCandidates((current) => {
                            const alreadyUsed = current.some((item, itemIndex) => (
                              itemIndex !== index
                              && item.source === "EMPLOYEE"
                              && item.employeeId === nextEmployeeId
                            ));
                            if (nextEmployeeId && alreadyUsed) return current;
                            return current.map((item, itemIndex) => (
                              itemIndex === index ? { ...item, employeeId: nextEmployeeId } : item
                            ));
                          });
                        }}
                        required
                      >
                        <option value="">
                          {employees.loading
                            ? "Memuat data karyawan..."
                            : employees.data.length === 0
                              ? "Belum ada data karyawan tersedia"
                              : availableEmployees.length === 0
                                ? "Semua karyawan sudah dipilih di kandidat lain"
                                : "Pilih karyawan"}
                        </option>
                        {availableEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
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
                    {!employees.loading && employees.data.length > 0 && availableEmployees.length === 0 && !candidate.employeeId && !employees.error && (
                      <p className="text-sm text-amber-700">
                        Semua data karyawan yang tersedia sudah dipilih pada kandidat lain. Gunakan &ldquo;Isi data baru&rdquo; atau tambahkan karyawan baru di menu Data Karyawan.
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
                  );
                })() : (
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
  const vendors = useApiData<Vendor[]>("/api/vendor", []);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<AccountRequest | null>(null);
  const [activatedVendorCredentials, setActivatedVendorCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const pendingAccounts = requests.data.filter((item) => item.status === "PENDING");
  const pendingVendors = vendors.data.filter((vendor) => vendor.status === "PENDING");

  async function decide(requestId: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setBusyId(requestId);
    try {
      const result = await sendJson("/api/account-request", "PATCH", { requestId, status });
      const request = requests.data.find((item) => item.id === requestId);
      if (status === "APPROVED" && request?.type === "VENDOR" && result.initialPassword) {
        setActivatedVendorCredentials({ name: request.vendorName || request.name, email: request.email, password: result.initialPassword });
      }
      if (detailRequest?.id === requestId) {
        setDetailRequest(null);
      }
      requests.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memproses request.");
    } finally {
      setBusyId(null);
    }
  }

  async function approveVendor(vendor: Vendor) {
    setError(null);
    setBusyId(vendor.id);
    try {
      const result = await sendJson("/api/vendor", "PATCH", { action: "APPROVE", vendorId: vendor.id });
      if (result.initialPassword) {
        setActivatedVendorCredentials({ name: vendor.name, email: vendor.email || "", password: result.initialPassword });
      }
      vendors.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal mengaktifkan akun vendor.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FeaturePage title="Aktivasi Akun" description="Aktifkan akun Vendor OS dan Mitra OS yang menunggu persetujuan." roles={["VM"]}>
      <FormError error={error} />
      <LoadingError loading={requests.loading || vendors.loading} error={requests.error || vendors.error} empty={!pendingAccounts.length && !pendingVendors.length} />
      {pendingVendors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Vendor OS Menunggu Persetujuan</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <DataTable headers={["Nama Vendor", "Email Akun", "Telepon", "Status", "Aksi"]}>
              {pendingVendors.map((vendor) => <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>{vendor.email || "-"}</TableCell>
                <TableCell>{vendor.phone || "-"}</TableCell>
                <TableCell><StatusBadge status={vendor.status} /></TableCell>
                <TableCell><Button disabled={busyId === vendor.id || !vendor.email} onClick={() => approveVendor(vendor)}>{busyId === vendor.id ? "Mengaktifkan..." : "Setujui Akun Vendor"}</Button></TableCell>
              </TableRow>)}
            </DataTable>
          </CardContent>
        </Card>
      )}
      {pendingAccounts.length > 0 && <Card><CardContent className="overflow-x-auto p-0">
        <h2 className="px-4 py-3 text-lg font-semibold">Akun Mitra OS Menunggu Persetujuan</h2>
          <DataTable headers={["Tanggal", "Nama", "Email", "Telepon", "Vendor/Pemohon", "Request OS", "Detail Data", "Status", "Aksi"]}>
            {pendingAccounts.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                <TableCell>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Jenis akun: {item.type === "VENDOR" ? "Vendor OS" : "Mitra OS"}</p>
                </TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.phone || "-"}</TableCell>
                <TableCell>{item.vendorName || item.requester?.name || "-"}</TableCell>
                <TableCell>{item.candidate ? `${getStatusLabel(item.candidate.osRequest.type)} · ${item.candidate.osRequest.jumlah} orang` : "-"}</TableCell>
                <TableCell>
                  {item.candidate ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setDetailRequest(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Lihat
                    </Button>
                  ) : "-"}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busyId === item.id} onClick={() => decide(item.id, "APPROVED")}>
                      {item.type === "VENDOR" ? "Aktifkan Akun Vendor" : "Aktivasi Akun"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => decide(item.id, "REJECTED")}>
                      Tolak
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
      </CardContent></Card>}
      {detailRequest && detailRequest.candidate && (
        <CandidateAccountDetailDialog
          request={detailRequest}
          busy={busyId === detailRequest.id}
          onClose={() => setDetailRequest(null)}
          onDecide={(status) => decide(detailRequest.id, status)}
        />
      )}
      <Dialog open={Boolean(activatedVendorCredentials)} onOpenChange={(open) => { if (!open) setActivatedVendorCredentials(null); }}>
        <DialogHeader><DialogTitle>Akun Vendor OS aktif</DialogTitle></DialogHeader>
        <DialogContent>
          {activatedVendorCredentials && <div className="space-y-2 text-sm">
            <p>Perusahaan: <strong>{activatedVendorCredentials.name}</strong></p>
            <p>Username: <strong>{activatedVendorCredentials.email}</strong></p>
            <p>Password awal: <code className="rounded bg-muted px-2 py-1">{activatedVendorCredentials.password}</code></p>
            <p className="text-xs text-muted-foreground">Simpan kredensial ini dan sampaikan kepada admin vendor. Password awal ditampilkan saat aktivasi.</p>
          </div>}
        </DialogContent>
      </Dialog>
    </FeaturePage>
  );
}

function DocumentPreviewTile({
  label,
  href,
  isImage,
}: {
  label: string;
  href: string;
  isImage: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground block">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" className="block group overflow-hidden rounded-lg border bg-muted/20">
        {isImage ? (
          <img
            src={href}
            alt={label}
            className="h-24 w-full object-contain group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex h-24 w-full flex-col items-center justify-center p-2 text-center hover:bg-muted/50 transition">
            <FileText className="h-7 w-7 text-primary" />
            <span className="mt-1 text-[11px] font-medium text-primary underline">Lihat {label} (PDF)</span>
          </div>
        )}
      </a>
    </div>
  );
}

function CandidateAccountDetailDialog({
  request,
  busy,
  onClose,
  onDecide,
}: {
  request: AccountRequest;
  busy: boolean;
  onClose: () => void;
  onDecide: (status: "APPROVED" | "REJECTED") => void;
}) {
  const candidate = request.candidate;
  if (!candidate) return null;

  const initials = (request.name || "K")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const ktpAddress = [
    candidate.provinsi,
    candidate.kabKota,
    candidate.kecamatan,
    candidate.kelurahan,
    candidate.alamat,
  ].filter(Boolean).join(", ");

  const domisiliAddress = candidate.domisiliSesuaiKtp === false
    ? [
        candidate.domisiliProvinsi,
        candidate.domisiliKabKota,
        candidate.domisiliKecamatan,
        candidate.domisiliKelurahan,
        candidate.domisiliAlamat,
      ].filter(Boolean).join(", ") || "-"
    : "Sesuai dengan alamat KTP";

  const hasDocuments = Boolean(
    candidate.fotoKtp || candidate.fotoSim || candidate.skck || candidate.hasSkbn || candidate.discReport,
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
          <User className="h-5 w-5 text-primary" />
          Detail Data Kandidat Mitra OS
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="p-0 max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          <div className="md:col-span-4 flex flex-col items-center text-center p-5 bg-muted/30 rounded-xl border space-y-3.5 h-fit">
            <div className="mt-1">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center text-primary shadow-xs">
                <span className="text-3xl font-bold tracking-wider">{initials}</span>
                <span className="text-[11px] text-muted-foreground mt-1">Kandidat Mitra OS</span>
              </div>
            </div>

            <div>
              <StatusBadge status={request.status} className="px-3 py-1 text-xs font-semibold shadow-xs" />
            </div>

            <div className="w-full space-y-1.5">
              <h3 className="font-bold text-lg text-foreground leading-tight">{request.name}</h3>
              <p className="text-xs font-medium text-primary bg-primary/10 py-0.5 px-2.5 rounded-full inline-block">
                {getStatusLabel(candidate.osRequest.type)} · {candidate.osRequest.jumlah} orang
              </p>
            </div>

            <div className="w-full text-left text-xs space-y-2.5 pt-3 border-t">
              <div className="flex items-start gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{candidate.osRequest.posisi || "-"}</p>
                  <p className="text-[11px] text-muted-foreground">{request.vendorName || request.requester?.name || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">{candidate.osRequest.penempatan || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">{candidate.osRequest.waktuKerja || "Shift belum diatur"}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-primary" />
                Data Pribadi &amp; Kontak
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">NIK</span>
                  <span className="font-medium text-foreground">{candidate.nik || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tanggal Pengajuan Akun</span>
                  <span className="font-medium text-foreground">{request.createdAt ? formatDate(request.createdAt) : "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Email</span>
                  <span className="font-medium text-foreground">{request.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nomor Handphone</span>
                  <span className="font-medium text-foreground">{request.phone || "-"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Alamat KTP</span>
                  <span className="font-medium text-foreground leading-relaxed">{ktpAddress || "-"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Alamat Domisili</span>
                  <span className="font-medium text-foreground leading-relaxed">{domisiliAddress}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Legalitas &amp; Hasil Seleksi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Surat Izin Mengemudi (SIM)</span>
                  <span className="font-medium text-foreground">
                    {[candidate.jenisSim, candidate.noSim].filter(Boolean).join(" · ") || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Hasil Utama DISC</span>
                  <span className="font-medium text-foreground">{candidate.discType || "-"}</span>
                </div>
                {candidate.alasanKeputusan && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Alasan Penerimaan SM</span>
                    <span className="font-medium text-foreground leading-relaxed whitespace-pre-wrap">{candidate.alasanKeputusan}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 pb-2 border-b text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Lampiran Dokumen &amp; Identitas
              </div>
              {hasDocuments ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {candidate.fotoKtp && (
                    <DocumentPreviewTile
                      label="Foto KTP"
                      href={candidate.fotoKtp}
                      isImage={!candidate.fotoKtp.startsWith("data:application/pdf")}
                    />
                  )}
                  {candidate.fotoSim && (
                    <DocumentPreviewTile
                      label="Foto SIM"
                      href={candidate.fotoSim}
                      isImage={!candidate.fotoSim.startsWith("data:application/pdf")}
                    />
                  )}
                  {candidate.skck && (
                    <DocumentPreviewTile
                      label="SKCK"
                      href={candidate.skck}
                      isImage={candidate.skck.startsWith("data:image/")}
                    />
                  )}
                  {candidate.hasSkbn && (
                    <DocumentPreviewTile
                      label="SKBN"
                      href={`/api/candidate/${candidate.id}/skbn`}
                      isImage={Boolean(candidate.skbnIsImage)}
                    />
                  )}
                  {candidate.discReport && (
                    <DocumentPreviewTile
                      label="Laporan DISC"
                      href={candidate.discReport}
                      isImage={candidate.discReport.startsWith("data:image/")}
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada lampiran dokumen.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      <DialogFooter className="border-t pt-4">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
          Tutup
        </Button>
        {request.status === "PENDING" && (
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onDecide("REJECTED")}>
              Tolak
            </Button>
            <Button type="button" disabled={busy} onClick={() => onDecide("APPROVED")}>
              {busy ? "Memproses..." : "Aktivasi Akun"}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}

function formatPeriodMonth(bulan: string): string {
  if (!bulan) return "-";
  const parts = bulan.split("-");
  if (parts.length < 2) return bulan;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return bulan;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function toLocalYmd(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function readUploadDataUrl(file: File, label = "File"): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`${label} gagal dibaca.`));
    };
    reader.onerror = () => reject(new Error(`${label} gagal dibaca.`));
    reader.readAsDataURL(file);
  });
}

export function ClaimsPage() {
  const { data: session } = useSession();
  const claims = useApiData<Claim[]>("/api/claim", []);
  const vendors = useApiData<Vendor[]>("/api/vendor", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

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
        dokumen: await readUploadDataUrl(file, "Dokumen klaim"),
        dokumenNama: file.name,
      });
      setUploadModalOpen(false);
      claims.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim klaim.");
    } finally {
      setSaving(false);
    }
  }

  const jenisOptions = Array.from(
    new Set(claims.data.map((item) => item.jenisClaim.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "id"));

  const [normalizedStart, normalizedEnd] =
    filterStartDate && filterEndDate && filterStartDate > filterEndDate
      ? [filterEndDate, filterStartDate]
      : [filterStartDate, filterEndDate];

  const filteredClaims = claims.data.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchJenis = item.jenisClaim.toLowerCase().includes(q);
      const matchVendor = (item.vendor?.name || "").toLowerCase().includes(q);
      const matchCatatan = (item.catatan || "").toLowerCase().includes(q);
      if (!matchJenis && !matchVendor && !matchCatatan) return false;
    }
    if (filterVendorId !== "ALL" && item.vendorId !== filterVendorId) {
      return false;
    }
    if (filterStatus !== "ALL" && item.status !== filterStatus) {
      return false;
    }
    if (filterJenis !== "ALL" && item.jenisClaim !== filterJenis) {
      return false;
    }
    if (filterBulan && item.bulan !== filterBulan) {
      return false;
    }
    if (normalizedStart || normalizedEnd) {
      const itemDate = toLocalYmd(item.createdAt);
      if (!itemDate) return false;
      if (normalizedStart && itemDate < normalizedStart) return false;
      if (normalizedEnd && itemDate > normalizedEnd) return false;
    }
    return true;
  });

  const hasActiveFilter = Boolean(
    searchQuery ||
      filterVendorId !== "ALL" ||
      filterStatus !== "ALL" ||
      filterJenis !== "ALL" ||
      filterBulan ||
      filterStartDate ||
      filterEndDate
  );

  function resetFilters() {
    setSearchQuery("");
    setFilterVendorId("ALL");
    setFilterStatus("ALL");
    setFilterJenis("ALL");
    setFilterBulan("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  const totalClaimsCount = claims.data.length;
  const activeClaims = claims.data.filter((c) => c.status !== "REJECTED");
  const activeClaimsCount = activeClaims.length;
  const totalMitraAffected = activeClaims.reduce((sum, c) => sum + (c.jumlahMitra || 0), 0);
  const totalNominalKlaim = activeClaims.reduce((sum, c) => sum + (c.nominal || 0), 0);

  return (
    <FeaturePage
      title="Daftar Klaim"
      description="Kelola data klaim operasional mitra serta rincian potongan tagihan per vendor."
      roles={["VENDOR", "VM"]}
    >
      {!uploadModalOpen && <FormError error={error} />}

      {/* Ringkasan Daftar Klaim */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Data Klaim</p>
          <p className="text-2xl font-bold text-foreground">{totalClaimsCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-blue-600 font-medium">Klaim Aktif</p>
          <p className="text-2xl font-bold text-blue-600">{activeClaimsCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-green-600 font-medium">Total Mitra Terdampak</p>
          <p className="text-2xl font-bold text-green-600">{totalMitraAffected}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-primary font-medium">Total Nominal Klaim</p>
          <p className="text-lg sm:text-xl font-bold text-primary truncate" title={formatCurrency(totalNominalKlaim)}>
            {formatCurrency(totalNominalKlaim)}
          </p>
        </div>
      </div>

      {/* Toolbar: Filter & Tombol Upload Klaim */}
      <div className="flex flex-col gap-3 bg-card p-4 rounded-xl border shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Pencarian */}
            <div className="relative min-w-44 sm:min-w-56 flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari jenis klaim / vendor / catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(fieldClass, "pl-9 text-xs h-9")}
              />
            </div>

            {/* Filter Vendor (untuk VM) */}
            {session?.user.role !== "VENDOR" && (
              <div className="min-w-40">
                <select
                  value={filterVendorId}
                  onChange={(e) => setFilterVendorId(e.target.value)}
                  className={cn(fieldClass, "text-xs h-9")}
                >
                  <option value="ALL">Semua Vendor</option>
                  {vendors.data.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Status */}
            <div className="min-w-36">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={cn(fieldClass, "text-xs h-9")}
              >
                <option value="ALL">Semua Status</option>
                <option value="SUBMITTED">Diajukan</option>
                <option value="APPROVED">Disetujui</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>

            {/* Filter Jenis Klaim */}
            {jenisOptions.length > 0 && (
              <div className="min-w-36">
                <select
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                  className={cn(fieldClass, "text-xs h-9")}
                >
                  <option value="ALL">Semua Jenis</option>
                  {jenisOptions.map((jenis) => (
                    <option key={jenis} value={jenis}>
                      {jenis}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Bulan Klaim */}
            <div className="min-w-36">
              <input
                type="month"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className={cn(fieldClass, "text-xs h-9")}
                title="Filter bulan klaim"
              />
            </div>

            {/* Filter Rentang Tanggal Input */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className={cn(fieldClass, "text-xs h-9 w-36")}
                title="Tanggal input mulai"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className={cn(fieldClass, "text-xs h-9 w-36")}
                title="Tanggal input selesai"
              />
            </div>

            {/* Tombol Reset Filter */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs h-9 text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          {/* Tombol Upload Klaim di sebelah kanan */}
          {session?.user.role === "VM" && (
            <Button
              onClick={() => { setError(null); setUploadModalOpen(true); }}
              className="flex items-center gap-2 text-xs h-9 px-4 shrink-0 shadow-xs"
            >
              <Upload className="h-4 w-4" />
              Upload Klaim
            </Button>
          )}
        </div>
      </div>

      {/* Tabel Daftar Klaim */}
      <Card><CardContent className="overflow-x-auto p-0">
        <LoadingError loading={claims.loading} error={claims.error} empty={!filteredClaims.length} />
        {!claims.loading && !claims.error && filteredClaims.length > 0 && (
          <DataTable headers={[
            "Tanggal",
            "Bulan Klaim",
            ...(session?.user.role !== "VENDOR" ? ["Vendor"] : []),
            "Jenis Klaim",
            "Jumlah Mitra",
            "Nominal Klaim",
            "Catatan",
            "Dokumen Klaim",
            "Status",
          ]}>
            {filteredClaims.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {item.createdAt ? formatDate(item.createdAt) : "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-foreground">
                    {formatPeriodMonth(item.bulan)}
                  </span>
                </TableCell>
                {session?.user.role !== "VENDOR" && (
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {item.vendor?.name || "-"}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-foreground border">
                    {item.jenisClaim}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-foreground">
                    {item.jumlahMitra} mitra
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-foreground">
                    {formatCurrency(item.nominal)}
                  </span>
                </TableCell>
                <TableCell>
                  {item.catatan ? (
                    <span className="text-xs text-muted-foreground block max-w-[180px] truncate" title={item.catatan}>
                      {item.catatan}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.hasDokumen ? (
                    <a
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-foreground border transition-colors font-medium"
                      href={`/api/claim/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate max-w-[140px]">{item.dokumenNama || "Lihat File"}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>

      {/* Modal Upload Data Klaim (VM) */}
      {uploadModalOpen && session?.user.role === "VM" && (
        <Dialog open onOpenChange={(open) => { if (!open && !saving) { setError(null); setUploadModalOpen(false); } }} className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Upload className="h-5 w-5 text-primary" />
              Upload Klaim Baru
            </DialogTitle>
          </DialogHeader>
          <DialogContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 rounded-lg border border-blue-200/70 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Alur Pemotongan Klaim:</p>
                <p className="leading-relaxed text-[11px]">
                  Klaim yang diunggah untuk vendor dan bulan tertentu akan tercatat pada <em>Daftar Klaim</em> dan otomatis menjadi potongan tagihan pada pengajuan <em>Invoice</em> di bulan tagihan yang sama.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Vendor<RequiredMark />
                  <select className={fieldClass} name="vendorId" required defaultValue="">
                    <option value="" disabled>Pilih vendor</option>
                    {vendors.data.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  Bulan Klaim<RequiredMark />
                  <input className={fieldClass} type="month" name="bulan" required />
                </label>
                <label className="space-y-1 text-sm">
                  Jenis Klaim<RequiredMark />
                  <input className={fieldClass} name="jenisClaim" placeholder="Contoh: GAJI, BPJS, LEMBUR" required />
                </label>
                <label className="space-y-1 text-sm">
                  Jumlah Mitra<RequiredMark />
                  <input className={fieldClass} type="number" min="1" name="jumlahMitra" placeholder="Contoh: 5" required />
                </label>
                <label className="space-y-1 text-sm">
                  Nominal Total (Rp)<RequiredMark />
                  <input className={fieldClass} type="number" min="0" step="any" name="nominal" placeholder="Contoh: 500000" required />
                </label>
                <label className="space-y-1 text-sm">
                  Catatan<OptionalMark />
                  <input className={fieldClass} name="catatan" placeholder="Keterangan klaim jika ada" />
                </label>
              </div>

              <div className="pt-2 border-t">
                <DocumentFileInput
                  name="dokumen"
                  label="Dokumen Klaim (PDF/JPG/PNG, maks. 5 MB)"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  required
                  helpText="Unggah bukti atau rincian klaim operasional."
                />
              </div>

              <FormError error={error} />
              {vendors.error && <FormError error={`Data vendor gagal dimuat: ${vendors.error}`} />}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => { setError(null); setUploadModalOpen(false); }}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving || vendors.loading} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {saving ? "Mengunggah..." : "Upload Klaim"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </FeaturePage>
  );
}

export function InvoicesPage() {
  const { data: session } = useSession();
  const invoices = useApiData<Invoice[]>("/api/invoice", []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [proofTargetInvoice, setProofTargetInvoice] = useState<Invoice | null>(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

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
        buktiTransfer: await readUploadDataUrl(file, "File invoice"),
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
        dokumen: await readUploadDataUrl(file, "File invoice"),
        dokumenNama: file.name,
      });
      setUploadModalOpen(false);
      invoices.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengirim invoice.");
    } finally {
      setSaving(false);
    }
  }

  const filteredInvoices = invoices.data.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNomor = item.nomorInvoice.toLowerCase().includes(q);
      const matchVendor = (item.vendor?.name || "").toLowerCase().includes(q);
      if (!matchNomor && !matchVendor) return false;
    }
    if (filterStatus !== "ALL" && item.status !== filterStatus) {
      return false;
    }
    if (filterBulan && item.bulan !== filterBulan) {
      return false;
    }
    if (filterStartDate) {
      const itemDate = toLocalYmd(item.createdAt);
      if (itemDate && itemDate < filterStartDate) return false;
    }
    if (filterEndDate) {
      const itemDate = toLocalYmd(item.createdAt);
      if (itemDate && itemDate > filterEndDate) return false;
    }
    return true;
  });

  const hasActiveFilter = Boolean(searchQuery || filterStatus !== "ALL" || filterBulan || filterStartDate || filterEndDate);

  function resetFilters() {
    setSearchQuery("");
    setFilterStatus("ALL");
    setFilterBulan("");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  const totalInvoicesCount = invoices.data.length;
  const pendingInvoicesCount = invoices.data.filter((i) => i.status === "SUBMITTED").length;
  const paidInvoicesCount = invoices.data.filter((i) => i.status === "PAID").length;
  const totalNominalTagihan = invoices.data.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalPotonganKlaimSum = invoices.data.reduce((sum, i) => sum + (i.totalPotonganKlaim || 0), 0);
  const totalBersihSum = invoices.data.reduce((sum, i) => sum + (i.totalBersih ?? i.totalAmount), 0);

  return (
    <FeaturePage
      title="Invoice"
      description="Kelola dan pantau daftar pengajuan invoice vendor serta pelunasan tagihan oleh VM."
      roles={["VENDOR", "VM"]}
    >
      <FormError error={error} />

      {/* Ringkasan Status Invoice */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Total Pengajuan</p>
          <p className="text-2xl font-bold text-foreground">{totalInvoicesCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-blue-600 font-medium">Menunggu Pembayaran</p>
          <p className="text-2xl font-bold text-blue-600">{pendingInvoicesCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <p className="text-xs text-green-600 font-medium">Sudah Dibayar</p>
          <p className="text-2xl font-bold text-green-600">{paidInvoicesCount}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-primary font-medium">Total Dibayarkan (Netto)</p>
            {totalPotonganKlaimSum > 0 && (
              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title={`Total klaim dipotong: ${formatCurrency(totalPotonganKlaimSum)}`}>
                Klaim: -{formatCurrency(totalPotonganKlaimSum)}
              </span>
            )}
          </div>
          <p className="text-lg sm:text-xl font-bold text-primary truncate" title={formatCurrency(totalBersihSum)}>
            {formatCurrency(totalBersihSum)}
          </p>
        </div>
      </div>

      {/* Toolbar: Filter & Tombol Upload Invoice */}
      <div className="flex flex-col gap-3 bg-card p-4 rounded-xl border shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Pencarian */}
            <div className="relative min-w-44 sm:min-w-56 flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nomor invoice / vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(fieldClass, "pl-9 text-xs h-9")}
              />
            </div>

            {/* Filter Kategori Status: SUBMITTED (Menunggu Pembayaran), PAID (Sudah Dibayar), REJECTED (Ditolak) */}
            <div className="min-w-40">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={cn(fieldClass, "text-xs h-9")}
              >
                <option value="ALL">Semua Status</option>
                <option value="SUBMITTED">Menunggu Pembayaran</option>
                <option value="PAID">Sudah Dibayar</option>
                <option value="REJECTED">Ditolak / Dibatalkan</option>
              </select>
            </div>

            {/* Filter Bulan Tagihan */}
            <div className="min-w-36">
              <input
                type="month"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className={cn(fieldClass, "text-xs h-9")}
                title="Filter bulan tagihan"
              />
            </div>

            {/* Filter Rentang Tanggal Pengajuan */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className={cn(fieldClass, "text-xs h-9 w-36")}
                title="Tanggal pengajuan mulai"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className={cn(fieldClass, "text-xs h-9 w-36")}
                title="Tanggal pengajuan selesai"
              />
            </div>

            {/* Tombol Reset Filter */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs h-9 text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          {/* Tombol Upload Invoice di sebelah kanan */}
          {session?.user.role === "VENDOR" && (
            <Button
              onClick={() => { setError(null); setUploadModalOpen(true); }}
              className="flex items-center gap-2 text-xs h-9 px-4 shrink-0 shadow-xs"
            >
              <Upload className="h-4 w-4" />
              Upload Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Tabel Daftar Pengajuan Invoice */}
      <Card><CardContent className="overflow-x-auto p-0">
        <LoadingError loading={invoices.loading} error={invoices.error} empty={!filteredInvoices.length} />
        {!invoices.loading && !invoices.error && filteredInvoices.length > 0 && (
          <DataTable headers={[
            "Tanggal",
            "Nomor Invoice",
            "Bulan Tagihan",
            ...(session?.user.role !== "VENDOR" ? ["Vendor"] : []),
            "Total Tagihan",
            "Potongan Klaim",
            "Total Dibayarkan",
            "Jatuh Tempo",
            "Dokumen Invoice",
            "Bukti Transfer",
            "Status",
          ]}>
            {filteredInvoices.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {item.createdAt ? formatDate(item.createdAt) : "-"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-semibold text-xs text-primary">
                    {item.nomorInvoice}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-foreground">
                    {formatPeriodMonth(item.bulan)}
                  </span>
                </TableCell>
                {session?.user.role !== "VENDOR" && (
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {item.vendor?.name || "-"}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-xs font-medium text-foreground">
                    {formatCurrency(item.totalAmount)}
                  </span>
                </TableCell>
                <TableCell>
                  {item.totalPotonganKlaim && item.totalPotonganKlaim > 0 ? (
                    <div className="space-y-0.5 text-xs">
                      <span className="font-semibold text-rose-600 block">
                        - {formatCurrency(item.totalPotonganKlaim)}
                      </span>
                      {item.claims && item.claims.length > 0 && (
                        <span
                          className="text-[10px] text-muted-foreground block truncate max-w-[130px] cursor-help"
                          title={item.claims.map((c) => `${c.jenisClaim}: ${formatCurrency(c.nominal)}`).join(", ")}
                        >
                          {item.claims.length} klaim ({item.claims.map((c) => c.jenisClaim).join(", ")})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-foreground">
                    {formatCurrency(item.totalBersih ?? item.totalAmount)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {item.tanggalJatuhTempo ? formatDate(item.tanggalJatuhTempo) : "-"}
                  </span>
                </TableCell>
                <TableCell>
                  {item.hasDokumen ? (
                    <a
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-foreground border transition-colors font-medium"
                      href={`/api/invoice/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate max-w-[120px]">{item.dokumenNama || "Lihat File"}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ) : "-"}
                </TableCell>
                <TableCell className="min-w-44">
                  {item.hasBuktiTransfer ? (
                    <a
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors font-medium"
                      href={`/api/invoice/${item.id}?type=transfer`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span className="truncate max-w-[120px]">{item.buktiTransferNama || "Lihat Bukti"}</span>
                      <ExternalLink className="h-3 w-3 text-green-600" />
                    </a>
                  ) : session?.user.role === "VM" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => setProofTargetInvoice(item)}
                    >
                      <Upload className="h-3 w-3" />
                      Upload Bukti
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Belum ada</span>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>

      {/* Modal Upload Invoice Baru */}
      {uploadModalOpen && (
        <Dialog open onOpenChange={(open) => { if (!open && !saving) setUploadModalOpen(false); }} className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Upload className="h-5 w-5 text-primary" />
              Upload Invoice Baru
            </DialogTitle>
          </DialogHeader>
          <DialogContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 rounded-lg border border-blue-200/70 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Alur Pembayaran Invoice:</p>
                <p className="leading-relaxed text-[11px]">
                  Invoice yang diajukan akan berstatus <strong>Menunggu Pembayaran</strong> untuk diproses oleh tim VM. Apabila terdapat klaim operasional pada bulan tagihan ini di <em>Daftar Klaim</em>, nominal tagihan akan otomatis disesuaikan dengan potongan klaim tersebut.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Bulan Tagihan<RequiredMark />
                  <input className={fieldClass} type="month" name="bulan" required />
                </label>
                <label className="space-y-1 text-sm">
                  Total Tagihan (Rp)<RequiredMark />
                  <input className={fieldClass} type="number" min="0" step="any" name="totalAmount" placeholder="Contoh: 15000000" required />
                </label>
                <label className="space-y-1 text-sm">
                  Jatuh Tempo<OptionalMark />
                  <input className={fieldClass} type="date" name="tanggalJatuhTempo" />
                </label>
                <label className="space-y-1 text-sm">
                  Catatan<OptionalMark />
                  <input className={fieldClass} name="catatan" placeholder="Catatan invoice jika ada" />
                </label>
              </div>

              <div className="pt-2 border-t">
                <DocumentFileInput
                  name="dokumen"
                  label="File Dokumen Invoice (PDF/JPG/PNG, maks. 5 MB)"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  required
                  helpText="Unggah scan dokumen invoice resmi dari Vendor."
                />
              </div>

              <FormError error={error} />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setUploadModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {saving ? "Mengunggah..." : "Upload Invoice"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Upload Bukti Transfer untuk VM */}
      {proofTargetInvoice && (
        <Dialog open onOpenChange={(open) => { if (!open && !uploadingInvoiceId) setProofTargetInvoice(null); }} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Check className="h-5 w-5 text-green-600" />
              Upload Bukti Pembayaran
            </DialogTitle>
          </DialogHeader>
          <DialogContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const file = form.get("buktiTransfer");
                if (file instanceof File && file.size > 0) {
                  await uploadPaymentProof(proofTargetInvoice.id, file);
                  setProofTargetInvoice(null);
                }
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor Invoice:</span>
                  <strong className="font-mono text-primary">{proofTargetInvoice.nomorInvoice}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <strong>{proofTargetInvoice.vendor?.name || "-"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bulan Periode:</span>
                  <strong>{formatPeriodMonth(proofTargetInvoice.bulan)}</strong>
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tagihan Awal:</span>
                    <span className="font-medium">{formatCurrency(proofTargetInvoice.totalAmount)}</span>
                  </div>
                  {proofTargetInvoice.totalPotonganKlaim && proofTargetInvoice.totalPotonganKlaim > 0 ? (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Potongan Klaim ({proofTargetInvoice.claims?.length || 0} klaim):</span>
                      <span>- {formatCurrency(proofTargetInvoice.totalPotonganKlaim)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Potongan Klaim:</span>
                      <span>Tidak ada klaim (Rp 0)</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1.5 border-t text-foreground">
                    <span>Total Bersih Ditransfer:</span>
                    <span className="text-primary text-base">
                      {formatCurrency(proofTargetInvoice.totalBersih ?? proofTargetInvoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <DocumentFileInput
                name="buktiTransfer"
                label="File Bukti Transfer (PDF/JPG/PNG, maks. 5 MB)"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                required
                helpText="Unggah bukti transfer pembayaran invoice yang telah dibayarkan VM."
              />

              <FormError error={error} />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" disabled={Boolean(uploadingInvoiceId)} onClick={() => setProofTargetInvoice(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={Boolean(uploadingInvoiceId)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {uploadingInvoiceId ? "Mengunggah..." : "Simpan Bukti Pembayaran"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
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
      const result = await sendJson("/api/candidate", "PATCH", {
        ...candidateDecision,
        alasanKeputusan: candidateDecisionReason.trim(),
      });
      requests.reload();
      setCandidateDecision(result.nextCandidateToRejectId
        ? { candidateId: result.nextCandidateToRejectId, decision: "REJECTED" }
        : null);
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
    if (!String(form.get("alasan") || "").trim()) {
      setError("Alasan permintaan wajib diisi.");
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
  const resolveMitraTargets = (item: OSRequest) => {
    if (item.type !== "PERGANTIAN" && item.type !== "PENGURANGAN") return [];
    if (item.mitraTargets?.length) {
      return item.mitraTargets.map((profileId) => {
        const target = mitras.data.find((mitra) => mitra.mitraProfile?.id === profileId);
        return {
          id: target?.mitraProfile?.idMitraOs || item.idMitraOs || item.idPergantian || "-",
          name: target?.name || null,
          posisi: target?.mitraProfile?.posisi || null,
          penempatan: target?.mitraProfile?.penempatan || null,
        };
      });
    }
    const fallbackId = item.idMitraOs || item.idPergantian;
    if (!fallbackId) return [];
    const target = mitras.data.find(
      (mitra) => mitra.mitraProfile?.idMitraOs === fallbackId || mitra.mitraProfile?.id === fallbackId,
    );
    return [{
      id: fallbackId,
      name: target?.name || null,
      posisi: target?.mitraProfile?.posisi || null,
      penempatan: target?.mitraProfile?.penempatan || null,
    }];
  };
  const activeReviewTargets = activeReviewRequest ? resolveMitraTargets(activeReviewRequest) : [];
  const activeReviewStatusKey = activeReviewRequest ? getOSRequestStatus(activeReviewRequest.status) : "";
  const activeReviewRequiresCandidates = Boolean(
    activeReviewRequest && activeReviewRequest.type !== "PENGURANGAN",
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
    "Detail",
    ...(session?.user.role === "VENDOR" ? ["Aksi"] : []),
  ];
  const renderRequestRows = (items: OSRequest[]) => (
    <DataTable headers={tableHeaders}>
      {items.map((item) => {
        const targetMitras = resolveMitraTargets(item);
        return (
        <TableRow key={item.id}>
          <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell>
          <TableCell>{item.type}</TableCell>
          <TableCell>{item.jumlah}</TableCell>
          <TableCell>
            {targetMitras.length ? targetMitras.map((target) => target.id).join(", ") : "-"}
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
          <TableCell>
            {session?.user.role === "SM" && getOSRequestStatus(item.status) === "OS_WAITING_SELECTION" ? (
              <Button size="sm" variant="default" onClick={() => setActiveReviewRequestId(item.id)}>
                Tinjau Kandidat
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setActiveReviewRequestId(item.id)}>
                Lihat Detail
              </Button>
            )}
          </TableCell>
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
        );
      })}
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
            <label className="space-y-1 text-sm md:col-span-2">
              Alasan permintaan<RequiredMark />
              <textarea
                className={fieldClass}
                name="alasan"
                rows={3}
                maxLength={2000}
                required
                placeholder={
                  requestType === "PENAMBAHAN"
                    ? "Tuliskan alasan kebutuhan penambahan tenaga OS..."
                    : requestType === "PERGANTIAN"
                      ? "Tuliskan alasan pergantian mitra OS..."
                      : "Tuliskan alasan pengurangan mitra OS..."
                }
              />
            </label>
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
          <details>
          <summary className="cursor-pointer list-none px-6 py-4">
            <span className="font-semibold">Pemberitahuan Mitra OS ({recentVendorNotifications.length})</span>
            <span className="ml-2 text-sm text-muted-foreground">Request penambahan, pergantian, atau pengurangan · 14 hari terakhir</span>
          </summary>
          <CardContent className="space-y-2 border-t text-sm">
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
          </details>
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
      <Dialog
        open={Boolean(activeReviewRequestId)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveReviewRequestId(null);
            setCandidateDecision(null);
            setCandidateDecisionReason("");
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {session?.user.role === "SM" && activeReviewStatusKey === "OS_WAITING_SELECTION"
              ? "Detail Request & Seleksi Kandidat"
              : "Detail Request OS"} — {activeReviewRequest?.posisi || getStatusLabel(activeReviewRequest?.type || "") || "Permintaan"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {activeReviewRequest ? `${getStatusLabel(activeReviewRequest.type)} · ${activeReviewRequest.jumlah} orang · ${activeReviewRequest.vendor?.name || "Vendor belum dipilih"}` : ""}
          </p>
        </DialogHeader>
        <DialogContent className="space-y-5">
          {activeReviewRequest && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Informasi Request OS</h3>
                <StatusBadge status={activeReviewStatusKey} />
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Jenis Permintaan</p>
                  <p className="font-medium">{getStatusLabel(activeReviewRequest.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Pengajuan</p>
                  <p className="font-medium">{activeReviewRequest.createdAt ? formatDate(activeReviewRequest.createdAt) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pemohon</p>
                  <p className="font-medium">{activeReviewRequest.requester?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Posisi</p>
                  <p className="font-medium">{activeReviewRequest.posisi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wilayah Operasional</p>
                  <p className="font-medium">{activeReviewRequest.penempatan || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Waktu Kerja</p>
                  <p className="font-medium">{activeReviewRequest.waktuKerja || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jumlah Kebutuhan</p>
                  <p className="font-medium">{activeReviewRequest.jumlah} orang</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Vendor</p>
                  <p className="font-medium">{activeReviewRequest.vendor?.name || "Belum dipilih"}</p>
                </div>
              </div>
              {activeReviewTargets.length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    {activeReviewRequest.type === "PENGURANGAN" ? "Mitra OS yang Dikurangi" : "Mitra OS yang Diganti"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeReviewTargets.map((target, index) => (
                      <span
                        key={`${target.id}-${index}`}
                        className="inline-flex items-center rounded-md border bg-background px-2.5 py-1 text-xs font-medium"
                      >
                        {target.id}
                        {target.name ? ` — ${target.name}` : ""}
                        {target.posisi ? ` (${target.posisi})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Alasan Request</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{activeReviewRequest.alasan || "-"}</p>
              </div>
              {activeReviewRequest.catatan && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">Catatan</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{activeReviewRequest.catatan}</p>
                </div>
              )}
              {activeReviewRequest.approvals && activeReviewRequest.approvals.length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">Riwayat Approval</p>
                  <div className="space-y-2">
                    {activeReviewRequest.approvals.map((approval) => (
                      <div key={approval.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium">{approval.level}</span>
                          {approval.approver?.name ? ` · ${approval.approver.name}` : ""}
                          {approval.catatan ? (
                            <p className="mt-0.5 text-muted-foreground">
                              {approval.status === "REJECTED" ? `Alasan penolakan: ${approval.catatan}` : approval.catatan}
                            </p>
                          ) : null}
                        </div>
                        <StatusBadge status={approval.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeReviewRequiresCandidates ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Permintaan pengurangan tenaga OS tidak memerlukan pengajuan maupun seleksi kandidat baru.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Data &amp; Seleksi Kandidat</h3>
                {Boolean(activeReviewRequest?.candidates?.length) && (
                  <p className="text-xs text-muted-foreground">
                    Kandidat diterima: <span className="font-medium text-foreground">{acceptedCandidateCount} / {activeReviewRequest?.jumlah || 0}</span>
                    {!hasSelectionCapacity && " · Kuota penerimaan sudah terpenuhi."}
                  </p>
                )}
              </div>

              {(!activeReviewRequest?.candidates || activeReviewRequest.candidates.length === 0) ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  <p>Belum ada data kandidat yang dikirim oleh vendor untuk permintaan ini.</p>
                  <p className="mt-1 text-xs">
                    Tahap saat ini: <span className="font-medium text-foreground">{getStatusLabel(activeReviewStatusKey)}</span>
                  </p>
                </div>
              ) : session?.user.role === "SM" ? (
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
                      {candidateDecision?.candidateId === candidate.id && (
                        <div className={`mt-4 space-y-3 rounded-md border p-3 ${candidateDecision.decision === "REJECTED" ? "border-red-300 bg-red-50" : "bg-muted"}`}>
                          <label className="block space-y-1 text-sm font-medium">
                            {candidateDecision.decision === "REJECTED" ? "Alasan kandidat ditolak" : "Alasan kandidat diterima"}<RequiredMark />
                            <textarea
                              className={fieldClass}
                              rows={3}
                              value={candidateDecisionReason}
                              onChange={(event) => setCandidateDecisionReason(event.target.value)}
                              maxLength={2000}
                              required
                              placeholder={candidateDecision.decision === "REJECTED" ? "Tuliskan alasan penolakan kandidat..." : "Tuliskan alasan penerimaan kandidat..."}
                            />
                          </label>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setCandidateDecision(null)}>Batal</Button>
                            <Button type="button" disabled={candidateActionId === candidate.id || !candidateDecisionReason.trim()} onClick={decideCandidate}>
                              {candidateActionId === candidate.id ? "Menyimpan..." : "Simpan keputusan"}
                            </Button>
                          </div>
                        </div>
                      )}
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
                    </div>
                  );
                })
              ) : (
                <div className="space-y-2">
                  {activeReviewRequest.candidates.map((candidate) => (
                    <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.email || "-"}</p>
                      </div>
                      <StatusBadge status={candidate.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const rejectTarget = approvals.data.find((item) => item.id === rejectTargetId) || null;

  async function decide(approvalId: string, status: "APPROVED" | "REJECTED", catatan?: string) {
    setError(null);
    if (status === "REJECTED" && !catatan?.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }
    setBusyId(approvalId);
    try {
      await sendJson("/api/approval", "POST", {
        approvalId,
        status,
        ...(catatan?.trim() ? { catatan: catatan.trim() } : {}),
      });
      if (status === "REJECTED") {
        setRejectTargetId(null);
        setRejectReason("");
      }
      approvals.reload();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memproses approval.");
    } finally {
      setBusyId(null);
    }
  }

  function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectTarget) return;
    decide(rejectTarget.id, "REJECTED", rejectReason);
  }

  return (
    <FeaturePage title="Approval Request" description="Tinjau dan berikan keputusan untuk request OS." roles={["GM", "COO"]}>
      <FormError error={error} />
      <Card><CardContent className="p-0">
        <LoadingError loading={approvals.loading} error={approvals.error} empty={!approvals.data.length} />
        {!approvals.loading && !approvals.error && approvals.data.length > 0 && (
          <DataTable headers={["Tanggal", "Level", "Jenis", "Jumlah", "Posisi", "Wilayah", "Alasan Request", "Pemohon", "Status", "Aksi"]}>
            {approvals.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                <TableCell>{item.level}</TableCell>
                <TableCell>{getStatusLabel(item.osRequest.type)}</TableCell>
                <TableCell>{item.osRequest.jumlah}</TableCell>
                <TableCell>{item.osRequest.posisi || "-"}</TableCell>
                <TableCell>{item.osRequest.penempatan || "-"}</TableCell>
                <TableCell className="max-w-xs whitespace-pre-wrap text-xs">{item.osRequest.alasan || "-"}</TableCell>
                <TableCell>{item.osRequest.requester?.name || "-"}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <StatusBadge status={item.status} />
                    {item.catatan && (
                      <p className="max-w-xs whitespace-pre-wrap text-xs text-muted-foreground">
                        {item.status === "REJECTED" ? `Alasan penolakan: ${item.catatan}` : item.catatan}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busyId === item.id} onClick={() => decide(item.id, "APPROVED")}>
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => {
                          setError(null);
                          setRejectTargetId(item.id);
                          setRejectReason("");
                        }}
                      >
                        Tolak
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </CardContent></Card>
      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open && busyId !== rejectTarget?.id) {
            setRejectTargetId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Tolak Request OS ({rejectTarget?.level})</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {rejectTarget
              ? `${getStatusLabel(rejectTarget.osRequest.type)} · ${rejectTarget.osRequest.jumlah} orang · ${rejectTarget.osRequest.posisi || "-"} (${rejectTarget.osRequest.penempatan || "-"})`
              : ""}
          </p>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {rejectTarget?.osRequest.alasan && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Alasan dari Pemohon ({rejectTarget.osRequest.requester?.name || "-"})</p>
              <p className="mt-1 whitespace-pre-wrap">{rejectTarget.osRequest.alasan}</p>
            </div>
          )}
          <form id="approval-reject-form" onSubmit={submitReject} className="space-y-3">
            <label className="block space-y-1 text-sm font-medium">
              Alasan penolakan<RequiredMark />
              <textarea
                className={fieldClass}
                rows={4}
                maxLength={2000}
                required
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Tuliskan alasan penolakan permintaan OS..."
              />
            </label>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busyId === rejectTarget?.id}
            onClick={() => {
              setRejectTargetId(null);
              setRejectReason("");
            }}
          >
            Batal
          </Button>
          <Button
            type="submit"
            form="approval-reject-form"
            variant="destructive"
            disabled={!rejectTarget || busyId === rejectTarget.id || !rejectReason.trim()}
          >
            {busyId === rejectTarget?.id ? "Menyimpan..." : "Konfirmasi Tolak"}
          </Button>
        </DialogFooter>
      </Dialog>
    </FeaturePage>
  );
}
