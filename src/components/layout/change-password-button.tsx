"use client";

import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ChangePasswordButton({ onOpened }: { onOpened?: () => void }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError("");
    setMessage("");
  }

  function handleOpen() {
    resetForm();
    onOpened?.();
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak sesuai.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Password baru harus berbeda dari password saat ini.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mengubah password.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(data.message || "Password berhasil diubah.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gagal mengubah password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-muted transition-colors"
      >
        <KeyRound size={20} />
        Ubah Password
      </button>
      {open && createPortal(
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) setOpen(nextOpen); }} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Ubah Password
            </DialogTitle>
          </DialogHeader>
          <DialogContent>
            <form id="change-password-form" onSubmit={submit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ganti password akun Anda secara berkala. Setelah diubah, password awal tidak lagi ditampilkan.
              </p>
              <PasswordInput
                label="Password saat ini"
                value={currentPassword}
                onChange={setCurrentPassword}
                visible={showCurrent}
                onToggleVisible={() => setShowCurrent((prev) => !prev)}
                autoComplete="current-password"
              />
              <PasswordInput
                label="Password baru (minimal 8 karakter)"
                value={newPassword}
                onChange={setNewPassword}
                visible={showNew}
                onToggleVisible={() => setShowNew((prev) => !prev)}
                minLength={8}
                autoComplete="new-password"
              />
              <PasswordInput
                label="Konfirmasi password baru"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirm}
                onToggleVisible={() => setShowConfirm((prev) => !prev)}
                minLength={8}
                autoComplete="new-password"
              />
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
            </form>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              Tutup
            </Button>
            <Button type="submit" form="change-password-form" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </DialogFooter>
        </Dialog>,
        document.body,
      )}
    </>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  minLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      {label}
      <div className="relative">
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-normal"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          maxLength={200}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          aria-label={visible ? "Sembunyikan password" : "Lihat password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggleVisible}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

