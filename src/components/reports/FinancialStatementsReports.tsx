import React, { useState, useMemo } from 'react';
import { useRestaurant, isSaleActive, resolveExpenseAccount, DEFAULT_CHART_OF_ACCOUNTS, computeCogsBomAllocation, getAccountSystemRole } from '../../context/RestaurantContext';
import { AccountSystemRole } from '../../types';
import { ReportFilters, DatePreset, exportCsvHelper } from './ReportFilters';
import { 
  Scale, 
  TrendingUp, 
  Landmark, 
  Activity, 
  CheckCircle2, 
  FileSpreadsheet, 
  PieChart,
  DollarSign,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SubReportProps {
  reportType: 'trial-balance' | 'pnl-ifrs' | 'balance-sheet' | 'cash-flow';
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const formatTbNum = (val: number | undefined | null) => {
  if (val === undefined || val === null || val === 0) return '0';
  const rounded = round2(val);
  return rounded % 1 !== 0 
    ? rounded.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : rounded.toLocaleString();
};

export const FinancialStatementsReports: React.FC<SubReportProps> = ({ reportType }) => {
  const { data, metrics } = useRestaurant();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [coaTypeFilter, setCoaTypeFilter] = useState<string>('ALL');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  // Date filter helper
  const matchesDate = (itemDate: string) => {
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // --- 14. TRIAL BALANCE (TRANSACTIONAL & PERIOD-AWARE) ---
  const trialBalanceData = useMemo(() => {
    // 1. Get complete list of all accounts from Chart of Accounts
    const coaList = (data.chartOfAccounts && data.chartOfAccounts.length > 0)
      ? [...data.chartOfAccounts]
      : [...DEFAULT_CHART_OF_ACCOUNTS];

    // Sort accounts numerically by code (1010, 1020, 1030, etc.)
    coaList.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    // Fast lookup helpers for standard account heads via System Roles
    const getAccountByCode = (code: string) => coaList.find(a => a.code === code || a.id === code);
    const getAccountByRole = (role: AccountSystemRole) => coaList.find(a => (a.systemRole || getAccountSystemRole(a)) === role);

    const cashAcc = getAccountByRole('CASH') || getAccountByCode('1010') || coaList.find(a => a.type === 'ASSET');
    const pettyCashAcc = getAccountByRole('PETTY_CASH') || getAccountByCode('1020') || cashAcc;
    const bankAcc = getAccountByRole('BANK') || getAccountByCode('1030') || cashAcc;
    const mfsAcc = getAccountByRole('MOBILE_BANKING') || getAccountByCode('1040') || bankAcc;
    const arAcc = getAccountByRole('ACCOUNTS_RECEIVABLE') || getAccountByCode('1050') || coaList.find(a => a.type === 'ASSET');
    const invAcc = getAccountByRole('INVENTORY_ASSET') || getAccountByCode('1060') || coaList.find(a => a.type === 'ASSET');
    const apAcc = getAccountByRole('ACCOUNTS_PAYABLE') || getAccountByCode('2010') || coaList.find(a => a.type === 'LIABILITY');
    const advanceAcc = getAccountByRole('CUSTOMER_ADVANCE') || getAccountByCode('2030') || getAccountByCode('2020') || coaList.find(a => a.type === 'LIABILITY');
    const taxAcc = getAccountByRole('TAX_PAYABLE') || getAccountByCode('2020') || getAccountByCode('2030');
    const dineInRevAcc = getAccountByRole('DINE_IN_REVENUE') || getAccountByCode('4010') || coaList.find(a => a.type === 'REVENUE');
    const deliveryRevAcc = getAccountByRole('DELIVERY_REVENUE') || getAccountByCode('4020') || dineInRevAcc;

    // Movement tracking for each account code
    const movements: Record<string, { priorDr: number; priorCr: number; periodDr: number; periodCr: number }> = {};
    coaList.forEach(a => {
      movements[a.code] = { priorDr: 0, priorCr: 0, periodDr: 0, periodCr: 0 };
    });

    const postEntry = (accCode: string | undefined, dr: number, cr: number, isPrior: boolean) => {
      if (!accCode || (dr === 0 && cr === 0)) return;
      const targetAcc = coaList.find(a => a.code === accCode || a.id === accCode);
      const code = targetAcc ? targetAcc.code : accCode;
      if (!movements[code]) {
        movements[code] = { priorDr: 0, priorCr: 0, periodDr: 0, periodCr: 0 };
      }
      if (isPrior) {
        movements[code].priorDr += dr;
        movements[code].priorCr += cr;
      } else {
        movements[code].periodDr += dr;
        movements[code].periodCr += cr;
      }
    };

    const getPaymentAccountCode = (methodIdOrName: string | undefined, fallbackCode: string): string => {
      if (!methodIdOrName) return fallbackCode;
      const norm = methodIdOrName.toUpperCase();
      if (norm === 'PETTY_CASH' || norm === 'PETTY') return pettyCashAcc?.code || '1020';
      if (norm === 'CASH') return cashAcc?.code || '1010';
      if (norm === 'BKASH' || norm === 'NAGAD' || norm === 'MFS' || norm === 'ROCKET' || norm === 'UPAY') return mfsAcc?.code || '1040';
      if (norm === 'BANK' || norm === 'CARD' || norm === 'CHEQUE' || norm === 'POS') return bankAcc?.code || '1030';
      if (norm === 'CREDIT' || norm === 'DUE') return arAcc?.code || '1050';
      if (norm === 'ADVANCE' || norm.includes('ADVANCE')) return advanceAcc?.code || '2030';

      const directAcc = coaList.find(a => a.code === methodIdOrName || a.id === methodIdOrName);
      if (directAcc) return directAcc.code;

      const methods = data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : [];
      const mObj = methods.find(m => m.id === methodIdOrName || m.name.toLowerCase() === methodIdOrName.toLowerCase());
      if (mObj?.ledgerAccountId) {
        const found = coaList.find(a => a.code === mObj.ledgerAccountId || a.id === mObj.ledgerAccountId);
        if (found) return found.code;
      }
      if (mObj?.type === 'CASH') return cashAcc?.code || '1010';
      if (mObj?.type === 'MFS') return mfsAcc?.code || '1040';
      if (mObj?.type === 'CARD' || mObj?.type === 'BANK') return bankAcc?.code || '1030';
      if (mObj?.type === 'CREDIT') return arAcc?.code || '1050';
      return fallbackCode;
    };

    // 1. Process Sales (Food Billing, Collections, Receivables)
    data.sales.forEach(s => {
      if (!isSaleActive(s)) return;
      const isPrior = Boolean(startDate && s.date && s.date < startDate);
      const isPeriod = (!startDate || s.date >= startDate) && (!endDate || s.date <= endDate);
      if (!isPrior && !isPeriod) return;

      const gross = s.subtotal || s.total || 0;
      const disc = s.discountVal || 0;
      const cash = s.cash || 0;
      const dueG = s.dueGiven || 0;
      const dueC = s.dueCollected || 0;

      // Select target revenue account
      let revCode = dineInRevAcc?.code || '4010';
      if (s.channelOrAgent && s.channelOrAgent !== 'dine_in' && deliveryRevAcc) {
        revCode = deliveryRevAcc.code;
      }

      // VAT calculation for the sale
      const vatVal = (typeof s.vatVal === 'number' && s.vatVal >= 0) ? s.vatVal : 0;
      const netRev = Math.max(0, gross - disc - vatVal);

      // Cr Revenue (Net Sales Revenue)
      postEntry(revCode, 0, netRev, isPrior);

      // Cr VAT & Tax Payable (Statutory Liabilities)
      if (vatVal > 0) {
        postEntry(taxAcc?.code || '2020', 0, vatVal, isPrior);
      }

      // Dr Sales Discount (contra-revenue)
      if (disc > 0) {
        postEntry(revCode, disc, 0, isPrior);
      }

      // Dr Cash Collection
      if (cash > 0) {
        const cashCode = getPaymentAccountCode('cash', cashAcc?.code || '1010');
        postEntry(cashCode, cash, 0, isPrior);
      }

      // Dr Digital / Card / MFS Collections
      if (s.paymentBreakdown && typeof s.paymentBreakdown === 'object') {
        const handledMethodKeys = new Set<string>();
        const methods = data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : [];

        Object.entries(s.paymentBreakdown).forEach(([mKey, rawAmt]) => {
          const amt = Number(rawAmt) || 0;
          if (amt <= 0 || mKey === 'byMethod') return;
          const normKey = mKey.toLowerCase().trim();
          if (
            normKey === 'cash' || 
            normKey === 'due' || 
            normKey === 'advance' || 
            normKey.includes('advance') || 
            normKey === 'credit' || 
            normKey.includes('due') || 
            normKey.includes('credit')
          ) return;

          const matchedCfg = methods.find(m => m.id.toLowerCase() === normKey || m.name.toLowerCase() === normKey);
          if (matchedCfg) {
            if (matchedCfg.type === 'CREDIT' || matchedCfg.type === 'CASH') return;
            if (!handledMethodKeys.has(matchedCfg.id)) {
              handledMethodKeys.add(matchedCfg.id);
              handledMethodKeys.add(matchedCfg.name.toLowerCase());
              const code = getPaymentAccountCode(matchedCfg.id, bankAcc?.code || '1030');
              postEntry(code, amt, 0, isPrior);
            }
          } else if (!handledMethodKeys.has(normKey)) {
            handledMethodKeys.add(normKey);
            const code = getPaymentAccountCode(mKey, bankAcc?.code || '1030');
            postEntry(code, amt, 0, isPrior);
          }
        });
      } else {
        if ((s.card || 0) > 0) postEntry(getPaymentAccountCode('card_pos', bankAcc?.code || '1030'), s.card || 0, 0, isPrior);
        if ((s.bkash || 0) > 0) postEntry(getPaymentAccountCode('bkash_merchant', mfsAcc?.code || '1040'), s.bkash || 0, 0, isPrior);
        if ((s.nagad || 0) > 0) postEntry(getPaymentAccountCode('nagad_merchant', mfsAcc?.code || '1040'), s.nagad || 0, 0, isPrior);
      }

      // Dr Customer Advance Adjustment (deducting from Customer Advance Deposits liability)
      const advAdjusted = s.advanceAdjusted || (s.paymentBreakdown?.advance ? Number(s.paymentBreakdown.advance) : 0);
      if (advAdjusted > 0) {
        postEntry(advanceAcc?.code || '2030', advAdjusted, 0, isPrior);
      }

      // Dr Accounts Receivable (Customer Due Incurred)
      if (dueG > 0) {
        postEntry(arAcc?.code || '1050', dueG, 0, isPrior);
      }

      // Cr Accounts Receivable (Customer Due Collected)
      if (dueC > 0) {
        postEntry(arAcc?.code || '1050', 0, dueC, isPrior);
      }
    });

    // 2. Process Purchases (Raw Material Inwards, Cash & Vendor Payables)
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      const isPrior = Boolean(startDate && p.date && p.date < startDate);
      const isPeriod = (!startDate || p.date >= startDate) && (!endDate || p.date <= endDate);
      if (!isPrior && !isPeriod) return;

      const total = p.total || 0;
      if (total <= 0) return;

      // Dr Raw Material Inventory Asset (1060)
      postEntry(invAcc?.code || '1060', total, 0, isPrior);

      // Check if this purchase has linked payment records in data.payments
      const hasLinkedPayments = (data.payments || []).some(pay => 
        pay.billNo && p.billNo && (
          pay.billNo.trim().toLowerCase() === p.billNo.trim().toLowerCase() ||
          pay.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === p.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        )
      );

      const pType = (p.paymentType || '').toUpperCase();

      if (pType === 'CREDIT' || hasLinkedPayments) {
        // Credit Purchases route through Accounts Payable (2010)
        // Settlement is posted when data.payments is processed (Dr AP 2010, Cr Cash/Bank)
        postEntry(apAcc?.code || '2010', 0, total, isPrior);
      } else {
        // Direct cash or instant payment without separate supplier payment voucher
        const paid = p.paid ?? (pType === 'CASH' ? total : 0);
        const unpaid = Math.max(0, total - paid);

        if (paid > 0) {
          const fundingCode = (pType === 'CASH' || !pType) 
            ? (cashAcc?.code || '1010') 
            : getPaymentAccountCode(p.paymentType, bankAcc?.code || '1030');
          postEntry(fundingCode, 0, paid, isPrior);
        }

        if (unpaid > 0) {
          postEntry(apAcc?.code || '2010', 0, unpaid, isPrior);
        }
      }
    });

    // 3. Process Purchase Returns
    (data.purchaseReturns || []).forEach(pr => {
      const isPrior = Boolean(startDate && pr.date && pr.date < startDate);
      const isPeriod = (!startDate || pr.date >= startDate) && (!endDate || pr.date <= endDate);
      if (!isPrior && !isPeriod) return;

      const retTotal = pr.total || 0;
      if (retTotal > 0) {
        postEntry(apAcc?.code || '2010', retTotal, 0, isPrior);
        postEntry(invAcc?.code || '1060', 0, retTotal, isPrior);
      }
    });

    // 4. Process Supplier Payments (Settlement of Vendor Dues)
    data.payments.forEach(pay => {
      const isPrior = Boolean(startDate && pay.date && pay.date < startDate);
      const isPeriod = (!startDate || pay.date >= startDate) && (!endDate || pay.date <= endDate);
      if (!isPrior && !isPeriod) return;

      const amt = pay.amount || 0;
      if (amt <= 0) return;

      // Dr Accounts Payable
      postEntry(apAcc?.code || '2010', amt, 0, isPrior);

      // Cr Payment Account (Cash / Bank / Mobile)
      const payCode = getPaymentAccountCode(pay.method, cashAcc?.code || '1010');
      postEntry(payCode, 0, amt, isPrior);
    });

    // 5. Process Operating Expenses
    data.expenses.forEach(e => {
      const isPrior = Boolean(startDate && e.date && e.date < startDate);
      const isPeriod = (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate);
      if (!isPrior && !isPeriod) return;

      const amt = e.amount || 0;
      if (amt <= 0) return;

      const matchedHead = resolveExpenseAccount(e, coaList);
      const expCode = matchedHead ? matchedHead.code : (coaList.find(a => a.type === 'EXPENSE')?.code || '6040');

      // Dr Expense Head
      postEntry(expCode, amt, 0, isPrior);

      // Cr Payment Account (Petty Cash, Cash, Bank)
      const fundingCode = getPaymentAccountCode(e.paymentMethod, cashAcc?.code || '1010');
      postEntry(fundingCode, 0, amt, isPrior);
    });

    // 6. Process Customer Advances
    (data.customerAdvances || []).forEach(adv => {
      const isPrior = Boolean(startDate && adv.date && adv.date < startDate);
      const isPeriod = (!startDate || adv.date >= startDate) && (!endDate || adv.date <= endDate);
      if (!isPrior && !isPeriod) return;

      const amt = adv.amount || 0;
      if (amt <= 0) return;

      // Dr Funding Account
      const advFundCode = getPaymentAccountCode(adv.method, cashAcc?.code || '1010');
      postEntry(advFundCode, amt, 0, isPrior);

      // Cr Customer Advance Deposits
      postEntry(advanceAcc?.code || '2030', 0, amt, isPrior);
    });

    // 7. Process Recipe BOM Food Cost (COGS & Raw Material Inventory Consumption)
    const rawRatesMap: Record<number, number> = {};
    data.masterItems.forEach(item => {
      let recQty = 0;
      let recVal = 0;
      data.purchases.forEach(p => {
        if (p.status === 'DRAFT') return;
        (p.items || []).forEach(sub => {
          if (sub.itemId === item.id || (sub.item && sub.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
            const q = Number(sub.qty) || 0;
            const r = Number(sub.rate) || 0;
            recQty += q;
            recVal += (q * r);
          }
        });
      });
      (data.purchaseReturns || []).forEach(ret => {
        if (ret.itemId === item.id || (ret.item && ret.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
          const q = Number(ret.qty) || 0;
          const r = Number(ret.rate) || 0;
          recQty = Math.max(0, recQty - q);
          recVal = Math.max(0, recVal - (q * r));
        }
      });
      const invRecord = data.inventory.find(x => x.id === item.id);
      const totalAvailableQty = recQty;
      const weightedAvgRate = totalAvailableQty > 0 
        ? (recVal / totalAvailableQty) 
        : ((invRecord && invRecord.rate) ? Number(invRecord.rate) : (Number(item.defaultRate) || 0));
      rawRatesMap[item.id] = weightedAvgRate;
    });

    const priorBomUsageMap: Record<number, number> = {};
    const periodBomUsageMap: Record<number, number> = {};

    data.sales.forEach(sale => {
      if (!isSaleActive(sale)) return;
      const isPrior = Boolean(startDate && sale.date && sale.date < startDate);
      const isPeriod = (!startDate || sale.date >= startDate) && (!endDate || sale.date <= endDate);
      if (!isPrior && !isPeriod) return;

      (sale.items || []).forEach(ci => {
        const m = data.menuItems.find(mi => mi.id === ci.id);
        if (m?.recipe) {
          m.recipe.forEach(ing => {
            const rawId = ing.rawItemId;
            const used = (Number(ci.qty) || 0) * (Number(ing.qty) || 0);
            if (isPrior) {
              priorBomUsageMap[rawId] = (priorBomUsageMap[rawId] || 0) + used;
            } else {
              periodBomUsageMap[rawId] = (periodBomUsageMap[rawId] || 0) + used;
            }
          });
        }
      });
    });

    // Build usage maps for manual kitchen used and wastage
    const periodManualUsageMap: Record<number, number> = {};
    const periodWastageUsageMap: Record<number, number> = {};
    data.inventory.forEach(inv => {
      const mUsed = inv.manualUsed !== undefined ? Number(inv.manualUsed) : (Number(inv.used) || 0);
      const wUsed = Number(inv.wastage) || 0;
      if (mUsed > 0) periodManualUsageMap[inv.id] = mUsed;
      if (wUsed > 0) periodWastageUsageMap[inv.id] = wUsed;
    });

    // Dynamic BOM Cost distribution matching COA heads
    const priorAllocation = computeCogsBomAllocation(data.masterItems, priorBomUsageMap, rawRatesMap, coaList);
    let totalPriorBom = 0;
    coaList.filter(a => a.type === 'EXPENSE').forEach(acc => {
      const amt = priorAllocation[acc.id] || 0;
      if (amt > 0) {
        postEntry(acc.code, amt, 0, true);
        totalPriorBom += amt;
      }
    });
    if (totalPriorBom > 0) {
      postEntry(invAcc?.code || '1060', 0, totalPriorBom, true);
    }

    const periodAllocation = computeCogsBomAllocation(
      data.masterItems,
      periodBomUsageMap,
      rawRatesMap,
      coaList,
      periodManualUsageMap,
      periodWastageUsageMap
    );
    let totalPeriodBom = 0;
    coaList.filter(a => a.type === 'EXPENSE').forEach(acc => {
      const amt = periodAllocation[acc.id] || 0;
      if (amt > 0) {
        postEntry(acc.code, amt, 0, false);
        totalPeriodBom += amt;
      }
    });
    if (totalPeriodBom > 0) {
      postEntry(invAcc?.code || '1060', 0, totalPeriodBom, false);
    }

    // 8. Process Manual Journal Entries
    (data.journalEntries || []).forEach(j => {
      const isPrior = Boolean(startDate && j.date && j.date < startDate);
      const isPeriod = (!startDate || j.date >= startDate) && (!endDate || j.date <= endDate);
      if (!isPrior && !isPeriod) return;

      postEntry(j.debitAccountId, j.amount, 0, isPrior);
      postEntry(j.creditAccountId, 0, j.amount, isPrior);
    });

    // 9. Multi-Column Account Rows - Dynamically build for every account in Chart of Accounts!
    interface TrialBalanceRow {
      code: string;
      name: string;
      type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
      category: string;
      openingDebit: number;
      openingCredit: number;
      periodDebit: number;
      periodCredit: number;
      closingDebit: number;
      closingCredit: number;
    }

    // Check if Cash has opening balance / float but Owner Equity has 0 to preserve double-entry balance
    const cashOpeningVal = Number(cashAcc?.balance) || 0;
    const sessionFloatVal = Number(data.session?.openingCash) || 0;
    const activeFloatVal = cashOpeningVal > 0 ? cashOpeningVal : sessionFloatVal;

    const allRows: TrialBalanceRow[] = coaList.map(acc => {
      let initialBalance = Number(acc.balance) || 0;

      // Retained Earnings (3020) and Drawings (3030) should not inherit the shift opening cash float
      if (acc.code === '3020' || acc.code === '3030') {
        if (initialBalance === activeFloatVal && activeFloatVal > 0) {
          initialBalance = 0;
        }
      }

      const isCashHead = acc.code === '1010' || (acc.systemRole || getAccountSystemRole(acc)) === 'CASH';
      const isEquityHead = acc.code === '3010' || (acc.systemRole || getAccountSystemRole(acc)) === 'OWNER_CAPITAL';

      if (isCashHead && initialBalance === 0 && activeFloatVal > 0) {
        initialBalance = activeFloatVal;
      }
      if (isEquityHead && initialBalance === 0 && activeFloatVal > 0) {
        initialBalance = activeFloatVal;
      }

      let initialDr = 0;
      let initialCr = 0;

      // ADE (Assets, Drawings, Expenses) are Debit normal; LCR (Liabilities, Capital, Revenue) are Credit normal
      const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE' || (acc.systemRole || getAccountSystemRole(acc)) === 'OWNER_DRAWINGS';

      if (isDebitNormal) {
        if (initialBalance >= 0) initialDr = initialBalance;
        else initialCr = Math.abs(initialBalance);
      } else {
        if (initialBalance >= 0) initialCr = initialBalance;
        else initialDr = Math.abs(initialBalance);
      }

      const mv = movements[acc.code] || { priorDr: 0, priorCr: 0, periodDr: 0, periodCr: 0 };

      // Cumulative Opening Position prior to startDate
      let openingDr = 0;
      let openingCr = 0;

      if (isDebitNormal) {
        const netOpening = (initialDr - initialCr) + (mv.priorDr - mv.priorCr);
        if (netOpening >= 0) openingDr = round2(netOpening);
        else openingCr = round2(Math.abs(netOpening));
      } else {
        const netOpening = (initialCr - initialDr) + (mv.priorCr - mv.priorDr);
        if (netOpening >= 0) openingCr = round2(netOpening);
        else openingDr = round2(Math.abs(netOpening));
      }

      const periodDr = round2(mv.periodDr);
      const periodCr = round2(mv.periodCr);

      // Net Closing Balance
      let closingDr = 0;
      let closingCr = 0;

      if (isDebitNormal) {
        const netClosing = (openingDr - openingCr) + (periodDr - periodCr);
        if (netClosing >= 0) closingDr = round2(netClosing);
        else closingCr = round2(Math.abs(netClosing));
      } else {
        const netClosing = (openingCr - openingDr) + (periodCr - periodDr);
        if (netClosing >= 0) closingCr = round2(netClosing);
        else closingDr = round2(Math.abs(netClosing));
      }

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        category: acc.category || acc.type,
        openingDebit: openingDr,
        openingCredit: openingCr,
        periodDebit: periodDr,
        periodCredit: periodCr,
        closingDebit: closingDr,
        closingCredit: closingCr
      };
    });

    const filteredRows = allRows.filter(r => {
      if (coaTypeFilter !== 'ALL' && r.type !== coaTypeFilter) return false;
      if (hideZeroBalances) {
        const hasActivity = r.openingDebit > 0 || r.openingCredit > 0 || r.periodDebit > 0 || r.periodCredit > 0 || r.closingDebit > 0 || r.closingCredit > 0;
        if (!hasActivity) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQ = r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }
      return true;
    });

    const totalOpeningDebit = round2(allRows.reduce((s, r) => s + r.openingDebit, 0));
    const totalOpeningCredit = round2(allRows.reduce((s, r) => s + r.openingCredit, 0));
    const totalPeriodDebit = round2(allRows.reduce((s, r) => s + r.periodDebit, 0));
    const totalPeriodCredit = round2(allRows.reduce((s, r) => s + r.periodCredit, 0));
    const totalClosingDebit = round2(allRows.reduce((s, r) => s + r.closingDebit, 0));
    const totalClosingCredit = round2(allRows.reduce((s, r) => s + r.closingCredit, 0));

    const displayedOpeningDebit = round2(filteredRows.reduce((s, r) => s + r.openingDebit, 0));
    const displayedOpeningCredit = round2(filteredRows.reduce((s, r) => s + r.openingCredit, 0));
    const displayedPeriodDebit = round2(filteredRows.reduce((s, r) => s + r.periodDebit, 0));
    const displayedPeriodCredit = round2(filteredRows.reduce((s, r) => s + r.periodCredit, 0));
    const displayedClosingDebit = round2(filteredRows.reduce((s, r) => s + r.closingDebit, 0));
    const displayedClosingCredit = round2(filteredRows.reduce((s, r) => s + r.closingCredit, 0));

    const isBalanced = 
      Math.abs(totalOpeningDebit - totalOpeningCredit) < 0.05 &&
      Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.05 &&
      Math.abs(totalClosingDebit - totalClosingCredit) < 0.05;

    return {
      rows: filteredRows,
      allRowsCount: allRows.length,
      totalCoaCount: coaList.length,
      totalOpeningDebit,
      totalOpeningCredit,
      totalPeriodDebit,
      totalPeriodCredit,
      totalClosingDebit,
      totalClosingCredit,
      displayedOpeningDebit,
      displayedOpeningCredit,
      displayedPeriodDebit,
      displayedPeriodCredit,
      displayedClosingDebit,
      displayedClosingCredit,
      isBalanced
    };
  }, [
    data.sales, 
    data.purchases, 
    data.purchaseReturns,
    data.payments, 
    data.expenses, 
    data.customerAdvances,
    data.journalEntries,
    data.paymentMethods,
    data.chartOfAccounts,
    data.menuItems, 
    data.masterItems, 
    startDate, 
    endDate, 
    searchQuery,
    coaTypeFilter,
    hideZeroBalances
  ]);

  // --- 15. PROFIT & LOSS ACCOUNT (AS PER IFRS - STATEMENT OF COMPREHENSIVE INCOME) ---
  const ifrsPnlData = useMemo(() => {
    let grossSales = 0;
    let totalDiscounts = 0;
    let totalVAT = 0;

    data.sales.forEach(s => {
      if (!isSaleActive(s)) return;
      if (!matchesDate(s.date)) return;
      grossSales += (s.subtotal || s.total);
      totalDiscounts += (s.discountVal || 0);
      totalVAT += (s.vatVal || 0);
    });

    const netRevenue = grossSales - totalDiscounts;

    // Cost of Sales (COGS): Recipe BOM consumption using live valuation rates
    const rawRateLookup: Record<number, number> = {};
    data.masterItems.forEach(item => {
      let recQty = 0;
      let recVal = 0;
      data.purchases.forEach(p => {
        if (p.status === 'DRAFT') return;
        (p.items || []).forEach(sub => {
          if (sub.itemId === item.id || (sub.item && sub.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
            const q = Number(sub.qty) || 0;
            const r = Number(sub.rate) || 0;
            recQty += q;
            recVal += (q * r);
          }
        });
      });
      (data.purchaseReturns || []).forEach(ret => {
        if (ret.itemId === item.id || (ret.item && ret.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
          const q = Number(ret.qty) || 0;
          const r = Number(ret.rate) || 0;
          recQty = Math.max(0, recQty - q);
          recVal = Math.max(0, recVal - (q * r));
        }
      });
      const invRecord = data.inventory.find(x => x.id === item.id);
      const totalAvailableQty = recQty;
      const weightedAvgRate = totalAvailableQty > 0 
        ? (recVal / totalAvailableQty) 
        : ((invRecord && invRecord.rate) ? Number(invRecord.rate) : (Number(item.defaultRate) || 0));
      rawRateLookup[item.id] = weightedAvgRate;
    });

    let cogsRawCost = 0;
    data.sales.forEach(s => {
      if (!isSaleActive(s)) return;
      if (!matchesDate(s.date)) return;
      (s.items || []).forEach(ci => {
        const m = data.menuItems.find(mi => mi.id === ci.id);
        if (m?.recipe) {
          m.recipe.forEach(ing => {
            const raw = data.masterItems.find(r => r.id === ing.rawItemId);
            if (raw) {
              const rate = rawRateLookup[raw.id] || Number(raw.defaultRate) || 0;
              cogsRawCost += (Number(ci.qty) || 0) * (Number(ing.qty) || 0) * rate;
            }
          });
        }
      });
    });

    // Direct Kitchen Manual Usage & Wastage
    let manualKitchenCost = 0;
    let wastageCost = 0;
    data.inventory.forEach(inv => {
      const raw = data.masterItems.find(r => r.id === inv.id);
      const rate = inv.rate || raw?.defaultRate || rawRateLookup[inv.id] || 0;
      const mUsed = inv.manualUsed !== undefined ? Number(inv.manualUsed) : (Number(inv.used) || 0);
      const wUsed = Number(inv.wastage) || 0;
      if (mUsed > 0) manualKitchenCost += mUsed * rate;
      if (wUsed > 0) wastageCost += wUsed * rate;
    });

    const totalCostOfSales = cogsRawCost + manualKitchenCost + wastageCost;
    const grossProfit = netRevenue - totalCostOfSales;
    const grossProfitMargin = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : '0';

    // Operating Expenses
    const expenseBreakdown: Record<string, number> = {};
    let totalOpEx = 0;
    data.expenses.forEach(e => {
      if (!matchesDate(e.date)) return;
      expenseBreakdown[e.head] = (expenseBreakdown[e.head] || 0) + e.amount;
      totalOpEx += e.amount;
    });

    // Journal adjustments to Operating Expenses
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;
      const coa = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
      const debitAcc = coa.find(a => a.id === j.debitAccountId || a.code === j.debitAccountId);
      const creditAcc = coa.find(a => a.id === j.creditAccountId || a.code === j.creditAccountId);

      if (debitAcc?.type === 'EXPENSE') {
        const headName = debitAcc.name || 'Expense Adjustment';
        expenseBreakdown[headName] = (expenseBreakdown[headName] || 0) + j.amount;
        totalOpEx += j.amount;
      }
      if (creditAcc?.type === 'EXPENSE') {
        const headName = creditAcc.name || 'Expense Adjustment';
        expenseBreakdown[headName] = (expenseBreakdown[headName] || 0) - j.amount;
        totalOpEx -= j.amount;
      }
    });

    const operatingProfitEbitda = grossProfit - totalOpEx;
    const operatingMargin = netRevenue > 0 ? ((operatingProfitEbitda / netRevenue) * 100).toFixed(1) : '0';

    // Depreciation: dynamically pulled from recorded expenses or journal entries
    let depreciation = 0;
    data.expenses.forEach(e => {
      if (!matchesDate(e.date)) return;
      if (e.head?.toLowerCase().includes('depreciation')) {
        depreciation += Number(e.amount) || 0;
      }
    });
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;
      const coa = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
      const debitAcc = coa.find(a => a.id === j.debitAccountId || a.code === j.debitAccountId);
      if (debitAcc?.name?.toLowerCase().includes('depreciation') || j.debitAccountName?.toLowerCase().includes('depreciation')) {
        depreciation += Number(j.amount) || 0;
      }
    });

    const profitBeforeTax = operatingProfitEbitda - depreciation;
    const incomeTaxProvision = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.15) : 0;
    const netProfit = profitBeforeTax - incomeTaxProvision;
    const netProfitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : '0';

    return {
      grossSales,
      totalDiscounts,
      netRevenue,
      cogsRawCost,
      manualKitchenCost,
      wastageCost,
      totalCostOfSales,
      grossProfit,
      grossProfitMargin,
      expenseBreakdown,
      totalOpEx,
      operatingProfitEbitda,
      operatingMargin,
      depreciation,
      profitBeforeTax,
      incomeTaxProvision,
      netProfit,
      netProfitMargin
    };
  }, [data.sales, data.inventory, data.expenses, data.masterItems, data.menuItems, data.journalEntries, data.chartOfAccounts, startDate, endDate]);

  // --- 16. BALANCE SHEET (AS PER IFRS - STATEMENT OF FINANCIAL POSITION) ---
  const ifrsBalanceSheetData = useMemo(() => {
    // Current Inventory Valuation
    let closingInventoryVal = 0;
    data.masterItems.forEach(item => {
      const inv = data.inventory.find(i => i.id === item.id);
      const open = inv ? Number(inv.open) || 0 : 0;
      const manualUsed = inv ? (inv.manualUsed !== undefined ? Number(inv.manualUsed) : (Number(inv.used) || 0)) : 0;
      const wastage = inv ? Number(inv.wastage) || 0 : 0;
      let inward = 0;
      data.purchases.forEach(p => {
        if (p.status !== 'DRAFT') {
          p.items.forEach(pi => {
            if (pi.itemId === item.id) inward += pi.qty;
          });
        }
      });
      let bomOut = 0;
      data.sales.forEach(s => {
        if (!isSaleActive(s)) return;
        (s.items || []).forEach(ci => {
          const m = data.menuItems.find(mi => mi.id === ci.id);
          if (m?.recipe) {
            m.recipe.forEach(ing => {
              if (ing.rawItemId === item.id) {
                bomOut += (Number(ci.qty) || 0) * (Number(ing.qty) || 0);
              }
            });
          }
        });
      });
      const stock = Math.max(0, open + inward - bomOut - manualUsed - wastage);
      closingInventoryVal += stock * (inv?.rate || item.defaultRate || 0);
    });

    // Accounts Receivable
    let arBalance = 0;
    data.sales.forEach(s => {
      if (!isSaleActive(s)) return;
      arBalance += (s.dueGiven || 0) - (s.dueCollected || 0);
    });

    // Cash & Cash Equivalents
    const coaListReport = data.chartOfAccounts || [];
    const getReportCoaBalance = (code: string) => {
      const acc = coaListReport.find(a => a.code === code || a.id === code);
      return Number(acc?.balance) || 0;
    };
    const activeShiftFloat = (data.session?.isActive && Number(data.session.openingCash) > 0) ? Number(data.session.openingCash) : 0;
    let cashBalance = Math.max(getReportCoaBalance('1010'), activeShiftFloat);
    let bankBalance = getReportCoaBalance('1030') + getReportCoaBalance('1040');
    data.sales.forEach(s => {
      if (!isSaleActive(s)) return;
      cashBalance += (s.cash || 0) + (s.dueCollected || 0);
      bankBalance += ((s.card || 0) + (s.bkash || 0) + (s.nagad || 0));
    });
    data.purchases.forEach(p => {
      if (p.paymentType === 'CASH') cashBalance -= (p.paid ?? p.total);
    });
    data.payments.forEach(pay => {
      if (pay.method === 'CASH') cashBalance -= pay.amount;
      else bankBalance -= pay.amount;
    });
    data.expenses.forEach(e => {
      cashBalance -= e.amount;
    });
    (data.customerAdvances || []).forEach(adv => {
      if (adv.method === 'CASH') cashBalance += adv.amount;
      else bankBalance += adv.amount;
    });

    // Journal Entries Effect on Cash, Bank, AR, AP
    (data.journalEntries || []).forEach(j => {
      const isDrCash = j.debitAccountId === '1010' || j.debitAccountName?.includes('1010');
      const isCrCash = j.creditAccountId === '1010' || j.creditAccountName?.includes('1010');
      if (isDrCash) cashBalance += j.amount;
      if (isCrCash) cashBalance -= j.amount;

      const isDrBank = j.debitAccountId === '1030' || j.debitAccountId === '1040' || j.debitAccountName?.includes('1030') || j.debitAccountName?.includes('1040');
      const isCrBank = j.creditAccountId === '1030' || j.creditAccountId === '1040' || j.creditAccountName?.includes('1030') || j.creditAccountName?.includes('1040');
      if (isDrBank) bankBalance += j.amount;
      if (isCrBank) bankBalance -= j.amount;

      const isDrAr = j.debitAccountId === '1050' || j.debitAccountName?.includes('1050');
      const isCrAr = j.creditAccountId === '1050' || j.creditAccountName?.includes('1050');
      if (isDrAr) arBalance += j.amount;
      if (isCrAr) arBalance -= j.amount;

      const isDrAp = j.debitAccountId === '2010' || j.debitAccountName?.includes('2010');
      const isCrAp = j.creditAccountId === '2010' || j.creditAccountName?.includes('2010');
      if (isDrAp) apBalance -= j.amount;
      if (isCrAp) apBalance += j.amount;
    });

    const totalCurrentAssets = round2(Math.max(0, cashBalance) + Math.max(0, bankBalance) + Math.max(0, arBalance) + closingInventoryVal);

    // Non-Current Assets (Dynamic from Chart of Accounts)
    const nonCurrentAssetHeads = coaListReport.filter(a =>
      a.type === 'ASSET' && (
        a.category?.toLowerCase().includes('non') ||
        a.category?.toLowerCase().includes('fixed') ||
        a.code === '1070' ||
        a.systemRole === 'NON_CURRENT_ASSET' ||
        a.name?.toLowerCase().includes('equipment') ||
        a.name?.toLowerCase().includes('furniture') ||
        a.name?.toLowerCase().includes('fixture') ||
        a.name?.toLowerCase().includes('plant') ||
        a.name?.toLowerCase().includes('vehicle')
      )
    );

    const nonCurrentAssetBreakdown = nonCurrentAssetHeads.map(head => {
      let bal = Number(head.balance) || 0;
      (data.journalEntries || []).forEach(j => {
        if (j.debitAccountId === head.code || j.debitAccountId === head.id || j.debitAccountName === head.name) {
          bal += Number(j.amount) || 0;
        }
        if (j.creditAccountId === head.code || j.creditAccountId === head.id || j.creditAccountName === head.name) {
          bal -= Number(j.amount) || 0;
        }
      });
      return {
        id: head.id || head.code,
        name: head.name,
        code: head.code,
        balance: Math.max(0, bal)
      };
    });

    const nonCurrentAssets = round2(nonCurrentAssetBreakdown.reduce((sum, item) => sum + item.balance, 0));
    const totalAssets = round2(totalCurrentAssets + nonCurrentAssets);

    // Liabilities
    let apBalance = 0;
    data.purchases.forEach(p => {
      if (p.status !== 'DRAFT') {
        const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
        apBalance += Math.max(0, p.total - paid);
      }
    });

    let advanceLiabilities = 0;
    (data.customerAdvances || []).forEach(adv => {
      if (adv.status === 'ACTIVE') {
        advanceLiabilities += Math.max(0, (adv.amount || 0) - (adv.adjustedAmount || 0));
      }
    });

    const totalCurrentLiabilities = round2(apBalance + advanceLiabilities);

    // Equity
    let ownerCapitalCoa = getReportCoaBalance('3010') + getReportCoaBalance('3020') - getReportCoaBalance('3030');
    (data.journalEntries || []).forEach(j => {
      const isCrEquity = j.creditAccountId === '3010' || j.creditAccountId === '3020' || j.creditAccountName?.includes('3010') || j.creditAccountName?.includes('3020') || (j.creditAccountName && (j.creditAccountName.toLowerCase().includes('equity') || j.creditAccountName.toLowerCase().includes('capital')));
      const isDrEquity = j.debitAccountId === '3010' || j.debitAccountId === '3020' || j.debitAccountName?.includes('3010') || j.debitAccountName?.includes('3020') || (j.debitAccountName && (j.debitAccountName.toLowerCase().includes('equity') || j.debitAccountName.toLowerCase().includes('capital')));
      if (isCrEquity) ownerCapitalCoa += Number(j.amount) || 0;
      if (isDrEquity) ownerCapitalCoa -= Number(j.amount) || 0;

      const isDrDrawing = j.debitAccountId === '3030' || j.debitAccountName?.includes('3030') || (j.debitAccountName && j.debitAccountName.toLowerCase().includes('drawing'));
      const isCrDrawing = j.creditAccountId === '3030' || j.creditAccountName?.includes('3030') || (j.creditAccountName && j.creditAccountName.toLowerCase().includes('drawing'));
      if (isDrDrawing) ownerCapitalCoa -= Number(j.amount) || 0;
      if (isCrDrawing) ownerCapitalCoa += Number(j.amount) || 0;
    });

    const netCurrentProfit = ifrsPnlData.netProfit;
    const balancingCapital = totalAssets - totalCurrentLiabilities - netCurrentProfit;
    const capitalAndRetained = ownerCapitalCoa !== 0 ? ownerCapitalCoa : Math.max(0, balancingCapital);
    const totalEquity = round2(capitalAndRetained + netCurrentProfit);
    const totalEquityAndLiabilities = round2(totalEquity + totalCurrentLiabilities);

    return {
      nonCurrentAssets,
      nonCurrentAssetBreakdown,
      closingInventoryVal: round2(closingInventoryVal),
      arBalance: Math.max(0, arBalance),
      cashBalance: Math.max(0, cashBalance),
      bankBalance: Math.max(0, bankBalance),
      totalCurrentAssets,
      totalAssets,
      apBalance,
      advanceLiabilities,
      totalCurrentLiabilities,
      capitalAndRetained,
      netCurrentProfit,
      totalEquity,
      totalEquityAndLiabilities
    };
  }, [data.masterItems, data.inventory, data.purchases, data.sales, data.payments, data.expenses, data.customerAdvances, data.journalEntries, data.chartOfAccounts, data.session, ifrsPnlData.netProfit]);

  // --- 17. CASH FLOW STATEMENT (AS PER IFRS - IAS 7) ---
  const ifrsCashFlowData = useMemo(() => {
    // 1. Operating Activities
    let customerReceipts = 0;
    data.sales.forEach(s => {
      if (!isSaleActive(s)) return;
      if (!matchesDate(s.date)) return;
      customerReceipts += (s.cash || 0) + (s.card || 0) + (s.bkash || 0) + (s.nagad || 0) + (s.dueCollected || 0);
    });
    (data.customerAdvances || []).forEach(adv => {
      if (!matchesDate(adv.date)) return;
      customerReceipts += adv.amount;
    });

    let supplierPayments = 0;
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (!matchesDate(p.date)) return;
      if (p.paymentType === 'CASH') supplierPayments += (p.paid ?? p.total);
    });
    data.payments.forEach(pay => {
      if (!matchesDate(pay.date)) return;
      supplierPayments += pay.amount;
    });

    let opExPayments = 0;
    data.expenses.forEach(e => {
      if (!matchesDate(e.date)) return;
      opExPayments += e.amount;
    });

    const netCashFromOperating = customerReceipts - supplierPayments - opExPayments;

    // 2. Investing Activities
    let equipmentAdditions = 0;
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;
      const coa = data.chartOfAccounts || DEFAULT_CHART_OF_ACCOUNTS;
      const debitAcc = coa.find(a => a.id === j.debitAccountId || a.code === j.debitAccountId);
      if (debitAcc?.code === '1070' || debitAcc?.category?.toLowerCase().includes('non') || debitAcc?.name?.toLowerCase().includes('equipment')) {
        equipmentAdditions += Number(j.amount) || 0;
      }
    });
    const netCashFromInvesting = -equipmentAdditions;

    // 3. Financing Activities
    let capitalInjections = 0;
    let ownerDrawings = 0;
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;
      const amt = Number(j.amount) || 0;
      if (amt <= 0) return;
      const isDebitLiquid = j.debitAccountId === '1010' || j.debitAccountId === '1030' || (j.debitAccountName && (j.debitAccountName.toLowerCase().includes('cash') || j.debitAccountName.toLowerCase().includes('bank')));
      const isCreditLiquid = j.creditAccountId === '1010' || j.creditAccountId === '1030' || (j.creditAccountName && (j.creditAccountName.toLowerCase().includes('cash') || j.creditAccountName.toLowerCase().includes('bank')));
      const isCreditEquity = j.creditAccountId === '3010' || (j.creditAccountName && (j.creditAccountName.toLowerCase().includes('equity') || j.creditAccountName.toLowerCase().includes('capital')));
      const isDebitDrawings = j.debitAccountId === '3030' || (j.debitAccountName && j.debitAccountName.toLowerCase().includes('drawing'));
      if (isDebitLiquid && isCreditEquity) capitalInjections += amt;
      if (isCreditLiquid && isDebitDrawings) ownerDrawings += amt;
    });
    const netCashFromFinancing = capitalInjections - ownerDrawings;

    const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
    const coaListReport = data.chartOfAccounts || [];
    const cashOpening = Number(coaListReport.find(a => a.code === '1010')?.balance) || Number(data.session?.openingCash) || 0;
    const bankOpening = Number(coaListReport.find(a => a.code === '1030')?.balance) || 0;
    const openingCashEquivalents = cashOpening + bankOpening;
    const closingCashEquivalents = openingCashEquivalents + netChangeInCash;

    return {
      customerReceipts,
      supplierPayments,
      opExPayments,
      netCashFromOperating,
      equipmentAdditions,
      netCashFromInvesting,
      capitalInjections,
      ownerDrawings,
      netCashFromFinancing,
      netChangeInCash,
      openingCashEquivalents,
      closingCashEquivalents
    };
  }, [data.sales, data.purchases, data.payments, data.expenses, data.customerAdvances, data.journalEntries, data.chartOfAccounts, data.session, startDate, endDate]);

  // CSV Exporters
  const handleExportTrialBalance = () => {
    const headers = [
      'Account Code',
      'Account Title / General Ledger Head',
      'Category Type',
      'Opening Balance Debit (৳)',
      'Opening Balance Credit (৳)',
      'Period Transactions Debit (৳)',
      'Period Transactions Credit (৳)',
      'Closing Balance Debit (৳)',
      'Closing Balance Credit (৳)'
    ];
    const rows = trialBalanceData.rows.map(r => [
      r.code,
      r.name,
      r.type,
      r.openingDebit,
      r.openingCredit,
      r.periodDebit,
      r.periodCredit,
      r.closingDebit,
      r.closingCredit
    ]);
    exportCsvHelper('trial_balance_transactional', headers, rows);
  };

  const handleExportPnl = () => {
    const headers = ['Financial Line Item', 'Amount (৳)', 'Notes'];
    const rows = [
      ['Gross Revenue from Sales', ifrsPnlData.grossSales, 'Gross billing'],
      ['Less: Customer Discounts', `-${ifrsPnlData.totalDiscounts}`, 'Discounts conceded'],
      ['Net Revenue', ifrsPnlData.netRevenue, 'IFRS 15 Net Revenue'],
      ['Cost of Goods Sold (BOM Raw)', `-${ifrsPnlData.cogsRawCost}`, 'Recipe direct ingredient cost'],
      ['Manual Kitchen Usage (Direct Cooking)', `-${ifrsPnlData.manualKitchenCost}`, 'Manual food preparation cost'],
      ['Kitchen Spoilage & Wastage Loss', `-${ifrsPnlData.wastageCost}`, 'Spoilage loss'],
      ['Total Cost of Sales', `-${ifrsPnlData.totalCostOfSales}`, 'Direct production cost'],
      ['Gross Profit', ifrsPnlData.grossProfit, `Gross Margin: ${ifrsPnlData.grossProfitMargin}%`],
      ...Object.entries(ifrsPnlData.expenseBreakdown).map(([h, amt]) => [`Operating Expense: ${h}`, `-${amt}`, 'General operational expense']),
      ['Total Operating Expenses', `-${ifrsPnlData.totalOpEx}`, 'OpEx Total'],
      ['Operating Profit / EBITDA', ifrsPnlData.operatingProfitEbitda, `Operating Margin: ${ifrsPnlData.operatingMargin}%`],
      ['Depreciation & Amortization', `-${ifrsPnlData.depreciation}`, 'Kitchen wear & tear'],
      ['Provision for Income Tax', `-${ifrsPnlData.incomeTaxProvision}`, '15% restaurant tax'],
      ['Net Profit for the Period', ifrsPnlData.netProfit, `Net Margin: ${ifrsPnlData.netProfitMargin}%`]
    ];
    exportCsvHelper('pnl_statement_ifrs', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* 14. TRIAL BALANCE */}
      {reportType === 'trial-balance' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search account head, code..."
            totalRecords={trialBalanceData.rows.length}
            onExportCsv={handleExportTrialBalance}
            onPrint={() => window.print()}
          />

          {/* Chart of Accounts Type Filter & Display Options */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 uppercase tracking-wider">Account Group:</span>
              {[
                { label: 'All Accounts', value: 'ALL' },
                { label: 'Assets (1000)', value: 'ASSET' },
                { label: 'Liabilities (2000)', value: 'LIABILITY' },
                { label: 'Equity (3000)', value: 'EQUITY' },
                { label: 'Revenue (4000)', value: 'REVENUE' },
                { label: 'Expenses (5000/6000)', value: 'EXPENSE' },
              ].map(group => (
                <button
                  key={group.value}
                  type="button"
                  onClick={() => setCoaTypeFilter(group.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    coaTypeFilter === group.value
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={hideZeroBalances}
                  onChange={e => setHideZeroBalances(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span>Hide Zero-Balance Accounts</span>
              </label>
            </div>
          </div>

          {/* Multi-Section KPI Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opening Balance Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Opening Balance (Dr / Cr)</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {startDate ? `< ${startDate}` : 'Genesis'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Debit (Dr):</span>
                  <span className="font-mono font-extrabold text-slate-900">৳{formatTbNum(trialBalanceData.totalOpeningDebit)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Credit (Cr):</span>
                  <span className="font-mono font-extrabold text-slate-900">৳{formatTbNum(trialBalanceData.totalOpeningCredit)}</span>
                </div>
              </div>
            </div>

            {/* Period Transactions Card */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-amber-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Period Activity (Movement)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  {startDate || endDate ? `${startDate || 'Start'} → ${endDate || 'End'}` : 'All Time'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-800/80">Period Debits (Dr):</span>
                  <span className="font-mono font-extrabold text-amber-950">৳{formatTbNum(trialBalanceData.totalPeriodDebit)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-800/80">Period Credits (Cr):</span>
                  <span className="font-mono font-extrabold text-amber-950">৳{formatTbNum(trialBalanceData.totalPeriodCredit)}</span>
                </div>
              </div>
            </div>

            {/* Closing Net Position Card */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-teal-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Closing Balance (Net)</span>
                <span className="text-[10px] bg-teal-200 text-teal-900 px-2 py-0.5 rounded-full font-bold">
                  {endDate ? `As of ${endDate}` : 'Current'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-teal-800/80">Closing Debits (Dr):</span>
                  <span className="font-mono font-extrabold text-teal-950">৳{formatTbNum(trialBalanceData.totalClosingDebit)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-teal-800/80">Closing Credits (Cr):</span>
                  <span className="font-mono font-extrabold text-teal-950">৳{formatTbNum(trialBalanceData.totalClosingCredit)}</span>
                </div>
              </div>
            </div>

            {/* Equilibrium & Status */}
            <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
              trialBalanceData.isBalanced 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Double-Entry Status</span>
                <Scale className={`w-4 h-4 ${trialBalanceData.isBalanced ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
              <div className="mt-2">
                <div className="text-base font-black flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${trialBalanceData.isBalanced ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {trialBalanceData.isBalanced ? 'Mathematically Balanced' : 'Out of Balance'}
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Total Dr = Total Cr across Opening, Period, and Closing
                </p>
              </div>
            </div>
          </div>

          {/* Scope Explanation Note */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <div className="p-1 bg-blue-100 rounded-lg text-blue-700 shrink-0 mt-0.5">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-blue-950">Transactional & Opening Balance Rule: </span>
              <span>
                When a date filter is selected (e.g. <em>{startDate || 'Selected Start'}</em> to <em>{endDate || 'Selected End'}</em>), 
                the <strong>Opening Balance</strong> columns show the cumulative balances strictly prior to the start date. 
                The <strong>Period Transactions</strong> columns show activity during the selected period, and <strong>Closing Balance</strong> shows the resulting net position.
              </span>
            </div>
          </div>

          {/* Trial Balance Multi-Column Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-teal-600" />
                  <span>Transactional Trial Balance (General Ledger Balances with Opening Position)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete 6-column chart of accounts trial balance verifying double-entry equilibrium
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Showing {trialBalanceData.rows.length} of {trialBalanceData.totalCoaCount} Chart Accounts
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Tier 1 Header */}
                  <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                    <th rowSpan={2} className="py-3 px-3.5 border-r border-slate-200 w-16 text-center">Code</th>
                    <th rowSpan={2} className="py-3 px-4 border-r border-slate-200">General Ledger Account Head</th>
                    <th rowSpan={2} className="py-3 px-3 border-r border-slate-200 w-24">Category</th>
                    
                    <th colSpan={2} className="py-2.5 px-3 text-center bg-slate-200/80 border-r border-slate-300 text-slate-800 font-black">
                      Opening Balance ({startDate ? `Prior to ${startDate}` : 'Initial'})
                    </th>
                    <th colSpan={2} className="py-2.5 px-3 text-center bg-amber-100/80 border-r border-amber-300 text-amber-950 font-black">
                      Period Transactions ({startDate || 'Start'} to {endDate || 'End'})
                    </th>
                    <th colSpan={2} className="py-2.5 px-3 text-center bg-teal-100/80 text-teal-950 font-black">
                      Closing Balance ({endDate ? `As of ${endDate}` : 'Net Final'})
                    </th>
                  </tr>
                  {/* Tier 2 Header */}
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 text-[11px]">
                    <th className="py-2 px-3 text-right bg-slate-100/70 border-r border-slate-200 font-mono">Debit (Dr) ৳</th>
                    <th className="py-2 px-3 text-right bg-slate-100/70 border-r border-slate-300 font-mono">Credit (Cr) ৳</th>
                    
                    <th className="py-2 px-3 text-right bg-amber-50/70 border-r border-amber-200 font-mono text-amber-900">Debit (Dr) ৳</th>
                    <th className="py-2 px-3 text-right bg-amber-50/70 border-r border-amber-300 font-mono text-amber-900">Credit (Cr) ৳</th>
                    
                    <th className="py-2 px-3 text-right bg-teal-50/70 border-r border-teal-200 font-mono text-teal-900">Debit (Dr) ৳</th>
                    <th className="py-2 px-3 text-right bg-teal-50/70 font-mono text-teal-900">Credit (Cr) ৳</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trialBalanceData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-semibold">
                        No chart of accounts heads match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    trialBalanceData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        {/* Code */}
                        <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 border-r border-slate-100 text-center">
                          {row.code}
                        </td>
                        
                        {/* Title */}
                        <td className="py-2.5 px-4 font-extrabold text-slate-800 border-r border-slate-100">
                          {row.name}
                        </td>
                        
                        {/* Category Type */}
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            row.type === 'ASSET' ? 'bg-blue-100 text-blue-800' :
                            row.type === 'LIABILITY' ? 'bg-amber-100 text-amber-800' :
                            row.type === 'EQUITY' ? 'bg-purple-100 text-purple-800' :
                            row.type === 'REVENUE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.type}
                          </span>
                        </td>

                        {/* Opening Dr & Cr */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 bg-slate-50/30 border-r border-slate-100">
                          {row.openingDebit > 0 ? `৳${formatTbNum(row.openingDebit)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 bg-slate-50/30 border-r border-slate-200">
                          {row.openingCredit > 0 ? `৳${formatTbNum(row.openingCredit)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>

                        {/* Period Dr & Cr */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950 bg-amber-50/20 border-r border-amber-100">
                          {row.periodDebit > 0 ? `৳${formatTbNum(row.periodDebit)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950 bg-amber-50/20 border-r border-slate-200">
                          {row.periodCredit > 0 ? `৳${formatTbNum(row.periodCredit)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>

                        {/* Closing Dr & Cr */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-teal-950 bg-teal-50/20 border-r border-teal-100">
                          {row.closingDebit > 0 ? `৳${formatTbNum(row.closingDebit)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-teal-950 bg-teal-50/20">
                          {row.closingCredit > 0 ? `৳${formatTbNum(row.closingCredit)}` : <span className="text-slate-300 font-normal">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-700 text-xs">
                    <td colSpan={3} className="py-3 px-4 uppercase tracking-wider text-amber-400 font-extrabold">
                      {coaTypeFilter === 'ALL' ? 'GRAND TOTAL TRIAL BALANCE' : `TOTAL (${coaTypeFilter} ACCOUNTS)`}
                    </td>
                    
                    {/* Opening Totals */}
                    <td className="py-3 px-3 text-right font-mono text-slate-200 border-r border-slate-800">
                      ৳{formatTbNum(trialBalanceData.displayedOpeningDebit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200 border-r border-slate-700">
                      ৳{formatTbNum(trialBalanceData.displayedOpeningCredit)}
                    </td>

                    {/* Period Totals */}
                    <td className="py-3 px-3 text-right font-mono text-amber-300 border-r border-slate-800 bg-amber-950/30">
                      ৳{formatTbNum(trialBalanceData.displayedPeriodDebit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300 border-r border-slate-700 bg-amber-950/30">
                      ৳{formatTbNum(trialBalanceData.displayedPeriodCredit)}
                    </td>

                    {/* Closing Totals */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 border-r border-slate-800 bg-emerald-950/30">
                      ৳{formatTbNum(trialBalanceData.displayedClosingDebit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 bg-emerald-950/30">
                      ৳{formatTbNum(trialBalanceData.displayedClosingCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 15. PROFIT & LOSS ACCOUNT (AS PER IFRS) */}
      {reportType === 'pnl-ifrs' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onExportCsv={handleExportPnl}
            onPrint={() => window.print()}
          />

          {/* KPI Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Net Sales Revenue</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ৳{formatTbNum(ifrsPnlData.netRevenue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Gross sales less discounts</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Gross Profit (GP)</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                ৳{formatTbNum(ifrsPnlData.grossProfit)}
              </div>
              <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{ifrsPnlData.grossProfitMargin}% Margin</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Operating Expenses</div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                ৳{formatTbNum(ifrsPnlData.totalOpEx)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Utilities, cleaning, labor</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Net Profit for Period</div>
              <div className="text-xl sm:text-2xl font-black text-teal-800 mt-1">
                ৳{formatTbNum(ifrsPnlData.netProfit)}
              </div>
              <div className="text-[11px] font-bold text-teal-700 mt-0.5">{ifrsPnlData.netProfitMargin}% Net Margin</div>
            </div>
          </div>

          {/* IFRS P&L Statement Structure */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 w-full">
            <div className="text-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">Statement of Profit or Loss & Other Comprehensive Income</h2>
              <p className="text-xs text-slate-500 mt-0.5">As per International Financial Reporting Standards (IFRS / IAS 1)</p>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* 1. REVENUE */}
              <div>
                <div className="flex items-center justify-between font-black text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-sm">1. REVENUE FROM OPERATIONS</span>
                  <span className="font-mono text-sm">৳{formatTbNum(ifrsPnlData.netRevenue)}</span>
                </div>
                <div className="p-3 space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Gross Food & Beverage Sales</span>
                    <span className="font-mono">৳{formatTbNum(ifrsPnlData.grossSales)}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-600">
                    <span>Less: Promotional & VIP Discounts</span>
                    <span className="font-mono">-৳{formatTbNum(ifrsPnlData.totalDiscounts)}</span>
                  </div>
                </div>
              </div>

              {/* 2. COST OF SALES */}
              <div>
                <div className="flex items-center justify-between font-black text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-sm">2. COST OF GOODS SOLD (COGS)</span>
                  <span className="font-mono text-sm text-rose-700">-৳{formatTbNum(ifrsPnlData.totalCostOfSales)}</span>
                </div>
                <div className="p-3 space-y-2 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Raw Material Consumption (Dish Recipe BOM Cost)</span>
                    <span className="font-mono">-৳{formatTbNum(ifrsPnlData.cogsRawCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Manual Kitchen Preparation & Direct Usage</span>
                    <span className="font-mono">-৳{formatTbNum(ifrsPnlData.manualKitchenCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-600 font-medium">
                    <span>Direct Kitchen Spoilage & Wastage Loss</span>
                    <span className="font-mono">-৳{formatTbNum(ifrsPnlData.wastageCost)}</span>
                  </div>
                </div>
              </div>

              {/* GROSS PROFIT SUB-TOTAL */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 font-black text-emerald-950 text-sm">
                <span>GROSS PROFIT (GP)</span>
                <div className="text-right">
                  <span className="font-mono">৳{formatTbNum(ifrsPnlData.grossProfit)}</span>
                  <span className="block text-[11px] font-bold text-emerald-700">Margin: {ifrsPnlData.grossProfitMargin}%</span>
                </div>
              </div>

              {/* 3. OPERATING EXPENSES */}
              <div>
                <div className="flex items-center justify-between font-black text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-sm">3. OPERATIONAL & OVERHEAD EXPENSES</span>
                  <span className="font-mono text-sm text-rose-700">-৳{ifrsPnlData.totalOpEx.toLocaleString()}</span>
                </div>
                <div className="p-3 space-y-2 text-slate-700">
                  {Object.entries(ifrsPnlData.expenseBreakdown).length === 0 ? (
                    <div className="text-slate-400 italic">No operational expense vouchers recorded during period.</div>
                  ) : (
                    Object.entries(ifrsPnlData.expenseBreakdown).map(([head, amt], idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{head}</span>
                        <span className="font-mono text-rose-700">-৳{amt.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* OPERATING PROFIT / EBITDA */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200 font-black text-blue-950">
                <span>OPERATING PROFIT (EBITDA)</span>
                <div className="text-right font-mono">
                  <span>৳{ifrsPnlData.operatingProfitEbitda.toLocaleString()}</span>
                  <span className="block text-[10px] text-blue-700">Margin: {ifrsPnlData.operatingMargin}%</span>
                </div>
              </div>

              {/* 4. DEPRECIATION & TAX */}
              <div className="p-3 space-y-2 text-slate-700 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span>Depreciation on Kitchen Plant & Fixtures</span>
                  <span className="font-mono text-rose-700">-৳{ifrsPnlData.depreciation.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Provision for Restaurant Corporate Tax</span>
                  <span className="font-mono text-rose-700">-৳{ifrsPnlData.incomeTaxProvision.toLocaleString()}</span>
                </div>
              </div>

              {/* NET PROFIT BOTTOM LINE */}
              <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl shadow-xs font-black text-base">
                <span>NET PROFIT / (LOSS) FOR THE PERIOD</span>
                <div className="text-right">
                  <span className="font-mono text-amber-400">৳{ifrsPnlData.netProfit.toLocaleString()}</span>
                  <span className="block text-xs text-slate-400 font-normal">Net Margin: {ifrsPnlData.netProfitMargin}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 16. BALANCE SHEET (AS PER IFRS) */}
      {reportType === 'balance-sheet' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPrint={() => window.print()}
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 w-full">
            <div className="text-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">Statement of Financial Position (Balance Sheet)</h2>
              <p className="text-xs text-slate-500 mt-0.5">As per International Financial Reporting Standards (IFRS / IAS 1)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* ASSETS SECTION */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-slate-900 text-white p-3 font-black text-sm flex items-center justify-between">
                    <span>ASSETS</span>
                    <span className="text-amber-400 font-mono">৳{formatTbNum(ifrsBalanceSheetData.totalAssets)}</span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Non-Current Assets */}
                    <div>
                      <h4 className="font-black text-slate-900 uppercase text-[11px] mb-2 text-teal-800">Non-Current Assets</h4>
                      <div className="space-y-1.5 text-slate-700 pl-2">
                        {ifrsBalanceSheetData.nonCurrentAssetBreakdown.length > 0 ? (
                          ifrsBalanceSheetData.nonCurrentAssetBreakdown.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                              <span>{item.name}</span>
                              <span className="font-mono font-bold">৳{formatTbNum(item.balance)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between text-slate-400 italic text-xs">
                            <span>No non-current assets recorded</span>
                            <span className="font-mono font-bold">৳0</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Assets */}
                    <div>
                      <h4 className="font-black text-slate-900 uppercase text-[11px] mb-2 text-teal-800">Current Assets</h4>
                      <div className="space-y-1.5 text-slate-700 pl-2">
                        <div className="flex items-center justify-between">
                          <span>Closing Raw Materials Inventory Asset</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.closingInventoryVal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Accounts Receivable (Customer Dues)</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.arBalance)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Cash in Hand & Petty Cash</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.cashBalance)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Bank Accounts & Digital Wallets</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.bankBalance)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 p-3.5 border-t border-teal-200 flex items-center justify-between font-black text-teal-950 text-sm">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono">৳{formatTbNum(ifrsBalanceSheetData.totalAssets)}</span>
                </div>
              </div>

              {/* EQUITY & LIABILITIES SECTION */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-slate-900 text-white p-3 font-black text-sm flex items-center justify-between">
                    <span>EQUITY & LIABILITIES</span>
                    <span className="text-amber-400 font-mono">৳{formatTbNum(ifrsBalanceSheetData.totalEquityAndLiabilities)}</span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Equity */}
                    <div>
                      <h4 className="font-black text-slate-900 uppercase text-[11px] mb-2 text-purple-800">Owner&apos;s Equity</h4>
                      <div className="space-y-1.5 text-slate-700 pl-2">
                        <div className="flex items-center justify-between">
                          <span>Owner Initial Capital & Retained Earnings</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.capitalAndRetained)}</span>
                        </div>
                        <div className={`flex items-center justify-between font-bold ${ifrsBalanceSheetData.netCurrentProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          <span>Net Profit for Current Period</span>
                          <span className="font-mono">
                            {ifrsBalanceSheetData.netCurrentProfit >= 0 
                              ? `+৳${formatTbNum(ifrsBalanceSheetData.netCurrentProfit)}` 
                              : `-৳${formatTbNum(Math.abs(ifrsBalanceSheetData.netCurrentProfit))}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Current Liabilities */}
                    <div>
                      <h4 className="font-black text-slate-900 uppercase text-[11px] mb-2 text-rose-800">Current Liabilities</h4>
                      <div className="space-y-1.5 text-slate-700 pl-2">
                        <div className="flex items-center justify-between">
                          <span>Accounts Payable (Supplier Dues)</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.apBalance)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Customer Advance Deposits Received</span>
                          <span className="font-mono font-bold">৳{formatTbNum(ifrsBalanceSheetData.advanceLiabilities)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-3.5 border-t border-purple-200 flex items-center justify-between font-black text-purple-950 text-sm">
                  <span>TOTAL EQUITY & LIABILITIES</span>
                  <span className="font-mono">৳{formatTbNum(ifrsBalanceSheetData.totalEquityAndLiabilities)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 17. CASH FLOW STATEMENT */}
      {reportType === 'cash-flow' && (
        <>
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPrint={() => window.print()}
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 w-full">
            <div className="text-center border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">Statement of Cash Flows (IAS 7)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Direct method analysis of operational liquidity and cash equivalents</p>
            </div>

            <div className="space-y-5 text-xs font-sans">
              {/* 1. OPERATING ACTIVITIES */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex items-center justify-between font-black text-emerald-950 text-sm">
                  <span>A. CASH FLOWS FROM OPERATING ACTIVITIES</span>
                  <span className="font-mono">৳{ifrsCashFlowData.netCashFromOperating.toLocaleString()}</span>
                </div>
                <div className="p-4 space-y-2.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Cash & Digital Receipts from Customers & Sales</span>
                    <span className="font-mono font-bold text-emerald-700">+৳{ifrsCashFlowData.customerReceipts.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cash Paid to Raw Material Suppliers</span>
                    <span className="font-mono font-bold text-rose-700">-৳{ifrsCashFlowData.supplierPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cash Paid for Operating Expenses (Utilities, Cleaning, Labor)</span>
                    <span className="font-mono font-bold text-rose-700">-৳{ifrsCashFlowData.opExPayments.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 2. INVESTING ACTIVITIES */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center justify-between font-black text-blue-950 text-sm">
                  <span>B. CASH FLOWS FROM INVESTING ACTIVITIES</span>
                  <span className="font-mono">৳{ifrsCashFlowData.netCashFromInvesting.toLocaleString()}</span>
                </div>
                <div className="p-4 space-y-2.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Acquisition of Kitchen Equipment & Capex Fixtures</span>
                    <span className="font-mono font-bold">
                      {ifrsCashFlowData.equipmentAdditions > 0 
                        ? `-৳${ifrsCashFlowData.equipmentAdditions.toLocaleString()}` 
                        : '৳0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. FINANCING ACTIVITIES */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-purple-50 p-3 border-b border-purple-100 flex items-center justify-between font-black text-purple-950 text-sm">
                  <span>C. CASH FLOWS FROM FINANCING ACTIVITIES</span>
                  <span className="font-mono">৳{ifrsCashFlowData.netCashFromFinancing.toLocaleString()}</span>
                </div>
                <div className="p-4 space-y-2.5 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Owner Equity Injections / Capital Withdrawals</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {ifrsCashFlowData.netCashFromFinancing >= 0 
                        ? `+৳${ifrsCashFlowData.netCashFromFinancing.toLocaleString()}` 
                        : `-৳${Math.abs(ifrsCashFlowData.netCashFromFinancing).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* RECONCILIATION SUMMARY */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span>Net Increase / (Decrease) in Cash and Cash Equivalents (A + B + C)</span>
                  <span className="font-mono font-black text-amber-400">
                    ৳{ifrsCashFlowData.netChangeInCash.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Cash & Cash Equivalents at Beginning of Period</span>
                  <span className="font-mono text-slate-200 font-bold">
                    ৳{ifrsCashFlowData.openingCashEquivalents.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-black text-sm pt-1 border-t border-slate-800">
                  <span>Cash & Cash Equivalents at End of Period</span>
                  <span className="font-mono">
                    ৳{ifrsCashFlowData.closingCashEquivalents.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
