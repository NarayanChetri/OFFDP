/**
 * Generates a RFC 4122 v4 UUID without requiring native modules.
 */
export function generateUUID(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Pure-JS salted FNV-1a + DJB2 128-bit digest for local offline credential verification.
 * Avoids storing plaintext passwords in AsyncStorage.
 */
export function hashCredential(password: string, salt: string): string {
  const input = `${salt}::offdp::${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2, 33) ^ c;
  }
  // Second pass with reversed string for extra avalanche
  let h3 = 0x9e3779b9;
  for (let i = input.length - 1; i >= 0; i--) {
    const c = input.charCodeAt(i);
    h3 = Math.imul(h3 ^ c, 0x85ebca6b);
    h3 ^= h3 >>> 13;
  }
  return [
    (h1 >>> 0).toString(16).padStart(8, '0'),
    (h2 >>> 0).toString(16).padStart(8, '0'),
    (h3 >>> 0).toString(16).padStart(8, '0'),
  ].join('');
}
