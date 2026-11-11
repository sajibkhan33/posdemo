import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { JournalEntry, AccountHead } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  Scale, 
  Printer, 
  Pencil, 
  Check, 
  X, 
  DollarSign, 
  ArrowDownRight, 
  Sparkles,
  Layers,
  Calendar
} from 'lucide-react';

type AccountingViewTab = 'jv' | 'ledger';
type DatePreset = 'ALL' | 'TODAY' | '7DAYS' | 'MONTH' | 'CUSTOM';

interface UnifiedLedgerItem {
  id: string;
  sourceId: string | number;
  date: string;
  ref: string;
  title: string;
  subtitle: string;
  account: string;
  type: 'PAYMENT' | 'EXPENSE' | 'INCOME' | 'JOURNAL';
  amount: number; // positive or negative
  rawItem: any;
}

export const JournalEntryView: React.FC = () => {
  const { 
    data, 
    addJournalEntry, 
    editJournalEntry, 
    deleteJournalEntry, 
    saveExpense,
    deleteExpense,
    deleteVendorPayment
  } = useRestaurant();

  // Active Tab: 'jv' (Default - Double-Entry Journal Vouchers) or 'ledger' (Unified Audit Ledger)
  const [activeTab, setActiveTab] = useState<AccountingViewTab>('jv');

  // Search & Filters
  const [jvSearch, setJvSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [isJvModalOpen, setIsJvModalOpen] = useState(false);
  const [editingJvId, setEditingJvId] = useState<string | null>(null);
  const [printingJvEntry, setPrintingJvEntry] = useState<JournalEntry | null>(null);

  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const coa = useMemo(() => {
    return [...(data.chartOfAccounts || [])].sort((a, b) =>
      (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data.chartOfAccounts]);

  const journalEntries = data.journalEntries || [];

  // =================== 5 SUMMARY STATS (SINGLE ROW) =================== //
  const totalJournalDebit = useMemo(() => {
    return journalEntries.reduce((sum, j) => sum + (j.amount || 0), 0);
  }, [journalEntries]);

  const totalJournalCredit = totalJournalDebit;

  const totalSupplierPayments = useMemo(() => {
    return (data.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [data.payments]);

  const totalOperatingExpenses = useMemo(() => {
    return (data.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [data.expenses]);

  // =================== UNIFIED LEDGER ENTRIES =================== //
  const unifiedLedgerEntries = useMemo<UnifiedLedgerItem[]>(() => {
    const list: UnifiedLedgerItem[] = [];

    // 1. Supplier / Vendor Payments (PAYMENT)
    (data.payments || []).forEach(p => {
      list.push({
        id: `PAY-${p.id}`,
        sourceId: p.id,
        date: p.date,
        ref: p.billNo || `PAY-${p.id.toString().slice(-4)}`,
        title: `Payment for Purchase Order / Bill ${p.billNo || ''} (Paid) - Supplier: ${p.vendor}`,
        subtitle: `Raw Materials / PO Payment${p.note ? ` • ${p.note}` : ''}`,
        account: p.method || 'Cash in Hand',
        type: 'PAYMENT',
        amount: -(p.amount || 0),
        rawItem: p
      });
    });

    // 2. Operating Expenses (EXPENSE)
    (data.expenses || []).forEach(e => {
      list.push({
        id: `EXP-${e.id}`,
        sourceId: e.id,
        date: e.date,
        ref: `EXP-${e.id.toString().slice(-4)}`,
        title: e.head,
        subtitle: `${e.category || 'Operating Expense'}${e.note ? ` • ${e.note}` : ''}`,
        account: e.paymentMethod || 'Cash in Hand',
        type: 'EXPENSE',
        amount: -(e.amount || 0),
        rawItem: e
      });
    });

    // 3. POS Sales Revenue (INCOME)
    (data.sales || []).forEach(s => {
      let payDesc = 'Cash in Hand';
      if (s.paymentBreakdown) {
        const methods = Object.keys(s.paymentBreakdown).filter(k => (s.paymentBreakdown as any)[k] > 0);
        if (methods.length > 0) payDesc = methods.join(', ');
      } else if (s.card && s.card > 0) {
        payDesc = 'Bank / Card';
      } else if (s.bkash && s.bkash > 0) {
        payDesc = 'bKash Merchant';
      } else if (s.nagad && s.nagad > 0) {
        payDesc = 'Nagad Merchant';
      }

      list.push({
        id: `SALE-${s.id}`,
        sourceId: s.id,
        date: s.date,
        ref: s.invoiceNo || `INV-${s.id.toString().slice(-4)}`,
        title: `POS Sales Order #${s.invoiceNo || s.id} - ${s.customer || 'Walk-in Customer'}`,
        subtitle: `POS Dine-in & Takeaway Revenue • Items: ${s.items?.length || 1}`,
        account: payDesc,
        type: 'INCOME',
        amount: s.total || 0,
        rawItem: s
      });
    });

    // 4. Double-Entry Journal Vouchers (JOURNAL)
    (data.journalEntries || []).forEach(j => {
      const isCapital = j.creditAccountName?.toLowerCase().includes('capital') || 
                        j.creditAccountName?.toLowerCase().includes('equity') ||
                        j.narration?.toLowerCase().includes('capital');

      list.push({
        id: `JV-${j.id}`,
        sourceId: j.id,
        date: j.date,
        ref: j.voucherNo,
        title: j.narration || (isCapital ? "Owner's Capital Investment" : 'General Journal Adjustment'),
        subtitle: `Dr: ${j.debitAccountName} • Cr: ${j.creditAccountName}`,
        account: j.creditAccountName || 'General Ledger',
        type: isCapital ? 'INCOME' : 'JOURNAL',
        amount: j.amount || 0,
        rawItem: j
      });
    });

    // Sort newest to oldest
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.payments, data.expenses, data.sales, data.journalEntries]);

  // Filtered JV list
  const filteredJvEntries = useMemo(() => {
    if (!jvSearch.trim()) return journalEntries;
    const q = jvSearch.toLowerCase();
    return journalEntries.filter(j => 
      j.voucherNo.toLowerCase().includes(q) ||
      j.debitAccountName.toLowerCase().includes(q) ||
      j.creditAccountName.toLowerCase().includes(q) ||
      j.narration.toLowerCase().includes(q)
    );
  }, [journalEntries, jvSearch]);

  // Filtered Ledger list
  const filteredLedger = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

    return unifiedLedgerEntries.filter(item => {
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const match = item.ref.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.account.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (datePreset === 'TODAY' && item.date !== todayStr) return false;
      if (datePreset === '7DAYS' && (item.date < sevenDaysAgo || item.date > todayStr)) return false;
      if (datePreset === 'MONTH' && (item.date < monthAgo || item.date > todayStr)) return false;
      if (datePreset === 'CUSTOM') {
        if (customStartDate && item.date < customStartDate) return false;
        if (customEndDate && item.date > customEndDate) return false;
      }

      return true;
    });
  }, [unifiedLedgerEntries, ledgerSearch, datePreset, customStartDate, customEndDate]);

  // =================== JOURNAL VOUCHER (JV) FORM STATE =================== //
  const getNextVoucherNo = () => {
    const year = new Date().getFullYear();
    const maxSeq = (data.journalEntries || []).reduce((max, j) => {
      const match = j.voucherNo?.match(/-(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `JV-${year}-${(maxSeq + 1).toString().padStart(3, '0')}`;
  };

  const [jvForm, setJvForm] = useState({
    voucherNo: getNextVoucherNo(),
    date: new Date().toISOString().split('T')[0],
    debitAccountId: coa.find(c => c.type === 'EXPENSE')?.id || coa[0]?.id || '5010',
    creditAccountId: coa.find(c => c.type === 'ASSET')?.id || coa[1]?.id || '1010',
    amount: 1500,
    narration: 'Office and kitchen daily operational settlement voucher',
    referenceNo: `REF-${Date.now().toString().slice(-4)}`
  });

  const handleOpenAddJv = () => {
    setEditingJvId(null);
    setJvForm({
      voucherNo: getNextVoucherNo(),
      date: new Date().toISOString().split('T')[0],
      debitAccountId: coa.find(c => c.type === 'EXPENSE')?.id || coa[0]?.id || '5010',
      creditAccountId: coa.find(c => c.type === 'ASSET')?.id || coa[1]?.id || '1010',
      amount: 1500,
      narration: 'Daily adjustment and journal voucher entry',
      referenceNo: `REF-${Date.now().toString().slice(-4)}`
    });
    setIsJvModalOpen(true);
  };

  const handleOpenEditJv = (j: JournalEntry) => {
    setEditingJvId(j.id);
    setJvForm({
      voucherNo: j.voucherNo,
      date: j.date,
      debitAccountId: j.debitAccountId,
      creditAccountId: j.creditAccountId,
      amount: j.amount,
      narration: j.narration,
      referenceNo: j.referenceNo || ''
    });
    setIsJvModalOpen(true);
  };

  const handleSaveJv = (e: React.FormEvent) => {
    e.preventDefault();
    if (jvForm.amount <= 0) {
      alert('Please enter a valid debit/credit amount greater than 0.');
      return;
    }
    const debitAcc = coa.find(c => c.id === jvForm.debitAccountId || c.code === jvForm.debitAccountId);
    const creditAcc = coa.find(c => c.id === jvForm.creditAccountId || c.code === jvForm.creditAccountId);

    if (!debitAcc || !creditAcc) {
      alert('Please select both Debit and Credit account heads.');
      return;
    }

    if (debitAcc.id === creditAcc.id || debitAcc.code === creditAcc.code) {
      alert('Debit and Credit account cannot be the same.');
      return;
    }

    const payload = {
      voucherNo: jvForm.voucherNo,
      date: jvForm.date,
      debitAccountId: debitAcc.id,
      debitAccountName: `${debitAcc.code} - ${debitAcc.name}`,
      creditAccountId: creditAcc.id,
      creditAccountName: `${creditAcc.code} - ${creditAcc.name}`,
      amount: Number(jvForm.amount),
      narration: jvForm.narration,
      referenceNo: jvForm.referenceNo
    };

    if (editingJvId) {
      editJournalEntry(editingJvId, payload);
    } else {
      addJournalEntry(payload);
    }

    setIsJvModalOpen(false);
    setEditingJvId(null);
  };

  // =================== OWNER'S CAPITAL INVESTMENT MODAL =================== //
  const [capitalForm, setCapitalForm] = useState({
    depositAccountId: '1010', // Cash in Hand
    equityAccountId: '3010',  // Owner Equity & Capital
    amount: 50000,
    date: new Date().toISOString().split('T')[0],
    referenceNo: `CAP-${Date.now().toString().slice(-4)}`,
    narration: "Owner Capital Investment / Equity Injection"
  });

  const handleOpenCapitalModal = () => {
    const cashAcc = coa.find(c => c.code === '1010' || c.name.toLowerCase().includes('cash')) || coa[0];
    const equityAcc = coa.find(c => c.type === 'EQUITY' || c.code === '3010') || coa[1];

    setCapitalForm({
      depositAccountId: cashAcc?.id || '1010',
      equityAccountId: equityAcc?.id || '3010',
      amount: 50000,
      date: new Date().toISOString().split('T')[0],
      referenceNo: `CAP-${Date.now().toString().slice(-4)}`,
      narration: "Owner Capital Investment / Equity Injection"
    });
    setIsCapitalModalOpen(true);
  };

  const handleSaveCapital = (e: React.FormEvent) => {
    e.preventDefault();
    if (capitalForm.amount <= 0) {
      alert('Please enter a valid investment amount greater than 0.');
      return;
    }

    const debitAcc = coa.find(c => c.id === capitalForm.depositAccountId || c.code === capitalForm.depositAccountId) || coa[0];
    const creditAcc = coa.find(c => c.id === capitalForm.equityAccountId || c.code === capitalForm.equityAccountId || c.type === 'EQUITY') || coa.find(c => c.type === 'EQUITY') || coa[1];

    if (!debitAcc || !creditAcc) {
      alert('Please select both deposit and equity accounts.');
      return;
    }

    const payload = {
      voucherNo: getNextVoucherNo(),
      date: capitalForm.date,
      debitAccountId: debitAcc.id,
      debitAccountName: `${debitAcc.code} - ${debitAcc.name}`,
      creditAccountId: creditAcc.id,
      creditAccountName: `${creditAcc.code} - ${creditAcc.name}`,
      amount: Number(capitalForm.amount),
      narration: capitalForm.narration || "Owner's Capital Investment",
      referenceNo: capitalForm.referenceNo || `CAP-${Date.now().toString().slice(-4)}`
    };

    addJournalEntry(payload);
    setIsCapitalModalOpen(false);
  };

  // =================== QUICK OPERATING EXPENSE MODAL =================== //
  const expenseHeadsList = (data.expenseHeads || []).sort((a, b) => a.localeCompare(b));
  const [expenseForm, setExpenseForm] = useState({
    head: expenseHeadsList[0] || 'Utility / Electricity',
    amount: 500,
    paymentMethod: 'Cash in Hand',
    date: new Date().toISOString().split('T')[0],
    note: 'Office daily operational payment'
  });

  const handleOpenExpenseModal = () => {
    setExpenseForm({
      head: expenseHeadsList[0] || 'Utility / Electricity',
      amount: 500,
      paymentMethod: 'Cash in Hand',
      date: new Date().toISOString().split('T')[0],
      note: 'Office daily operational payment'
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amount <= 0) {
      alert('Expense amount must be greater than 0');
      return;
    }

    saveExpense({
      date: expenseForm.date,
      head: expenseForm.head,
      amount: Number(expenseForm.amount),
      paymentMethod: expenseForm.paymentMethod,
      note: expenseForm.note,
      category: 'Operating Expenses'
    });
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* ================= 1. HEADER ================= */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Accounting Journal Entries
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                General Ledger
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Double-entry bookkeeping journal vouchers, debit/credit account adjustments, and audit ledger
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Owner Capital Button */}
          <button
            onClick={handleOpenCapitalModal}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Deposit Owner Capital Injection into Cash or Bank"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>+ Owner Capital</span>
          </button>

          {/* Record Expense Button */}
          <button
            onClick={handleOpenExpenseModal}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Record direct operating expense"
          >
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
            <span>+ Record Expense</span>
          </button>

          {/* New Journal Voucher Button (Green) */}
          <button
            onClick={handleOpenAddJv}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Journal Voucher</span>
          </button>
        </div>
      </div>

      {/* ================= 2. FIVE KPI CARDS IN ONE ROW ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Journal Vouchers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Total Journal Vouchers</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{journalEntries.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Recorded transaction vouchers</div>
        </div>

        {/* Card 2: Total Debits (Dr.) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-emerald-700 text-xs font-bold flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" /> Total Debits (Dr.)
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">৳{totalJournalDebit.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Total debited balance</div>
        </div>

        {/* Card 3: Total Credits (Cr.) */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
          <div className="text-teal-700 text-xs font-bold flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" /> Total Credits (Cr.)
          </div>
          <div className="text-2xl font-black text-teal-800 mt-1">৳{totalJournalCredit.toLocaleString()}</div>
          <div className="text-[11px] text-teal-600 mt-0.5">Balanced with debit total (100% matched)</div>
        </div>

        {/* Card 4: Supplier & Product Payments */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-900 text-xs font-bold">Supplier & Product</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.2 rounded">
                Payment
              </span>
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1">
              - ৳{totalSupplierPayments.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-blue-700/80 mt-0.5 font-medium">Raw Materials / PO Payments</div>
        </div>

        {/* Card 5: Operating Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-rose-900 text-xs font-bold">Operating Expenses</span>
              <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.2 rounded">
                Expense
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">
              - ৳{totalOperatingExpenses.toLocaleString()}
            </div>
          </div>
          <div className="text-[11px] text-rose-700/80 mt-0.5 font-medium">Office & Direct Expenses</div>
        </div>
      </div>

      {/* ================= 3. SEAMLESS WORKBENCH TABLE CONTAINER ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
        {/* Top Control Bar: View Switcher Tabs + Search / Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* View Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
            <button
              onClick={() => setActiveTab('jv')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'jv'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-purple-600" />
              <span>Journal Vouchers (JV)</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                {journalEntries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Financial Audit Ledger</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'ledger' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {unifiedLedgerEntries.length}
              </span>
            </button>
          </div>

          {/* Controls for Active Tab */}
          {activeTab === 'jv' ? (
            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search voucher no, account heads, narration..."
                  value={jvSearch}
                  onChange={e => setJvSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                Showing {filteredJvEntries.length} entries
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative w-64 sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  placeholder="Search ref, description, account, type..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                {(['ALL', 'TODAY', '7DAYS', 'MONTH', 'CUSTOM'] as DatePreset[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setDatePreset(p)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                      datePreset === p 
                        ? 'bg-slate-900 text-amber-400 shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p === 'ALL' ? 'All' : p === 'TODAY' ? 'Today' : p === '7DAYS' ? '7 Days' : p === 'MONTH' ? 'Month' : 'Custom'}
                  </button>
                ))}
              </div>

              {/* Custom Date Range Picker */}
              {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
                    title="From Date"
                  />
                  <span className="text-slate-400 text-xs font-bold">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
                    title="To Date"
                  />
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      title="Clear dates"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap ml-auto">
                Showing {filteredLedger.length} entries
              </span>
            </div>
          )}
        </div>

        {/* ================= TAB 1: JOURNAL VOUCHERS TABLE (IMAGE 1) ================= */}
        {activeTab === 'jv' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Voucher No & Date</th>
                  <th className="py-3 px-4">Debit Account (Dr.)</th>
                  <th className="py-3 px-4">Credit Account (Cr.)</th>
                  <th className="py-3 px-4">Amount (৳)</th>
                  <th className="py-3 px-4">Narration / Note</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJvEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No journal vouchers recorded yet. Click "+ New Journal Voucher" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredJvEntries.map(j => (
                    <tr key={j.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-mono">{j.voucherNo}</div>
                        <div className="text-[11px] text-slate-500">{j.date} • Ref: {j.referenceNo || 'N/A'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                          Dr: {j.debitAccountName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 inline-block">
                          Cr: {j.creditAccountName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-sm font-mono">
                          ৳{j.amount.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {j.narration}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPrintingJvEntry(j)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Print Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditJv(j)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Edit Voucher"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete Voucher ${j.voucherNo}?`)) {
                                deleteJournalEntry(j.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 2: FINANCIAL AUDIT LEDGER TABLE ================= */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Ref</th>
                  <th className="py-3 px-4">Description / Particulars</th>
                  <th className="py-3 px-4">Account / Method</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-4 text-right">TK (৳)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No matching financial ledger transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-600 font-medium">{item.date}</div>
                        <div className="font-mono text-[11px] font-bold text-slate-900 mt-0.5">{item.ref}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-extrabold text-slate-900 text-xs">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.subtitle}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] border border-slate-200">
                          {item.account}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {item.type === 'PAYMENT' && (
                          <span className="bg-blue-100 text-blue-700 border border-blue-200 font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase">
                            PAYMENT
                          </span>
                        )}
                        {item.type === 'EXPENSE' && (
                          <span className="bg-rose-100 text-rose-700 border border-rose-200 font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase">
                            EXPENSE
                          </span>
                        )}
                        {item.type === 'INCOME' && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase">
                            CAPITAL / INFLOW
                          </span>
                        )}
                        {item.type === 'JOURNAL' && (
                          <span className="bg-purple-100 text-purple-800 border border-purple-200 font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase">
                            JOURNAL
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`text-sm font-black font-mono ${
                          item.amount > 0 
                            ? 'text-emerald-600' 
                            : item.type === 'PAYMENT' 
                              ? 'text-blue-600' 
                              : 'text-rose-600'
                        }`}>
                          {item.amount > 0 ? `+৳${item.amount.toLocaleString()}` : `-৳${Math.abs(item.amount).toLocaleString()}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.type === 'JOURNAL' && (
                            <button
                              onClick={() => setPrintingJvEntry(item.rawItem)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 cursor-pointer"
                              title="Print JV Voucher Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.type === 'EXPENSE' && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete expense record "${item.title}" for ৳${Math.abs(item.amount)}?`)) {
                                  deleteExpense(item.sourceId as number);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.type === 'PAYMENT' && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete vendor payment record for ৳${Math.abs(item.amount)}?`)) {
                                  deleteVendorPayment(item.sourceId as number);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.type === 'JOURNAL' && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete journal voucher "${item.ref}"?`)) {
                                  deleteJournalEntry(item.sourceId as string);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                              title="Delete JV"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: NEW / EDIT JOURNAL VOUCHER ================= */}
      {isJvModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingJvId ? 'Edit Journal Voucher' : 'Create New Journal Voucher'}
                </h3>
              </div>
              <button 
                onClick={() => { setIsJvModalOpen(false); setEditingJvId(null); }} 
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJv} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher No *</label>
                  <input
                    type="text"
                    required
                    value={jvForm.voucherNo}
                    onChange={e => setJvForm({ ...jvForm, voucherNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={jvForm.date}
                    onChange={e => setJvForm({ ...jvForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Debit Account (Dr. Head) *</label>
                <select
                  value={jvForm.debitAccountId}
                  onChange={e => setJvForm({ ...jvForm, debitAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                >
                  {coa.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-800 mb-1">Credit Account (Cr. Head) *</label>
                <select
                  value={jvForm.creditAccountId}
                  onChange={e => setJvForm({ ...jvForm, creditAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-teal-50/50 border border-teal-300 rounded-lg text-xs font-bold text-teal-950 focus:ring-1 focus:ring-teal-500"
                >
                  {coa.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={jvForm.amount}
                    onChange={e => setJvForm({ ...jvForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Cheque No</label>
                  <input
                    type="text"
                    value={jvForm.referenceNo}
                    onChange={e => setJvForm({ ...jvForm, referenceNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Narration / Description *</label>
                <textarea
                  required
                  rows={2}
                  value={jvForm.narration}
                  onChange={e => setJvForm({ ...jvForm, narration: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsJvModalOpen(false); setEditingJvId(null); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-500 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> {editingJvId ? 'Update Journal Voucher' : 'Save Journal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: OWNER'S CAPITAL INVESTMENT ================= */}
      {isCapitalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Record Owner's Capital Investment</h3>
              </div>
              <button onClick={() => setIsCapitalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCapital} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deposit / Receiving Account (Dr. Asset) *
                </label>
                <select
                  value={capitalForm.depositAccountId}
                  onChange={e => setCapitalForm({ ...capitalForm, depositAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                >
                  {coa.filter(c => c.type === 'ASSET').map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Select Cash in Hand or Bank Account to increase liquid balance
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Owner Equity & Capital Head (Cr. Equity) *
                </label>
                <select
                  value={capitalForm.equityAccountId}
                  onChange={e => setCapitalForm({ ...capitalForm, equityAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                >
                  {coa.filter(c => c.type === 'EQUITY').map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Investment Amount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={capitalForm.amount}
                    onChange={e => setCapitalForm({ ...capitalForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-black font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={capitalForm.date}
                    onChange={e => setCapitalForm({ ...capitalForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Cheque No</label>
                <input
                  type="text"
                  value={capitalForm.referenceNo}
                  onChange={e => setCapitalForm({ ...capitalForm, referenceNo: e.target.value })}
                  placeholder="e.g. CAP-001 / Cheque #"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Narration / Note</label>
                <input
                  type="text"
                  value={capitalForm.narration}
                  onChange={e => setCapitalForm({ ...capitalForm, narration: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCapitalModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Capital Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD QUICK EXPENSE ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Record Operating Expense</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Head *</label>
                <select
                  value={expenseForm.head}
                  onChange={e => setExpenseForm({ ...expenseForm, head: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                >
                  {expenseHeadsList.map((h, i) => (
                    <option key={i} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-black font-mono text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="Cash in Hand">Cash in Hand</option>
                  <option value="Bank Account">Bank Account</option>
                  <option value="bKash Merchant">bKash Merchant</option>
                  <option value="Nagad Merchant">Nagad Merchant</option>
                  <option value="Petty Cash">Petty Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note / Description</label>
                <input
                  type="text"
                  value={expenseForm.note}
                  onChange={e => setExpenseForm({ ...expenseForm, note: e.target.value })}
                  placeholder="e.g. November electricity bill"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-extrabold text-xs rounded-xl hover:bg-rose-700 shadow-md shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE JV VOUCHER SLIP ================= */}
      {printingJvEntry && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-indigo-600" /> Official Voucher Slip Preview
              </span>
              <button onClick={() => setPrintingJvEntry(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formal Voucher Slip Content */}
            <div className="border border-slate-300 rounded-xl p-5 bg-white space-y-4">
              <div className="text-center border-b pb-3 border-slate-200">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  {data.restaurantProfile?.name || 'BD HOSTT RESTAURANT & ERP'}
                </h2>
                <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white text-[11px] font-extrabold uppercase rounded-full">
                  Journal Voucher (JV)
                </div>
              </div>

              <div className="grid grid-cols-2 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">Voucher No:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{printingJvEntry.voucherNo}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">Date:</span>
                  <span className="font-mono font-bold text-slate-900">{printingJvEntry.date}</span>
                </div>
                {printingJvEntry.referenceNo && (
                  <div className="col-span-2 mt-1">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase">Ref / Cheque #: </span>
                    <span className="font-mono font-bold text-slate-800">{printingJvEntry.referenceNo}</span>
                  </div>
                )}
              </div>

              {/* Debit & Credit Ledger Block */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-600 grid grid-cols-12 border-b border-slate-200">
                  <span className="col-span-8">Particulars (Account Heads)</span>
                  <span className="col-span-4 text-right">Amount (৳)</span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-50/60 p-2 rounded-md">
                    <span>Dr: {printingJvEntry.debitAccountName}</span>
                    <span className="font-mono text-sm">৳{printingJvEntry.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-teal-800 font-bold bg-teal-50/60 p-2 rounded-md">
                    <span>Cr: {printingJvEntry.creditAccountName}</span>
                    <span className="font-mono text-sm">৳{printingJvEntry.amount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-slate-100 px-3 py-2 font-black text-slate-900 flex justify-between border-t border-slate-200">
                  <span>Total Voucher Value:</span>
                  <span className="font-mono text-sm">৳{printingJvEntry.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Narration */}
              <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-500 block text-[10px] uppercase">Narration / Description:</span>
                <p className="text-slate-800 italic mt-0.5">{printingJvEntry.narration}</p>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-3 gap-2 pt-6 text-[10px] text-center font-bold text-slate-500">
                <div className="border-t border-slate-300 pt-1">Prepared By</div>
                <div className="border-t border-slate-300 pt-1">Checked By</div>
                <div className="border-t border-slate-300 pt-1">Authorized Signatory</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintingJvEntry(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Voucher Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
