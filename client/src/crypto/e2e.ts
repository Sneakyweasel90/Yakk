/**
 * E2E Encryption for Yakk using Web Crypto API (ECDH + AES-GCM)
 *
 * Flow:
 * 1. On login, generate an ECDH key pair
 * 2. Store private key in memory (never sent to server)
 * 3. Publish public key to server (stored against user_id)
 * 4. To send a DM: fetch recipient's public key → derive shared secret → encrypt with AES-GCM
 * 5. To receive a DM: use your private key + sender's public key → same shared secret → decrypt
 *
 * For channel messages, content is sent as plaintext (no E2E — channels are shared spaces).
 * E2E encryption is applied to Direct Messages only.
 */

// ─── Key Generation ─────────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable so we can export the public key
    ["deriveKey"]
  );
}

// Export public key as base64 string (safe to send to server)
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Import a base64 public key received from server
export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "spki",
    raw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [] // public key: no usages needed directly
  );
}

// ─── Shared Secret Derivation ────────────────────────────────────────────────

export async function deriveSharedKey(
  privateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

export interface EncryptedPayload {
  iv: string;   // base64 encoded 12-byte IV
  data: string; // base64 encoded ciphertext
}

export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encoded
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
  };
}

export async function decryptMessage(
  sharedKey: CryptoKey,
  payload: EncryptedPayload
): Promise<string> {
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(payload.data), (c) => c.charCodeAt(0));

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    data
  );

  return new TextDecoder().decode(plainBuffer);
}

// ─── Serialisation helpers ───────────────────────────────────────────────────

/** Wrap an encrypted payload as a JSON string ready to send as message content */
export function serializeEncrypted(payload: EncryptedPayload): string {
  return JSON.stringify({ __e2e: true, ...payload });
}

/** Try to parse a message content string as an encrypted payload */
export function parseEncrypted(content: string): EncryptedPayload | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.__e2e && parsed.iv && parsed.data) {
      return { iv: parsed.iv, data: parsed.data };
    }
  } catch {
    // not JSON — plain text message
  }
  return null;
}

// ─── Key Store (in-memory, per session) ─────────────────────────────────────

class E2EKeyStore {
  private keyPair: CryptoKeyPair | null = null;
  /** Cache of derived shared keys keyed by the other user's id */
  private sharedKeys: Map<number, CryptoKey> = new Map();

  async init(): Promise<string> {
    this.keyPair = await generateKeyPair();
    return exportPublicKey(this.keyPair.publicKey);
  }

  getPrivateKey(): CryptoKey {
    if (!this.keyPair) throw new Error("E2E key store not initialised");
    return this.keyPair.privateKey;
  }

  getPublicKey(): CryptoKey {
    if (!this.keyPair) throw new Error("E2E key store not initialised");
    return this.keyPair.publicKey;
  }

  async getSharedKey(userId: number, theirPublicKeyB64: string): Promise<CryptoKey> {
    if (this.sharedKeys.has(userId)) {
      return this.sharedKeys.get(userId)!;
    }
    const theirKey = await importPublicKey(theirPublicKeyB64);
    const shared = await deriveSharedKey(this.getPrivateKey(), theirKey);
    this.sharedKeys.set(userId, shared);
    return shared;
  }

  clear() {
    this.keyPair = null;
    this.sharedKeys.clear();
  }
}

export const e2eKeyStore = new E2EKeyStore();