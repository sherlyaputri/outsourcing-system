"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface VendorProfile {
  name: string;
  address: string;
  npwp: string;
  picName: string;
  picPhone: string;
  bankAccountName: string;
  bankAccountNumber: string;
  companyTaxStatus: string;
}

const emptyProfile: VendorProfile = {
  name: "", address: "", npwp: "", picName: "", picPhone: "",
  bankAccountName: "", bankAccountNumber: "", companyTaxStatus: "",
};

export default function VendorSettings() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    setMessage("");
    fetch("/api/vendor")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Data vendor gagal dimuat.");
        const vendor = Array.isArray(data) ? data[0] : null;
        if (active && vendor) setProfile({
          name: vendor.name || "", address: vendor.address || "", npwp: vendor.npwp || "",
          picName: vendor.picName || "", picPhone: vendor.picPhone || vendor.phone || "",
          bankAccountName: vendor.bankAccountName || "", bankAccountNumber: vendor.bankAccountNumber || "",
          companyTaxStatus: vendor.companyTaxStatus || "",
        });
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Data vendor gagal dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  function update(field: keyof VendorProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/vendor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_PROFILE", ...profile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Data vendor gagal disimpan.");
      setProfile((current) => ({ ...current, name: data.name || current.name }));
      setMessage("Data perusahaan berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Data vendor gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Pengaturan data Vendor OS"
        title="Pengaturan data Vendor OS"
        onClick={() => setOpen(true)}
        className="absolute right-3 top-3 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <Settings size={19} />
      </Button>
      {open && createPortal(<Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader><DialogTitle>Pengaturan Data Vendor OS</DialogTitle></DialogHeader>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <p className="mb-4 text-sm text-muted-foreground">Perbarui data perusahaan dan PIC.</p>
          {loading ? <p className="text-sm text-muted-foreground">Memuat data perusahaan...</p> : (
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <ProfileField label="Nama perusahaan" value={profile.name} onChange={(value) => update("name", value)} required />
              <ProfileField label="NPWP" value={profile.npwp} onChange={(value) => update("npwp", value)} required />
              <label className="space-y-1 text-sm sm:col-span-2">Alamat kantor<textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={2} value={profile.address} onChange={(event) => update("address", event.target.value)} required /></label>
              <ProfileField label="Nama PIC" value={profile.picName} onChange={(value) => update("picName", value)} required />
              <ProfileField label="No. HP PIC" value={profile.picPhone} onChange={(value) => update("picPhone", value)} required />
              <ProfileField label="Nama pemilik rekening bank" value={profile.bankAccountName} onChange={(value) => update("bankAccountName", value)} required />
              <ProfileField label="Nomor rekening bank" value={profile.bankAccountNumber} onChange={(value) => update("bankAccountNumber", value)} required />
              <label className="space-y-1 text-sm">Status perpajakan perusahaan
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={profile.companyTaxStatus} onChange={(event) => update("companyTaxStatus", event.target.value)} required>
                  <option value="">Pilih status perpajakan</option><option value="PKP">PKP</option><option value="NON_PKP">Non-PKP</option>
                </select>
              </label>
              {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
              {message && <p role="status" className="text-sm text-green-700 sm:col-span-2">{message}</p>}
              <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Data Perusahaan"}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>, document.body)}
    </>
  );
}

function ProfileField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="space-y-1 text-sm">{label}<input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>;
}
