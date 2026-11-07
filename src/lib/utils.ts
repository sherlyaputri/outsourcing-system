import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    APPROVED_GM: 'bg-blue-100 text-blue-800',
    APPROVED_COO: 'bg-indigo-100 text-indigo-800',
    REJECTED: 'bg-red-100 text-red-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    VERIFIED: 'bg-purple-100 text-purple-800',
    PAID: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    VENDOR_SELECTED: 'bg-cyan-100 text-cyan-800',
    HADIR: 'bg-green-100 text-green-800',
    IZIN: 'bg-yellow-100 text-yellow-800',
    SAKIT: 'bg-orange-100 text-orange-800',
    ALPHA: 'bg-red-100 text-red-800',
    ACTIVATED: 'bg-green-100 text-green-800',
    KANDIDAT: 'bg-gray-100 text-gray-800',
    TERPILIH: 'bg-green-100 text-green-800',
    DITOLAK: 'bg-red-100 text-red-800',
    REPLACED: 'bg-orange-100 text-orange-800',
    OS_WAITING_GM: 'bg-yellow-100 text-yellow-800',
    OS_WAITING_COO: 'bg-yellow-100 text-yellow-800',
    OS_WAITING_VENDOR_DATA: 'bg-cyan-100 text-cyan-800',
    OS_WAITING_VENDOR_REQUEST: 'bg-cyan-100 text-cyan-800',
    OS_WAITING_ACTIVATION: 'bg-blue-100 text-blue-800',
    OS_WAITING_SELECTION: 'bg-yellow-100 text-yellow-800',
    OS_NOT_SELECTED: 'bg-red-100 text-red-800',
    WAITING_SELECTION: 'bg-yellow-100 text-yellow-800',
    WAITING_ACTIVATION: 'bg-blue-100 text-blue-800',
    IN_SELECTION: 'bg-yellow-100 text-yellow-800',
    HIRED: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    APPROVED_GM: 'Disetujui GM',
    APPROVED_COO: 'Disetujui COO',
    REJECTED: 'Ditolak',
    DRAFT: 'Draft',
    SUBMITTED: 'Diajukan',
    VERIFIED: 'Diverifikasi',
    PAID: 'Sudah Dibayar',
    COMPLETED: 'Selesai',
    IN_PROGRESS: 'Sedang Proses',
    VENDOR_SELECTED: 'Vendor Dipilih',
    HADIR: 'Hadir',
    IZIN: 'Izin',
    SAKIT: 'Sakit',
    ALPHA: 'Alpha',
    ACTIVATED: 'Aktif',
    KANDIDAT: 'Kandidat',
    TERPILIH: 'Lolos Seleksi',
    DITOLAK: 'Tidak Lolos Seleksi',
    REPLACED: 'Diganti',
    OS_WAITING_GM: 'Menunggu Approval GM',
    OS_WAITING_COO: 'Menunggu Approval COO',
    OS_WAITING_VENDOR_DATA: 'Menunggu Vendor Mengisi Data',
    OS_WAITING_VENDOR_REQUEST: 'Menunggu Vendor Request Akun',
    OS_WAITING_ACTIVATION: 'Menunggu Aktivasi Akun',
    OS_WAITING_SELECTION: 'Menunggu Hasil Proses Seleksi',
    OS_NOT_SELECTED: 'Tidak Lolos Seleksi',
    WAITING_SELECTION: 'Menunggu Hasil Proses Seleksi',
    IN_SELECTION: 'Sedang Diajukan',
    HIRED: 'Sudah Ditempatkan',
    PENAMBAHAN: 'Penambahan',
    PERGANTIAN: 'Pergantian',
    PENGURANGAN: 'Pengurangan',
  };
  return labels[status] || status;
}
