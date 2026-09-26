import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// ---- password / key hashing (scrypt, salted) ----
export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(secret, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ---- unguessable share token (goes in the URL) ----
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url"); // ~32 chars, 192 bits of entropy
}

// ---- dynamic access key for password-protected links ----
export function generateAccessKey(): string {
  // 8-char base64url key, human-typeable, e.g. "aB3xK9pQ"
  return randomBytes(6).toString("base64url");
}
