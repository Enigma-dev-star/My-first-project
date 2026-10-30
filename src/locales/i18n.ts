/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CountryOption } from '../types';

export const COUNTRIES: CountryOption[] = [
  { code: 'BD', countryEn: 'Bangladesh', countryBn: 'বাংলাদেশ', currency: 'BDT', symbol: '৳' },
  { code: 'IN', countryEn: 'India', countryBn: 'ভারত', currency: 'INR', symbol: '₹' },
  { code: 'US', countryEn: 'United States', countryBn: 'যুক্তরাষ্ট্র', currency: 'USD', symbol: '$' },
  { code: 'SA', countryEn: 'Saudi Arabia', countryBn: 'সৌদি আরব', currency: 'SAR', symbol: '﷼' },
  { code: 'AE', countryEn: 'United Arab Emirates', countryBn: 'সংযুক্ত আরব আমিরাত', currency: 'AED', symbol: 'د.إ' },
  { code: 'GB', countryEn: 'United Kingdom', countryBn: 'যুক্তরাজ্য', currency: 'GBP', symbol: '£' },
  { code: 'EU', countryEn: 'Eurozone', countryBn: 'ইউরোপীয় ইউনিয়ন', currency: 'EUR', symbol: '€' },
];

export const BENGALI_DIGITS: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
  '.': '.',
  ',': ',',
};

export function formatNumber(
  num: number | string,
  lang: 'en' | 'bn' = 'en',
  numeralSystem: 'bengali' | 'arabic' = 'bengali'
): string {
  const str = typeof num === 'number' ? num.toLocaleString('en-US') : num.toString();
  if (lang !== 'bn' || numeralSystem === 'arabic') return str;
  return str.split('').map(char => BENGALI_DIGITS[char] || char).join('');
}

export function formatCurrency(
  amount: number,
  symbol: string,
  lang: 'en' | 'bn' = 'en',
  numeralSystem: 'bengali' | 'arabic' = 'bengali'
): string {
  const formatted = formatNumber(Math.round(amount), lang, numeralSystem);
  return `${symbol} ${formatted}`;
}

export function formatStockDateTime(
  dateTimeStr?: string,
  lang: 'en' | 'bn' = 'en'
): { dateStr: string; timeStr: string; fullStr: string } {
  if (!dateTimeStr) {
    const unavail = lang === 'bn' ? 'তারিখ অনুপলব্ধ' : 'Date unavailable';
    return { dateStr: unavail, timeStr: '', fullStr: unavail };
  }
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) {
    const unavail = lang === 'bn' ? 'তারিখ অনুপলব্ধ' : 'Date unavailable';
    return { dateStr: unavail, timeStr: '', fullStr: unavail };
  }

  // 12-hour time format with AM/PM (e.g. 10:09 PM)
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const rawTimeStr = `${hours}:${minStr} ${ampm}`;

  // Readable date format: e.g. 29 Oct 2026
  const day = d.getDate();
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const monthStr = lang === 'bn' ? monthsBn[d.getMonth()] : monthsEn[d.getMonth()];
  const year = d.getFullYear();
  const rawDateStr = `${day} ${monthStr} ${year}`;

  const dateStr = lang === 'bn' ? formatNumber(rawDateStr, 'bn') : rawDateStr;
  const timeStr = lang === 'bn' ? formatNumber(rawTimeStr, 'bn') : rawTimeStr;

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr}, ${timeStr}`,
  };
}

export const TRANSLATIONS = {
  en: {
    appTitle: 'Muslim Sweets Management System',
    appShort: 'MSMS',
    welcomeMsg: 'Welcome to MSMS (Muslim Sweets Management System)',
    welcomeSubtitle: 'Intelligent sweet shop inventory, sales & cloud management',
    getStarted: 'Get Started',
    
    // Auth & Accounts
    adminRegistration: 'Master Admin Account Registration',
    adminRegistrationDesc: 'Create the primary master account to manage your confectionery shops',
    adminName: 'Admin Full Name',
    adminNamePlaceholder: 'e.g. Shop Owner / Manager',
    adminNameHint: 'Maximum 20 characters (spaces allowed)',
    password: 'Password',
    passwordHint: 'At least 1 uppercase letter, 1 number, and 1 symbol',
    confirmPassword: 'Confirm Password',
    securityQuestion: 'Custom Security Question',
    securityQuestionPlaceholder: 'e.g. What is the name of your first sweet shop?',
    securityQuestionHint: 'Used to securely reset your password if forgotten',
    securityAnswer: 'Security Answer',
    securityAnswerPlaceholder: 'Your secret answer',
    stockErasePassword: 'Stock Erase Password (Secondary Key)',
    stockErasePasswordPlaceholder: 'Separate password to erase stock',
    stockErasePasswordHint: 'A separate security password used when performing emergency stock wipe',
    createMasterAccount: 'Create Master Account',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Enter password to access shop console',
    loginBtn: 'Log In',
    forgotPassword: 'Forgot Password?',
    recoveryTitle: 'Account Recovery',
    recoverySubtitle: 'Answer your security question to set a new password',
    newPassword: 'New Password',
    resetPasswordBtn: 'Reset Password',
    backToLogin: 'Back to Login',
    masterAccount: 'Master Admin',
    guestAccount: 'Guest Viewer (Read-Only)',
    switchAccount: 'Switch User',
    readOnlyBadge: 'View Only (Guest Mode)',
    guestNotice: 'You are signed in as a Guest Viewer. Modifying stock or deleting items is disabled.',

    // Dashboard & Navigation
    dashboard: 'Dashboard',
    stockIndex: 'Sweets Stock',
    salesCounter: 'Today\'s Sales',
    billing: 'Bills & Expenses',
    analytics: 'Analytics',
    settings: 'Settings',
    androidWidget: 'Android Widget',
    selectShop: 'Select Shop Branch',
    addShop: 'Add Shop',
    newShopTitle: 'Register New Shop Branch',
    shopName: 'Shop Name',
    shopNameBn: 'Shop Name (Bengali)',
    shopAddress: 'Address / Location',
    saveShop: 'Save Shop',

    // Quick Stats
    totalStockKg: 'Total Stock (Kg)',
    totalStockPieces: 'Total Stock (Pieces)',
    todaySales: 'Today\'s Revenue',
    todayProfit: 'Today\'s Gross Margin',
    activeSweets: 'Active Sweets Types',
    remainingStock: 'Remaining Balance',
    lowStockWarning: 'Low Stock Items',

    // Stock Screen
    registerNewSweet: 'Register New Sweet',
    sweetName: 'Sweet Name (English)',
    sweetNameBn: 'Sweet Name (বাংলা)',
    unitType: 'Measurement Unit',
    unitKg: 'Kilograms (Kg)',
    unitPiece: 'Pieces (Pcs)',
    sellingPrice: 'Selling Price per Unit',
    costPrice: 'Cost Price per Unit',
    initialQuantity: 'Current / Opening Quantity',
    saveSweet: 'Add to Catalogue',
    quickAddStock: 'Quick Add Stock',
    enterAddQuantity: 'Quantity to Add',
    addStockBtn: 'Confirm & Add Stock',
    editSweetTitle: 'Edit Sweet Details',
    saveChanges: 'Save Changes',
    longPressHint: 'Tip: Long-press any sweet card to delete it',
    confirmDeleteTitle: 'Delete Sweet from Catalogue?',
    confirmDeleteDesc: 'Are you sure you want to delete this sweet product and its stock history?',
    cancel: 'Cancel',
    delete: 'Delete',

    // Sales Counter Screen
    quickSellTitle: 'Quick Sales Counter',
    selectSweetToSell: 'Tap a sweet below to record sale and auto-deduct stock',
    quantitySold: 'Quantity Sold',
    priceTotal: 'Total Payable',
    cashPayment: 'Cash',
    digitalPayment: 'bKash / Card / Nagad',
    confirmSale: 'Confirm Sale & Deduct Stock',
    remainingAfterSale: 'Remaining Stock After Sale',
    insufficientStock: 'Cannot sell more than available stock!',

    // Billing & Expenses
    invoicesTitle: 'Today\'s Cash & Expense Tracker',
    addExpense: 'Log Expense',
    expenseTitle: 'Expense Description',
    expenseTitlePlaceholder: 'e.g. Milk purchase, Sugar sack, Packaging boxes',
    expenseAmount: 'Amount',
    expenseType: 'Category',
    ingredientCost: 'Ingredients (Milk/Sugar/Ghee)',
    utilityCost: 'Utilities / Electricity',
    staffWage: 'Staff Daily Wages',
    otherExpense: 'Other Overheads',
    logExpenseBtn: 'Record Expense',
    netProfitTitle: 'Net Daily Cash Balance',
    paymentMethod: 'Payment Method',
    printReceipt: 'Print / Share Bill',

    // Analytics
    weeklyAverageTitle: 'Weekly Sales Analysis & Trends',
    weeklyAvgSales: 'Weekly Average Sales',
    top5PeaksTitle: 'Top 5 Peak Sales of the Month',
    peakBadge: 'Peak #',
    monthlySalesGraph: 'Daily Sales Performance',
    comparisonToAvg: 'vs Monthly Daily Avg',

    // Android Widget
    widgetPreviewTitle: 'Interactive 2026 Android Home Screen Widget',
    widgetPreviewSubtitle: 'Real-time quick glance widget for your Android phone home screen',
    toggleDailyMonthly: 'Toggle Mode',
    dailyView: 'Daily Live',
    monthlyView: 'Monthly View',
    widgetStockLabel: 'Live Stock Level',
    widgetSalesLabel: 'Today\'s Sales',
    widgetRevenueLabel: 'Monthly Sales',
    nativeWidgetCode: 'View Native Kotlin Widget Code',
    copyCode: 'Copy Kotlin Code',
    copied: 'Copied to Clipboard!',

    // Settings & Resets
    settingsTitle: 'Admin System & Store Settings',
    languageSection: 'Application Language',
    numeralSection: 'Accounting Numeral System',
    bengaliNumerals: 'Bengali Digits (১, ২, ৩...)',
    arabicNumerals: 'Western Digits (0, 1, 2...) for Accounting',
    countrySection: 'Store Country & Currency',
    userAccountsSection: 'Manage User Accounts',
    addGuestAccount: 'Add Guest Account (Up to 2)',
    guestName: 'Guest User Name',
    guestPassword: 'Guest Password',
    saveGuest: 'Add Guest',
    noGuestsYet: 'No guest accounts added yet. Up to 2 read-only guests allowed.',

    // Yearly Timeline & February Archive
    yearlyTimelineSection: 'Yearly Timeline & Auto-Archival',
    yearlyTimelineDesc: 'Automatically rolls over each calendar year into an archival vault every February (e.g. 2026 data archives in Feb 2027).',
    timelineToggleLabel: 'Yearly Timeline & Auto-Archive Enabled',
    currentYearLabel: 'Active Fiscal Year',
    archiveStatus: 'February Transition Status',
    archiveStatusActive: 'Active cycle (auto-rolls over in February)',
    archiveStatusDisabled: 'Disabled by Admin',

    // Google Drive & Backup
    backupSection: 'Data Backup & Google Drive',
    backupDesc: 'Export complete shop catalogue, stock records, and sales history in structured format formatted for Google Drive.',
    exportBackupBtn: 'Export Google Drive Backup (.txt / .json)',
    restoreBackupBtn: 'Restore from Backup File',
    restoreWarning: 'Restoring a backup will merge or replace local shop records.',

    // Dangerous Actions
    dangerZone: 'Security & Data Management',
    loadDemoData: 'Load Sample Bengali Sweets & Sales Data',
    loadDemoDesc: 'Quickly preview realistic figures (Kalajam, Rosogolla, Chamcham, Sandesh) with weekly sales.',
    eraseStockTitle: 'Erase Sweets Stock Inventory',
    eraseStockDesc: 'Reset all sweet quantities to zero. Requires the secondary Stock Erase Password and creates a safety backup.',
    eraseStockBtn: 'Erase Stock',
    enterStockErasePasswordTitle: 'Enter Stock Erase Key',
    factoryResetTitle: 'Clear Sales & Reset Shop Data',
    factoryResetDesc: 'Removes all test sales, bills, and stock records to start completely fresh with real store data. Protected by a 20-second Android system reset safety buffer.',
    startFactoryReset: 'Start 20s Safety Reset Buffer',
    resetBufferActive: 'System Safety Countdown Active',
    resetWarningMsg: 'To prevent accidental data loss, please wait 20 seconds. You can cancel at any moment.',
    typeResetToConfirm: 'Type "RESET" to enable final confirmation',
    cancelReset: 'Cancel & Abort Reset',
    confirmResetBtn: 'Confirm & Clear Data Permanently',

    // PWA Install
    installApp: 'Install MSMS App on Android',
    installAppDesc: 'Install to your mobile home screen for fast fullscreen offline access',
    installBtn: 'Install App',
    alreadyInstalled: 'Running in Standalone Mobile Mode',
  },
  bn: {
    appTitle: 'মুসলিম সুইটস ম্যানেজমেন্ট সিস্টেম',
    appShort: 'এমএসএমএস',
    welcomeMsg: 'স্বাগতম এমএসএমএস (মুসলিম সুইটস ম্যানেজমেন্ট সিস্টেম)',
    welcomeSubtitle: 'মিষ্টির দোকানের স্টক, দৈনিক বিক্রি ও ক্লাউড হিসাবের স্মার্ট সমাধান',
    getStarted: 'শুরু করুন',

    // Auth & Accounts
    adminRegistration: 'মাস্টার অ্যাডমিন একাউন্ট নিবন্ধন',
    adminRegistrationDesc: 'আপনার মিষ্টির দোকানগুলো পরিচালনার জন্য প্রধান মাস্টার একাউন্ট তৈরি করুন',
    adminName: 'অ্যাডমিনের পূর্ণ নাম',
    adminNamePlaceholder: 'যেমন: দোকান মালিক / ম্যানেজার',
    adminNameHint: 'সর্বোচ্চ ২০ অক্ষর (স্পেস দেওয়া যাবে)',
    password: 'পাসওয়ার্ড',
    passwordHint: 'অন্তত ১টি বড় হাতের অক্ষর, ১টি সংখ্যা এবং ১টি প্রতীক থাকতে হবে',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
    securityQuestion: 'কাস্টম সিকিউরিটি প্রশ্ন',
    securityQuestionPlaceholder: 'যেমন: আপনার প্রথম মিষ্টির দোকানের নাম কী?',
    securityQuestionHint: 'পাসওয়ার্ড ভুলে গেলে পুনরায় সেট করতে এই প্রশ্নের উত্তর প্রয়োজন হবে',
    securityAnswer: 'সিকিউরিটি উত্তর',
    securityAnswerPlaceholder: 'আপনার গোপন উত্তর',
    stockErasePassword: 'স্টক মোছার পাসওয়ার্ড (দ্বিতীয় চাবি)',
    stockErasePasswordPlaceholder: 'স্টক খালি করার আলাদা পাসওয়ার্ড',
    stockErasePasswordHint: 'জরুরি প্রয়োজনে স্টক খালি করার জন্য একটি পৃথক সুরক্ষা পাসওয়ার্ড',
    createMasterAccount: 'মাস্টার একাউন্ট তৈরি করুন',
    loginTitle: 'স্বাগতম',
    loginSubtitle: 'দোকান ড্যাশবোর্ডে প্রবেশ করতে পাসওয়ার্ড দিন',
    loginBtn: 'লগ ইন করুন',
    forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
    recoveryTitle: 'একাউন্ট পুনরুদ্ধার',
    recoverySubtitle: 'সিকিউরিটি প্রশ্নের উত্তর দিয়ে নতুন পাসওয়ার্ড সেট করুন',
    newPassword: 'নতুন পাসওয়ার্ড',
    resetPasswordBtn: 'পাসওয়ার্ড রিসেট করুন',
    backToLogin: 'লগইন পেজে ফিরুন',
    masterAccount: 'মাস্টার অ্যাডমিন',
    guestAccount: 'গেস্ট ভিউয়ার (শুধু দেখার জন্য)',
    switchAccount: 'ইউজার পরিবর্তন',
    readOnlyBadge: 'রিড-অনলি মোড (গেস্ট)',
    guestNotice: 'আপনি গেস্ট ভিউয়ার হিসেবে আছেন। স্টক পরিবর্তন বা মুছে ফেলা নিষ্ক্রিয়।',

    // Dashboard & Navigation
    dashboard: 'ড্যাশবোর্ড',
    stockIndex: 'মিষ্টির স্টক',
    salesCounter: 'আজকের বিক্রি',
    billing: 'বিল ও খরচ',
    analytics: 'বিশ্লেষণ',
    settings: 'সেটিংস',
    androidWidget: 'অ্যান্ড্রয়েড উইজেট',
    selectShop: 'দোকান ব্রাঞ্চ নির্বাচন করুন',
    addShop: 'দোকান যোগ করুন',
    newShopTitle: 'নতুন দোকান ব্রাঞ্চ নিবন্ধন',
    shopName: 'দোকানের নাম (ইংরেজি)',
    shopNameBn: 'দোকানের নাম (বাংলা)',
    shopAddress: 'ঠিকানা / অবস্থান',
    saveShop: 'দোকান সংরক্ষণ করুন',

    // Quick Stats
    totalStockKg: 'মোট স্টক (কেজি)',
    totalStockPieces: 'মোট স্টক (পিস)',
    todaySales: 'আজকের মোট বিক্রি',
    todayProfit: 'আজকের মোট লাভ',
    activeSweets: 'মিষ্টির পদ সংখ্যা',
    remainingStock: 'অবশিষ্ট স্টক',
    lowStockWarning: 'কম স্টকের মিষ্টি',

    // Stock Screen
    registerNewSweet: 'নতুন মিষ্টির পদ যোগ করুন',
    sweetName: 'মিষ্টির নাম (English)',
    sweetNameBn: 'মিষ্টির নাম (বাংলা)',
    unitType: 'পরিমাপের একক',
    unitKg: 'কিলোগ্রাম (কেজি)',
    unitPiece: 'পিস (টুকরো)',
    sellingPrice: 'বিক্রয় মূল্য (প্রতি একক)',
    costPrice: 'ক্রয়/উৎপাদন খরচ (প্রতি একক)',
    initialQuantity: 'বর্তমান / প্রাথমিক পরিমাণ',
    saveSweet: 'তালিকায় যোগ করুন',
    quickAddStock: 'দ্রুত স্টক যোগ করুন',
    enterAddQuantity: 'যোগ করার পরিমাণ',
    addStockBtn: 'স্টক নিশ্চিত ও যোগ করুন',
    editSweetTitle: 'মিষ্টির তথ্য সম্পাদনা',
    saveChanges: 'পরিবর্তন সংরক্ষণ করুন',
    longPressHint: 'টিপস: যেকোনো মিষ্টি মুছে ফেলতে চেপে ধরে রাখুন (Long-press)',
    confirmDeleteTitle: 'তালিকা থেকে মিষ্টি মুছে ফেলবেন?',
    confirmDeleteDesc: 'আপনি কি নিশ্চিতভাবে এই মিষ্টির পদ এবং এর পূর্ববর্তী স্টক হিস্ট্রি মুছে ফেলতে চান?',
    cancel: 'বাতিল',
    delete: 'মুছে ফেলুন',

    // Sales Counter Screen
    quickSellTitle: 'কাউন্টার দ্রুত বিক্রয়',
    selectSweetToSell: 'বিক্রি করতে এবং স্টক স্বয়ংক্রিয়ভাবে কমাতে নিচের মিষ্টিতে চাপ দিন',
    quantitySold: 'বিক্রির পরিমাণ',
    priceTotal: 'মোট প্রদেয় টাকা',
    cashPayment: 'নগদ ক্যাশ',
    digitalPayment: 'বিকাশ / নগদ / কার্ড',
    confirmSale: 'বিক্রি নিশ্চিত করুন ও স্টক কমান',
    remainingAfterSale: 'বিক্রির পর দোকানে অবশিষ্ট স্টক',
    insufficientStock: 'দোকানে পর্যাপ্ত মিষ্টি মজুত নেই!',

    // Billing & Expenses
    invoicesTitle: 'দৈনিক ক্যাশ ও খরচের খতিয়ান',
    addExpense: 'খরচ যোগ করুন',
    expenseTitle: 'খরচের বিবরণ',
    expenseTitlePlaceholder: 'যেমন: খাঁটি দুধ ক্রয়, চিনির বস্তা, প্যাকেট বক্স',
    expenseAmount: 'টাকার পরিমাণ',
    expenseType: 'খরচের ধরণ',
    ingredientCost: 'কাঁচামাল (দুধ/চিনি/ঘি/ছানা)',
    utilityCost: 'বিদ্যুৎ / গ্যাস / বিল',
    staffWage: 'কারিগর ও কর্মচারীদের মজুরি',
    otherExpense: 'অন্যান্য খুচরা খরচ',
    logExpenseBtn: 'খরচ লিপিবদ্ধ করুন',
    netProfitTitle: 'দৈনিক নিট ক্যাশ ব্যালেন্স',
    paymentMethod: 'পরিশোধ মাধ্যম',
    printReceipt: 'বিল প্রিন্ট / শেয়ার করুন',

    // Analytics
    weeklyAverageTitle: 'সাপ্তাহিক গড় বিক্রি ও ট্রেন্ড',
    weeklyAvgSales: 'সাপ্তাহিক গড় বিক্রি',
    top5PeaksTitle: 'মাসের শীর্ষ ৫টি সর্বোচ্চ বিক্রির দিন',
    peakBadge: 'শীর্ষ #',
    monthlySalesGraph: 'দৈনিক বিক্রির চার্ট',
    comparisonToAvg: 'মাসিক দৈনিক গড়ের সাথে তুলনা',

    // Android Widget
    widgetPreviewTitle: 'ইন্টারেক্টিভ ২০২৬ অ্যান্ড্রয়েড হোম স্ক্রিন উইজেট',
    widgetPreviewSubtitle: 'আপনার অ্যান্ড্রয়েড ফোনের হোম স্ক্রিনের জন্য লাইভ স্ট্যাটাস উইজেট',
    toggleDailyMonthly: 'মোড পরিবর্তন',
    dailyView: 'আজকের লাইভ',
    monthlyView: 'মাসিক সারসংক্ষেপ',
    widgetStockLabel: 'লাইভ মিষ্টি স্টক',
    widgetSalesLabel: 'আজকের মোট বিক্রি',
    widgetRevenueLabel: 'চলতি মাসের বিক্রি',
    nativeWidgetCode: 'নেটিভ কোটলিন উইজেট কোড দেখুন',
    copyCode: 'কোটলিন কোড কপি করুন',
    copied: 'ক্লিপবোর্ডে কপি হয়েছে!',

    // Settings & Resets
    settingsTitle: 'অ্যাডমিন সিস্টেম ও দোকান সেটিংস',
    languageSection: 'অ্যাপ্লিকেশনের ভাষা (Language)',
    numeralSection: 'হিসাবের সংখ্যা পদ্ধতি (Numerals)',
    bengaliNumerals: 'বাংলা সংখ্যা (১, ২, ৩...)',
    arabicNumerals: 'ইংরেজি সংখ্যা (0, 1, 2...) হিসাবের সুবিধার জন্য',
    countrySection: 'দোকানের দেশ ও মুদ্রা (Currency)',
    userAccountsSection: 'ব্যবহারকারী একাউন্ট ব্যবস্থাপনা',
    addGuestAccount: 'গেস্ট একাউন্ট যোগ করুন (সর্বোচ্চ ২টি)',
    guestName: 'গেস্ট ইউজারের নাম',
    guestPassword: 'গেস্ট পাসওয়ার্ড',
    saveGuest: 'গেস্ট যোগ করুন',
    noGuestsYet: 'এখনও কোনো গেস্ট একাউন্ট যোগ করা হয়নি। সর্বোচ্চ ২টি রিড-অনলি একাউন্ট সম্ভব।',

    // Yearly Timeline & February Archive
    yearlyTimelineSection: 'বাৎসরিক টাইমলাইন ও স্বয়ংক্রিয় আর্কাইভ',
    yearlyTimelineDesc: 'প্রতি ফেব্রুয়ারি মাসে পূর্ববর্তী বছরের হিসাব স্বয়ংক্রিয়ভাবে সংরক্ষিত আর্কাইভে স্থানান্তরিত করে (যেমন ২০২৬ সালের তথ্য ২০২৭ সালের ফেব্রুয়ারিতে সংরক্ষিত হয়)।',
    timelineToggleLabel: 'বাৎসরিক টাইমলাইন ও স্বয়ংক্রিয় সংরক্ষণ সক্রিয়',
    currentYearLabel: 'বর্তমান অর্থবছর',
    archiveStatus: 'ফেব্রুয়ারি সাইকেল স্ট্যাটাস',
    archiveStatusActive: 'সক্রিয় সাইকেল (ফেব্রুয়ারি মাসে সংরক্ষিত হবে)',
    archiveStatusDisabled: 'অ্যাডমিন কর্তৃক নিষ্ক্রিয়',

    // Google Drive & Backup
    backupSection: 'ডাটা ব্যাকআপ ও গুগল ড্রাইভ',
    backupDesc: 'গুগল ড্রাইভ ফরম্যাটে আপনার সমস্ত মিষ্টির তালিকা, স্টক ও বিক্রির সম্পূর্ণ ব্যাকআপ ফাইল নামিয়ে নিন।',
    exportBackupBtn: 'গুগল ড্রাইভ ব্যাকআপ ফাইল ডাউনলোড (.txt / .json)',
    restoreBackupBtn: 'ব্যাকআপ ফাইল থেকে পুনরুদ্ধার করুন',
    restoreWarning: 'ব্যাকআপ রিস্টোর করলে বর্তমান লোকাল ডাটা সমন্বিত হবে।',

    // Dangerous Actions
    dangerZone: 'সিকিউরিটি ও ডাটা ব্যবস্থাপনা',
    loadDemoData: 'বাঙালি মিষ্টি ও বিক্রির নমুনা ডাটা লোড করুন',
    loadDemoDesc: 'বাস্তবধর্মী কালাজাম, রসগোল্লা, চমচম, ছানার সন্দেশের তথ্য দিয়ে সহজে অ্যাপটি যাচাই করুন।',
    eraseStockTitle: 'মিষ্টির সমস্ত স্টক খালি করুন',
    eraseStockDesc: 'দোকানের সমস্ত মিষ্টির সংখ্যা শূন্য (০) করুন। এর জন্য দ্বিতীয় স্টক মোছার পাসওয়ার্ড লাগবে এবং স্বয়ংক্রিয় ব্যাকআপ তৈরি হবে।',
    eraseStockBtn: 'স্টক খালি করুন',
    enterStockErasePasswordTitle: 'স্টক মোছার পাসওয়ার্ড দিন',
    factoryResetTitle: 'বিক্রির তথ্য মুছে ফেলে আসল দোকানের হিসাব শুরু করুন',
    factoryResetDesc: 'সমস্ত পরীক্ষামূলক বিক্রি ও স্টক মুছে সম্পূর্ণ নতুন করে আসল দোকান শুরু করুন। এটি ২০ সেকেন্ডের অ্যান্ড্রয়েড সিস্টেম রিসেট বাফার দ্বারা সুরক্ষিত।',
    startFactoryReset: '২০ সেকেন্ডের সুরক্ষা রিসেট বাফার শুরু করুন',
    resetBufferActive: 'সিস্টেম সুরক্ষা কাউন্টডাউন চলছে',
    resetWarningMsg: 'ভুলবশত তথ্য মুছে যাওয়া রোধ করতে ২০ সেকেন্ড অপেক্ষা করুন। যেকোনো মুহূর্তে বাতিল করতে পারবেন।',
    typeResetToConfirm: 'নিশ্চিত করতে "RESET" টাইপ করুন',
    cancelReset: 'বাতিল করুন ও ফিরে যান',
    confirmResetBtn: 'স্থায়ীভাবে মুছে ফেলুন',

    // PWA Install
    installApp: 'অ্যান্ড্রয়েড ফোনে MSMS অ্যাপ ইনস্টল করুন',
    installAppDesc: 'ফুলস্ক্রিন অফলাইন ব্যবহারের জন্য মোবাইলের হোম স্ক্রিনে যুক্ত করুন',
    installBtn: 'ইনস্টল করুন',
    alreadyInstalled: 'স্ট্যান্ডঅ্যালন মোবাইল মোডে চলছে',
  },
};
