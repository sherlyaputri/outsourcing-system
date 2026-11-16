import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorRegistrationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Akun Vendor OS</CardTitle>
          <CardDescription>Pembuatan akun Vendor OS dikelola oleh Vendor Manager.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">Silakan hubungi VM untuk meminta akun. Username dan password awal akan dibuat melalui menu Data Vendor.</p>
          <Link href="/login" className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Kembali ke halaman masuk</Link>
        </CardContent>
      </Card>
    </main>
  );
}
