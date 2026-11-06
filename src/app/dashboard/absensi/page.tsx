"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { getShiftEndAt } from "@/lib/attendance-shift";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
}

interface AttendanceLocation {
  latitude: number;
  longitude: number;
}

function getJakartaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatJakartaTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AbsensiPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isCheckOut, setIsCheckOut] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [waktuKerja, setWaktuKerja] = useState<string | null>(null);
  const [photoLocation, setPhotoLocation] = useState<AttendanceLocation | null>(null);
  const [now, setNow] = useState(() => new Date());
  const scheduledCheckout = todayAttendance?.checkIn
    ? getShiftEndAt(new Date(todayAttendance.checkIn), waktuKerja)
    : null;
  const checkoutTooEarly = Boolean(isCheckOut && scheduledCheckout && now < scheduledCheckout);
  const checkoutLateMinutes = scheduledCheckout && now > scheduledCheckout
    ? Math.floor((now.getTime() - scheduledCheckout.getTime()) / 60_000)
    : 0;
  const checkoutHoursLate = Math.floor(checkoutLateMinutes / 60);
  const checkoutMinutesLate = checkoutLateMinutes % 60;

  useEffect(() => {
    Promise.all([
      fetch("/api/attendance").then((response) => {
        if (!response.ok) throw new Error("Data absensi gagal dimuat.");
        return response.json();
      }),
      fetch("/api/dashboard").then((response) => {
        if (!response.ok) throw new Error("Jadwal shift gagal dimuat.");
        return response.json();
      }),
    ])
      .then(([attendances, dashboard]) => {
        const openAttendance = attendances.find((record: AttendanceRecord) => record.checkIn && !record.checkOut);
        const todayKey = getJakartaDateKey(new Date());
        const todayRecord = openAttendance || attendances.find(
          (record: AttendanceRecord) => getJakartaDateKey(new Date(record.date)) === todayKey,
        );
        if (todayRecord) {
          setTodayAttendance(todayRecord);
          setIsCheckOut(Boolean(todayRecord.checkIn && !todayRecord.checkOut));
        }
        setWaktuKerja(dashboard.waktuKerja || null);
      })
      .catch((error: unknown) => {
        console.error("Attendance page data error:", error);
        toast.error(error instanceof Error ? error.message : "Data absensi gagal dimuat.");
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch (err) {
      toast.error("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (isCheckOut && (!scheduledCheckout || new Date() < scheduledCheckout)) {
      toast.error(scheduledCheckout
        ? `Anda belum dapat check-out. Jadwal shift berakhir pukul ${formatJakartaTime(scheduledCheckout)} WIB.`
        : "Jadwal shift belum tersedia. Silakan hubungi vendor atau administrator.");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Perangkat ini tidak mendukung akses GPS.");
      return;
    }

    setGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        });
      });
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || !canvas.width || !canvas.height) {
        throw new Error("Kamera belum siap. Silakan coba ambil foto kembali.");
      }

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const capturedAt = new Date();
      ctx.drawImage(video, 0, 0);
      const fontSize = Math.max(12, Math.round(canvas.width / 42));
      const padding = Math.round(fontSize * 0.65);
      const lineHeight = Math.round(fontSize * 1.5);
      const stampHeight = padding * 2 + lineHeight * 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(0, canvas.height - stampHeight, canvas.width, stampHeight);
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(
        `${new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "medium",
          timeStyle: "medium",
        }).format(capturedAt)} WIB`,
        padding,
        canvas.height - stampHeight + padding,
        canvas.width - padding * 2,
      );
      ctx.fillText(
        `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        padding,
        canvas.height - stampHeight + padding + lineHeight,
        canvas.width - padding * 2,
      );

      setPhotoLocation(location);
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
      stopCamera();
    } catch (error) {
      console.error("Attendance photo capture error:", error);
      if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code: number }).code;
        toast.error(code === 1
          ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk mencatat GPS pada foto."
          : "Lokasi GPS tidak berhasil didapatkan. Pastikan GPS aktif lalu coba kembali.");
      } else {
        toast.error(error instanceof Error ? error.message : "Foto gagal diambil.");
      }
    } finally {
      setGettingLocation(false);
    }
  }, [isCheckOut, scheduledCheckout, stopCamera]);

  const submitAttendance = async () => {
    if (!capturedImage) {
      toast.error("Silakan ambil foto terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const body: any = {};
      if (isCheckOut) {
        body.isCheckOut = true;
        body.fotoCheckOut = capturedImage;
      } else {
        body.type = "HADIR";
        body.fotoCheckIn = capturedImage;
      }

      if (!photoLocation) {
        throw new Error("Lokasi GPS pada foto tidak tersedia. Silakan ambil foto kembali.");
      }
      body.latitude = photoLocation.latitude;
      body.longitude = photoLocation.longitude;

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan absensi");
      }

      toast.success(isCheckOut ? "Check-out berhasil!" : "Check-in berhasil!");
      window.dispatchEvent(new Event("dashboard:notifications-refresh"));
      setCapturedImage(null);
      setPhotoLocation(null);

      // Refresh attendance
      const attendanceRes = await res.json();
      setTodayAttendance(attendanceRes);
      if (!isCheckOut) setIsCheckOut(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setPhotoLocation(null);
    startCamera();
  };

  return (
    <DashboardLayout allowedRoles={["MITRA"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Absensi</h1>
          <p className="text-muted-foreground">
            {isCheckOut ? "Check-out dengan foto wajah, waktu, dan lokasi GPS" : "Check-in dengan foto wajah, waktu, dan lokasi GPS"}
          </p>
        </div>

        {todayAttendance?.checkIn && todayAttendance?.checkOut ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <Check size={48} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-green-800">Absensi Hari Ini Lengkap</h3>
              <p className="text-green-700 mt-2">
                Check-in: {new Intl.DateTimeFormat("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
                }).format(new Date(todayAttendance.checkIn))} |
                Check-out: {new Intl.DateTimeFormat("id-ID", {
              timeZone: "Asia/Jakarta",
              hour: "2-digit",
              minute: "2-digit",
                }).format(new Date(todayAttendance.checkOut))} WIB
              </p>
              {scheduledCheckout && new Date(todayAttendance.checkOut) > scheduledCheckout && (
                <p className="mt-2 text-sm font-medium text-amber-800">
                  Anda terlambat check-out dari jadwal shift
                  {(() => {
                    const lateMinutes = Math.floor(
                      (new Date(todayAttendance.checkOut!).getTime() - scheduledCheckout.getTime()) / 60_000,
                    );
                    const hours = Math.floor(lateMinutes / 60);
                    const minutes = lateMinutes % 60;
                    return ` selama ${hours ? `${hours} jam ` : ""}${minutes} menit.`;
                  })()}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isCheckOut ? "Foto Check-Out" : "Foto Check-In"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!streaming && !capturedImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <Camera size={48} className="text-gray-500" />
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex gap-2 mt-4">
                  {!streaming && !capturedImage && (
                    <Button onClick={startCamera} className="w-full">
                      <Camera size={18} className="mr-2" />
                      Buka Kamera
                    </Button>
                  )}
                  {streaming && (
                    <>
                      <Button
                        onClick={capturePhoto}
                        className="flex-1"
                        disabled={gettingLocation || (isCheckOut && (!scheduledCheckout || checkoutTooEarly))}
                      >
                        <Camera size={18} className="mr-2" />
                        {gettingLocation ? "Mencari lokasi GPS..." : "Ambil Foto"}
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        <X size={18} />
                      </Button>
                    </>
                  )}
                  {capturedImage && (
                    <>
                      <Button onClick={submitAttendance} className="flex-1" disabled={loading || (isCheckOut && (!scheduledCheckout || checkoutTooEarly))}>
                        {loading ? "Memproses..." : (isCheckOut ? "Check-Out" : "Check-In")}
                      </Button>
                      <Button onClick={retakePhoto} variant="outline">
                        Ulangi
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Info Absensi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Tanggal</p>
                  <p className="text-lg">
                    {new Date().toLocaleDateString("id-ID", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Waktu WIB</p>
                  <p className="text-lg">{new Intl.DateTimeFormat("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(now)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Jadwal Shift</p>
                  <p className="text-lg">{waktuKerja || "Belum tersedia"}</p>
                </div>
                {isCheckOut && (
                  <div className={`p-4 rounded-lg ${!scheduledCheckout || checkoutTooEarly ? "bg-amber-50" : checkoutLateMinutes ? "bg-orange-50" : "bg-green-50"}`}>
                    <p className="text-sm font-medium">Status Check-Out</p>
                    {!scheduledCheckout ? (
                      <p className="text-sm text-amber-800">
                        Jadwal shift belum tersedia. Check-out belum dapat dilakukan; silakan hubungi vendor atau administrator.
                      </p>
                    ) : checkoutTooEarly ? (
                      <p className="text-sm text-amber-800">
                        Anda belum dapat check-out. Jadwal shift berakhir pukul {formatJakartaTime(scheduledCheckout)} WIB.
                      </p>
                    ) : checkoutLateMinutes > 0 ? (
                      <p className="text-sm text-orange-800">
                        Anda terlambat check-out selama {checkoutHoursLate ? `${checkoutHoursLate} jam ` : ""}{checkoutMinutesLate} menit dari jadwal pukul {formatJakartaTime(scheduledCheckout)} WIB.
                      </p>
                    ) : (
                      <p className="text-sm text-green-800">
                        Check-out sesuai jadwal shift pukul {formatJakartaTime(scheduledCheckout)} WIB.
                      </p>
                    )}
                  </div>
                )}
                {todayAttendance?.checkIn && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-700">Check-In</p>
                    <p className="text-lg text-green-800">
                      {new Date(todayAttendance.checkIn).toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                )}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">Status</p>
                  <p className="text-lg text-blue-800">
                    {isCheckOut ? "Siap Check-Out" : "Siap Check-In"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
