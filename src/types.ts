export interface MenuItemVariation {
  id: string;
  name: string; // e.g. "Small (1:1)", "Medium (1:2)", "Large / Family", "250g", "500g", "Half", "Full"
  type?: 'size' | 'weight' | 'portion' | 'custom';
  criteria?: 'Size' | 'Weight' | 'Portion' | 'Custom' | string;
  price: number;
  cost?: number;
  recipeMultiplier?: number; // e.g. 0.5, 1.0, 1.5, 2.0
}

export interface MenuItemAddon {
  id: string;
  name: string; // e.g. "Extra Cheese", "French Fries Side", "Special BBQ Dip", "Mushroom Topping"
  price: number;
  rawItemId?: number;
  rawQty?: number;
}

export interface MenuItemPromo {
  id?: string;
  code: string; // e.g. "SAVE20", "STEAKOFF50"
  title: string; // e.g. "Weekend Promotion 20% Off"
  discountType: DiscountType;
  discountVal: number; // e.g. 20 (for percent) or 100 (for taka)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  timerDurationHours?: number;
  isActive: boolean;
}

export interface CommissionAgent {
  id: string; // e.g. "foodpanda", "pathao", "foodi", "hungernaki", "custom_1"
  name: string; // "Foodpanda", "Pathao Food", "Foodi"
  commissionPercent: number; // 20, 15, 12 (%)
  priceListMultiplier?: number; // e.g. 1.15 (15% higher selling price)
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
  printOnBill?: boolean; // Active status for Print Bill (Guest Bill)
  printOnSettle?: boolean; // Active status for Settle & Pay (Paid Cash Memo)
  notes?: string;
}

export interface TableCartItem {
  id: number;
  cartItemId?: string; // unique item id inside cart
  name: string;
  department?: string; // e.g. "Main Kitchen", "Rooftop Grill & BBQ", "Beverage & Cafe Counter"
  category?: string;   // e.g. "Steak & BBQ", "Cold Beverages & Coffee"
  basePrice?: number;
  price: number;
  qty: number;
  kotPrinted?: boolean; // whether sent to kitchen / KOT printed
  kotPrintedQty?: number; // quantity that was already printed in KOT
  kotPrintedAt?: string;
  kotPrintedTimestamp?: number; // timestamp in ms when KOT was printed/submitted
  addedAt?: number; // timestamp when item was ordered/added to cart
  addedAtTime?: string; // formatted time string e.g. "4:48 PM"
  selectedVariation?: MenuItemVariation;
  selectedAddons?: MenuItemAddon[];
  appliedChannel?: string;
  appliedPromo?: string;
  notes?: string;
}

export type PrinterType = 'KOT' | 'BILL' | 'REPORT' | 'ALL';
export type PrinterConnectionType = 'USB' | 'LAN';
export type ThermalPaperWidth = '80mm' | '58mm';

export interface PrinterConfig {
  id: string;
  name: string; // e.g. "Main Kitchen Thermal Printer", "Bar / Cafe Counter Printer", "Cashier Receipt Printer", "Accounts Report Printer"
  type: PrinterType; // KOT, BILL, REPORT, ALL
  connectionType: PrinterConnectionType; // USB, LAN
  ipAddress?: string; // e.g. "192.168.1.100"
  port?: number; // e.g. 9100
  usbPort?: string; // e.g. "USB001" or "POS-80"
  baudRate?: number; // e.g. 9600, 115200
  paperWidth: ThermalPaperWidth; // 80mm or 58mm
  departments: string[]; // Dept routing e.g. ["Main Kitchen", "Rooftop Grill & BBQ"]
  categories: string[]; // Category routing e.g. ["Steak & BBQ", "Rice & Biryani"]
  printOnBill?: boolean;
  printOnSettle?: boolean;
  isDefault?: boolean;
  isActive: boolean;
  notes?: string;
}

export type TemplateTargetType = 'KOT' | 'BILL' | 'BOTH';

export interface PrintTemplate {
  id: string;
  name: string; // e.g. "Main Kitchen KOT (80mm)", "Beverage Counter KOT (58mm)", "Customer Bill (80mm)", "Takeaway Slip (58mm)"
  templateType: TemplateTargetType; // KOT, BILL, BOTH
  paperWidth: ThermalPaperWidth; // 80mm or 58mm
  departments: string[]; // Specific departments or empty for all
  categories: string[]; // Specific categories or empty for all
  headerTitle?: string; // e.g. "*** KITCHEN ORDER TICKET ***", "INVOICE / CASH MEMO"
  showLogo: boolean;
  showTagline: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showBinVat: boolean;
  showTableZone: boolean;
  showWaiter: boolean;
  showCustomer: boolean;
  showDateTime: boolean;
  showPricesOnKot: boolean;
  showPrices?: boolean;
  showNotes: boolean;
  fontSize: 'sm' | 'base' | 'lg';
  footerMessage?: string; // e.g. "Thank you for dining with us!", "⚡ Fast Kitchen Dispatch"
  footerNotes?: string; // e.g. "VAT included • Powered by ERP"
  showVatBreakdown: boolean;
  showPaymentBreakdown: boolean;
  showOrderCount: boolean;
  isDefault?: boolean;
  isActive: boolean;
}

export type PaymentMethodType = 'CASH' | 'CARD' | 'MFS' | 'BANK' | 'CREDIT' | 'OTHER' | 'BANGLA_QR';

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: PaymentMethodType;
  accountNumber?: string;
  providerName?: string;
  chargePercent?: number;
  isDefault?: boolean;
  isActive: boolean;
  notes?: string;
  ledgerAccountId?: string;
}

export type TableStatus = 'free' | 'hold' | 'billed';
export type DiscountType = 'taka' | 'percent';

export interface Table {
  id: string;
  name: string;
  zone?: string; // e.g. 'Floor 1', 'Floor 2', 'VIP Lounge', 'Rooftop', etc.
  capacity?: number;
  status: TableStatus;
  waiter: string;
  customer: string;
  channelOrAgentId?: string; // e.g. 'dine_in', 'foodpanda', 'pathao', 'foodi'
  discountType: DiscountType;
  discountVal: number;
  cart: TableCartItem[];
  orderCreatedBy?: string;
  orderCreatedRole?: string;
  orderCreatedId?: string;
  orderCreatedAt?: number;
  billedAt?: number;
  billedAtTime?: string;
  linkedSaleId?: number;
  linkedInvoiceNo?: string;
  isPaidOrder?: boolean;
  paidAmount?: number;
  orderRef?: string;
  kotCount?: number;
  billCount?: number;
  kotBaseSerial?: string;
}

export interface Session {
  id?: string;
  isActive: boolean;
  openingCash: number;
  startTime: string;
  startDate?: string;
  openedBy?: string;
  startTimestamp?: number;
  notes?: string;
  shiftType?: string; // e.g. 'Shift 1' | 'Shift 2'
}

export type PosSession = Session;

export interface PosSessionRecord {
  id: string; // e.g. "SES-20260824-001"
  date: string;
  openedBy: string;
  closedBy?: string;
  role?: UserRole;
  shiftType?: string; // e.g. 'Shift 1' | 'Shift 2'
  startTime: string;
  endTime?: string;
  startTimestamp: number;
  endTimestamp?: number;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  bkashSales: number;
  nagadSales: number;
  dueSales: number;
  totalSales: number;
  orderCount: number;
  expectedCash: number;
  actualClosingCash?: number;
  cashDifference?: number; // actualClosingCash - expectedCash (0 = matched, <0 shortage, >0 surplus)
  cashDropToVault?: number; // amount sent to manager/safe vault
  nextShiftDrawerFloat?: number; // amount kept in drawer for next shift
  handoverToCashier?: string; // name of the incoming cashier receiving the drawer/shift
  openTablesCount?: number;
  carriedOverTableIds?: string[];
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  saleIds?: number[];
  waiterBreakdown?: Array<{
    waiter: string;
    orderCount: number;
    totalSales: number;
  }>;
  roleBreakdown?: Array<{
    role: string;
    orderCount: number;
    cashCollected: number;
    digitalCollected: number;
    dueAmount?: number;
    totalCollected: number;
  }>;
  cashierBreakdown?: Array<{
    cashier: string;
    role?: string;
    shift?: string;
    orderCount: number;
    cashCollected: number;
    digitalCollected: number;
    dueAmount?: number;
    totalCollected: number;
  }>;
  isDirectPrint?: boolean;
}

export interface BusinessDay {
  date: string; // e.g. "2026-09-07"
  isOpen: boolean;
  openedAt?: string;
  openedBy?: string;
  closedAt?: string;
  closedBy?: string;
  dayNumber?: number;
  pendingHandoverCashier?: string;
  pendingHandoverFloat?: number;
  pendingHandoverFrom?: string;
}

export interface DayEndRecord {
  id: string; // e.g. "DAY-20260906-001"
  date: string;
  totalDaySales: number;
  totalDayOrders: number;
  shiftCount: number;
  shiftIds: string[];
  totalCash: number;
  totalCard: number;
  totalBkash: number;
  totalNagad: number;
  totalDue: number;
  totalExpenses: number;
  netCashToVault: number;
  openedBy?: string;
  openedAt?: string;
  openingCash?: number;
  closingCash?: number;
  closedBy: string;
  closedAt: string;
  notes?: string;
  isDirectPrint?: boolean;
}

export interface ConsolidatedDayReportData {
  date: string;
  dayRecord?: DayEndRecord;
  shiftCount: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  isDirectPrint?: boolean;
  totalBkash: number;
  totalNagad: number;
  totalDue: number;
  totalExpenses: number;
  netCashToVault: number;
  openedBy?: string;
  openedAt?: string;
  openingCash?: number;
  closingCash?: number;
  isClosed: boolean;
  closedBy: string;
  closedAt: string | null;
}

export interface ChefShiftRecord {
  id: string; // e.g. "KCS-20260906-001"
  chefName: string;
  station: string; // 'Main Kitchen' | 'Grill & BBQ' | 'Cafe & Bakery' | 'Appetizer & Fry' | 'All Stations'
  shiftType: 'Morning Shift' | 'Evening Shift' | 'Night Shift';
  date: string;
  startTime: string;
  endTime?: string;
  startTimestamp: number;
  endTimestamp?: number;
  isActive: boolean;
  kotsPreparedCount: number;
  dishesCookedCount: number;
  notes?: string;
  handoverToChef?: string;
}

export interface WaiterShiftRecord {
  id: string; // e.g. "WSR-20260906-001"
  waiterName: string;
  assignedZone: string; // e.g. 'All Zones' | 'Floor 1' | 'Floor 2' | 'Rooftop'
  shiftType: 'Morning Shift' | 'Evening Shift' | 'Night Shift';
  date: string;
  startTime: string;
  endTime?: string;
  startTimestamp: number;
  endTimestamp?: number;
  isActive: boolean;
  totalOrders: number;
  totalSales: number;
  estimatedTips: number;
  serverCashFloat?: number; // Optional personal change float issued from drawer
  cashDrawerSessionId?: string; // Relation to central cash drawer session
  notes?: string;
  handoverToWaiter?: string;
}

export interface RawMasterItem {
  id: number;
  name: string;
  category: string;
  vendor: string;
  uom: string;
  defaultRate: number;
}

export interface RecipeIngredient {
  rawItemId: number;
  qty: number;
}

export interface MenuItem {
  id: number;
  name: string;
  department: string;
  category: string;
  price: number; // Base selling price
  cost?: number;
  recipe: RecipeIngredient[];
  channelPrices?: Record<string, number>; // e.g. { foodpanda: 650, pathao: 620, foodi: 600 }
  variations?: MenuItemVariation[]; // Size, Weight, Portion options
  addons?: MenuItemAddon[]; // Extra cheese, sauces, sides
  promo?: MenuItemPromo; // Promo code, direct discount & countdown timer
  imageUrl?: string; // Food photo (compressed Data URL or URL)
}

export interface PurchaseItem {
  itemId: number;
  item: string;
  category: string;
  uom: string;
  qty: number;
  rate: number;
  total: number;
}

export type PurchasePaymentType = 'CREDIT' | 'CASH' | string;
export type PurchaseStatus = 'DRAFT' | 'FINAL';

export interface PurchaseVoucher {
  id: number;
  date: string;
  vendor: string;
  billNo: string;
  paymentType: PurchasePaymentType;
  paymentMethod?: string;
  items: PurchaseItem[];
  total: number;
  paid?: number;
  status: PurchaseStatus;
}

export interface PurchaseOrder {
  id: number;
  poNo: string;
  date: string;
  vendor: string;
  expectedDate?: string;
  items: PurchaseItem[];
  total: number;
  status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'FULFILLED' | 'CANCELLED';
  grnNo?: string;
  notes?: string;
  receivedHistory?: {
    grnNo: string;
    billNo: string;
    date: string;
    items: PurchaseItem[];
    total: number;
  }[];
}

export interface PurchaseReturn {
  id: number;
  returnNo: string;
  date: string;
  vendor: string;
  billNo?: string;
  itemId: number;
  item: string;
  qty: number;
  uom: string;
  rate: number;
  total: number;
  reason: string;
  refundStatus: 'REFUNDED' | 'ADJUSTED' | 'PENDING';
}

export interface SaleRecord {
  id: number;
  date: string;
  invoiceNo: string;
  orderRef?: string;
  details: string;
  subtotal?: number;
  items?: TableCartItem[];
  channelOrAgent?: string; // e.g. "Foodpanda (20%)", "Pathao (15%)", "Foodi (12%)", "Dine-In"
  channel?: string;
  commissionAgentId?: string;
  channelCommissionPercent?: number;
  channelCommissionAmount?: number;
  grossAmount?: number;
  commissionAmount?: number;
  discountAmount?: number;
  netAmount?: number;
  commissionPercent?: number;
  table?: string;
  discountVal?: number;
  discountType?: DiscountType;
  vatVal?: number;
  vatPercent?: number;
  vatMode?: 'inclusive' | 'exclusive';
  netRestaurantRevenue?: number; // total - commission
  appliedPromo?: string;
  cash: number;
  card: number;
  bkash: number;
  nagad: number;
  dueGiven: number;
  dueCustomer?: string;
  customer?: string;
  dueCollected: number;
  dueCollectedFrom?: string;
  advanceAdjusted?: number;
  paymentBreakdown?: Record<string, number>;
  change: number;
  total: number;
  sessionId?: string;
  waiterName?: string;
  cashierName?: string;
  cashierRole?: string;
  cashierId?: string;
  sellerName?: string;
  sellerRole?: string;
  sellerId?: string;
  orderCreatedBy?: string;
  orderCreatedRole?: string;
  shift?: string;
  createdAt?: number;
  status?: 'SETTLED' | 'VOIDED' | 'CANCELLED';
  isVoid?: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  refundAmount?: number;
  refundMethod?: string;
  refundStatus?: 'REFUNDED' | 'NO_REFUND';
  tableId?: string;
  refundItems?: Array<{
    itemId: number;
    itemName: string;
    qty: number;
    unitPrice: number;
    refundAmount: number;
    refundMethod: string;
    reason: string;
    refundedAt: string;
    refundedBy: string;
  }>;
}

export interface ExpenseRecord {
  id: number;
  date: string;
  head: string;
  amount: number;
  note?: string;
  title?: string;
  category?: string;
  notes?: string;
  paymentMethod?: string;
  accountId?: string;
  accountCode?: string;
  accountName?: string;
}

export interface VendorPayment {
  id: number;
  date: string;
  vendor: string;
  billNo?: string;
  method: string;
  amount: number;
  note?: string;
}

export interface StockInventoryRecord {
  id: number; // raw master item id
  open: number;
  used: number; // legacy/total manual used or usage
  manualUsed?: number; // direct manual kitchen usage
  wastage?: number; // kitchen wastage / spoilage
  rate?: number;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type AccountSystemRole =
  | 'CASH'                // Cash Drawer (1010)
  | 'PETTY_CASH'          // Petty Cash Fund (1020)
  | 'BANK'                // Bank Accounts (1030)
  | 'MOBILE_BANKING'      // Mobile Wallets (bKash/Nagad) (1040)
  | 'ACCOUNTS_RECEIVABLE' // Customer Dues (1050)
  | 'INVENTORY_ASSET'     // Raw Material / Stock Inventory (1060)
  | 'ACCOUNTS_PAYABLE'    // Vendor / Supplier Dues (2010)
  | 'CUSTOMER_ADVANCE'    // Customer Advance Deposits (2030 or 2020)
  | 'TAX_PAYABLE'         // VAT, Tax, SD, Statutory Liabilities (2020 or 2030)
  | 'OWNER_EQUITY'        // Owner's Capital (3010)
  | 'RETAINED_EARNINGS'   // Retained Earnings (3020)
  | 'OWNER_DRAWINGS'      // Owner Drawings & Withdrawals (3030 - ADE)
  | 'DINE_IN_REVENUE'     // Dine-in Sales Revenue (4010)
  | 'DELIVERY_REVENUE'    // Takeaway & Delivery Revenue (4020)
  | 'BEVERAGE_REVENUE'    // Beverage & Bar Counter Sales (4030)
  | 'OPERATING_REVENUE'   // General Operating Revenue (4000 series)
  | 'COGS'                // Cost of Goods Sold (5010, 5020...)
  | 'OPERATING_EXPENSE'   // Operating Expenses (6010, 6020...)
  | 'STANDARD';           // General ledger / unclassified (strictly opening + journals)

export interface AccountHead {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: string;
  systemRole?: AccountSystemRole;
  balance?: number;
}

export interface CustomerAdvance {
  id: number;
  date: string;
  customer: string;
  amount: number;
  method: string;
  note?: string;
  status: 'ACTIVE' | 'ADJUSTED' | 'REFUNDED';
  adjustedAmount?: number;
  linkedInvoiceNo?: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'CHEF';

export type ActiveTab =
  | 'launcher'
  | 'dashboard'
  | 'pos'
  | 'menu-items'
  | 'sales'
  | 'expenses'
  | 'purchases'
  | 'payables'
  | 'receivables'
  | 'inv-items'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'heads'
  | 'hr'
  | 'journal'
  | 'data-cleanup';

export interface Employee {
  id: string;
  empCode: string;
  name: string;
  designation: string;
  department: string;
  employmentTypeId: string;
  shiftId: string;
  cardId?: string;
  fingerId?: string;
  basicSalary: number;
  phone: string;
  email?: string;
  nid?: string;
  address?: string;
  joiningDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  shift: string;
  inTime: string;
  outTime?: string;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE';
  workingHours?: number;
  overtimeHours?: number;
  notes?: string;
  punchSource?: 'MANUAL' | 'BIOMETRIC_DEVICE' | 'EXCEL_IMPORT';
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedDate: string;
  reviewedBy?: string;
}

export interface WorkShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  isDefault?: boolean;
}

export interface EmploymentType {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  daysAllowedPerYear: number;
  isPaid: boolean;
}

export interface JournalEntry {
  id: string;
  voucherNo: string;
  date: string;
  debitAccountId: string;
  debitAccountName: string;
  creditAccountId: string;
  creditAccountName: string;
  amount: number;
  narration: string;
  referenceNo?: string;
}

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  pinOrPassword?: string;
  role: UserRole;
  permissions?: ActiveTab[];
  isActive: boolean;
  phone?: string;
  canEditSubmittedOrders?: boolean;
}

export interface RestaurantProfile {
  name: string;
  tagline?: string;
  logoUrl?: string; // Data URL or Image URL
  logoType?: 'preset' | 'upload' | 'url';
  presetIcon?: 'flame' | 'coffee' | 'utensils' | 'chef' | 'crown' | 'store' | 'sparkles';
  address?: string;
  phone?: string;
  email?: string;
  binOrVat?: string;
  currencySymbol?: string;
  outletSecurityKey?: string; // Branch invite code for staff sign-up (e.g. BANANI-2026)
  vatPercent?: number; // Dynamic VAT rate (e.g. 5, 7.5, 10, 15, 0)
  vatMode?: 'inclusive' | 'exclusive'; // default 'inclusive'
  enableVat?: boolean; // toggle auto-VAT on/off
  tableHoldSyncMode?: 'instant' | 'on_kot'; // 'instant': live draft sync across terminals; 'on_kot': hold table only after KOT print
  posTableOrderFlow?: 'modal' | 'direct'; // 'modal': Waiter/Customer dialog first; 'direct': 1-click direct POS order screen
}

export type SerialResetCycle = 'NEVER' | 'DAILY' | 'YEARLY';

export interface SerialNumberConfig {
  posInvoicePrefix: string;
  posInvoiceNextNumber: number;
  posInvoicePadding: number;
  posInvoiceIncludeDate: boolean;
  posInvoiceResetCycle: SerialResetCycle;

  kotPrefix: string;
  kotNextNumber: number;
  kotPadding: number;
  kotIncludeDate: boolean;
  kotResetCycle: SerialResetCycle;

  orderRefPrefix: string;
  orderRefNextNumber: number;
  orderRefPadding: number;
  orderRefResetCycle: SerialResetCycle;

  lastResetDate?: string;
  lastResetYear?: number;
}

export interface AppData {
  session: Session;
  businessDay?: BusinessDay;
  posSessions?: PosSessionRecord[];
  dayEndRecords?: DayEndRecord[];
  chefShifts?: ChefShiftRecord[];
  activeChefShift?: ChefShiftRecord | null;
  waiterShifts?: WaiterShiftRecord[];
  activeWaiterShift?: WaiterShiftRecord | null;
  restaurantProfile?: RestaurantProfile;
  commissionAgents?: CommissionAgent[];
  printers?: PrinterConfig[];
  printTemplates?: PrintTemplate[];
  paymentMethods?: PaymentMethodConfig[];
  tables: Table[];
  tableZones?: string[];
  tableDimensions?: { width: number; height: number };
  waiters: string[];
  departments: string[];
  menuCategories: string[];
  categories?: string[];
  expenseHeads: string[];
  purchaseCategories: string[];
  vendors: string[];
  customers: string[];
  masterItems: RawMasterItem[];
  menuItems: MenuItem[];
  purchases: PurchaseVoucher[];
  purchaseOrders?: PurchaseOrder[];
  purchaseReturns?: PurchaseReturn[];
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  payments: VendorPayment[];
  inventory: StockInventoryRecord[];
  chartOfAccounts?: AccountHead[];
  customerAdvances?: CustomerAdvance[];
  users?: AppUser[];
  rolePermissions?: Record<UserRole, ActiveTab[]>;
  orderEditPermissions?: Record<UserRole, boolean>;
  employees?: Employee[];
  attendanceRecords?: AttendanceRecord[];
  leaveApplications?: LeaveApplication[];
  workShifts?: WorkShift[];
  employmentTypes?: EmploymentType[];
  leaveTypes?: LeaveType[];
  journalEntries?: JournalEntry[];
  serialConfig?: SerialNumberConfig;
}

export interface PrintableReceipt {
  invoiceNo: string;
  orderRef?: string;
  kotSequence?: number;
  isAddonKot?: boolean;
  billVersion?: number;
  dateTime: string;
  tableName: string;
  tableZone?: string;
  waiter: string;
  orderTakenBy?: string;
  settleBillRole?: string;
  customer: string;
  channelOrAgent?: string;
  channelCommissionPercent?: number;
  channelCommissionAmount?: number;
  items: TableCartItem[];
  subtotal: number;
  discountDeduction: number;
  discountType: DiscountType;
  discountVal: number;
  vatVal?: number;
  vatPercent?: number;
  vatMode?: 'inclusive' | 'exclusive';
  netTotal: number;
  netRestaurantRevenue?: number;
  paymentBreakdown?: {
    cash?: number;
    card?: number;
    bkash?: number;
    nagad?: number;
    due?: number;
    advance?: number;
    byMethod?: Record<string, number>;
  };
  changeReturn?: number;
  isSettled: boolean;
  receiptType?: 'BILL' | 'KOT' | 'PAID_MEMO' | 'CANCEL_KOT' | 'VOID_MEMO';
  voidReason?: string;
  voidAuthorizedBy?: string;
  refundAmount?: number;
  refundMethod?: string;
  refundStatus?: 'REFUNDED' | 'NO_REFUND';
  cancelledItems?: {
    name: string;
    qty: number;
    price: number;
    department?: string;
    reason?: string;
  }[];
  targetPrinterId?: string;
  targetTemplateId?: string;
  filterDepartment?: string;
  filterCategory?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantHotline?: string;
  restaurantBin?: string;
  isPaid?: boolean;
  isDirectPrint?: boolean;
  showPrices?: boolean;
  paperWidth?: ThermalPaperWidth;
  headerTitle?: string;
  showLogo?: boolean;
  showTagline?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showBinVat?: boolean;
  showTableZone?: boolean;
  showWaiter?: boolean;
  showCustomer?: boolean;
  showPaymentBreakdown?: boolean;
  footerMessage?: string;
  footerNotes?: string;
}
