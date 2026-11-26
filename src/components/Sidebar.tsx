import React, { useState, useEffect } from 'react';
import { useRestaurant, getModuleForTab, DEFAULT_PAYMENT_METHODS } from '../context/RestaurantContext';
import { ActiveTab } from '../types';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  BookOpen, 
  Receipt, 
  Wallet, 
  ShoppingCart, 
  CreditCard, 
  UserCheck, 
  Layers, 
  Boxes, 
  Sliders, 
  Trash2,
  Flame,
  Coffee,
  ChefHat,
  Crown,
  Store,
  Utensils,
  BarChart3,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Building2,
  Clock,
  Calendar,
  Scale,
  FileText,
  Percent,
  FolderTree,
  FileSpreadsheet,
  Grid,
  TrendingUp,
  Sparkles,
  Home,
  CheckCircle2,
  RotateCcw,
  Landmark,
  Activity,
  Lock
} from 'lucide-react';

export interface SubMenuItem {
  id: string;
  tabId: ActiveTab;
  subNav?: string;
  label: string;
  subLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  suiteId?: 'pos' | 'inventory' | 'procurement' | 'receivables' | 'financials';
  suiteTitle?: string;
}

export const REPORT_SUITE_GROUPS = [
  { id: 'pos', title: 'POS & Sales', titleBn: 'পস ও বিক্রয়', icon: UtensilsCrossed, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'inventory', title: 'Stock & Inventory', titleBn: 'স্টক ও ইনভেন্টরি', icon: Boxes, badgeColor: 'bg-teal-500/20 text-teal-300' },
  { id: 'procurement', title: 'Purchases & Vendors', titleBn: 'ক্রয় ও ভেন্ডর', icon: ShoppingCart, badgeColor: 'bg-amber-500/20 text-amber-300' },
  { id: 'receivables', title: 'Registers & Ledgers', titleBn: 'রেজিস্টার ও লেজার', icon: BookOpen, badgeColor: 'bg-sky-500/20 text-sky-300' },
  { id: 'financials', title: 'IFRS Financials', titleBn: 'আর্থিক বিবরণী', icon: Landmark, badgeColor: 'bg-purple-500/20 text-purple-300' },
];

interface MenuGroup {
  key: string;
  title: string;
  titleBn?: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  items: SubMenuItem[];
}

export const Sidebar: React.FC<{ isOpen?: boolean; onCloseMobile?: () => void }> = ({ 
  isOpen = false, 
  onCloseMobile = () => {} 
}) => {
  const { 
    activeTab, 
    setActiveTab, 
    activeSubNav,
    setActiveSubNav,
    activeModule,
    navigateTo,
    metrics, 
    data, 
    setPosView, 
    currentUser, 
    logout, 
    canAccessTab,
    language,
    setLanguage,
    t,
    setIsStartSessionModalOpen
  } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState('');

  const currentModuleKey = activeModule || getModuleForTab(activeTab, activeSubNav);

  // Accordion open/collapse state per group key (only active module open by default)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [currentModuleKey]: true
  }));

  // Auto-expand active group when module changes
  useEffect(() => {
    if (currentModuleKey) {
      setOpenGroups({
        [currentModuleKey]: true
      });
    }
  }, [currentModuleKey, activeTab]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Open/collapse state for 5 report suites under Reports group
  const [openReportSuites, setOpenReportSuites] = useState<Record<string, boolean>>({
    pos: true,
    inventory: false,
    procurement: false,
    receivables: false,
    financials: false,
  });

  const toggleReportSuite = (suiteId: string) => {
    setOpenReportSuites(prev => ({
      ...prev,
      [suiteId]: !prev[suiteId]
    }));
  };

  // Auto-expand appropriate report suite when activeSubNav changes
  useEffect(() => {
    if (activeTab === 'reports' && activeSubNav) {
      if (['pos-sessions', 'commission-report', 'user-sales', 'item-sales', 'category-sales', 'department-sales'].includes(activeSubNav)) {
        setOpenReportSuites(prev => ({ ...prev, pos: true }));
      } else if (['daily-stock-report', 'inventory-inwards', 'inventory-outward', 'inventory-transactional'].includes(activeSubNav)) {
        setOpenReportSuites(prev => ({ ...prev, inventory: true }));
      } else if (['supplier-total-po', 'supplier-grn', 'supplier-returns', 'all-purchases', 'vendor-statement'].includes(activeSubNav)) {
        setOpenReportSuites(prev => ({ ...prev, procurement: true }));
      } else if (['receivable-report', 'ageing-schedule', 'day-book', 'ledger-report', 'receipt-payment'].includes(activeSubNav)) {
        setOpenReportSuites(prev => ({ ...prev, receivables: true }));
      } else if (['trial-balance', 'pnl-ifrs', 'balance-sheet', 'cash-flow'].includes(activeSubNav)) {
        setOpenReportSuites(prev => ({ ...prev, financials: true }));
      }
    }
  }, [activeTab, activeSubNav]);

  const expandAll = () => {
    setOpenGroups({
      'sales-pos': true,
      'menu-kitchen': true,
      'inventory': true,
      'purchases': true,
      'accounts': true,
      'hr': true,
      'reports': true,
      'admin': true
    });
  };

  const collapseAll = () => {
    setOpenGroups({
      'sales-pos': false,
      'menu-kitchen': false,
      'inventory': false,
      'purchases': false,
      'accounts': false,
      'hr': false,
      'reports': false,
      'admin': false
    });
  };

  // Structured menu categories list with rich sub-items
  const menuGroups: MenuGroup[] = [
    // 1. Sales & POS
    {
      key: 'sales-pos',
      title: 'Sales & POS',
      
      icon: UtensilsCrossed,
      items: [
        {
          id: 'pos-billing',
          tabId: 'pos',
          label: 'Live POS Billing',
          subLabel: 'Table Dining & Takeaway',
          icon: UtensilsCrossed,
          badge: metrics.occupiedTablesCount > 0 ? `${metrics.occupiedTablesCount} Busy` : undefined,
          badgeColor: 'bg-[#004b9b] text-white font-bold'
        },
        {
          id: 'pos-sessions',
          tabId: 'reports',
          subNav: 'pos-sessions',
          label: 'Shift Sessions & Z-Report',
          subLabel: 'Cash Drawer Reconciliation',
          icon: Clock,
          badge: data.session?.isActive ? 'Active Shift' : 'Closed',
          badgeColor: data.session?.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
        },
        {
          id: 'commission-report',
          tabId: 'reports',
          subNav: 'commission-report',
          label: 'Commission Agents & Portals',
          subLabel: 'Foodpanda, Pathao, Foodi',
          icon: Percent,
          badge: data.commissionAgents?.length || 3,
          badgeColor: 'bg-cyan-500/20 text-cyan-300'
        },
        {
          id: 'sales-ledger',
          tabId: 'sales',
          label: 'Sales Invoices & Memos',
          subLabel: 'Settled Dining Receipts',
          icon: Receipt,
          badge: `৳${Math.round(metrics.totalSales / 1000)}k`,
          badgeColor: 'bg-emerald-500/20 text-emerald-300'
        }
      ]
    },

    // 2. Menu & Kitchen
    {
      key: 'menu-kitchen',
      title: 'Menu & Kitchen',
      
      icon: BookOpen,
      items: [
        {
          id: 'menu-items',
          tabId: 'menu-items',
          label: 'Menu Items & Recipes',
          subLabel: 'Dishes, Pricing & BOM',
          icon: BookOpen,
          badge: data.menuItems.length,
          badgeColor: 'bg-slate-700 text-slate-200'
        },
        {
          id: 'raw-master',
          tabId: 'inv-items',
          label: 'Raw Materials Master',
          subLabel: 'Ingredients & UOM Catalog',
          icon: Layers,
          badge: data.masterItems.length,
          badgeColor: 'bg-indigo-500/20 text-indigo-300'
        },
        {
          id: 'dept-sales-sub',
          tabId: 'reports',
          subNav: 'department-sales',
          label: 'Kitchen Dept Sales',
          subLabel: 'Station Production Breakdown',
          icon: ChefHat,
          badge: 'Report',
          badgeColor: 'bg-orange-500/20 text-orange-300'
        }
      ]
    },

    // 3. Inventory & Stock
    {
      key: 'inventory',
      title: 'Inventory & Stock',
      
      icon: Boxes,
      items: [
        {
          id: 'stock-valuation',
          tabId: 'inventory',
          label: 'Physical Stock Valuation',
          subLabel: 'Current Balance & Value',
          icon: Boxes,
          badge: `৳${Math.round(metrics.totalClosingStockVal / 1000)}k`,
          badgeColor: 'bg-indigo-500/20 text-indigo-300'
        },
        {
          id: 'rep-daily-stock-direct',
          tabId: 'reports',
          subNav: 'daily-stock-report',
          label: 'Daily Opening & Closing Report',
          subLabel: 'Opening, usages & closing sheet',
          icon: Calendar
        },
        {
          id: 'inv-inwards-rep',
          tabId: 'reports',
          subNav: 'inventory-inwards',
          label: 'Inventory Inwards Report',
          subLabel: 'Raw Material Procurements',
          icon: ShoppingCart
        },
        {
          id: 'inv-outwards-rep',
          tabId: 'reports',
          subNav: 'inventory-outward',
          label: 'Inventory Outwards & BOM',
          subLabel: 'Recipe Consumption & Spoilage',
          icon: Layers
        },
        {
          id: 'inv-trans-rep',
          tabId: 'reports',
          subNav: 'inventory-transactional',
          label: 'Stock Card Ledger',
          subLabel: 'Transactional Item Card',
          icon: FileSpreadsheet
        }
      ]
    },

    // 4. Purchases & Vendors
    {
      key: 'purchases',
      title: 'Purchases & Vendors',
      
      icon: ShoppingCart,
      items: [
        {
          id: 'purchases-vouchers',
          tabId: 'purchases',
          label: 'Purchase Vouchers & GRN',
          subLabel: 'Inward Bills & Receiving',
          icon: ShoppingCart,
          badge: data.purchases.length,
          badgeColor: 'bg-blue-500/20 text-blue-300'
        },
        {
          id: 'payables-settle',
          tabId: 'payables',
          label: 'Vendor Payables & Dues',
          subLabel: 'Supplier Bills Settlement',
          icon: CreditCard,
          badge: metrics.totalVendorDue > 0 ? `৳${Math.round(metrics.totalVendorDue / 1000)}k Due` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300'
        },
        {
          id: 'supplier-po-rep',
          tabId: 'reports',
          subNav: 'supplier-total-po',
          label: 'Supplier Purchase Orders',
          subLabel: 'Order Requisitions & Status',
          icon: FileText
        },
        {
          id: 'vendor-stmt-rep',
          tabId: 'reports',
          subNav: 'vendor-statement',
          label: 'Vendor Statement Ledger',
          subLabel: 'Supplier Account Balances',
          icon: Building2
        }
      ]
    },

    // 5. Accounts & Finance
    {
      key: 'accounts',
      title: 'Accounts & Finance',
      
      icon: Wallet,
      items: [
        {
          id: 'expenses-ledger',
          tabId: 'expenses',
          label: 'Operating Expenses (OpEx)',
          subLabel: 'Daily Utilities & Overhead',
          icon: Wallet,
          badge: `৳${Math.round(metrics.totalExpenses / 1000)}k`,
          badgeColor: 'bg-rose-500/20 text-rose-300'
        },
        {
          id: 'receivables-ledger',
          tabId: 'receivables',
          label: 'Customer Receivables',
          subLabel: 'Credit Sales & Advance Dues',
          icon: UserCheck,
          badge: metrics.totalCustomerDue > 0 ? `৳${Math.round(metrics.totalCustomerDue / 1000)}k` : undefined,
          badgeColor: 'bg-cyan-500/20 text-cyan-300'
        },
        {
          id: 'journal-vouchers',
          tabId: 'journal',
          label: 'Double-Entry Journal (JV)',
          subLabel: 'General Debit/Credit Voucher',
          icon: Scale,
          badge: (data.journalEntries || []).length,
          badgeColor: 'bg-purple-500/20 text-purple-300'
        },
        {
          id: 'acc-chart-of-accounts',
          tabId: 'heads',
          subNav: 'coa',
          label: 'Chart of Accounts (COA)',
          subLabel: 'General Ledger Heads & Assets',
          icon: BookOpen,
          badge: (data.chartOfAccounts || []).length || 17,
          badgeColor: 'bg-emerald-500/20 text-emerald-300'
        },
        {
          id: 'acc-payment-methods',
          tabId: 'heads',
          subNav: 'payments',
          label: 'Payment Methods (3)',
          subLabel: 'Cash, MFS, Cards & QR Gateways',
          icon: CreditCard,
          badge: (data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : DEFAULT_PAYMENT_METHODS).filter(m => m.isActive !== false).length,
          badgeColor: 'bg-amber-500/20 text-amber-300'
        },
        {
          id: 'gen-ledger-rep',
          tabId: 'reports',
          subNav: 'ledger-report',
          label: 'General Ledger & Day Book',
          subLabel: 'COA Account Ledgers',
          icon: FileText
        },
        {
          id: 'pnl-ifrs-rep',
          tabId: 'reports',
          subNav: 'pnl-ifrs',
          label: 'P&L Statement (IFRS)',
          subLabel: 'Income, COGS & Net Margin',
          icon: TrendingUp
        }
      ]
    },

    // 6. HR & Payroll
    {
      key: 'hr',
      title: 'HR & Staff Management',
      
      icon: Users,
      items: [
        {
          id: 'hr-employees',
          tabId: 'hr',
          subNav: 'employee-manager',
          label: 'Employee Directory',
          subLabel: 'Staff Profiles & Designations',
          icon: Users,
          badge: (data.employees || []).length,
          badgeColor: 'bg-purple-500/20 text-purple-300'
        },
        {
          id: 'hr-attendance',
          tabId: 'hr',
          subNav: 'attendance',
          label: 'Attendance & Shifts',
          subLabel: 'Daily In/Out Logs & Hours',
          icon: Clock,
          badge: (data.attendanceRecords || []).length,
          badgeColor: 'bg-emerald-500/20 text-emerald-300'
        },
        {
          id: 'hr-leaves',
          tabId: 'hr',
          subNav: 'leave-application',
          label: 'Leave Applications',
          subLabel: 'Casual, Sick & Annual Leave',
          icon: Calendar,
          badge: (data.leaveApplications || []).filter(l => l.status === 'PENDING').length || undefined,
          badgeColor: 'bg-amber-500 text-slate-950 font-bold'
        },
        {
          id: 'staff-sales-rep',
          tabId: 'reports',
          subNav: 'user-sales',
          label: 'Staff Sales Performance',
          subLabel: 'Waiter & Cashier Analytics',
          icon: UserCheck
        }
      ]
    },

    // 7. Reports & Analytics (All 23 Enterprise Reports)
    {
      key: 'reports',
      title: 'Reports & Analytics',
      titleBn: 'রিপোর্ট ও বিশ্লেষণ',
      icon: BarChart3,
      items: [
        {
          id: 'reports-hub',
          tabId: 'reports',
          label: 'BI Reports Center',
          subLabel: 'All 24 Enterprise Reports',
          icon: BarChart3,
          badge: '24',
          badgeColor: 'bg-teal-500/20 text-teal-300 font-bold'
        },

        // Suite 1: POS & Sales (6)
        {
          id: 'rep-pos-sessions',
          tabId: 'reports',
          subNav: 'pos-sessions',
          label: 'POS Shift Sessions & Z-Reports',
          subLabel: 'Shift reconciliation & variance',
          icon: Lock,
          suiteId: 'pos',
          suiteTitle: 'POS & Sales'
        },
        {
          id: 'rep-commission',
          tabId: 'reports',
          subNav: 'commission-report',
          label: 'Commission Agents & Portals',
          subLabel: 'Foodpanda, Pathao & Foodi',
          icon: Percent,
          suiteId: 'pos',
          suiteTitle: 'POS & Sales'
        },
        {
          id: 'rep-user-sales',
          tabId: 'reports',
          subNav: 'user-sales',
          label: '1. User Wise Sales Report',
          subLabel: 'Staff sales volume & ranking',
          icon: UserCheck,
          suiteId: 'pos',
          suiteTitle: 'POS & Sales'
        },
        {
          id: 'rep-item-sales',
          tabId: 'reports',
          subNav: 'item-sales',
          label: '2. Item Wise Sales Report',
          subLabel: 'Dish quantity & food margin',
          icon: UtensilsCrossed,
          suiteId: 'pos',
          suiteTitle: 'POS & Sales'
        },
        {
          id: 'rep-cat-sales',
          tabId: 'reports',
          subNav: 'category-sales',
          label: '3. Category Wise Sales Report',
          subLabel: 'Category revenue distribution',
          icon: FolderTree,
          suiteId: 'pos',
          suiteTitle: 'POS & Sales'
        },
        {
          id: 'rep-dept-sales',
          tabId: 'reports',
          subNav: 'department-sales',
          label: '4. Kitchen Dept Wise Sales',
          subLabel: 'KOT production workload',
          icon: ChefHat,
          suiteId: 'pos',
          suiteTitle: 'POS & Sales'
        },

        // Suite 2: Stock & Inventory (4)
        {
          id: 'rep-daily-stock',
          tabId: 'reports',
          subNav: 'daily-stock-report',
          label: 'Daily Opening & Closing Stock',
          subLabel: 'Opening, usages & closing balance',
          icon: Boxes,
          suiteId: 'inventory',
          suiteTitle: 'Stock & Inventory'
        },
        {
          id: 'rep-inv-inward',
          tabId: 'reports',
          subNav: 'inventory-inwards',
          label: 'Inventory Inwards Report',
          subLabel: 'Material procurement receipts',
          icon: ShoppingCart,
          suiteId: 'inventory',
          suiteTitle: 'Stock & Inventory'
        },
        {
          id: 'rep-inv-outward',
          tabId: 'reports',
          subNav: 'inventory-outward',
          label: 'Inventory Outward Report',
          subLabel: 'Recipe BOM consumption',
          icon: Layers,
          suiteId: 'inventory',
          suiteTitle: 'Stock & Inventory'
        },
        {
          id: 'rep-inv-trans',
          tabId: 'reports',
          subNav: 'inventory-transactional',
          label: 'Stock Card Ledger (Bin Card)',
          subLabel: 'Continuous audit trail & bin cards',
          icon: Activity,
          suiteId: 'inventory',
          suiteTitle: 'Stock & Inventory'
        },

        // Suite 3: Purchases & Vendors (5)
        {
          id: 'rep-sup-po',
          tabId: 'reports',
          subNav: 'supplier-total-po',
          label: 'Supplier Wise Total PO',
          subLabel: 'Purchase orders & pending delivery',
          icon: ShoppingCart,
          suiteId: 'procurement',
          suiteTitle: 'Purchases & Vendors'
        },
        {
          id: 'rep-sup-grn',
          tabId: 'reports',
          subNav: 'supplier-grn',
          label: 'Supplier Wise GRN Report',
          subLabel: 'Goods received notes & bill totals',
          icon: CheckCircle2,
          suiteId: 'procurement',
          suiteTitle: 'Purchases & Vendors'
        },
        {
          id: 'rep-sup-ret',
          tabId: 'reports',
          subNav: 'supplier-returns',
          label: 'Supplier Wise Return Report',
          subLabel: 'Damaged materials & debit notes',
          icon: RotateCcw,
          suiteId: 'procurement',
          suiteTitle: 'Purchases & Vendors'
        },
        {
          id: 'rep-all-pur',
          tabId: 'reports',
          subNav: 'all-purchases',
          label: 'All Reports of Purchase',
          subLabel: '360° consolidated purchase register',
          icon: FileText,
          suiteId: 'procurement',
          suiteTitle: 'Purchases & Vendors'
        },
        {
          id: 'rep-ven-stmt',
          tabId: 'reports',
          subNav: 'vendor-statement',
          label: 'Vendor Statement',
          subLabel: 'Supplier ledger & balance due',
          icon: Landmark,
          suiteId: 'procurement',
          suiteTitle: 'Purchases & Vendors'
        },

        // Suite 4: Registers & Ledgers (5)
        {
          id: 'rep-receivable',
          tabId: 'reports',
          subNav: 'receivable-report',
          label: 'Receivable Report',
          subLabel: 'Customer credit dues & collections',
          icon: Users,
          suiteId: 'receivables',
          suiteTitle: 'Registers & Ledgers'
        },
        {
          id: 'rep-ageing',
          tabId: 'reports',
          subNav: 'ageing-schedule',
          label: 'Ageing Schedule (AR & AP)',
          subLabel: '30/60/90+ days overdue analysis',
          icon: Clock,
          suiteId: 'receivables',
          suiteTitle: 'Registers & Ledgers'
        },
        {
          id: 'rep-daybook',
          tabId: 'reports',
          subNav: 'day-book',
          label: 'Day Book',
          subLabel: 'Chronological master journal',
          icon: BookOpen,
          suiteId: 'receivables',
          suiteTitle: 'Registers & Ledgers'
        },
        {
          id: 'rep-ledger',
          tabId: 'reports',
          subNav: 'ledger-report',
          label: 'Ledger Report (General Ledger)',
          subLabel: 'Head-wise interactive debits & credits',
          icon: FileText,
          suiteId: 'receivables',
          suiteTitle: 'Registers & Ledgers'
        },
        {
          id: 'rep-rcpt-pmt',
          tabId: 'reports',
          subNav: 'receipt-payment',
          label: 'Receipt & Payment Report',
          subLabel: 'Cash & bank inflows and disbursements',
          icon: Wallet,
          suiteId: 'receivables',
          suiteTitle: 'Registers & Ledgers'
        },

        // Suite 5: IFRS Financial Statements (4)
        {
          id: 'rep-trial-bal',
          tabId: 'reports',
          subNav: 'trial-balance',
          label: 'Trial Balance (Transactional)',
          subLabel: 'Double-entry debit vs credit verification',
          icon: Scale,
          suiteId: 'financials',
          suiteTitle: 'IFRS Financials'
        },
        {
          id: 'rep-pnl',
          tabId: 'reports',
          subNav: 'pnl-ifrs',
          label: 'Profit & Loss Account (IFRS)',
          subLabel: 'Revenue, BOM food cost & net margin',
          icon: TrendingUp,
          suiteId: 'financials',
          suiteTitle: 'IFRS Financials'
        },
        {
          id: 'rep-bal-sheet',
          tabId: 'reports',
          subNav: 'balance-sheet',
          label: 'Balance Sheet (IFRS)',
          subLabel: 'Assets, equity & liabilities position',
          icon: Landmark,
          suiteId: 'financials',
          suiteTitle: 'IFRS Financials'
        },
        {
          id: 'rep-cashflow',
          tabId: 'reports',
          subNav: 'cash-flow',
          label: 'Cash Flow Statement',
          subLabel: 'Operating, investing & financing flows',
          icon: Receipt,
          suiteId: 'financials',
          suiteTitle: 'IFRS Financials'
        }
      ]
    },

    // 8. Master Setup & Admin
    {
      key: 'admin',
      title: 'Master Setup & Admin',
      
      icon: Sliders,
      items: [
        {
          id: 'dash-overview',
          tabId: 'dashboard',
          label: 'Executive Dashboard',
          subLabel: 'Live KPIs & Realtime Charts',
          icon: LayoutDashboard
        },
        {
          id: 'admin-heads',
          tabId: 'heads',
          label: 'Master Config & Printers',
          subLabel: 'Hardware & Profile Setup',
          icon: Sliders,
          badge: (data.printers?.length || 0) + ' Prn',
          badgeColor: 'bg-purple-500/20 text-purple-300'
        },
        {
          id: 'admin-users',
          tabId: 'users',
          label: 'Users & RBAC Access',
          subLabel: 'Pin Codes & Permissions',
          icon: Users,
          badge: data.users?.length || 5,
          badgeColor: 'bg-purple-500/20 text-purple-300'
        },
        {
          id: 'admin-cleanup',
          tabId: 'data-cleanup',
          label: 'System Maintenance',
          subLabel: 'Backup, Reset & Wipe',
          icon: Trash2,
          badgeColor: 'bg-rose-500/20 text-rose-300'
        }
      ]
    }
  ];

  const handleSubItemClick = (item: SubMenuItem) => {
    if (item.tabId === 'pos' && !data.session?.isActive) {
      return;
    }
    if (item.subNav) {
      navigateTo(item.tabId, item.subNav, item.tabId === 'reports' ? 'reports' : undefined);
    } else {
      navigateTo(item.tabId, '', item.tabId === 'reports' ? 'reports' : undefined);
      if (item.tabId === 'pos') {
        setPosView('floor');
      }
    }
    onCloseMobile();
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'MANAGER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CASHIER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'WAITER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CHEF':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  // Filter groups and items by user permissions and search query (Show all modules in sidebar)
  const visibleGroups = menuGroups
    .map(group => {
      const accessibleItems = group.items.filter(item => {
        if (!canAccessTab(item.tabId, true)) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
          group.title.toLowerCase().includes(q) ||
          (group.titleBn && group.titleBn.toLowerCase().includes(q))
        );
      });

      return {
        ...group,
        items: accessibleItems
      };
    })
    .filter(group => group.items.length > 0);

  return (
    <aside className="w-72 h-full max-h-screen bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none overflow-hidden">
        {/* Brand Header with Close Button */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            onClick={() => {
              if (canAccessTab('heads')) {
                navigateTo('heads', 'profile');
                onCloseMobile();
              }
            }}
            title={canAccessTab('heads') ? "Configure Restaurant Profile & Logo" : undefined}
            className="flex items-center gap-2.5 text-left hover:bg-slate-950/90 transition group flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#002b59] to-[#005bb8] p-0.5 flex items-center justify-center shadow-lg shadow-blue-900/30 text-white shrink-0 overflow-hidden">
              {data.restaurantProfile?.logoUrl ? (
                <img 
                  src={data.restaurantProfile.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain rounded-lg bg-slate-900/90"
                />
              ) : data.restaurantProfile?.presetIcon === 'coffee' ? (
                <Coffee className="w-5 h-5 text-white" />
              ) : data.restaurantProfile?.presetIcon === 'utensils' ? (
                <Utensils className="w-5 h-5 text-white" />
              ) : data.restaurantProfile?.presetIcon === 'chef' ? (
                <ChefHat className="w-5 h-5 text-white" />
              ) : data.restaurantProfile?.presetIcon === 'crown' ? (
                <Crown className="w-5 h-5 text-white" />
              ) : data.restaurantProfile?.presetIcon === 'store' ? (
                <Store className="w-5 h-5 text-white" />
              ) : (
                <Flame className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-black text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5 truncate group-hover:text-blue-400 transition">
                <span className="truncate">{data.restaurantProfile?.name || t.brandTitle}</span>
              </h1>
              <p className="text-[10px] text-blue-300/90 font-medium tracking-wide truncate">
                {data.restaurantProfile?.tagline || t.brandTagline}
              </p>
            </div>
          </button>

          {/* Close Sidebar Button (slides back to full screen) */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 ml-1"
            title="Close Sidebar (Full Screen)"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Launchpad Home Shortcut Button */}
        <div className="p-2.5 pb-0">
          <button
            id="btn-sidebar-launcher"
            onClick={() => {
              setActiveTab('launcher');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-black text-xs transition cursor-pointer shadow-xs ${
              activeTab === 'launcher'
                ? 'bg-gradient-to-r from-[#004b9b] to-[#002652] text-white ring-2 ring-blue-500 shadow-md'
                : 'bg-slate-800 hover:bg-slate-750 text-blue-200 hover:text-white border border-slate-700/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span>'Main POS Launchpad'</span>
            </div>
            <span className="text-[10px] bg-black/40 text-blue-200 px-1.5 py-0.5 rounded-full font-mono">
              Home
            </span>
          </button>
        </div>

        {/* Quick Menu Search & Expand/Collapse Toggle */}
        <div className="px-3 pt-3 pb-1 space-y-2 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-2.5 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search menu & reports...'
              className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white text-[10px] bg-slate-700 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              'Navigation Menu'
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={expandAll}
                className="text-slate-400 hover:text-blue-400 transition cursor-pointer font-medium"
              >
                Expand
              </button>
              <span className="text-slate-600">&bull;</span>
              <button 
                onClick={collapseAll}
                className="text-slate-400 hover:text-blue-400 transition cursor-pointer font-medium"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Accordion Navigation List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
          {visibleGroups.map(group => {
            const GroupIcon = group.icon;
            const isGroupOpen = openGroups[group.key] || searchQuery.length > 0;
            const hasActiveChild = group.items.some(i => {
              if (i.subNav) {
                return activeTab === i.tabId && activeSubNav === i.subNav;
              }
              if (i.tabId === 'reports') {
                return activeTab === 'reports' && !activeSubNav;
              }
              if (i.tabId === 'heads') {
                return activeTab === 'heads' && (!activeSubNav || activeSubNav === 'profile' || activeSubNav === 'heads');
              }
              return activeTab === i.tabId;
            });

            return (
              <div 
                key={group.key} 
                className={`rounded-xl border transition-colors overflow-hidden ${
                  hasActiveChild 
                    ? 'border-slate-700/80 bg-slate-950/40' 
                    : 'border-slate-800/40 bg-slate-950/20'
                }`}
              >
                {/* Accordion Category Header Button */}
                <button
                  id={`menu-group-header-${group.key}`}
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition cursor-pointer ${
                    hasActiveChild
                      ? 'text-blue-400 font-bold bg-slate-850/60'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      hasActiveChild ? 'bg-[#004b9b]/30 text-blue-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <GroupIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs tracking-tight truncate">
                        {language === 'bn' && group.titleBn ? group.titleBn : group.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {group.key === 'reports' ? 23 : group.items.length}
                    </span>
                    {isGroupOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Sub-menu Items (Rendered when expanded) */}
                {isGroupOpen && (
                  group.key === 'reports' ? (
                    <div className="p-1 space-y-1.5 border-t border-slate-800/50 bg-slate-900/60">
                      {/* Top BI Reports Center Hub */}
                      {(() => {
                        const hubItem = group.items.find(i => i.id === 'reports-hub');
                        if (!hubItem) return null;
                        const HubIcon = hubItem.icon;
                        const isHubActive = activeTab === 'reports' && (!activeSubNav || activeSubNav === 'reports');
                        return (
                          <button
                            key={hubItem.id}
                            id={`sub-item-${hubItem.id}`}
                            onClick={() => handleSubItemClick(hubItem)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                              isHubActive
                                ? 'bg-[#004b9b] hover:bg-[#005bb8] text-white border-blue-600 font-bold shadow-xs'
                                : 'text-slate-200 bg-slate-850/80 hover:bg-slate-800 hover:text-white border-slate-750/70'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <HubIcon className={`w-3.5 h-3.5 shrink-0 ${isHubActive ? 'text-amber-300' : 'text-teal-400'}`} />
                              <div className="truncate">
                                <div className="text-xs font-bold truncate leading-tight">
                                  {hubItem.label}
                                </div>
                                <div className="text-[9px] text-slate-400 truncate leading-none mt-0.5">
                                  {hubItem.subLabel}
                                </div>
                              </div>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-teal-500/20 text-teal-300">
                              23
                            </span>
                          </button>
                        );
                      })()}

                      {/* 5 Categorized Report Suites */}
                      {REPORT_SUITE_GROUPS.map(suite => {
                        const suiteItems = group.items.filter(i => i.suiteId === suite.id);
                        if (suiteItems.length === 0) return null;

                        const SuiteIcon = suite.icon;
                        const isSuiteOpen = searchQuery.length > 0 ? true : !!openReportSuites[suite.id];
                        const hasActiveInSuite = suiteItems.some(i => activeTab === 'reports' && activeSubNav === i.subNav);

                        return (
                          <div 
                            key={suite.id} 
                            className={`rounded-lg border transition-colors overflow-hidden ${
                              hasActiveInSuite 
                                ? 'border-teal-700/60 bg-slate-950/40' 
                                : 'border-slate-800/60 bg-slate-950/20'
                            }`}
                          >
                            {/* Suite Accordion Header */}
                            <button
                              onClick={() => toggleReportSuite(suite.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition cursor-pointer select-none ${
                                hasActiveInSuite
                                  ? 'text-teal-300 font-bold bg-slate-800/50'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SuiteIcon className={`w-3.5 h-3.5 shrink-0 ${hasActiveInSuite ? 'text-teal-300' : 'text-teal-400'}`} />
                                <span className="text-xs truncate font-bold">
                                  {suite.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                                  {suiteItems.length}
                                </span>
                                {isSuiteOpen ? (
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                )}
                              </div>
                            </button>

                            {/* Suite Report Items */}
                            {isSuiteOpen && (
                              <div className="p-1 pl-1.5 space-y-0.5 border-t border-slate-800/40 bg-slate-900/70">
                                {suiteItems.map(item => {
                                  const ItemIcon = item.icon;
                                  const isItemActive = activeTab === 'reports' && activeSubNav === item.subNav;

                                  return (
                                    <button
                                      key={item.id}
                                      id={`sub-item-${item.id}`}
                                      onClick={() => handleSubItemClick(item)}
                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-all cursor-pointer ${
                                        isItemActive
                                          ? 'bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold shadow-xs'
                                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${
                                          isItemActive ? 'text-white font-bold' : 'text-slate-400'
                                        }`} />
                                        <div className="truncate">
                                          <div className="text-[11px] truncate leading-tight font-medium">
                                            {item.label}
                                          </div>
                                          {item.subLabel && (
                                            <div className={`text-[8.5px] truncate leading-none mt-0.5 ${
                                              isItemActive ? 'text-blue-100' : 'text-slate-400'
                                            }`}>
                                              {item.subLabel}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {item.badge !== undefined && (
                                        <span className={`text-[8.5px] px-1.5 py-0.2 rounded-full shrink-0 font-semibold ${
                                          isItemActive 
                                            ? 'bg-black text-blue-300 font-black' 
                                            : (item.badgeColor || 'bg-slate-800 text-slate-300')
                                        }`}>
                                          {item.badge}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-1 space-y-0.5 border-t border-slate-800/50 bg-slate-900/60">
                      {group.items.map(item => {
                        const ItemIcon = item.icon;
                        const isItemActive = item.tabId === 'reports'
                          ? activeTab === 'reports'
                          : item.subNav 
                            ? (activeTab === item.tabId && activeSubNav === item.subNav)
                            : (activeTab === item.tabId && (item.tabId === 'heads' ? (!activeSubNav || activeSubNav === 'profile' || activeSubNav === 'heads') : !activeSubNav));

                        return (
                          <button
                            key={item.id}
                            id={`sub-item-${item.id}`}
                            onClick={() => handleSubItemClick(item)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                              isItemActive
                                ? 'bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold shadow-xs'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${
                                isItemActive ? 'text-white font-bold' : 'text-slate-400'
                              }`} />
                              <div className="truncate">
                                <div className="text-xs truncate leading-tight">
                                  {item.label}
                                </div>
                                {item.subLabel && (
                                  <div className={`text-[9px] truncate leading-none mt-0.5 ${
                                    isItemActive ? 'text-blue-100' : 'text-slate-400'
                                  }`}>
                                    {item.subLabel}
                                  </div>
                                )}
                              </div>
                            </div>

                            {item.badge !== undefined && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-semibold ${
                                isItemActive 
                                  ? 'bg-black text-blue-300 font-black' 
                                  : (item.badgeColor || 'bg-slate-800 text-slate-300')
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* User Profile & Session Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 space-y-2">
          {/* User Account Info */}
          {currentUser ? (
            <div className="p-2 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-black text-xs shrink-0 shadow-2xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="truncate min-w-0">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[8px] font-black uppercase px-1 rounded border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono truncate">@{currentUser.username}</span>
                  </div>
                </div>
              </div>

              <button
                id="btn-logout-sidebar"
                onClick={logout}
                title="Log Out"
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 border border-rose-500/25 hover:border-rose-600 text-rose-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-[#004b9b]/20 border border-[#004b9b]/40 flex items-center justify-between">
              <span className="text-xs text-blue-300 font-medium">Logged out</span>
              <button
                onClick={() => setActiveTab('users')}
                className="text-xs bg-[#004b9b] hover:bg-[#005bb8] text-white px-2 py-1 rounded-lg font-bold"
              >
                Log In
              </button>
            </div>
          )}

          {/* Live Session Status */}
          <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                data.session?.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`} />
              <span className="text-[10px] font-semibold text-slate-300 truncate">
                {data.session?.isActive ? 'Shift Active' : 'Shift Closed'}
              </span>
            </div>

            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              {data.tables.filter(t => t.status !== 'free').length}/{data.tables.length} Tables Occupied
            </span>
          </div>
        </div>
      </aside>
  );
};
