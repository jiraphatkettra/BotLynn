"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertTriangle,
  Clock,
  Receipt,
  Users,
  Settings,
} from "lucide-react";
import PageFrame from "@/components/ui/PageFrame";
import { TopSectionStrip, BottomSectionStrip } from "@/components/ui/SectionStrip";
import StatusChip from "@/components/ui/StatusChip";
import Button from "@/components/ui/Button";

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("discord", { callbackUrl });
    } catch (err) {
      console.error("Sign-in error:", err);
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    switch (error) {
      case "AccessDenied":
        return {
          title: "การเข้าถึงถูกจำกัด",
          detail: "บัญชีของคุณยังไม่มีสิทธิ์เข้าถึงหน้านี้ หรือกำลังรอการยืนยันสถานะจากเซิร์ฟเวอร์",
          code: "ERR_ACCESS_DENIED",
        };
      case "OAuthCallback":
        return {
          title: "เกิดข้อผิดพลาดในการเชื่อมต่อ Discord",
          detail: "ไม่สามารถยืนยันตัวตนกับ Discord API ได้ กรุณาลองใหม่อีกครั้ง",
          code: "ERR_OAUTH_CALLBACK",
        };
      case "Configuration":
        return {
          title: "การตั้งค่าระบบขัดข้อง",
          detail: "ตัวแปรระบบ OAuth2 ไม่สมบูรณ์ กรุณาติดต่อผู้ดูแลระบบ",
          code: "ERR_OAUTH_CONFIG",
        };
      default:
        return {
          title: "เกิดข้อผิดพลาด",
          detail: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
          code: `ERR_${error.toUpperCase()}`,
        };
    }
  };

  const errorInfo = getErrorMessage(errorParam);

  return (
    <PageFrame showCenterLine={true} className="pt-4 sm:pt-8 pb-20">
      <TopSectionStrip gridRef="GRID_REF // 000" pageCode="AUTH_GATEWAY" />

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
        {/* Left Column: Platform Specs & Core Systems */}
        <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-between">
          <div className="space-y-4">
            <StatusChip label="DISCORD OAUTH2 // READY" pulse />

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-sans mt-3">
              LynnBot Control Hub
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans max-w-md">
              ศูนย์รวมและบริหารจัดการระบบเซิร์ฟเวอร์ดิสคอร์ดสำหรับผู้ดูแล — ระบบตรวจสอบสลิป บันทึกเวลาแอดมิน และระบบร้านค้ายศอัตโนมัติ
            </p>

            <div className="pt-6 space-y-3">
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-white/[0.04] text-neutral-300 shrink-0">
                  <Clock className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">ตอกบัตร & ลงเวลา</div>
                  <div className="text-[11px] text-neutral-400">บันทึกเวลาทำงานและสแตนด์บายห้องเสียง</div>
                </div>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-white/[0.04] text-neutral-300 shrink-0">
                  <Receipt className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">ตรวจสอบสลิปโอนเงิน</div>
                  <div className="text-[11px] text-neutral-400">เช็กยอดและอนุมัติเครดิตทันที</div>
                </div>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-white/[0.04] text-neutral-300 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">คุ้มครองสิทธิ์ Root Owner</div>
                  <div className="text-[11px] text-neutral-400">ระบบรักษาความปลอดภัยระดับแกนระบบ 24 ชม.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] font-mono text-neutral-500">
            SYSTEM_VERSION // 1.0.0-PRO
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center items-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-white">
                <Lock className="w-5 h-5 text-neutral-300" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
                เข้าสู่ระบบผู้ดูแล
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                ยืนยันตัวตนผ่านบัญชี Discord เพื่อเข้าใช้งาน
              </p>
            </div>

            {/* Error Notification Alert */}
            {errorInfo && (
              <div className="p-4 bg-rose-950/30 border border-rose-500/30 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{errorInfo.title}</span>
                </div>
                <p className="text-[11px] text-rose-200/80 leading-relaxed font-sans">
                  {errorInfo.detail}
                </p>
                <div className="text-[9px] font-mono text-rose-400/60 pt-1">
                  [{errorInfo.code}]
                </div>
              </div>
            )}

            {/* Discord Sign-in Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading || status === "loading"}
              className="w-full py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-[#5865F2]/40"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin shrink-0" />
              ) : (
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.86,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
              )}
              <span>เข้าสู่ระบบด้วย Discord</span>
            </button>

            <div className="text-center text-[10px] text-neutral-500 font-mono">
              AUTHENTICATION POWERED BY OAUTH2
            </div>
          </div>
        </div>
      </div>

      <BottomSectionStrip figLabel="FIG_00 // GATEWAY" statusText="ENCRYPTED_OAUTH2_SESSION" />
    </PageFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070809] flex items-center justify-center text-xs text-neutral-400 font-mono">
          LOADING GATEWAY...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
