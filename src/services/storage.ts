/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserAccount,
  ShopBranch,
  SweetProduct,
  StockEntry,
  SaleRecord,
  BillRecord,
  YearlyArchive,
  AppSettings,
  MSMSBackupData,
  TaskCategory,
  ShopTask,
  ShopSummary,
} from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Vault } from './vault';

const STORAGE_KEYS = {
  USERS: 'msms_users_v1',
  CURRENT_USER: 'msms_active_user_v1',
  SHOPS: 'msms_shops_v1',
  CURRENT_SHOP_ID: 'msms_active_shop_id_v1',
  PRODUCTS: 'msms_products_v1',
  STOCK_HISTORY: 'msms_stock_movements_v1',
  SALES_HISTORY: 'msms_sales_history_v1',
  BILL_HISTORY: 'msms_bills_history_v1',
  ARCHIVES: 'msms_yearly_archives_v1',
  SETTINGS: 'msms_settings_v1',
  ACTION_LOGS: 'msms_action_history_v1',
  TASKS: 'msms_shop_tasks_v1',
  THEME: 'msms_theme_v1',
  LAST_BACKUP: 'msms_last_backup_date_v1',
  DISMISSED_BACKUP_REMINDER: 'msms_dismissed_backup_reminder_v1',
  TASK_CATEGORIES: 'msms_task_categories_v1',
  LOCKOUT: 'msms_login_lockout_v1',
};

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  { id: 'kitchen', name: 'Kitchen', nameBn: 'রান্নাঘর' },
  { id: 'counter', name: 'Counter', nameBn: 'কাউন্টার' },
  { id: 'hygiene', name: 'Hygiene', nameBn: 'পরিচ্ছন্নতা' },
  { id: 'accounts', name: 'Accounts', nameBn: 'হিসাব খাতা' },
];

// PBKDF2-SHA-256 with random 16-byte salt per user and 210,000 iterations
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
  return `pbkdf2$210000$${saltB64}$${hashB64}`;
}

// Backward-compatible alias
export const hashString = hashPassword;

export async function verifyPassword(
  passwordAttempt: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!storedHash) return { valid: false, needsUpgrade: false };

  // New PBKDF2 format: pbkdf2$<iter>$<saltB64>$<hashB64>
  if (storedHash.startsWith('pbkdf2$')) {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 4) return { valid: false, needsUpgrade: false };
      const iter = parseInt(parts[1], 10);
      const salt = new Uint8Array(
        atob(parts[2])
          .split('')
          .map(c => c.charCodeAt(0))
      );
      const expectedHash = atob(parts[3]);

      const encoder = new TextEncoder();
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passwordAttempt),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations: iter,
          hash: 'SHA-256',
        },
        passwordKey,
        256
      );
      const computedHash = String.fromCharCode(...new Uint8Array(derivedBits));

      let diff = 0;
      if (computedHash.length !== expectedHash.length) return { valid: false, needsUpgrade: false };
      for (let i = 0; i < computedHash.length; i++) {
        diff |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
      }
      return { valid: diff === 0, needsUpgrade: false };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  // Legacy SHA-256 single-salt format
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(passwordAttempt + '_msms_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const matches = hashHex === storedHash;
    return { valid: matches, needsUpgrade: matches };
  } catch {
    return { valid: false, needsUpgrade: false };
  }
}

// Login attempt limiter: 5 wrong attempts = 30-second lock (doubling)
export function getLoginLockoutStatus(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = Vault.get(STORAGE_KEYS.LOCKOUT);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const { lockUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockUntil && lockUntil > now) {
      return { isLocked: true, remainingSeconds: Math.ceil((lockUntil - now) / 1000) };
    }
    return { isLocked: false, remainingSeconds: 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

export function recordFailedLogin(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const raw = Vault.get(STORAGE_KEYS.LOCKOUT);
    const now = Date.now();
    let attempts = 0;
    let lockDurationSec = 30;
    if (raw) {
      const parsed = JSON.parse(raw);
      attempts = parsed.attempts || 0;
      lockDurationSec = parsed.lastLockDurationSec ? parsed.lastLockDurationSec * 2 : 30;
    }
    attempts += 1;
    if (attempts >= 5) {
      const lockUntil = now + lockDurationSec * 1000;
      Vault.set(
        STORAGE_KEYS.LOCKOUT,
        JSON.stringify({ attempts: 0, lockUntil, lastLockDurationSec: lockDurationSec })
      );
      return { isLocked: true, remainingSeconds: lockDurationSec };
    } else {
      Vault.set(
        STORAGE_KEYS.LOCKOUT,
        JSON.stringify({ attempts, lockUntil: 0, lastLockDurationSec: 30 })
      );
      return { isLocked: false, remainingSeconds: 0 };
    }
  } catch {
    return { isLocked: false, remainingSeconds: 0 };
  }
}

export function clearFailedLoginAttempts(): void {
  Vault.remove(STORAGE_KEYS.LOCKOUT);
}

// Backup Passphrase Encrypt / Decrypt helpers
export async function encryptBackupPayload(payloadJson: string, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters long');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(payloadJson)
  );

  const saltB64 = btoa(String.fromCharCode(...salt));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));

  return JSON.stringify({
    magic: 'MSMS-BACKUP',
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: 210000,
    salt: saltB64,
    iv: ivB64,
    ct: ctB64,
  }, null, 2);
}

export async function decryptBackupPayload(
  rawContent: string,
  passphrase?: string
): Promise<{ success: boolean; data?: MSMSBackupData; isPlaintextLegacy?: boolean; error?: string }> {
  try {
    const trimmed = rawContent.trim();
    const parsed = JSON.parse(trimmed);

    if (parsed.magic === 'MSMS-BACKUP' && parsed.v === 1) {
      if (!passphrase) {
        return { success: false, error: 'Passphrase required' };
      }
      try {
        const salt = new Uint8Array(atob(parsed.salt).split('').map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(parsed.iv).split('').map(c => c.charCodeAt(0)));
        const ct = new Uint8Array(atob(parsed.ct).split('').map(c => c.charCodeAt(0)));

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(passphrase),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        const aesKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: parsed.iter || 210000,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          aesKey,
          ct
        );

        const decryptedJson = new TextDecoder().decode(decryptedBuffer);
        const data = JSON.parse(decryptedJson) as MSMSBackupData;
        return { success: true, data, isPlaintextLegacy: false };
      } catch {
        return { success: false, error: 'Wrong passphrase or damaged file' };
      }
    }

    // Legacy plaintext backup check
    if (parsed.appName || parsed.shops) {
      return { success: true, data: parsed as MSMSBackupData, isPlaintextLegacy: true };
    }

    return { success: false, error: 'Unrecognized backup file format' };
  } catch {
    return { success: false, error: 'Invalid JSON file format' };
  }
}

// Initial Settings
const DEFAULT_SETTINGS: AppSettings = {
  language: 'bn',
  numeralSystem: 'bengali',
  currentCountry: 'BD',
  currencySymbol: '৳',
  yearlyTimelineEnabled: true,
  autoGoogleDrivePrompt: false,
  sessionPersistence: 'keep_logged_in',
};

export class StorageService {
  // Action History Logger
  static logAction(action: string, details?: string) {
    try {
      const logs = this.getActionHistory();
      logs.unshift({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action,
        details: details || '',
      });
      if (logs.length > 150) logs.pop();
      Vault.set(STORAGE_KEYS.ACTION_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to log action', e);
    }
  }

  static getActionHistory(): { id: string; timestamp: string; action: string; details: string }[] {
    const raw = Vault.get(STORAGE_KEYS.ACTION_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  // Users & Auth
  static getUsers(): UserAccount[] {
    const raw = Vault.get(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  }

  static getMasterAdmin(): UserAccount | null {
    const users = this.getUsers();
    return users.find(u => u.role === 'master_admin') || null;
  }

  static getGuestUsers(): UserAccount[] {
    const users = this.getUsers();
    return users.filter(u => u.role === 'guest_viewer');
  }

  static saveUser(user: UserAccount) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    Vault.set(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.logAction('USER_SAVED', `User ${user.name} (${user.role}) saved.`);
  }

  static getActiveUser(): UserAccount | null {
    const raw = Vault.get(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      let userId = '';
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        userId = parsed.id || '';
      } else {
        userId = raw;
      }
      if (!userId) return null;
      const users = this.getUsers();
      return users.find(u => u.id === userId) || null;
    } catch {
      return null;
    }
  }

  static setActiveUser(user: UserAccount | null) {
    if (user) {
      // Store ONLY the user ID and role, never passwords or hashes!
      Vault.set(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ id: user.id, role: user.role }));
      this.logAction('USER_LOGIN', `Logged in as ${user.name}`);
    } else {
      Vault.remove(STORAGE_KEYS.CURRENT_USER);
      this.logAction('USER_LOGOUT', 'Logged out');
    }
  }

  // Settings
  static getSettings(): AppSettings {
    const raw = Vault.get(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings) {
    Vault.set(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.logAction('SETTINGS_UPDATED', `Yearly archive: ${settings.yearlyTimelineEnabled}`);
  }

  // Shops & Branches
  static getShops(): ShopBranch[] {
    const raw = Vault.get(STORAGE_KEYS.SHOPS);
    return raw ? JSON.parse(raw) : [];
  }

  static saveShop(shop: ShopBranch) {
    const shops = this.getShops();
    const idx = shops.findIndex(s => s.id === shop.id);
    if (idx >= 0) {
      shops[idx] = shop;
    } else {
      shops.push(shop);
    }
    Vault.set(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
    this.logAction('SHOP_SAVED', `Shop ${shop.name} saved.`);
  }

  static getActiveShopId(): string {
    const id = Vault.get(STORAGE_KEYS.CURRENT_SHOP_ID);
    if (id) return id;
    const shops = this.getShops();
    if (shops.length > 0) {
      Vault.set(STORAGE_KEYS.CURRENT_SHOP_ID, shops[0].id);
      return shops[0].id;
    }
    return '';
  }

  static setActiveShopId(id: string) {
    Vault.set(STORAGE_KEYS.CURRENT_SHOP_ID, id);
    this.logAction('ACTIVE_SHOP_SWITCH', `Switched active shop to ${id}`);
  }

  static getShopSummary(shopId: string): ShopSummary {
    const products = this.getProducts(shopId);
    const sales = this.getSalesHistory(shopId);
    const bills = this.getBillsHistory(shopId);

    const totalStock = products.reduce((acc, p) => acc + p.currentStock, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySalesList = sales.filter(s => s.dateTime.startsWith(todayStr));
    const todaySales = todaySalesList.reduce((acc, s) => acc + s.totalAmount, 0);
    const todayBillsList = bills.filter(b => b.dateTime.startsWith(todayStr) && b.type === 'expense');
    const todayBills = todayBillsList.reduce((acc, b) => acc + b.amount, 0);

    return {
      productCount: products.length,
      totalStock: Math.round(totalStock * 10) / 10,
      todaySales,
      todayOrders: todaySalesList.length,
      todayBills,
    };
  }

  // Products
  static getProducts(shopId?: string): SweetProduct[] {
    const raw = Vault.get(STORAGE_KEYS.PRODUCTS);
    const all: SweetProduct[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(p => p.shopId === shopId);
  }

  static saveProduct(product: SweetProduct) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('PRODUCT_SAVED', `Sweet ${product.name} saved.`);
  }

  static deleteProduct(productId: string) {
    const products = this.getProducts().filter(p => p.id !== productId);
    Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('PRODUCT_DELETED', `Deleted product ID: ${productId}`);
  }

  // Stock Movement History
  static getStockHistory(shopId?: string): StockEntry[] {
    const raw = Vault.get(STORAGE_KEYS.STOCK_HISTORY);
    const all: StockEntry[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(e => e.shopId === shopId);
  }

  static addStockMovement(entry: StockEntry) {
    const history = this.getStockHistory();
    history.unshift(entry);
    if (history.length > 500) history.pop();
    Vault.set(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(history));

    const products = this.getProducts();
    const product = products.find(p => p.id === entry.productId);
    if (product) {
      product.currentStock += entry.quantityAdded;
      product.updatedAt = new Date().toISOString();
      this.saveProduct(product);
    }
    this.logAction('STOCK_ADDED', `Added ${entry.quantityAdded} ${entry.unit} to ${entry.productName}`);
  }

  // Sales History
  static getSalesHistory(shopId?: string): SaleRecord[] {
    const raw = Vault.get(STORAGE_KEYS.SALES_HISTORY);
    const all: SaleRecord[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(s => s.shopId === shopId);
  }

  static recordSale(sale: SaleRecord) {
    const history = this.getSalesHistory();
    history.unshift(sale);
    Vault.set(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(history));

    const products = this.getProducts();
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      product.currentStock = Math.max(0, product.currentStock - sale.quantitySold);
      product.updatedAt = new Date().toISOString();
      this.saveProduct(product);
    }

    this.addBill({
      id: crypto.randomUUID(),
      shopId: sale.shopId,
      type: 'sale',
      title: `${sale.productName} (${sale.quantitySold} ${sale.unit})`,
      titleBn: `${sale.productNameBn || sale.productName} (${sale.quantitySold} ${sale.unit})`,
      amount: sale.totalAmount,
      paymentMethod: 'cash',
      dateTime: sale.dateTime,
      notes: `Order Ref: #${sale.id.slice(0, 6)}`,
    });

    this.logAction('SALE_RECORDED', `Sold ${sale.quantitySold} ${sale.unit} of ${sale.productName} (৳${sale.totalAmount})`);
  }

  // Bills & Expenses
  static getBillsHistory(shopId?: string): BillRecord[] {
    const raw = Vault.get(STORAGE_KEYS.BILL_HISTORY);
    const all: BillRecord[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(b => b.shopId === shopId);
  }

  static addBill(bill: BillRecord) {
    const bills = this.getBillsHistory();
    bills.unshift(bill);
    Vault.set(STORAGE_KEYS.BILL_HISTORY, JSON.stringify(bills));
    this.logAction('BILL_LOGGED', `${bill.type.toUpperCase()}: ${bill.title} - ৳${bill.amount}`);
  }

  // Task Categories
  static getTaskCategories(shopId: string): TaskCategory[] {
    const raw = Vault.get(STORAGE_KEYS.TASK_CATEGORIES);
    const allShopCategories: { shopId: string; categories: TaskCategory[] }[] = raw ? JSON.parse(raw) : [];
    const shopEntry = allShopCategories.find(entry => entry.shopId === shopId);
    if (shopEntry && shopEntry.categories && shopEntry.categories.length > 0) {
      return shopEntry.categories;
    }
    return DEFAULT_TASK_CATEGORIES;
  }

  static saveTaskCategories(shopId: string, categories: TaskCategory[]): void {
    const raw = Vault.get(STORAGE_KEYS.TASK_CATEGORIES);
    const allShopCategories: { shopId: string; categories: TaskCategory[] }[] = raw ? JSON.parse(raw) : [];
    const index = allShopCategories.findIndex(entry => entry.shopId === shopId);
    if (index >= 0) {
      allShopCategories[index].categories = categories;
    } else {
      allShopCategories.push({ shopId, categories });
    }
    Vault.set(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(allShopCategories));
  }

  static addTaskCategory(shopId: string, name: string, nameBn: string): TaskCategory {
    const list = this.getTaskCategories(shopId);
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'custom_cat';
    let uniqueId = id;
    let counter = 1;
    while (list.some(c => c.id === uniqueId)) {
      uniqueId = `${id}_${counter++}`;
    }
    const newCategory: TaskCategory = {
      id: uniqueId,
      name: name.trim(),
      nameBn: nameBn.trim() || name.trim(),
    };
    list.push(newCategory);
    this.saveTaskCategories(shopId, list);
    this.logAction('TASK_CATEGORY_ADDED', `Added category ${newCategory.name} (${newCategory.nameBn}) for shop ${shopId}`);
    return newCategory;
  }

  static renameTaskCategory(shopId: string, id: string, name: string, nameBn: string): void {
    const list = this.getTaskCategories(shopId);
    const cat = list.find(c => c.id === id);
    if (cat) {
      cat.name = name.trim();
      cat.nameBn = nameBn.trim() || name.trim();
      this.saveTaskCategories(shopId, list);
      this.logAction('TASK_CATEGORY_RENAMED', `Renamed category ${id} to ${name} (${nameBn})`);
    }
  }

  static deleteTaskCategory(shopId: string, id: string): void {
    const list = this.getTaskCategories(shopId);
    const updated = list.filter(c => c.id !== id);
    this.saveTaskCategories(shopId, updated);
    this.logAction('TASK_CATEGORY_DELETED', `Deleted category ${id} for shop ${shopId}`);
  }

  // Task Management
  static getTasks(shopId?: string): ShopTask[] {
    const raw = Vault.get(STORAGE_KEYS.TASKS);
    const all: ShopTask[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(t => t.shopId === shopId);
  }

  static getAllTasks(): ShopTask[] {
    const raw = Vault.get(STORAGE_KEYS.TASKS);
    return raw ? JSON.parse(raw) : [];
  }

  static loadSuggestedTasks(shopId: string): ShopTask[] {
    if (!shopId) return [];
    const defaults: ShopTask[] = [
      {
        id: crypto.randomUUID(),
        shopId,
        title: 'Morning Milk Purity & Fat Testing (Lactometer check)',
        titleBn: 'সকালের খাঁটি দুধের ঘনত্ব ও ল্যাকটোমিটার পরীক্ষা',
        category: 'kitchen',
        isCompleted: false,
        dueDate: '07:30 AM',
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        title: 'Weigh & Accept Fresh Kalajam & Rosogolla Batches',
        titleBn: 'তাজা কালাজাম ও স্পঞ্জ রসগোল্লা ওজন করে নেওয়া',
        category: 'kitchen',
        isCompleted: false,
        dueDate: '08:30 AM',
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        title: 'Clean Counter Glass Showcase & Organize Sweet Trays',
        titleBn: 'কাউন্টারের শোকেস কাঁচ পরিষ্কার ও মিষ্টির ট্রে সাজানো',
        category: 'hygiene',
        isCompleted: false,
        dueDate: '09:30 AM',
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        title: 'Midday Sweet Syrup Replenishment & Stock Check',
        titleBn: 'মিষ্টির চিনির শিরা রিফিল ও দুপুরের স্টক যাচাই',
        category: 'counter',
        isCompleted: false,
        dueDate: '02:00 PM',
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        title: 'Evening Cash Drawer Balancing & Daily Register Closing',
        titleBn: 'দিনের শেষে ক্যাশ হিসাব মেলানো ও খাতা বন্ধ করা',
        category: 'accounts',
        isCompleted: false,
        dueDate: '10:30 PM',
        isDemo: true,
      },
    ];
    const raw = Vault.get(STORAGE_KEYS.TASKS);
    const all: ShopTask[] = raw ? JSON.parse(raw) : [];
    const remaining = all.filter(t => t.shopId !== shopId);
    const updated = [...remaining, ...defaults];
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    this.logAction('SUGGESTED_TASKS_LOADED', `Loaded suggested checklist for shop ${shopId}`);
    return defaults;
  }

  static saveTask(task: ShopTask) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static toggleTask(taskId: string) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.isCompleted = !task.isCompleted;
      task.completedAt = task.isCompleted ? new Date().toISOString() : undefined;
      Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      this.logAction('TASK_TOGGLED', `Task ${task.title} toggled to ${task.isCompleted}`);
    }
  }

  static deleteTask(taskId: string) {
    const tasks = this.getTasks().filter(t => t.id !== taskId);
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static saveTasksForShop(shopId: string, newTasks: ShopTask[]) {
    const raw = Vault.get(STORAGE_KEYS.TASKS);
    const all: ShopTask[] = raw ? JSON.parse(raw) : [];
    const otherTasks = all.filter(t => t.shopId !== shopId);
    const combined = [...otherTasks, ...newTasks];
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(combined));
    Vault.set(`msms_tasks_seeded_${shopId}`, 'true');
    this.logAction('TASKS_UPDATED', `Updated ${newTasks.length} tasks for shop ${shopId}`);
  }

  static saveAllTasks(tasks: ShopTask[]) {
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static deleteShop(shopId: string) {
    const shops = this.getShops().filter(s => s.id !== shopId);
    Vault.set(STORAGE_KEYS.SHOPS, JSON.stringify(shops));

    const tasks = this.getTasks().filter(t => t.shopId !== shopId);
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    Vault.remove(`msms_tasks_seeded_${shopId}`);

    const raw = Vault.get(STORAGE_KEYS.TASK_CATEGORIES);
    if (raw) {
      const allShopCategories: { shopId: string; categories: TaskCategory[] }[] = JSON.parse(raw);
      const filtered = allShopCategories.filter(entry => entry.shopId !== shopId);
      Vault.set(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(filtered));
    }

    const products = this.getProducts().filter(p => p.shopId !== shopId);
    Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    this.logAction('SHOP_DELETED', `Deleted shop branch: ${shopId}`);
  }

  // Yearly Timeline & Archives
  static getArchives(): YearlyArchive[] {
    const raw = Vault.get(STORAGE_KEYS.ARCHIVES);
    return raw ? JSON.parse(raw) : [];
  }

  static checkAndPerformYearlyRollover() {
    const settings = this.getSettings();
    if (!settings.yearlyTimelineEnabled) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const sales = this.getSalesHistory();

    const previousYears = Array.from(new Set(sales.map(s => s.year))).filter(y => y < currentYear);

    if (previousYears.length === 0) return;

    const archives = this.getArchives();

    previousYears.forEach(year => {
      const yearSales = sales.filter(s => s.year === year);
      if (yearSales.length === 0) return;

      const totalRevenue = yearSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalCost = yearSales.reduce((sum, s) => sum + s.costTotal, 0);
      const totalProfit = totalRevenue - totalCost;

      const existingIdx = archives.findIndex(a => a.year === year);
      const archiveRecord: YearlyArchive = {
        year,
        archivedAt: new Date().toISOString(),
        totalSales: yearSales.length,
        totalRevenue,
        totalProfit,
        recordsCount: yearSales.length,
        summary: `Auto-archived timeline for ${year}. Total Revenue: ৳${totalRevenue}, Profit: ৳${totalProfit}`,
      };

      if (existingIdx >= 0) {
        archives[existingIdx] = archiveRecord;
      } else {
        archives.push(archiveRecord);
      }
    });

    Vault.set(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));

    const retainedSales = sales.filter(s => s.year === currentYear);
    Vault.set(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(retainedSales));

    this.logAction('YEARLY_ROLLOVER_COMPLETED', `Archived sales for years: ${previousYears.join(', ')}`);
  }

  static factoryResetClearTransactions() {
    const products = this.getProducts();
    products.forEach(p => {
      p.currentStock = 0;
      p.updatedAt = new Date().toISOString();
    });
    Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    Vault.remove(STORAGE_KEYS.SALES_HISTORY);
    Vault.remove(STORAGE_KEYS.STOCK_HISTORY);
    Vault.remove(STORAGE_KEYS.BILL_HISTORY);

    this.logAction('FACTORY_RESET_COMPLETED', 'Cleared sales, stock movements, and customer bills.');
  }

  // Google Drive Structured Export (no masterAdminName, no passwords/hashes)
  static generateGoogleDriveBackup(): MSMSBackupData {
    return {
      appName: 'MSMS',
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      shops: this.getShops(),
      products: this.getProducts(),
      stockHistory: this.getStockHistory(),
      salesHistory: this.getSalesHistory(),
      billHistory: this.getBillsHistory(),
      archives: this.getArchives(),
      taskCategories: (() => {
        const raw = Vault.get(STORAGE_KEYS.TASK_CATEGORIES);
        return raw ? JSON.parse(raw) : [];
      })(),
      tasks: this.getAllTasks(),
    };
  }

  // Passphrase-encrypted backup export (optional passphrase)
  static async downloadGoogleDriveBackupFile(passphrase?: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const backup = this.generateGoogleDriveBackup();
      const jsonString = JSON.stringify(backup, null, 2);
      const isEncrypted = !!(passphrase && passphrase.length >= 8);
      const payloadString = isEncrypted
        ? await encryptBackupPayload(jsonString, passphrase!)
        : jsonString;
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = isEncrypted ? `MSMS_Backup_${dateStr}.msmsbak` : `MSMS_Backup_${dateStr}.json`;

      const nowIso = new Date().toISOString();
      Vault.set(STORAGE_KEYS.LAST_BACKUP, nowIso);

      if (Capacitor.isNativePlatform()) {
        const written = await Filesystem.writeFile({
          path: fileName,
          data: payloadString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: isEncrypted ? 'MSMS Store Backup (Encrypted)' : 'MSMS Store Backup',
          text: `MSMS Backup generated on ${dateStr}`,
          url: written.uri,
          dialogTitle: 'Save or Share MSMS Backup',
        });

        // Delete temporary file from cache after sharing
        try {
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Cache,
          });
        } catch {
          // ignore cache cleanup error
        }

        this.logAction('BACKUP_EXPORTED', `Shared backup file ${fileName}`);
        return { success: true, filePath: written.uri };
      } else {
        const blob = new Blob([payloadString], {
          type: isEncrypted ? 'application/octet-stream' : 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.logAction('BACKUP_DOWNLOADED', `Downloaded backup file ${fileName}`);
        return { success: true };
      }
    } catch (err: any) {
      console.error('Failed to create backup', err);
      return { success: false, error: err?.message || 'Failed to export backup' };
    }
  }

  static eraseStock(shopId: string): void {
    const products = this.getProducts();
    products.forEach(p => {
      if (!shopId || p.shopId === shopId) {
        p.currentStock = 0;
        p.updatedAt = new Date().toISOString();
      }
    });
    Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('STOCK_ERASED', `Stock reset to zero for shop: ${shopId || 'all'}`);
  }

  static clearTestDataAndSales(): void {
    this.factoryResetClearTransactions();
  }

  static addStockEntry(entry: StockEntry): void {
    this.recordStockEntry(entry);
  }

  static addSaleRecord(sale: SaleRecord): void {
    this.recordSale(sale);
  }

  static addBillRecord(bill: BillRecord): void {
    this.addBill(bill);
  }

  static getLastBackupDate(): string | null {
    return Vault.get(STORAGE_KEYS.LAST_BACKUP);
  }

  static isBackupReminderDismissed(): boolean {
    return Vault.get(STORAGE_KEYS.DISMISSED_BACKUP_REMINDER) === 'true';
  }

  static dismissBackupReminder(): void {
    Vault.set(STORAGE_KEYS.DISMISSED_BACKUP_REMINDER, 'true');
  }

  static restoreFromBackup(backup: MSMSBackupData): boolean {
    try {
      if (!backup.appName || !backup.shops) {
        throw new Error('Invalid MSMS backup file format');
      }
      if (backup.settings) Vault.set(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));
      if (backup.shops) Vault.set(STORAGE_KEYS.SHOPS, JSON.stringify(backup.shops));
      if (backup.products) Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(backup.products));
      if (backup.stockHistory) Vault.set(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(backup.stockHistory));
      if (backup.salesHistory) Vault.set(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(backup.salesHistory));
      if (backup.billHistory) Vault.set(STORAGE_KEYS.BILL_HISTORY, JSON.stringify(backup.billHistory));
      if (backup.archives) Vault.set(STORAGE_KEYS.ARCHIVES, JSON.stringify(backup.archives));
      if (backup.taskCategories) Vault.set(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(backup.taskCategories));
      if (backup.tasks) Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(backup.tasks));

      this.logAction('BACKUP_RESTORED', `Restored data exported on ${backup.exportedAt}`);
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  }

  // Load Voluntary Authentic Bengali Demo Sweets & Sales Data
  static loadAuthenticBengaliDemoData(shopId: string) {
    const demoSweets: SweetProduct[] = [
      {
        id: crypto.randomUUID(),
        shopId,
        name: 'Kalajam',
        nameBn: 'কালাজাম',
        unit: 'kg',
        unitPrice: 380,
        costPrice: 260,
        currentStock: 42,
        minStockAlert: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        name: 'Spongy Rosogolla',
        nameBn: 'স্পঞ্জ রসগোল্লা',
        unit: 'piece',
        unitPrice: 25,
        costPrice: 15,
        currentStock: 180,
        minStockAlert: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        name: 'Porabari Chamcham',
        nameBn: 'পোড়াবাড়ির চমচম',
        unit: 'kg',
        unitPrice: 450,
        costPrice: 320,
        currentStock: 28,
        minStockAlert: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        name: 'Chanar Sandesh',
        nameBn: 'ছানার সন্দেশ',
        unit: 'kg',
        unitPrice: 550,
        costPrice: 400,
        currentStock: 19,
        minStockAlert: 6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        name: 'Motichur Laddu',
        nameBn: 'মতিচুর লাড্ডু',
        unit: 'piece',
        unitPrice: 30,
        costPrice: 18,
        currentStock: 120,
        minStockAlert: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      },
      {
        id: crypto.randomUUID(),
        shopId,
        name: 'Kashmiri Malai Chomchom',
        nameBn: 'কাশ্মীরি মালাই চমচম',
        unit: 'kg',
        unitPrice: 520,
        costPrice: 380,
        currentStock: 22,
        minStockAlert: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true,
      },
    ];

    demoSweets.forEach(s => this.saveProduct(s));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const salesToGenerate: SaleRecord[] = [];
    const peakDays = [2, 5, 8, 11, 13];

    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const saleDate = new Date(now);
      saleDate.setDate(now.getDate() - dayOffset);

      const isPeakDay = peakDays.includes(dayOffset);
      const sweet = demoSweets[dayOffset % demoSweets.length];
      const qty = isPeakDay ? (sweet.unit === 'kg' ? 18 : 65) : (sweet.unit === 'kg' ? 6 : 22);
      const totalAmount = qty * sweet.unitPrice;
      const costTotal = qty * sweet.costPrice;

      salesToGenerate.push({
        id: crypto.randomUUID(),
        shopId,
        productId: sweet.id,
        productName: sweet.name,
        productNameBn: sweet.nameBn,
        quantitySold: qty,
        unit: sweet.unit,
        pricePerUnit: sweet.unitPrice,
        totalAmount,
        costTotal,
        previousStock: sweet.currentStock + qty,
        remainingStock: sweet.currentStock,
        dateTime: saleDate.toISOString(),
        year: currentYear,
        month: currentMonth,
        dayOfWeek: saleDate.getDay(),
        isPeak: isPeakDay,
        isDemo: true,
      });
    }

    const existingSales = this.getSalesHistory();
    const combinedSales = [...salesToGenerate, ...existingSales];
    Vault.set(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(combinedSales));
    this.logAction('DEMO_DATA_LOADED', 'Loaded authentic Bengali sweets and sample sales history.');
  }

  // Purge demo records with isDemo: true
  static removeDemoData(shopId?: string): { removedCount: number } {
    let removedCount = 0;

    const products = this.getProducts();
    const retainedProducts = products.filter(p => {
      if (p.isDemo && (!shopId || p.shopId === shopId)) {
        removedCount++;
        return false;
      }
      return true;
    });
    Vault.set(STORAGE_KEYS.PRODUCTS, JSON.stringify(retainedProducts));

    const sales = this.getSalesHistory();
    const retainedSales = sales.filter(s => {
      if (s.isDemo && (!shopId || s.shopId === shopId)) {
        removedCount++;
        return false;
      }
      return true;
    });
    Vault.set(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(retainedSales));

    const bills = this.getBillsHistory();
    const retainedBills = bills.filter(b => {
      if (b.isDemo && (!shopId || b.shopId === shopId)) {
        removedCount++;
        return false;
      }
      return true;
    });
    Vault.set(STORAGE_KEYS.BILL_HISTORY, JSON.stringify(retainedBills));

    const tasks = this.getAllTasks();
    const retainedTasks = tasks.filter(t => {
      if (t.isDemo && (!shopId || t.shopId === shopId)) {
        removedCount++;
        return false;
      }
      return true;
    });
    Vault.set(STORAGE_KEYS.TASKS, JSON.stringify(retainedTasks));

    this.logAction('DEMO_DATA_REMOVED', `Removed ${removedCount} demo items.`);
    return { removedCount };
  }

  static hasDemoData(shopId?: string): boolean {
    const p = this.getProducts().some(x => x.isDemo && (!shopId || x.shopId === shopId));
    const s = this.getSalesHistory().some(x => x.isDemo && (!shopId || x.shopId === shopId));
    const b = this.getBillsHistory().some(x => x.isDemo && (!shopId || x.shopId === shopId));
    const t = this.getAllTasks().some(x => x.isDemo && (!shopId || x.shopId === shopId));
    return p || s || b || t;
  }

  // Theme Persistence (Plain localStorage is fine for UI preferences)
  static getTheme(): 'dark' | 'light' {
    try {
      const theme = localStorage.getItem(STORAGE_KEYS.THEME);
      return theme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  static setTheme(theme: 'dark' | 'light'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // ignore
    }
  }
}
