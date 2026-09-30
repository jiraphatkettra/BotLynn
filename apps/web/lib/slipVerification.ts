import { prisma } from "@lynnbot/database";

export interface SlipVerificationResult {
  success: boolean;
  message?: string;
  transRef?: string;
  amount?: number;
  senderName?: string;
  senderBank?: string;
  receiverName?: string;
  receiverBank?: string;
  receiverAccount?: string;
  transDate?: Date;
  raw?: any;
}

export interface VerificationCheckOutcome {
  approved: boolean;
  rejectReason?: string;
  pendingReason?: string;
  data?: SlipVerificationResult;
}

const BANK_NAMES: Record<string, string> = {
  "002": "ธนาคารกรุงเทพ (BBL)",
  "004": "ธนาคารกสิกรไทย (KBANK)",
  "006": "ธนาคารกรุงไทย (KTB)",
  "011": "ธนาคารทหารไทยธนชาต (TTB)",
  "014": "ธนาคารไทยพาณิชย์ (SCB)",
  "025": "ธนาคารกรุงศรีอยุธยา (BAY)",
  "030": "ธนาคารออมสิน (GSB)",
  "034": "ธ.ก.ส. (BAAC)",
  "069": "ธนาคารเกียรตินาคินภัทร (KKP)",
  "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LHBANK)",
  "022": "ธนาคารซีไอเอ็มบีไทย (CIMBT)",
  "070": "ธนาคารไอซีบีซี (ICBCT)",
};

export function formatBankName(bankIdOrName?: string | null): string {
  if (!bankIdOrName) return "ไม่ระบุธนาคาร";
  return BANK_NAMES[bankIdOrName] || bankIdOrName;
}

/**
 * Verify slip via SlipOK API
 */
export async function verifyViaSlipOK(
  imageUrl: string,
  apiKey: string,
  branchId?: string | null
): Promise<SlipVerificationResult> {
  const endpoint = branchId && branchId.trim()
    ? `https://api.slipok.com/api/line/apikey/${branchId.trim()}`
    : `https://api.slipok.com/api/line/apikey`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-authorization": apiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: imageUrl }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json) {
      const errMsg = json?.message || `HTTP ${res.status}: ไม่สามารถตรวจสอบผ่าน SlipOK ได้`;
      return { success: false, message: errMsg, raw: json };
    }

    if (!json.success && !json.data) {
      return {
        success: false,
        message: json.message || "SlipOK แจ้งว่าสลิปไม่ถูกต้อง หรือไม่พบ QR Code",
        raw: json,
      };
    }

    const d = json.data || json;
    const transRef = d.transRef || d.trans_ref || "";
    const amount = typeof d.amount === "number" ? d.amount : parseFloat(d.amount || "0");

    let transDate: Date | undefined;
    if (d.transDate && d.transTime) {
      const y = d.transDate.slice(0, 4);
      const m = d.transDate.slice(4, 6);
      const day = d.transDate.slice(6, 8);
      transDate = new Date(`${y}-${m}-${day}T${d.transTime}+07:00`);
    } else if (d.dateTime) {
      transDate = new Date(d.dateTime);
    }

    const senderName =
      d.sender?.account?.name?.th ||
      d.sender?.account?.name?.en ||
      d.sender?.name ||
      "";
    const senderBank = formatBankName(d.sender?.bank?.id || d.sender?.bank?.name || d.sendingBank);

    const receiverName =
      d.receiver?.account?.name?.th ||
      d.receiver?.account?.name?.en ||
      d.receiver?.name ||
      "";
    const receiverBank = formatBankName(d.receiver?.bank?.id || d.receiver?.bank?.name || d.receivingBank);
    const receiverAccount =
      d.receiver?.account?.bank?.account ||
      d.receiver?.account?.proxy?.account ||
      d.receiver?.account?.account ||
      "";

    return {
      success: true,
      transRef,
      amount,
      senderName,
      senderBank,
      receiverName,
      receiverBank,
      receiverAccount,
      transDate,
      raw: d,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, message: "เชื่อมต่อ SlipOK หมดเวลา (Timeout)" };
    }
    return { success: false, message: `เกิดข้อผิดพลาดในการเชื่อมต่อ SlipOK: ${err.message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verify slip via EasySlip API
 */
export async function verifyViaEasySlip(
  imageUrl: string,
  apiKey: string
): Promise<SlipVerificationResult> {
  const endpoint = `https://developer.easyslip.com/api/v1/verify`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: imageUrl }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json) {
      const errMsg = json?.message || `HTTP ${res.status}: ไม่สามารถตรวจสอบผ่าน EasySlip ได้`;
      return { success: false, message: errMsg, raw: json };
    }

    if (json.status !== 200 || !json.data) {
      return {
        success: false,
        message: json.message || "EasySlip แจ้งว่าสลิปไม่ถูกต้อง หรือไม่พบ QR Code",
        raw: json,
      };
    }

    const d = json.data;
    const transRef = d.transRef || "";
    const amount = d.amount?.amount || 0;
    const transDate = d.date ? new Date(d.date) : undefined;

    const senderName = d.sender?.account?.name?.th || d.sender?.account?.name?.en || "";
    const senderBank = formatBankName(d.sender?.bank?.id || d.sender?.bank?.name);

    const receiverName = d.receiver?.account?.name?.th || d.receiver?.account?.name?.en || "";
    const receiverBank = formatBankName(d.receiver?.bank?.id || d.receiver?.bank?.name);
    const receiverAccount =
      d.receiver?.account?.proxy?.account ||
      d.receiver?.account?.account ||
      "";

    return {
      success: true,
      transRef,
      amount,
      senderName,
      senderBank,
      receiverName,
      receiverBank,
      receiverAccount,
      transDate,
      raw: d,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, message: "เชื่อมต่อ EasySlip หมดเวลา (Timeout)" };
    }
    return { success: false, message: `เกิดข้อผิดพลาดในการเชื่อมต่อ EasySlip: ${err.message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes slip verification and runs business rule validations
 */
export async function executeSlipVerification(
  imageUrl: string,
  slipId?: string
): Promise<VerificationCheckOutcome> {
  const settingsRows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "slip_auto_verify",
          "slip_provider",
          "slipok_api_key",
          "slipok_branch_id",
          "easyslip_api_key",
          "slip_check_receiver",
          "slip_receiver_account",
          "slip_receiver_name",
          "slip_min_amount",
          "slip_max_amount",
        ],
      },
    },
  });

  const settings: Record<string, string> = {};
  for (const s of settingsRows) {
    settings[s.key] = s.value;
  }

  const provider = settings.slip_provider || "slipok";
  let verification: SlipVerificationResult;

  if (provider === "easyslip") {
    const apiKey = settings.easyslip_api_key;
    if (!apiKey) {
      return { approved: false, pendingReason: "ยังไม่ได้ระบุ EasySlip API Key ในการตั้งค่า" };
    }
    verification = await verifyViaEasySlip(imageUrl, apiKey);
  } else {
    const apiKey = settings.slipok_api_key;
    if (!apiKey) {
      return { approved: false, pendingReason: "ยังไม่ได้ระบุ SlipOK API Key ในการตั้งค่า" };
    }
    verification = await verifyViaSlipOK(imageUrl, apiKey, settings.slipok_branch_id);
  }

  if (!verification.success) {
    return {
      approved: false,
      pendingReason: verification.message || "ไม่สามารถอ่านข้อมูล QR Code จากสลิปได้",
      data: verification,
    };
  }

  // 2. Duplicate slip protection
  if (verification.transRef) {
    const duplicate = await prisma.slip.findUnique({
      where: { transRef: verification.transRef },
    });

    if (duplicate && duplicate.id !== slipId) {
      return {
        approved: false,
        rejectReason: `❌ ปฏิเสธอัตโนมัติ: สลิปนี้เคยถูกนำมาใช้งานในระบบแล้ว (รหัสอ้างอิง: ${verification.transRef}) โดย <@${duplicate.discordId}> เมื่อ ${duplicate.createdAt.toLocaleDateString("th-TH")}`,
        data: verification,
      };
    }
  }

  // 3. Amount validation
  const amount = verification.amount || 0;
  const minAmount = parseFloat(settings.slip_min_amount || "1");
  const maxAmount = parseFloat(settings.slip_max_amount || "100000");

  if (amount < minAmount) {
    return {
      approved: false,
      pendingReason: `⚠️ ยอดเงินในสลิป ฿${amount} ต่ำกว่ายอดขั้นต่ำที่กำหนด (ขั้นต่ำ ฿${minAmount}) รอแอดมินตรวจสอบ`,
      data: verification,
    };
  }

  if (amount > maxAmount) {
    return {
      approved: false,
      pendingReason: `⚠️ ยอดเงินในสลิป ฿${amount} เกินยอดสูงสุดที่อนุญาตให้ผ่านอัตโนมัติ (สูงสุด ฿${maxAmount}) รอแอดมินตรวจสอบ`,
      data: verification,
    };
  }

  // 4. Receiver account / name check
  if (settings.slip_check_receiver === "true") {
    const targetAccount = (settings.slip_receiver_account || "").replace(/[^0-9]/g, "");
    const targetName = (settings.slip_receiver_name || "").trim().toLowerCase();

    const slipReceiverAccount = (verification.receiverAccount || "").replace(/[^0-9]/g, "");
    const slipReceiverName = (verification.receiverName || "").trim().toLowerCase();

    let accountMatched = true;
    if (targetAccount) {
      const last4Target = targetAccount.slice(-4);
      accountMatched =
        slipReceiverAccount.includes(targetAccount) ||
        (last4Target.length >= 4 && slipReceiverAccount.endsWith(last4Target));
    }

    let nameMatched = true;
    if (targetName) {
      nameMatched = slipReceiverName.includes(targetName);
    }

    if (!accountMatched && !nameMatched) {
      return {
        approved: false,
        pendingReason: `⚠️ ผู้รับในสลิป (${verification.receiverName || "ไม่ระบุ"} : ${verification.receiverAccount || "ไม่ระบุ"}) ไม่ตรงกับบัญชีปลายทางที่กำหนด รอแอดมินตรวจสอบ`,
        data: verification,
      };
    }
  }

  return {
    approved: true,
    data: verification,
  };
}
