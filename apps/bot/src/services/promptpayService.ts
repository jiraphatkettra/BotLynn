// @ts-ignore
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

export interface PromptPayQRResult {
  payload: string;
  buffer: Buffer;
}

/**
 * Generates an official EMVCo-compliant Thailand PromptPay QR code.
 * Supported targets:
 * - Mobile Phone (10 digits, e.g., 0954268212)
 * - Citizen ID / Tax ID (13 digits)
 * - e-Wallet ID (15 digits)
 *
 * @param target Mobile number, Citizen ID, or e-Wallet ID
 * @param amount Optional transfer amount in THB
 */
export async function generatePromptPayQR(
  target: string,
  amount?: number | null
): Promise<PromptPayQRResult> {
  const cleanTarget = target.replace(/[^0-9]/g, "");

  if (!cleanTarget) {
    throw new Error("หมายเลขพร้อมเพย์ไม่ถูกต้อง (Invalid PromptPay Target)");
  }

  const options: { amount?: number } = {};
  if (typeof amount === "number" && !isNaN(amount) && amount > 0) {
    options.amount = amount;
  }

  // Generate official EMVCo payload
  // Sets Tag 01 to '12' (Dynamic QR) when amount is given, or '11' (Static QR) when omitted
  const payload: string = generatePayload(cleanTarget, options);

  const buffer = await QRCode.toBuffer(payload, {
    type: "png",
    margin: 2,
    width: 500,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });

  return { payload, buffer };
}
