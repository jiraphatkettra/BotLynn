/**
 * TrueMoney Gift Voucher (ซองของขวัญ) Redemption Service
 * Enables automatic 24/7 wallet top-ups via TrueMoney gift vouchers.
 */

export function extractVoucherCode(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();

  // Pattern 1: https://gift.truemoney.com/campaign/?v=XXXX
  const match = clean.match(/[?&]v=([a-zA-Z0-9]+)/);
  if (match) return match[1];

  // Pattern 2: Raw voucher code (typically 30-50 chars alphanumeric)
  if (/^[a-zA-Z0-9_-]{10,64}$/.test(clean)) {
    return clean;
  }

  return null;
}

export interface TrueMoneyRedeemResult {
  success: boolean;
  amount?: number;
  ownerName?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function redeemTrueMoneyVoucher(
  phone: string,
  voucherCode: string
): Promise<TrueMoneyRedeemResult> {
  const cleanPhone = phone.replace(/[^0-9]/g, "");

  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      errorCode: "INVALID_PHONE",
      errorMessage: "เบอร์โทรศัพท์ TrueMoney Wallet สำหรับรับเงินไม่ถูกต้อง (ต้องเป็นเบอร์ 10 หลัก)",
    };
  }

  try {
    const res = await fetch(`https://gift.truemoney.com/campaign/v1/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      },
      body: JSON.stringify({
        mobile: cleanPhone,
        voucher_hash: voucherCode,
      }),
    });

    const data: any = await res.json();

    if (data.status?.code === "SUCCESS" && data.data?.voucher) {
      const amountStr =
        data.data.voucher.redeemed_amount_baht ||
        data.data.voucher.amount_baht ||
        "0";
      const amount = parseFloat(amountStr);
      const ownerName =
        data.data.owner_profile?.full_name || "สมาชิก TrueMoney";

      return {
        success: true,
        amount,
        ownerName,
      };
    }

    // Map TrueMoney errors to friendly Thai explanations
    const code = data.status?.code || "UNKNOWN_ERROR";
    let message = data.status?.message || "ไม่สามารถดึงเงินจากซองของขวัญได้";

    switch (code) {
      case "VOUCHER_OUT_OF_STOCK":
        message = "ซองของขวัญนี้ถูกรับเงินไปหมดแล้ว";
        break;
      case "VOUCHER_EXPIRED":
        message = "ซองของขวัญนี้หมดอายุการใช้งานแล้ว";
        break;
      case "CANNOT_GET_OWN_VOUCHER":
        message =
          "ไม่สามารถรับซองของขวัญที่สร้างจากเบอร์เดียวกันกับเบอร์รับเงินของระบบได้";
        break;
      case "TARGET_USER_REDEEMED":
        message = "เบอร์รับเงินของระบบนี้เคยรับซองของขวัญนี้ไปแล้ว";
        break;
      case "VOUCHER_NOT_FOUND":
        message = "ไม่พบข้อมูลซองของขวัญ กรุณาตรวจสอบลิงก์อีกครั้ง";
        break;
      case "INVALID_PARAM":
        message = "รูปแบบลิงก์หรือรหัสซองของขวัญไม่ถูกต้อง";
        break;
      case "INTERNAL_ERROR":
        message = "เซิร์ฟเวอร์ TrueMoney ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
        break;
    }

    return {
      success: false,
      errorCode: code,
      errorMessage: message,
    };
  } catch (error: any) {
    console.error("TrueMoney redeem network error:", error);
    return {
      success: false,
      errorCode: "NETWORK_ERROR",
      errorMessage: `เกิดข้อผิดพลาดในการเชื่อมต่อ TrueMoney: ${error.message}`,
    };
  }
}
