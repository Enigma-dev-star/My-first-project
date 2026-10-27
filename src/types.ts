/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'master_admin' | 'guest_viewer';

export type SweetUnit = 'kg' | 'piece' | 'box';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  stockErasePasswordHash?: string; // Dedicated secondary wipe password (master only)
  createdAt: string;
}

export interface ShopBranch {
  id: string;
  name: string;
  nameBn: string;
  address: string;
  addressBn?: string;
  country: string;
  currencySymbol: string;
  createdAt: string;
}

export interface ShopSummary {
  productCount: number;
  totalStock: number;
  todaySales: number;
  todayOrders: number;
  todayBills: number;
}


export interface SweetProduct {
  id: string;
  shopId: string;
  name: string;
  nameBn: string;
  unit: SweetUnit;
  unitPrice: number;     // Selling price per unit
  costPrice: number;     // Production/procurement cost per unit
  currentStock: number;  // Current quantity in stock
  minStockAlert: number; // Threshold for low stock warning
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  productNameBn: string;
  quantityAdded: number;
  unit: SweetUnit;
  costPrice: number;
  dateTime: string;      // Synced with device date & time
  notes?: string;
}

export interface SaleRecord {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  productNameBn: string;
  quantitySold: number;
  unit: SweetUnit;
  pricePerUnit: number;
  totalAmount: number;
  costTotal: number;
  previousStock: number;
  remainingStock: number;
  dateTime: string;
  year: number;
  month: number;          // 0 - 11
  dayOfWeek: number;      // 0 - 6
  isPeak?: boolean;
}

export interface BillRecord {
  id: string;
  shopId: string;
  type: 'sale' | 'expense' | 'supplier';
  title: string;
  titleBn?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_banking';
  customerName?: string;
  notes?: string;
  dateTime: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  nameBn: string;
}

export interface ShopTask {
  id: string;
  shopId: string;
  title: string;
  titleBn?: string;
  category: string;
  isCompleted: boolean;
  dueDate?: string;
  completedAt?: string;
}

export interface YearlyArchive {
  year: number;
  archivedAt: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  recordsCount: number;
  summary: string;
}

export interface CountryOption {
  code: string;
  countryEn: string;
  countryBn: string;
  currency: string;
  symbol: string;
}

export interface AppSettings {
  language: 'en' | 'bn';
  numeralSystem: 'bengali' | 'arabic'; // Option to choose Bengali digits (১, ২, ৩) or Western Arabic (0-9)
  currentCountry: string;
  currencySymbol: string;
  yearlyTimelineEnabled: boolean; // default true, toggleable in admin settings
  autoGoogleDrivePrompt: boolean;
}

export interface MSMSBackupData {
  appName: string;
  version: string;
  exportedAt: string;
  masterAdminName: string;
  settings: AppSettings;
  shops: ShopBranch[];
  products: SweetProduct[];
  stockHistory: StockEntry[];
  salesHistory: SaleRecord[];
  billHistory: BillRecord[];
  archives: YearlyArchive[];
  taskCategories?: { shopId: string; categories: TaskCategory[] }[];
  tasks?: ShopTask[];
}
