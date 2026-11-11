import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { InventoryReports } from './InventoryReports';
import { ProcurementReports } from './ProcurementReports';
import { ReceivablesRegistersReports } from './ReceivablesRegistersReports';
import { FinancialStatementsReports } from './FinancialStatementsReports';
import { PosSessionReports } from './PosSessionReports';
import { CommissionReports } from './CommissionReports';
import { UserSalesReport } from './UserSalesReport';
import { ItemSalesReport } from './ItemSalesReport';
import { MenuCategorySalesReport } from './MenuCategorySalesReport';
import { KitchenDepartmentSalesReport } from './KitchenDepartmentSalesReport';
import { 
  BarChart3, 
  Boxes, 
  ShoppingCart, 
  Users, 
  FileText, 
  Receipt, 
  TrendingUp, 
  Wallet, 
  Layers, 
  RotateCcw, 
  Scale, 
  Landmark, 
  Activity, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  Printer, 
  Search, 
  ChevronRight, 
  ChevronDown,
  ChevronLeft,
  Lock, 
  Percent,
  UtensilsCrossed,
  FolderTree,
  ChefHat,
  UserCheck,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  Sparkles
} from 'lucide-react';

export type MasterReportId = 
  // POS Shift Sessions, Commission & Sales Reports
  | 'pos-sessions'
  | 'commission-report'
  | 'user-sales'
  | 'item-sales'
  | 'category-sales'
  | 'department-sales'
  // Inventory (1-3)
  | 'inventory-inwards'
  | 'inventory-outward'
  | 'inventory-transactional'
  // Procurement & Vendors (4-8)
  | 'supplier-total-po'
  | 'supplier-grn'
  | 'supplier-returns'
  | 'all-purchases'
  | 'vendor-statement'
  // Receivables & Registers (9-13)
  | 'receivable-report'
  | 'ageing-schedule'
  | 'day-book'
  | 'ledger-report'
  | 'receipt-payment'
  // IFRS Financial Statements (14-17)
  | 'trial-balance'
  | 'pnl-ifrs'
  | 'balance-sheet'
  | 'cash-flow';

export type ReportSuite = 'pos' | 'inventory' | 'procurement' | 'receivables' | 'financials';

interface ReportMeta {
  id: MasterReportId;
  num: number;
  title: string;
  category: ReportSuite;
  description: string;
  icon: React.ElementType;
}

export const ALL_REPORTS_REGISTRY: ReportMeta[] = [
  // POS Shift Sessions & Sales Reports
  {
    id: 'pos-sessions',
    num: 0,
    title: 'POS Shift Session & Z-Reports',
    category: 'pos',
    description: 'Cash drawer opening/closing logs, cashier shift sales, reconciliation variance & Z-Reports',
    icon: Lock
  },
  {
    id: 'commission-report',
    num: 1,
    title: 'Commission Agents & Delivery Portals Report',
    category: 'pos',
    description: 'Gross portal sales, Foodpanda/Pathao/Foodi commissions deducted, and net restaurant payout statement',
    icon: Percent
  },
  {
    id: 'user-sales',
    num: 2,
    title: 'User & Waiter Wise Sales Report',
    category: 'pos',
    description: 'Staff sales volume, steward order count, cash vs digital collections, discounts, and performance ranking',
    icon: UserCheck
  },
  {
    id: 'item-sales',
    num: 3,
    title: 'Item & Dish Wise Sales Report',
    category: 'pos',
    description: 'Quantity sold, sales revenue ranking, category allocation, estimated food margin, and best sellers',
    icon: UtensilsCrossed
  },
  {
    id: 'category-sales',
    num: 4,
    title: 'Menu Category Wise Sales Report',
    category: 'pos',
    description: 'Category revenue distribution, volume share %, catalog item count, average ticket size, and star performers',
    icon: FolderTree
  },
  {
    id: 'department-sales',
    num: 5,
    title: 'Kitchen Department Wise Sales Report',
    category: 'pos',
    description: 'Production workload, KOT preparation stations, revenue generated per station, and top prepared dishes',
    icon: ChefHat
  },

  // Inventory
  {
    id: 'inventory-inwards',
    num: 1,
    title: 'Inventory Inwards Report',
    category: 'inventory',
    description: 'Raw material procurement receipts, bill vouchers, inward quantities and unit values',
    icon: Boxes
  },
  {
    id: 'inventory-outward',
    num: 2,
    title: 'Inventory Outward Report',
    category: 'inventory',
    description: 'Recipe BOM consumption from POS sales & manual kitchen spoilage deductions',
    icon: Layers
  },
  {
    id: 'inventory-transactional',
    num: 3,
    title: 'Inventory Transactional Report',
    category: 'inventory',
    description: 'Continuous item-wise stock card with running quantities, unit rates and valuation',
    icon: Activity
  },

  // Procurement & Suppliers
  {
    id: 'supplier-total-po',
    num: 1,
    title: 'Supplier Wise Total PO',
    category: 'procurement',
    description: 'Total purchase orders raised, fulfilled inward value and pending delivery per vendor',
    icon: ShoppingCart
  },
  {
    id: 'supplier-grn',
    num: 2,
    title: 'Supplier Wise GRN Report',
    category: 'procurement',
    description: 'Goods Received Note logs, verified physical receiving vouchers and bill totals',
    icon: CheckCircle2
  },
  {
    id: 'supplier-returns',
    num: 3,
    title: 'Supplier Wise Return Report',
    category: 'procurement',
    description: 'Rejected goods, damaged raw materials returns and debit note credit adjustments',
    icon: RotateCcw
  },
  {
    id: 'all-purchases',
    num: 4,
    title: 'All Reports of Purchase',
    category: 'procurement',
    description: 'Consolidated 360° purchase register with bill numbers, paid vs due and payment terms',
    icon: FileText
  },
  {
    id: 'vendor-statement',
    num: 5,
    title: 'Vendor Report (Vendor Statement)',
    category: 'procurement',
    description: 'Comprehensive supplier statement with invoice history, payments and net balance due',
    icon: Landmark
  },

  // Receivables, Registers & Books
  {
    id: 'receivable-report',
    num: 1,
    title: 'Receivable Report',
    category: 'receivables',
    description: 'Customer credit sales, collections received, advance deposits and outstanding dues',
    icon: Users
  },
  {
    id: 'ageing-schedule',
    num: 2,
    title: 'Ageing Schedule (AR & AP)',
    category: 'receivables',
    description: '0-30, 31-60, 61-90, and 90+ days overdue analysis for customer dues and supplier payables',
    icon: Clock
  },
  {
    id: 'day-book',
    num: 3,
    title: 'Day Book',
    category: 'receivables',
    description: 'Chronological master journal of all sales, payments, purchases and operating events',
    icon: BookOpen
  },
  {
    id: 'ledger-report',
    num: 4,
    title: 'Ledger Report (General Ledger)',
    category: 'receivables',
    description: 'Head-wise interactive general ledger with opening balances, debits, credits and running total',
    icon: FileText
  },
  {
    id: 'receipt-payment',
    num: 5,
    title: 'Receipt & Payment Report',
    category: 'receivables',
    description: 'Summary of all cash and bank inflows vs disbursements with closing cash reconciliation',
    icon: Wallet
  },

  // Financial Statements (IFRS)
  {
    id: 'trial-balance',
    num: 1,
    title: 'Trial Balance (Transactional)',
    category: 'financials',
    description: 'Standard double-entry accounting trial balance verifying total debit equals total credit',
    icon: Scale
  },
  {
    id: 'pnl-ifrs',
    num: 2,
    title: 'Profit & Loss Account (as per IFRS)',
    category: 'financials',
    description: 'Statement of profit or loss with net revenue, recipe BOM food costs, OpEx, and net margin',
    icon: TrendingUp
  },
  {
    id: 'balance-sheet',
    num: 3,
    title: 'Balance Sheet (as per IFRS)',
    category: 'financials',
    description: 'Statement of financial position with non-current & current assets, equity and liabilities',
    icon: Landmark
  },
  {
    id: 'cash-flow',
    num: 4,
    title: 'Cash Flow Statement',
    category: 'financials',
    description: 'Direct method analysis of operating, investing, and financing cash flow movements',
    icon: Receipt
  }
];

export const REPORT_SUITES = [
  { 
    id: 'pos' as ReportSuite, 
    label: 'POS & Sales', 
    count: 6, 
    icon: UtensilsCrossed,
    colorClasses: 'text-emerald-700 bg-emerald-50 border-emerald-200' 
  },
  { 
    id: 'inventory' as ReportSuite, 
    label: 'Stock & Inventory', 
    count: 3, 
    icon: Boxes,
    colorClasses: 'text-teal-700 bg-teal-50 border-teal-200' 
  },
  { 
    id: 'procurement' as ReportSuite, 
    label: 'Purchases & Vendors', 
    count: 5, 
    icon: ShoppingCart,
    colorClasses: 'text-amber-700 bg-amber-50 border-amber-200' 
  },
  { 
    id: 'receivables' as ReportSuite, 
    label: 'Registers & Ledgers', 
    count: 5, 
    icon: BookOpen,
    colorClasses: 'text-sky-700 bg-sky-50 border-sky-200' 
  },
  { 
    id: 'financials' as ReportSuite, 
    label: 'IFRS Financials', 
    count: 4, 
    icon: Landmark,
    colorClasses: 'text-purple-700 bg-purple-50 border-purple-200' 
  },
];

export const ReportsView: React.FC = () => {
  const { data, metrics, activeSubNav, setActiveSubNav } = useRestaurant();

  // Active report selection
  const [activeReportId, setActiveReportId] = useState<MasterReportId>(() => {
    if (activeSubNav && ALL_REPORTS_REGISTRY.some(r => r.id === activeSubNav)) {
      return activeSubNav as MasterReportId;
    }
    return 'user-sales';
  });

  // Global ⌘K Command Palette state
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Sync when activeSubNav changes from external navigation
  useEffect(() => {
    if (activeSubNav && ALL_REPORTS_REGISTRY.some(r => r.id === activeSubNav)) {
      setActiveReportId(activeSubNav as MasterReportId);
    }
  }, [activeSubNav]);

  const handleSelectReport = (id: MasterReportId) => {
    setActiveReportId(id);
    if (setActiveSubNav) {
      setActiveSubNav(id);
    }
  };

  // Global Keyboard shortcut (Ctrl+K / Cmd+K) to toggle report catalog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCatalogOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCatalogOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Current active report & suite metadata
  const currentReport = useMemo(() => {
    return ALL_REPORTS_REGISTRY.find(r => r.id === activeReportId) || ALL_REPORTS_REGISTRY[0];
  }, [activeReportId]);

  const currentSuite = useMemo(() => {
    return REPORT_SUITES.find(s => s.id === currentReport.category) || REPORT_SUITES[0];
  }, [currentReport]);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-800 text-amber-400 flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Reports & Business Intelligence
              </h1>
              <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                23 Reports
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Toast & Shopify POS workspace — Shift sessions, sales analytics, stock cards, ledgers & IFRS financials
            </p>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={() => { setCatalogSearch(''); setIsCatalogOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Search</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">⌘K</kbd>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Net Sales Revenue</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
            ৳{metrics.totalSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {data.sales.length} settled dining invoices
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Closing Inventory Asset</span>
            <Boxes className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-teal-800 mt-1">
            ৳{(Math.round((metrics.totalClosingStockVal + Number.EPSILON) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Physical raw material valuation
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Supplier Payables Due</span>
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-700 mt-1">
            ৳{metrics.totalVendorDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Outstanding procurement balance
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Customer Receivables Due</span>
            <Users className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-700 mt-1">
            ৳{metrics.totalCustomerDue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Arrears guest credit balances
          </div>
        </div>
      </div>

      {/* 100% Full View Selected Report Canvas */}
      <main className="w-full min-w-0 space-y-3">
        {/* Top Context & Breadcrumb Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <span>Reports</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-600 font-bold flex items-center gap-1.5">
              {currentSuite.label}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-teal-900 font-black bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {currentReport.title}
            </span>
          </div>

          {/* Quick Actions in Canvas Header */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setCatalogSearch(''); setIsCatalogOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              title="Browse all 23 reports (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search</span>
              <kbd className="text-[9px] font-mono text-slate-400 ml-0.5">⌘K</kbd>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold cursor-pointer shadow-2xs"
              title="Print current report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

          {/* ACTIVE REPORT CANVAS (Rendered 100% full width) */}
          <div className="w-full">
            {/* 0. POS Shift Session & Z-Reports */}
            {activeReportId === 'pos-sessions' && (
              <PosSessionReports />
            )}

            {/* Commission Agents & Delivery Portals Report */}
            {activeReportId === 'commission-report' && (
              <CommissionReports />
            )}

            {/* 1. User Wise Sales Report */}
            {activeReportId === 'user-sales' && (
              <UserSalesReport />
            )}

            {/* 2. Item Wise Sales Report */}
            {activeReportId === 'item-sales' && (
              <ItemSalesReport />
            )}

            {/* 3. Menu Category Wise Sales Report */}
            {activeReportId === 'category-sales' && (
              <MenuCategorySalesReport />
            )}

            {/* 4. Kitchen Department Wise Sales Report */}
            {activeReportId === 'department-sales' && (
              <KitchenDepartmentSalesReport />
            )}

            {/* 1. Inventory Inwards */}
            {activeReportId === 'inventory-inwards' && (
              <InventoryReports reportType="inwards" />
            )}

            {/* 2. Inventory Outward */}
            {activeReportId === 'inventory-outward' && (
              <InventoryReports reportType="outwards" />
            )}

            {/* 3. Inventory Transactional Stock Ledger */}
            {activeReportId === 'inventory-transactional' && (
              <InventoryReports reportType="transactional" />
            )}

            {/* 4. Supplier Wise Total PO */}
            {activeReportId === 'supplier-total-po' && (
              <ProcurementReports reportType="supplier-po" />
            )}

            {/* 5. Supplier Wise GRN Report */}
            {activeReportId === 'supplier-grn' && (
              <ProcurementReports reportType="supplier-grn" />
            )}

            {/* 6. Supplier Wise Return Report */}
            {activeReportId === 'supplier-returns' && (
              <ProcurementReports reportType="supplier-returns" />
            )}

            {/* 7. All Reports of Purchase */}
            {activeReportId === 'all-purchases' && (
              <ProcurementReports reportType="all-purchases" />
            )}

            {/* 8. Vendor Report (Vendor Statement) */}
            {activeReportId === 'vendor-statement' && (
              <ProcurementReports reportType="vendor-statement" />
            )}

            {/* 9. Receivable Report */}
            {activeReportId === 'receivable-report' && (
              <ReceivablesRegistersReports reportType="receivables" />
            )}

            {/* 10. Ageing Schedule */}
            {activeReportId === 'ageing-schedule' && (
              <ReceivablesRegistersReports reportType="ageing" />
            )}

            {/* 11. Day Book */}
            {activeReportId === 'day-book' && (
              <ReceivablesRegistersReports reportType="day-book" />
            )}

            {/* 12. Ledger Report */}
            {activeReportId === 'ledger-report' && (
              <ReceivablesRegistersReports reportType="ledger" />
            )}

            {/* 13. Receipt & Payment Report */}
            {activeReportId === 'receipt-payment' && (
              <ReceivablesRegistersReports reportType="receipt-payment" />
            )}

            {/* 14. Trial Balance */}
            {activeReportId === 'trial-balance' && (
              <FinancialStatementsReports reportType="trial-balance" />
            )}

            {/* 15. Profit & Loss Account (IFRS) */}
            {activeReportId === 'pnl-ifrs' && (
              <FinancialStatementsReports reportType="pnl-ifrs" />
            )}

            {/* 16. Balance Sheet (IFRS) */}
            {activeReportId === 'balance-sheet' && (
              <FinancialStatementsReports reportType="balance-sheet" />
            )}

            {/* 17. Cash Flow Statement */}
            {activeReportId === 'cash-flow' && (
              <FinancialStatementsReports reportType="cash-flow" />
            )}
          </div>
        </main>

      {/* Browse All 23 Reports Command Palette / Catalog Modal (⌘K) */}
      {isCatalogOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-amber-400 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Enterprise Reports Catalog
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Search and jump directly to any of the 23 reporting modules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Type to search reports, Z-reports, ledgers, statements, food costs..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Grouped Reports List */}
            <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar flex-1">
              {REPORT_SUITES.map(suite => {
                const reps = ALL_REPORTS_REGISTRY.filter(r => {
                  if (r.category !== suite.id) return false;
                  if (!catalogSearch) return true;
                  const q = catalogSearch.toLowerCase();
                  return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
                });
                if (reps.length === 0) return null;

                const SuiteIcon = suite.icon;
                return (
                  <div key={suite.id} className="space-y-1.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                      <SuiteIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>{suite.label} ({reps.length})</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {reps.map(rep => {
                        const Icon = rep.icon;
                        const isCurrent = activeReportId === rep.id;
                        return (
                          <button
                            key={rep.id}
                            onClick={() => {
                              handleSelectReport(rep.id);
                              setIsCatalogOpen(false);
                            }}
                            className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                              isCurrent
                                ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-teal-950'
                                : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isCurrent ? 'bg-teal-700 text-white' : 'bg-white border border-slate-200 text-slate-600'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 truncate flex items-center justify-between">
                                <span>{rep.title}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-extrabold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded-md">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                {rep.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
