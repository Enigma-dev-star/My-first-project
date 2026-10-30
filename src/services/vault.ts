/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

// In-memory decrypted cache for synchronous reads/writes
const cache = new Map<string, string>();
const pendingWrites = new Map<string, string | null>();
let isProcessingQueue = false;
let masterCryptoKey: CryptoKey | null = null;
let initialized = false;
let decryptionErrorDetected = false;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Note: Storing a non-extractable CryptoKey in IndexedDB protects against direct
// localStorage dumps and copied app caches, though not against an attacker who
// completely owns the local browser user profile.
function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('msms_vault_db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOrGenerateMasterKey(): Promise<CryptoKey> {
  if (Capacitor.isNativePlatform()) {
    try {
      const rawHex = await SecureStorage.get('msms_vault_master_key_v1');
      if (rawHex && typeof rawHex === 'string' && rawHex.length === 64) {
        const rawBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          rawBytes[i] = parseInt(rawHex.substring(i * 2, i * 2 + 2), 16);
        }
        return await crypto.subtle.importKey(
          'raw',
          rawBytes,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      }
      const newBytes = crypto.getRandomValues(new Uint8Array(32));
      const hex = Array.from(newBytes, b => b.toString(16).padStart(2, '0')).join('');
      await SecureStorage.set('msms_vault_master_key_v1', hex);
      return await crypto.subtle.importKey(
        'raw',
        newBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (err) {
      console.warn('Native SecureStorage failed, falling back to IndexedDB', err);
    }
  }

  // Web / PWA fallback with IndexedDB
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const getReq = store.get('master_key');
    getReq.onsuccess = async () => {
      if (getReq.result instanceof CryptoKey) {
        resolve(getReq.result);
      } else {
        try {
          const newKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
          );
          const putTx = db.transaction('keys', 'readwrite');
          putTx.objectStore('keys').put(newKey, 'master_key');
          putTx.oncomplete = () => resolve(newKey);
          putTx.onerror = () => reject(putTx.error);
        } catch (genErr) {
          reject(genErr);
        }
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function encryptValue(key: string, plaintext: string): Promise<string> {
  if (!masterCryptoKey) throw new Error('Vault not initialized');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(key);
  const data = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource },
    masterCryptoKey,
    data as unknown as BufferSource
  );
  const ivB64 = bytesToBase64(iv);
  const ctB64 = bytesToBase64(new Uint8Array(cipherBuffer));
  return `v1:${ivB64}:${ctB64}`;
}

async function decryptValue(key: string, encrypted: string): Promise<string> {
  if (!masterCryptoKey) throw new Error('Vault not initialized');
  const parts = encrypted.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Invalid vault envelope');
  }
  const iv = base64ToBytes(parts[1]);
  const ct = base64ToBytes(parts[2]);
  const aad = new TextEncoder().encode(key);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, additionalData: aad as unknown as BufferSource },
    masterCryptoKey,
    ct as unknown as BufferSource
  );
  return new TextDecoder().decode(plainBuffer);
}

export class Vault {
  static async init(): Promise<void> {
    if (initialized) return;
    masterCryptoKey = await getOrGenerateMasterKey();

    const allStorageKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('msms_')) {
        allStorageKeys.push(k);
      }
    }

    for (const key of allStorageKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      if (raw.startsWith('v1:')) {
        try {
          const decrypted = await decryptValue(key, raw);
          cache.set(key, decrypted);
        } catch (err) {
          console.error(`Failed to decrypt vault key: ${key}`, err);
          decryptionErrorDetected = true;
        }
      } else {
        // Legacy plaintext migration:
        // Encrypt it, write it back with v1:, verify read-back, then cache
        try {
          const encrypted = await encryptValue(key, raw);
          localStorage.setItem(key, encrypted);
          const verified = await decryptValue(key, encrypted);
          if (verified === raw) {
            cache.set(key, raw);
          } else {
            localStorage.setItem(key, raw);
            cache.set(key, raw);
          }
        } catch (err) {
          console.error(`Failed to migrate legacy key: ${key}`, err);
          localStorage.setItem(key, raw);
          cache.set(key, raw);
        }
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          Vault.flush();
        }
      });
    }

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('pause', () => {
        Vault.flush();
      });
    }

    initialized = true;
  }

  static isInitialized(): boolean {
    return initialized;
  }

  static hasDecryptionError(): boolean {
    return decryptionErrorDetected;
  }

  static clearDecryptionError(): void {
    decryptionErrorDetected = false;
  }

  static get(key: string): string | null {
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const raw = localStorage.getItem(key);
    if (raw && !raw.startsWith('v1:')) {
      cache.set(key, raw);
      return raw;
    }
    return null;
  }

  static set(key: string, value: string): void {
    cache.set(key, value);
    pendingWrites.set(key, value);
    Vault.processQueue();
  }

  static remove(key: string): void {
    cache.delete(key);
    pendingWrites.set(key, null);
    localStorage.removeItem(key);
  }

  private static async processQueue(): Promise<void> {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    try {
      while (pendingWrites.size > 0) {
        const nextKey = pendingWrites.keys().next().value;
        if (typeof nextKey !== 'string') break;
        const val = pendingWrites.get(nextKey);
        pendingWrites.delete(nextKey);

        if (val === null || val === undefined) {
          localStorage.removeItem(nextKey);
        } else {
          try {
            const encrypted = await encryptValue(nextKey, val);
            localStorage.setItem(nextKey, encrypted);
          } catch (err) {
            console.error(`Failed to encrypt key ${nextKey}`, err);
          }
        }
      }
    } finally {
      isProcessingQueue = false;
    }
  }

  static async flush(): Promise<void> {
    while (pendingWrites.size > 0 || isProcessingQueue) {
      await Vault.processQueue();
      await new Promise(r => setTimeout(r, 10));
    }
  }

  static clearVault(): void {
    cache.clear();
    pendingWrites.clear();
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('msms_')) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
}
