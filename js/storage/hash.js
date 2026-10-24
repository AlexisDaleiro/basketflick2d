import { PIN_SALT_BYTES } from '../config/constants.js';

/** @param {Uint8Array} bytes @returns {string} */
export function hex(bytes) { return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''); }
/** Disuasion fallback, not a secure password hash. @param {string} value @returns {string} */
export function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}
/** @param {any} [cryptoProvider] @returns {string} */
export function makeSalt(cryptoProvider = globalThis.crypto) {
  const bytes = new Uint8Array(PIN_SALT_BYTES);
  try { cryptoProvider.getRandomValues(bytes); }
  catch { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256); }
  return hex(bytes);
}
/** Persist algorithm separately so fallback credentials remain valid after API availability changes. @param {string} salt @param {string} pin @param {string} [algorithm] @param {any} [subtle] @returns {Promise<{hash:string,algorithm:string}>} */
export async function hashPin(salt, pin, algorithm = 'auto', subtle = globalThis.crypto?.subtle) {
  if (algorithm !== 'fnv1a64' && subtle?.digest) {
    try { return { hash: hex(new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(salt + pin)))), algorithm: 'sha256' }; }
    catch { if (algorithm === 'sha256') throw new Error('Hash unavailable'); }
  }
  if (algorithm === 'sha256') throw new Error('Hash unavailable');
  return { hash: fnv1a64(salt + pin), algorithm: 'fnv1a64' };
}
