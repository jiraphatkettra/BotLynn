import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider, apiKey, branchId } = await req.json();

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "กรุณาระบุ API Key ที่ต้องการทดสอบ" }, { status: 400 });
    }

    const key = apiKey.trim();

    if (provider === "easyslip") {
      const res = await fetch("https://developer.easyslip.com/api/v1/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: "https://example.com/test.png" }),
      });

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          success: false,
          message: "API Key ของ EasySlip ไม่ถูกต้อง (Unauthorized)",
        });
      }

      // If 400 or other, it means API key was authenticated and processed the request
      return NextResponse.json({
        success: true,
        message: "เชื่อมต่อ EasySlip สำเร็จ! API Key ถูกต้องพร้อมใช้งาน",
      });
    } else {
      // Default: SlipOK
      const endpoint = branchId && branchId.trim()
        ? `https://api.slipok.com/api/line/apikey/${branchId.trim()}`
        : `https://api.slipok.com/api/line/apikey`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-authorization": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: "https://example.com/test.png" }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403 || json?.code === 1001) {
        return NextResponse.json({
          success: false,
          message: json?.message || "API Key ของ SlipOK ไม่ถูกต้อง หรือโควต้าหมด",
        });
      }

      return NextResponse.json({
        success: true,
        message: "เชื่อมต่อ SlipOK สำเร็จ! API Key ถูกต้องพร้อมใช้งาน",
        details: json?.message || undefined,
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`,
    });
  }
}
