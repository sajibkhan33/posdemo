import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  AppData, 
  Table, 
  TableCartItem, 
  MenuItem, 
  MenuItemVariation,
  MenuItemAddon,
  MenuItemPromo,
  CommissionAgent,
  RawMasterItem, 
  PurchaseVoucher, 
  PurchaseItem,
  PurchasePaymentType,
  PurchaseOrder,
  PurchaseReturn,
  SaleRecord, 
  ExpenseRecord, 
  VendorPayment, 
  StockInventoryRecord, 
  ActiveTab,
  DiscountType,
  AccountHead,
  AccountType,
  AccountSystemRole,
  CustomerAdvance,
  AppUser,
  UserRole,
  PosSessionRecord,
  PosSession,
  BusinessDay,
  DayEndRecord,
  ConsolidatedDayReportData,
  ChefShiftRecord,
  WaiterShiftRecord,
  RestaurantProfile,
  PrinterConfig,
  PrintTemplate,
  PaymentMethodConfig,
  Employee,
  AttendanceRecord,
  LeaveApplication,
  WorkShift,
  EmploymentType,
  LeaveType,
  JournalEntry,
  PrintableReceipt
} from '../types';
import { Language, Translations, translations } from '../utils/i18n';
import { dispatchHardwarePrint } from '../utils/hardwarePrint';
import confetti from 'canvas-confetti';

export const formatRoleTitle = (role?: string): string => {
  if (!role) return 'Cashier';
  const r = role.toUpperCase();
  if (r === 'CASHIER') return 'Cashier';
  if (r === 'ADMIN') return 'Admin';
  if (r === 'MANAGER') return 'Manager';
  if (r === 'WAITER') return 'Waiter';
  if (r === 'CHEF') return 'Chef';
  return role;
};

export const getOrderTakerDisplay = (name?: string, role?: string): string => {
  const cleanName = (name || '').trim();
  const roleTitle = formatRoleTitle(role);
  if (!cleanName) return roleTitle || 'Staff';
  if (cleanName.toLowerCase().includes(roleTitle.toLowerCase())) {
    return cleanName;
  }
  return `${cleanName} (${roleTitle})`;
};

export const isSaleActive = (s: SaleRecord | undefined | null): boolean => {
  if (!s) return false;
  return !s.isVoid && s.status !== 'VOIDED' && s.status !== 'CANCELLED';
};

const STORAGE_KEY = 'barcode_cafe_banani_app_data_v2';
const TIMESTAMP_STORAGE_KEY = 'barcode_cafe_banani_last_update_v2';
const USER_STORAGE_KEY = 'barcode_cafe_current_user_v2';
const LANG_STORAGE_KEY = 'barcode_cafe_language_pref';
const ACTIVE_TAB_KEY = 'barcode_cafe_active_tab_v2';
const ACTIVE_SUBNAV_KEY = 'barcode_cafe_active_subnav_v2';
const ACTIVE_MODULE_KEY = 'barcode_cafe_active_module_v2';
const ACTIVE_TABLE_ID_KEY = 'barcode_cafe_active_table_id_v2';
const POS_VIEW_KEY = 'barcode_cafe_pos_view_v2';

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, ActiveTab[]> = {
  ADMIN: [
    'launcher',
    'dashboard',
    'pos',
    'menu-items',
    'sales',
    'expenses',
    'purchases',
    'payables',
    'receivables',
    'inv-items',
    'inventory',
    'hr',
    'journal',
    'reports',
    'users',
    'heads',
    'data-cleanup'
  ],
  MANAGER: [
    'launcher',
    'dashboard',
    'pos',
    'menu-items',
    'sales',
    'expenses',
    'purchases',
    'payables',
    'receivables',
    'inv-items',
    'inventory',
    'hr',
    'journal',
    'reports',
    'heads'
  ],
  CASHIER: [
    'launcher',
    'dashboard',
    'pos',
    'menu-items',
    'sales',
    'expenses',
    'purchases',
    'payables',
    'receivables',
    'inv-items',
    'inventory',
    'hr',
    'journal',
    'reports',
    'heads'
  ],
  WAITER: [
    'launcher',
    'pos',
    'menu-items'
  ],
  CHEF: [
    'launcher',
    'pos',
    'menu-items',
    'inv-items',
    'inventory'
  ]
};

export const DEFAULT_ORDER_EDIT_PERMISSIONS: Record<UserRole, boolean> = {
  ADMIN: true,
  MANAGER: true,
  CASHIER: true,
  WAITER: false,
  CHEF: false
};

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'USR-01',
    name: 'Executive Admin',
    username: 'admin',
    email: 'admin@barcodecafe.com',
    pinOrPassword: '1234',
    role: 'ADMIN',
    permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
    isActive: true,
    phone: '+880 1711-000001',
    canEditSubmittedOrders: true
  },
  {
    id: 'USR-02',
    name: 'Shift Manager',
    username: 'manager',
    email: 'manager@barcodecafe.com',
    pinOrPassword: '2222',
    role: 'MANAGER',
    permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
    isActive: true,
    phone: '+880 1811-000002',
    canEditSubmittedOrders: true
  },
  {
    id: 'USR-03',
    name: 'Main Cashier(shift1)',
    username: 'cashier',
    email: 'cashier1@barcodecafe.com',
    pinOrPassword: '3333',
    role: 'CASHIER',
    permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
    isActive: true,
    phone: '+880 1911-000003',
    canEditSubmittedOrders: true
  },
  {
    id: 'USR-03B',
    name: 'Main Cashier(shift2)',
    username: 'cashier2',
    email: 'cashier2@barcodecafe.com',
    pinOrPassword: '3334',
    role: 'CASHIER',
    permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
    isActive: true,
    phone: '+880 1911-000004',
    canEditSubmittedOrders: true
  },
  {
    id: 'USR-04',
    name: 'Floor Waiter (Rahim)',
    username: 'waiter',
    email: 'waiter@barcodecafe.com',
    pinOrPassword: '4444',
    role: 'WAITER',
    permissions: DEFAULT_ROLE_PERMISSIONS.WAITER,
    isActive: true,
    phone: '+880 1611-000004',
    canEditSubmittedOrders: false
  },
  {
    id: 'USR-05',
    name: 'Executive Chef (Kabir)',
    username: 'chef',
    email: 'chef@barcodecafe.com',
    pinOrPassword: '5555',
    role: 'CHEF',
    permissions: DEFAULT_ROLE_PERMISSIONS.CHEF,
    isActive: true,
    phone: '+880 1511-000005',
    canEditSubmittedOrders: false
  }
];

export const DEFAULT_CHART_OF_ACCOUNTS: AccountHead[] = [
  // ASSETS (1000)
  { id: '1010', code: '1010', name: 'Cash in Hand (POS Drawer)', type: 'ASSET', category: 'Current Assets', systemRole: 'CASH', balance: 0 },
  { id: '1020', code: '1020', name: 'Petty Cash Fund', type: 'ASSET', category: 'Current Assets', systemRole: 'PETTY_CASH', balance: 0 },
  { id: '1030', code: '1030', name: 'Bank - City Bank A/C', type: 'ASSET', category: 'Bank Accounts', systemRole: 'BANK', balance: 0 },
  { id: '1040', code: '1040', name: 'bKash / Nagad Merchant A/C', type: 'ASSET', category: 'Mobile Banking', systemRole: 'MOBILE_BANKING', balance: 0 },
  { id: '1050', code: '1050', name: 'Accounts Receivable (Customer Dues)', type: 'ASSET', category: 'Receivables', systemRole: 'ACCOUNTS_RECEIVABLE', balance: 0 },
  { id: '1060', code: '1060', name: 'Food & Beverage Inventory Asset', type: 'ASSET', category: 'Inventory Asset', systemRole: 'INVENTORY_ASSET', balance: 0 },
  
  // LIABILITIES (2000)
  { id: '2010', code: '2010', name: 'Accounts Payable (Vendor Dues)', type: 'LIABILITY', category: 'Current Liabilities', systemRole: 'ACCOUNTS_PAYABLE', balance: 0 },
  { id: '2020', code: '2020', name: 'Customer Advance Deposits', type: 'LIABILITY', category: 'Advance Liabilities', systemRole: 'CUSTOMER_ADVANCE', balance: 0 },
  { id: '2030', code: '2030', name: 'VAT & Tax Payable', type: 'LIABILITY', category: 'Statutory Liabilities', systemRole: 'TAX_PAYABLE', balance: 0 },

  // EQUITY & DRAWINGS (3000)
  { id: '3010', code: '3010', name: 'Owner Equity & Capital', type: 'EQUITY', category: 'Owner Equity', systemRole: 'OWNER_EQUITY', balance: 0 },
  { id: '3020', code: '3020', name: 'Retained Earnings', type: 'EQUITY', category: 'Owner Equity', systemRole: 'RETAINED_EARNINGS', balance: 0 },
  { id: '3030', code: '3030', name: 'Owner Drawings (Withdrawals)', type: 'EQUITY', category: 'Owner Drawings', systemRole: 'OWNER_DRAWINGS', balance: 0 },

  // REVENUE (4000)
  { id: '4010', code: '4010', name: 'Dine-in Restaurant Sales', type: 'REVENUE', category: 'Food Sales Revenue', systemRole: 'DINE_IN_REVENUE', balance: 0 },
  { id: '4020', code: '4020', name: 'Takeaway & Delivery Sales', type: 'REVENUE', category: 'Food Sales Revenue', systemRole: 'DELIVERY_REVENUE', balance: 0 },
  { id: '4030', code: '4030', name: 'Beverage & Bar Counter Sales', type: 'REVENUE', category: 'Beverage Revenue', systemRole: 'BEVERAGE_REVENUE', balance: 0 },

  // EXPENSES (5000 & 6000)
  { id: '5010', code: '5010', name: 'COGS - Raw Meat & Poultry', type: 'EXPENSE', category: 'Cost of Goods Sold (BOM)', systemRole: 'COGS', balance: 0 },
  { id: '5020', code: '5020', name: 'COGS - Grocery, Rice & Oil', type: 'EXPENSE', category: 'Cost of Goods Sold (BOM)', systemRole: 'COGS', balance: 0 },
  { id: '6010', code: '6010', name: 'Kitchen Staff Salaries', type: 'EXPENSE', category: 'Operating Expenses', systemRole: 'OPERATING_EXPENSE', balance: 0 },
  { id: '6020', code: '6020', name: 'Floor Rent & Utilities', type: 'EXPENSE', category: 'Operating Expenses', systemRole: 'OPERATING_EXPENSE', balance: 0 },
  { id: '6030', code: '6030', name: 'Electricity & Gas Bill', type: 'EXPENSE', category: 'Operating Expenses', systemRole: 'OPERATING_EXPENSE', balance: 0 },
  { id: '6040', code: '6040', name: 'Cleaning & Consumables', type: 'EXPENSE', category: 'Operating Expenses', systemRole: 'OPERATING_EXPENSE', balance: 0 }
];

export function getAccountSystemRole(acc: Partial<AccountHead> & { name?: string; code?: string; type?: AccountType; category?: string }): AccountSystemRole {
  if (acc.systemRole) return acc.systemRole;

  const normName = (acc.name || '').toLowerCase().trim();
  const normCat = (acc.category || '').toLowerCase().trim();
  const code = (acc.code || '').trim();

  // 1. Statutory / Tax Liabilities (VAT, TAX, SD)
  if (normName.includes('vat') || normName.includes('tax') || normCat.includes('statutory') || normCat.includes('tax') || normCat.includes('vat')) {
    return 'TAX_PAYABLE';
  }

  // 2. Customer Advance Deposits (Strictly Liability)
  if ((acc.type === 'LIABILITY' || !acc.type) && (normName.includes('customer advance') || normName.includes('advance deposit') || normName.includes('advance liability') || (normCat.includes('advance') && !normName.includes('staff') && !normCat.includes('staff')))) {
    return 'CUSTOMER_ADVANCE';
  }

  // 3. Accounts Payable (Trade / Vendor Dues)
  if (code === '2010' || normName.includes('accounts payable') || normName.includes('vendor due') || normName.includes('vendor payable') || normName.includes('trade payable') || normName.includes('supplier payable') || normName.includes('creditor')) {
    return 'ACCOUNTS_PAYABLE';
  }

  // 4. Inventory Asset
  if (code === '1060' || normCat.includes('inventory') || normName.includes('inventory asset') || normName.includes('raw material inventory') || normName.includes('stock asset')) {
    return 'INVENTORY_ASSET';
  }

  // 5. Cash & Bank & MFS Assets
  if (code === '1010' || normName.includes('cash in hand') || normName.includes('pos drawer') || normName.includes('cash drawer')) {
    return 'CASH';
  }
  if (code === '1020' || normName.includes('petty cash')) {
    return 'PETTY_CASH';
  }
  if (code === '1030' || normCat.includes('bank account') || (normName.includes('bank') && !normName.includes('bkash') && !normName.includes('nagad') && !normCat.includes('mobile'))) {
    return 'BANK';
  }
  if ((code === '1040' && (normCat.includes('mobile') || normName.includes('bkash') || normName.includes('nagad') || normName.includes('mfs'))) || normCat.includes('mobile banking') || normName.includes('bkash') || normName.includes('nagad') || normName.includes('mfs')) {
    return 'MOBILE_BANKING';
  }
  if (code === '1050' || normCat.includes('receivable') || normName.includes('receivable') || normName.includes('customer due')) {
    return 'ACCOUNTS_RECEIVABLE';
  }

  // 6. Equity & Drawings
  if (code === '3030' || normName.includes('drawing') || normName.includes('withdrawal') || normCat.includes('drawing')) {
    return 'OWNER_DRAWINGS';
  }
  if (code === '3010' || normName.includes('owner equity') || normName.includes('owner capital') || normName.includes('capital')) {
    return 'OWNER_EQUITY';
  }
  if (code === '3020' || normName.includes('retained earnings')) {
    return 'RETAINED_EARNINGS';
  }

  // 7. Revenue
  if (acc.type === 'REVENUE') {
    if (code === '4010' || normName.includes('dine-in') || normName.includes('restaurant sales')) {
      return 'DINE_IN_REVENUE';
    }
    if (code === '4020' || normName.includes('takeaway') || normName.includes('delivery')) {
      return 'DELIVERY_REVENUE';
    }
    if (code === '4030' || normName.includes('beverage') || normName.includes('bar counter') || normName.includes('coffee')) {
      return 'BEVERAGE_REVENUE';
    }
    return 'OPERATING_REVENUE';
  }

  // 8. Expenses
  if (acc.type === 'EXPENSE') {
    const isCogs = (code && code.startsWith('50')) ||
      normCat.includes('cost of goods') ||
      normCat.includes('bom') ||
      normName.includes('cogs') ||
      normName.includes('manual') ||
      normName.includes('wastage') ||
      normName.includes('spoilage');
    if (isCogs) {
      return 'COGS';
    }
    return 'OPERATING_EXPENSE';
  }

  // Fallbacks by code if user used default numbering
  if (code === '2020') return 'CUSTOMER_ADVANCE';
  if (code === '2030') return 'TAX_PAYABLE';

  return 'STANDARD';
}

export function ensureAccountSystemRoles(accounts: AccountHead[]): AccountHead[] {
  return (accounts || []).map(a => ({
    ...a,
    systemRole: a.systemRole || getAccountSystemRole(a)
  }));
}

export function isSameCustomer(name1?: string, name2?: string): boolean {
  if (!name1 || !name2) return false;
  const n1 = name1.trim().toLowerCase();
  const n2 = name2.trim().toLowerCase();
  if (!n1 || !n2) return false;
  if (n1.includes('walk-in') || n2.includes('walk-in')) {
    return n1 === n2;
  }
  if (n1 === n2) return true;

  const clean = (s: string) => s
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const c1 = clean(n1);
  const c2 = clean(n2);
  if (c1 && c2 && c1 === c2) return true;
  if (c1.length >= 3 && c2.length >= 3 && (c1.includes(c2) || c2.includes(c1))) return true;

  return false;
}

const DEFAULT_CUSTOMER_ADVANCES: CustomerAdvance[] = [
  {
    id: 180001,
    date: new Date().toISOString().split('T')[0],
    customer: "Tanvir Ahmed (VIP)",
    amount: 3500,
    method: "BKASH",
    note: "Rooftop VIP Lounge Party Booking Advance",
    status: "ACTIVE"
  }
];

const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 190001,
    poNo: "PO-2026-001",
    date: new Date().toISOString().split('T')[0],
    vendor: "Kader Meat Supply",
    expectedDate: new Date().toISOString().split('T')[0],
    total: 4800,
    status: "FULFILLED",
    grnNo: "INV-9901",
    items: [
      { itemId: 1, item: "Chicken Boneless", category: "Chicken", uom: "Kg", qty: 15, rate: 320, total: 4800 }
    ]
  },
  {
    id: 190002,
    poNo: "PO-2026-002",
    date: new Date().toISOString().split('T')[0],
    vendor: "City Store",
    expectedDate: new Date().toISOString().split('T')[0],
    total: 3500,
    status: "PARTIALLY_RECEIVED",
    grnNo: "INV-9902",
    items: [
      { itemId: 4, item: "Soybean Oil", category: "Grocery", uom: "Ltr", qty: 10, rate: 190, total: 1900 },
      { itemId: 3, item: "Basmati Rice (Premium)", category: "Grocery", uom: "Kg", qty: 10, rate: 140, total: 1400 },
      { itemId: 6, item: "Mineral Water (500ml Bottled)", category: "Cold & Beverage", uom: "Pcs", qty: 13, rate: 15, total: 200 }
    ]
  },
  {
    id: 190003,
    poNo: "PO-2026-003",
    date: new Date().toISOString().split('T')[0],
    vendor: "Sajjad",
    expectedDate: new Date().toISOString().split('T')[0],
    total: 1350,
    status: "FULFILLED",
    grnNo: "INV-9903",
    items: [
      { itemId: 5, item: "Special BBQ Sauce", category: "Grocery", uom: "Kg", qty: 3, rate: 450, total: 1350 }
    ]
  },
  {
    id: 190004,
    poNo: "PO-2026-004",
    date: new Date().toISOString().split('T')[0],
    vendor: "Agro Foods",
    expectedDate: new Date().toISOString().split('T')[0],
    total: 5200,
    status: "PENDING",
    items: [
      { itemId: 2, item: "Beef Bone-in", category: "Beef", uom: "Kg", qty: 6, rate: 750, total: 4500 },
      { itemId: 4, item: "Soybean Oil", category: "Grocery", uom: "Ltr", qty: 3, rate: 190, total: 700 }
    ]
  }
];

const DEFAULT_PURCHASE_RETURNS: PurchaseReturn[] = [
  {
    id: 200001,
    returnNo: "RET-2608-01",
    date: new Date().toISOString().split('T')[0],
    vendor: "City Store",
    billNo: "INV-9902",
    itemId: 6,
    item: "Mineral Water (500ml Bottled)",
    qty: 3,
    uom: "Pcs",
    rate: 15,
    total: 45,
    reason: "Damaged packaging / seal broken upon delivery",
    refundStatus: "ADJUSTED"
  },
  {
    id: 200002,
    returnNo: "RET-2608-02",
    date: new Date().toISOString().split('T')[0],
    vendor: "Kader Meat Supply",
    billNo: "INV-9901",
    itemId: 1,
    item: "Chicken Boneless",
    qty: 1.5,
    uom: "Kg",
    rate: 320,
    total: 480,
    reason: "Excess fat ratio / trimmed weight adjustment",
    refundStatus: "REFUNDED"
  }
];

const DEFAULT_TABLE_ZONES = ["Floor 1", "Floor 2", "VIP Lounge", "Rooftop Garden"];

const DEFAULT_POS_SESSIONS: PosSessionRecord[] = [];

export const DEFAULT_COMMISSION_AGENTS: CommissionAgent[] = [
  {
    id: "foodpanda",
    name: "Foodpanda",
    commissionPercent: 20,
    priceListMultiplier: 1.15,
    phone: "+880 1700-FOODPA",
    contactPerson: "Foodpanda Merchant Desk",
    isActive: true,
    notes: "20% commission channel for delivery portal"
  },
  {
    id: "pathao",
    name: "Pathao Food",
    commissionPercent: 15,
    priceListMultiplier: 1.12,
    phone: "+880 1800-PATHAO",
    contactPerson: "Pathao Merchant Support",
    isActive: true,
    notes: "15% delivery commission agent"
  },
  {
    id: "foodi",
    name: "Foodi",
    commissionPercent: 12,
    priceListMultiplier: 1.10,
    phone: "+880 1900-FOODII",
    contactPerson: "Foodi Delivery Partner",
    isActive: true,
    notes: "12% partner commission"
  }
];

export const DEFAULT_PRINTERS: PrinterConfig[] = [
  {
    id: "PRN-01",
    name: "Main Kitchen Thermal Printer (KOT)",
    type: "KOT",
    connectionType: "LAN",
    ipAddress: "192.168.1.201",
    port: 9100,
    paperWidth: "80mm",
    departments: ["Main Kitchen", "Rooftop Grill & BBQ"],
    categories: ["Steak & BBQ", "Rice & Biryani", "Appetizers & Soup"],
    isDefault: true,
    isActive: true,
    notes: "Kitchen master line thermal printer"
  },
  {
    id: "PRN-02",
    name: "Beverage & Cafe Bar Printer (KOT)",
    type: "KOT",
    connectionType: "USB",
    usbPort: "USB002",
    baudRate: 9600,
    paperWidth: "80mm",
    departments: ["Beverage & Cafe Counter"],
    categories: ["Cold Beverages & Coffee"],
    isDefault: false,
    isActive: true,
    notes: "Bar counter drink order ticket printer"
  },
  {
    id: "PRN-03",
    name: "Front Cashier Bill Printer (Guest Receipt)",
    type: "BILL",
    connectionType: "USB",
    usbPort: "USB001",
    baudRate: 115200,
    paperWidth: "80mm",
    departments: [],
    categories: [],
    isDefault: true,
    isActive: true,
    printOnBill: true,
    printOnSettle: true,
    notes: "Front desk billing printer with automatic paper cutter"
  },
  {
    id: "PRN-04",
    name: "Manager Office & Report Printer",
    type: "REPORT",
    connectionType: "LAN",
    ipAddress: "192.168.1.205",
    port: 9100,
    paperWidth: "80mm",
    departments: [],
    categories: [],
    isDefault: true,
    isActive: true,
    notes: "Shift Z-Report & financial statement printer"
  }
];

export const DEFAULT_PRINT_TEMPLATES: PrintTemplate[] = [
  {
    id: "TPL-KOT-01",
    name: "Standard Kitchen KOT (80mm)",
    templateType: "KOT",
    paperWidth: "80mm",
    departments: ["Main Kitchen", "Rooftop Grill & BBQ"],
    categories: [],
    headerTitle: "*** KITCHEN ORDER TICKET ***",
    showLogo: true,
    showTagline: false,
    showAddress: false,
    showPhone: false,
    showBinVat: false,
    showTableZone: true,
    showWaiter: true,
    showCustomer: true,
    showDateTime: true,
    showPricesOnKot: true,
    showNotes: true,
    fontSize: "base",
    footerMessage: "⚡ Fast Kitchen Dispatch Required",
    footerNotes: "Generated via Kitchen Display & POS System",
    showVatBreakdown: false,
    showPaymentBreakdown: false,
    showOrderCount: true,
    isDefault: true,
    isActive: true
  },
  {
    id: "TPL-KOT-02",
    name: "Beverage & Cafe Bar KOT (58mm)",
    templateType: "KOT",
    paperWidth: "80mm",
    departments: ["Beverage & Cafe Counter"],
    categories: ["Cold Beverages & Coffee"],
    headerTitle: "*** BAR / DRINK TICKET ***",
    showLogo: false,
    showTagline: false,
    showAddress: false,
    showPhone: false,
    showBinVat: false,
    showTableZone: true,
    showWaiter: true,
    showCustomer: true,
    showDateTime: true,
    showPricesOnKot: true,
    showNotes: true,
    fontSize: "sm",
    footerMessage: "🍹 Prepare Fresh Drinks",
    footerNotes: "Bar Order Slip",
    showVatBreakdown: false,
    showPaymentBreakdown: false,
    showOrderCount: true,
    isDefault: false,
    isActive: true
  },
  {
    id: "TPL-BILL-01",
    name: "Standard Customer Bill & Cash Memo (80mm)",
    templateType: "BILL",
    paperWidth: "80mm",
    departments: [],
    categories: [],
    headerTitle: "INVOICE / CASH MEMO",
    showLogo: true,
    showTagline: true,
    showAddress: true,
    showPhone: true,
    showBinVat: true,
    showTableZone: true,
    showWaiter: true,
    showCustomer: true,
    showDateTime: true,
    showPricesOnKot: true,
    showNotes: true,
    fontSize: "base",
    footerMessage: "Thank you for dining with us!",
    footerNotes: "VAT & SD Included",
    showVatBreakdown: true,
    showPaymentBreakdown: true,
    showOrderCount: true,
    isDefault: true,
    isActive: true
  },
  {
    id: "TPL-BILL-02",
    name: "Compact Delivery & Takeaway Slip (58mm)",
    templateType: "BILL",
    paperWidth: "58mm",
    departments: [],
    categories: [],
    headerTitle: "TAKEOUT / DELIVERY MEMO",
    showLogo: false,
    showTagline: false,
    showAddress: true,
    showPhone: true,
    showBinVat: true,
    showTableZone: true,
    showWaiter: false,
    showCustomer: true,
    showDateTime: true,
    showPricesOnKot: true,
    showNotes: true,
    fontSize: "sm",
    footerMessage: "Enjoy Your Meal! Order again soon.",
    footerNotes: "VAT Included",
    showVatBreakdown: false,
    showPaymentBreakdown: true,
    showOrderCount: false,
    isDefault: false,
    isActive: true
  }
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: "cash",
    name: "Cash in Hand",
    type: "CASH",
    providerName: "Drawer Cash",
    isDefault: true,
    isActive: true,
    notes: "Default cash drawer currency payments",
    ledgerAccountId: "1010"
  },
  {
    id: "card_pos",
    name: "Card (POS Terminal)",
    type: "CARD",
    providerName: "Visa / Mastercard / Amex",
    chargePercent: 0,
    isDefault: false,
    isActive: true,
    notes: "Debit & credit cards swipe/tap terminal",
    ledgerAccountId: "1030"
  },
  {
    id: "bkash_merchant",
    name: "bKash Merchant",
    type: "MFS",
    providerName: "bKash",
    accountNumber: "01846100900",
    chargePercent: 0,
    isDefault: false,
    isActive: true,
    notes: "Merchant QR Code & direct digital payment",
    ledgerAccountId: "1040"
  },
  {
    id: "nagad_merchant",
    name: "Nagad Merchant",
    type: "MFS",
    providerName: "Nagad",
    accountNumber: "01846100900",
    chargePercent: 0,
    isDefault: false,
    isActive: true,
    notes: "Nagad digital wallet / QR payment",
    ledgerAccountId: "1040"
  },
  {
    id: "due_credit",
    name: "Customer Credit / Due",
    type: "CREDIT",
    providerName: "Accounts Receivable",
    isDefault: false,
    isActive: true,
    notes: "Credit dining billed to registered customer ledger",
    ledgerAccountId: "1050"
  },
  {
    id: "bank_transfer",
    name: "Bank Wire Transfer",
    type: "BANK",
    providerName: "City Bank / DBBL",
    accountNumber: "150-120-987654",
    chargePercent: 0,
    isDefault: false,
    isActive: true,
    notes: "Direct BEFTN / NPSB / RTGS account transfer",
    ledgerAccountId: "1030"
  }
];

export const DEFAULT_RESTAURANT_PROFILE: RestaurantProfile = {
  name: "BD HOSTT POS",
  tagline: "Restaurant POS & Recipe BOM ERP",
  logoUrl: "",
  logoType: "preset",
  presetIcon: "flame",
  address: "Chattogram, Bangladesh",
  phone: "+880 1756-007600",
  email: "bdhosttpos@gmail.com",
  binOrVat: "0029381-01",
  currencySymbol: "৳",
  outletSecurityKey: "BDHOSTT-2026",
  vatPercent: 5,
  vatMode: "inclusive",
  enableVat: true
};

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "EMP-01",
    empCode: "EMP-01",
    name: "Sajjad Hossain",
    designation: "Restaurant General Manager",
    department: "Management",
    employmentTypeId: "emp-ft",
    shiftId: "shift-1",
    cardId: "CRD-1001",
    fingerId: "1",
    basicSalary: 35000,
    phone: "+880 1711-223344",
    email: "sajjad.mgr@bdhosttpos.com",
    address: "Chattogram",
    joiningDate: "2025-01-10",
    status: "ACTIVE"
  },
  {
    id: "EMP-02",
    empCode: "EMP-02",
    name: "Rahim Ullah",
    designation: "Executive Head Chef",
    department: "Main Kitchen",
    employmentTypeId: "emp-ft",
    shiftId: "shift-1",
    cardId: "CRD-1002",
    fingerId: "2",
    basicSalary: 28000,
    phone: "+880 1811-334455",
    email: "rahim.chef@bdhosttpos.com",
    address: "Chattogram",
    joiningDate: "2025-02-15",
    status: "ACTIVE"
  },
  {
    id: "EMP-03",
    empCode: "EMP-03",
    name: "Karim Mollah",
    designation: "Floor Head Waiter & Steward",
    department: "Floor Service",
    employmentTypeId: "emp-ft",
    shiftId: "shift-2",
    cardId: "CRD-1003",
    fingerId: "3",
    basicSalary: 18000,
    phone: "+880 1911-445566",
    address: "Chattogram",
    joiningDate: "2025-03-01",
    status: "ACTIVE"
  },
  {
    id: "EMP-04",
    empCode: "EMP-04",
    name: "Tanvir Ahmed",
    designation: "Barista & Beverage Specialist",
    department: "Beverage Counter",
    employmentTypeId: "emp-ft",
    shiftId: "shift-2",
    cardId: "CRD-1004",
    fingerId: "4",
    basicSalary: 20000,
    phone: "+880 1611-556677",
    address: "Chattogram",
    joiningDate: "2025-04-12",
    status: "ACTIVE"
  },
  {
    id: "EMP-05",
    empCode: "EMP-05",
    name: "Solaiman Ali",
    designation: "Lead Cashier & Billing Operator",
    department: "Billing Counter",
    employmentTypeId: "emp-ft",
    shiftId: "shift-1",
    cardId: "CRD-1005",
    fingerId: "5",
    basicSalary: 22000,
    phone: "+880 1511-667788",
    address: "Badda, Dhaka",
    joiningDate: "2025-05-01",
    status: "ACTIVE"
  }
];

export const DEFAULT_WORK_SHIFTS: WorkShift[] = [
  { id: "shift-1", name: "Morning Shift", startTime: "09:00", endTime: "17:00", graceMinutes: 15, isDefault: true },
  { id: "shift-2", name: "Evening / Dinner Shift", startTime: "16:00", endTime: "00:00", graceMinutes: 15, isDefault: false },
  { id: "shift-3", name: "Night / Closing Shift", startTime: "22:00", endTime: "06:00", graceMinutes: 15, isDefault: false },
  { id: "shift-4", name: "Split Service Shift", startTime: "11:00", endTime: "22:00", graceMinutes: 20, isDefault: false }
];

export const DEFAULT_EMPLOYMENT_TYPES: EmploymentType[] = [
  { id: "emp-ft", name: "Full-Time Permanent", code: "FT", description: "Regular 48 hours / week permanent staff" },
  { id: "emp-pt", name: "Part-Time", code: "PT", description: "Flexible hourly schedule" },
  { id: "emp-prob", name: "Probationary / Trainee", code: "PROB", description: "3-month probation period before confirmation" },
  { id: "emp-cont", name: "Contractual", code: "CONT", description: "Fixed term 1-year service agreement" }
];

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { id: "lt-cl", name: "Casual Leave (CL)", code: "CL", daysAllowedPerYear: 10, isPaid: true },
  { id: "lt-sl", name: "Sick Leave (SL)", code: "SL", daysAllowedPerYear: 14, isPaid: true },
  { id: "lt-el", name: "Earned / Annual Leave (EL)", code: "EL", daysAllowedPerYear: 15, isPaid: true },
  { id: "lt-fl", name: "Festival Holiday (FL)", code: "FL", daysAllowedPerYear: 5, isPaid: true }
];

export const DEFAULT_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: "att-01",
    employeeId: "EMP-01",
    employeeName: "Sajjad Hossain",
    date: new Date().toISOString().split('T')[0],
    shift: "Morning Shift",
    inTime: "08:55",
    outTime: "17:05",
    status: "PRESENT",
    workingHours: 8,
    overtimeHours: 0,
    notes: "On-time opening shift"
  },
  {
    id: "att-02",
    employeeId: "EMP-02",
    employeeName: "Rahim Ullah",
    date: new Date().toISOString().split('T')[0],
    shift: "Morning Shift",
    inTime: "09:05",
    outTime: "17:30",
    status: "PRESENT",
    workingHours: 8.5,
    overtimeHours: 0.5,
    notes: "Kitchen prep & banquet setup"
  },
  {
    id: "att-03",
    employeeId: "EMP-03",
    employeeName: "Karim Mollah",
    date: new Date().toISOString().split('T')[0],
    shift: "Evening / Dinner Shift",
    inTime: "16:15",
    status: "LATE",
    workingHours: 8,
    overtimeHours: 0,
    notes: "Traffic delay on Gulshan link road"
  }
];

export const DEFAULT_LEAVE_APPLICATIONS: LeaveApplication[] = [
  {
    id: "leave-01",
    employeeId: "EMP-03",
    employeeName: "Karim Mollah",
    leaveTypeId: "lt-cl",
    leaveTypeName: "Casual Leave (CL)",
    fromDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    toDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    totalDays: 2,
    reason: "Urgent family social ceremony in village",
    status: "PENDING",
    appliedDate: new Date().toISOString().split('T')[0]
  }
];

export const DEFAULT_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "jv-01",
    voucherNo: "JV-2026-001",
    date: new Date().toISOString().split('T')[0],
    debitAccountId: "5010",
    debitAccountName: "5010 - COGS - Raw Meat & Poultry",
    creditAccountId: "1010",
    creditAccountName: "1010 - Cash in Hand (POS Drawer)",
    amount: 3200,
    narration: "Daily raw meat purchase payment adjustment from morning cash drawer",
    referenceNo: "INV-9901"
  },
  {
    id: "jv-02",
    voucherNo: "JV-2026-002",
    date: new Date().toISOString().split('T')[0],
    debitAccountId: "6030",
    debitAccountName: "6030 - Electricity & Gas Bill",
    creditAccountId: "1030",
    creditAccountName: "1030 - Bank - City Bank A/C",
    amount: 5400,
    narration: "Monthly DESCO electricity bill payment via online banking portal",
    referenceNo: "DESCO-88219"
  }
];

export const DEFAULT_SERIAL_CONFIG: SerialNumberConfig = {
  posInvoicePrefix: 'POS-',
  posInvoiceNextNumber: 1,
  posInvoicePadding: 4,
  posInvoiceIncludeDate: false,
  posInvoiceResetCycle: 'NEVER',

  kotPrefix: 'KOT-',
  kotNextNumber: 1,
  kotPadding: 4,
  kotIncludeDate: false,
  kotResetCycle: 'NEVER',

  orderRefPrefix: 'ORD-',
  orderRefNextNumber: 1,
  orderRefPadding: 4,
  orderRefResetCycle: 'NEVER',

  lastResetDate: new Date().toISOString().split('T')[0],
  lastResetYear: new Date().getFullYear()
};

export function checkAndResetSerialConfig(config: SerialNumberConfig, currentDayDateStr: string): { updated: SerialNumberConfig; changed: boolean } {
  const currentYear = new Date(currentDayDateStr || Date.now()).getFullYear();
  let updated = { ...config };
  let changed = false;

  if (config.lastResetDate && config.lastResetDate !== currentDayDateStr) {
    if (config.posInvoiceResetCycle === 'DAILY') {
      updated.posInvoiceNextNumber = 1;
      changed = true;
    }
    if (config.kotResetCycle === 'DAILY') {
      updated.kotNextNumber = 1;
      changed = true;
    }
    if (config.orderRefResetCycle === 'DAILY') {
      updated.orderRefNextNumber = 1;
      changed = true;
    }
    updated.lastResetDate = currentDayDateStr;
    changed = true;
  }

  if (config.lastResetYear && config.lastResetYear !== currentYear) {
    if (config.posInvoiceResetCycle === 'YEARLY') {
      updated.posInvoiceNextNumber = 1;
      changed = true;
    }
    if (config.kotResetCycle === 'YEARLY') {
      updated.kotNextNumber = 1;
      changed = true;
    }
    updated.lastResetYear = currentYear;
    changed = true;
  }

  return { updated, changed };
}

const DEFAULT_DATA: AppData = {
  serialConfig: DEFAULT_SERIAL_CONFIG,
  session: { 
    isActive: false, 
    openingCash: 0, 
    startTime: "" 
  },
  businessDay: {
    date: new Date().toISOString().split('T')[0],
    isOpen: false,
    dayNumber: 1
  },
  restaurantProfile: DEFAULT_RESTAURANT_PROFILE,
  commissionAgents: DEFAULT_COMMISSION_AGENTS,
  printers: DEFAULT_PRINTERS,
  printTemplates: DEFAULT_PRINT_TEMPLATES,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  posSessions: DEFAULT_POS_SESSIONS,
  chefShifts: [],
  activeChefShift: null,
  waiterShifts: [],
  activeWaiterShift: null,
  tableZones: DEFAULT_TABLE_ZONES,
  tableDimensions: { width: 147, height: 98 },
  purchaseOrders: DEFAULT_PURCHASE_ORDERS,
  purchaseReturns: DEFAULT_PURCHASE_RETURNS,
  employees: DEFAULT_EMPLOYEES,
  attendanceRecords: DEFAULT_ATTENDANCE_RECORDS,
  leaveApplications: DEFAULT_LEAVE_APPLICATIONS,
  workShifts: DEFAULT_WORK_SHIFTS,
  employmentTypes: DEFAULT_EMPLOYMENT_TYPES,
  leaveTypes: DEFAULT_LEAVE_TYPES,
  journalEntries: DEFAULT_JOURNAL_ENTRIES,
  tables: [
    { id: "T-01", name: "Table 01", zone: "Floor 1", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "T-02", name: "Table 02", zone: "Floor 1", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "T-03", name: "Table 03", zone: "Floor 1", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "T-04", name: "Table 04", zone: "Floor 2", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "T-05", name: "Table 05", zone: "Floor 2", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "T-06", name: "Table 06", zone: "Floor 2", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "T-07", name: "Table 07", zone: "Floor 2", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "VIP-01", name: "VIP Lounge 1", zone: "VIP Lounge", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "VIP-02", name: "VIP Lounge 2", zone: "VIP Lounge", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] },
    { id: "RT-01", name: "Rooftop 01", zone: "Rooftop Garden", status: "free", waiter: "", customer: "Walk-in Customer", channelOrAgentId: "dine_in", discountType: "taka", discountVal: 0, cart: [] }
  ],
  waiters: ["Rahim", "Karim", "Sajjad", "Solim", "Tanvir"],
  departments: ["Main Kitchen", "Rooftop Grill & BBQ", "Beverage & Cafe Counter"],
  menuCategories: ["Appetizers & Soup", "Steak & BBQ", "Rice & Biryani", "Cold Beverages & Coffee"],
  expenseHeads: ["Casual Waiter Charge", "Cleaning Bill", "Conveyance", "Electricity Bill", "Staff Salary"],
  purchaseCategories: ["Grocery", "Chicken", "Beef", "Fish", "Cold & Beverage", "Dairy & Eggs", "Spices"],
  vendors: ["Kader Meat Supply", "City Store", "Agro Foods", "Sajjad", "Karim"],
  customers: ["Walk-in Customer", "Foodpanda Delivery", "Pathao Food", "Foodi Delivery", "Standard Bank Corporate", "Tanvir Ahmed (VIP)"],
  chartOfAccounts: DEFAULT_CHART_OF_ACCOUNTS,
  customerAdvances: DEFAULT_CUSTOMER_ADVANCES,
  users: DEFAULT_USERS,
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  
  masterItems: [
    { id: 1, name: "Chicken Boneless", category: "Chicken", vendor: "Kader Meat Supply", uom: "Kg", defaultRate: 320 },
    { id: 2, name: "Beef Bone-in", category: "Beef", vendor: "Kader Meat Supply", uom: "Kg", defaultRate: 750 },
    { id: 3, name: "Basmati Rice (Premium)", category: "Grocery", vendor: "City Store", uom: "Kg", defaultRate: 140 },
    { id: 4, name: "Soybean Oil", category: "Grocery", vendor: "City Store", uom: "Ltr", defaultRate: 190 },
    { id: 5, name: "Special BBQ Sauce", category: "Grocery", vendor: "Sajjad", uom: "Kg", defaultRate: 450 },
    { id: 6, name: "Mineral Water (500ml Bottled)", category: "Cold & Beverage", vendor: "City Store", uom: "Pcs", defaultRate: 15 }
  ],

  menuItems: [
    { 
      id: 101, 
      name: "BBQ Chicken Steak", 
      department: "Rooftop Grill & BBQ", 
      category: "Steak & BBQ", 
      price: 580, 
      cost: 175,
      channelPrices: {
        foodpanda: 670,
        pathao: 640,
        foodi: 620
      },
      variations: [
        { id: "v-1", name: "Single Cut (1:1)", type: "portion", price: 420, cost: 130, recipeMultiplier: 0.75 },
        { id: "v-2", name: "Regular Cut", type: "portion", price: 580, cost: 175, recipeMultiplier: 1.0 },
        { id: "v-3", name: "Platter / Family (1:2)", type: "portion", price: 890, cost: 270, recipeMultiplier: 1.6 }
      ],
      addons: [
        { id: "a-1", name: "Extra Melted Cheese", price: 60, rawItemId: 1, rawQty: 0.05 },
        { id: "a-2", name: "French Fries Side", price: 80 },
        { id: "a-3", name: "Special BBQ Dip", price: 40, rawItemId: 5, rawQty: 0.05 }
      ],
      promo: {
        id: "p-1",
        code: "CHICKEN50",
        title: "৳50 Direct Discount Special",
        discountType: "taka",
        discountVal: 50,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        isActive: true
      },
      recipe: [
        { rawItemId: 1, qty: 0.35 },
        { rawItemId: 4, qty: 0.05 },
        { rawItemId: 5, qty: 0.10 }
      ]
    },
    { 
      id: 102, 
      name: "Water 500ml", 
      department: "Beverage & Cafe Counter", 
      category: "Cold Beverages & Coffee", 
      price: 30, 
      cost: 15,
      channelPrices: {
        foodpanda: 35,
        pathao: 35,
        foodi: 30
      },
      recipe: [
        { rawItemId: 6, qty: 1 }
      ]
    },
    { 
      id: 103, 
      name: "Beef Ribeye Steak", 
      department: "Rooftop Grill & BBQ", 
      category: "Steak & BBQ", 
      price: 1150, 
      cost: 250,
      channelPrices: {
        foodpanda: 1350,
        pathao: 1280,
        foodi: 1250
      },
      variations: [
        { id: "v-4", name: "250g Prime Cut", type: "weight", price: 1150, cost: 250, recipeMultiplier: 1.0 },
        { id: "v-5", name: "400g Grand Cut", type: "weight", price: 1750, cost: 380, recipeMultiplier: 1.55 }
      ],
      addons: [
        { id: "a-4", name: "Garlic Butter Mushroom", price: 120 },
        { id: "a-5", name: "Creamy Mashed Potato", price: 90 },
        { id: "a-6", name: "Extra Pepper Sauce", price: 50 }
      ],
      recipe: [
        { rawItemId: 2, qty: 0.30 },
        { rawItemId: 4, qty: 0.05 }
      ]
    },
    { 
      id: 104, 
      name: "Special Mutton Biryani", 
      department: "Main Kitchen", 
      category: "Rice & Biryani", 
      price: 620, 
      cost: 220,
      channelPrices: {
        foodpanda: 720,
        pathao: 680,
        foodi: 660
      },
      variations: [
        { id: "v-6", name: "Half Plate (1:1)", type: "portion", price: 380, cost: 140, recipeMultiplier: 0.65 },
        { id: "v-7", name: "Full Plate (1:2)", type: "portion", price: 620, cost: 220, recipeMultiplier: 1.0 },
        { id: "v-8", name: "Family Platter (1:4)", type: "portion", price: 1200, cost: 420, recipeMultiplier: 2.0 }
      ],
      addons: [
        { id: "a-7", name: "Extra Boiled Egg", price: 30 },
        { id: "a-8", name: "Extra Mutton Shank", price: 180 },
        { id: "a-9", name: "Chilled Borhani (250ml)", price: 60 }
      ],
      promo: {
        id: "p-2",
        code: "BIRYANI15",
        title: "15% Grand Feast Promo",
        discountType: "percent",
        discountVal: 15,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        isActive: true
      },
      recipe: [
        { rawItemId: 3, qty: 0.25 },
        { rawItemId: 4, qty: 0.06 }
      ]
    }
  ],

  purchases: [
    {
      id: 170001,
      date: new Date().toISOString().split('T')[0],
      vendor: "Kader Meat Supply",
      billNo: "INV-9901",
      paymentType: "CREDIT",
      status: "FINAL",
      total: 4800,
      items: [
        { itemId: 1, item: "Chicken Boneless", category: "Chicken", uom: "Kg", qty: 15, rate: 320, total: 4800 }
      ]
    },
    {
      id: 170002,
      date: new Date().toISOString().split('T')[0],
      vendor: "City Store",
      billNo: "INV-9902",
      paymentType: "CREDIT",
      status: "FINAL",
      total: 2250,
      items: [
        { itemId: 4, item: "Soybean Oil", category: "Grocery", uom: "Ltr", qty: 10, rate: 190, total: 1900 },
        { itemId: 6, item: "Mineral Water (500ml Bottled)", category: "Cold & Beverage", uom: "Pcs", qty: 23, rate: 15, total: 350 }
      ]
    },
    {
      id: 170003,
      date: new Date().toISOString().split('T')[0],
      vendor: "Sajjad",
      billNo: "INV-9903",
      paymentType: "CASH",
      status: "FINAL",
      total: 1350,
      items: [
        { itemId: 5, item: "Special BBQ Sauce", category: "Grocery", uom: "Kg", qty: 3, rate: 450, total: 1350 }
      ]
    },
    {
      id: 170004,
      date: new Date().toISOString().split('T')[0],
      vendor: "City Store",
      billNo: "INV-9904",
      paymentType: "CASH",
      status: "FINAL",
      total: 1150,
      items: [
        { itemId: 3, item: "Basmati Rice (Premium)", category: "Grocery", uom: "Kg", qty: 8, rate: 140, total: 1120 },
        { itemId: 6, item: "Mineral Water (500ml Bottled)", category: "Cold & Beverage", uom: "Pcs", qty: 2, rate: 15, total: 30 }
      ]
    }
  ],
  sales: [],
  expenses: [
    {
      id: 15001,
      date: new Date().toISOString().split('T')[0],
      head: "Electricity Bill",
      amount: 1850,
      note: "Kitchen electrical utilities and meter billing"
    },
    {
      id: 15002,
      date: new Date().toISOString().split('T')[0],
      head: "Cleaning Bill",
      amount: 450,
      note: "Daily floor sanitization, dish soap, and hygiene packs"
    },
    {
      id: 15003,
      date: new Date().toISOString().split('T')[0],
      head: "Conveyance",
      amount: 250,
      note: "Market raw items procurement emergency transport"
    },
    {
      id: 15004,
      date: new Date().toISOString().split('T')[0],
      head: "Casual Waiter Charge",
      amount: 800,
      note: "Weekend peak banquet extra serving personnel"
    }
  ],
  payments: [
    {
      id: 18001,
      date: new Date().toISOString().split('T')[0],
      vendor: "Kader Meat Supply",
      amount: 1440,
      method: "CASH",
      note: "Partial payment"
    }
  ],
  inventory: [
    { id: 1, open: 10, used: 0.50, rate: 320 },
    { id: 2, open: 4, used: 0.15, rate: 750 },
    { id: 3, open: 8, used: 0.10, rate: 140 },
    { id: 4, open: 6, used: 0.20, rate: 190 },
    { id: 5, open: 2, used: 0.10, rate: 450 },
    { id: 6, open: 30, used: 1.00, rate: 15 }
  ]
};

interface RestaurantContextType {
  data: AppData;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeSubNav: string;
  setActiveSubNav: (sub: string) => void;
  navigateTo: (tab: ActiveTab, subNav?: string, module?: string) => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  activeTableId: string;
  setActiveTableId: (id: string) => void;
  posView: 'floor' | 'order';
  setPosView: (v: 'floor' | 'order') => void;

  // User Authentication & RBAC
  currentUser: AppUser | null;
  login: (usernameOrId: string, pinOrPass?: string) => boolean;
  loginByPin: (pin: string, userId?: string) => boolean;
  registerUser: (userData: Omit<AppUser, 'id'>, branchKey: string) => { success: boolean; message: string; user?: AppUser };
  logout: () => void;
  switchUser: (user: AppUser) => void;
  addUser: (user: Omit<AppUser, 'id'>) => void;
  editUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  updateRolePermissions: (role: UserRole, permissions: ActiveTab[]) => void;
  updateOrderEditPermission: (role: UserRole, allowed: boolean) => void;
  canAccessTab: (tab: ActiveTab, ignoreShift?: boolean) => boolean;

  // Language & i18n
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  
  // Table & Cart Actions
  selectTable: (tableId: string) => void;
  addToCart: (
    tableId: string, 
    menuItemId: number, 
    variation?: MenuItemVariation, 
    addons?: MenuItemAddon[], 
    notes?: string,
    customQty?: number
  ) => void;
  updateCartQty: (tableId: string, menuItemId: number, delta: number) => void;
  updateCartItemQty: (tableId: string, cartItemIdOrIdx: string | number, delta: number) => void;
  setCartItemQty: (tableId: string, cartItemIdOrIdx: string | number, newQty: number) => void;
  updateCartItemNotes: (tableId: string, cartItemIdOrIdx: string | number, notes: string) => void;
  removeCartItem: (tableId: string, cartItemIdOrIdx: string | number) => void;
  voidCartItem: (
    tableId: string, 
    cartItemIdOrIdx: string | number, 
    voidQty: number, 
    reason: string, 
    authorizedBy: string,
    refundMethod?: string
  ) => void;
  releaseTable: (
    tableId: string, 
    reason?: string, 
    authorizedBy?: string,
    refundMethod?: string
  ) => void;
  cancelPosOrder: (tableId: string) => void;
  openPrintCancelKot: (
    tableId: string,
    cancelledItems: { name: string; qty: number; price: number; department?: string; reason?: string }[],
    reason: string,
    authorizedBy: string
  ) => void;
  clearCart: (tableId: string) => void;
  setTableDiscount: (tableId: string, type: DiscountType, val: number) => void;
  setTableWaiter: (tableId: string, waiter: string) => void;
  setTableCustomer: (tableId: string, customer: string) => void;
  setTableZone: (tableId: string, zone: string) => void;
  setTableChannel: (tableId: string, channelOrAgentId: string) => void;
  applyTablePromoCode: (tableId: string, promoCode: string) => boolean;
  holdTableOrder: (tableId: string) => void;
  unlockBilledTable: (tableId: string) => void;
  updateGlobalTableDimensions: (dims: { width: number; height: number }) => void;

  // Commission Agents & Delivery Partners
  addCommissionAgent: (agent: Omit<CommissionAgent, 'id'> & { id?: string }) => void;
  updateCommissionAgent: (id: string, updates: Partial<CommissionAgent>) => void;
  deleteCommissionAgent: (id: string) => void;

  // Hardware Printers (USB & LAN)
  addPrinter: (printer: Omit<PrinterConfig, 'id'> & { id?: string }) => void;
  updatePrinter: (id: string, updates: Partial<PrinterConfig>) => void;
  deletePrinter: (id: string) => void;

  // Bill & KOT Print Templates
  addPrintTemplate: (tpl: Omit<PrintTemplate, 'id'> & { id?: string }) => void;
  updatePrintTemplate: (id: string, updates: Partial<PrintTemplate>) => void;
  deletePrintTemplate: (id: string) => void;
  duplicatePrintTemplate: (id: string) => void;
  setDefaultPrintTemplate: (id: string) => void;
  setAllKotShowPrices: (show: boolean) => void;
  
  // Payment Methods
  addPaymentMethod: (method: Omit<PaymentMethodConfig, 'id'> & { id?: string }) => void;
  updatePaymentMethod: (id: string, updates: Partial<PaymentMethodConfig>) => void;
  deletePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;

  // Session & Shift Management
  businessDay: BusinessDay;
  startBusinessDay: (openingCash: number, cashierName?: string, notes?: string) => void;
  startSession: (openingCash: number, notes?: string, cashierName?: string, shiftType?: string) => void;
  endSession: () => void;
  closeSessionWithReconciliation: (
    actualCash: number, 
    notes?: string, 
    closedBy?: string, 
    startNextShiftImmediately?: boolean,
    cashDropToVault?: number,
    nextShiftDrawerFloat?: number,
    carriedOverTableIds?: string[],
    handoverToCashier?: string,
    showPreviewModal?: boolean
  ) => PosSessionRecord;
  handoverShiftWithLogout: (
    actualCash: number,
    handoverTo: string,
    nextDrawerFloat: number,
    cashDropToVault: number,
    notes?: string
  ) => PosSessionRecord;
  performDailyDayEndClose: (targetDate?: string, notes?: string, extraSession?: PosSessionRecord) => DayEndRecord;
  performDayOffClose: (actualCash: number, cashDropToVault?: number, notes?: string) => DayEndRecord;
  transferWaiterTables: (fromWaiter: string, toWaiter: string) => void;
  deleteSessionRecord: (sessionId: string) => void;
  deleteDayEndRecord: (date: string) => void;
  isStartSessionModalOpen: boolean;
  setIsStartSessionModalOpen: (open: boolean) => void;
  pendingHandoverCashier: string | null;
  setPendingHandoverCashier: (name: string | null) => void;
  pendingHandoverFloat: number | null;
  setPendingHandoverFloat: (amt: number | null) => void;
  pendingHandoverFrom: string | null;
  setPendingHandoverFrom: (from: string | null) => void;
  isCloseSessionModalOpen: boolean;
  setIsCloseSessionModalOpen: (open: boolean) => void;
  isTableZoneModalOpen: boolean;
  setIsTableZoneModalOpen: (open: boolean) => void;
  isWaiterShiftModalOpen: boolean;
  setIsWaiterShiftModalOpen: (open: boolean) => void;
  selectedWaiterForShiftModal: string | null;
  setSelectedWaiterForShiftModal: (waiter: string | null) => void;
  isChefShiftModalOpen: boolean;
  setIsChefShiftModalOpen: (open: boolean) => void;
  startChefShift: (chefName: string, station: string, shiftType: 'Morning Shift' | 'Evening Shift' | 'Night Shift', notes?: string) => void;
  endChefShift: (handoverToChef?: string, notes?: string) => ChefShiftRecord | null;
  startWaiterShift: (waiterName: string, assignedZone: string, shiftType: 'Morning Shift' | 'Evening Shift' | 'Night Shift', notes?: string, serverCashFloat?: number) => void;
  endWaiterShift: (handoverToWaiter?: string, notes?: string) => WaiterShiftRecord | null;
  selectedZReportSession: PosSessionRecord | null;
  setSelectedZReportSession: (session: PosSessionRecord | null) => void;
  selectedDayEndPreview: ConsolidatedDayReportData | null;
  setSelectedDayEndPreview: (report: ConsolidatedDayReportData | null) => void;
  openTables: Table[];
  activeSessionStats: {
    cashSales: number;
    cardSales: number;
    bkashSales: number;
    nagadSales: number;
    dueSales: number;
    totalSales: number;
    orderCount: number;
    expectedCash: number;
    saleIds: number[];
  };
  
  // Settlement & Printing
  activeSettlingTable: Table | null;
  openSettleModal: (tableId: string) => void;
  closeSettleModal: () => void;
  settlePayment: (
    tableId: string, 
    payments: { 
      cash?: number; 
      card?: number; 
      bkash?: number; 
      nagad?: number; 
      due?: number; 
      advance?: number;
      byMethod?: Record<string, number>; 
    },
    waiterOverride?: string,
    customerOverride?: string
  ) => void;
  getMethodCollection: (method: PaymentMethodConfig | string) => number;
  getMethodLiveBalance: (method: PaymentMethodConfig | string) => number;
  
  printableReceipt: PrintableReceipt | null;
  setPrintableReceipt: (receipt: PrintableReceipt | null) => void;
  openPrintBill: (tableId: string, showModal?: boolean) => void;
  openPrintKot: (tableId: string, showModal?: boolean) => void;
  directSubmitKotAndHold: (tableId: string) => Promise<void>;
  directPrintBill: (tableId: string) => Promise<void>;
  closePrintReceipt: () => void;
  
  // Sales & Due
  saveDirectDueCollection: (date: string, customer: string, amount: number, method: string) => void;
  deleteSale: (id: number) => void;
  voidSale: (saleId: number, options: {
    reason: string;
    refundPayment: boolean;
    refundMethod?: string;
    restoreToTable?: boolean;
  }) => boolean;
  restoreVoidedSale: (saleId: number) => void;
  reopenSettledSaleInPos: (saleId: number) => void;
  finishLinkedOrderInPos: (tableId: string) => void;
  updateSaleWaiter: (id: number, waiterName: string) => void;
  
  // Menu & Recipe
  saveMenuItem: (item: Partial<MenuItem> & { id?: number }) => void;
  deleteMenuItem: (id: number) => void;
  importMenuItems: (items: MenuItem[], overwrite?: boolean, extraData?: { newDepartments?: string[]; newCategories?: string[] }) => { added: number; updated: number };
  
  // Master Raw Items
  saveMasterItem: (item: Partial<RawMasterItem> & { id?: number }) => void;
  deleteMasterItem: (id: number) => void;
  importMasterItems: (items: RawMasterItem[], overwrite?: boolean, extraData?: { newCategories?: string[]; newVendors?: string[] }) => { added: number; updated: number };
  
  // Purchases, POs & Returns
  savePurchaseVoucher: (voucher: PurchaseVoucher, updateMasterRates?: boolean) => void;
  deletePurchaseVoucher: (id: number) => void;
  savePurchaseOrder: (order: Partial<PurchaseOrder> & { id?: number }, updateMasterRates?: boolean) => void;
  deletePurchaseOrder: (id: number) => void;
  receivePurchaseOrderItems: (
    poId: number,
    receivedItems: PurchaseItem[],
    billNo: string,
    paymentType: PurchasePaymentType,
    receiveDate?: string,
    updateMasterRates?: boolean
  ) => void;
  savePurchaseReturn: (returnRecord: Partial<PurchaseReturn> & { id?: number }) => void;
  deletePurchaseReturn: (id: number) => void;
  
  // Expenses
  saveExpense: (expense: Omit<ExpenseRecord, 'id'> & { id?: number }) => void;
  deleteExpense: (id: number) => void;
  
  // Vendor Payments & Bill Settlement
  saveVendorPayment: (payment: Omit<VendorPayment, 'id'> & { id?: number }) => void;
  deleteVendorPayment: (id: number) => void;
  settlePurchaseBill: (billNo: string, vendor: string, amount: number, method: string, note?: string) => void;
  
  // Stock Inventory
  saveInventoryRecord: (rawItemId: number, open: number, used: number, rate?: number, wastage?: number) => void;
  
  // Configurations & Master Heads
  addConfigItem: (type: 'tables' | 'waiters' | 'vendors' | 'purchaseCategories' | 'departments' | 'menuCategories' | 'expenseHeads' | 'customers' | 'tableZones', val: string, extraZone?: string) => boolean | void;
  editConfigItem: (type: 'tables' | 'waiters' | 'vendors' | 'purchaseCategories' | 'departments' | 'menuCategories' | 'expenseHeads' | 'customers' | 'tableZones', index: number, newVal: string) => void;
  removeConfigItem: (type: 'tables' | 'waiters' | 'vendors' | 'purchaseCategories' | 'departments' | 'menuCategories' | 'expenseHeads' | 'customers' | 'tableZones', itemOrIndex: string | number) => void;
  addCustomHead: (type: 'vendor' | 'rawCategory' | 'waiter' | 'department' | 'menuCat' | 'expense' | 'customer' | 'tableZone', val: string) => void;
  editCustomHead: (type: 'vendor' | 'rawCategory' | 'waiter' | 'department' | 'menuCat' | 'expense' | 'customer' | 'tableZone', index: number, newVal: string) => void;
  deleteCustomHead: (type: 'vendor' | 'rawCategory' | 'waiter' | 'department' | 'menuCat' | 'expense' | 'customer' | 'tableZone', index: number) => void;
  addCustomTable: (name: string, zone?: string) => boolean | void;
  editCustomTable: (index: number, newName: string, newZone?: string) => void;
  deleteCustomTable: (index: number) => void;
  addTableZone: (zone: string) => boolean | void;
  editTableZone: (oldZone: string, newZone: string) => void;
  deleteTableZone: (zone: string) => void;

  // Restaurant Profile & Branding
  updateRestaurantProfile: (profile: Partial<RestaurantProfile>) => void;
  updateSerialConfig: (config: Partial<SerialNumberConfig>) => void;

  // HR & Staff Management
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  editEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Attendance Management
  addAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  deleteAttendanceRecord: (id: string) => void;
  bulkSyncAttendanceRecords: (records: (Omit<AttendanceRecord, 'id'> | AttendanceRecord)[]) => { added: number; updated: number };

  // Leave Applications
  addLeaveApplication: (leave: Omit<LeaveApplication, 'id'>) => void;
  updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') => void;
  deleteLeaveApplication: (id: string) => void;

  // Work Shifts & Employment Types
  addWorkShift: (shift: Omit<WorkShift, 'id'>) => void;
  editWorkShift: (id: string, updates: Partial<WorkShift>) => void;
  deleteWorkShift: (id: string) => void;
  addEmploymentType: (type: Omit<EmploymentType, 'id'>) => void;
  editEmploymentType: (id: string, updates: Partial<EmploymentType>) => void;
  deleteEmploymentType: (id: string) => void;
  addLeaveType: (type: Omit<LeaveType, 'id'>) => void;
  editLeaveType: (id: string, updates: Partial<LeaveType>) => void;
  deleteLeaveType: (id: string) => void;

  // Accounting Journal Entries
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  editJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;

  // Chart of Accounts (COA)
  addAccountHead: (head: Omit<AccountHead, 'id'>) => void;
  editAccountHead: (id: string, updated: Partial<AccountHead>) => void;
  deleteAccountHead: (id: string) => void;
  getLiveAccountBalance: (acc: AccountHead) => number;
  findExpenseAccount: (expense: ExpenseRecord) => AccountHead | undefined;

  // Customer Advance Deposits
  saveCustomerAdvance: (advance: Omit<CustomerAdvance, 'id'> & { id?: number }) => void;
  deleteCustomerAdvance: (id: number) => void;
  getCustomerAvailableAdvance: (customerName: string) => number;
  
  // Cleanup & Backup Tools
  resetModuleData: (module: 'sales' | 'expenses' | 'purchases' | 'payables' | 'stock' | 'inventory' | 'tables' | 'menu' | 'masterItems' | 'items' | 'customerAdvances' | 'coa' | 'users' | 'all') => void;
  cleanModuleData: (moduleType: 'sales' | 'purchases' | 'expenses' | 'stock' | 'items' | 'all') => void;
  resetAllData: () => void;
  cleanAllSystemData: () => void;
  exportBackupJson: () => void;
  importBackupJson: (importedData: AppData) => boolean;
  
  // Computed Business Metrics
  metrics: {
    totalSales: number;
    salesCount: number;
    totalPurchases: number;
    purchaseCount: number;
    totalExpenses: number;
    totalCustomerDue: number;
    totalCustomerAdvances: number;
    totalVendorDue: number;
    totalOpeningStockVal: number;
    totalOpeningStockQty: number;
    totalClosingStockVal: number;
    totalStockItemsCount: number;
    totalInwardPurchasesVal: number;
    totalInwardPurchasesQty: number;
    totalWastageCostVal: number;
    totalWastageQty: number;
    totalBomCostVal: number;
    totalBomUsedQty: number;
    totalManualUsedVal: number;
    totalManualUsedQty: number;
    totalProductionCost: number;
    totalCogsVal: number;
    lowStockCount: number;
    negativeStockCount: number;
    estimatedProfit: number;
    payCash: number;
    payCard: number;
    payBkash: number;
    payNagad: number;
    paymentAccountBalances: {
      cashDrawer: number;
      pettyCash?: number;
      bankTransfer: number;
      cheque: number;
      bkashMerchant: number;
      nagadMerchant: number;
    };
    freeTablesCount: number;
    occupiedTablesCount: number;
    autoBomUsageMap: Record<number, number>;
    topSellingItems: Array<{ name: string; qty: number }>;
  };
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const getModuleForTab = (tab: ActiveTab, subNav?: string): string => {
  if (tab === 'pos' || tab === 'sales') return 'sales-pos';
  if (tab === 'menu-items' || tab === 'inv-items') return 'menu-kitchen';
  if (tab === 'inventory') return 'inventory';
  if (tab === 'purchases' || tab === 'payables') return 'purchases';
  if (tab === 'expenses' || tab === 'receivables' || tab === 'journal') return 'accounts';
  if (tab === 'hr') return 'hr';
  if (tab === 'heads' || tab === 'users' || tab === 'data-cleanup') return 'admin';
  if (tab === 'reports') {
    return 'reports';
  }
  return 'sales-pos';
};

export const CANONICAL_EXPENSE_HEAD_MAP: Record<string, { code: string; name: string }> = {
  'staff salary & advance': { code: '6010', name: 'Staff Salary & Advance' },
  'staff salary': { code: '6010', name: 'Staff Salary & Advance' },
  'salary': { code: '6010', name: 'Staff Salary & Advance' },
  'salaries': { code: '6010', name: 'Staff Salary & Advance' },
  'casual waiter charge': { code: '6010', name: 'Staff Salary & Advance' },
  'waiter charge': { code: '6010', name: 'Staff Salary & Advance' },
  'kitchen staff salaries': { code: '6010', name: 'Staff Salary & Advance' },
  'office & shop rent': { code: '6020', name: 'Office & Shop Rent' },
  'floor rent': { code: '6020', name: 'Office & Shop Rent' },
  'rent': { code: '6020', name: 'Office & Shop Rent' },
  'gas bill': { code: '6030', name: 'Gas Bill' },
  'electricity bill': { code: '6040', name: 'Electricity Bill' },
  'electric bill': { code: '6040', name: 'Electricity Bill' },
  'staff house rent': { code: '6050', name: 'Staff House Rent' },
  'software service charge': { code: '6060', name: 'Software Service Charge' },
  'cleaning bill': { code: '6070', name: 'Cleaning Bill' },
  'cleaning & consumables': { code: '6070', name: 'Cleaning Bill' },
  'cleaning': { code: '6070', name: 'Cleaning Bill' },
  'conveyance': { code: '6080', name: 'Conveyance' },
  'transport': { code: '6080', name: 'Conveyance' },
  'internet bill': { code: '6090', name: 'Internet Bill' },
  'misc exp.': { code: '6100', name: 'Misc Exp.' },
  'misc exp': { code: '6100', name: 'Misc Exp.' },
  'printing & branding': { code: '6110', name: 'Printing & Branding' },
  'repair maintenance': { code: '6120', name: 'Repair Maintenance' },
  'staff expenses( food & others)': { code: '6130', name: 'Staff Expenses (Food & Others)' },
  'staff expenses': { code: '6130', name: 'Staff Expenses (Food & Others)' },
  'overtime': { code: '6140', name: 'Overtime' },
  'mobile bill': { code: '6150', name: 'Mobile Bill' },
  'first aid': { code: '6160', name: 'First Aid' },
  'donation': { code: '6170', name: 'Donation' },
  'bank charge': { code: '6180', name: 'Bank Charge' },
  'cogs manual use': { code: '6050', name: 'COGS Manual Use (MU)' }
};

export const getNextAccountCode = (
  type: AccountType,
  chartAccounts: AccountHead[],
  category?: string
): string => {
  const existingCodes = new Set(chartAccounts.map(a => (a.code || '').trim()));

  if (type === 'ASSET') {
    let next = 1010;
    while (existingCodes.has(next.toString())) {
      next += 10;
    }
    return next.toString();
  }

  if (type === 'LIABILITY') {
    let next = 2010;
    while (existingCodes.has(next.toString())) {
      next += 10;
    }
    return next.toString();
  }

  if (type === 'EQUITY') {
    let next = 3010;
    while (existingCodes.has(next.toString())) {
      next += 10;
    }
    return next.toString();
  }

  if (type === 'REVENUE') {
    let next = 4010;
    while (existingCodes.has(next.toString())) {
      next += 10;
    }
    return next.toString();
  }

  if (type === 'EXPENSE') {
    const isCogs = (category || '').toLowerCase().includes('cost of goods') || (category || '').toLowerCase().includes('bom');
    if (isCogs) {
      let next = 5010;
      while (existingCodes.has(next.toString())) {
        next += 10;
      }
      return next.toString();
    } else {
      let next = 6010;
      while (existingCodes.has(next.toString())) {
        next += 10;
      }
      return next.toString();
    }
  }

  return '9010';
};

export const resolveExpenseAccount = (
  e: ExpenseRecord,
  accounts: AccountHead[]
): AccountHead | undefined => {
  // 1. Explicit accountCode or accountId match
  if (e.accountCode) {
    const acc = accounts.find(a => a.code === e.accountCode);
    if (acc) return acc;
  }
  if (e.accountId) {
    const acc = accounts.find(a => a.id === e.accountId || a.code === e.accountId);
    if (acc) return acc;
  }

  const eHead = (e.head || '').toLowerCase().trim();
  const eCat = (e.category || '').toLowerCase().trim();
  if (!eHead) return undefined;

  // 2. Direct exact name match (Highest priority: matches user's actual accounts!)
  const exactMatch = accounts.find(a => 
    a.type === 'EXPENSE' && a.name.toLowerCase().trim() === eHead
  ) || accounts.find(a => a.name.toLowerCase().trim() === eHead);
  if (exactMatch) return exactMatch;

  // 3. Clean normalized alphanumeric match (handles spacing/punctuation e.g. "Misc Exp." vs "Misc Exp")
  const normHead = eHead.replace(/[^a-z0-9]/g, '');
  if (normHead) {
    const normMatch = accounts.find(a => 
      a.type === 'EXPENSE' && a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normHead
    ) || accounts.find(a => a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normHead);
    if (normMatch) return normMatch;
  }

  // 4. Strict canonical head map
  const canonical = CANONICAL_EXPENSE_HEAD_MAP[eHead];
  if (canonical) {
    const acc = accounts.find(a => a.code === canonical.code);
    if (acc) return acc;
  }

  // 3. Filter candidate operating expense accounts (exclude pure BOM COGS unless head explicitly mentions COGS/BOM)
  const candidateAccounts = accounts.filter(a => {
    if (a.type !== 'EXPENSE') return false;
    const code = a.code || '';
    const cat = (a.category || '').toLowerCase();
    const isBomCogs = (code.startsWith('50') || cat.includes('cost of goods sold') || cat.includes('bom')) && code !== '6050';
    if (isBomCogs && !eHead.includes('cogs') && !eHead.includes('bom')) return false;
    return true;
  });

  if (candidateAccounts.length === 0) return undefined;

  let bestAccount: AccountHead | undefined = undefined;
  let highestScore = 0;

  for (const acc of candidateAccounts) {
    let score = 0;
    const aName = acc.name.toLowerCase().trim();
    const aCode = acc.code || '';

    // Direct substring match
    if (eHead && (aName.includes(eHead) || eHead.includes(aName))) {
      score += 50;
    }

    // Specific domain category keywords
    // 6010 - Kitchen Staff Salaries & Casual Labor
    const isSalaryAcc = aCode === '6010' || aName.includes('salary') || aName.includes('salaries') || aName.includes('staff') || aName.includes('wage');
    if (isSalaryAcc) {
      const salaryKeywords = ['salary', 'salaries', 'staff', 'waiter', 'chef', 'labor', 'labour', 'wage', 'wages', 'casual', 'worker', 'employee', 'bonus', 'overtime'];
      if (salaryKeywords.some(k => eHead.includes(k) || eCat.includes(k))) {
        score += 80;
      }
    }

    // 6030 - Electricity & Gas, Power, Utility Bills (Explicit energy keywords; DO NOT match bare 'bill'!)
    const isElectricAcc = aCode === '6030' || aName.includes('electric') || aName.includes('gas') || aName.includes('power');
    if (isElectricAcc) {
      const electricKeywords = ['electric', 'electricity', 'power', 'current', 'gas', 'lpg', 'cylinder', 'desco', 'dpdc', 'nesco', 'reb', 'titas', 'generator', 'fuel'];
      if (electricKeywords.some(k => eHead.includes(k) || eCat.includes(k))) {
        score += 80;
      }
    }

    // 6040 - Cleaning, Consumables, Sanitization
    const isCleanAcc = aCode === '6040' || aName.includes('clean') || aName.includes('consumable') || aName.includes('wash');
    if (isCleanAcc) {
      const cleanKeywords = ['clean', 'cleaning', 'wash', 'washing', 'soap', 'detergent', 'tissue', 'napkin', 'consumable', 'consumables', 'disinfectant', 'harpic', 'sanitiz', 'trash', 'waste', 'pest'];
      if (cleanKeywords.some(k => eHead.includes(k) || eCat.includes(k))) {
        score += 80;
      }
    }

    // 6020 - Floor Rent & General OpEx / Conveyance
    const isRentAcc = aCode === '6020' || aName.includes('rent') || aName.includes('overhead') || aName.includes('utilit');
    if (isRentAcc) {
      const rentKeywords = ['rent', 'lease', 'conveyance', 'transport', 'travel', 'fare', 'rickshaw', 'cng', 'taxi', 'bike', 'bus', 'repair', 'maintenance', 'water', 'wasa'];
      if (rentKeywords.some(k => eHead.includes(k) || eCat.includes(k))) {
        score += 80;
      }
    }

    // Tokenized word matching (ignoring generic stop words like 'bill', 'charge', 'cost', 'fee', 'the', 'and')
    const stopWords = new Set(['bill', 'bills', 'charge', 'charges', 'cost', 'costs', 'fee', 'fees', 'the', 'and', 'for', 'all']);
    const eWords = eHead.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    const aWords = aName.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    const wordMatches = eWords.filter(ew => aWords.some(aw => ew.includes(aw) || aw.includes(ew)));
    score += wordMatches.length * 20;

    if (score > highestScore) {
      highestScore = score;
      bestAccount = acc;
    }
  }

  // Fallback: general operating expenses (6020 or first candidate account)
  if (!bestAccount || highestScore === 0) {
    bestAccount = candidateAccounts.find(a => a.code === '6020') || candidateAccounts[0] || accounts[0];
  }

  return bestAccount;
};

/**
 * Dynamically allocates live Recipe BOM Consumption Cost to Chart of Accounts heads
 * based on raw material categories and names, ensuring 1-to-1 deterministic distribution
 * with zero duplication and zero hardcoded percentages.
 */
export function computeCogsBomAllocation(
  masterItems: RawMasterItem[],
  autoBomUsageMap: Record<number, number>,
  rawItemRates: Record<number, number>,
  chartOfAccounts: AccountHead[],
  manualUsageMap?: Record<number, number>,
  wastageUsageMap?: Record<number, number>
): Record<string, number> {
  const chartAccounts = chartOfAccounts || [];

  // Dedicated accounts for manual kitchen use or kitchen wastage if explicitly configured
  const dedicatedManualAcc = chartAccounts.find(a => 
    a.type === 'EXPENSE' && (a.name || '').toLowerCase().includes('manual')
  );
  const dedicatedWastageAcc = chartAccounts.find(a => 
    a.type === 'EXPENSE' && ((a.name || '').toLowerCase().includes('wastage') || (a.name || '').toLowerCase().includes('spoilage'))
  );

  const bomAccounts = chartAccounts.filter(a => {
    if (a.type !== 'EXPENSE') return false;
    const c = a.code || '';
    const n = (a.name || '').toLowerCase();
    const cat = (a.category || '').toLowerCase();
    const isC = c.startsWith('50') || cat.includes('cost of goods') || cat.includes('bom') || n.includes('cogs');
    if (!isC) return false;
    if (dedicatedManualAcc && (a.id === dedicatedManualAcc.id || a.code === dedicatedManualAcc.code)) return false;
    if (dedicatedWastageAcc && (a.id === dedicatedWastageAcc.id || a.code === dedicatedWastageAcc.code)) return false;
    return true;
  });

  const result: Record<string, number> = {};
  chartAccounts.forEach(a => {
    result[a.id] = 0;
    result[a.code] = 0;
  });

  if (bomAccounts.length === 0 && !dedicatedManualAcc && !dedicatedWastageAcc) return result;

  // Helper to match account name against category or raw item name
  const matchesCategoryOrName = (acc: AccountHead, rawCategory: string, rawItemName: string): boolean => {
    const aName = (acc.name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const targetCat = (rawCategory || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const targetItem = (rawItemName || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    if (targetCat && aName.includes(targetCat)) return true;

    // Check individual words of category (length >= 3)
    if (targetCat) {
      const catWords = targetCat.split(/\s+/).filter(w => w.length >= 3);
      if (catWords.length > 0 && catWords.every(w => aName.includes(w))) return true;
    }

    // Direct item name match (e.g. "Chicken" in "COGS - Raw Chicken")
    if (targetItem && aName.includes(targetItem)) return true;

    // Common synonyms in restaurant inventory & accounting
    if (targetCat.includes('chicken') && (aName.includes('chicken') || aName.includes('poultry') || aName.includes('meat'))) return true;
    if (targetCat.includes('beef') && (aName.includes('beef') || aName.includes('meat'))) return true;
    if (targetCat.includes('mutton') && (aName.includes('mutton') || aName.includes('meat'))) return true;
    if (targetCat.includes('grocery') && (aName.includes('grocery') || aName.includes('rice') || aName.includes('oil') || aName.includes('flour'))) return true;
    if (targetCat.includes('beverage') && (aName.includes('beverage') || aName.includes('cold') || aName.includes('drink') || aName.includes('coffee'))) return true;
    if (targetCat.includes('fish') && (aName.includes('fish') || aName.includes('seafood'))) return true;
    if (targetCat.includes('vegetable') && (aName.includes('vegetable') || aName.includes('veg'))) return true;
    if (targetCat.includes('egg') && aName.includes('egg')) return true;
    if (targetCat.includes('ice cream') && (aName.includes('ice cream') || aName.includes('sweet') || aName.includes('dessert'))) return true;
    if (targetCat.includes('dairy') && (aName.includes('dairy') || aName.includes('milk') || aName.includes('cheese'))) return true;

    return false;
  };

  // Find generic fallback BOM account (e.g. "COGS - Raw Material", "Cost of Goods Sold")
  const generalAcc = bomAccounts.find(a => {
    const n = (a.name || '').toLowerCase();
    return n.includes('raw material') || n.includes('general') || n === 'cogs' || n === 'cost of goods sold';
  }) || bomAccounts[0];

  // Distribute costs for each raw item
  masterItems.forEach(item => {
    const bomQty = autoBomUsageMap[item.id] || 0;
    const manualQty = (manualUsageMap && manualUsageMap[item.id]) || 0;
    const wasteQty = (wastageUsageMap && wastageUsageMap[item.id]) || 0;

    const rate = rawItemRates[item.id] || Number(item.defaultRate) || 0;
    if (rate <= 0) return;

    const cat = (item.category || '').trim();

    // Specific category account or general fallback
    const specificAcc = (bomAccounts.length > 1 && generalAcc)
      ? bomAccounts.filter(a => a.id !== generalAcc.id).find(a => matchesCategoryOrName(a, cat, item.name || ''))
      : undefined;

    const targetAcc = specificAcc || generalAcc || bomAccounts[0];

    // 1. Auto Recipe BOM Cost (from POS Sales)
    if (bomQty > 0 && targetAcc) {
      const bomCost = bomQty * rate;
      result[targetAcc.id] = (result[targetAcc.id] || 0) + bomCost;
      if (targetAcc.code && targetAcc.code !== targetAcc.id) {
        result[targetAcc.code] = (result[targetAcc.code] || 0) + bomCost;
      }
    }

    // 2. Manual Kitchen Usage Cost
    // If a dedicated account with 'manual' exists in COA, route to it; otherwise route to category COGS account
    if (manualQty > 0) {
      const manualCost = manualQty * rate;
      const destAcc = dedicatedManualAcc || targetAcc;
      if (destAcc) {
        result[destAcc.id] = (result[destAcc.id] || 0) + manualCost;
        if (destAcc.code && destAcc.code !== destAcc.id) {
          result[destAcc.code] = (result[destAcc.code] || 0) + manualCost;
        }
      }
    }

    // 3. Kitchen Wastage / Spoilage Cost
    // If a dedicated account with 'wastage' exists in COA, route to it; otherwise route to category COGS account
    if (wasteQty > 0) {
      const wasteCost = wasteQty * rate;
      const destAcc = dedicatedWastageAcc || targetAcc;
      if (destAcc) {
        result[destAcc.id] = (result[destAcc.id] || 0) + wasteCost;
        if (destAcc.code && destAcc.code !== destAcc.id) {
          result[destAcc.code] = (result[destAcc.code] || 0) + wasteCost;
        }
      }
    }
  });

  return result;
}

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge any historical localStorage database dumps so client browsers are completely clean
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMP_STORAGE_KEY);
      localStorage.removeItem('barcode_cafe_restaurant_data_v2');
      localStorage.removeItem('barcode_cafe_restaurant_data');
    }
  } catch {}

  const [data, setData] = useState<AppData>(DEFAULT_DATA);

  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (savedTab) return savedTab as ActiveTab;
    } catch {}
    return 'launcher';
  });

  const [activeSubNav, setActiveSubNavState] = useState<string>(() => {
    try {
      const savedSubNav = localStorage.getItem(ACTIVE_SUBNAV_KEY);
      if (savedSubNav !== null) return savedSubNav;
    } catch {}
    return '';
  });

  const [activeModule, setActiveModuleState] = useState<string>(() => {
    try {
      const savedModule = localStorage.getItem(ACTIVE_MODULE_KEY);
      if (savedModule) {
        if (savedModule === 'sales-invoices') return 'sales-pos';
        return savedModule;
      }
    } catch {}
    return 'sales-pos';
  });

  const [activeTableId, setActiveTableIdState] = useState<string>(() => {
    try {
      const savedTableId = localStorage.getItem(ACTIVE_TABLE_ID_KEY);
      if (savedTableId) return savedTableId;
    } catch {}
    return 'T-01';
  });

  const [posView, setPosViewState] = useState<'floor' | 'order'>(() => {
    try {
      const savedPosView = localStorage.getItem(POS_VIEW_KEY);
      if (savedPosView === 'floor' || savedPosView === 'order') return savedPosView;
    } catch {}
    return 'floor';
  });

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
    } catch {}
    if (tab !== 'launcher') {
      const mod = getModuleForTab(tab, activeSubNav);
      setActiveModuleState(mod);
      try {
        localStorage.setItem(ACTIVE_MODULE_KEY, mod);
      } catch {}
    }
  };

  const setActiveSubNav = (sub: string) => {
    setActiveSubNavState(sub);
    try {
      localStorage.setItem(ACTIVE_SUBNAV_KEY, sub);
    } catch {}
  };

  const setActiveModule = (module: string) => {
    setActiveModuleState(module);
    try {
      localStorage.setItem(ACTIVE_MODULE_KEY, module);
    } catch {}
  };

  const setActiveTableId = (id: string) => {
    setActiveTableIdState(id);
    try {
      localStorage.setItem(ACTIVE_TABLE_ID_KEY, id);
    } catch {}
  };

  const setPosView = (v: 'floor' | 'order') => {
    setPosViewState(v);
    try {
      localStorage.setItem(POS_VIEW_KEY, v);
    } catch {}
  };

  const navigateTo = (tab: ActiveTab, subNav?: string, module?: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
    } catch {}
    if (subNav !== undefined) {
      setActiveSubNavState(subNav);
      try {
        localStorage.setItem(ACTIVE_SUBNAV_KEY, subNav);
      } catch {}
    }
    if (module) {
      setActiveModuleState(module);
      try {
        localStorage.setItem(ACTIVE_MODULE_KEY, module);
      } catch {}
    } else {
      const mod = getModuleForTab(tab, subNav);
      setActiveModuleState(mod);
      try {
        localStorage.setItem(ACTIVE_MODULE_KEY, mod);
      } catch {}
    }
  };
  const [isStartSessionModalOpen, setIsStartSessionModalOpen] = useState(false);
  const [pendingHandoverCashier, setPendingHandoverCashier] = useState<string | null>(null);
  const [pendingHandoverFloat, setPendingHandoverFloat] = useState<number | null>(null);
  const [pendingHandoverFrom, setPendingHandoverFrom] = useState<string | null>(null);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [isTableZoneModalOpen, setIsTableZoneModalOpen] = useState(false);
  const [isWaiterShiftModalOpen, setIsWaiterShiftModalOpen] = useState(false);
  const [selectedWaiterForShiftModal, setSelectedWaiterForShiftModal] = useState<string | null>(null);
  const [isChefShiftModalOpen, setIsChefShiftModalOpen] = useState(false);
  const [selectedZReportSession, setSelectedZReportSessionState] = useState<PosSessionRecord | null>(null);
  const [selectedDayEndPreview, setSelectedDayEndPreviewState] = useState<ConsolidatedDayReportData | null>(null);
  const [pendingLogoutAfterShiftClose, setPendingLogoutAfterShiftClose] = useState(false);
  const [activeSettlingTable, setActiveSettlingTable] = useState<Table | null>(null);
  const [printableReceipt, setPrintableReceipt] = useState<PrintableReceipt | null>(null);
  const printableReceiptRef = useRef<PrintableReceipt | null>(null);
  useEffect(() => {
    printableReceiptRef.current = printableReceipt;
  }, [printableReceipt]);

  // User Authentication & Session
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser && savedUser !== 'null' && savedUser !== 'undefined') {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading current user:", e);
    }
    return null;
  });

  // Auto-switch to authorized starting tab when user logs in or role changes
  useEffect(() => {
    if (!currentUser) return;
    const hasCurrentAccess = currentUser.role === 'ADMIN' || activeTab === 'launcher'
      ? true 
      : (currentUser.permissions || []).includes(activeTab);

    if (!hasCurrentAccess) {
      setActiveTab('launcher');
    }
  }, [currentUser]);

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedLang === 'en') {
        return savedLang;
      }
    } catch (e) {
      console.error("Error loading language pref:", e);
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      console.error("Error saving language pref:", e);
    }
  };

  const t: Translations = useMemo(() => {
    return translations[language] || translations.en;
  }, [language]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Error saving user session:", e);
    }
  }, [currentUser]);

  const lastSyncedStringRef = useRef<string>("");
  const lastSyncedTimestampRef = useRef<number>(0);
  const lastFullSyncTimestampRef = useRef<number>(0);
  const isUpdatingFromSync = useRef<boolean>(false);
  const isInitialSyncDoneRef = useRef<boolean>(false);
  const lastLocalEditTimeRef = useRef<number>(0);
  // Multi-tab instant synchronization channel
  const posBroadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabClientIdRef = useRef<string>(Math.random().toString(36).substring(2, 9));

  if (!posBroadcastChannelRef.current && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      posBroadcastChannelRef.current = new BroadcastChannel('posdemo_multi_tab_sync');
    } catch (e) {}
  }

  const dataRef = useRef<AppData>(data);
  const posViewRef = useRef(posView);
  const activeTableIdRef = useRef(activeTableId);
  const lastSyncedTablesStrRef = useRef<string>("");
  const debounceSyncTimerRef = useRef<any>(null);
  const debounceTablesSyncTimerRef = useRef<any>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    posViewRef.current = posView;
  }, [posView]);

  useEffect(() => {
    activeTableIdRef.current = activeTableId;
  }, [activeTableId]);

    // Unified, real-time state processor directly bound to database state
  const processIncomingServerState = (incomingData: AppData, serverTimestamp?: number, isInitial = false) => {
    if (!isInitial && printableReceiptRef.current) {
      return;
    }

    const result = { data: JSON.parse(JSON.stringify(incomingData)) };

    // Smart Sales Merge: ensure no locally created recent sales are lost if server response is slightly behind
    if (Array.isArray(result.data.sales) && Array.isArray(dataRef.current.sales)) {
      const serverInvoiceSet = new Set(result.data.sales.map((s: any) => s.invoiceNo));
      const recentUnsyncedLocalSales = dataRef.current.sales.filter(
        (ls: any) => !serverInvoiceSet.has(ls.invoiceNo) && (Date.now() - (ls.id || ls.createdAt || 0) < 60000)
      );
      if (recentUnsyncedLocalSales.length > 0) {
        result.data.sales = [...result.data.sales, ...recentUnsyncedLocalSales];
      }
    }

    if (result.data.tableDimensions?.width === 210 && result.data.tableDimensions?.height === 140) {
      result.data.tableDimensions = { width: 147, height: 98 };
    }

    if (Array.isArray(result.data.inventory) && result.data.purchases?.some((p: any) => p.billNo === 'BILL-8540' || p.billNo?.includes('8540'))) {
      result.data.inventory = result.data.inventory.map((inv: any) => {
        if (inv.id === 1 && inv.open === 1) {
          return { ...inv, open: 0 };
        }
        return inv;
      });
    }

    if (result.data.tables) {
      if (!isInitial) {
        const localTables = dataRef.current?.tables || [];
        const now = Date.now();
        result.data.tables = result.data.tables.map((t: Table) => {
          const lt = localTables.find(l => l.id === t.id);
          if (!lt) return t;

          // If active table edited recently in this tab (< 2500ms), preserve local in-flight draft
          const isActiveAndRecentlyEdited = (t.id === activeTableIdRef.current) && ((now - (lastLocalEditTimeRef.current || 0)) < 2500);
          if (isActiveAndRecentlyEdited) {
            return lt;
          }

          return t;
        });
      }
    }

    if (result.data) {
      if (!result.data.printTemplates || result.data.printTemplates.length === 0) {
        result.data.printTemplates = (dataRef.current.printTemplates && dataRef.current.printTemplates.length > 0)
          ? dataRef.current.printTemplates
          : DEFAULT_PRINT_TEMPLATES;
      }
      if (result.data.chartOfAccounts) {
        result.data.chartOfAccounts = ensureAccountSystemRoles(result.data.chartOfAccounts);
      }
    }

    const serverStateStr = JSON.stringify(result.data);
    const currentLocalStr = JSON.stringify(dataRef.current);

    if (isInitial || (serverStateStr !== currentLocalStr && serverStateStr !== lastSyncedStringRef.current)) {
      isUpdatingFromSync.current = true;
      setData(result.data);
      dataRef.current = result.data;
      lastSyncedStringRef.current = serverStateStr;
      if (serverTimestamp) {
        lastSyncedTimestampRef.current = serverTimestamp;
        lastFullSyncTimestampRef.current = serverTimestamp;
      }
      setTimeout(() => {
        isUpdatingFromSync.current = false;
      }, 150);
    } else if (!lastSyncedStringRef.current) {
      lastSyncedStringRef.current = serverStateStr;
      if (serverTimestamp) lastSyncedTimestampRef.current = serverTimestamp;
    }
  };

  // Synchronize state directly from server database
  const syncFromServer = async (isInitial = false) => {
    if (!isInitial && printableReceiptRef.current) {
      return;
    }

    try {
      const res = await fetch("/api/restaurant/state");
      if (!res.ok) {
        if (isInitial) isInitialSyncDoneRef.current = true;
        return;
      }
      const result = await res.json();
      if (result.success && result.data) {
        const serverTimestamp = Number(result.timestamp) || 0;
        processIncomingServerState(result.data, serverTimestamp, isInitial);
      }
    } catch (err) {
      console.error("Failed to sync state from server:", err);
    } finally {
      if (isInitial) {
        isInitialSyncDoneRef.current = true;
      }
    }
  };

  // Instant differential tables applicator (<1ms in React, direct from MongoDB / SSE)
  const applyIncomingTables = (incomingTables: Table[], newSale?: SaleRecord, serverTimestamp?: number, incomingSerialConfig?: SerialNumberConfig) => {
    if (!Array.isArray(incomingTables)) return;

    // Protection against race condition / stale snapshot pulse flicker:
    // If local user made an edit in the last 2.5 seconds, do not overwrite local tables from an incoming pulse
    const isRecentlyEditedLocally = (Date.now() - (lastLocalEditTimeRef.current || 0)) < 2500;
    const isServerAhead = Boolean(serverTimestamp && serverTimestamp >= (lastLocalEditTimeRef.current || 0));
    if (isRecentlyEditedLocally && !isServerAhead) {
      if (serverTimestamp && serverTimestamp > (lastSyncedTimestampRef.current || 0)) {
        lastSyncedTimestampRef.current = serverTimestamp;
      }
      return;
    }

    const curTablesStr = JSON.stringify(dataRef.current.tables);
    const inTablesStr = JSON.stringify(incomingTables);
    if (curTablesStr === inTablesStr && (!newSale || dataRef.current.sales?.some(s => s.invoiceNo === newSale.invoiceNo))) {
      if (serverTimestamp) lastSyncedTimestampRef.current = serverTimestamp;
      return;
    }

    lastSyncedTablesStrRef.current = inTablesStr;

    const now = Date.now();
    const currentLocalTables = dataRef.current.tables || [];
    const mergedTables = incomingTables.map(st => {
      const lt = currentLocalTables.find(l => l.id === st.id);
      if (!lt) return st;

      // If active table edited recently in this tab (< 2500ms), preserve local in-flight draft
      const isActiveAndRecentlyEdited = (st.id === activeTableIdRef.current) && ((now - (lastLocalEditTimeRef.current || 0)) < 2500);
      if (isActiveAndRecentlyEdited) {
        return lt;
      }

      // Otherwise, the incoming server table is 100% authoritative
      return st;
    });

    setData(prev => {
      let finalTables = mergedTables;

      let updatedSales = prev.sales || [];
      if (newSale && newSale.invoiceNo) {
        const exists = updatedSales.some(s => s.invoiceNo === newSale.invoiceNo);
        if (!exists) {
          updatedSales = [...updatedSales, newSale];
        }
      }

      const next = {
        ...prev,
        tables: finalTables,
        sales: updatedSales,
        serialConfig: incomingSerialConfig || prev.serialConfig
      };
      dataRef.current = next;
      return next;
    });

    if (serverTimestamp) {
      lastSyncedTimestampRef.current = serverTimestamp;
    }
  };

  // Instant differential POS table pusher (<10ms across all screens & terminals)
  const syncPosTablesToServer = async (tablesToSend: Table[], newSaleToSend?: SaleRecord, action = 'TABLES_UPDATE', serialConfigToSend?: SerialNumberConfig) => {
    const now = Date.now();
    lastLocalEditTimeRef.current = now;

    // 1. Instant zero-lag broadcast to sibling tabs in this browser (0ms)
    if (posBroadcastChannelRef.current) {
      try {
        posBroadcastChannelRef.current.postMessage({
          type: 'POS_TABLES_UPDATE',
          sender: tabClientIdRef.current,
          tables: tablesToSend,
          newSale: newSaleToSend,
          serialConfig: serialConfigToSend,
          timestamp: now
        });
      } catch (e) {}
    }

    // 2. High-speed differential POS push (<10ms across different accounts & devices)
    try {
      const res = await fetch('/api/restaurant/pos-sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          action,
          sender: tabClientIdRef.current,
          tables: tablesToSend,
          newSale: newSaleToSend,
          serialConfig: serialConfigToSend
        })
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.timestamp) {
          lastSyncedTimestampRef.current = json.timestamp;
        }
      }
    } catch (err) {
      console.warn('POS fast-sync error:', err);
    }
  };

  // Synchronize state to server
  const syncToServer = async (stateToSend: AppData) => {
    if (!isInitialSyncDoneRef.current || isUpdatingFromSync.current) return;
    const serialized = JSON.stringify(stateToSend);
    if (serialized === lastSyncedStringRef.current) return;

    try {
      const timestamp = Date.now();
      const res = await fetch("/api/restaurant/state", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ data: stateToSend, sender: tabClientIdRef.current, clientTimestamp: timestamp }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          lastSyncedStringRef.current = serialized;
          if (result.timestamp) {
            lastSyncedTimestampRef.current = result.timestamp;
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync state to server:", err);
    }
  };

  // Initial pull, real-time SSE stream (<15ms across devices), 0ms multi-tab broadcast, and fallback pulse polling
  useEffect(() => {
    syncFromServer(true);

    // 1. Real-time Server-Sent Events (SSE) Stream
    let sseInstance: EventSource | null = null;
    let sseReconnectTimer: any = null;

    const setupSSE = () => {
      if (typeof window === 'undefined' || !('EventSource' in window)) return;
      try {
        sseInstance = new EventSource('/api/restaurant/stream');

        sseInstance.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (!parsed) return;
            // Strictly ignore echo from this tab
            if (parsed.sender && parsed.sender === tabClientIdRef.current) return;
            if (parsed.type === 'POS_TABLES_UPDATE' && parsed.tables) {
              applyIncomingTables(parsed.tables, parsed.newSale, parsed.timestamp, parsed.serialConfig);
            } else if (parsed.type === 'CONNECTED' && parsed.tables) {
              applyIncomingTables(parsed.tables, undefined, parsed.timestamp);
            } else if (parsed.type === 'FULL_STATE_UPDATED' && parsed.data) {
              processIncomingServerState(parsed.data, parsed.timestamp, false);
            }
          } catch (e) {}
        };

        sseInstance.onerror = () => {
          sseInstance?.close();
          sseReconnectTimer = setTimeout(setupSSE, 2000);
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
      }
    };

    setupSSE();

    // 2. High-speed lightweight heartbeat pulse check every 1 second (<40 bytes)
    const pulseInterval = setInterval(async () => {
      try {
        const since = lastSyncedTimestampRef.current || 0;
        const res = await fetch(`/api/restaurant/pulse?since=${since}`, {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.changed) {
            if (json.tables) {
              applyIncomingTables(json.tables, undefined, json.timestamp, json.serialConfig);
            }
            const hasFullUpdate = json.fullUpdateTimestamp && json.fullUpdateTimestamp > (lastFullSyncTimestampRef.current || 0);
            const hasSalesMismatch = json.salesCount !== undefined && json.salesCount !== (dataRef.current.sales?.length || 0);
            if (hasFullUpdate || hasSalesMismatch) {
              syncFromServer(false);
            }
          }
        }
      } catch (e) {}
    }, 1000);

    // 3. Instant multi-tab message listener (0ms on same device)
    const channel = posBroadcastChannelRef.current;
    let onBroadcast: ((evt: MessageEvent) => void) | null = null;
    if (channel) {
      onBroadcast = (evt: MessageEvent) => {
        if (evt.data?.sender === tabClientIdRef.current) return;
        if (evt.data?.type === 'POS_TABLES_UPDATE' && evt.data?.tables) {
          applyIncomingTables(evt.data.tables, evt.data.newSale, evt.data.timestamp, evt.data.serialConfig);
        } else if (evt.data?.type === 'POS_TAB_SYNC' && evt.data?.data) {
          isUpdatingFromSync.current = true;
          setData(evt.data.data);
          lastSyncedStringRef.current = JSON.stringify(evt.data.data);
          setTimeout(() => {
            isUpdatingFromSync.current = false;
          }, 100);
        }
      };
      channel.addEventListener('message', onBroadcast);
    }

    return () => {
      clearInterval(pulseInterval);
      clearTimeout(sseReconnectTimer);
      sseInstance?.close();
      if (channel && onBroadcast) {
        channel.removeEventListener('message', onBroadcast);
      }
    };
  }, []);

  // Real-time synchronization directly to Server database when state modified
  useEffect(() => {
    try {
      const now = Date.now();
      if (isInitialSyncDoneRef.current && !isUpdatingFromSync.current) {
        lastLocalEditTimeRef.current = now;

        // Debounced differential tables push (300ms batching) to eliminate network race conditions on rapid multi-item selection
        const curTablesStr = JSON.stringify(data.tables);
        if (curTablesStr !== lastSyncedTablesStrRef.current) {
          lastSyncedTablesStrRef.current = curTablesStr;
          const recentSale = (data.sales && data.sales.length > 0) ? data.sales[data.sales.length - 1] : undefined;
          const isRecentSettle = recentSale && (now - (recentSale.createdAt || recentSale.id || 0) < 5000);
          if (debounceTablesSyncTimerRef.current) clearTimeout(debounceTablesSyncTimerRef.current);
          debounceTablesSyncTimerRef.current = setTimeout(() => {
            syncPosTablesToServer(dataRef.current.tables, isRecentSettle ? recentSale : undefined);
          }, 300);
        }

        // Instant zero-lag broadcast to all other open tabs in this browser
        if (posBroadcastChannelRef.current) {
          try {
            posBroadcastChannelRef.current.postMessage({
              type: 'POS_TAB_SYNC',
              sender: tabClientIdRef.current,
              data
            });
          } catch (e) {}
        }

        // Debounced full state push to MongoDB
        if (debounceSyncTimerRef.current) clearTimeout(debounceSyncTimerRef.current);
        debounceSyncTimerRef.current = setTimeout(() => {
          syncToServer(data);
        }, 300);
      }
    } catch (e) {
      console.error("Error syncing app data:", e);
    }
  }, [data]);

  // Auth & RBAC Handlers
  const login = (identifier: string, pinOrPass?: string): boolean => {
    if (!identifier) return false;
    const userList = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
    const cleanId = identifier.toLowerCase().trim();
    const cleanDigits = identifier.replace(/\D/g, '');

    const found = userList.find(u => {
      if (u.isActive === false) return false;
      const uUsername = (u.username || '').toLowerCase().trim();
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');

      return (
        uUsername === cleanId ||
        (uEmail && uEmail === cleanId) ||
        (cleanDigits.length >= 6 && uPhoneDigits && (uPhoneDigits === cleanDigits || uPhoneDigits.endsWith(cleanDigits))) ||
        uId === cleanId ||
        uName === cleanId
      );
    });

    if (!found) return false;
    if (found.pinOrPassword && pinOrPass && found.pinOrPassword.trim() !== pinOrPass.trim()) {
      return false;
    }
    setCurrentUser(found);
    return true;
  };

  const loginByPin = (pin: string, userId?: string): boolean => {
    if (!pin) return false;
    const userList = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
    const cleanPin = pin.trim();

    if (userId) {
      const user = userList.find(u => u.id === userId && u.isActive !== false);
      if (user && (user.pinOrPassword || '').trim() === cleanPin) {
        setCurrentUser(user);
        return true;
      }
      return false;
    }

    const found = userList.find(u => u.isActive !== false && (u.pinOrPassword || '').trim() === cleanPin);
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const registerUser = (
    userData: Omit<AppUser, 'id'>, 
    branchKey: string
  ): { success: boolean; message: string; user?: AppUser } => {
    const validKey = data.restaurantProfile?.outletSecurityKey || 'BANANI-2026';
    if (!branchKey || branchKey.trim().toUpperCase() !== validKey.trim().toUpperCase()) {
      return { success: false, message: 'Invalid Branch Security Key. Please contact Restaurant Admin or use default code.' };
    }

    if (!userData.username || !userData.username.trim()) {
      return { success: false, message: 'Username is required.' };
    }

    const cleanUsername = userData.username.trim().toLowerCase();
    const userList = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
    const exists = userList.some(u => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      return { success: false, message: `Username "${userData.username}" is already taken. Please choose another.` };
    }

    const id = `USR-${(userList.length + 1).toString().padStart(2, '0')}`;
    const role = userData.role || 'CASHIER';
    const permissions = userData.permissions && userData.permissions.length > 0 
      ? userData.permissions 
      : (data.rolePermissions?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || ['pos']);

    const userToAdd: AppUser = {
      ...userData,
      id,
      name: userData.name?.trim() || userData.username.trim(),
      username: cleanUsername,
      role,
      permissions,
      isActive: true
    };

    setData(prev => ({
      ...prev,
      users: [...(prev.users || DEFAULT_USERS), userToAdd]
    }));

    setCurrentUser(userToAdd);
    return { success: true, message: 'Account successfully registered and authenticated!', user: userToAdd };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_TAB_KEY);
      localStorage.removeItem(ACTIVE_SUBNAV_KEY);
      localStorage.removeItem(ACTIVE_MODULE_KEY);
      localStorage.removeItem(ACTIVE_TABLE_ID_KEY);
      localStorage.removeItem(POS_VIEW_KEY);
      localStorage.removeItem('barcode_cafe_stock_start_date');
      localStorage.removeItem('barcode_cafe_stock_end_date');
    } catch (e) {
      console.error("Error removing user storage on logout:", e);
    }
  };

  const setSelectedZReportSession = (val: PosSessionRecord | null) => {
    setSelectedZReportSessionState(val);
    if (val === null && pendingLogoutAfterShiftClose) {
      setPendingLogoutAfterShiftClose(false);
      setTimeout(() => logout(), 100);
    }
  };

  const setSelectedDayEndPreview = (val: ConsolidatedDayReportData | null) => {
    setSelectedDayEndPreviewState(val);
    if (val === null && pendingLogoutAfterShiftClose) {
      setPendingLogoutAfterShiftClose(false);
      setTimeout(() => logout(), 100);
    }
  };

  const switchUser = (user: AppUser) => {
    setCurrentUser(user);
  };

  const addUser = (newUser: Omit<AppUser, 'id'>) => {
    const id = `USR-${((data.users || DEFAULT_USERS).length + 1).toString().padStart(2, '0')}`;
    const role = newUser.role || 'CASHIER';
    const permissions = newUser.permissions && newUser.permissions.length > 0 
      ? newUser.permissions 
      : (data.rolePermissions?.[role] || DEFAULT_ROLE_PERMISSIONS[role] || ['pos']);
    const userToAdd: AppUser = {
      ...newUser,
      id,
      role,
      permissions,
      isActive: newUser.isActive !== undefined ? newUser.isActive : true
    };
    setData(prev => ({
      ...prev,
      users: [...(prev.users || DEFAULT_USERS), userToAdd]
    }));
  };

  const editUser = (id: string, updates: Partial<AppUser>) => {
    setData(prev => {
      const currentList = prev.users || DEFAULT_USERS;
      const updatedList = currentList.map(u => {
        if (u.id === id) {
          const newRole = updates.role || u.role;
          const newPerms = updates.permissions || (updates.role ? (prev.rolePermissions?.[newRole] || DEFAULT_ROLE_PERMISSIONS[newRole]) : u.permissions);
          return { ...u, ...updates, permissions: newPerms };
        }
        return u;
      });
      return { ...prev, users: updatedList };
    });

    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    if (id === 'USR-01') {
      alert('Cannot delete the primary Executive Admin account.');
      return;
    }
    setData(prev => ({
      ...prev,
      users: (prev.users || DEFAULT_USERS).filter(u => u.id !== id)
    }));
    if (currentUser?.id === id) {
      setCurrentUser(DEFAULT_USERS[0]);
    }
  };

  const updateRolePermissions = (role: UserRole, permissions: ActiveTab[]) => {
    setData(prev => {
      const rolePerms = { ...(prev.rolePermissions || DEFAULT_ROLE_PERMISSIONS), [role]: permissions };
      const updatedUsers = (prev.users || DEFAULT_USERS).map(u => {
        if (u.role === role) {
          return { ...u, permissions };
        }
        return u;
      });
      return { ...prev, rolePermissions: rolePerms, users: updatedUsers };
    });

    if (currentUser?.role === role) {
      setCurrentUser(prev => prev ? { ...prev, permissions } : null);
    }
  };

  const updateOrderEditPermission = (role: UserRole, allowed: boolean) => {
    setData(prev => {
      const current = prev.orderEditPermissions || DEFAULT_ORDER_EDIT_PERMISSIONS;
      const updated = { ...current, [role]: allowed };
      return { ...prev, orderEditPermissions: updated };
    });
  };

  const canAccessTab = (tab: ActiveTab, ignoreShift: boolean = false): boolean => {
    if (!currentUser) return false;
    if (tab === 'launcher') return true;
    // Condition: Only Live POS ('pos') requires an active shift session (cash open / day start)
    if (!ignoreShift && tab === 'pos') {
      if (!data.session?.isActive) {
        return false;
      }
    }
    if (currentUser.role === 'ADMIN') return true;
    return (currentUser.permissions || []).includes(tab);
  };

  // Compute live Auto-BOM usage map from all sales
  const autoBomUsageMap: Record<number, number> = {};
  data.sales.forEach(sale => {
    if (!isSaleActive(sale)) return;
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(soldItem => {
        const menuItem = data.menuItems.find(m => m.id === soldItem.id);
        if (menuItem && menuItem.recipe && Array.isArray(menuItem.recipe)) {
          menuItem.recipe.forEach(ing => {
            const rawUsed = (Number(ing.qty) || 0) * (Number(soldItem.qty) || 0);
            autoBomUsageMap[ing.rawItemId] = (autoBomUsageMap[ing.rawItemId] || 0) + rawUsed;
          });
        }
      });
    }
  });

  // Calculate Metrics (Excluding voided / cancelled orders)
  const activeSalesList = data.sales.filter(isSaleActive);
  const totalSales = activeSalesList.reduce((sum, s) => sum + (s.total || 0), 0);
  const salesCount = activeSalesList.length;

  let totalPurchases = 0;
  let purchaseCount = 0;
  data.purchases.forEach(p => {
    if (p.status !== 'DRAFT') {
      totalPurchases += (p.total || 0);
      purchaseCount++;
    }
  });

  const rawVoucherExpenses = data.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Customer Receivables (Due)
  const custMap: Record<string, { due: number; coll: number }> = {};
  data.customers.forEach(c => { custMap[c] = { due: 0, coll: 0 }; });
  data.sales.forEach(s => {
    if (!isSaleActive(s)) return;
    if (s.dueGiven > 0 && s.dueCustomer) {
      if (!custMap[s.dueCustomer]) custMap[s.dueCustomer] = { due: 0, coll: 0 };
      custMap[s.dueCustomer].due += s.dueGiven;
    }
    const collCust = s.dueCollectedFrom || s.dueCustomer;
    if (s.dueCollected > 0 && collCust) {
      if (!custMap[collCust]) custMap[collCust] = { due: 0, coll: 0 };
      custMap[collCust].coll += s.dueCollected;
    }
  });
  let totalCustomerDue = 0;
  Object.keys(custMap).forEach(c => {
    const bal = custMap[c].due - custMap[c].coll;
    if (bal > 0) totalCustomerDue += bal;
  });

  // Vendor Payables
  const vMap: Record<string, { credit: number; paid: number; adjustedReturns: number }> = {};
  data.vendors.forEach(v => { vMap[v] = { credit: 0, paid: 0, adjustedReturns: 0 }; });
  data.purchases.forEach(p => {
    if (p.status === 'DRAFT') return;
    if (!vMap[p.vendor]) vMap[p.vendor] = { credit: 0, paid: 0, adjustedReturns: 0 };
    if ((p.paymentType || 'CREDIT') === 'CREDIT') {
      vMap[p.vendor].credit += (p.total || 0);
    }
  });
  data.payments.forEach(pay => {
    if (!vMap[pay.vendor]) vMap[pay.vendor] = { credit: 0, paid: 0, adjustedReturns: 0 };
    vMap[pay.vendor].paid += pay.amount;
  });
  (data.purchaseReturns || []).forEach(ret => {
    if (ret.refundStatus === 'ADJUSTED') {
      if (!vMap[ret.vendor]) vMap[ret.vendor] = { credit: 0, paid: 0, adjustedReturns: 0 };
      vMap[ret.vendor].adjustedReturns += (ret.total || 0);
    }
  });
  let totalVendorDue = 0;
  Object.keys(vMap).forEach(v => {
    const bal = vMap[v].credit - vMap[v].paid - vMap[v].adjustedReturns;
    if (bal > 0) totalVendorDue += bal;
  });

  // Stock, BOM, Usage and Wastage Valuations (matching StockValuationView)
  let totalOpeningStockVal = 0;
  let totalOpeningStockQty = 0;
  let totalPurchasesStockVal = 0;
  let totalPurchasesStockQty = 0;
  let totalBomCostVal = 0;
  let totalBomUsedQty = 0;
  let totalManualUsedCostVal = 0;
  let totalManualUsedQty = 0;
  let totalWastageCostVal = 0;
  let totalWastageQty = 0;
  let totalClosingStockVal = 0;
  let lowStockCount = 0;
  let negativeStockCount = 0;
  const totalStockItemsCount = data.masterItems.length;
  const rawItemRatesMap: Record<number, number> = {};

  data.masterItems.forEach(item => {
    let totalReceivedQty = 0;
    let totalReceivedVal = 0;
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (p.items && Array.isArray(p.items)) {
        p.items.forEach(sub => {
          if (sub.itemId === item.id || (sub.item && sub.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
            const q = Number(sub.qty) || 0;
            const r = Number(sub.rate) || 0;
            totalReceivedQty += q;
            totalReceivedVal += (q * r);
          }
        });
      }
    });

    (data.purchaseReturns || []).forEach(ret => {
      if (ret.itemId === item.id || (ret.item && ret.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
        const q = Number(ret.qty) || 0;
        const r = Number(ret.rate) || 0;
        totalReceivedQty = Math.max(0, totalReceivedQty - q);
        totalReceivedVal = Math.max(0, totalReceivedVal - (q * r));
      }
    });

    const invRecord = data.inventory.find(x => x.id === item.id);
    const openQty = invRecord ? (Number(invRecord.open) || 0) : 0;
    const manualUsedQty = invRecord ? (invRecord.manualUsed !== undefined ? Number(invRecord.manualUsed) : (Number(invRecord.used) || 0)) : 0;
    const wastageQty = invRecord ? (Number(invRecord.wastage) || 0) : 0;

    // Weighted Average Valuation Rate based on available Opening Stock + Inward Purchases
    const totalAvailableQty = openQty + totalReceivedQty;
    const totalAvailableVal = (openQty * (Number(item.defaultRate) || 0)) + totalReceivedVal;
    const weightedAvgRate = totalAvailableQty > 0 
      ? (totalAvailableVal / totalAvailableQty) 
      : (Number(item.defaultRate) || (invRecord && invRecord.rate ? Number(invRecord.rate) : 0));

    const valuationRate = weightedAvgRate;
    rawItemRatesMap[item.id] = valuationRate;

    const posBomUsedQty = autoBomUsageMap[item.id] || 0;

    const openVal = openQty * valuationRate;
    const bomVal = posBomUsedQty * valuationRate;
    const manualVal = manualUsedQty * valuationRate;
    const wasteVal = wastageQty * valuationRate;
    const totalOutwardQty = posBomUsedQty + manualUsedQty + wastageQty;
    const closingStockQty = (openQty + totalReceivedQty) - totalOutwardQty;
    const closingVal = Math.max(0, closingStockQty * valuationRate);

    if (closingStockQty < 0) {
      negativeStockCount++;
    } else if (closingStockQty <= 5) {
      lowStockCount++;
    }

    totalOpeningStockVal += openVal;
    totalOpeningStockQty += openQty;
    totalPurchasesStockVal += totalReceivedVal;
    totalPurchasesStockQty += totalReceivedQty;
    totalBomCostVal += bomVal;
    totalBomUsedQty += posBomUsedQty;
    totalManualUsedCostVal += manualVal;
    totalManualUsedQty += manualUsedQty;
    totalWastageCostVal += wasteVal;
    totalWastageQty += wastageQty;
    totalClosingStockVal += closingVal;
  });

  // Build usage maps for manual kitchen used and wastage
  const manualUsageMap: Record<number, number> = {};
  const wastageUsageMap: Record<number, number> = {};
  data.inventory.forEach(inv => {
    const mQty = inv.manualUsed !== undefined ? Number(inv.manualUsed) : (Number(inv.used) || 0);
    if (mQty > 0) manualUsageMap[inv.id] = mQty;
    const wQty = Number(inv.wastage) || 0;
    if (wQty > 0) wastageUsageMap[inv.id] = wQty;
  });

  // Dynamic BOM cost distribution across Chart of Accounts heads
  const bomCostPerAccount = computeCogsBomAllocation(
    data.masterItems,
    autoBomUsageMap,
    rawItemRatesMap,
    data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS,
    manualUsageMap,
    wastageUsageMap
  );

  // Total VAT collected / payable from active sales (COA TAX_PAYABLE)
  const currentVatPct = Number(data.restaurantProfile?.vatPercent ?? DEFAULT_RESTAURANT_PROFILE.vatPercent ?? 5);
  const isVatGloballyEnabled = Boolean(data.restaurantProfile?.enableVat ?? (currentVatPct > 0));
  const currentVatMode = data.restaurantProfile?.vatMode || 'inclusive';

  const totalSalesVAT = activeSalesList.reduce((sum, s) => {
    if (typeof s.vatVal === 'number' && s.vatVal >= 0) return sum + s.vatVal;
    if (isVatGloballyEnabled && currentVatPct > 0) {
      if (currentVatMode === 'exclusive') {
        return sum + Math.round(((s.subtotal || s.total) * currentVatPct) / 100 * 100) / 100;
      } else {
        return sum + Math.round(((s.total * currentVatPct) / (100 + currentVatPct)) * 100) / 100;
      }
    }
    return sum;
  }, 0);

  const coaList = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;

  // Dynamic COGS & Operating Expense adjustments from General Ledger Journal Entries
  let journalCogsDebit = 0;
  let journalOpExDebit = 0;

  (data.journalEntries || []).forEach(j => {
    const debitAcc = coaList.find(a => a.id === j.debitAccountId || a.code === j.debitAccountId);
    const creditAcc = coaList.find(a => a.id === j.creditAccountId || a.code === j.creditAccountId);

    if (debitAcc && debitAcc.type === 'EXPENSE') {
      const isCogs = (debitAcc.systemRole || getAccountSystemRole(debitAcc)) === 'COGS' || debitAcc.category === 'Cost of Goods Sold (BOM)';
      if (isCogs) journalCogsDebit += (j.amount || 0);
      else journalOpExDebit += (j.amount || 0);
    }

    if (creditAcc && creditAcc.type === 'EXPENSE') {
      const isCogs = (creditAcc.systemRole || getAccountSystemRole(creditAcc)) === 'COGS' || creditAcc.category === 'Cost of Goods Sold (BOM)';
      if (isCogs) journalCogsDebit -= (j.amount || 0);
      else journalOpExDebit -= (j.amount || 0);
    }
  });

  const totalExpenses = rawVoucherExpenses + Math.max(0, journalOpExDebit);
  const totalProductionCost = totalBomCostVal + totalManualUsedCostVal + totalWastageCostVal + Math.max(0, journalCogsDebit);
  const netSalesRevenue = Math.max(0, totalSales - totalSalesVAT);
  const estimatedProfit = netSalesRevenue - (totalProductionCost + totalExpenses);

  const methodList = (data.paymentMethods && data.paymentMethods.length > 0) ? data.paymentMethods : DEFAULT_PAYMENT_METHODS;

  // Helper to find configured payment method
  const getMethodConfig = (m?: string): PaymentMethodConfig | undefined => {
    if (!m) return undefined;
    const list = (data.paymentMethods && data.paymentMethods.length > 0) ? data.paymentMethods : DEFAULT_PAYMENT_METHODS;
    const norm = m.toLowerCase().trim();
    return list.find(pm => pm.id.toLowerCase() === norm || pm.name.toLowerCase() === norm || norm.includes(pm.id.toLowerCase()) || norm.includes(pm.name.toLowerCase()));
  };

  const hasDedicatedMfsHead = coaList.some(a => (a.systemRole || getAccountSystemRole(a)) === 'MOBILE_BANKING' || a.code === '1040');

  let payCash = 0;
  let payCard = 0;
  let payBkash = 0;
  let payNagad = 0;

  activeSalesList.forEach(s => {
    if (s.paymentBreakdown && typeof s.paymentBreakdown === 'object') {
      const handledMethodKeys = new Set<string>();
      Object.entries(s.paymentBreakdown).forEach(([key, rawAmt]) => {
        const amt = Number(rawAmt) || 0;
        if (amt <= 0 || key === 'byMethod') return;
        const normKey = key.toLowerCase().trim();

        // Advance adjustment or customer dues are NOT liquid fund receipts at POS settlement
        // Advance was already accounted for in cash/bank when initially deposited.
        if (normKey === 'advance' || normKey.includes('advance') || normKey === 'due' || normKey.includes('due') || normKey === 'credit') {
          return;
        }

        const matched = methodList.find(m => m.id.toLowerCase() === normKey || m.name.toLowerCase() === normKey);
        if (matched) {
          if (!handledMethodKeys.has(matched.id)) {
            handledMethodKeys.add(matched.id);
            handledMethodKeys.add(matched.name.toLowerCase());

            let targetRole: AccountSystemRole | undefined = undefined;
            if (matched.ledgerAccountId) {
              const linkedAcc = coaList.find(a => a.code === matched.ledgerAccountId || a.id === matched.ledgerAccountId);
              if (linkedAcc) {
                targetRole = linkedAcc.systemRole || getAccountSystemRole(linkedAcc);
              }
            }

            if (targetRole === 'BANK' || matched.type === 'BANK' || matched.type === 'CARD') {
              payCard += amt;
            } else if (targetRole === 'CASH' || matched.type === 'CASH') {
              payCash += amt;
            } else if (targetRole === 'MOBILE_BANKING' || matched.type === 'MFS') {
              if (hasDedicatedMfsHead) {
                const mNorm = `${matched.id} ${matched.name} ${matched.providerName || ''}`.toLowerCase();
                if (mNorm.includes('nagad')) payNagad += amt;
                else payBkash += amt;
              } else {
                // If no dedicated MFS account head in Chart of Accounts, settle into primary Bank Account
                payCard += amt;
              }
            } else if (matched.type === 'CREDIT' || targetRole === 'ACCOUNTS_RECEIVABLE') {
              // Customer receivable credit - not liquid cash/bank
            } else {
              payCard += amt;
            }
          }
        } else if (!handledMethodKeys.has(normKey)) {
          handledMethodKeys.add(normKey);
          if (normKey === 'cash') payCash += amt;
          else if (normKey === 'card') payCard += amt;
          else if (normKey === 'nagad') {
            if (hasDedicatedMfsHead) payNagad += amt;
            else payCard += amt;
          } else if (normKey === 'bkash') {
            if (hasDedicatedMfsHead) payBkash += amt;
            else payCard += amt;
          } else if (normKey === 'due' || normKey === 'credit' || normKey === 'advance') {
            // Customer credit receivable or advance adjustment
          } else {
            payCard += amt;
          }
        }
      });
    } else {
      payCash += (s.cash || 0);
      if (hasDedicatedMfsHead) {
        payCard += (s.card || 0);
        payBkash += (s.bkash || 0);
        payNagad += (s.nagad || 0);
      } else {
        payCard += (s.card || 0) + (s.bkash || 0) + (s.nagad || 0);
      }
    }
  });

  // Payment Account Live Balances (Cash Drawer, Bank Transfer, Cheque, bKash Merchant, Nagad Merchant, Petty Cash)
  const isExpenseCash = (m?: string) => {
    if (!m) return true;
    const norm = m.toLowerCase().trim();
    if (norm.includes('petty')) return false;
    if (norm.includes('cash in hand') || norm === 'cash' || norm === 'cash drawer' || norm === 'drawer') return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'CASH' && !cfg.name.toLowerCase().includes('petty');
  };
  const isExpensePettyCash = (m?: string) => {
    if (!m) return false;
    const norm = m.toLowerCase().trim();
    if (norm.includes('petty')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.ledgerAccountId === '1020' || (cfg?.type === 'CASH' && cfg?.name.toLowerCase().includes('petty'));
  };
  const isExpenseBank = (m?: string) => {
    if (!m) return false;
    const norm = m.toLowerCase().trim();
    if (norm.includes('bank') || norm.includes('card') || norm.includes('qr')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'BANK' || cfg?.type === 'CARD' || cfg?.type === 'BANGLA_QR';
  };
  const isExpenseBkash = (m?: string) => {
    if (!m) return false;
    const norm = m.toLowerCase().trim();
    if (norm.includes('bkash')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'MFS' && !cfg.name.toLowerCase().includes('nagad');
  };
  const isExpenseNagad = (m?: string) => {
    if (!m) return false;
    const norm = m.toLowerCase().trim();
    if (norm.includes('nagad')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'MFS' && cfg.name.toLowerCase().includes('nagad');
  };

  const cashExpenses = data.expenses.filter(e => isExpenseCash(e.paymentMethod)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const pettyCashExpenses = data.expenses.filter(e => isExpensePettyCash(e.paymentMethod)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const bankExpenses = data.expenses.filter(e => isExpenseBank(e.paymentMethod)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const bkashExpenses = data.expenses.filter(e => isExpenseBkash(e.paymentMethod)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const nagadExpenses = data.expenses.filter(e => isExpenseNagad(e.paymentMethod)).reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalCashPurchases = data.purchases
    .filter(p => p.status !== 'DRAFT' && p.paymentType === 'CASH')
    .reduce((sum, p) => sum + (p.total || 0), 0);
  const totalCashDueCollected = activeSalesList.reduce((sum, s) => sum + (s.dueCollected || 0), 0);

  const getAdvType = (method?: string): string => {
    if (!method) return 'CASH';
    const cfg = getMethodConfig(method);
    if (cfg) {
      if (cfg.type === 'CASH') return 'CASH';
      if (cfg.type === 'BANK' || cfg.type === 'CARD' || cfg.type === 'BANGLA_QR') return 'BANK';
      if (cfg.type === 'MFS') {
        if (cfg.name.toLowerCase().includes('nagad')) return 'NAGAD';
        return 'BKASH';
      }
    }
    const m = method.toUpperCase();
    if (m === 'CASH') return 'CASH';
    if (m === 'BANK' || m === 'CARD' || m.includes('QR')) return 'BANK';
    if (m === 'NAGAD') return 'NAGAD';
    if (m === 'BKASH') return 'BKASH';
    return 'CASH';
  };

  const advCash = (data.customerAdvances || [])
    .filter(a => getAdvType(a.method) === 'CASH')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const advBank = (data.customerAdvances || [])
    .filter(a => getAdvType(a.method) === 'BANK')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const advBkash = (data.customerAdvances || [])
    .filter(a => getAdvType(a.method) === 'BKASH')
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const advNagad = (data.customerAdvances || [])
    .filter(a => getAdvType(a.method) === 'NAGAD')
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  const isCashMethod = (m: string) => {
    const norm = (m || '').toLowerCase().trim();
    if (norm === 'cash drawer' || norm === 'cash' || norm.includes('cash') || norm.includes('drawer')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'CASH' || cfg?.ledgerAccountId === '1010';
  };
  const isBankMethod = (m: string) => {
    const norm = (m || '').toLowerCase().trim();
    if (norm === 'bank transfer' || norm === 'bank' || norm.includes('bank') || norm.includes('card') || norm.includes('qr')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'BANK' || cfg?.type === 'CARD' || cfg?.type === 'BANGLA_QR' || cfg?.ledgerAccountId === '1030';
  };
  const isChequeMethod = (m: string) => {
    const norm = (m || '').toLowerCase().trim();
    return norm === 'cheque' || norm.includes('cheque');
  };
  const isBkashMethod = (m: string) => {
    const norm = (m || '').toLowerCase().trim();
    if (norm === 'bkash merchant' || norm === 'bkash' || norm.includes('bkash')) return true;
    const cfg = getMethodConfig(m);
    return (cfg?.type === 'MFS' && !cfg.name.toLowerCase().includes('nagad')) || cfg?.ledgerAccountId === '1040';
  };
  const isNagadMethod = (m: string) => {
    const norm = (m || '').toLowerCase().trim();
    if (norm === 'nagad merchant' || norm === 'nagad' || norm.includes('nagad')) return true;
    const cfg = getMethodConfig(m);
    return cfg?.type === 'MFS' && cfg.name.toLowerCase().includes('nagad');
  };

  const vendorPayCash = data.payments.filter(p => isCashMethod(p.method)).reduce((sum, p) => sum + (p.amount || 0), 0);
  const vendorPayBank = data.payments.filter(p => isBankMethod(p.method)).reduce((sum, p) => sum + (p.amount || 0), 0);
  const vendorPayCheque = data.payments.filter(p => isChequeMethod(p.method)).reduce((sum, p) => sum + (p.amount || 0), 0);
  const vendorPayBkash = data.payments.filter(p => isBkashMethod(p.method)).reduce((sum, p) => sum + (p.amount || 0), 0);
  const vendorPayNagad = data.payments.filter(p => isNagadMethod(p.method)).reduce((sum, p) => sum + (p.amount || 0), 0);

  const getOpeningBalance = (roleOrCode: string, fallbackKeywords: string[] = []): number => {
    // 1. Dynamic ERP System Role mapping
    const matchByRole = coaList.find(a => (a.systemRole || getAccountSystemRole(a)) === roleOrCode);
    if (matchByRole) return Number(matchByRole.balance) || 0;

    // 2. Exact code or ID match
    const acc = coaList.find(a => a.code === roleOrCode || a.id === roleOrCode);
    if (acc) return Number(acc?.balance) || 0;

    // 3. Fallback keyword matching
    if (fallbackKeywords.length > 0) {
      const matchByKw = coaList.find(a => {
        const lowerName = (a.name || '').toLowerCase();
        const lowerCat = (a.category || '').toLowerCase();
        return fallbackKeywords.some(kw => lowerName.includes(kw) || lowerCat.includes(kw));
      });
      if (matchByKw) return Number(matchByKw.balance) || 0;
    }

    return 0;
  };

  const baseCashDrawer = getOpeningBalance('CASH', ['cash in hand', 'drawer']) || getOpeningBalance('1010');
  const basePettyCash = getOpeningBalance('PETTY_CASH', ['petty cash']) || getOpeningBalance('1020');
  const baseBank = getOpeningBalance('BANK', ['bank a/c', 'city bank']) || getOpeningBalance('1030');
  const baseCheque = 0;
  const baseBkash = getOpeningBalance('MOBILE_BANKING', ['bkash', 'nagad', 'mobile banking', 'mfs']) || getOpeningBalance('1040');
  const baseNagad = 0;

  // Active POS Shift / Business Day Opening Cash Drawer Float
  const activeShiftFloat = (data.session?.isActive && typeof data.session.openingCash === 'number' && data.session.openingCash > 0)
    ? data.session.openingCash
    : (data.businessDay?.isOpen && typeof data.businessDay.pendingHandoverFloat === 'number' && data.businessDay.pendingHandoverFloat > 0
        ? data.businessDay.pendingHandoverFloat
        : 0);

  const effectiveCashOpening = Math.max(baseCashDrawer, activeShiftFloat);

  // Cash Journal Effect for active drawer stats
  const cashJournalEffect = (data.journalEntries || []).reduce((sum, j) => {
    let delta = 0;
    if (j.debitAccountId === '1010' || (j.debitAccountName && j.debitAccountName.includes('1010'))) delta += (j.amount || 0);
    if (j.creditAccountId === '1010' || (j.creditAccountName && j.creditAccountName.includes('1010'))) delta -= (j.amount || 0);
    return sum + delta;
  }, 0);

  const rawCashDrawer = effectiveCashOpening + payCash + totalCashDueCollected + advCash - cashExpenses - totalCashPurchases - vendorPayCash;
  const cashDrawerBalance = rawCashDrawer + cashJournalEffect;

  const rawPettyCash = basePettyCash - pettyCashExpenses;
  const pettyCashBalance = rawPettyCash;

  const rawBankTransfer = baseBank + payCard + advBank - vendorPayBank - bankExpenses;
  const bankTransferBalance = rawBankTransfer;

  const chequeBalance = baseCheque - vendorPayCheque;

  const rawBkashMerchant = baseBkash + payBkash + advBkash - vendorPayBkash - bkashExpenses;
  const bkashMerchantBalance = rawBkashMerchant;

  const rawNagadMerchant = baseNagad + payNagad + advNagad - vendorPayNagad - nagadExpenses;
  const nagadMerchantBalance = rawNagadMerchant;

  const openTables = useMemo(() => {
    return (data.tables || []).filter(t => t.status !== 'free' && (t.cart?.length > 0 || t.status === 'billed' || t.status === 'hold'));
  }, [data.tables]);

  const occupiedTablesCount = data.tables.filter(t => t.status !== 'free').length;
  const freeTablesCount = data.tables.length - occupiedTablesCount;

  // Top Selling items (Excluding voided orders)
  const itemSalesCountMap: Record<string, number> = {};
  activeSalesList.forEach(s => {
    if (s.items && Array.isArray(s.items)) {
      s.items.forEach(i => {
        itemSalesCountMap[i.name] = (itemSalesCountMap[i.name] || 0) + (i.qty || 1);
      });
    }
  });
  const topSellingItems = Object.keys(itemSalesCountMap)
    .map(name => ({ name, qty: itemSalesCountMap[name] }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  // Active Session Live Statistics
  const activeSessionStats = useMemo(() => {
    if (!data.session || !data.session.isActive) {
      return {
        cashSales: 0,
        cardSales: 0,
        bkashSales: 0,
        nagadSales: 0,
        dueSales: 0,
        totalSales: 0,
        orderCount: 0,
        expectedCash: 0,
        saleIds: [] as number[]
      };
    }

    const currentSessionId = data.session.id;
    const sessionStartTs = data.session.startTimestamp || 0;
    const sessionStartDate = data.session.startDate || new Date().toISOString().split('T')[0];

    const sessionSales = data.sales.filter(s => {
      // 1. Exact match by sessionId if present
      if (s.sessionId && currentSessionId) {
        return s.sessionId === currentSessionId;
      }
      // 2. Match by timestamp for real sales (s.createdAt or s.id timestamp)
      if (sessionStartTs > 0) {
        const saleTs = s.createdAt || (typeof s.id === 'number' && s.id > 1000000000000 ? s.id : 0);
        if (saleTs > 0) {
          return saleTs >= sessionStartTs;
        }
      }
      // 3. Fallback for legacy static mocked data
      return s.date === sessionStartDate;
    });

    const activeSessionSales = sessionSales.filter(isSaleActive);
    const voidedSessionSales = sessionSales.filter(s => !isSaleActive(s));

    const cashSales = activeSessionSales.reduce((sum, s) => sum + (s.cash || 0), 0);
    const cardSales = activeSessionSales.reduce((sum, s) => sum + (s.card || 0), 0);
    const bkashSales = activeSessionSales.reduce((sum, s) => sum + (s.bkash || 0), 0);
    const nagadSales = activeSessionSales.reduce((sum, s) => sum + (s.nagad || 0), 0);
    const dueSales = activeSessionSales.reduce((sum, s) => sum + (s.dueGiven || 0), 0);
    const totalSales = activeSessionSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const expectedCash = (data.session.openingCash || 0) + cashSales;
    const saleIds = activeSessionSales.map(s => s.id);
    const voidCount = voidedSessionSales.length;
    const voidTotal = voidedSessionSales.reduce((sum, s) => sum + (s.total || 0), 0);

    return {
      cashSales,
      cardSales,
      bkashSales,
      nagadSales,
      dueSales,
      totalSales,
      orderCount: activeSessionSales.length,
      expectedCash,
      saleIds,
      voidCount,
      voidTotal
    };
  }, [data.session, data.sales]);

  // Table & Cart Operations
  const selectTable = (tableId: string) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    // Synchronously bind active table and view refs to prevent race conditions during rapid entry
    activeTableIdRef.current = tableId;
    posViewRef.current = 'order';
    const targetTable = data.tables?.find(t => t.id === tableId);
    if (targetTable && (!targetTable.cart || targetTable.cart.length === 0) && !targetTable.linkedSaleId && targetTable.status !== 'free') {
      const sanitized = data.tables.map(t => t.id === tableId ? {
        ...t,
        status: 'free' as const,
        waiter: '',
        customer: 'Walk-in Customer',
        channelOrAgentId: 'dine_in',
        cart: [],
        discountVal: 0,
        orderRef: undefined,
        kotCount: 0,
        billCount: 0
      } : t);
      lastLocalEditTimeRef.current = Date.now();
      lastSyncedTablesStrRef.current = JSON.stringify(sanitized);
      setData(prev => ({
        ...prev,
        tables: sanitized
      }));
      syncPosTablesToServer(sanitized);
    }
    setActiveTableId(tableId);
    setPosView('order');
  };

  // Commission Agents & Channel Management
  const addCommissionAgent = (agent: Omit<CommissionAgent, 'id'> & { id?: string }) => {
    const id = agent.id || agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    const newAgent: CommissionAgent = {
      ...agent,
      id,
      isActive: agent.isActive !== undefined ? agent.isActive : true
    };
    setData(prev => ({
      ...prev,
      commissionAgents: [...(prev.commissionAgents || DEFAULT_COMMISSION_AGENTS), newAgent]
    }));
  };

  const updateCommissionAgent = (id: string, updates: Partial<CommissionAgent>) => {
    setData(prev => ({
      ...prev,
      commissionAgents: (prev.commissionAgents || DEFAULT_COMMISSION_AGENTS).map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  };

  const deleteCommissionAgent = (id: string) => {
    setData(prev => ({
      ...prev,
      commissionAgents: (prev.commissionAgents || DEFAULT_COMMISSION_AGENTS).filter(a => a.id !== id)
    }));
  };

  // Hardware Printers (USB & LAN)
  const addPrinter = (printer: Omit<PrinterConfig, 'id'> & { id?: string }) => {
    const id = printer.id || 'PRN-' + Date.now().toString().slice(-4);
    const newPrinter: PrinterConfig = {
      ...printer,
      id,
      isActive: printer.isActive !== undefined ? printer.isActive : true,
      printOnBill: printer.printOnBill !== undefined ? printer.printOnBill : true,
      printOnSettle: printer.printOnSettle !== undefined ? printer.printOnSettle : true
    };
    setData(prev => ({
      ...prev,
      printers: [...(prev.printers || DEFAULT_PRINTERS), newPrinter]
    }));
  };

  const updatePrinter = (id: string, updates: Partial<PrinterConfig>) => {
    setData(prev => ({
      ...prev,
      printers: (prev.printers || DEFAULT_PRINTERS).map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  };

  const deletePrinter = (id: string) => {
    setData(prev => ({
      ...prev,
      printers: (prev.printers || DEFAULT_PRINTERS).filter(p => p.id !== id)
    }));
  };

  // Bill & KOT Print Templates
  const addPrintTemplate = (tpl: Omit<PrintTemplate, 'id'> & { id?: string }) => {
    const id = tpl.id || 'TPL-' + Date.now().toString().slice(-4);
    const newTpl: PrintTemplate = {
      ...tpl,
      id,
      showPricesOnKot: Boolean(tpl.showPricesOnKot),
      isActive: tpl.isActive !== undefined ? tpl.isActive : true
    };
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const currentList = prev.printTemplates || DEFAULT_PRINT_TEMPLATES;
      const updatedList = newTpl.isDefault
        ? currentList.map(t => (t.templateType === newTpl.templateType || t.templateType === 'BOTH') ? { ...t, isDefault: false } : t)
        : currentList;
      return {
        ...prev,
        printTemplates: [...updatedList, newTpl]
      };
    });
  };

  const updatePrintTemplate = (id: string, updates: Partial<PrintTemplate>) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const currentList = prev.printTemplates || DEFAULT_PRINT_TEMPLATES;
      const target = currentList.find(t => t.id === id);
      const targetType = updates.templateType || target?.templateType || 'KOT';
      return {
        ...prev,
        printTemplates: currentList.map(t => {
          if (t.id === id) {
            return {
              ...t,
              ...updates,
              showPricesOnKot: updates.showPricesOnKot !== undefined ? Boolean(updates.showPricesOnKot) : Boolean(t.showPricesOnKot)
            };
          }
          if (updates.isDefault && (t.templateType === targetType || t.templateType === 'BOTH')) {
            return { ...t, isDefault: false };
          }
          return t;
        })
      };
    });
  };

  const setDefaultPrintTemplate = (id: string) => {
    updatePrintTemplate(id, { isDefault: true });
  };

  const setAllKotShowPrices = (show: boolean) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const currentList = prev.printTemplates || DEFAULT_PRINT_TEMPLATES;
      const updatedList = currentList.map(t => {
        if (t.templateType === 'KOT' || t.templateType === 'BOTH') {
          return {
            ...t,
            showPricesOnKot: Boolean(show)
          };
        }
        return t;
      });
      return {
        ...prev,
        printTemplates: updatedList
      };
    });
  };

  const deletePrintTemplate = (id: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      printTemplates: (prev.printTemplates || DEFAULT_PRINT_TEMPLATES).filter(t => t.id !== id)
    }));
  };

  const duplicatePrintTemplate = (id: string) => {
    const existing = (data.printTemplates || DEFAULT_PRINT_TEMPLATES).find(t => t.id === id);
    if (!existing) return;
    const newId = 'TPL-' + Date.now().toString().slice(-4);
    const duplicated: PrintTemplate = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      isDefault: false
    };
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      printTemplates: [...(prev.printTemplates || DEFAULT_PRINT_TEMPLATES), duplicated]
    }));
  };

  // Payment Methods Configuration & Management
  const addPaymentMethod = (method: Omit<PaymentMethodConfig, 'id'> & { id?: string }) => {
    lastLocalEditTimeRef.current = Date.now();
    const id = method.id || method.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    const newMethod: PaymentMethodConfig = {
      ...method,
      id,
      isActive: method.isActive !== undefined ? method.isActive : true
    };
    setData(prev => ({
      ...prev,
      paymentMethods: [...(prev.paymentMethods || DEFAULT_PAYMENT_METHODS), newMethod]
    }));
  };

  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethodConfig>) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const currentList = prev.paymentMethods || DEFAULT_PAYMENT_METHODS;
      return {
        ...prev,
        paymentMethods: currentList.map(m => {
          if (m.id === id) {
            return { ...m, ...updates };
          }
          if (updates.isDefault) {
            return { ...m, isDefault: false };
          }
          return m;
        })
      };
    });
  };

  const deletePaymentMethod = (id: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      paymentMethods: (prev.paymentMethods || DEFAULT_PAYMENT_METHODS).filter(m => m.id !== id)
    }));
  };

  const setDefaultPaymentMethod = (id: string) => {
    updatePaymentMethod(id, { isDefault: true });
  };

  const setTableChannel = (tableId: string, channelOrAgentId: string) => {
    setData(prev => {
      const agents = prev.commissionAgents || DEFAULT_COMMISSION_AGENTS;
      const agent = agents.find(a => a.id === channelOrAgentId);

      const updatedTables = prev.tables.map(t => {
        if (t.id !== tableId) return t;

        // Auto discount when commission agent is selected as customer / channel
        let discountVal = t.discountVal;
        let discountType = t.discountType;
        let customerName = t.customer;

        if (agent) {
          customerName = `${agent.name} (Commission Agent)`;
          // Automatically set channel commission or auto discount if configured
          if (agent.commissionPercent > 0) {
            discountType = 'percent';
            discountVal = agent.commissionPercent;
          }
        } else if (channelOrAgentId === 'dine_in') {
          customerName = 'Walk-in Customer';
          discountVal = 0;
        }

        // Recalculate cart items with channel specific pricing or multiplier
        const updatedCart = t.cart.map(cartItem => {
          const dish = prev.menuItems.find(m => m.id === cartItem.id);
          if (!dish) return cartItem;

          let unitPrice = cartItem.selectedVariation ? cartItem.selectedVariation.price : dish.price;

          if (channelOrAgentId && channelOrAgentId !== 'dine_in') {
            if (dish.channelPrices?.[channelOrAgentId]) {
              unitPrice = dish.channelPrices[channelOrAgentId];
            } else if (agent?.priceListMultiplier && agent.priceListMultiplier > 1) {
              unitPrice = Math.round(unitPrice * agent.priceListMultiplier);
            }
          }

          if (cartItem.selectedAddons && cartItem.selectedAddons.length > 0) {
            const addonTotal = cartItem.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
            unitPrice += addonTotal;
          }

          return {
            ...cartItem,
            price: unitPrice,
            appliedChannel: agent?.name
          };
        });

        return {
          ...t,
          channelOrAgentId,
          customer: customerName,
          discountType,
          discountVal,
          cart: updatedCart
        };
      });

      return { ...prev, tables: updatedTables };
    });
  };

  const applyTablePromoCode = (tableId: string, promoCode: string): boolean => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return false;

    let matchedPromo: MenuItemPromo | null = null;
    data.menuItems.forEach(dish => {
      if (dish.promo && dish.promo.isActive && dish.promo.code.toUpperCase() === code) {
        matchedPromo = dish.promo;
      }
    });

    if (matchedPromo) {
      const p = matchedPromo as MenuItemPromo;
      setData(prev => ({
        ...prev,
        tables: prev.tables.map(t => {
          if (t.id !== tableId) return t;
          return {
            ...t,
            discountType: p.discountType,
            discountVal: p.discountVal
          };
        })
      }));
      return true;
    }
    return false;
  };

  const addToCart = (
    tableId: string, 
    menuItemId: number, 
    variation?: MenuItemVariation, 
    addons?: MenuItemAddon[], 
    notes?: string,
    customQty?: number
  ) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const menuItem = data.menuItems.find(m => m.id === menuItemId);
    if (!menuItem) return;

    const addQty = customQty && customQty > 0 ? customQty : 1;
    lastLocalEditTimeRef.current = Date.now();

    setData(prev => {
      const table = prev.tables.find(t => t.id === tableId);
      if (!table) return prev;
      if (table.status === 'billed') {
        alert('This table order is already billed. Cannot add new items after bill print.');
        return prev;
      }

      const channelId = table.channelOrAgentId || 'dine_in';
      const agents = prev.commissionAgents || DEFAULT_COMMISSION_AGENTS;
      const agent = agents.find(a => a.id === channelId);

      // Base unit price
      let unitPrice = variation ? variation.price : menuItem.price;

      // Channel Custom Price or Multiplier
      if (channelId !== 'dine_in') {
        if (menuItem.channelPrices?.[channelId]) {
          unitPrice = menuItem.channelPrices[channelId];
        } else if (agent?.priceListMultiplier && agent.priceListMultiplier > 1) {
          unitPrice = Math.round(unitPrice * agent.priceListMultiplier);
        }
      }

      // Add-ons total
      if (addons && addons.length > 0) {
        const addonsTotal = addons.reduce((sum, a) => sum + (a.price || 0), 0);
        unitPrice += addonsTotal;
      }

      const cartItemId = `${menuItem.id}-${variation?.id || 'std'}-${(addons || []).map(a => a.id).sort().join('_')}-${notes || ''}`;

      let displayName = menuItem.name;
      if (variation) {
        displayName += ` (${variation.name})`;
      }
      if (addons && addons.length > 0) {
        displayName += ` + [${addons.map(a => a.name).join(', ')}]`;
      }

      const existingCart = [...table.cart];
      const existingIdx = existingCart.findIndex(c => (c.cartItemId || `${c.id}`) === cartItemId);

      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      if (existingIdx >= 0) {
        existingCart[existingIdx] = {
          ...existingCart[existingIdx],
          qty: existingCart[existingIdx].qty + addQty,
          addedAt: existingCart[existingIdx].addedAt || now,
          addedAtTime: existingCart[existingIdx].addedAtTime || timeStr
        };
      } else {
        existingCart.push({
          id: menuItem.id,
          cartItemId,
          name: displayName,
          department: menuItem.department,
          category: menuItem.category,
          basePrice: menuItem.price,
          price: unitPrice,
          qty: addQty,
          selectedVariation: variation,
          selectedAddons: addons,
          appliedChannel: agent?.name,
          notes,
          addedAt: now,
          addedAtTime: timeStr
        });
      }

      const todayDateStr = prev.businessDay?.date || new Date().toISOString().split('T')[0];
      const { updated: resetCheckedConfig, changed: resetChanged } = checkAndResetSerialConfig(
        prev.serialConfig || DEFAULT_SERIAL_CONFIG,
        todayDateStr
      );
      let activeSerialConfig = { ...resetCheckedConfig };
      if (activeSerialConfig.kotPrefix === 'KOT-ORD-') activeSerialConfig.kotPrefix = 'KOT-';
      let serialAllocated = resetChanged;

      const updatedTables = prev.tables.map(t => {
        if (t.id !== tableId) return t;
        const assignedWaiter = t.waiter || (currentUser?.role === 'WAITER' ? currentUser.name : '');
        
        let orderRef = t.orderRef;
        let kotBaseSerial = t.kotBaseSerial;

        if (!orderRef) {
          const num = activeSerialConfig.orderRefNextNumber || 1;
          const padded = String(num).padStart(activeSerialConfig.orderRefPadding || 4, '0');
          orderRef = `${activeSerialConfig.orderRefPrefix || 'ORD-'}${padded}`;
          activeSerialConfig.orderRefNextNumber = num + 1;
          serialAllocated = true;
        }

        if (!kotBaseSerial || kotBaseSerial.startsWith('KOT-ORD-')) {
          const num = activeSerialConfig.kotNextNumber || 1;
          const padded = String(num).padStart(activeSerialConfig.kotPadding || 4, '0');
          const effKotPrefix = (activeSerialConfig.kotPrefix && activeSerialConfig.kotPrefix !== 'KOT-ORD-') ? activeSerialConfig.kotPrefix : 'KOT-';
          if (activeSerialConfig.kotIncludeDate) {
            const dateStr = todayDateStr.replace(/-/g, '');
            kotBaseSerial = `${effKotPrefix}${dateStr}-${padded}`;
          } else {
            kotBaseSerial = `${effKotPrefix}${padded}`;
          }
          activeSerialConfig.kotNextNumber = num + 1;
          serialAllocated = true;
        }

        return {
          ...t,
          status: t.status === 'free' ? 'hold' : t.status,
          cart: existingCart,
          waiter: assignedWaiter,
          orderRef,
          kotBaseSerial,
          orderCreatedBy: t.orderCreatedBy || currentUser?.name || 'Cashier',
          orderCreatedRole: t.orderCreatedRole || currentUser?.role || 'CASHIER',
          orderCreatedId: t.orderCreatedId || currentUser?.id,
          orderCreatedAt: t.orderCreatedAt || now
        };
      });

      const nextState = { 
        ...prev, 
        tables: updatedTables,
        serialConfig: serialAllocated ? activeSerialConfig : prev.serialConfig
      };
      dataRef.current = nextState;
      return nextState;
    });
  };

  const updateCartQty = (tableId: string, menuItemId: number, delta: number) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedTables = prev.tables.map(table => {
        if (table.id !== tableId) return table;
        let existingCart = [...table.cart];
        const itemIdx = existingCart.findIndex(c => c.id === menuItemId);
        if (itemIdx >= 0) {
          const newQty = existingCart[itemIdx].qty + delta;
          if (newQty <= 0) {
            existingCart = existingCart.filter((_, idx) => idx !== itemIdx);
          } else {
            existingCart[itemIdx] = {
              ...existingCart[itemIdx],
              qty: newQty
            };
          }
        }
        return {
          ...table,
          status: table.status === 'billed' ? 'hold' : table.status,
          cart: existingCart
        };
      });
      return { ...prev, tables: updatedTables };
    });
  };

  const updateCartItemQty = (tableId: string, cartItemIdOrIdx: string | number, delta: number) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedTables = prev.tables.map(table => {
        if (table.id !== tableId) return table;
        let existingCart = table.cart.map(c => ({ ...c }));
        
        const itemIdx = typeof cartItemIdOrIdx === 'number'
          ? cartItemIdOrIdx
          : existingCart.findIndex(c => (c.cartItemId || `${c.id}`) === cartItemIdOrIdx || c.id === Number(cartItemIdOrIdx));

        if (table.status === 'billed') {
          alert('This table order is already billed. Cannot change quantity after bill print.');
          return table;
        }
        if (itemIdx >= 0 && itemIdx < existingCart.length) {
          const newQty = existingCart[itemIdx].qty + delta;
          if (newQty <= 0) {
            existingCart.splice(itemIdx, 1);
          } else {
            existingCart[itemIdx] = {
              ...existingCart[itemIdx],
              qty: newQty
            };
          }
        }
        const isNowEmpty = existingCart.length === 0;
        return {
          ...table,
          status: isNowEmpty ? 'free' : table.status,
          waiter: isNowEmpty ? '' : table.waiter,
          customer: isNowEmpty ? 'Walk-in Customer' : table.customer,
          discountVal: isNowEmpty ? 0 : table.discountVal,
          channelOrAgentId: isNowEmpty ? 'dine_in' : table.channelOrAgentId,
          orderCreatedAt: isNowEmpty ? undefined : table.orderCreatedAt,
          orderCreatedBy: isNowEmpty ? undefined : table.orderCreatedBy,
          orderCreatedRole: isNowEmpty ? undefined : table.orderCreatedRole,
          orderCreatedId: isNowEmpty ? undefined : table.orderCreatedId,
          billedAt: isNowEmpty ? undefined : table.billedAt,
          billedAtTime: isNowEmpty ? undefined : table.billedAtTime,
          cart: existingCart
        };
      });
      const nextState = { ...prev, tables: updatedTables };
      dataRef.current = nextState;
      return nextState;
    });
  };

  const setCartItemQty = (tableId: string, cartItemIdOrIdx: string | number, newQty: number) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const safeQty = Math.max(1, Math.floor(Number(newQty) || 1));
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedTables = prev.tables.map(table => {
        if (table.id !== tableId) return table;
        let existingCart = table.cart.map(c => ({ ...c }));
        
        const itemIdx = typeof cartItemIdOrIdx === 'number'
          ? cartItemIdOrIdx
          : existingCart.findIndex(c => (c.cartItemId || `${c.id}`) === cartItemIdOrIdx || c.id === Number(cartItemIdOrIdx));

        if (table.status === 'billed') {
          alert('This table order is already billed. Cannot change quantity after bill print.');
          return table;
        }
        if (itemIdx >= 0 && itemIdx < existingCart.length) {
          existingCart[itemIdx] = {
            ...existingCart[itemIdx],
            qty: safeQty
          };
        }
        return {
          ...table,
          cart: existingCart
        };
      });
      const nextState = { ...prev, tables: updatedTables };
      dataRef.current = nextState;
      return nextState;
    });
  };

  const updateCartItemNotes = (tableId: string, cartItemIdOrIdx: string | number, notes: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedTables = prev.tables.map(table => {
        if (table.id !== tableId) return table;
        const existingCart = table.cart.map((c, idx) => {
          const match = typeof cartItemIdOrIdx === 'number'
            ? idx === cartItemIdOrIdx
            : (c.cartItemId || `${c.id}`) === cartItemIdOrIdx || c.id === Number(cartItemIdOrIdx);
          if (match) {
            return {
              ...c,
              notes: notes.trim() ? notes.trim() : undefined
            };
          }
          return c;
        });
        return {
          ...table,
          cart: existingCart
        };
      });
      return { ...prev, tables: updatedTables };
    });
  };

  const removeCartItem = (tableId: string, cartItemIdOrIdx: string | number) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedTables = prev.tables.map(table => {
        if (table.id !== tableId) return table;
        const existingCart = table.cart.filter((c, idx) => {
          if (typeof cartItemIdOrIdx === 'number') return idx !== cartItemIdOrIdx;
          return (c.cartItemId || `${c.id}`) !== cartItemIdOrIdx && c.id !== Number(cartItemIdOrIdx);
        });
        const isNowEmpty = existingCart.length === 0;
        return {
          ...table,
          status: isNowEmpty ? 'free' : (table.status === 'billed' ? 'hold' : table.status),
          waiter: isNowEmpty ? '' : table.waiter,
          customer: isNowEmpty ? 'Walk-in Customer' : table.customer,
          discountVal: isNowEmpty ? 0 : table.discountVal,
          channelOrAgentId: isNowEmpty ? 'dine_in' : table.channelOrAgentId,
          orderCreatedAt: isNowEmpty ? undefined : table.orderCreatedAt,
          orderCreatedBy: isNowEmpty ? undefined : table.orderCreatedBy,
          orderCreatedRole: isNowEmpty ? undefined : table.orderCreatedRole,
          orderCreatedId: isNowEmpty ? undefined : table.orderCreatedId,
          billedAt: isNowEmpty ? undefined : table.billedAt,
          billedAtTime: isNowEmpty ? undefined : table.billedAtTime,
          cart: existingCart
        };
      });
      const nextState = { ...prev, tables: updatedTables };
      dataRef.current = nextState;
      return nextState;
    });
  };

  const clearCart = (tableId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedTables = prev.tables.map(t => t.id === tableId ? { 
        ...t, 
        cart: [], 
        status: 'free' as const, 
        waiter: '', 
        discountVal: 0,
        channelOrAgentId: 'dine_in',
        customer: 'Walk-in Customer',
        orderCreatedBy: undefined,
        orderCreatedRole: undefined,
        orderCreatedId: undefined,
        orderCreatedAt: undefined,
        billedAt: undefined,
        billedAtTime: undefined
      } : t);
      const nextState = {
        ...prev,
        tables: updatedTables
      };
      dataRef.current = nextState;
      syncPosTablesToServer(updatedTables, undefined, 'CART_CLEAR');
      return nextState;
    });
  };

  const setTableDiscount = (tableId: string, type: DiscountType, val: number) => {
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? { ...t, discountType: type, discountVal: val } : t)
    }));
  };

  const setTableWaiter = (tableId: string, waiter: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? { 
        ...t, 
        waiter,
        orderCreatedBy: t.orderCreatedBy || currentUser?.name || 'Staff',
        orderCreatedRole: t.orderCreatedRole || currentUser?.role || 'CASHIER',
        orderCreatedId: t.orderCreatedId || currentUser?.id,
        orderCreatedAt: t.orderCreatedAt || Date.now()
      } : t)
    }));
  };

  const setTableCustomer = (tableId: string, customer: string) => {
    lastLocalEditTimeRef.current = Date.now();
    const trimmed = (customer || '').trim();
    setData(prev => {
      const agents = prev.commissionAgents || DEFAULT_COMMISSION_AGENTS;
      const matchedAgent = agents.find(a => 
        a.id.toLowerCase() === trimmed.toLowerCase() || 
        a.name.toLowerCase() === trimmed.toLowerCase() ||
        trimmed.toLowerCase().includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(trimmed.toLowerCase())
      );
      
      return {
        ...prev,
        tables: prev.tables.map(t => {
          if (t.id !== tableId) return t;
          let discountType: DiscountType = t.discountType;
          let discountVal = t.discountVal;
          let channelOrAgentId = t.channelOrAgentId;
          let finalCustomerName = trimmed || 'Walk-in Customer';

          if (matchedAgent) {
            channelOrAgentId = matchedAgent.id;
            discountType = 'percent';
            discountVal = matchedAgent.commissionPercent;
            finalCustomerName = matchedAgent.name;

            // Recalculate cart items with channel specific pricing
            const updatedCart = t.cart.map(cartItem => {
              const dish = prev.menuItems.find(m => m.id === cartItem.id);
              if (!dish) return cartItem;

              let unitPrice = cartItem.selectedVariation ? cartItem.selectedVariation.price : dish.price;
              if (dish.channelPrices?.[matchedAgent.id]) {
                unitPrice = dish.channelPrices[matchedAgent.id];
              } else if (matchedAgent.priceListMultiplier && matchedAgent.priceListMultiplier > 1) {
                unitPrice = Math.round(unitPrice * matchedAgent.priceListMultiplier);
              }

              if (cartItem.selectedAddons && cartItem.selectedAddons.length > 0) {
                const addonTotal = cartItem.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
                unitPrice += addonTotal;
              }

              return {
                ...cartItem,
                price: unitPrice,
                appliedChannel: matchedAgent.name
              };
            });

            return { 
              ...t, 
              customer: finalCustomerName, 
              channelOrAgentId,
              discountType, 
              discountVal,
              cart: updatedCart
            };
          } else {
            const isWalkIn = finalCustomerName.toLowerCase().includes('walk-in');
            if (isWalkIn) {
              channelOrAgentId = 'dine_in';
              discountVal = 0;
            }
            return {
              ...t,
              customer: finalCustomerName,
              channelOrAgentId,
              discountVal
            };
          }
        })
      };
    });
  };

  const setTableZone = (tableId: string, zone: string) => {
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? { ...t, zone } : t)
    }));
  };

  const holdTableOrder = (tableId: string) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const table = data.tables.find(t => t.id === tableId);
    if (!table || table.cart.length === 0) {
      alert('Please add food items to the table order first!');
      return;
    }
    if (!table.waiter) {
      alert('Please select a waiter for this table!');
      return;
    }
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? { ...t, status: 'hold' } : t)
    }));
    alert(`${table.name} (${table.zone || 'Floor 1'}) order has been held (Hold status).`);
    setPosView('floor');
  };

  const unlockBilledTable = (tableId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            status: 'hold',
            isBillPrinted: false
          };
        }
        return t;
      })
    }));
  };


  const updateGlobalTableDimensions = (dims: { width: number; height: number }) => {
    setData(prev => ({
      ...prev,
      tableDimensions: dims
    }));
  };

  const openPrintKot = (tableId: string, showModal: boolean = false) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const table = data.tables.find(t => t.id === tableId);
    if (!table || table.cart.length === 0) {
      alert('No food items in this table order to print KOT!');
      return;
    }

    if (table.status === 'billed') {
      alert('This table order is already billed. Cannot submit KOT after bill has been printed.');
      return;
    }

    // Determine unprinted items (items with unsentQty > 0)
    const unprintedItems = table.cart.map(item => {
      const alreadyPrintedQty = item.kotPrintedQty || (item.kotPrinted ? item.qty : 0);
      const unsentQty = Math.max(0, item.qty - alreadyPrintedQty);
      return {
        ...item,
        unsentQty
      };
    }).filter(i => i.unsentQty > 0);

    if (unprintedItems.length === 0) {
      alert('All items in this table order have already been sent to the kitchen via KOT!');
      return;
    }

    const orderRef = table.orderRef || ('ORD-' + Date.now().toString().slice(-5));
    const nextKotCount = (table.kotCount || 0) + 1;
    const isAddonKot = nextKotCount > 1;
    const linkedInvoiceNo = table.linkedInvoiceNo || ('POS-' + Date.now().toString().slice(-6));
    let activeSerialConfig = { ...(data.serialConfig || DEFAULT_SERIAL_CONFIG) };
    if (activeSerialConfig.kotPrefix === 'KOT-ORD-') activeSerialConfig.kotPrefix = 'KOT-';
    let baseKotNo = table.kotBaseSerial;
    let serialConfigChanged = false;

    if (!baseKotNo || baseKotNo.startsWith('KOT-ORD-')) {
      const todayDateStr = data.businessDay?.date || new Date().toISOString().split('T')[0];
      const num = activeSerialConfig.kotNextNumber || 1;
      const padded = String(num).padStart(activeSerialConfig.kotPadding || 4, '0');
      const effKotPrefix = (activeSerialConfig.kotPrefix && activeSerialConfig.kotPrefix !== 'KOT-ORD-') ? activeSerialConfig.kotPrefix : 'KOT-';
      if (activeSerialConfig.kotIncludeDate) {
        const dateStr = todayDateStr.replace(/-/g, '');
        baseKotNo = `${effKotPrefix}${dateStr}-${padded}`;
      } else {
        baseKotNo = `${effKotPrefix}${padded}`;
      }
      activeSerialConfig.kotNextNumber = num + 1;
      serialConfigChanged = true;
    }

    const invoiceNo = isAddonKot 
      ? `${baseKotNo}-#${nextKotCount}` 
      : baseKotNo;
    const dateTime = new Date().toLocaleString('en-US');

    // Mark all current items in cart as KOT printed up to their current full quantity
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const updatedTables = data.tables.map(t => {
      if (t.id !== tableId) return t;
      const updatedCart = t.cart.map(item => ({
        ...item,
        kotPrinted: true,
        kotPrintedQty: item.qty,
        kotPrintedAt: item.kotPrintedAt || timeStr,
        kotPrintedTimestamp: item.kotPrintedTimestamp || now
      }));
      return {
        ...t,
        status: t.status === 'free' ? 'hold' : t.status,
        orderCreatedAt: t.orderCreatedAt || now,
        orderRef,
        linkedInvoiceNo,
        kotCount: nextKotCount,
        cart: updatedCart
      };
    });

    lastLocalEditTimeRef.current = now;
    lastSyncedTablesStrRef.current = JSON.stringify(updatedTables);
    setData(prev => ({
      ...prev,
      tables: updatedTables
    }));
    syncPosTablesToServer(updatedTables, undefined, 'KOT_SUBMIT');

    const agents = data.commissionAgents || DEFAULT_COMMISSION_AGENTS;
    const agent = agents.find(a => a.id === table.channelOrAgentId);

    // Items specifically for this KOT dispatch (only newly added/unsent quantities)
    const itemsToSend: TableCartItem[] = unprintedItems.map(i => ({
      ...i,
      qty: i.unsentQty
    }));
    const subtotal = itemsToSend.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const allTemplates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : DEFAULT_PRINT_TEMPLATES;
    const defaultPrimaryKotTemplate = allTemplates.find(t => t.isActive && t.isDefault && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
      || allTemplates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
      || allTemplates[0];

    const hasAnyKotPriceEnabled = allTemplates.some(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH') && t.showPricesOnKot);
    const isGlobalKotPricesEnabled = Boolean(defaultPrimaryKotTemplate?.showPricesOnKot || hasAnyKotPriceEnabled);

    if (showModal) {
      setPrintableReceipt({
        invoiceNo,
        orderRef,
        kotSequence: nextKotCount,
        isAddonKot,
        dateTime,
        tableName: table.name,
        tableZone: table.zone || 'Floor 1',
        waiter: table.waiter || 'N/A',
        customer: table.customer || 'Walk-in Customer',
        channelOrAgent: agent?.name || (table.channelOrAgentId !== 'dine_in' ? table.channelOrAgentId : undefined),
        channelCommissionPercent: agent?.commissionPercent,
        items: itemsToSend,
        subtotal,
        discountDeduction: 0,
        discountType: 'taka',
        discountVal: 0,
        netTotal: subtotal,
        isSettled: false,
        receiptType: 'KOT',
        isDirectPrint: false,
        targetTemplateId: defaultPrimaryKotTemplate?.id,
        showPrices: isGlobalKotPricesEnabled
      });
    } else {
      // Direct submit / print: dispatch directly to hardware printer in background
      const menuCatalog = Array.isArray(data?.menuItems) ? data.menuItems : [];
      const enriched = itemsToSend.map(item => {
        const itemName = item.name ? String(item.name).trim() : '';
        const itemId = item.id != null ? String(item.id) : null;
        const menuObj = menuCatalog.find(m => {
          if (!m) return false;
          if (itemId && m.id != null && String(m.id) === itemId) return true;
          if (itemName && m.name && String(m.name).trim().toLowerCase() === itemName.toLowerCase()) return true;
          return false;
        });
        return {
          ...item,
          department: item.department || menuObj?.department || 'Main Kitchen'
        };
      });

      const orderDepartments = Array.from(new Set(enriched.map(i => i.department).filter(Boolean)));
      const printers = data?.printers || [];
      const getPrinterForDept = (dept: string) => {
        const p = printers.find(pr => pr.departments?.includes(dept) && pr.isActive);
        return p || printers.find(pr => pr.isDefault && pr.isActive) || printers[0] || null;
      };

      const getTemplateForDept = (dept: string) => {
        return allTemplates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH') && t.departments?.includes(dept))
          || defaultPrimaryKotTemplate;
      };

      const slipsToPrint = (orderDepartments.length > 1)
        ? orderDepartments.map(dept => {
            const deptItems = enriched.filter(i => i.department === dept);
            const deptPrinter = getPrinterForDept(dept);
            const deptTemplate = getTemplateForDept(dept);
            const showPrices = Boolean(deptTemplate?.showPricesOnKot || isGlobalKotPricesEnabled);
            const showWaiter = deptTemplate?.showWaiter !== undefined ? Boolean(deptTemplate.showWaiter) : (defaultPrimaryKotTemplate?.showWaiter !== false);
            return {
              station: dept,
              targetPrinterName: deptPrinter?.name,
              showPrices,
              showWaiter,
              showCustomer: Boolean(deptTemplate?.showCustomer ?? defaultPrimaryKotTemplate?.showCustomer),
              showDateTime: deptTemplate?.showDateTime !== false,
              paperWidth: deptTemplate?.paperWidth || defaultPrimaryKotTemplate?.paperWidth || '80mm',
              items: deptItems.map(i => ({
                name: i.name,
                qty: i.qty,
                price: Number(i.price || 0),
                variation: i.selectedVariation?.name,
                addons: i.selectedAddons?.map(a => a.name),
                notes: i.notes
              }))
            };
          }).filter(s => s.items.length > 0)
        : [{
            station: orderDepartments[0] || 'Main Kitchen',
            targetPrinterName: getPrinterForDept(orderDepartments[0] || 'Main Kitchen')?.name,
            showPrices: Boolean(getTemplateForDept(orderDepartments[0] || 'Main Kitchen')?.showPricesOnKot || isGlobalKotPricesEnabled),
            showWaiter: getTemplateForDept(orderDepartments[0] || 'Main Kitchen')?.showWaiter !== undefined 
              ? Boolean(getTemplateForDept(orderDepartments[0] || 'Main Kitchen')?.showWaiter) 
              : (defaultPrimaryKotTemplate?.showWaiter !== false),
            showCustomer: Boolean(getTemplateForDept(orderDepartments[0] || 'Main Kitchen')?.showCustomer ?? defaultPrimaryKotTemplate?.showCustomer),
            showDateTime: getTemplateForDept(orderDepartments[0] || 'Main Kitchen')?.showDateTime !== false,
            paperWidth: getTemplateForDept(orderDepartments[0] || 'Main Kitchen')?.paperWidth || defaultPrimaryKotTemplate?.paperWidth || '80mm',
            items: enriched.map(i => ({
              name: i.name,
              qty: i.qty,
              price: Number(i.price || 0),
              variation: i.selectedVariation?.name,
              addons: i.selectedAddons?.map(a => a.name),
              notes: i.notes
            }))
          }];

      const kotHardwarePayload = {
        tableName: table.name,
        tableZone: table.zone || 'Floor 1',
        waiter: table.waiter || 'Staff',
        customer: table.customer || 'Walk-in Customer',
        invoiceNo,
        orderRef,
        kotSequence: nextKotCount,
        isAddonKot,
        dateTime,
        showPrices: isGlobalKotPricesEnabled,
        showWaiter: defaultPrimaryKotTemplate?.showWaiter !== false,
        showCustomer: Boolean(defaultPrimaryKotTemplate?.showCustomer),
        showDateTime: defaultPrimaryKotTemplate?.showDateTime !== false,
        paperWidth: defaultPrimaryKotTemplate?.paperWidth || '80mm',
        slips: slipsToPrint
      };

      const hasActiveKotPrinter = Boolean(
        (data.printers || []).some(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL'))
      );
      if (hasActiveKotPrinter) {
        dispatchHardwarePrint('/api/hardware/print-kot', kotHardwarePayload);
      }
    }
  };

  const directSubmitKotAndHold = async (tableId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    openPrintKot(tableId, false);
    setPosView('floor');
  };

  const voidCartItem = (
    tableId: string, 
    cartItemIdOrIdx: string | number, 
    voidQty: number, 
    reason: string, 
    authorizedBy: string,
    refundMethod: string = 'CASH'
  ) => {
    const table = data.tables.find(t => t.id === tableId);
    if (!table) return;

    let targetItem: TableCartItem | undefined;
    let targetIdx = -1;

    if (typeof cartItemIdOrIdx === 'number') {
      targetIdx = cartItemIdOrIdx;
      targetItem = table.cart[cartItemIdOrIdx];
    } else {
      targetIdx = table.cart.findIndex(c => (c.cartItemId || `${c.id}`) === cartItemIdOrIdx || c.id === Number(cartItemIdOrIdx));
      if (targetIdx !== -1) {
        targetItem = table.cart[targetIdx];
      }
    }

    if (!targetItem || targetIdx === -1) return;

    const actualVoidQty = Math.min(targetItem.qty, Math.max(1, voidQty));
    const itemRefundAmt = actualVoidQty * targetItem.price;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const variationSuffix = targetItem.selectedVariation ? ` (${targetItem.selectedVariation.name})` : '';
    const addonSuffix = targetItem.selectedAddons && targetItem.selectedAddons.length > 0 
      ? ` + ${targetItem.selectedAddons.map(a => a.name).join(', ')}` 
      : '';

    const cancelledItemInfo = {
      name: `${targetItem.name}${variationSuffix}${addonSuffix}`,
      qty: actualVoidQty,
      price: targetItem.price,
      department: targetItem.department || 'Main Kitchen',
      reason: reason || 'Item cancelled by authorized manager'
    };

    // Update cart and linked sale in state
    setData(prev => {
      let updatedSales = prev.sales;
      if (table.linkedSaleId) {
        updatedSales = prev.sales.map(s => {
          if (s.id !== table.linkedSaleId) return s;

          const updatedItems = (s.items || []).map(itm => {
            if (itm.id === targetItem!.id || itm.cartItemId === targetItem!.cartItemId || itm.name === targetItem!.name) {
              const newQty = itm.qty - actualVoidQty;
              return newQty > 0 ? { ...itm, qty: newQty } : null;
            }
            return itm;
          }).filter(Boolean) as TableCartItem[];

          const cashDeduct = refundMethod === 'CASH' ? itemRefundAmt : 0;
          const cardDeduct = refundMethod === 'CARD' ? itemRefundAmt : 0;
          const bkashDeduct = refundMethod === 'BKASH' ? itemRefundAmt : 0;
          const nagadDeduct = refundMethod === 'NAGAD' ? itemRefundAmt : 0;

          const newTotal = Math.max(0, (s.total || 0) - itemRefundAmt);
          const newRefundAmount = (s.refundAmount || 0) + itemRefundAmt;
          const isFullyRefunded = updatedItems.length === 0 || newTotal === 0;

          const refundLog = {
            itemId: targetItem!.id,
            itemName: targetItem!.name,
            qty: actualVoidQty,
            unitPrice: targetItem!.price,
            refundAmount: itemRefundAmt,
            refundMethod,
            reason: reason || 'Item cancelled by customer',
            refundedAt: timeStr,
            refundedBy: authorizedBy || 'Staff'
          };

          return {
            ...s,
            items: updatedItems,
            cash: Math.max(0, (s.cash || 0) - cashDeduct),
            card: Math.max(0, (s.card || 0) - cardDeduct),
            bkash: Math.max(0, (s.bkash || 0) - bkashDeduct),
            nagad: Math.max(0, (s.nagad || 0) - nagadDeduct),
            total: newTotal,
            refundAmount: newRefundAmount,
            refundStatus: 'REFUNDED' as const,
            status: isFullyRefunded ? ('VOIDED' as const) : s.status,
            isVoid: isFullyRefunded ? true : s.isVoid,
            voidReason: isFullyRefunded ? (reason || 'All items voided & refunded') : s.voidReason,
            refundItems: [...(s.refundItems || []), refundLog]
          };
        });
      }

      const updatedTables = prev.tables.map(t => {
        if (t.id !== tableId) return t;
        const newCart = [...t.cart];
        const itm = newCart[targetIdx];
        if (!itm) return t;

        if (actualVoidQty >= itm.qty) {
          newCart.splice(targetIdx, 1);
        } else {
          newCart[targetIdx] = {
            ...itm,
            qty: itm.qty - actualVoidQty,
            kotPrintedQty: Math.max(0, (itm.kotPrintedQty || itm.qty) - actualVoidQty)
          };
        }

        const isNowEmpty = newCart.length === 0;
        const newPaidAmount = Math.max(0, (t.paidAmount || 0) - itemRefundAmt);

        return {
          ...t,
          status: isNowEmpty ? ('free' as const) : t.status,
          waiter: isNowEmpty ? '' : t.waiter,
          customer: isNowEmpty ? 'Walk-in Customer' : t.customer,
          discountVal: isNowEmpty ? 0 : t.discountVal,
          channelOrAgentId: isNowEmpty ? 'dine_in' : t.channelOrAgentId,
          orderCreatedAt: isNowEmpty ? undefined : t.orderCreatedAt,
          orderCreatedBy: isNowEmpty ? undefined : t.orderCreatedBy,
          orderCreatedRole: isNowEmpty ? undefined : t.orderCreatedRole,
          orderCreatedId: isNowEmpty ? undefined : t.orderCreatedId,
          billedAt: isNowEmpty ? undefined : t.billedAt,
          billedAtTime: isNowEmpty ? undefined : t.billedAtTime,
          linkedSaleId: isNowEmpty ? undefined : t.linkedSaleId,
          linkedInvoiceNo: isNowEmpty ? undefined : t.linkedInvoiceNo,
          isPaidOrder: isNowEmpty ? false : t.isPaidOrder,
          paidAmount: isNowEmpty ? 0 : newPaidAmount,
          cart: newCart
        };
      });

      return { ...prev, sales: updatedSales, tables: updatedTables };
    });

    // Direct hardware dispatch Cancel KOT without opening preview modal
    const printers = data?.printers || [];
    const getPrinterForDept = (dept: string) => {
      const p = printers.find(pr => pr.departments?.includes(dept) && pr.isActive);
      return p || printers.find(pr => pr.isDefault && pr.isActive) || printers[0] || null;
    };
    const allTemplates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : DEFAULT_PRINT_TEMPLATES;
    const defaultPrimaryKotTemplate = allTemplates.find(t => t.isActive && t.isDefault && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
      || allTemplates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
      || allTemplates[0];

    const cancelKotPayload = {
      tableName: table.name,
      tableZone: table.zone || 'Floor 1',
      waiter: table.waiter || 'Staff',
      customer: table.customer || 'Walk-in Customer',
      invoiceNo: 'VOID-KOT-' + Date.now().toString().slice(-5),
      dateTime: new Date().toLocaleString('en-US'),
      paperWidth: defaultPrimaryKotTemplate?.paperWidth || '80mm',
      slips: [{
        station: cancelledItemInfo.department || 'Main Kitchen',
        targetPrinterName: getPrinterForDept(cancelledItemInfo.department || 'Main Kitchen')?.name,
        items: [{
          name: `*** CANCELLED *** ${cancelledItemInfo.name}`,
          qty: cancelledItemInfo.qty,
          notes: `REASON: ${cancelledItemInfo.reason} | AUTH: ${authorizedBy || 'Manager'}`
        }]
      }]
    };

    // Unified hardware print dispatch
    dispatchHardwarePrint('/api/hardware/print-kot', cancelKotPayload);
  };

  const releaseTable = (tableId: string, reason?: string, authorizedBy?: string, refundMethod: string = 'CASH') => {
    lastLocalEditTimeRef.current = Date.now();
    const table = data.tables.find(t => t.id === tableId);
    if (!table) return;

    const kotItems = table.cart.filter(i => (i.kotPrintedQty || 0) > 0 || i.kotPrinted);

    if (kotItems.length > 0) {
      const cancelledList = kotItems.map(i => ({
        name: i.name + (i.selectedVariation ? ` (${i.selectedVariation.name})` : ''),
        qty: i.kotPrintedQty || i.qty,
        price: i.price,
        department: i.department || 'Main Kitchen',
        reason: reason || 'Table Released / Order Voided'
      }));

      // Direct hardware dispatch Cancel KOT for released table without modal
      const printers = data?.printers || [];
      const getPrinterForDept = (dept: string) => {
        const p = printers.find(pr => pr.departments?.includes(dept) && pr.isActive);
        return p || printers.find(pr => pr.isDefault && pr.isActive) || printers[0] || null;
      };
      const allTemplates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : DEFAULT_PRINT_TEMPLATES;
      const defaultPrimaryKotTemplate = allTemplates.find(t => t.isActive && t.isDefault && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
        || allTemplates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
        || allTemplates[0];

      const releaseKotPayload = {
        tableName: table.name,
        tableZone: table.zone || 'Floor 1',
        waiter: table.waiter || 'Staff',
        customer: table.customer || 'Walk-in Customer',
        invoiceNo: 'VOID-KOT-' + Date.now().toString().slice(-5),
        dateTime: new Date().toLocaleString('en-US'),
        paperWidth: defaultPrimaryKotTemplate?.paperWidth || '80mm',
        slips: [{
          station: 'All Stations',
          targetPrinterName: getPrinterForDept('Main Kitchen')?.name,
          items: cancelledList.map(c => ({
            name: `*** TABLE RELEASED / VOID *** ${c.name}`,
            qty: c.qty,
            notes: `REASON: ${c.reason} | AUTH: ${authorizedBy || 'Manager'}`
          }))
        }]
      };

      // Unified hardware print dispatch
      dispatchHardwarePrint('/api/hardware/print-kot', releaseKotPayload);
    }

    // Reset table back to free status and void linked sale if present
    setData(prev => {
      let updatedSales = prev.sales;
      if (table.linkedSaleId) {
        const remainingRefund = table.paidAmount || 0;
        const now = new Date();
        const voidTimeStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        updatedSales = prev.sales.map(s => {
          if (s.id !== table.linkedSaleId) return s;
          const cashDeduct = refundMethod === 'CASH' ? remainingRefund : 0;
          const cardDeduct = refundMethod === 'CARD' ? remainingRefund : 0;
          const bkashDeduct = refundMethod === 'BKASH' ? remainingRefund : 0;
          const nagadDeduct = refundMethod === 'NAGAD' ? remainingRefund : 0;

          return {
            ...s,
            status: 'VOIDED' as const,
            isVoid: true,
            voidReason: reason || 'Entire order cancelled & table released by staff',
            voidedAt: voidTimeStr,
            voidedBy: authorizedBy || 'Staff',
            cash: Math.max(0, (s.cash || 0) - cashDeduct),
            card: Math.max(0, (s.card || 0) - cardDeduct),
            bkash: Math.max(0, (s.bkash || 0) - bkashDeduct),
            nagad: Math.max(0, (s.nagad || 0) - nagadDeduct),
            total: 0,
            refundAmount: (s.refundAmount || 0) + remainingRefund,
            refundStatus: 'REFUNDED' as const,
            refundMethod: refundMethod
          };
        });
      }

      const freedTables = prev.tables.map(t => t.id === tableId ? {
          ...t,
          status: 'free' as const,
          cart: [],
          waiter: '',
          customer: 'Walk-in Customer',
          discountVal: 0,
          channelOrAgentId: 'dine_in',
          linkedSaleId: undefined,
          linkedInvoiceNo: undefined,
          isPaidOrder: false,
          paidAmount: 0,
          orderCreatedBy: undefined,
          orderCreatedRole: undefined,
          orderCreatedId: undefined,
          orderCreatedAt: undefined,
          billedAt: undefined,
          billedAtTime: undefined,
          orderRef: undefined,
          kotCount: 0,
          billCount: 0
        } : t);

      const nextState = {
        ...prev,
        sales: updatedSales,
        tables: freedTables
      };
      dataRef.current = nextState;
      syncPosTablesToServer(freedTables, undefined, 'TABLE_RELEASE');
      return nextState;
    });
  };

  const cancelPosOrder = (tableId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    const table = data.tables.find(t => t.id === tableId);
    if (!table) {
      setPosView('floor');
      return;
    }

    const confirmedKotItems = table.cart.filter(
      item => (item.kotPrintedQty || 0) > 0
    );

    // If order has confirmed KOT items already submitted to kitchen,
    // revert any unsent extra items and keep submitted items intact on table.
    if (confirmedKotItems.length > 0) {
      lastLocalEditTimeRef.current = Date.now();
      setData(prev => {
        const nextState = {
          ...prev,
          tables: prev.tables.map(t => {
            if (t.id !== tableId) return t;

            // Revert cart to only KOT-printed items with their confirmed printed quantities
            const revertedCart = t.cart
              .filter(item => (item.kotPrintedQty || 0) > 0)
              .map(item => ({
                ...item,
                qty: item.kotPrintedQty || item.qty
              }));

            return {
              ...t,
              cart: revertedCart,
              status: t.status === 'billed' ? ('billed' as const) : ('hold' as const)
            };
          })
        };
        dataRef.current = nextState;
        syncPosTablesToServer(nextState.tables, undefined, 'ORDER_CANCEL_DRAFT');
        return nextState;
      });
    } else {
      // If table has NO confirmed KOT items (e.g. 0 items selected, or unsubmitted draft items),
      // completely release the table back to free (green)
      releaseTable(tableId, 'Cancelled from POS Cart', currentUser?.name);
    }

    setPosView('floor');
  };

  const openPrintCancelKot = (
    tableId: string,
    cancelledItems: { name: string; qty: number; price: number; department?: string; reason?: string }[],
    reason: string,
    authorizedBy: string,
    showModal: boolean = false
  ) => {
    const table = data.tables.find(t => t.id === tableId);
    if (!table) return;

    if (showModal) {
      setPrintableReceipt({
        invoiceNo: 'VOID-KOT-' + Date.now().toString().slice(-5),
        dateTime: new Date().toLocaleString('en-US'),
        tableName: table.name,
        tableZone: table.zone || 'Floor 1',
        waiter: table.waiter || 'N/A',
        customer: table.customer || 'Walk-in Customer',
        items: [],
        subtotal: 0,
        discountDeduction: 0,
        discountType: 'taka',
        discountVal: 0,
        netTotal: 0,
        isSettled: false,
        receiptType: 'CANCEL_KOT',
        voidReason: reason || 'Item Void',
        voidAuthorizedBy: authorizedBy || currentUser?.name || 'Admin',
        cancelledItems,
        isDirectPrint: false
      });
    }

    const printers = data?.printers || [];
    const getPrinterForDept = (dept: string) => {
      const p = printers.find(pr => pr.departments?.includes(dept) && pr.isActive);
      return p || printers.find(pr => pr.isDefault && pr.isActive) || printers[0] || null;
    };
    const allTemplates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : DEFAULT_PRINT_TEMPLATES;
    const defaultPrimaryKotTemplate = allTemplates.find(t => t.isActive && t.isDefault && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
      || allTemplates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
      || allTemplates[0];

    const cancelKotPayload = {
      tableName: table.name,
      tableZone: table.zone || 'Floor 1',
      waiter: table.waiter || 'Staff',
      customer: table.customer || 'Walk-in Customer',
      invoiceNo: 'VOID-KOT-' + Date.now().toString().slice(-5),
      dateTime: new Date().toLocaleString('en-US'),
      paperWidth: defaultPrimaryKotTemplate?.paperWidth || '80mm',
      slips: [{
        station: cancelledItems[0]?.department || 'Main Kitchen',
        targetPrinterName: getPrinterForDept(cancelledItems[0]?.department || 'Main Kitchen')?.name,
        items: cancelledItems.map(c => ({
          name: `*** CANCELLED *** ${c.name}`,
          qty: c.qty,
          notes: `REASON: ${c.reason || reason} | AUTH: ${authorizedBy || 'Manager'}`
        }))
      }]
    };

    // Unified hardware print dispatch
    dispatchHardwarePrint('/api/hardware/print-kot', cancelKotPayload);
  };

  const openPrintBill = (tableId: string, showModal: boolean = false) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const table = data.tables.find(t => t.id === tableId);
    if (!table || table.cart.length === 0) {
      alert('There are no items in this bill!');
      return;
    }

    const billNow = Date.now();
    const billTimeStr = new Date(billNow).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const orderRef = table.orderRef || ('ORD-' + Date.now().toString().slice(-5));
    const nextBillCount = (table.billCount || 0) + 1;
    const isUpdatedBill = nextBillCount > 1;

    let activeSerialConfig = { ...(data.serialConfig || DEFAULT_SERIAL_CONFIG) };
    let serialConfigChanged = false;
    let posInvoiceNo = table.linkedInvoiceNo;
    const isLegacyRandomInvoice = posInvoiceNo && /POS-\d{5,6}$/.test(posInvoiceNo) && !posInvoiceNo.includes('POS-00');

    if (!posInvoiceNo || isLegacyRandomInvoice) {
      const todayDateStr = data.businessDay?.date || new Date().toISOString().split('T')[0];
      const num = activeSerialConfig.posInvoiceNextNumber || 1;
      const padded = String(num).padStart(activeSerialConfig.posInvoicePadding || 4, '0');
      if (activeSerialConfig.posInvoiceIncludeDate) {
        const dateStr = todayDateStr.replace(/-/g, '');
        posInvoiceNo = `${activeSerialConfig.posInvoicePrefix || 'POS-'}${dateStr}-${padded}`;
      } else {
        posInvoiceNo = `${activeSerialConfig.posInvoicePrefix || 'POS-'}${padded}`;
      }
      activeSerialConfig.posInvoiceNextNumber = num + 1;
      serialConfigChanged = true;
    }

    const billInvoiceNo = isUpdatedBill 
      ? `${posInvoiceNo}-v${nextBillCount}`
      : posInvoiceNo;
    const billDateTime = new Date().toLocaleString('en-US');

    const updatedBillTables = data.tables.map(t => t.id === tableId ? { 
      ...t, 
      status: 'billed' as const,
      orderRef,
      linkedInvoiceNo: posInvoiceNo,
      billCount: nextBillCount,
      billedAt: t.billedAt || billNow,
      billedAtTime: t.billedAtTime || billTimeStr
    } : t);

    lastLocalEditTimeRef.current = Date.now();
    lastSyncedTablesStrRef.current = JSON.stringify(updatedBillTables);
    setData(prev => ({
      ...prev,
      tables: updatedBillTables,
      serialConfig: serialConfigChanged ? activeSerialConfig : prev.serialConfig
    }));
    syncPosTablesToServer(updatedBillTables, undefined, 'BILL_PRINT', serialConfigChanged ? activeSerialConfig : undefined);

    const agents = data.commissionAgents || DEFAULT_COMMISSION_AGENTS;
    const agent = agents.find(a => a.id === table.channelOrAgentId);

    const subtotal = table.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discDeduction = table.discountType === 'percent' 
      ? (subtotal * table.discountVal) / 100 
      : table.discountVal;
    const baseAfterDiscount = Math.max(0, subtotal - discDeduction);

    const profile = data.restaurantProfile || DEFAULT_RESTAURANT_PROFILE;
    const vatPct = Number(profile.vatPercent ?? 5);
    const isVatEnabled = Boolean(profile.enableVat ?? (vatPct > 0));
    const vatMode = profile.vatMode || 'inclusive';

    let billVatVal = 0;
    let netTotal = Math.round(baseAfterDiscount);

    if (isVatEnabled && vatPct > 0) {
      if (vatMode === 'exclusive') {
        billVatVal = Math.round(((baseAfterDiscount * vatPct) / 100) * 100) / 100;
        netTotal = Math.round(baseAfterDiscount + billVatVal);
      } else {
        billVatVal = Math.round(((baseAfterDiscount * vatPct) / (100 + vatPct)) * 100) / 100;
        netTotal = Math.round(baseAfterDiscount);
      }
    }

    const commissionAmount = agent ? Math.round((subtotal * agent.commissionPercent) / 100) : 0;
    const netRestaurantRevenue = Math.max(0, netTotal - commissionAmount);

    const allTemplates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : DEFAULT_PRINT_TEMPLATES;
    const defaultPrimaryBillTemplate = allTemplates.find(t => t.isActive && t.isDefault && (t.templateType === 'BILL' || t.templateType === 'BOTH'))
      || allTemplates.find(t => t.isActive && (t.templateType === 'BILL' || t.templateType === 'BOTH'))
      || allTemplates[0];

    const billPayload: PrintableReceipt = {
      restaurantName: data.restaurantProfile?.name || DEFAULT_RESTAURANT_PROFILE.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || DEFAULT_RESTAURANT_PROFILE.address || 'Chattogram, Bangladesh',
      restaurantHotline: data.restaurantProfile?.phone || DEFAULT_RESTAURANT_PROFILE.phone || '+880 1756-007600',
      restaurantBin: data.restaurantProfile?.binOrVat || DEFAULT_RESTAURANT_PROFILE.binOrVat || '0029381-01',
      invoiceNo: billInvoiceNo,
      orderRef,
      billVersion: nextBillCount,
      dateTime: billDateTime,
      tableName: table.name,
      tableZone: table.zone || 'Floor 1',
      waiter: table.waiter || 'N/A',
      orderTakenBy: getOrderTakerDisplay(table.orderCreatedBy || currentUser?.name, table.orderCreatedRole || currentUser?.role),
      settleBillRole: '',
      customer: table.customer || 'Walk-in Customer',
      channelOrAgent: agent?.name || (table.channelOrAgentId !== 'dine_in' ? table.channelOrAgentId : undefined),
      channelCommissionPercent: agent?.commissionPercent,
      channelCommissionAmount: commissionAmount,
      netRestaurantRevenue,
      items: table.cart,
      subtotal,
      discountDeduction: discDeduction,
      discountType: table.discountType,
      discountVal: table.discountVal,
      vatVal: billVatVal,
      vatPercent: isVatEnabled ? vatPct : 0,
      vatMode,
      netTotal,
      isSettled: false,
      receiptType: 'BILL',
      isDirectPrint: false,
      targetTemplateId: defaultPrimaryBillTemplate?.id,
      paperWidth: defaultPrimaryBillTemplate?.paperWidth || '80mm',
      headerTitle: defaultPrimaryBillTemplate?.headerTitle,
      showLogo: defaultPrimaryBillTemplate?.showLogo !== false,
      showAddress: defaultPrimaryBillTemplate?.showAddress !== false,
      showPhone: defaultPrimaryBillTemplate?.showPhone !== false,
      showBinVat: Boolean(defaultPrimaryBillTemplate?.showBinVat),
      showTableZone: defaultPrimaryBillTemplate?.showTableZone !== false,
      showWaiter: defaultPrimaryBillTemplate?.showWaiter !== false,
      showCustomer: defaultPrimaryBillTemplate?.showCustomer !== false,
      showPrices: defaultPrimaryBillTemplate?.showPrices !== false,
      showPaymentBreakdown: defaultPrimaryBillTemplate?.showPaymentBreakdown !== false,
      footerMessage: defaultPrimaryBillTemplate?.footerMessage,
      footerNotes: defaultPrimaryBillTemplate?.footerNotes
    };

    const hasActiveBillPrinter = Boolean(
      (data.printers || []).some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL'))
    );
    const hasActiveBillHardwarePrinter = Boolean(
      (data.printers || []).some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL') && p.printOnBill !== false)
    );

    if (showModal) {
      setPrintableReceipt(billPayload);
    } else if (hasActiveBillHardwarePrinter) {
      const billHardwarePayload = {
        ...billPayload,
        items: table.cart.map(i => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
          variation: i.selectedVariation?.name,
          addons: i.selectedAddons?.map(a => a.name),
          notes: i.notes
        }))
      };

      // Unified hardware print dispatch (instant local port 9123 or queued via cloud)
      dispatchHardwarePrint('/api/hardware/print-bill', billHardwarePayload);
    }
  };

  const directPrintBill = async (tableId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    openPrintBill(tableId, false);
  };

  const closePrintReceipt = () => {
    setPrintableReceipt(null);
  };

  const openSettleModal = (tableId: string) => {
    if (currentUser?.role === 'WAITER') {
      return;
    }
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const table = data.tables.find(t => t.id === tableId);
    if (!table || table.cart.length === 0) {
      if (table && table.status !== 'free' && !table.linkedSaleId) {
        setData(prev => ({
          ...prev,
          tables: prev.tables.map(t => t.id === tableId ? {
            ...t,
            status: 'free',
            cart: [],
            waiter: '',
            customer: 'Walk-in Customer',
            discountVal: 0,
            channelOrAgentId: 'dine_in',
            orderRef: undefined,
            billCount: 0,
            billedAt: undefined,
            billedAtTime: undefined
          } : t)
        }));
      }
      alert('No payable bill found on this table!');
      return;
    }
    setActiveSettlingTable(table);
  };

  const closeSettleModal = () => {
    setActiveSettlingTable(null);
  };

  const settlePayment = (
    tableId: string, 
    payments: { 
      cash?: number; 
      card?: number; 
      bkash?: number; 
      nagad?: number; 
      due?: number;
      advance?: number;
      byMethod?: Record<string, number>;
    },
    waiterOverride?: string,
    customerOverride?: string
  ) => {
    if (!data.session || !data.session.isActive) {
      setIsStartSessionModalOpen(true);
      return;
    }
    const table = data.tables.find(t => t.id === tableId);
    if (!table || table.cart.length === 0) return;

    const assignedWaiter = (waiterOverride || table.waiter || '').trim();
    const assignedCustomer = (customerOverride || table.customer || 'Walk-in Customer').trim();

    const agents = data.commissionAgents || DEFAULT_COMMISSION_AGENTS;
    const agent = agents.find(a => a.id === table.channelOrAgentId);

    const subtotal = table.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discDeduction = table.discountType === 'percent' 
      ? (subtotal * table.discountVal) / 100 
      : table.discountVal;
    const baseAfterDiscount = Math.max(0, subtotal - discDeduction);

    const profile = data.restaurantProfile || DEFAULT_RESTAURANT_PROFILE;
    const vatPercent = Number(profile.vatPercent ?? 5);
    const isVatEnabled = Boolean(profile.enableVat ?? (vatPercent > 0));
    const vatMode = profile.vatMode || 'inclusive';

    let vatVal = 0;
    let netTotal = Math.round(baseAfterDiscount);

    if (isVatEnabled && vatPercent > 0) {
      if (vatMode === 'exclusive') {
        vatVal = Math.round(((baseAfterDiscount * vatPercent) / 100) * 100) / 100;
        netTotal = Math.round(baseAfterDiscount + vatVal);
      } else {
        vatVal = Math.round(((baseAfterDiscount * vatPercent) / (100 + vatPercent)) * 100) / 100;
        netTotal = Math.round(baseAfterDiscount);
      }
    }

    const commissionPercent = agent ? agent.commissionPercent : 0;
    const commissionAmount = agent ? Math.round((subtotal * commissionPercent) / 100) : 0;
    const netRestaurantRevenue = Math.max(0, netTotal - commissionAmount);

    const methodList = (data.paymentMethods && data.paymentMethods.length > 0)
      ? data.paymentMethods
      : DEFAULT_PAYMENT_METHODS;

    const paymentBreakdown: Record<string, number> = {};
    let computedCash = 0;
    let computedCard = 0;
    let computedBkash = 0;
    let computedNagad = 0;
    let computedDue = 0;
    let computedAdvance = Number(payments.advance) || 0;

    if (payments.byMethod && Object.keys(payments.byMethod).length > 0) {
      Object.entries(payments.byMethod).forEach(([mId, amt]) => {
        const val = Number(amt) || 0;
        if (val <= 0) return;
        if (mId === 'advance') {
          computedAdvance = val;
          paymentBreakdown['advance'] = val;
          return;
        }
        paymentBreakdown[mId] = val;
        const targetMethod = methodList.find(m => m.id === mId || m.name.toLowerCase() === mId.toLowerCase());
        if (targetMethod) {
          paymentBreakdown[targetMethod.name] = val;
          const norm = `${targetMethod.id} ${targetMethod.name} ${targetMethod.providerName || ''}`.toLowerCase();
          if (targetMethod.type === 'CASH') {
            computedCash += val;
          } else if (targetMethod.type === 'CREDIT') {
            computedDue += val;
          } else if (targetMethod.type === 'CARD') {
            computedCard += val;
          } else if (targetMethod.type === 'MFS') {
            if (norm.includes('nagad')) computedNagad += val;
            else if (norm.includes('bkash')) computedBkash += val;
            else computedBkash += val;
          } else {
            computedCard += val;
          }
        } else {
          const norm = mId.toLowerCase();
          if (norm.includes('cash')) computedCash += val;
          else if (norm.includes('card')) computedCard += val;
          else if (norm.includes('bkash')) computedBkash += val;
          else if (norm.includes('nagad')) computedNagad += val;
          else if (norm.includes('due')) computedDue += val;
          else computedCard += val;
        }
      });
    } else {
      computedCash = Number(payments.cash) || 0;
      computedCard = Number(payments.card) || 0;
      computedBkash = Number(payments.bkash) || 0;
      computedNagad = Number(payments.nagad) || 0;
      computedDue = Number(payments.due) || 0;
      computedAdvance = Number(payments.advance) || computedAdvance;
      paymentBreakdown['cash'] = computedCash;
      paymentBreakdown['card'] = computedCard;
      paymentBreakdown['bkash'] = computedBkash;
      paymentBreakdown['nagad'] = computedNagad;
      paymentBreakdown['due'] = computedDue;
    }

    if (computedAdvance > 0) {
      paymentBreakdown['advance'] = computedAdvance;
    }

    const totalEntered = computedCash + computedCard + computedBkash + computedNagad + computedDue + computedAdvance;
    if (totalEntered < netTotal) {
      alert(`Payment is incomplete! Remaining balance: ৳ ${(netTotal - totalEntered).toLocaleString()}`);
      return;
    }

    // Auto-dispatch KOT to kitchen if cart has unprinted items before settling
    const hasUnprintedKot = table.cart.some(item => !item.kotPrinted || item.qty > (item.kotPrintedQty || 0));
    if (hasUnprintedKot) {
      openPrintKot(tableId, false);
    }

    const changeReturn = Math.max(0, totalEntered - netTotal);
    const cashRetained = Math.max(0, computedCash - changeReturn);
    let activeSerialConfig = { ...(data.serialConfig || DEFAULT_SERIAL_CONFIG) };
    let serialConfigChanged = false;
    let invoiceNo = table.linkedInvoiceNo;
    const isLegacyRandomInvoice = invoiceNo && /POS-\d{5,6}$/.test(invoiceNo) && !invoiceNo.includes('POS-00');

    if (!invoiceNo || isLegacyRandomInvoice) {
      const todayDateStr = data.businessDay?.date || new Date().toISOString().split('T')[0];
      const num = activeSerialConfig.posInvoiceNextNumber || 1;
      const padded = String(num).padStart(activeSerialConfig.posInvoicePadding || 4, '0');
      if (activeSerialConfig.posInvoiceIncludeDate) {
        const dateStr = todayDateStr.replace(/-/g, '');
        invoiceNo = `${activeSerialConfig.posInvoicePrefix || 'POS-'}${dateStr}-${padded}`;
      } else {
        invoiceNo = `${activeSerialConfig.posInvoicePrefix || 'POS-'}${padded}`;
      }
      activeSerialConfig.posInvoiceNextNumber = num + 1;
      serialConfigChanged = true;
    }

    let effectiveOrderRef = table.orderRef;
    if (!effectiveOrderRef) {
      const num = activeSerialConfig.orderRefNextNumber || 1;
      const padded = String(num).padStart(activeSerialConfig.orderRefPadding || 4, '0');
      effectiveOrderRef = `${activeSerialConfig.orderRefPrefix || 'ORD-'}${padded}`;
      activeSerialConfig.orderRefNextNumber = num + 1;
      serialConfigChanged = true;
    }
    const today = (data.businessDay?.isOpen && data.businessDay.date) ? data.businessDay.date : (data.session?.startDate || new Date().toISOString().split('T')[0]);
    const itemSummary = table.cart.map(i => `${i.name} (${i.qty})`).join(', ');

    const sellerName = table.orderCreatedBy || currentUser?.name || data.session?.openedBy || 'Cashier';
    const sellerRole = table.orderCreatedRole || currentUser?.role || 'CASHIER';
    const sellerId = table.orderCreatedId || currentUser?.id;

    const newSale: SaleRecord = {
      id: Date.now(),
      date: today,
      invoiceNo,
      orderRef: effectiveOrderRef,
      tableId: table.id,
      table: table.name,
      subtotal: subtotal,
      discountVal: table.discountVal,
      discountType: table.discountType,
      vatVal: vatVal,
      vatPercent: isVatEnabled ? vatPercent : 0,
      vatMode,
      details: `${table.name} [Zone: ${table.zone || 'Floor 1'}] (W: ${assignedWaiter || 'N/A'}${agent ? `, Ch: ${agent.name}` : ''}, Ref: ${effectiveOrderRef}): ${itemSummary}`,
      items: JSON.parse(JSON.stringify(table.cart)),
      cash: cashRetained,
      card: computedCard,
      bkash: computedBkash,
      nagad: computedNagad,
      dueGiven: computedDue,
      dueCustomer: computedDue > 0 ? assignedCustomer : '',
      dueCollected: 0,
      advanceAdjusted: computedAdvance,
      paymentBreakdown,
      change: changeReturn,
      total: netTotal,
      channelOrAgent: agent ? `${agent.name} (${agent.commissionPercent}%)` : (table.channelOrAgentId !== 'dine_in' ? table.channelOrAgentId : undefined),
      channelCommissionPercent: commissionPercent,
      channelCommissionAmount: commissionAmount,
      netRestaurantRevenue,
      sessionId: data.session?.id || 'SES-DEFAULT',
      waiterName: assignedWaiter || 'Staff',
      cashierName: currentUser?.name || data.session?.openedBy || 'Cashier',
      cashierRole: currentUser?.role || 'CASHIER',
      cashierId: currentUser?.id,
      sellerName: sellerName,
      sellerRole: sellerRole,
      sellerId: sellerId,
      orderCreatedBy: sellerName,
      orderCreatedRole: sellerRole,
      shift: data.session?.shiftType || 'Shift 1',
      createdAt: Date.now()
    };

    const currentTables = dataRef.current?.tables || data.tables;
    const freedTables = currentTables.map(t => t.id === tableId ? {
      ...t,
      status: 'free' as const,
      waiter: '',
      customer: 'Walk-in Customer',
      channelOrAgentId: 'dine_in',
      discountType: 'taka' as const,
      discountVal: 0,
      cart: [],
      linkedSaleId: undefined,
      linkedInvoiceNo: undefined,
      kotBaseSerial: undefined,
      isPaidOrder: false,
      paidAmount: 0,
      orderCreatedBy: undefined,
      orderCreatedRole: undefined,
      orderCreatedId: undefined,
      orderCreatedAt: undefined,
      billedAt: undefined,
      billedAtTime: undefined,
      orderRef: undefined,
      kotCount: 0,
      billCount: 0
    } : t);

    lastLocalEditTimeRef.current = Date.now();
    lastSyncedTablesStrRef.current = JSON.stringify(freedTables);
    syncPosTablesToServer(freedTables, newSale, 'TABLE_SETTLE', serialConfigChanged ? activeSerialConfig : undefined);

    // Update state
    setData(prev => {
      let unadjustedAdvanceToDeduct = computedAdvance;
      const targetCustomer = (assignedCustomer || '').trim();

      const updatedCustomerAdvances = (unadjustedAdvanceToDeduct > 0 && targetCustomer && !targetCustomer.toLowerCase().includes('walk-in'))
        ? (prev.customerAdvances || []).map(adv => {
            if (unadjustedAdvanceToDeduct <= 0) return adv;
            if (!isSameCustomer(adv.customer, targetCustomer) || adv.status === 'REFUNDED') return adv;

            const remainingOnThis = Math.max(0, (adv.amount || 0) - (adv.adjustedAmount || 0));
            if (remainingOnThis <= 0) return adv;

            const toDeduct = Math.min(unadjustedAdvanceToDeduct, remainingOnThis);
            const newAdjusted = (adv.adjustedAmount || 0) + toDeduct;
            unadjustedAdvanceToDeduct -= toDeduct;

            return {
              ...adv,
              adjustedAmount: newAdjusted,
              status: newAdjusted >= adv.amount ? ('ADJUSTED' as const) : ('ACTIVE' as const),
              linkedInvoiceNo: invoiceNo
            };
          })
        : (prev.customerAdvances || []);

      const currentCusts = prev.customers || [];
      const hasCust = currentCusts.some(c => isSameCustomer(c, targetCustomer));
      const updatedCustomers = (hasCust || !targetCustomer || targetCustomer.toLowerCase().includes('walk-in'))
        ? currentCusts
        : [...currentCusts, targetCustomer];

      const next = {
        ...prev,
        customers: updatedCustomers,
        customerAdvances: updatedCustomerAdvances,
        sales: [...prev.sales, newSale],
        tables: freedTables,
        serialConfig: serialConfigChanged ? activeSerialConfig : prev.serialConfig
      };
      dataRef.current = next;
      return next;
    });

    // Trigger celebration confetti
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    // Paid Cash Memo receipt payload for hardware printing
    const allTemplates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : DEFAULT_PRINT_TEMPLATES;
    const defaultPrimaryBillTemplate = allTemplates.find(t => t.isActive && t.isDefault && (t.templateType === 'BILL' || t.templateType === 'BOTH'))
      || allTemplates.find(t => t.isActive && (t.templateType === 'BILL' || t.templateType === 'BOTH'))
      || allTemplates[0];

    const memoReceipt: PrintableReceipt = {
      restaurantName: data.restaurantProfile?.name || DEFAULT_RESTAURANT_PROFILE.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || DEFAULT_RESTAURANT_PROFILE.address || 'Chattogram, Bangladesh',
      restaurantHotline: data.restaurantProfile?.phone || DEFAULT_RESTAURANT_PROFILE.phone || '+880 1756-007600',
      restaurantBin: data.restaurantProfile?.binOrVat || DEFAULT_RESTAURANT_PROFILE.binOrVat || '0029381-01',
      invoiceNo,
      orderRef: effectiveOrderRef,
      dateTime: new Date().toLocaleString('en-US'),
      tableName: table.name,
      tableZone: table.zone || 'Floor 1',
      channelOrAgent: agent ? `${agent.name} (${agent.commissionPercent}%)` : undefined,
      waiter: assignedWaiter || 'N/A',
      orderTakenBy: getOrderTakerDisplay(sellerName, sellerRole),
      settleBillRole: formatRoleTitle(currentUser?.role || 'CASHIER'),
      customer: assignedCustomer || 'Walk-in Customer',
      items: table.cart,
      subtotal,
      discountDeduction: discDeduction,
      discountType: table.discountType,
      discountVal: table.discountVal,
      vatVal: vatVal,
      vatPercent: isVatEnabled ? vatPercent : 0,
      vatMode,
      netTotal,
      paymentBreakdown: {
        cash: cashRetained,
        card: computedCard,
        bkash: computedBkash,
        nagad: computedNagad,
        due: computedDue,
        advance: computedAdvance,
        byMethod: paymentBreakdown
      },
      changeReturn,
      isSettled: true,
      receiptType: 'PAID_MEMO',
      isDirectPrint: false,
      targetTemplateId: defaultPrimaryBillTemplate?.id,
      paperWidth: defaultPrimaryBillTemplate?.paperWidth || '80mm',
      headerTitle: defaultPrimaryBillTemplate?.headerTitle,
      showLogo: defaultPrimaryBillTemplate?.showLogo !== false,
      showAddress: defaultPrimaryBillTemplate?.showAddress !== false,
      showPhone: defaultPrimaryBillTemplate?.showPhone !== false,
      showBinVat: Boolean(defaultPrimaryBillTemplate?.showBinVat),
      showTableZone: defaultPrimaryBillTemplate?.showTableZone !== false,
      showWaiter: defaultPrimaryBillTemplate?.showWaiter !== false,
      showCustomer: defaultPrimaryBillTemplate?.showCustomer !== false,
      showPrices: defaultPrimaryBillTemplate?.showPrices !== false,
      showPaymentBreakdown: defaultPrimaryBillTemplate?.showPaymentBreakdown !== false,
      footerMessage: defaultPrimaryBillTemplate?.footerMessage,
      footerNotes: defaultPrimaryBillTemplate?.footerNotes
    };

    const memoPayload = {
      ...memoReceipt,
      items: table.cart.map(i => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        variation: i.selectedVariation?.name,
        addons: i.selectedAddons?.map(a => a.name),
        notes: i.notes
      }))
    };



    const hasActiveGuestBillPrinter = Boolean(
      (data.printers || []).some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL') && p.printOnBill !== false)
    );
    const hasActiveSettlePrinter = Boolean(
      (data.printers || []).some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL') && p.printOnSettle !== false)
    );

    // If Bill printer is ACTIVE for Guest Bill (বাটন ৩ ও ১) and table was never billed, print Guest Bill first
    if (hasActiveGuestBillPrinter && (table.billCount || 0) === 0 && table.status !== 'billed') {
      const guestBillInvoiceNo = 'BILL-' + effectiveOrderRef;
      const guestBillPayload = {
        ...memoReceipt,
        invoiceNo: guestBillInvoiceNo,
        receiptType: 'BILL' as const,
        isSettled: false,
        paymentBreakdown: undefined,
        changeReturn: undefined,
        items: memoPayload.items
      };
      dispatchHardwarePrint('/api/hardware/print-bill', guestBillPayload);
    }

    // Unified hardware print dispatch for Paid Cash Memo if Settle Print is active (বাটন ২)
    if (hasActiveSettlePrinter) {
      dispatchHardwarePrint('/api/hardware/print-bill', memoPayload);
    }

    // Close settle modal without on-screen preview popup
    closeSettleModal();
    setPosView('floor');
  };

  const startSession = (openingCash: number, notes?: string, cashierName?: string, shiftType?: string) => {
    const today = (data.businessDay?.isOpen && data.businessDay.date) ? data.businessDay.date : new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const sessionId = 'SES-' + today.replace(/-/g, '') + '-' + Date.now().toString().slice(-4);
    const operator = cashierName || (currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Cashier');
    const selectedShift = shiftType || (new Date().getHours() >= 16 ? 'Shift 2' : 'Shift 1');

    // Auto-switch currentUser to the incoming cashier so subsequent receipts and actions belong to them
    const matchedUser = (data.users || []).find(u => 
      u.name && (operator.toLowerCase().includes(u.name.toLowerCase()) || u.name.toLowerCase().includes(operator.toLowerCase()))
    );
    if (matchedUser && matchedUser.id !== currentUser?.id) {
      setCurrentUser(matchedUser);
    }

    setData(prev => {
      const isDayAlreadyOpen = prev.businessDay?.isOpen;
      const updatedBusinessDay = isDayAlreadyOpen ? {
        ...prev.businessDay,
        pendingHandoverCashier: undefined,
        pendingHandoverFloat: undefined,
        pendingHandoverFrom: undefined
      } : {
        date: today,
        isOpen: true,
        openedAt: timeStr,
        openedBy: operator,
        dayNumber: (prev.dayEndRecords?.length || 0) + 1
      };

      // Synchronize Chart of Accounts 1010 (Cash in Hand) opening balance if it is currently 0
      const currentCoa = prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
      let coaUpdated = false;
      const updatedCoa = currentCoa.map(acc => {
        if ((acc.code === '1010' || acc.systemRole === 'CASH') && (!acc.balance || acc.balance === 0) && openingCash > 0) {
          coaUpdated = true;
          return { ...acc, balance: openingCash };
        }
        return acc;
      });

      return {
        ...prev,
        chartOfAccounts: coaUpdated ? updatedCoa : prev.chartOfAccounts,
        businessDay: updatedBusinessDay,
        session: {
          id: sessionId,
          isActive: true,
          openingCash: Math.max(0, openingCash),
          startTime: timeStr,
          startDate: today,
          startTimestamp: Date.now(),
          openedBy: operator,
          notes: notes || '',
          shiftType: selectedShift
        }
      };
    });
    setPendingHandoverCashier(null);
    setPendingHandoverFloat(null);
    setPendingHandoverFrom(null);
    setIsStartSessionModalOpen(false);
    setActiveTab('pos');
    setPosView('floor');
  };

  const startBusinessDay = (openingCash: number, cashierName?: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const operator = cashierName || (currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Cashier');
    const prevDays = data.dayEndRecords?.length || 0;

    setData(prev => ({
      ...prev,
      businessDay: {
        date: today,
        isOpen: true,
        openedAt: timeStr,
        openedBy: operator,
        dayNumber: prevDays + 1
      }
    }));
    startSession(openingCash, notes || 'Business Day Start - Shift 1', operator, 'Shift 1');
  };

  const handoverShiftWithLogout = (
    actualCash: number,
    handoverTo: string,
    nextDrawerFloat: number,
    cashDropToVault: number,
    notes?: string
  ): PosSessionRecord => {
    const operator = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Cashier';
    const completedSession = closeSessionWithReconciliation(
      actualCash,
      notes,
      operator,
      false, // do not open start session immediately as we are logging out
      cashDropToVault,
      nextDrawerFloat,
      openTables.map(t => t.id),
      handoverTo,
      false
    );

    // Direct hardware print Z-Report already dispatched by closeSessionWithReconciliation
    setSelectedZReportSession(null);

    // Persist pending handover info inside businessDay so it survives logout and reload
    setData(prev => ({
      ...prev,
      businessDay: prev.businessDay ? {
        ...prev.businessDay,
        isOpen: true,
        pendingHandoverCashier: handoverTo,
        pendingHandoverFloat: nextDrawerFloat,
        pendingHandoverFrom: operator
      } : {
        date: completedSession.date,
        isOpen: true,
        pendingHandoverCashier: handoverTo,
        pendingHandoverFloat: nextDrawerFloat,
        pendingHandoverFrom: operator
      }
    }));

    setPendingHandoverCashier(handoverTo);
    setPendingHandoverFloat(nextDrawerFloat);
    setPendingHandoverFrom(operator);
    setPendingLogoutAfterShiftClose(true);

    return completedSession;
  };

  const performDayOffClose = (actualCash: number, cashDropToVault?: number, notes?: string): DayEndRecord => {
    const today = (data.businessDay?.isOpen && data.businessDay.date) ? data.businessDay.date : (data.session?.startDate || new Date().toISOString().split('T')[0]);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const operator = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Cashier';

    let completedShift: PosSessionRecord | undefined;
    // If session is active (e.g. Shift 2), close it and print Z-Report
    if (data.session?.isActive) {
      completedShift = closeSessionWithReconciliation(
        actualCash,
        notes || 'Shift 2 Final Closure',
        operator,
        false,
        cashDropToVault !== undefined ? cashDropToVault : actualCash,
        0, // 0 float left because day is off!
        openTables.map(t => t.id),
        undefined,
        false
      );
    }

    // Perform Consolidated Day-End Close and print Day-End report directly to hardware printer
    const dayRecord = performDailyDayEndClose(today, notes || 'Business Day End / Day Off', completedShift);
    
    // Direct hardware print Day-End report already dispatched by performDailyDayEndClose
    setSelectedZReportSession(null);
    setSelectedDayEndPreview(null);
    setIsCloseSessionModalOpen(false);

    // Mark business day as closed (Day Off)
    setData(prev => ({
      ...prev,
      businessDay: prev.businessDay ? {
        ...prev.businessDay,
        isOpen: false,
        closedAt: `${today} ${timeStr}`,
        closedBy: operator,
        pendingHandoverCashier: undefined,
        pendingHandoverFloat: undefined,
        pendingHandoverFrom: undefined
      } : {
        date: today,
        isOpen: false,
        closedAt: `${today} ${timeStr}`,
        closedBy: operator
      }
    }));

    setPendingHandoverCashier(null);
    setPendingHandoverFloat(null);
    setPendingHandoverFrom(null);
    setPendingLogoutAfterShiftClose(true);

    return dayRecord;
  };

  const endSession = () => {
    if (currentUser?.role === 'WAITER') {
      setIsWaiterShiftModalOpen(true);
      return;
    }
    if (currentUser?.role === 'CHEF') {
      return;
    }
    setIsCloseSessionModalOpen(true);
  };

  const closeSessionWithReconciliation = (
    actualCash: number, 
    notes?: string, 
    closedBy?: string, 
    startNextShiftImmediately?: boolean,
    cashDropToVault?: number,
    nextShiftDrawerFloat?: number,
    carriedOverTableIds?: string[],
    handoverToCashier?: string,
    showPreviewModal: boolean = false
  ): PosSessionRecord => {
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const operator = closedBy || (currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Cashier');
    const sessionId = data.session.id || ('SES-' + today.replace(/-/g, '') + '-' + Date.now().toString().slice(-4));
    
    const openingCash = data.session.openingCash || 0;
    const expectedCash = openingCash + activeSessionStats.cashSales;
    const cashDiff = actualCash - expectedCash;

    // Filter sales belonging to this closing session
    const sessionSales = (data.sales || []).filter(s => {
      if (activeSessionStats.saleIds && activeSessionStats.saleIds.length > 0) {
        return activeSessionStats.saleIds.includes(s.id);
      }
      if (s.sessionId && sessionId) {
        return s.sessionId === sessionId;
      }
      if (data.session.startTimestamp) {
        const saleTs = s.createdAt || (typeof s.id === 'number' && s.id > 1000000000000 ? s.id : 0);
        if (saleTs > 0) {
          return saleTs >= data.session.startTimestamp;
        }
      }
      return s.date === (data.session.startDate || today);
    });

    const activeSessionSales = sessionSales.filter(isSaleActive);

    // Compute Waiter-wise Sales Breakdown
    const waiterMap: Record<string, { waiter: string; orderCount: number; totalSales: number }> = {};
    activeSessionSales.forEach(s => {
      let w = (s.waiterName && s.waiterName !== 'Staff' && s.waiterName !== 'N/A')
        ? s.waiterName
        : (s.details?.match(/W:\s*([^,\]\)]+)/i)?.[1]?.trim());
      if (!w || w === 'N/A') {
        w = 'Staff';
      }
      if (!waiterMap[w]) waiterMap[w] = { waiter: w, orderCount: 0, totalSales: 0 };
      waiterMap[w].orderCount += 1;
      waiterMap[w].totalSales += (s.total || 0);
    });
    const waiterBreakdown = Object.values(waiterMap).sort((a, b) => b.totalSales - a.totalSales);

    // Compute Role-wise Cash, Digital & Due Collection Breakdown (Only roles that made sales in this shift)
    const allKnownUsers = [...(data.users || []), ...DEFAULT_USERS];
    const roleMap: Record<string, { role: string; orderCount: number; cashCollected: number; digitalCollected: number; dueAmount: number; totalCollected: number }> = {};

    activeSessionSales.forEach(s => {
      let r = s.sellerRole || s.orderCreatedRole || s.cashierRole;
      const personName = s.sellerName || s.orderCreatedBy || s.cashierName;
      if (!r) {
        const matchedUser = allKnownUsers.find(u => 
          u.name === personName || 
          (personName && personName.toLowerCase().includes(u.name.toLowerCase())) ||
          (personName && u.name.toLowerCase().includes(personName.toLowerCase())) ||
          (u.username && personName && personName.toLowerCase().includes(u.username.toLowerCase()))
        );
        if (matchedUser) {
          r = matchedUser.role;
        } else if (personName?.toLowerCase().includes('admin')) {
          r = 'ADMIN';
        } else if (personName?.toLowerCase().includes('manager')) {
          r = 'MANAGER';
        } else if (personName?.toLowerCase().includes('cashier')) {
          r = 'CASHIER';
        } else if (personName?.toLowerCase().includes('waiter')) {
          r = 'WAITER';
        } else {
          r = currentUser?.role || 'CASHIER';
        }
      }
      r = r.toUpperCase();
      if (!roleMap[r]) {
        roleMap[r] = { role: r, orderCount: 0, cashCollected: 0, digitalCollected: 0, dueAmount: 0, totalCollected: 0 };
      }
      roleMap[r].orderCount += 1;
      roleMap[r].cashCollected += (s.cash || 0);
      roleMap[r].digitalCollected += (s.card || 0) + (s.bkash || 0) + (s.nagad || 0);
      roleMap[r].dueAmount += (s.dueGiven || 0);
      roleMap[r].totalCollected += (s.total || 0);
    });
    const roleBreakdown = Object.values(roleMap)
      .filter(r => (r.orderCount || 0) > 0 || (r.totalCollected || 0) > 0)
      .sort((a, b) => {
        if (b.totalCollected !== a.totalCollected) return b.totalCollected - a.totalCollected;
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        const orderPref = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'];
        const idxA = orderPref.indexOf(a.role);
        const idxB = orderPref.indexOf(b.role);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

    // Compute Cashier & Shift-wise Collection Breakdown
    const cashierMap: Record<string, { cashier: string; role?: string; shift?: string; orderCount: number; cashCollected: number; digitalCollected: number; dueAmount: number; totalCollected: number }> = {};
    activeSessionSales.forEach(s => {
      const c = s.cashierName || operator || 'Cashier';
      let r = s.cashierRole;
      if (!r) {
        const matchedUser = allKnownUsers.find(u => 
          u.name === c || 
          (c && c.toLowerCase().includes(u.name.toLowerCase())) ||
          (c && u.name.toLowerCase().includes(c.toLowerCase())) ||
          (u.username && c && c.toLowerCase().includes(u.username.toLowerCase()))
        );
        if (matchedUser) {
          r = matchedUser.role;
        } else if (c?.toLowerCase().includes('admin')) {
          r = 'ADMIN';
        } else if (c?.toLowerCase().includes('manager')) {
          r = 'MANAGER';
        } else if (c?.toLowerCase().includes('cashier')) {
          r = 'CASHIER';
        } else {
          r = currentUser?.role || 'CASHIER';
        }
      }
      r = r.toUpperCase();
      const sh = s.shift || data.session.shiftType || 'Shift 1';
      const key = `${c}__${sh}`;
      if (!cashierMap[key]) {
        cashierMap[key] = { cashier: c, role: r, shift: sh, orderCount: 0, cashCollected: 0, digitalCollected: 0, dueAmount: 0, totalCollected: 0 };
      }
      cashierMap[key].orderCount += 1;
      cashierMap[key].cashCollected += (s.cash || 0);
      cashierMap[key].digitalCollected += (s.card || 0) + (s.bkash || 0) + (s.nagad || 0);
      cashierMap[key].dueAmount += (s.dueGiven || 0);
      cashierMap[key].totalCollected += (s.total || 0);
    });
    const cashierBreakdown = Object.values(cashierMap).sort((a, b) => b.totalCollected - a.totalCollected);

    const completedSession: PosSessionRecord = {
      id: sessionId,
      date: data.session.startDate || today,
      openedBy: data.session.openedBy || operator,
      closedBy: operator,
      role: currentUser?.role || 'CASHIER',
      shiftType: data.session.shiftType || (new Date().getHours() >= 16 ? 'Shift 2' : 'Shift 1'),
      startTime: data.session.startTime || '10:00 AM',
      endTime: timeStr,
      startTimestamp: data.session.startTimestamp || (Date.now() - 3600000),
      endTimestamp: Date.now(),
      openingCash: openingCash,
      cashSales: activeSessionStats.cashSales,
      cardSales: activeSessionStats.cardSales,
      bkashSales: activeSessionStats.bkashSales,
      nagadSales: activeSessionStats.nagadSales,
      dueSales: activeSessionStats.dueSales,
      totalSales: activeSessionStats.totalSales,
      orderCount: activeSessionStats.orderCount,
      expectedCash: expectedCash,
      actualClosingCash: actualCash,
      cashDifference: cashDiff,
      cashDropToVault: cashDropToVault !== undefined ? cashDropToVault : Math.max(0, actualCash - (nextShiftDrawerFloat || 0)),
      nextShiftDrawerFloat: nextShiftDrawerFloat !== undefined ? nextShiftDrawerFloat : (startNextShiftImmediately ? 2000 : 0),
      handoverToCashier: handoverToCashier || undefined,
      openTablesCount: carriedOverTableIds?.length || 0,
      carriedOverTableIds: carriedOverTableIds || [],
      status: 'CLOSED',
      notes: notes || data.session.notes || '',
      saleIds: activeSessionStats.saleIds,
      waiterBreakdown,
      roleBreakdown,
      cashierBreakdown
    };

    setData(prev => {
      const prevSessions = prev.posSessions || DEFAULT_POS_SESSIONS;
      const filtered = prevSessions.filter(s => s.id !== sessionId);
      return {
        ...prev,
        businessDay: prev.businessDay ? {
          ...prev.businessDay,
          isOpen: true,
          pendingHandoverCashier: handoverToCashier || prev.businessDay.pendingHandoverCashier,
          pendingHandoverFloat: nextShiftDrawerFloat !== undefined ? nextShiftDrawerFloat : prev.businessDay.pendingHandoverFloat,
          pendingHandoverFrom: operator || prev.businessDay.pendingHandoverFrom
        } : prev.businessDay,
        session: { isActive: false, openingCash: 0, startTime: "" },
        posSessions: [completedSession, ...filtered]
      };
    });

    setIsCloseSessionModalOpen(false);
    if (showPreviewModal) {
      setSelectedZReportSession(completedSession);
    } else {
      setSelectedZReportSession(null);
    }
    
    // Direct hardware print Z-Report on shift close
    const zReportPayload = {
      restaurantName: data.restaurantProfile?.name || DEFAULT_RESTAURANT_PROFILE.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || DEFAULT_RESTAURANT_PROFILE.address || 'Chattogram, Bangladesh',
      restaurantHotline: data.restaurantProfile?.phone || DEFAULT_RESTAURANT_PROFILE.phone || '+880 1756-007600',
      restaurantBin: data.restaurantProfile?.binOrVat || DEFAULT_RESTAURANT_PROFILE.binOrVat || '0029381-01',
      session: completedSession
    };

    // Unified hardware print dispatch
    dispatchHardwarePrint('/api/hardware/print-zreport', zReportPayload);

    if (startNextShiftImmediately) {
      if (handoverToCashier) {
        setPendingHandoverCashier(handoverToCashier);
        setPendingHandoverFrom(operator);
      }
      if (nextShiftDrawerFloat !== undefined) {
        setPendingHandoverFloat(nextShiftDrawerFloat);
      }
      setTimeout(() => {
        setIsStartSessionModalOpen(true);
      }, 200);
    }

    return completedSession;
  };

  const performDailyDayEndClose = (targetDate?: string, notes?: string, extraSession?: PosSessionRecord): DayEndRecord => {
    const today = targetDate || (data.businessDay?.isOpen && data.businessDay.date) || data.session?.startDate || new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    let daySessions = (data.posSessions || []).filter(s => s.date === today);
    if (extraSession && (extraSession.date === today || !extraSession.date)) {
      if (!daySessions.some(s => s.id === extraSession.id)) {
        daySessions = [extraSession, ...daySessions];
      }
    }
    const dayExpenses = (data.expenses || []).filter(e => e.date === today).reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const totalDaySales = daySessions.reduce((sum, s) => sum + (s.totalSales || 0), 0);
    const totalDayOrders = daySessions.reduce((sum, s) => sum + (s.orderCount || 0), 0);
    const totalCash = daySessions.reduce((sum, s) => sum + (s.cashSales || 0), 0);
    const totalCard = daySessions.reduce((sum, s) => sum + (s.cardSales || 0), 0);
    const totalBkash = daySessions.reduce((sum, s) => sum + (s.bkashSales || 0), 0);
    const totalNagad = daySessions.reduce((sum, s) => sum + (s.nagadSales || 0), 0);
    const totalDue = daySessions.reduce((sum, s) => sum + (s.dueSales || 0), 0);
    const netCashToVault = Math.max(0, totalCash - dayExpenses);

    // Sort day sessions chronologically (earliest to latest)
    const sortedSessions = [...daySessions].sort((a, b) => {
      if (a.startTimestamp && b.startTimestamp) return a.startTimestamp - b.startTimestamp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];

    const openedBy = firstSession?.openedBy || (data.businessDay?.date === today && data.businessDay.openedBy ? data.businessDay.openedBy : 'Cashier');
    const openedAt = firstSession?.startTime || (data.businessDay?.date === today && data.businessDay.openedAt ? data.businessDay.openedAt : 'Start of Day');
    const openingCash = firstSession?.openingCash ?? (data.session?.isActive && data.session.openingCash ? data.session.openingCash : 0);
    const closingCash = lastSession?.actualClosingCash ?? lastSession?.expectedCash ?? totalCash;

    const dayEndId = 'DAY-' + today.replace(/-/g, '') + '-' + Date.now().toString().slice(-4);
    const dayRecord: DayEndRecord = {
      id: dayEndId,
      date: today,
      totalDaySales,
      totalDayOrders,
      shiftCount: daySessions.length,
      shiftIds: daySessions.map(s => s.id),
      totalCash,
      totalCard,
      totalBkash,
      totalNagad,
      totalDue,
      totalExpenses: dayExpenses,
      netCashToVault,
      openedBy,
      openedAt,
      openingCash,
      closingCash,
      closedBy: currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Admin',
      closedAt: `${today} ${timeStr}`,
      notes: notes || ''
    };

    setData(prev => {
      const prevRecords = prev.dayEndRecords || [];
      const filtered = prevRecords.filter(r => r.date !== today);
      return {
        ...prev,
        dayEndRecords: [dayRecord, ...filtered]
      };
    });

    // Unified hardware print dispatch
    dispatchHardwarePrint('/api/hardware/print-dayend', {
      restaurantName: data.restaurantProfile?.name || DEFAULT_RESTAURANT_PROFILE.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || DEFAULT_RESTAURANT_PROFILE.address || 'Chattogram, Bangladesh',
      dayRecord,
      daySessions
    });

    return dayRecord;
  };

  const transferWaiterTables = (fromWaiter: string, toWaiter: string) => {
    if (!fromWaiter || !toWaiter || fromWaiter === toWaiter) return;
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => {
        if (t.waiter === fromWaiter) {
          return { ...t, waiter: toWaiter };
        }
        return t;
      })
    }));
  };

  const startChefShift = (
    chefName: string, 
    station: string, 
    shiftType: 'Morning Shift' | 'Evening Shift' | 'Night Shift', 
    notes?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const shiftId = 'KCS-' + today.replace(/-/g, '') + '-' + Date.now().toString().slice(-4);

    const newChefShift: ChefShiftRecord = {
      id: shiftId,
      chefName: chefName || currentUser?.name || 'Chef',
      station: station || 'Main Kitchen',
      shiftType: shiftType || 'Morning Shift',
      date: today,
      startTime: timeStr,
      startTimestamp: Date.now(),
      isActive: true,
      kotsPreparedCount: 0,
      dishesCookedCount: 0,
      notes: notes || ''
    };

    setData(prev => ({
      ...prev,
      activeChefShift: newChefShift,
      chefShifts: [newChefShift, ...(prev.chefShifts || []).filter(s => s.id !== shiftId)]
    }));
    setIsChefShiftModalOpen(false);
  };

  const endChefShift = (handoverToChef?: string, notes?: string): ChefShiftRecord | null => {
    if (!data.activeChefShift) return null;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const shiftId = data.activeChefShift.id;

    // Calculate KOTs / Dishes prepared today during this shift
    const today = new Date().toISOString().split('T')[0];
    const shiftStartTs = data.activeChefShift.startTimestamp || (Date.now() - 3600000);
    const todaySales = (data.sales || []).filter(s => s.date === today && (s.createdAt || 0) >= shiftStartTs);
    const totalDishes = todaySales.reduce((acc, s) => acc + (s.items || []).reduce((dSum, item) => dSum + item.qty, 0), 0);
    const totalKots = todaySales.length;

    const completedShift: ChefShiftRecord = {
      ...data.activeChefShift,
      endTime: timeStr,
      endTimestamp: Date.now(),
      isActive: false,
      kotsPreparedCount: Math.max(data.activeChefShift.kotsPreparedCount || 0, totalKots),
      dishesCookedCount: Math.max(data.activeChefShift.dishesCookedCount || 0, totalDishes),
      notes: notes || data.activeChefShift.notes || '',
      handoverToChef: handoverToChef || ''
    };

    setData(prev => ({
      ...prev,
      activeChefShift: null,
      chefShifts: [completedShift, ...(prev.chefShifts || []).filter(s => s.id !== shiftId)]
    }));

    setIsChefShiftModalOpen(false);

    // Unified hardware print dispatch
    dispatchHardwarePrint('/api/hardware/print-chef-slip', {
      restaurantName: data.restaurantProfile?.name || DEFAULT_RESTAURANT_PROFILE.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || DEFAULT_RESTAURANT_PROFILE.address || 'Chattogram, Bangladesh',
      shift: completedShift
    });

    return completedShift;
  };

  const startWaiterShift = (
    waiterName: string,
    assignedZone: string,
    shiftType: 'Morning Shift' | 'Evening Shift' | 'Night Shift',
    notes?: string,
    serverCashFloat?: number
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const shiftId = 'WSR-' + today.replace(/-/g, '') + '-' + Date.now().toString().slice(-4);

    const newWaiterShift: WaiterShiftRecord = {
      id: shiftId,
      waiterName: waiterName || currentUser?.name || 'Waiter',
      assignedZone: assignedZone || 'All Zones',
      shiftType: shiftType || 'Morning Shift',
      date: today,
      startTime: timeStr,
      startTimestamp: Date.now(),
      isActive: true,
      totalOrders: 0,
      totalSales: 0,
      estimatedTips: 0,
      serverCashFloat: serverCashFloat || 0,
      cashDrawerSessionId: data.session?.isActive ? data.session.id : undefined,
      notes: notes || ''
    };

    setData(prev => ({
      ...prev,
      activeWaiterShift: newWaiterShift,
      waiterShifts: [newWaiterShift, ...(prev.waiterShifts || []).filter(s => s.id !== shiftId)]
    }));
  };

  const endWaiterShift = (handoverToWaiter?: string, notes?: string): WaiterShiftRecord | null => {
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const active = data.activeWaiterShift;
    const shiftId = active?.id || ('WSR-' + today.replace(/-/g, '') + '-' + Date.now().toString().slice(-4));
    const targetWaiterName = active?.waiterName || currentUser?.name || 'Waiter';

    const waiterSales = (data.sales || []).filter(s => {
      if (s.date !== today) return false;
      const details = (s.details || '').toLowerCase();
      return details.includes(targetWaiterName.toLowerCase());
    });
    const totalSales = waiterSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalOrders = waiterSales.length;
    const estimatedTips = Math.round(totalSales * 0.05);

    const completedShift: WaiterShiftRecord = {
      id: shiftId,
      waiterName: targetWaiterName,
      assignedZone: active?.assignedZone || 'All Zones',
      shiftType: active?.shiftType || 'Morning Shift',
      date: active?.date || today,
      startTime: active?.startTime || timeStr,
      startTimestamp: active?.startTimestamp || Date.now(),
      endTime: timeStr,
      endTimestamp: Date.now(),
      isActive: false,
      totalOrders,
      totalSales,
      estimatedTips,
      serverCashFloat: active?.serverCashFloat || 0,
      cashDrawerSessionId: active?.cashDrawerSessionId || (data.session?.isActive ? data.session.id : undefined),
      notes: notes || active?.notes || '',
      handoverToWaiter: handoverToWaiter || ''
    };

    setData(prev => ({
      ...prev,
      activeWaiterShift: null,
      waiterShifts: [completedShift, ...(prev.waiterShifts || []).filter(s => s.id !== shiftId)]
    }));

    return completedShift;
  };

  const deleteSessionRecord = (sessionId: string) => {
    setData(prev => ({
      ...prev,
      posSessions: (prev.posSessions || []).filter(s => s.id !== sessionId),
      sales: (prev.sales || []).filter(s => s.sessionId !== sessionId)
    }));
  };

  const deleteDayEndRecord = (date: string) => {
    setData(prev => {
      const today = new Date().toISOString().split('T')[0];
      const isToday = date === today;
      return {
        ...prev,
        dayEndRecords: (prev.dayEndRecords || []).filter(r => r.date !== date),
        posSessions: (prev.posSessions || []).filter(s => s.date !== date),
        sales: (prev.sales || []).filter(s => s.date !== date),
        businessDay: isToday ? {
          date: today,
          isOpen: false,
          dayNumber: Math.max(1, (prev.dayEndRecords?.length || 1))
        } : prev.businessDay
      };
    });
  };

  const saveDirectDueCollection = (date: string, customer: string, amount: number, method: string) => {
    lastLocalEditTimeRef.current = Date.now();
    const methodList = data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : DEFAULT_PAYMENT_METHODS;
    const matchedMethod = methodList.find(m => m.id === method || m.name.toLowerCase() === method.toLowerCase() || m.id.toLowerCase() === method.toLowerCase());
    const mType = matchedMethod?.type || (method === 'CASH' ? 'CASH' : method === 'CARD' ? 'CARD' : method === 'BKASH' ? 'MFS' : method === 'NAGAD' ? 'MFS' : 'CASH');
    const mName = matchedMethod?.name || method;
    const mId = matchedMethod?.id || method;

    let cash = 0, card = 0, bkash = 0, nagad = 0;
    if (mType === 'CASH') cash = amount;
    else if (mType === 'CARD') card = amount;
    else if (mType === 'MFS') {
      if (mName.toLowerCase().includes('nagad')) nagad = amount;
      else bkash = amount;
    } else {
      cash = amount;
    }

    const newSale: SaleRecord = {
      id: Date.now(),
      date,
      invoiceNo: 'DUE-COLL-' + Date.now().toString().slice(-4),
      details: `Due Collection (${mName})`,
      cash, card, bkash, nagad,
      paymentBreakdown: {
        [mId]: amount,
        [mName]: amount
      },
      dueGiven: 0,
      dueCustomer: '',
      dueCollected: amount,
      dueCollectedFrom: customer,
      change: 0,
      total: amount,
      sessionId: data.session?.id || 'SES-DEFAULT',
      cashierName: currentUser?.name || data.session?.openedBy || 'Cashier',
      cashierRole: currentUser?.role || 'CASHIER',
      cashierId: currentUser?.id,
      shift: data.session?.shiftType || 'Shift 1',
      createdAt: Date.now()
    };

    setData(prev => ({ ...prev, sales: [...prev.sales, newSale] }));
  };

  const deleteSale = (id: number) => {
    setData(prev => ({ ...prev, sales: prev.sales.filter(s => s.id !== id) }));
  };

  const voidSale = (saleId: number, options: {
    reason: string;
    refundPayment: boolean;
    refundMethod?: string;
    restoreToTable?: boolean;
  }): boolean => {
    const sale = data.sales.find(s => s.id === saleId);
    if (!sale) return false;

    const now = new Date();
    const voidTimeStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const voidedBy = currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Staff'})` : 'Staff';

    setData(prev => {
      // 1. Mark sale as VOIDED with refund status
      const updatedSales = prev.sales.map(s => {
        if (s.id !== saleId) return s;
        return {
          ...s,
          status: 'VOIDED' as const,
          isVoid: true,
          voidReason: options.reason || 'Order cancelled by staff',
          voidedAt: voidTimeStr,
          voidedBy: voidedBy,
          refundAmount: options.refundPayment ? (s.total || 0) : 0,
          refundMethod: options.refundMethod || 'CASH',
          refundStatus: options.refundPayment ? ('REFUNDED' as const) : ('NO_REFUND' as const)
        };
      });

      // 2. If restoreToTable is requested and sale has items, re-open table in live POS
      let updatedTables = prev.tables;
      let matchedTableId: string | null = null;

      if (options.restoreToTable && sale.items && sale.items.length > 0) {
        const targetTable = prev.tables.find(t => 
          (sale.tableId && t.id === sale.tableId) ||
          (sale.table && t.name.toLowerCase().trim() === sale.table.toLowerCase().trim()) ||
          (sale.details && (
            sale.details.toLowerCase().includes(t.name.toLowerCase().trim()) ||
            sale.details.toLowerCase().includes(`table ${t.id}`)
          ))
        ) || prev.tables[0];

        if (targetTable) {
          matchedTableId = targetTable.id;
          updatedTables = prev.tables.map(t => {
            if (t.id !== targetTable.id) return t;
            return {
              ...t,
              status: 'hold' as const,
              waiter: (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : (t.waiter || ''),
              customer: sale.dueCustomer || 'Walk-in Customer',
              cart: (sale.items || []).map((itm, i) => ({
                ...itm,
                cartItemId: itm.cartItemId || `item-${Date.now()}-${i}`,
                kotPrinted: true,
                kotPrintedQty: itm.kotPrintedQty || itm.qty,
                kotPrintedAt: itm.kotPrintedAt || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                kotPrintedTimestamp: itm.kotPrintedTimestamp || Date.now()
              })),
              discountVal: sale.discountVal || 0,
              discountType: sale.discountType || 'taka',
              orderCreatedBy: sale.orderCreatedBy || sale.sellerName,
              orderCreatedRole: sale.orderCreatedRole || sale.sellerRole,
              orderCreatedAt: sale.createdAt || Date.now()
            };
          });
        }
      }

      return {
        ...prev,
        sales: updatedSales,
        tables: updatedTables
      };
    });

    if (options.restoreToTable) {
      const targetTable = data.tables.find(t => 
        (sale.tableId && t.id === sale.tableId) ||
        (sale.table && t.name.toLowerCase().trim() === sale.table.toLowerCase().trim()) ||
        (sale.details && (
          sale.details.toLowerCase().includes(t.name.toLowerCase().trim()) ||
          sale.details.toLowerCase().includes(`table ${t.id}`)
        ))
      ) || data.tables[0];

      if (targetTable) {
        setActiveTableId(targetTable.id);
        setPosView('order');
        setActiveTab('pos');
        setPrintableReceipt(null);
      }
    }

    return true;
  };

  const restoreVoidedSale = (saleId: number) => {
    setData(prev => ({
      ...prev,
      sales: prev.sales.map(s => {
        if (s.id !== saleId) return s;
        const { voidReason, voidedAt, voidedBy, refundAmount, refundMethod, refundStatus, isVoid, ...rest } = s;
        return {
          ...rest,
          status: 'SETTLED' as const,
          isVoid: false
        };
      })
    }));
  };

  const reopenSettledSaleInPos = (saleId: number) => {
    const sale = data.sales.find(s => s.id === saleId);
    if (!sale) return;

    const targetTable = data.tables.find(t => 
      (sale.tableId && t.id === sale.tableId) ||
      (sale.table && t.name.toLowerCase().trim() === sale.table.toLowerCase().trim()) ||
      (sale.details && (
        sale.details.toLowerCase().includes(t.name.toLowerCase().trim()) ||
        sale.details.toLowerCase().includes(`table ${t.id}`)
      ))
    ) || data.tables[0];

    const restoredCart: TableCartItem[] = (sale.items || []).map((itm, i) => ({
      ...itm,
      cartItemId: itm.cartItemId || `item-${sale.id}-${i}`,
      kotPrinted: true,
      kotPrintedQty: itm.kotPrintedQty || itm.qty,
      kotPrintedAt: itm.kotPrintedAt || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      kotPrintedTimestamp: itm.kotPrintedTimestamp || Date.now()
    }));

    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => {
        if (t.id !== targetTable.id) return t;
        return {
          ...t,
          status: 'hold' as const,
          waiter: (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : (t.waiter || ''),
          customer: sale.dueCustomer || 'Walk-in Customer',
          cart: restoredCart,
          discountVal: sale.discountVal || 0,
          discountType: sale.discountType || 'taka',
          linkedSaleId: sale.id,
          linkedInvoiceNo: sale.invoiceNo,
          isPaidOrder: true,
          paidAmount: sale.total,
          orderCreatedBy: sale.orderCreatedBy || sale.sellerName,
          orderCreatedRole: sale.orderCreatedRole || sale.sellerRole,
          orderCreatedAt: sale.createdAt || Date.now()
        };
      })
    }));

    setActiveTableId(targetTable.id);
    setPosView('order');
    setActiveTab('pos');
    setPrintableReceipt(null);
  };

  const finishLinkedOrderInPos = (tableId: string) => {
    setData(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? {
        ...t,
        status: 'free',
        cart: [],
        waiter: '',
        customer: 'Walk-in Customer',
        discountVal: 0,
        channelOrAgentId: 'dine_in',
        linkedSaleId: undefined,
        linkedInvoiceNo: undefined,
        isPaidOrder: false,
        paidAmount: 0,
        orderCreatedBy: undefined,
        orderCreatedRole: undefined,
        orderCreatedId: undefined,
        orderCreatedAt: undefined,
        billedAt: undefined,
        billedAtTime: undefined
      } : t)
    }));
    setActiveTab('sales');
  };

  const updateSaleWaiter = (id: number, waiterName: string) => {
    setData(prev => ({
      ...prev,
      sales: prev.sales.map(s => {
        if (s.id !== id) return s;
        let details = s.details || '';
        if (/W:\s*[^,\]\)]+/i.test(details)) {
          details = details.replace(/W:\s*[^,\]\)]+/i, `W: ${waiterName}`);
        } else {
          details = details ? `(W: ${waiterName}) ${details}` : `(W: ${waiterName})`;
        }
        return {
          ...s,
          waiterName,
          details
        };
      })
    }));
  };

  const saveMenuItem = (item: Partial<MenuItem> & { id?: number }) => {
    setData(prev => {
      const exists = prev.menuItems.some(i => i.id === item.id);
      let updated: MenuItem[];
      if (exists) {
        updated = prev.menuItems.map(i => i.id === item.id ? { ...i, ...item } as MenuItem : i);
      } else {
        const newItem: MenuItem = {
          id: item.id || Date.now(),
          name: item.name || 'New Item',
          department: item.department || prev.departments[0] || 'Main Kitchen',
          category: item.category || prev.menuCategories[0] || 'Main Course',
          price: Number(item.price) || 0,
          cost: Number(item.cost) || 0,
          recipe: item.recipe || [],
          channelPrices: item.channelPrices || {},
          variations: item.variations || [],
          addons: item.addons || [],
          promo: item.promo,
          imageUrl: item.imageUrl || undefined
        };
        updated = [...prev.menuItems, newItem];
      }
      return { ...prev, menuItems: updated };
    });
  };

  const deleteMenuItem = (id: number) => {
    setData(prev => ({ ...prev, menuItems: prev.menuItems.filter(i => i.id !== id) }));
  };

  const importMenuItems = (
    importedItems: MenuItem[],
    overwrite = true,
    extraData?: { newDepartments?: string[]; newCategories?: string[] }
  ): { added: number; updated: number } => {
    let addedCount = 0;
    let updatedCount = 0;

    setData(prev => {
      const currentItems = [...prev.menuItems];
      const departmentsSet = new Set(prev.departments);
      const categoriesSet = new Set(prev.menuCategories);

      if (extraData?.newDepartments) {
        extraData.newDepartments.forEach(d => { if (d && d.trim()) departmentsSet.add(d.trim()); });
      }
      if (extraData?.newCategories) {
        extraData.newCategories.forEach(c => { if (c && c.trim()) categoriesSet.add(c.trim()); });
      }

      importedItems.forEach(item => {
        if (item.department) departmentsSet.add(item.department);
        if (item.category) categoriesSet.add(item.category);

        const existingIndex = currentItems.findIndex(
          i => i.id === item.id || (i.name && item.name && i.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        );

        if (existingIndex >= 0 && overwrite) {
          currentItems[existingIndex] = {
            ...currentItems[existingIndex],
            ...item,
            id: currentItems[existingIndex].id // keep existing id
          };
          updatedCount++;
        } else if (existingIndex >= 0 && !overwrite) {
          const newItem: MenuItem = { ...item, id: Date.now() + Math.floor(Math.random() * 10000) };
          currentItems.push(newItem);
          addedCount++;
        } else {
          const newItem: MenuItem = { ...item, id: item.id || (Date.now() + Math.floor(Math.random() * 10000)) };
          currentItems.push(newItem);
          addedCount++;
        }
      });

      return {
        ...prev,
        menuItems: currentItems,
        departments: Array.from(departmentsSet),
        menuCategories: Array.from(categoriesSet)
      };
    });

    return { added: addedCount, updated: updatedCount };
  };

  const saveMasterItem = (item: Partial<RawMasterItem> & { id?: number }) => {
    setData(prev => {
      const exists = prev.masterItems.some(i => i.id === item.id);
      let updated: RawMasterItem[];
      if (exists) {
        updated = prev.masterItems.map(i => i.id === item.id ? { ...i, ...item } as RawMasterItem : i);
      } else {
        const newItem: RawMasterItem = {
          id: item.id || Date.now(),
          name: item.name || 'New Raw Material',
          category: item.category || prev.purchaseCategories[0] || 'Grocery',
          vendor: item.vendor || prev.vendors[0] || '',
          uom: item.uom || 'Kg',
          defaultRate: Number(item.defaultRate) || 0
        };
        updated = [...prev.masterItems, newItem];
      }
      return { ...prev, masterItems: updated };
    });
  };

  const deleteMasterItem = (id: number) => {
    setData(prev => ({ ...prev, masterItems: prev.masterItems.filter(i => i.id !== id) }));
  };

  const importMasterItems = (
    importedItems: RawMasterItem[],
    overwrite = true,
    extraData?: { newCategories?: string[]; newVendors?: string[] }
  ): { added: number; updated: number } => {
    let addedCount = 0;
    let updatedCount = 0;

    setData(prev => {
      const currentItems = [...prev.masterItems];
      const categoriesSet = new Set(prev.purchaseCategories);
      const vendorsSet = new Set(prev.vendors);

      if (extraData?.newCategories) {
        extraData.newCategories.forEach(c => { if (c && c.trim()) categoriesSet.add(c.trim()); });
      }
      if (extraData?.newVendors) {
        extraData.newVendors.forEach(v => { if (v && v.trim()) vendorsSet.add(v.trim()); });
      }

      importedItems.forEach(item => {
        if (item.category) categoriesSet.add(item.category);
        if (item.vendor) vendorsSet.add(item.vendor);

        const existingIndex = currentItems.findIndex(
          i => i.id === item.id || (i.name && item.name && i.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        );

        if (existingIndex >= 0 && overwrite) {
          currentItems[existingIndex] = {
            ...currentItems[existingIndex],
            ...item,
            id: currentItems[existingIndex].id
          };
          updatedCount++;
        } else if (existingIndex >= 0 && !overwrite) {
          const newItem: RawMasterItem = { ...item, id: Date.now() + Math.floor(Math.random() * 10000) };
          currentItems.push(newItem);
          addedCount++;
        } else {
          const newItem: RawMasterItem = { ...item, id: item.id || (Date.now() + Math.floor(Math.random() * 10000)) };
          currentItems.push(newItem);
          addedCount++;
        }
      });

      return {
        ...prev,
        masterItems: currentItems,
        purchaseCategories: Array.from(categoriesSet),
        vendors: Array.from(vendorsSet)
      };
    });

    return { added: addedCount, updated: updatedCount };
  };

  const savePurchaseVoucher = (voucher: PurchaseVoucher, updateMasterRates: boolean = true) => {
    setData(prev => {
      const index = prev.purchases.findIndex(p => p.id === voucher.id);
      let updatedPurchases: PurchaseVoucher[];
      if (index >= 0) {
        updatedPurchases = [...prev.purchases];
        updatedPurchases[index] = voucher;
      } else {
        updatedPurchases = [voucher, ...prev.purchases];
      }

      // Update inventory valuation rate if voucher is FINAL (Do not add purchase quantity to opening stock)
      let updatedInventory = prev.inventory || [];
      if (voucher.status === 'FINAL') {
        const invMap = new Map<number, StockInventoryRecord>(updatedInventory.map(i => [i.id, { ...i }]));
        voucher.items.forEach(itm => {
          if (itm.itemId) {
            const existing = invMap.get(itm.itemId);
            if (existing) {
              existing.rate = itm.rate || existing.rate;
            } else {
              invMap.set(itm.itemId, {
                id: itm.itemId,
                open: 0,
                used: 0,
                manualUsed: 0,
                wastage: 0,
                rate: itm.rate
              });
            }
          }
        });
        updatedInventory = Array.from(invMap.values());
      }

      // Optionally update Raw Materials Master Catalog Standard Rates
      let updatedMasterItems = prev.masterItems;
      if (updateMasterRates && voucher.items && voucher.items.length > 0) {
        updatedMasterItems = prev.masterItems.map(m => {
          const matched = voucher.items.find(
            itm => (itm.itemId && itm.itemId === m.id) || (itm.item && itm.item.trim().toLowerCase() === m.name.trim().toLowerCase())
          );
          if (matched && typeof matched.rate === 'number' && matched.rate > 0) {
            return { ...m, defaultRate: matched.rate };
          }
          return m;
        });
      }

      return {
        ...prev,
        purchases: updatedPurchases,
        inventory: updatedInventory,
        masterItems: updatedMasterItems
      };
    });
  };

  const deletePurchaseVoucher = (id: number) => {
    setData(prev => ({ ...prev, purchases: prev.purchases.filter(p => p.id !== id) }));
  };

  const savePurchaseOrder = (order: Partial<PurchaseOrder> & { id?: number }, updateMasterRates: boolean = false) => {
    setData(prev => {
      const pos = prev.purchaseOrders || [];
      const index = order.id ? pos.findIndex(p => p.id === order.id) : -1;
      let updatedPOs: PurchaseOrder[];

      if (index >= 0) {
        // Edit existing PO
        updatedPOs = [...pos];
        updatedPOs[index] = { ...pos[index], ...order } as PurchaseOrder;
      } else {
        // Create new PO
        const newPo: PurchaseOrder = {
          id: order.id || Date.now(),
          poNo: order.poNo || `PO-${new Date().getFullYear()}-${(pos.length + 1).toString().padStart(3, '0')}`,
          date: order.date || new Date().toISOString().split('T')[0],
          vendor: order.vendor || prev.vendors[0] || 'Supplier',
          expectedDate: order.expectedDate || new Date().toISOString().split('T')[0],
          items: order.items || [],
          total: order.total || 0,
          status: order.status || 'PENDING',
          grnNo: order.grnNo,
          notes: order.notes,
          receivedHistory: order.receivedHistory || []
        };
        updatedPOs = [newPo, ...pos];
      }

      let updatedMasterItems = prev.masterItems;
      if (updateMasterRates && order.items && order.items.length > 0) {
        updatedMasterItems = prev.masterItems.map(m => {
          const matched = order.items!.find(
            itm => (itm.itemId && itm.itemId === m.id) || (itm.item && itm.item.trim().toLowerCase() === m.name.trim().toLowerCase())
          );
          if (matched && typeof matched.rate === 'number' && matched.rate > 0) {
            return { ...m, defaultRate: matched.rate };
          }
          return m;
        });
      }

      return {
        ...prev,
        purchaseOrders: updatedPOs,
        masterItems: updatedMasterItems
      };
    });
  };

  const deletePurchaseOrder = (id: number) => {
    setData(prev => ({
      ...prev,
      purchaseOrders: (prev.purchaseOrders || []).filter(po => po.id !== id)
    }));
  };

  const receivePurchaseOrderItems = (
    poId: number,
    receivedItems: PurchaseItem[],
    billNo: string,
    paymentType: PurchasePaymentType,
    receiveDate?: string,
    updateMasterRates: boolean = true
  ) => {
    if (!receivedItems || receivedItems.length === 0) return;

    const dateStr = receiveDate || new Date().toISOString().split('T')[0];

    setData(prev => {
      const pos = prev.purchaseOrders || [];
      const targetPO = pos.find(p => p.id === poId);
      if (!targetPO) return prev;

      const totalReceivedVal = receivedItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const generatedBillNo = billNo.trim() || (`INV-${Date.now().toString().slice(-4)}`);

      // 1. Create Purchase Voucher (Bill)
      const newVoucher: PurchaseVoucher = {
        id: Date.now(),
        date: dateStr,
        vendor: targetPO.vendor,
        billNo: generatedBillNo,
        paymentType: paymentType || 'CREDIT',
        status: 'FINAL',
        total: totalReceivedVal,
        items: JSON.parse(JSON.stringify(receivedItems))
      };

      // 2. Update Stock Inventory Valuation Rate (Do not add purchase quantity to opening stock)
      const invMap = new Map<number, StockInventoryRecord>((prev.inventory || []).map(i => [i.id, { ...i }]));
      receivedItems.forEach(itm => {
        if (itm.itemId) {
          const existing = invMap.get(itm.itemId);
          if (existing) {
            existing.rate = itm.rate || existing.rate;
          } else {
            invMap.set(itm.itemId, {
              id: itm.itemId,
              open: 0,
              used: 0,
              manualUsed: 0,
              wastage: 0,
              rate: itm.rate
            });
          }
        }
      });

      // 3. Update PO status & receivedHistory
      const prevHistory = targetPO.receivedHistory || [];
      const newHistoryEntry = {
        grnNo: generatedBillNo,
        billNo: generatedBillNo,
        date: dateStr,
        items: JSON.parse(JSON.stringify(receivedItems)),
        total: totalReceivedVal
      };

      // Check overall received quantities against ordered quantities
      const allReceivedMap = new Map<number, number>();
      [...prevHistory, newHistoryEntry].forEach(hist => {
        hist.items.forEach(hi => {
          allReceivedMap.set(hi.itemId, (allReceivedMap.get(hi.itemId) || 0) + (hi.qty || 0));
        });
      });

      let isFullyFulfilled = true;
      targetPO.items.forEach(orderedItem => {
        const totalRcv = allReceivedMap.get(orderedItem.itemId) || 0;
        if (totalRcv < orderedItem.qty) {
          isFullyFulfilled = false;
        }
      });

      const updatedPO: PurchaseOrder = {
        ...targetPO,
        status: isFullyFulfilled ? 'FULFILLED' : 'PARTIALLY_RECEIVED',
        grnNo: generatedBillNo,
        receivedHistory: [...prevHistory, newHistoryEntry]
      };

      const updatedPOs = pos.map(p => p.id === poId ? updatedPO : p);

      // 4. Optionally update Raw Materials Master Catalog Standard Rates
      let updatedMasterItems = prev.masterItems;
      if (updateMasterRates && receivedItems && receivedItems.length > 0) {
        updatedMasterItems = prev.masterItems.map(m => {
          const matched = receivedItems.find(
            itm => (itm.itemId && itm.itemId === m.id) || (itm.item && itm.item.trim().toLowerCase() === m.name.trim().toLowerCase())
          );
          if (matched && typeof matched.rate === 'number' && matched.rate > 0) {
            return { ...m, defaultRate: matched.rate };
          }
          return m;
        });
      }

      return {
        ...prev,
        purchases: [newVoucher, ...prev.purchases],
        inventory: Array.from(invMap.values()),
        purchaseOrders: updatedPOs,
        masterItems: updatedMasterItems
      };
    });
  };

  const savePurchaseReturn = (returnRecord: Partial<PurchaseReturn> & { id?: number }) => {
    setData(prev => {
      const list = prev.purchaseReturns || DEFAULT_PURCHASE_RETURNS;
      let updatedReturns: PurchaseReturn[];
      let targetRet: PurchaseReturn;
      let qtyDiff = 0;

      if (returnRecord.id) {
        const index = list.findIndex(pr => pr.id === returnRecord.id);
        if (index >= 0) {
          const oldRet = list[index];
          targetRet = { ...oldRet, ...returnRecord } as PurchaseReturn;
          updatedReturns = [...list];
          updatedReturns[index] = targetRet;
          qtyDiff = (targetRet.qty || 0) - (oldRet.qty || 0);
        } else {
          targetRet = returnRecord as PurchaseReturn;
          updatedReturns = [targetRet, ...list];
          qtyDiff = targetRet.qty || 0;
        }
      } else {
        targetRet = {
          id: Date.now(),
          returnNo: returnRecord.returnNo || `RET-${new Date().getFullYear()}-${(list.length + 1).toString().padStart(3, '0')}`,
          date: returnRecord.date || new Date().toISOString().split('T')[0],
          vendor: returnRecord.vendor || prev.vendors[0] || 'Supplier',
          billNo: returnRecord.billNo,
          itemId: returnRecord.itemId || 1,
          item: returnRecord.item || 'Item',
          qty: returnRecord.qty || 1,
          uom: returnRecord.uom || 'Kg',
          rate: returnRecord.rate || 0,
          total: returnRecord.total || 0,
          reason: returnRecord.reason || 'Damaged / Spoilage return',
          refundStatus: returnRecord.refundStatus || 'ADJUSTED'
        };
        updatedReturns = [targetRet, ...list];
        qtyDiff = targetRet.qty || 0;
      }

      return {
        ...prev,
        purchaseReturns: updatedReturns
      };
    });
  };

  const deletePurchaseReturn = (id: number) => {
    setData(prev => {
      const list = prev.purchaseReturns || DEFAULT_PURCHASE_RETURNS;
      return {
        ...prev,
        purchaseReturns: list.filter(pr => pr.id !== id)
      };
    });
  };

  const saveExpense = (expense: Omit<ExpenseRecord, 'id'> & { id?: number }) => {
    setData(prev => {
      if (expense.id) {
        return {
          ...prev,
          expenses: prev.expenses.map(e => e.id === expense.id ? { ...e, ...expense } as ExpenseRecord : e)
        };
      }
      return {
        ...prev,
        expenses: [...prev.expenses, { ...expense, id: Date.now() }]
      };
    });
  };

  const deleteExpense = (id: number) => {
    setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  };

  const saveVendorPayment = (payment: Omit<VendorPayment, 'id'> & { id?: number }) => {
    setData(prev => {
      const newPayments = payment.id
        ? prev.payments.map(p => p.id === payment.id ? { ...p, ...payment } as VendorPayment : p)
        : [...prev.payments, { ...payment, id: Date.now() }];

      // Real-time sync: if payment is linked to a billNo, update the voucher's paid field
      let updatedPurchases = prev.purchases;
      if (payment.billNo) {
        const targetBillNo = payment.billNo.trim().toLowerCase();
        updatedPurchases = prev.purchases.map(p => {
          if (p.billNo && p.billNo.trim().toLowerCase() === targetBillNo) {
            const currentPaid = p.paid || (p.paymentType === 'CASH' ? p.total : 0);
            return {
              ...p,
              paid: Math.min(p.total, currentPaid + (Number(payment.amount) || 0))
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        payments: newPayments,
        purchases: updatedPurchases
      };
    });
  };

  const deleteVendorPayment = (id: number) => {
    setData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
  };

  const saveInventoryRecord = (rawItemId: number, open: number, used: number, rate?: number, wastage: number = 0) => {
    setData(prev => {
      const existing = prev.inventory.find(i => i.id === rawItemId);
      let updatedInv: StockInventoryRecord[];
      if (existing) {
        updatedInv = prev.inventory.map(i => i.id === rawItemId ? { 
          ...i, 
          open, 
          used, 
          manualUsed: used, 
          wastage: wastage ?? i.wastage ?? 0, 
          rate: rate ?? i.rate 
        } : i);
      } else {
        updatedInv = [...prev.inventory, { id: rawItemId, open, used, manualUsed: used, wastage, rate }];
      }
      return { ...prev, inventory: updatedInv };
    });
  };

  const addCustomHead = (type: 'vendor' | 'rawCategory' | 'waiter' | 'department' | 'menuCat' | 'expense' | 'customer', val: string) => {
    const keyMap = {
      vendor: 'vendors',
      rawCategory: 'purchaseCategories',
      waiter: 'waiters',
      department: 'departments',
      menuCat: 'menuCategories',
      expense: 'expenseHeads',
      customer: 'customers',
      tableZone: 'tableZones'
    } as const;
    const targetKey = keyMap[type];
    if (!val || (data[targetKey] && data[targetKey].includes(val))) return;

    setData(prev => ({
      ...prev,
      [targetKey]: [...(prev[targetKey] || []), val]
    }));
  };

  const editCustomHead = (type: 'vendor' | 'rawCategory' | 'waiter' | 'department' | 'menuCat' | 'expense' | 'customer' | 'tableZone', index: number, newVal: string) => {
    const keyMap = {
      vendor: 'vendors',
      rawCategory: 'purchaseCategories',
      waiter: 'waiters',
      department: 'departments',
      menuCat: 'menuCategories',
      expense: 'expenseHeads',
      customer: 'customers',
      tableZone: 'tableZones'
    } as const;
    const targetKey = keyMap[type];
    if (!newVal.trim()) return;

    setData(prev => {
      const oldVal = (prev[targetKey] || [])[index];
      const arr = [...(prev[targetKey] || [])];
      arr[index] = newVal.trim();
      let updatedTables = prev.tables;
      if (type === 'tableZone') {
        updatedTables = prev.tables.map(t => t.zone === oldVal ? { ...t, zone: newVal.trim() } : t);
      }
      return { ...prev, [targetKey]: arr, tables: updatedTables };
    });
  };

  const deleteCustomHead = (type: 'vendor' | 'rawCategory' | 'waiter' | 'department' | 'menuCat' | 'expense' | 'customer' | 'tableZone', index: number) => {
    const keyMap = {
      vendor: 'vendors',
      rawCategory: 'purchaseCategories',
      waiter: 'waiters',
      department: 'departments',
      menuCat: 'menuCategories',
      expense: 'expenseHeads',
      customer: 'customers',
      tableZone: 'tableZones'
    } as const;
    const targetKey = keyMap[type];
    setData(prev => ({
      ...prev,
      [targetKey]: (prev[targetKey] || []).filter((_, i) => i !== index)
    }));
  };

  const addTableZone = (zone: string): boolean => {
    const trimmed = zone.trim();
    if (!trimmed) return false;
    lastLocalEditTimeRef.current = Date.now();
    let added = false;
    setData(prev => {
      const current = prev.tableZones || [];
      if (current.some(z => z.toLowerCase() === trimmed.toLowerCase())) return prev;
      added = true;
      return {
        ...prev,
        tableZones: [...current, trimmed]
      };
    });
    return added;
  };

  const editTableZone = (oldZone: string, newZone: string) => {
    const trimmed = newZone.trim();
    if (!trimmed || oldZone === trimmed) return;
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      tableZones: (prev.tableZones || []).map(z => z === oldZone ? trimmed : z),
      tables: prev.tables.map(t => t.zone === oldZone ? { ...t, zone: trimmed } : t)
    }));
  };

  const deleteTableZone = (zone: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      tableZones: (prev.tableZones || []).filter(z => z !== zone),
      tables: prev.tables.map(t => t.zone === zone ? { ...t, zone: 'Floor 1' } : t)
    }));
  };

  const addCustomTable = (name: string, zone?: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    lastLocalEditTimeRef.current = Date.now();
    let added = false;
    setData(prev => {
      const tables = prev.tables || [];
      if (tables.some(t => t.name.toLowerCase().trim() === trimmed.toLowerCase())) {
        return prev;
      }
      added = true;
      const id = 'T-' + (tables.length + 1).toString().padStart(2, '0');
      const assignedZone = zone?.trim() || (prev.tableZones && prev.tableZones.length > 0 ? prev.tableZones[0] : 'Floor 1');
      return {
        ...prev,
        tables: [...tables, {
          id,
          name: trimmed,
          zone: assignedZone,
          status: 'free',
          waiter: '',
          customer: 'Walk-in Customer',
          discountType: 'taka',
          discountVal: 0,
          cart: []
        }]
      };
    });
    return added;
  };

  const editCustomTable = (index: number, newName: string, newZone?: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const arr = [...(prev.tables || [])];
      if (arr[index]) {
        arr[index] = { 
          ...arr[index], 
          name: trimmed,
          ...(newZone ? { zone: newZone.trim() } : {})
        };
      }
      return { ...prev, tables: arr };
    });
  };

  const deleteCustomTable = (index: number) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      tables: (prev.tables || []).filter((_, i) => i !== index)
    }));
  };

  // Unified Config Item Handlers for all 9 Master Heads modules
  const addConfigItem = (
    type: 'tables' | 'waiters' | 'vendors' | 'purchaseCategories' | 'departments' | 'menuCategories' | 'expenseHeads' | 'customers' | 'tableZones', 
    val: string,
    extraZone?: string
  ): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    lastLocalEditTimeRef.current = Date.now();
    if (type === 'tables') {
      return addCustomTable(trimmed, extraZone);
    } else if (type === 'tableZones') {
      return addTableZone(trimmed);
    } else {
      let added = false;
      setData(prev => {
        const currentList = (prev[type] as string[]) || [];
        if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        added = true;

        let updatedCoa = prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
        if (type === 'expenseHeads') {
          const alreadyInCoa = updatedCoa.some(a => a.name.toLowerCase().trim() === trimmed.toLowerCase());
          if (!alreadyInCoa) {
            const nextCode = getNextAccountCode('EXPENSE', updatedCoa, 'Operating Expenses');
            updatedCoa = [
              ...updatedCoa,
              {
                id: nextCode,
                code: nextCode,
                name: trimmed,
                type: 'EXPENSE',
                category: 'Operating Expenses',
                balance: 0
              }
            ];
          }
        }

        return {
          ...prev,
          [type]: [...currentList, trimmed],
          ...(type === 'expenseHeads' ? { chartOfAccounts: updatedCoa } : {})
        };
      });
      return added;
    }
  };

  const editConfigItem = (
    type: 'tables' | 'waiters' | 'vendors' | 'purchaseCategories' | 'departments' | 'menuCategories' | 'expenseHeads' | 'customers' | 'tableZones', 
    index: number, 
    newVal: string
  ) => {
    const trimmed = newVal.trim();
    if (!trimmed) return;
    lastLocalEditTimeRef.current = Date.now();
    if (type === 'tables') {
      editCustomTable(index, trimmed);
    } else if (type === 'tableZones') {
      setData(prev => {
        const oldZone = (prev.tableZones || [])[index];
        if (!oldZone) return prev;
        return {
          ...prev,
          tableZones: (prev.tableZones || []).map((z, i) => i === index ? trimmed : z),
          tables: prev.tables.map(t => t.zone === oldZone ? { ...t, zone: trimmed } : t)
        };
      });
    } else {
      setData(prev => {
        const currentList = (prev[type] as string[]) || [];
        const oldVal = currentList[index];
        const list = [...currentList];
        list[index] = trimmed;

        let updatedMenu = prev.menuItems;
        let updatedMaster = prev.masterItems;
        let updatedPurchases = prev.purchases;
        let updatedPurchaseOrders = prev.purchaseOrders;
        let updatedPurchaseReturns = prev.purchaseReturns;
        let updatedPayments = prev.payments;
        let updatedCoa = prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;

        if (type === 'departments') {
          updatedMenu = prev.menuItems.map(m => m.department === oldVal ? { ...m, department: trimmed } : m);
        } else if (type === 'menuCategories') {
          updatedMenu = prev.menuItems.map(m => m.category === oldVal ? { ...m, category: trimmed } : m);
        } else if (type === 'purchaseCategories') {
          updatedMaster = prev.masterItems.map(m => m.category === oldVal ? { ...m, category: trimmed } : m);
        } else if (type === 'vendors') {
          updatedMaster = prev.masterItems.map(m => m.vendor === oldVal ? { ...m, vendor: trimmed } : m);
          updatedPurchases = prev.purchases.map(p => p.vendor === oldVal ? { ...p, vendor: trimmed } : p);
          updatedPurchaseOrders = (prev.purchaseOrders || []).map(po => po.vendor === oldVal ? { ...po, vendor: trimmed } : po);
          updatedPurchaseReturns = (prev.purchaseReturns || []).map(pr => pr.vendor === oldVal ? { ...pr, vendor: trimmed } : pr);
          updatedPayments = (prev.payments || []).map(pay => pay.vendor === oldVal ? { ...pay, vendor: trimmed } : pay);
        } else if (type === 'expenseHeads') {
          updatedCoa = updatedCoa.map(a => (oldVal && a.name.toLowerCase().trim() === oldVal.toLowerCase().trim()) ? { ...a, name: trimmed } : a);
        }

        return {
          ...prev,
          [type]: list,
          menuItems: updatedMenu,
          masterItems: updatedMaster,
          purchases: updatedPurchases,
          purchaseOrders: updatedPurchaseOrders,
          purchaseReturns: updatedPurchaseReturns,
          payments: updatedPayments,
          chartOfAccounts: updatedCoa
        };
      });
    }
  };

  const removeConfigItem = (
    type: 'tables' | 'waiters' | 'vendors' | 'purchaseCategories' | 'departments' | 'menuCategories' | 'expenseHeads' | 'customers' | 'tableZones', 
    itemOrIndex: string | number
  ) => {
    lastLocalEditTimeRef.current = Date.now();
    if (type === 'tables') {
      setData(prev => {
        const idx = typeof itemOrIndex === 'number' 
          ? itemOrIndex 
          : prev.tables.findIndex(t => t.name === itemOrIndex);
        if (idx < 0) return prev;
        return {
          ...prev,
          tables: prev.tables.filter((_, i) => i !== idx)
        };
      });
    } else if (type === 'tableZones') {
      setData(prev => {
        const zoneName = typeof itemOrIndex === 'number' 
          ? (prev.tableZones || [])[itemOrIndex] 
          : itemOrIndex;
        if (!zoneName) return prev;
        return {
          ...prev,
          tableZones: (prev.tableZones || []).filter(z => z !== zoneName),
          tables: prev.tables.map(t => t.zone === zoneName ? { ...t, zone: 'Floor 1' } : t)
        };
      });
    } else {
      setData(prev => ({
        ...prev,
        [type]: typeof itemOrIndex === 'number' 
          ? ((prev[type] as string[]) || []).filter((_, i) => i !== itemOrIndex)
          : ((prev[type] as string[]) || []).filter(item => item !== itemOrIndex)
      }));
    }
  };

  // HR & Employee Management Handlers
  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const id = `EMP-${((data.employees || DEFAULT_EMPLOYEES).length + 1).toString().padStart(2, '0')}`;
    setData(prev => ({
      ...prev,
      employees: [...(prev.employees || DEFAULT_EMPLOYEES), { ...emp, id }]
    }));
  };

  const editEmployee = (id: string, updates: Partial<Employee>) => {
    setData(prev => ({
      ...prev,
      employees: (prev.employees || DEFAULT_EMPLOYEES).map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const deleteEmployee = (id: string) => {
    setData(prev => ({
      ...prev,
      employees: (prev.employees || DEFAULT_EMPLOYEES).filter(e => e.id !== id)
    }));
  };

  // Attendance Handlers
  const addAttendanceRecord = (record: Omit<AttendanceRecord, 'id'>) => {
    const id = `att-${Date.now()}`;
    setData(prev => ({
      ...prev,
      attendanceRecords: [{ ...record, id }, ...(prev.attendanceRecords || DEFAULT_ATTENDANCE_RECORDS)]
    }));
  };

  const updateAttendanceRecord = (id: string, updates: Partial<AttendanceRecord>) => {
    setData(prev => ({
      ...prev,
      attendanceRecords: (prev.attendanceRecords || DEFAULT_ATTENDANCE_RECORDS).map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const deleteAttendanceRecord = (id: string) => {
    setData(prev => ({
      ...prev,
      attendanceRecords: (prev.attendanceRecords || DEFAULT_ATTENDANCE_RECORDS).filter(a => a.id !== id)
    }));
  };

  const bulkSyncAttendanceRecords = (incoming: (Omit<AttendanceRecord, 'id'> | AttendanceRecord)[]) => {
    let added = 0;
    let updated = 0;
    setData(prev => {
      const current = [...(prev.attendanceRecords || DEFAULT_ATTENDANCE_RECORDS)];
      const updatedList = [...current];

      incoming.forEach((rec, idx) => {
        const existingIdx = updatedList.findIndex(
          a => a.employeeId === rec.employeeId && a.date === rec.date
        );

        if (existingIdx >= 0) {
          const old = updatedList[existingIdx];
          updatedList[existingIdx] = {
            ...old,
            ...rec,
            id: old.id,
            inTime: rec.inTime || old.inTime,
            outTime: rec.outTime || old.outTime,
            status: rec.status || old.status,
            workingHours: rec.workingHours !== undefined ? rec.workingHours : old.workingHours,
            punchSource: rec.punchSource || old.punchSource || 'EXCEL_IMPORT'
          };
          updated++;
        } else {
          const newId = ('id' in rec && rec.id) ? (rec as any).id : `att-${Date.now()}-${idx}`;
          updatedList.unshift({
            ...rec,
            id: newId,
            punchSource: rec.punchSource || 'EXCEL_IMPORT'
          });
          added++;
        }
      });

      return {
        ...prev,
        attendanceRecords: updatedList
      };
    });
    return { added, updated };
  };

  // Leave Handlers
  const addLeaveApplication = (leave: Omit<LeaveApplication, 'id'>) => {
    const id = `leave-${Date.now()}`;
    setData(prev => ({
      ...prev,
      leaveApplications: [{ ...leave, id }, ...(prev.leaveApplications || DEFAULT_LEAVE_APPLICATIONS)]
    }));
  };

  const updateLeaveStatus = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setData(prev => ({
      ...prev,
      leaveApplications: (prev.leaveApplications || DEFAULT_LEAVE_APPLICATIONS).map(l => l.id === id ? { ...l, status } : l)
    }));
  };

  const deleteLeaveApplication = (id: string) => {
    setData(prev => ({
      ...prev,
      leaveApplications: (prev.leaveApplications || DEFAULT_LEAVE_APPLICATIONS).filter(l => l.id !== id)
    }));
  };

  // Shifts, Employment & Leave Types Handlers
  const addWorkShift = (shift: Omit<WorkShift, 'id'>) => {
    const id = `shift-${Date.now()}`;
    setData(prev => ({
      ...prev,
      workShifts: [...(prev.workShifts || DEFAULT_WORK_SHIFTS), { ...shift, id }]
    }));
  };

  const editWorkShift = (id: string, updates: Partial<WorkShift>) => {
    setData(prev => ({
      ...prev,
      workShifts: (prev.workShifts || DEFAULT_WORK_SHIFTS).map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const deleteWorkShift = (id: string) => {
    setData(prev => ({
      ...prev,
      workShifts: (prev.workShifts || DEFAULT_WORK_SHIFTS).filter(s => s.id !== id)
    }));
  };

  const addEmploymentType = (type: Omit<EmploymentType, 'id'>) => {
    const id = `emp-type-${Date.now()}`;
    setData(prev => ({
      ...prev,
      employmentTypes: [...(prev.employmentTypes || DEFAULT_EMPLOYMENT_TYPES), { ...type, id }]
    }));
  };

  const editEmploymentType = (id: string, updates: Partial<EmploymentType>) => {
    setData(prev => ({
      ...prev,
      employmentTypes: (prev.employmentTypes || DEFAULT_EMPLOYMENT_TYPES).map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const deleteEmploymentType = (id: string) => {
    setData(prev => ({
      ...prev,
      employmentTypes: (prev.employmentTypes || DEFAULT_EMPLOYMENT_TYPES).filter(t => t.id !== id)
    }));
  };

  const addLeaveType = (type: Omit<LeaveType, 'id'>) => {
    const id = `lt-${Date.now()}`;
    setData(prev => ({
      ...prev,
      leaveTypes: [...(prev.leaveTypes || DEFAULT_LEAVE_TYPES), { ...type, id }]
    }));
  };

  const editLeaveType = (id: string, updates: Partial<LeaveType>) => {
    setData(prev => ({
      ...prev,
      leaveTypes: (prev.leaveTypes || DEFAULT_LEAVE_TYPES).map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const deleteLeaveType = (id: string) => {
    setData(prev => ({
      ...prev,
      leaveTypes: (prev.leaveTypes || DEFAULT_LEAVE_TYPES).filter(t => t.id !== id)
    }));
  };

  // Journal Entries Handlers
  const addJournalEntry = (entry: Omit<JournalEntry, 'id'>) => {
    const id = `jv-${Date.now()}`;
    setData(prev => ({
      ...prev,
      journalEntries: [{ ...entry, id }, ...(prev.journalEntries || DEFAULT_JOURNAL_ENTRIES)]
    }));
  };

  const editJournalEntry = (id: string, updated: Partial<JournalEntry>) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      journalEntries: (prev.journalEntries || DEFAULT_JOURNAL_ENTRIES).map(j =>
        j.id === id ? { ...j, ...updated } : j
      )
    }));
  };

  const deleteJournalEntry = (id: string) => {
    setData(prev => ({
      ...prev,
      journalEntries: (prev.journalEntries || DEFAULT_JOURNAL_ENTRIES).filter(j => j.id !== id)
    }));
  };

  // Chart of Accounts Handlers (Strict Unique Code Enforcement)
  const addAccountHead = (head: Omit<AccountHead, 'id'>) => {
    lastLocalEditTimeRef.current = Date.now();
    const code = head.code.trim();
    setData(prev => {
      const currentList = prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
      if (currentList.some(h => (h.code || '').trim() === code)) {
        console.warn(`Account code ${code} already exists! Duplicate skipped.`);
        return prev;
      }
      const id = code || `ACC-${Date.now()}`;
      const systemRole = head.systemRole || getAccountSystemRole(head);
      const nextList = [...currentList, { ...head, code, id, systemRole }].sort((a, b) =>
        (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
      );
      return {
        ...prev,
        chartOfAccounts: nextList
      };
    });
  };

  const editAccountHead = (id: string, updated: Partial<AccountHead>) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const currentList = prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
      const targetOld = currentList.find(h => h.id === id);
      const oldCode = targetOld?.code;

      if (updated.code) {
        const trimmedCode = updated.code.trim();
        const conflict = currentList.some(h => h.id !== id && (h.code || '').trim() === trimmedCode);
        if (conflict) {
          console.warn(`Account code ${trimmedCode} already exists! Update skipped.`);
          return prev;
        }
      }

      const updatedList = currentList.map(h => {
        if (h.id !== id) return h;
        const merged = { ...h, ...updated };
        const systemRole = updated.systemRole !== undefined ? updated.systemRole : (merged.systemRole || getAccountSystemRole(merged));
        return { ...merged, systemRole };
      }).sort((a, b) =>
        (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
      );

      // Cascading updates for foreign-key-like references
      let updatedPaymentMethods = prev.paymentMethods;
      let updatedJournalEntries = prev.journalEntries;

      if (updated.code && oldCode && updated.code.trim() !== oldCode) {
        const newCode = updated.code.trim();
        if (prev.paymentMethods) {
          updatedPaymentMethods = prev.paymentMethods.map(m => {
            if (m.ledgerAccountId === oldCode || m.ledgerAccountId === id) {
              return { ...m, ledgerAccountId: newCode };
            }
            return m;
          });
        }
        if (prev.journalEntries) {
          updatedJournalEntries = prev.journalEntries.map(j => ({
            ...j,
            debitAccountId: (j.debitAccountId === oldCode || j.debitAccountId === id) ? newCode : j.debitAccountId,
            creditAccountId: (j.creditAccountId === oldCode || j.creditAccountId === id) ? newCode : j.creditAccountId,
            debitAccountName: (j.debitAccountId === oldCode || j.debitAccountId === id || j.debitAccountId === newCode) && updated.name ? `${newCode} - ${updated.name}` : j.debitAccountName,
            creditAccountName: (j.creditAccountId === oldCode || j.creditAccountId === id || j.creditAccountId === newCode) && updated.name ? `${newCode} - ${updated.name}` : j.creditAccountName
          }));
        }
      }

      return {
        ...prev,
        chartOfAccounts: updatedList,
        paymentMethods: updatedPaymentMethods,
        journalEntries: updatedJournalEntries
      };
    });
  };

  const deleteAccountHead = (id: string) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => ({
      ...prev,
      chartOfAccounts: (prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS).filter(h => h.id !== id)
    }));
  };

  const findExpenseAccount = (expense: ExpenseRecord): AccountHead | undefined => {
    return resolveExpenseAccount(expense, data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS);
  };

  const getLiveAccountBalance = (acc: AccountHead): number => {
    const opening = acc.balance || 0;
    const code = acc.code;

    const role = acc.systemRole || getAccountSystemRole(acc);
    const normName = (acc.name || '').toLowerCase();
    // ADE (Assets, Drawings, Expenses) are Debit normal; LCR (Liabilities, Capital, Revenue) are Credit normal
    const isDebitNature = acc.type === 'ASSET' || acc.type === 'EXPENSE' || role === 'OWNER_DRAWINGS';

    // Journal entries net effect
    const journalEffect = (data.journalEntries || []).reduce((sum, j) => {
      let delta = 0;
      if (j.debitAccountId === acc.id || j.debitAccountId === acc.code) {
        delta += isDebitNature ? j.amount : -j.amount;
      }
      if (j.creditAccountId === acc.id || j.creditAccountId === acc.code) {
        delta += !isDebitNature ? j.amount : -j.amount;
      }
      return sum + delta;
    }, 0);

    switch (role) {
      case 'INVENTORY_ASSET':
        return opening + totalClosingStockVal + journalEffect;

      case 'CASH':
        return rawCashDrawer + journalEffect;

      case 'PETTY_CASH':
        return rawPettyCash + journalEffect;

      case 'BANK':
        return rawBankTransfer + journalEffect;

      case 'MOBILE_BANKING':
        return (rawBkashMerchant + rawNagadMerchant) + journalEffect;

      case 'ACCOUNTS_RECEIVABLE':
        return totalCustomerDue + journalEffect;

      case 'ACCOUNTS_PAYABLE':
        return totalVendorDue + journalEffect;

      case 'CUSTOMER_ADVANCE':
        return totalCustomerAdvances + journalEffect;

      case 'TAX_PAYABLE':
        return opening + totalSalesVAT + journalEffect;

      case 'RETAINED_EARNINGS':
        return opening + estimatedProfit + journalEffect;

      case 'OWNER_EQUITY':
        return opening + (baseCashDrawer === 0 ? activeShiftFloat : 0) + journalEffect;

      case 'OWNER_DRAWINGS':
        return opening + journalEffect;

      case 'DINE_IN_REVENUE': {
        const dineInSales = activeSalesList.filter(s => !s.channelOrAgent || s.channelOrAgent === 'dine_in').reduce((sum, s) => {
          const sVat = (typeof s.vatVal === 'number' && s.vatVal >= 0)
            ? s.vatVal 
            : (isVatGloballyEnabled && currentVatPct > 0 ? Math.round(((s.total * currentVatPct) / (100 + currentVatPct)) * 100) / 100 : 0);
          return sum + (s.total || 0) - sVat;
        }, 0);
        return opening + (dineInSales > 0 ? dineInSales : netSalesRevenue) + journalEffect;
      }

      case 'DELIVERY_REVENUE': {
        const deliverySales = activeSalesList.filter(s => s.channelOrAgent && s.channelOrAgent !== 'dine_in').reduce((sum, s) => {
          const sVat = (typeof s.vatVal === 'number' && s.vatVal >= 0)
            ? s.vatVal 
            : (isVatGloballyEnabled && currentVatPct > 0 ? Math.round(((s.total * currentVatPct) / (100 + currentVatPct)) * 100) / 100 : 0);
          return sum + (s.total || 0) - sVat;
        }, 0);
        return opening + deliverySales + journalEffect;
      }

      case 'BEVERAGE_REVENUE': {
        const bevSales = activeSalesList.filter(s => 
          (s.items || []).some(i => (i.department || '').toLowerCase().includes('beverage') || (i.category || '').toLowerCase().includes('beverage') || (i.category || '').toLowerCase().includes('coffee'))
        ).reduce((sum, s) => {
          const sVat = (typeof s.vatVal === 'number' && s.vatVal >= 0)
            ? s.vatVal 
            : (isVatGloballyEnabled && currentVatPct > 0 ? Math.round(((s.total * currentVatPct) / (100 + currentVatPct)) * 100) / 100 : 0);
          return sum + (s.total || 0) - sVat;
        }, 0);
        return opening + bevSales + journalEffect;
      }

      case 'OPERATING_REVENUE': {
        return opening + netSalesRevenue + journalEffect;
      }

      case 'COGS': {
        if (acc.code === '6050' || normName.includes('manual')) {
          return opening + totalManualUsedCostVal + journalEffect;
        }
        if (normName.includes('wastage') || normName.includes('spoilage')) {
          return opening + totalWastageCostVal + journalEffect;
        }
        const cogsAmt = bomCostPerAccount[acc.code] ?? bomCostPerAccount[acc.id] ?? 0;
        return opening + cogsAmt + journalEffect;
      }

      case 'OPERATING_EXPENSE': {
        const chartAccounts = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
        const headExpenses = (data.expenses || []).filter(e => {
          const matched = resolveExpenseAccount(e, chartAccounts);
          return matched && (matched.id === acc.id || matched.code === acc.code);
        }).reduce((sum, e) => sum + (e.amount || 0), 0);
        return opening + headExpenses + journalEffect;
      }

      case 'STANDARD':
      default:
        if (acc.type === 'REVENUE') {
          return opening + netSalesRevenue + journalEffect;
        }
        if (acc.type === 'EXPENSE') {
          const chartAccounts = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
          const headExpenses = (data.expenses || []).filter(e => {
            const matched = resolveExpenseAccount(e, chartAccounts);
            return matched && (matched.id === acc.id || matched.code === acc.code);
          }).reduce((sum, e) => sum + (e.amount || 0), 0);
          return opening + headExpenses + journalEffect;
        }
        if (acc.type === 'ASSET') {
          const chartAccounts = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
          const assetExpenses = (data.expenses || []).filter(e => {
            const matched = resolveExpenseAccount(e, chartAccounts);
            return matched && (matched.id === acc.id || matched.code === acc.code);
          }).reduce((sum, e) => sum + (e.amount || 0), 0);
          
          // Deduct vendor payments targeting this asset account
          const vendorPaymentsForAcc = data.payments.filter(p => {
            const cfg = getMethodConfig(p.method);
            return cfg?.ledgerAccountId === acc.code || cfg?.ledgerAccountId === acc.id;
          }).reduce((sum, p) => sum + (p.amount || 0), 0);

          return opening + assetExpenses - vendorPaymentsForAcc + journalEffect;
        }
        return opening + journalEffect;
    }
  };

  const getMethodCollection = (methodOrId: PaymentMethodConfig | string): number => {
    const methodList = (data.paymentMethods && data.paymentMethods.length > 0)
      ? data.paymentMethods
      : DEFAULT_PAYMENT_METHODS;

    const methodObj = typeof methodOrId === 'string'
      ? methodList.find(m => m.id === methodOrId || m.name.toLowerCase() === methodOrId.toLowerCase())
      : methodOrId;
    
    const mId = typeof methodOrId === 'string' ? methodOrId : methodOrId.id;
    const mName = methodObj?.name || mId;
    const mType = methodObj?.type || 'OTHER';

    return activeSalesList.reduce((sum, s) => {
      // 1. Explicit dynamic paymentBreakdown entry
      if (s.paymentBreakdown) {
        if (s.paymentBreakdown[mId] !== undefined) {
          return sum + (s.paymentBreakdown[mId] || 0);
        }
        if (s.paymentBreakdown[mName] !== undefined) {
          return sum + (s.paymentBreakdown[mName] || 0);
        }
      }

      // 2. Fallback matching for legacy sales records
      const norm = `${mId} ${mName} ${methodObj?.providerName || ''}`.toLowerCase();
      if (mType === 'CASH') {
        return sum + (s.cash || 0);
      }
      if (mType === 'CREDIT') {
        return sum + (s.dueGiven || 0);
      }
      if (mType === 'CARD') {
        return sum + (s.card || 0);
      }
      if (mType === 'MFS') {
        if (norm.includes('nagad')) return sum + (s.nagad || 0);
        if (norm.includes('bkash')) return sum + (s.bkash || 0);
        return sum + (s.bkash || 0) + (s.nagad || 0);
      }
      if (mType === 'BANK') {
        return sum + (s.card || 0);
      }
      return sum;
    }, 0);
  };

  const getMethodLiveBalance = (methodOrId: PaymentMethodConfig | string): number => {
    const methodList = (data.paymentMethods && data.paymentMethods.length > 0)
      ? data.paymentMethods
      : DEFAULT_PAYMENT_METHODS;

    const methodObj = typeof methodOrId === 'string'
      ? methodList.find(m => m.id === methodOrId || m.name.toLowerCase() === methodOrId.toLowerCase() || m.id.toLowerCase() === methodOrId.toLowerCase())
      : methodOrId;

    if (methodObj) {
      if (methodObj.ledgerAccountId) {
        const head = (data.chartOfAccounts || []).find(a => a.code === methodObj.ledgerAccountId || a.id === methodObj.ledgerAccountId);
        if (head) {
          return getLiveAccountBalance(head);
        }
      }

      const nameLower = `${methodObj.name} ${methodObj.providerName || ''}`.toLowerCase();
      if (methodObj.type === 'CASH') {
        if (nameLower.includes('petty')) {
          return pettyCashBalance || 0;
        }
        return cashDrawerBalance || 0;
      }
      if (methodObj.type === 'MFS') {
        if (nameLower.includes('nagad')) {
          return nagadMerchantBalance || 0;
        }
        if (nameLower.includes('bkash')) {
          return bkashMerchantBalance || 0;
        }
        return (bkashMerchantBalance || 0) + (nagadMerchantBalance || 0);
      }
      if (methodObj.type === 'CARD') {
        return payCard || 0;
      }
      if (methodObj.type === 'BANK' || methodObj.type === 'BANGLA_QR') {
        return bankTransferBalance || 0;
      }
      if (methodObj.type === 'CREDIT') {
        return totalCustomerDue || 0;
      }
    }

    if (typeof methodOrId === 'string') {
      const s = methodOrId.toUpperCase();
      if (s === 'CASH' || s.includes('DRAWER')) return cashDrawerBalance || 0;
      if (s.includes('PETTY')) return pettyCashBalance || 0;
      if (s.includes('BKASH')) return bkashMerchantBalance || 0;
      if (s.includes('NAGAD')) return nagadMerchantBalance || 0;
      if (s.includes('CARD')) return payCard || 0;
      if (s.includes('BANK')) return bankTransferBalance || 0;
    }

    return 0;
  };

  // Customer Advance Handlers
  const saveCustomerAdvance = (advance: Omit<CustomerAdvance, 'id'> & { id?: number }) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const list = prev.customerAdvances || [];
      const custName = (advance.customer || '').trim();
      
      const currentCusts = prev.customers || [];
      const hasCustomer = currentCusts.some(c => isSameCustomer(c, custName));
      const updatedCustomers = (hasCustomer || !custName || custName.toLowerCase().includes('walk-in'))
        ? currentCusts
        : [...currentCusts, custName];

      if (advance.id) {
        return {
          ...prev,
          customers: updatedCustomers,
          customerAdvances: list.map(a => a.id === advance.id ? { ...a, ...advance } as CustomerAdvance : a)
        };
      } else {
        const newAdv: CustomerAdvance = {
          id: Date.now(),
          date: advance.date || new Date().toISOString().split('T')[0],
          customer: custName,
          amount: Number(advance.amount) || 0,
          adjustedAmount: 0,
          method: advance.method || 'CASH',
          note: advance.note || '',
          status: advance.status || 'ACTIVE'
        };
        return {
          ...prev,
          customers: updatedCustomers,
          customerAdvances: [newAdv, ...list]
        };
      }
    });
  };

  const deleteCustomerAdvance = (id: number) => {
    setData(prev => ({
      ...prev,
      customerAdvances: (prev.customerAdvances || []).filter(a => a.id !== id)
    }));
  };

  const getCustomerAvailableAdvance = (customerName: string): number => {
    if (!customerName || !data.customerAdvances) return 0;
    const norm = customerName.trim().toLowerCase();
    if (!norm || norm === 'walk-in customer' || norm === 'walk-in') return 0;
    return (data.customerAdvances || [])
      .filter(a => isSameCustomer(a.customer, customerName) && a.status !== 'REFUNDED')
      .reduce((sum, a) => sum + Math.max(0, (a.amount || 0) - (a.adjustedAmount || 0)), 0);
  };

  // Settle specific Purchase Bill / Voucher or Pay All Dues
  const settlePurchaseBill = (billNo: string, vendor: string, amount: number, method: string, note?: string) => {
    if (amount <= 0) return;
    const paymentAmount = Number(amount) || 0;
    const today = new Date().toISOString().split('T')[0];

    setData(prev => {
      // 1. Add vendor payment record
      const newPayment: VendorPayment = {
        id: Date.now(),
        date: today,
        vendor,
        billNo: billNo ? billNo.trim() : undefined,
        amount: paymentAmount,
        method: method || 'Cash Drawer',
        note: note ? note.trim() : (billNo ? `Bill Payment #${billNo}` : `Vendor Due Settlement`)
      };

      // 2. Update paid amount on matching purchases
      let updatedPurchases = prev.purchases.map(p => ({ ...p }));

      if (billNo && billNo.trim()) {
        const targetBillNo = billNo.trim();
        updatedPurchases = updatedPurchases.map(p => {
          if (p.vendor === vendor && p.billNo === targetBillNo) {
            const currentPaid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
            return {
              ...p,
              paid: Math.min(p.total, currentPaid + paymentAmount)
            };
          }
          return p;
        });
      } else {
        // Pay All Dues: Distribute payment across unpaid credit bills for this vendor
        let remainingToDistribute = paymentAmount;
        updatedPurchases = updatedPurchases.map(p => {
          if (p.vendor === vendor && p.paymentType === 'CREDIT' && remainingToDistribute > 0) {
            const currentPaid = p.paid || 0;
            const due = Math.max(0, p.total - currentPaid);
            if (due > 0) {
              const payForThisBill = Math.min(due, remainingToDistribute);
              remainingToDistribute -= payForThisBill;
              return {
                ...p,
                paid: currentPaid + payForThisBill
              };
            }
          }
          return p;
        });
      }

      return {
        ...prev,
        purchases: updatedPurchases,
        payments: [newPayment, ...prev.payments]
      };
    });
  };

  // Reset & Clean Data per Module
  const resetModuleData = (moduleType: 'sales' | 'expenses' | 'purchases' | 'payables' | 'receivables' | 'stock' | 'inventory' | 'tables' | 'menu' | 'menu-items' | 'masterItems' | 'master-items' | 'items' | 'customerAdvances' | 'coa' | 'heads' | 'users' | 'all') => {
    setData(prev => {
      if (moduleType === 'sales') {
        return {
          ...prev,
          sales: [],
          posSessions: [],
          dayEndRecords: [],
          session: { isActive: false, openingCash: 0, startTime: "" },
          businessDay: { date: new Date().toISOString().split('T')[0], isOpen: false, dayNumber: 1 },
          tables: prev.tables.map(t => ({ ...t, status: 'free' as const, waiter: '', customerName: '', cart: [], discountVal: 0, isBillPrinted: false }))
        };
      } else if (moduleType === 'purchases') {
        return {
          ...prev,
          purchases: [],
          purchaseOrders: [],
          purchaseReturns: [],
          payments: []
        };
      } else if (moduleType === 'payables') {
        return {
          ...prev,
          payments: []
        };
      } else if (moduleType === 'receivables' || moduleType === 'customerAdvances') {
        return {
          ...prev,
          customerAdvances: []
        };
      } else if (moduleType === 'expenses') {
        return { ...prev, expenses: [] };
      } else if (moduleType === 'stock' || moduleType === 'inventory') {
        return { ...prev, inventory: [] };
      } else if (moduleType === 'tables') {
        return {
          ...prev,
          tables: DEFAULT_DATA.tables.map(t => ({ ...t, status: 'free', waiter: '', cart: [], discountVal: 0 }))
        };
      } else if (moduleType === 'menu' || moduleType === 'menu-items') {
        return { ...prev, menuItems: [] };
      } else if (moduleType === 'masterItems' || moduleType === 'master-items') {
        return { ...prev, masterItems: [] };
      } else if (moduleType === 'items') {
        return { ...prev, menuItems: [], masterItems: [] };
      } else if (moduleType === 'coa' || moduleType === 'heads') {
        return { ...prev, chartOfAccounts: DEFAULT_CHART_OF_ACCOUNTS };
      } else if (moduleType === 'users') {
        return { ...prev, users: DEFAULT_USERS, rolePermissions: DEFAULT_ROLE_PERMISSIONS };
      } else if (moduleType === 'all') {
        return {
          ...prev,
          sales: [],
          purchases: [],
          purchaseOrders: [],
          purchaseReturns: [],
          expenses: [],
          payments: [],
          inventory: [],
          customerAdvances: [],
          posSessions: [],
          dayEndRecords: [],
          chefShifts: [],
          activeChefShift: null,
          waiterShifts: [],
          activeWaiterShift: null,
          journalEntries: [],
          chartOfAccounts: (prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS).map(acc => ({
            ...acc,
            balance: 0
          })),
          tables: (prev.tables || []).map(t => ({ 
            ...t, 
            status: 'free' as const, 
            waiter: '', 
            customerName: '', 
            cart: [], 
            discountVal: 0, 
            isBillPrinted: false 
          })),
          session: { isActive: false, openingCash: 0, startTime: "" },
          businessDay: { date: new Date().toISOString().split('T')[0], isOpen: false, dayNumber: 1 }
        };
      }
      return prev;
    });
  };

  const cleanModuleData = (moduleType: any) => {
    resetModuleData(moduleType);
  };

  const resetAllData = () => {
    setData(prev => ({
      ...prev,
      sales: [],
      purchases: [],
      purchaseOrders: [],
      purchaseReturns: [],
      expenses: [],
      payments: [],
      inventory: [],
      customerAdvances: [],
      posSessions: [],
      dayEndRecords: [],
      chefShifts: [],
      activeChefShift: null,
      waiterShifts: [],
      activeWaiterShift: null,
      journalEntries: [],
      chartOfAccounts: (prev.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS).map(acc => ({
        ...acc,
        balance: 0
      })),
      tables: (prev.tables || []).map(t => ({ 
        ...t, 
        status: 'free' as const, 
        waiter: '', 
        customerName: '', 
        cart: [], 
        discountVal: 0, 
        isBillPrinted: false 
      })),
      session: { isActive: false, openingCash: 0, startTime: "" },
      businessDay: { date: new Date().toISOString().split('T')[0], isOpen: false, dayNumber: 1 }
    }));
  };

  const cleanAllSystemData = () => {
    resetAllData();
  };

  // JSON Data Backup & Restore
  const exportBackupJson = () => {
    const backupStr = JSON.stringify(data, null, 2);
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const restName = data.restaurantProfile?.name || 'Restaurant_POS';
    const sanitized = restName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    a.download = `${sanitized}_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importBackupJson = (imported: string | AppData): boolean => {
    try {
      let parsedData: any = imported;
      if (typeof imported === 'string') {
        parsedData = JSON.parse(imported);
      }
      if (!parsedData || typeof parsedData !== 'object') return false;
      lastLocalEditTimeRef.current = Date.now();
      setData(prev => ({
        ...DEFAULT_DATA,
        ...parsedData,
        tables: parsedData.tables || prev.tables,
        session: parsedData.session || prev.session
      }));
      return true;
    } catch (e) {
      console.error("Failed to import JSON backup:", e);
      return false;
    }
  };

  // Restaurant Profile & Logo
  const updateRestaurantProfile = (profileUpdates: Partial<RestaurantProfile>) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedProfile: RestaurantProfile = {
        ...(prev.restaurantProfile || DEFAULT_RESTAURANT_PROFILE),
        ...profileUpdates
      };
      return {
        ...prev,
        restaurantProfile: updatedProfile
      };
    });
  };

  // Master Serial & Sequences Configuration
  const updateSerialConfig = (configUpdates: Partial<SerialNumberConfig>) => {
    lastLocalEditTimeRef.current = Date.now();
    setData(prev => {
      const updatedConfig: SerialNumberConfig = {
        ...(prev.serialConfig || DEFAULT_SERIAL_CONFIG),
        ...configUpdates
      };
      return {
        ...prev,
        serialConfig: updatedConfig
      };
    });
  };

  const totalCustomerAdvances = (data.customerAdvances || [])
    .filter(a => a.status === 'ACTIVE' || (a.status !== 'REFUNDED' && (a.amount || 0) > (a.adjustedAmount || 0)))
    .reduce((sum, a) => sum + Math.max(0, (a.amount || 0) - (a.adjustedAmount || 0)), 0);

  return (
    <RestaurantContext.Provider value={{
      data,
      activeTab,
      setActiveTab,
      activeSubNav,
      setActiveSubNav,
      navigateTo,
      activeModule,
      setActiveModule,
      activeTableId,
      setActiveTableId,
      posView,
      setPosView,
      currentUser,
      login,
      loginByPin,
      registerUser,
      logout,
      switchUser,
      addUser,
      editUser,
      deleteUser,
      updateRolePermissions,
      updateOrderEditPermission,
      canAccessTab,
      language,
      setLanguage,
      t,
      selectTable,
      addToCart,
      updateCartQty,
      updateCartItemQty,
      setCartItemQty,
      updateCartItemNotes,
      removeCartItem,
      voidCartItem,
      releaseTable,
      cancelPosOrder,
      openPrintCancelKot,
      clearCart,
      setTableDiscount,
      setTableWaiter,
      setTableCustomer,
      setTableZone,
      setTableChannel,
      applyTablePromoCode,
      holdTableOrder,
      unlockBilledTable,
      updateGlobalTableDimensions,
      addCommissionAgent,
      updateCommissionAgent,
      deleteCommissionAgent,
      addPrinter,
      updatePrinter,
      deletePrinter,
      addPrintTemplate,
      updatePrintTemplate,
      deletePrintTemplate,
      duplicatePrintTemplate,
      setDefaultPrintTemplate,
      setAllKotShowPrices,
      addPaymentMethod,
      updatePaymentMethod,
      deletePaymentMethod,
      setDefaultPaymentMethod,
      businessDay: data.businessDay || {
        date: new Date().toISOString().split('T')[0],
        isOpen: true,
        openedAt: "11:00 AM",
        openedBy: "Admin / Cashier",
        dayNumber: 1
      },
      startBusinessDay,
      startSession,
      endSession,
      closeSessionWithReconciliation,
      handoverShiftWithLogout,
      performDailyDayEndClose,
      performDayOffClose,
      transferWaiterTables,
      deleteSessionRecord,
      deleteDayEndRecord,
      isStartSessionModalOpen,
      setIsStartSessionModalOpen,
      pendingHandoverCashier,
      setPendingHandoverCashier,
      pendingHandoverFloat,
      setPendingHandoverFloat,
      pendingHandoverFrom,
      setPendingHandoverFrom,
      isCloseSessionModalOpen,
      setIsCloseSessionModalOpen,
      isTableZoneModalOpen,
      setIsTableZoneModalOpen,
      isWaiterShiftModalOpen,
      setIsWaiterShiftModalOpen,
      selectedWaiterForShiftModal,
      setSelectedWaiterForShiftModal,
      isChefShiftModalOpen,
      setIsChefShiftModalOpen,
      startChefShift,
      endChefShift,
      startWaiterShift,
      endWaiterShift,
      selectedZReportSession,
      setSelectedZReportSession,
      selectedDayEndPreview,
      setSelectedDayEndPreview,
      openTables,
      activeSessionStats,
      activeSettlingTable,
      openSettleModal,
      closeSettleModal,
      settlePayment,
      getMethodCollection,
      getMethodLiveBalance,
      printableReceipt,
      setPrintableReceipt,
      openPrintBill,
      openPrintKot,
      directSubmitKotAndHold,
      directPrintBill,
      closePrintReceipt,
      saveDirectDueCollection,
      deleteSale,
      voidSale,
      restoreVoidedSale,
      reopenSettledSaleInPos,
      finishLinkedOrderInPos,
      updateSaleWaiter,
      saveMenuItem,
      deleteMenuItem,
      importMenuItems,
      saveMasterItem,
      deleteMasterItem,
      importMasterItems,
      savePurchaseVoucher,
      deletePurchaseVoucher,
      savePurchaseOrder,
      deletePurchaseOrder,
      receivePurchaseOrderItems,
      savePurchaseReturn,
      deletePurchaseReturn,
      saveExpense,
      deleteExpense,
      saveVendorPayment,
      deleteVendorPayment,
      settlePurchaseBill,
      saveInventoryRecord,
      addEmployee,
      editEmployee,
      deleteEmployee,
      addAttendanceRecord,
      updateAttendanceRecord,
      deleteAttendanceRecord,
      bulkSyncAttendanceRecords,
      addLeaveApplication,
      updateLeaveStatus,
      deleteLeaveApplication,
      addWorkShift,
      editWorkShift,
      deleteWorkShift,
      addEmploymentType,
      editEmploymentType,
      deleteEmploymentType,
      addLeaveType,
      editLeaveType,
      deleteLeaveType,
      addJournalEntry,
      editJournalEntry,
      deleteJournalEntry,
      addConfigItem,
      editConfigItem,
      removeConfigItem,
      addCustomHead,
      editCustomHead,
      deleteCustomHead,
      addCustomTable,
      editCustomTable,
      deleteCustomTable,
      addTableZone,
      editTableZone,
      deleteTableZone,
      updateRestaurantProfile,
      updateSerialConfig,
      addAccountHead,
      editAccountHead,
      deleteAccountHead,
      getLiveAccountBalance,
      findExpenseAccount,
      saveCustomerAdvance,
      deleteCustomerAdvance,
      getCustomerAvailableAdvance,
      resetModuleData,
      cleanModuleData,
      resetAllData,
      cleanAllSystemData,
      exportBackupJson,
      importBackupJson,
      metrics: {
        totalSales,
        salesCount,
        totalPurchases,
        purchaseCount,
        totalExpenses,
        totalCustomerDue,
        totalCustomerAdvances,
        totalVendorDue,
        totalOpeningStockVal,
        totalOpeningStockQty,
        totalClosingStockVal,
        totalStockItemsCount,
        totalInwardPurchasesVal: totalPurchasesStockVal,
        totalInwardPurchasesQty: totalPurchasesStockQty,
        totalWastageCostVal,
        totalWastageQty,
        totalBomCostVal,
        totalBomUsedQty,
        totalManualUsedVal: totalManualUsedCostVal,
        totalManualUsedQty,
        totalProductionCost,
        totalCogsVal: totalProductionCost,
        lowStockCount,
        negativeStockCount,
        estimatedProfit,
        payCash,
        payCard,
        payBkash,
        payNagad,
        paymentAccountBalances: {
          cashDrawer: getMethodLiveBalance('cash') || cashDrawerBalance,
          pettyCash: getMethodLiveBalance('petty_cash') || pettyCashBalance,
          bankTransfer: getMethodLiveBalance('bank_transfer') || bankTransferBalance,
          cheque: chequeBalance,
          bkashMerchant: getMethodLiveBalance('bkash_merchant') || bkashMerchantBalance,
          nagadMerchant: getMethodLiveBalance('nagad_merchant') || nagadMerchantBalance
        },
        freeTablesCount,
        occupiedTablesCount,
        autoBomUsageMap,
        topSellingItems
      }
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
