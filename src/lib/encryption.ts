// AES-256-GCM encryption for sensitive clinical and personal data at rest.
// Uses Node's built-in crypto (no external dependency). The key comes from
// ENCRYPTION_KEY (base64, 32 bytes).
//
// Output format: enc:v1:base64(iv).base64(authTag).base64(ciphertext)

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
export const ENCRYPTION_PREFIX = "enc:v1:";

let warnedNoKey = false;

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (!warnedNoKey && process.env.NODE_ENV !== "production") {
      console.warn("[encryption] ENCRYPTION_KEY is not set; sensitive fields stored unencrypted.");
      warnedNoKey = true;
    }
    return null;
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

export function isEncrypted(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith(ENCRYPTION_PREFIX);
}

export function encrypt(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) return plaintext;
  if (isEncrypted(plaintext)) return plaintext;

  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    ENCRYPTION_PREFIX +
    [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".")
  );
}

export function decrypt(payload: string): string {
  if (typeof payload !== "string" || payload.length === 0) return payload;

  const key = getKey();
  if (!key) return payload;

  let raw = payload;
  if (payload.startsWith(ENCRYPTION_PREFIX)) {
    raw = payload.slice(ENCRYPTION_PREFIX.length);
  } else {
    // Legacy 3-dot format fallback
    const parts = payload.split(".");
    if (parts.length !== 3) return payload;
  }

  const [ivB64, tagB64, dataB64] = raw.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return payload;

  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final()
    ]);
    return dec.toString("utf8");
  } catch {
    // If decryption fails (e.g. data was plain text matching dot syntax), return as-is
    return payload;
  }
}

/** Sensitive field names encrypted at rest across data models */
export const SENSITIVE_FIELDS = new Set([
  "historyFlags",
  "clinicianNote",
  "factors",
  "inputs",
  "note",
  "notes",
  "question",
  "reply"
]);

function inferModel(parentModel?: string, key?: string): string | undefined {
  if (!key) return parentModel;
  const k = key.toLowerCase();
  if (k === "patient" || k === "patients" || k === "patientprofile") return "Patient";
  if (k === "invitation" || k === "invitations") return "Invitation";
  if (k === "prediction" || k === "predictions") return "Prediction";
  if (k === "followup" || k === "followups") return "FollowUp";
  if (k === "chatturn" || k === "turns") return "ChatTurn";
  if (k === "apikey" || k === "apikeys") return "ApiKey";
  return parentModel;
}

function shouldEncryptKey(key: string, model?: string): boolean {
  if (model?.toLowerCase() === "apikey") return false;
  if (SENSITIVE_FIELDS.has(key)) return true;
  if (key === "name") {
    return model?.toLowerCase() !== "apikey";
  }
  return false;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_FIELDS.has(key) || key === "name";
}

/** Recursively encrypts sensitive fields in write payloads */
export function encryptData(obj: any, model?: string): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = encryptData(obj[i], model);
    }
    return obj;
  }
  for (const [key, val] of Object.entries(obj)) {
    const currentModel = inferModel(model, key);
    if (shouldEncryptKey(key, currentModel)) {
      if (typeof val === "string" && val.length > 0) {
        obj[key] = encrypt(val);
      } else if (val && typeof val === "object" && "set" in val && typeof (val as any).set === "string") {
        (val as any).set = encrypt((val as any).set);
      }
    } else if (val && typeof val === "object") {
      encryptData(val, currentModel);
    }
  }
  return obj;
}

/** Recursively decrypts sensitive fields in query results */
export function decryptDeep(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = decryptDeep(obj[i]);
    }
    return obj;
  }
  for (const [key, val] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      if (typeof val === "string") {
        obj[key] = decrypt(val);
      } else if (val && typeof val === "object" && "set" in val && typeof (val as any).set === "string") {
        (val as any).set = decrypt((val as any).set);
      } else if (val && typeof val === "object") {
        decryptDeep(val);
      }
    } else if (val && typeof val === "object") {
      decryptDeep(val);
    }
  }
  return obj;
}
