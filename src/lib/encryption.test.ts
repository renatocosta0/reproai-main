import { describe, it, expect, beforeEach } from "vitest";
import {
  encrypt,
  decrypt,
  isEncrypted,
  encryptData,
  decryptDeep,
  ENCRYPTION_PREFIX
} from "./encryption";
import { PrismaClient } from "@prisma/client";

describe("AES-256-GCM Field Encryption at Rest", () => {
  const TEST_KEY = Buffer.alloc(32, "k").toString("base64");

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it("encrypts plaintext strings and prefixes them with enc:v1:", () => {
    const plain = "Clinical note: diminished ovarian reserve, AMH = 0.9 ng/mL";
    const cipher = encrypt(plain);

    expect(isEncrypted(cipher)).toBe(true);
    expect(cipher.startsWith(ENCRYPTION_PREFIX)).toBe(true);
    expect(cipher).not.toEqual(plain);
  });

  it("decrypts ciphertext back to the original plaintext", () => {
    const plain = "Patient reports regular 28-day cycles with prior laparoscopic surgery.";
    const cipher = encrypt(plain);
    const restored = decrypt(cipher);

    expect(restored).toEqual(plain);
  });

  it("does not double-encrypt an already encrypted string", () => {
    const plain = "Confidential patient name";
    const cipher1 = encrypt(plain);
    const cipher2 = encrypt(cipher1);

    expect(cipher2).toEqual(cipher1);
    expect(decrypt(cipher2)).toEqual(plain);
  });

  it("gracefully falls back to plain text if the value is unencrypted", () => {
    const plainLegacy = "Unencrypted legacy text from seed";
    const decrypted = decrypt(plainLegacy);

    expect(decrypted).toEqual(plainLegacy);
  });

  it("encrypts and decrypts deep nested objects (simulating Prisma nested writes/reads)", () => {
    const record = {
      id: "couple-123",
      createdAt: new Date(),
      patients: [
        {
          id: "p1",
          name: "Amina Al-Mansoor",
          age: 32,
          historyFlags: JSON.stringify(["ENDOMETRIOSIS", "PELVIC_SURGERY"])
        }
      ],
      predictions: [
        {
          id: "pred-1",
          probability: 58.2,
          clinicianNote: "Recommended ovarian stimulation protocol with GnRH antagonist.",
          inputs: JSON.stringify({ age: 32, amh: 1.1, sperm_count: 22 })
        }
      ],
      unrelatedField: "Not sensitive"
    };

    // Simulate write encryption
    encryptData(record, "Couple");

    expect(isEncrypted(record.patients[0].name)).toBe(true);
    expect(isEncrypted(record.patients[0].historyFlags)).toBe(true);
    expect(isEncrypted(record.predictions[0].clinicianNote)).toBe(true);
    expect(isEncrypted(record.predictions[0].inputs)).toBe(true);
    expect(record.unrelatedField).toBe("Not sensitive");

    // Simulate read decryption
    decryptDeep(record);

    expect(record.patients[0].name).toBe("Amina Al-Mansoor");
    expect(record.patients[0].historyFlags).toBe(JSON.stringify(["ENDOMETRIOSIS", "PELVIC_SURGERY"]));
    expect(record.predictions[0].clinicianNote).toBe("Recommended ovarian stimulation protocol with GnRH antagonist.");
    expect(record.predictions[0].inputs).toBe(JSON.stringify({ age: 32, amh: 1.1, sperm_count: 22 }));
    expect(record.unrelatedField).toBe("Not sensitive");
  });

  it("handles Prisma set update syntax", () => {
    const updatePayload = {
      clinicianNote: { set: "Updated note after consultation." }
    };

    encryptData(updatePayload);
    expect(isEncrypted(updatePayload.clinicianNote.set)).toBe(true);

    decryptDeep(updatePayload);
    expect(updatePayload.clinicianNote.set).toBe("Updated note after consultation.");
  });

  it("leaves API key names unencrypted while encrypting patient names", () => {
    const apiKeyPayload = { name: "Abu Dhabi Health Services Co (SEHA)" };
    encryptData(apiKeyPayload, "ApiKey");
    expect(isEncrypted(apiKeyPayload.name)).toBe(false);
    expect(apiKeyPayload.name).toBe("Abu Dhabi Health Services Co (SEHA)");

    const patientPayload = { name: "Mariam Al-Zaabi" };
    encryptData(patientPayload, "Patient");
    expect(isEncrypted(patientPayload.name)).toBe(true);

    decryptDeep(patientPayload);
    expect(patientPayload.name).toBe("Mariam Al-Zaabi");
  });
});
