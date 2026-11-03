"use client";

import React, { useRef, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AbsensiPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckOut, setIsCheckOut] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  React.useEffect(() => {
    // Check today's attendance
    fetch("/api/attendance?month=" + new Date().toISOString().slice(0, 7))
      .then((res) => res.json())
      .then((data) => {
        const today = new Date().toDateString();
        const todayRecord = data.find?.((a: any) => new Date(a.date).toDateString() === today);
        if (todayRecord) {
          setTodayAttendance(todayRecord);
          if (todayRecord.checkIn && !todayRecord.checkOut) {
            setIsCheckOut(true);
          }
        }
      })
      .catch(console.error);
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

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

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

      // Try to get location
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        body.latitude = position.coords.latitude;
        body.longitude = position.coords.longitude;
      } catch {
        // Location not available, continue without it
      }

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
      setCapturedImage(null);

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
    startCamera();
  };

  return (
    <DashboardLayout allowedRoles={["MITRA"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Absensi</h1>
          <p className="text-muted-foreground">
            {isCheckOut ? "Check-out dengan foto wajah" : "Check-in dengan foto wajah"}
          </p>
        </div>

        {todayAttendance?.checkIn && todayAttendance?.checkOut ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <Check size={48} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-green-800">Absensi Hari Ini Lengkap</h3>
              <p className="text-green-700 mt-2">
                Check-in: {new Date(todayAttendance.checkIn).toLocaleTimeString("id-ID")} |
                Check-out: {new Date(todayAttendance.checkOut).toLocaleTimeString("id-ID")}
              </p>
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
                      <Button onClick={capturePhoto} className="flex-1">
                        <Camera size={18} className="mr-2" />
                        Ambil Foto
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        <X size={18} />
                      </Button>
                    </>
                  )}
                  {capturedImage && (
                    <>
                      <Button onClick={submitAttendance} className="flex-1" disabled={loading}>
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
                  <p className="text-sm font-medium">Waktu</p>
                  <p className="text-lg">{new Date().toLocaleTimeString("id-ID")}</p>
                </div>
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
