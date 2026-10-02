import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
  url: string;
  key: string;
}

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  if (accountId.length !== 32) {
    console.warn(
      `⚠️ [Cloudflare R2] R2_ACCOUNT_ID has length ${accountId.length} (expected exactly 32 hex characters). ` +
      `Check your Cloudflare Dashboard: dash.cloudflare.com -> R2 -> Overview -> Account ID`
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Uploads an image buffer to Cloudflare R2
 * Returns permanent URL and Key, or null if R2 credentials are not configured
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<UploadResult | null> {
  const s3 = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!s3 || !bucketName) {
    return null;
  }

  const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `slips/${Date.now()}-${cleanName}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const url = publicUrl
      ? `${publicUrl.replace(/\/$/, "")}/${key}`
      : `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return { url, key };
  } catch (err) {
    console.error("Cloudflare R2 Upload Error:", err);
    return null;
  }
}

/**
 * Downloads a file from a URL and uploads to Cloudflare R2
 */
export async function fetchAndUploadToR2(
  sourceUrl: string,
  filename: string
): Promise<UploadResult | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = res.headers.get("content-type") || "image/png";
    return await uploadToR2(buffer, filename, contentType);
  } catch (e) {
    console.error("fetchAndUploadToR2 error:", e);
    return null;
  }
}
