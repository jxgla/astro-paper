export function decodeSecret(input: string): Uint8Array<ArrayBuffer> {
  const normalized = input.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z2-7]+=*$/.test(normalized)) throw new Error("Invalid Base32");
  const secret = normalized.replace(/=+$/, "");
  if (![0, 2, 4, 5, 7].includes(secret.length % 8))
    throw new Error("Invalid Base32 length");
  if (
    normalized.includes("=") &&
    normalized.length !== Math.ceil(secret.length / 8) * 8
  )
    throw new Error("Invalid Base32 padding");

  const bytes = new Uint8Array(Math.floor((secret.length * 5) / 8));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of secret) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (buffer >>> bits) & 255;
    }
  }
  if ((buffer & ((1 << bits) - 1)) !== 0)
    throw new Error("Invalid Base32 trailing bits");
  return bytes;
}

export async function generateTotp(key: CryptoKey, time = Date.now()) {
  const counter = new Uint8Array(8);
  new DataView(counter.buffer).setBigUint64(
    0,
    BigInt(Math.floor(time / 30000))
  );
  const hash = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));
  const offset = hash[hash.length - 1] & 15;
  const value = new DataView(hash.buffer).getUint32(offset) & 0x7fffffff;
  return String(value % 1000000).padStart(6, "0");
}
