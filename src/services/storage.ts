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
} from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
};

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  { id: 'kitchen', name: 'Kitchen', nameBn: 'রান্নাঘর' },
  { id: 'counter', name: 'Counter', nameBn: 'কাউন্টার' },
  { id: 'hygiene', name: 'Hygiene', nameBn: 'পরিচ্ছন্নতা' },
  { id: 'accounts', name: 'Accounts', nameBn: 'হিসাব খাতা' },
];

// SHA-256 Hash helper
export async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value + '_msms_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initial Settings
const DEFAULT_SETTINGS: AppSettings = {
  language: 'bn', // Bengali by default as requested in prompt & notes
  numeralSystem: 'bengali', // Bengali (১, ২, ৩) or Arabic (0-9) for accounting
  currentCountry: 'BD',
  currencySymbol: '৳',
  yearlyTimelineEnabled: true, // ON by default, toggleable in admin settings
  autoGoogleDrivePrompt: false,
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
      // Keep last 150 action logs
      if (logs.length > 150) logs.pop();
      localStorage.setItem(STORAGE_KEYS.ACTION_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to log action', e);
    }
  }

  static getActionHistory(): { id: string; timestamp: string; action: string; details: string }[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTION_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  // Users & Auth
  static getUsers(): UserAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
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
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.logAction('USER_SAVED', `User ${user.name} (${user.role}) saved.`);
  }

  static getActiveUser(): UserAccount | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  }

  static setActiveUser(user: UserAccount | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.logAction('USER_LOGIN', `Logged in as ${user.name}`);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      this.logAction('USER_LOGOUT', 'Logged out');
    }
  }

  // Settings
  static getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.logAction('SETTINGS_UPDATED', `Yearly archive: ${settings.yearlyTimelineEnabled}`);
  }

  // Shops
  static getShops(): ShopBranch[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOPS);
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
    localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
    this.logAction('SHOP_SAVED', `Shop ${shop.name} saved.`);
  }

  static getActiveShopId(): string {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
    if (id) return id;
    const shops = this.getShops();
    if (shops.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, shops[0].id);
      return shops[0].id;
    }
    return '';
  }

  static setActiveShopId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, id);
    this.logAction('SHOP_CHANGED', `Active shop ID set to ${id}`);
  }

  static getShopSummary(shopId: string): import('../types').ShopSummary {
    const products = this.getProducts(shopId);
    const totalStock = products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
    const productCount = products.length;

    const todayStr = new Date().toISOString().split('T')[0];
    const sales = this.getSalesHistory(shopId).filter(s => s.dateTime && s.dateTime.startsWith(todayStr));
    const todaySales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const todayOrders = sales.length;

    const bills = this.getBillsHistory(shopId).filter(b => b.dateTime && b.dateTime.startsWith(todayStr) && b.type === 'expense');
    const todayBills = bills.reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      productCount,
      totalStock: Math.round(totalStock * 10) / 10,
      todaySales,
      todayOrders,
      todayBills,
    };
  }

  // Products
  static getProducts(shopId?: string): SweetProduct[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const all: SweetProduct[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(p => p.shopId === shopId);
  }

  static saveProduct(product: SweetProduct) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.push(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('PRODUCT_SAVED', `Sweet ${product.name} saved with stock ${product.currentStock} ${product.unit}`);
  }

  static deleteProduct(productId: string) {
    const products = this.getProducts().filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('PRODUCT_DELETED', `Sweet ID ${productId} deleted`);
  }

  // Stock Entries / Intake
  static getStockHistory(shopId?: string): StockEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STOCK_HISTORY);
    const all: StockEntry[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(s => s.shopId === shopId);
  }

  static addStockEntry(entry: StockEntry) {
    const history = this.getStockHistory();
    history.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(history));

    // Update product stock balance
    const products = this.getProducts();
    const product = products.find(p => p.id === entry.productId);
    if (product) {
      product.currentStock += entry.quantityAdded;
      product.costPrice = entry.costPrice || product.costPrice;
      product.updatedAt = new Date().toISOString();
      this.saveProduct(product);
    }
    this.logAction('STOCK_ADDED', `Added ${entry.quantityAdded} ${entry.unit} to ${entry.productName}`);
  }

  // Sales
  static getSalesHistory(shopId?: string): SaleRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES_HISTORY);
    const all: SaleRecord[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(s => s.shopId === shopId);
  }

  static recordSale(sale: SaleRecord) {
    const history = this.getSalesHistory();
    history.unshift(sale);
    localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(history));

    // Auto deduct product stock
    const products = this.getProducts();
    const product = products.find(p => p.id === sale.productId);
    if (product) {
      product.currentStock = Math.max(0, product.currentStock - sale.quantitySold);
      product.updatedAt = new Date().toISOString();
      this.saveProduct(product);
    }

    // Auto log customer receipt bill
    this.addBillRecord({
      id: crypto.randomUUID(),
      shopId: sale.shopId,
      type: 'sale',
      title: `Sale: ${sale.quantitySold} ${sale.unit} ${sale.productName}`,
      titleBn: `বিক্রি: ${sale.quantitySold} ${sale.unit} ${sale.productNameBn || sale.productName}`,
      amount: sale.totalAmount,
      paymentMethod: 'cash',
      dateTime: sale.dateTime,
    });

    this.logAction('SALE_RECORDED', `Sold ${sale.quantitySold} ${sale.unit} ${sale.productName} for ${sale.totalAmount}`);
  }

  static addSaleRecord(sale: SaleRecord) {
    this.recordSale(sale);
  }

  // Bills & Expenses
  static getBillsHistory(shopId?: string): BillRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BILL_HISTORY);
    const all: BillRecord[] = raw ? JSON.parse(raw) : [];
    if (!shopId) return all;
    return all.filter(b => b.shopId === shopId);
  }

  static addBillRecord(bill: BillRecord) {
    const bills = this.getBillsHistory();
    bills.unshift(bill);
    localStorage.setItem(STORAGE_KEYS.BILL_HISTORY, JSON.stringify(bills));
    this.logAction('BILL_LOGGED', `${bill.type}: ${bill.title} (${bill.amount})`);
  }

  // Task Categories Management
  static getTaskCategories(shopId: string): TaskCategory[] {
    if (!shopId) return [...DEFAULT_TASK_CATEGORIES];
    const raw = localStorage.getItem(STORAGE_KEYS.TASK_CATEGORIES);
    const allShopCategories: { shopId: string; categories: TaskCategory[] }[] = raw ? JSON.parse(raw) : [];
    const entry = allShopCategories.find(item => item.shopId === shopId);
    if (entry && Array.isArray(entry.categories)) {
      return entry.categories;
    }
    // First run (no saved categories for a shop): create the 4 defaults
    const defaults = [...DEFAULT_TASK_CATEGORIES];
    allShopCategories.push({ shopId, categories: defaults });
    localStorage.setItem(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(allShopCategories));
    return defaults;
  }

  static saveTaskCategories(shopId: string, list: TaskCategory[]): void {
    if (!shopId) return;
    const raw = localStorage.getItem(STORAGE_KEYS.TASK_CATEGORIES);
    const allShopCategories: { shopId: string; categories: TaskCategory[] }[] = raw ? JSON.parse(raw) : [];
    const idx = allShopCategories.findIndex(item => item.shopId === shopId);
    if (idx >= 0) {
      allShopCategories[idx].categories = list;
    } else {
      allShopCategories.push({ shopId, categories: list });
    }
    localStorage.setItem(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(allShopCategories));
  }

  static addTaskCategory(shopId: string, name: string, nameBn: string): TaskCategory {
    const list = this.getTaskCategories(shopId);
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || `cat_${Date.now()}`;
    // Ensure unique id
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
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    let all: ShopTask[] = raw ? JSON.parse(raw) : [];

    // Seed default sweet shop tasks only once per shop, tracked by flag msms_tasks_seeded_<shopId>
    if (shopId) {
      const seedKey = `msms_tasks_seeded_${shopId}`;
      const isSeeded = localStorage.getItem(seedKey);
      if (!isSeeded) {
        const defaults: ShopTask[] = [
          {
            id: crypto.randomUUID(),
            shopId,
            title: 'Morning Milk Purity & Fat Testing (Lactometer check)',
            titleBn: 'সকালের খাঁটি দুধের ঘনত্ব ও ল্যাকটোমিটার পরীক্ষা',
            category: 'kitchen',
            isCompleted: true,
            dueDate: '07:00 AM',
            completedAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            shopId,
            title: 'Weigh & Accept Fresh Kalajam & Rosogolla Batches',
            titleBn: 'তাজা কালাজাম ও স্পঞ্জ রসগোল্লা ওজন করে নেওয়া',
            category: 'kitchen',
            isCompleted: true,
            dueDate: '08:30 AM',
            completedAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            shopId,
            title: 'Clean Counter Glass Showcase & Organize Sweet Trays',
            titleBn: 'কাউন্টারের শোকেস কাঁচ পরিষ্কার ও মিষ্টির ট্রে সাজানো',
            category: 'hygiene',
            isCompleted: false,
            dueDate: '09:30 AM',
          },
          {
            id: crypto.randomUUID(),
            shopId,
            title: 'Midday Sweet Syrup Replenishment & Stock Check',
            titleBn: 'মিষ্টির চিনির শিরা রিফিল ও দুপুরের স্টক যাচাই',
            category: 'counter',
            isCompleted: false,
            dueDate: '02:00 PM',
          },
          {
            id: crypto.randomUUID(),
            shopId,
            title: 'Evening Cash Drawer Balancing & Daily Register Closing',
            titleBn: 'দিনের শেষে ক্যাশ হিসাব মেলানো ও খাতা বন্ধ করা',
            category: 'accounts',
            isCompleted: false,
            dueDate: '10:30 PM',
          },
        ];
        all = [...all, ...defaults];
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(all));
        localStorage.setItem(seedKey, 'true');
      }
    }

    if (!shopId) return all;
    return all.filter(t => t.shopId === shopId);
  }

  static saveTask(task: ShopTask) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static toggleTask(taskId: string) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.isCompleted = !task.isCompleted;
      task.completedAt = task.isCompleted ? new Date().toISOString() : undefined;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      this.logAction('TASK_TOGGLED', `Task ${task.title} toggled to ${task.isCompleted}`);
    }
  }

  static deleteTask(taskId: string) {
    const tasks = this.getTasks().filter(t => t.id !== taskId);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static saveTasksForShop(shopId: string, newTasks: ShopTask[]) {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const all: ShopTask[] = raw ? JSON.parse(raw) : [];
    const otherTasks = all.filter(t => t.shopId !== shopId);
    const combined = [...otherTasks, ...newTasks];
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(combined));
    localStorage.setItem(`msms_tasks_seeded_${shopId}`, 'true');
    this.logAction('TASKS_UPDATED', `Updated ${newTasks.length} tasks for shop ${shopId}`);
  }

  static deleteShop(shopId: string) {
    const shops = this.getShops().filter(s => s.id !== shopId);
    localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));

    // Remove tasks for this shop
    const tasks = this.getTasks().filter(t => t.shopId !== shopId);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.removeItem(`msms_tasks_seeded_${shopId}`);

    // Remove task categories for this shop
    const raw = localStorage.getItem(STORAGE_KEYS.TASK_CATEGORIES);
    if (raw) {
      const allShopCategories: { shopId: string; categories: TaskCategory[] }[] = JSON.parse(raw);
      const filtered = allShopCategories.filter(item => item.shopId !== shopId);
      localStorage.setItem(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(filtered));
    }

    // Remove products for this shop
    const products = this.getProducts().filter(p => p.shopId !== shopId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    this.logAction('SHOP_DELETED', `Deleted shop ID ${shopId} and associated categories`);
  }

  // Yearly Timeline & Archives
  static getArchives(): YearlyArchive[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ARCHIVES);
    return raw ? JSON.parse(raw) : [];
  }

  static checkAndPerformYearlyRollover(): boolean {
    const settings = this.getSettings();
    if (!settings.yearlyTimelineEnabled) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 1 is February

    // If we are in February or later of a new year, archive previous year data
    const prevYear = currentYear - 1;
    const archives = this.getArchives();
    const alreadyArchived = archives.some(a => a.year === prevYear);

    if (currentMonth >= 1 && !alreadyArchived) {
      const sales = this.getSalesHistory().filter(s => s.year === prevYear);
      if (sales.length > 0) {
        const totalSales = sales.reduce((sum, s) => sum + s.quantitySold, 0);
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalProfit = sales.reduce((sum, s) => sum + (s.totalAmount - s.costTotal), 0);

        const newArchive: YearlyArchive = {
          year: prevYear,
          archivedAt: new Date().toISOString(),
          totalSales,
          totalRevenue,
          totalProfit,
          recordsCount: sales.length,
          summary: `Archived fiscal year ${prevYear} on February ${currentYear} rollover.`,
        };

        archives.unshift(newArchive);
        localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));

        // Purge raw sales belonging to prevYear
        const retainedSales = this.getSalesHistory().filter(s => s.year >= currentYear);
        localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(retainedSales));

        this.logAction('YEARLY_ARCHIVE_COMPLETED', `Fiscal year ${prevYear} archived in February ${currentYear}`);
        return true;
      }
    }
    return false;
  }

  // Erase Stock Only (Requires dedicated Stock Erase Key)
  static eraseStock(shopId: string) {
    const products = this.getProducts();
    products.forEach(p => {
      if (p.shopId === shopId) {
        p.currentStock = 0;
        p.updatedAt = new Date().toISOString();
      }
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('STOCK_ERASED', `Stock wiped for shop ID ${shopId}`);
  }

  // Full Factory Reset (After 20-second Android safety buffer)
  static clearTestDataAndSales() {
    localStorage.removeItem(STORAGE_KEYS.SALES_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.STOCK_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.BILL_HISTORY);
    
    // Reset product stocks to 0 but keep shop structure and products
    const products = this.getProducts();
    products.forEach(p => {
      p.currentStock = 0;
      p.updatedAt = new Date().toISOString();
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.logAction('FACTORY_RESET_COMPLETED', 'Cleared sales, stock movements, and customer bills.');
  }

  // Google Drive Structured Export
  static generateGoogleDriveBackup(): MSMSBackupData {
    const master = this.getMasterAdmin();
    return {
      appName: 'Muslim Sweets Management System (MSMS)',
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      masterAdminName: master ? master.name : 'Admin',
      settings: this.getSettings(),
      shops: this.getShops(),
      products: this.getProducts(),
      stockHistory: this.getStockHistory(),
      salesHistory: this.getSalesHistory(),
      billHistory: this.getBillsHistory(),
      archives: this.getArchives(),
    };
  }

  static async downloadGoogleDriveBackupFile(): Promise<{ success: boolean; filePath?: string }> {
    const backup = this.generateGoogleDriveBackup();
    const jsonString = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `MSMS_Backup_${dateStr}.json`;

    // Record last backup date
    const nowIso = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, nowIso);

    if (Capacitor.isNativePlatform()) {
      try {
        const written = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'MSMS Store Backup',
          text: `MSMS Store Backup data generated on ${dateStr}`,
          url: written.uri,
          dialogTitle: 'Save or Share MSMS Backup',
        });

        this.logAction('BACKUP_EXPORTED_NATIVE', `Shared backup file ${fileName}`);
        return { success: true, filePath: written.uri };
      } catch (err) {
        console.error('Error sharing backup natively', err);
        return { success: false };
      }
    } else {
      // Create downloadable text/json blob formatted for Google Drive
      const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MSMS_GoogleDrive_Backup_${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.logAction('BACKUP_DOWNLOADED', 'Exported Google Drive formatted backup file');
      return { success: true };
    }
  }

  static getLastBackupDate(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
  }

  static isBackupReminderDismissed(): boolean {
    return localStorage.getItem(STORAGE_KEYS.DISMISSED_BACKUP_REMINDER) === 'true';
  }

  static dismissBackupReminder(): void {
    localStorage.setItem(STORAGE_KEYS.DISMISSED_BACKUP_REMINDER, 'true');
  }

  static restoreFromBackup(backup: MSMSBackupData): boolean {
    try {
      if (!backup.appName || !backup.shops) {
        throw new Error('Invalid MSMS backup file format');
      }
      if (backup.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));
      if (backup.shops) localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(backup.shops));
      if (backup.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(backup.products));
      if (backup.stockHistory) localStorage.setItem(STORAGE_KEYS.STOCK_HISTORY, JSON.stringify(backup.stockHistory));
      if (backup.salesHistory) localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(backup.salesHistory));
      if (backup.billHistory) localStorage.setItem(STORAGE_KEYS.BILL_HISTORY, JSON.stringify(backup.billHistory));
      if (backup.archives) localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(backup.archives));

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
      },
    ];

    demoSweets.forEach(s => this.saveProduct(s));

    // Generate realistic past 14 days sales to populate weekly average and top 5 peak sales diagrams
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const salesToGenerate: SaleRecord[] = [];
    const peakDays = [2, 5, 8, 11, 13]; // Specific days that had festival/weekend rush

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
      });
    }

    localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(salesToGenerate));
    this.logAction('DEMO_DATA_LOADED', 'Loaded authentic Bengali sweets and sample sales history.');
  }

  // Theme Persistence
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
