"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VendorRegistrationPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pendaftaran gagal.");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pendaftaran gagal diproses.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Pendaftaran terkirim</CardTitle><CardDescription>Akun vendor menunggu persetujuan tim VM.</CardDescription></CardHeader>
        <CardContent className="space-y-4"><p className="text-sm">Setelah disetujui, akun Vendor OS dapat digunakan untuk masuk ke dashboard.</p><Button className="w-full" onClick={() => router.push("/login")}>Kembali ke halaman masuk</Button></CardContent>
      </Card>
    </main>
  );

  return (
    <main className="flex min-h-screen justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-10">
      <Card className="my-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Daftar Vendor OS</CardTitle>
          <CardDescription>Isi data perusahaan dan PIC. Akun baru aktif setelah disetujui VM.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">Nama perusahaan<Required /><Input name="name" maxLength={200} required /></label>
            <label className="space-y-1 text-sm">NPWP perusahaan<Required /><Input name="npwp" maxLength={40} required /></label>
            <label className="space-y-1 text-sm sm:col-span-2">Alamat kantor<Required /><textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" name="address" rows={2} required /></label>
            <label className="space-y-1 text-sm">Nama PIC<Required /><Input name="picName" maxLength={200} required /></label>
            <label className="space-y-1 text-sm">No. HP PIC<Required /><Input name="picPhone" type="tel" required /></label>
            <label className="space-y-1 text-sm">Email akun<Required /><Input name="email" type="email" autoComplete="email" required /></label>
            <label className="space-y-1 text-sm">Password<Required /><Input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
            <label className="space-y-1 text-sm">Nama pemilik rekening bank<Required /><Input name="bankAccountName" required /></label>
            <label className="space-y-1 text-sm">Nomor rekening bank<Required /><Input name="bankAccountNumber" inputMode="numeric" required /></label>
            <label className="space-y-1 text-sm">Status perpajakan perusahaan<Required />
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" name="companyTaxStatus" required defaultValue="">
                <option value="" disabled>Pilih status perpajakan</option><option value="PKP">PKP</option><option value="NON_PKP">Non-PKP</option>
              </select>
            </label>
            {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex items-center justify-between gap-3 border-t pt-4 sm:col-span-2">
              <Link href="/login" className="text-sm text-primary underline">Kembali ke masuk</Link>
              <Button type="submit" disabled={saving}>{saving ? "Mengirim..." : "Daftar Vendor OS"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Required() { return <span className="font-bold text-red-600"> *</span>; }
