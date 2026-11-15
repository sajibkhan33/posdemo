import React, { useState, useMemo } from 'react';
import { useRestaurant, getAccountSystemRole } from '../../context/RestaurantContext';
import { ReportFilters, DatePreset, exportCsvHelper } from './ReportFilters';
import { 
  Users, 
  Clock, 
  BookOpen, 
  Receipt, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Calendar, 
  ShieldAlert,
  Layers,
  Building2,
  FileText
} from 'lucide-react';

interface SubReportProps {
  reportType: 'receivables' | 'ageing' | 'day-book' | 'ledger' | 'receipt-payment';
}

export const ReceivablesRegistersReports: React.FC<SubReportProps> = ({ reportType }) => {
  const { data, metrics } = useRestaurant();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ageingView, setAgeingView] = useState<'receivables' | 'payables'>('receivables');
  const [selectedLedgerHead, setSelectedLedgerHead] = useState<string>('1010'); // Default to Cash in Hand

  // Date filter helper
  const matchesDate = (itemDate: string) => {
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // --- 9. RECEIVABLES REPORT (CUSTOMER ACCOUNTS RECEIVABLE) ---
  const customerReceivablesData = useMemo(() => {
    const map: Record<string, {
      customer: string;
      totalSalesCount: number;
      totalBilled: number;
      totalPaid: number;
      totalDueIncurred: number;
      totalDueCollected: number;
      activeAdvance: number;
      netDueBalance: number;
      orders: Array<{ invoiceNo: string; date: string; total: number; cash: number; due: number }>;
    }> = {};

    data.customers.forEach(c => {
      map[c] = {
        customer: c,
        totalSalesCount: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDueIncurred: 0,
        totalDueCollected: 0,
        activeAdvance: 0,
        netDueBalance: 0,
        orders: []
      };
    });

    // POS Sales
    data.sales.forEach(s => {
      if (!matchesDate(s.date)) return;
      const custName = s.dueCustomer || (s.details.includes('•') ? s.details.split('•').pop()?.trim() : 'Walk-in Customer') || 'Walk-in Customer';
      
      if (!map[custName]) {
        map[custName] = {
          customer: custName,
          totalSalesCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalDueIncurred: 0,
          totalDueCollected: 0,
          activeAdvance: 0,
          netDueBalance: 0,
          orders: []
        };
      }

      const billed = s.total || 0;
      const paid = (s.cash || 0) + (s.card || 0) + (s.bkash || 0) + (s.nagad || 0);
      const due = s.dueGiven || 0;

      map[custName].totalSalesCount += 1;
      map[custName].totalBilled += billed;
      map[custName].totalPaid += paid;
      map[custName].totalDueIncurred += due;

      if (s.dueCollected > 0 && s.dueCollectedFrom) {
        if (map[s.dueCollectedFrom]) {
          map[s.dueCollectedFrom].totalDueCollected += s.dueCollected;
        }
      }

      map[custName].orders.push({
        invoiceNo: s.invoiceNo,
        date: s.date,
        total: billed,
        cash: paid,
        due
      });
    });

    // Customer Advances
    (data.customerAdvances || []).forEach(adv => {
      if (adv.status === 'ACTIVE' && map[adv.customer]) {
        map[adv.customer].activeAdvance += adv.amount;
      }
    });

    // Compute net due balance
    Object.values(map).forEach(c => {
      c.netDueBalance = Math.max(0, c.totalDueIncurred - c.totalDueCollected - c.activeAdvance);
    });

    const result = Object.values(map).filter(row => {
      if (!searchQuery) return true;
      return row.customer.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return result.sort((a, b) => b.netDueBalance - a.netDueBalance);
  }, [data.sales, data.customers, data.customerAdvances, startDate, endDate, searchQuery]);

  // --- 10. AGEING SCHEDULE (AR & AP) ---
  const ageingScheduleData = useMemo(() => {
    const today = new Date().getTime();

    if (ageingView === 'receivables') {
      // Customer Receivables Ageing
      const custAging: Record<string, {
        party: string;
        bracket0_30: number;
        bracket31_60: number;
        bracket61_90: number;
        bracket90_plus: number;
        totalOutstanding: number;
      }> = {};

      data.sales.forEach(s => {
        if ((s.dueGiven || 0) <= 0) return;
        const custName = s.dueCustomer || 'Walk-in Customer';
        if (!custAging[custName]) {
          custAging[custName] = {
            party: custName,
            bracket0_30: 0,
            bracket31_60: 0,
            bracket61_90: 0,
            bracket90_plus: 0,
            totalOutstanding: 0
          };
        }

        const saleTime = new Date(s.date).getTime();
        const diffDays = Math.floor((today - saleTime) / (1000 * 60 * 60 * 24));
        const due = s.dueGiven;

        if (diffDays <= 30) custAging[custName].bracket0_30 += due;
        else if (diffDays <= 60) custAging[custName].bracket31_60 += due;
        else if (diffDays <= 90) custAging[custName].bracket61_90 += due;
        else custAging[custName].bracket90_plus += due;

        custAging[custName].totalOutstanding += due;
      });

      return Object.values(custAging).filter(r => {
        if (!searchQuery) return true;
        return r.party.toLowerCase().includes(searchQuery.toLowerCase());
      }).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    } else {
      // Vendor Payables Ageing
      const vendorAging: Record<string, {
        party: string;
        bracket0_30: number;
        bracket31_60: number;
        bracket61_90: number;
        bracket90_plus: number;
        totalOutstanding: number;
      }> = {};

      data.purchases.forEach(p => {
        if (p.status === 'DRAFT') return;
        const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
        const due = Math.max(0, p.total - paid);
        if (due <= 0) return;

        if (!vendorAging[p.vendor]) {
          vendorAging[p.vendor] = {
            party: p.vendor,
            bracket0_30: 0,
            bracket31_60: 0,
            bracket61_90: 0,
            bracket90_plus: 0,
            totalOutstanding: 0
          };
        }

        const billTime = new Date(p.date).getTime();
        const diffDays = Math.floor((today - billTime) / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) vendorAging[p.vendor].bracket0_30 += due;
        else if (diffDays <= 60) vendorAging[p.vendor].bracket31_60 += due;
        else if (diffDays <= 90) vendorAging[p.vendor].bracket61_90 += due;
        else vendorAging[p.vendor].bracket90_plus += due;

        vendorAging[p.vendor].totalOutstanding += due;
      });

      return Object.values(vendorAging).filter(r => {
        if (!searchQuery) return true;
        return r.party.toLowerCase().includes(searchQuery.toLowerCase());
      }).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    }
  }, [data.sales, data.purchases, ageingView, searchQuery]);

  // --- 11. DAY BOOK (DAILY CHRONOLOGICAL TRANSACTION REGISTER) ---
  const dayBookData = useMemo(() => {
    const entries: Array<{
      date: string;
      type: 'POS Sales' | 'Due Collection' | 'Purchase Bill' | 'Supplier Payment' | 'Expense Voucher' | 'Customer Advance' | 'Journal Voucher';
      voucherNo: string;
      party: string;
      details: string;
      inflow: number;
      outflow: number;
    }> = [];

    // 1. POS Sales Inflows
    data.sales.forEach(s => {
      if (!matchesDate(s.date)) return;
      const directCash = (s.cash || 0) + (s.card || 0) + (s.bkash || 0) + (s.nagad || 0);
      if (directCash > 0) {
        entries.push({
          date: s.date,
          type: 'POS Sales',
          voucherNo: s.invoiceNo,
          party: s.dueCustomer || 'Walk-in Dining Customers',
          details: `POS Invoice settled (Cash: ৳${s.cash || 0}, Digital: ৳${(s.card || 0) + (s.bkash || 0) + (s.nagad || 0)})`,
          inflow: directCash,
          outflow: 0
        });
      }

      if (s.dueCollected > 0) {
        entries.push({
          date: s.date,
          type: 'Due Collection',
          voucherNo: `COL-${s.id}`,
          party: s.dueCollectedFrom || 'Customer Settlement',
          details: `Arrears Customer Due Collection Payment`,
          inflow: s.dueCollected,
          outflow: 0
        });
      }
    });

    // 2. Customer Advances
    (data.customerAdvances || []).forEach(adv => {
      if (!matchesDate(adv.date)) return;
      entries.push({
        date: adv.date,
        type: 'Customer Advance',
        voucherNo: `ADV-${adv.id}`,
        party: adv.customer,
        details: `Advance Booking Deposit (${adv.method}) - ${adv.note || ''}`,
        inflow: adv.amount,
        outflow: 0
      });
    });

    // 3. Purchase Cash Outflows
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (!matchesDate(p.date)) return;

      const linkedPayments = (data.payments || []).filter(pay => 
        pay.billNo && p.billNo && (
          pay.billNo.trim().toLowerCase() === p.billNo.trim().toLowerCase() ||
          pay.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === p.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        )
      );
      if (linkedPayments.length > 0) return; // Handled by Supplier Payment below to prevent double-counting!

      const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
      if (paid > 0 && p.paymentType === 'CASH') {
        entries.push({
          date: p.date,
          type: 'Purchase Bill',
          voucherNo: p.billNo,
          party: p.vendor,
          details: `Direct Cash Purchase Payment for Raw Materials`,
          inflow: 0,
          outflow: paid
        });
      }
    });

    // 4. Supplier Payments
    data.payments.forEach(pay => {
      if (!matchesDate(pay.date)) return;
      entries.push({
        date: pay.date,
        type: 'Supplier Payment',
        voucherNo: pay.voucherNo || `PAY-${pay.id}`,
        party: pay.supplier || pay.vendor,
        details: `Vendor Arrears Bill Settlement (${pay.method}) - Payment for Bill ${pay.billNo || ''}`,
        inflow: 0,
        outflow: pay.amount
      });
    });

    // 5. Operating Expenses
    data.expenses.forEach(e => {
      if (!matchesDate(e.date)) return;
      entries.push({
        date: e.date,
        type: 'Expense Voucher',
        voucherNo: `EXP-${e.id}`,
        party: e.head,
        details: `Operational Expense Voucher - ${e.note || e.head}`,
        inflow: 0,
        outflow: e.amount
      });
    });

    // 6. Double-Entry Journal Vouchers
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;

      const isDrCashOrBank = j.debitAccountId === '1010' || j.debitAccountId === '1020' || j.debitAccountId === '1030' || j.debitAccountId === '1040' ||
                             (j.debitAccountName && (j.debitAccountName.includes('1010') || j.debitAccountName.includes('1030') || j.debitAccountName.includes('1040')));
      const isCrCashOrBank = j.creditAccountId === '1010' || j.creditAccountId === '1020' || j.creditAccountId === '1030' || j.creditAccountId === '1040' ||
                             (j.creditAccountName && (j.creditAccountName.includes('1010') || j.creditAccountName.includes('1030') || j.creditAccountName.includes('1040')));

      let inflow = 0;
      let outflow = 0;
      if (isDrCashOrBank && !isCrCashOrBank) {
        inflow = j.amount;
      } else if (isCrCashOrBank && !isDrCashOrBank) {
        outflow = j.amount;
      }

      entries.push({
        date: j.date,
        type: 'Journal Voucher',
        voucherNo: j.voucherNo,
        party: `Dr: ${j.debitAccountName} / Cr: ${j.creditAccountName}`,
        details: `Journal Voucher Entry: Dr [${j.debitAccountName}] / Cr [${j.creditAccountName}] - ${j.narration}${j.referenceNo ? ` (Ref: ${j.referenceNo})` : ''}`,
        inflow,
        outflow
      });
    });

    // Sort chronologically (most recent first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return entries.filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.voucherNo.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    });
  }, [data.sales, data.purchases, data.payments, data.expenses, data.customerAdvances, data.journalEntries, startDate, endDate, searchQuery]);

  // --- 12. LEDGER REPORT (HEAD-WISE GENERAL LEDGER) ---
  const generalLedgerData = useMemo(() => {
    const coa = data.chartOfAccounts || [];
    const activeHead = coa.find(h => h.id === selectedLedgerHead) || coa[0];
    if (!activeHead) return { head: null, entries: [], opening: 0, totalDebit: 0, totalCredit: 0, closing: 0 };

    const openingBalance = activeHead.balance || 0;
    const rawTxList: Array<{
      date: string;
      docNo: string;
      particulars: string;
      debit: number;
      credit: number;
    }> = [];

    const activeRole = activeHead.systemRole || getAccountSystemRole(activeHead);
    const isDebitNormal = activeHead.type === 'ASSET' || activeHead.type === 'EXPENSE' || activeRole === 'OWNER_DRAWINGS';

    // 1. Cash / Petty Cash transactions
    if (activeRole === 'CASH' || activeRole === 'PETTY_CASH' || activeHead.id === '1010' || activeHead.id === '1020') {
      data.sales.forEach(s => {
        if (!matchesDate(s.date)) return;
        if ((s.cash || 0) > 0) {
          rawTxList.push({
            date: s.date,
            docNo: s.invoiceNo,
            particulars: `POS Cash Sales Revenue`,
            debit: s.cash,
            credit: 0
          });
        }
        if ((s.dueCollected || 0) > 0) {
          rawTxList.push({
            date: s.date,
            docNo: `COL-${s.id}`,
            particulars: `Customer Due Collection (${s.dueCollectedFrom || ''})`,
            debit: s.dueCollected,
            credit: 0
          });
        }
      });

      (data.customerAdvances || []).forEach(adv => {
        if (!matchesDate(adv.date)) return;
        if (adv.method === 'CASH' && (adv.amount || 0) > 0) {
          rawTxList.push({
            date: adv.date,
            docNo: `ADV-${adv.id}`,
            particulars: `Customer Advance Deposit (${adv.customer})`,
            debit: adv.amount,
            credit: 0
          });
        }
      });

      data.expenses.forEach(e => {
        if (!matchesDate(e.date)) return;
        const eMethod = (e.paymentMethod || '').toLowerCase();
        const isPetty = eMethod.includes('petty');
        if ((activeRole === 'PETTY_CASH' && isPetty) || (activeRole !== 'PETTY_CASH' && (eMethod === 'cash' || !eMethod))) {
          rawTxList.push({
            date: e.date,
            docNo: `EXP-${e.id}`,
            particulars: `Expense: ${e.head} (${e.note || ''})`,
            debit: 0,
            credit: e.amount
          });
        }
      });

      data.purchases.forEach(p => {
        if (p.status === 'DRAFT' || !matchesDate(p.date)) return;
        const hasLinkedPayment = (data.payments || []).some(pay => 
          pay.billNo && p.billNo && (
            pay.billNo.trim().toLowerCase() === p.billNo.trim().toLowerCase() ||
            pay.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === p.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          )
        );
        if (hasLinkedPayment) return; // Handled by data.payments below!
        const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
        if (p.paymentType === 'CASH' && paid > 0 && activeRole !== 'PETTY_CASH') {
          rawTxList.push({
            date: p.date,
            docNo: p.billNo,
            particulars: `Cash Purchase for ${p.vendor}`,
            debit: 0,
            credit: paid
          });
        }
      });

      data.payments.forEach(p => {
        if (!matchesDate(p.date)) return;
        const pMethod = (p.method || '').toUpperCase();
        if (pMethod === 'CASH' && (p.amount || 0) > 0 && activeRole !== 'PETTY_CASH') {
          rawTxList.push({
            date: p.date,
            docNo: p.voucherNo || `PAY-${p.id}`,
            particulars: `Supplier Payment to ${p.supplier || p.vendor}`,
            debit: 0,
            credit: p.amount
          });
        }
      });
    }

    // 2. Bank & Digital / MFS Accounts
    else if (activeRole === 'BANK' || activeRole === 'MOBILE_BANKING' || activeHead.id === '1030' || activeHead.id === '1040') {
      data.sales.forEach(s => {
        if (!matchesDate(s.date)) return;
        if (activeRole === 'BANK' && (s.card || 0) > 0) {
          rawTxList.push({
            date: s.date,
            docNo: s.invoiceNo,
            particulars: `POS Card / Digital Sales Settlement`,
            debit: s.card,
            credit: 0
          });
        }
        if (activeRole === 'MOBILE_BANKING') {
          const mfsAmt = (s.bkash || 0) + (s.nagad || 0);
          if (mfsAmt > 0) {
            rawTxList.push({
              date: s.date,
              docNo: s.invoiceNo,
              particulars: `POS Mobile Banking (bKash/Nagad) Inflow`,
              debit: mfsAmt,
              credit: 0
            });
          }
        }
      });

      (data.customerAdvances || []).forEach(adv => {
        if (!matchesDate(adv.date)) return;
        if (adv.method !== 'CASH' && (adv.amount || 0) > 0) {
          rawTxList.push({
            date: adv.date,
            docNo: `ADV-${adv.id}`,
            particulars: `Advance Booking Deposit (${adv.customer}) - ${adv.method}`,
            debit: adv.amount,
            credit: 0
          });
        }
      });

      data.expenses.forEach(e => {
        if (!matchesDate(e.date)) return;
        const eMethod = (e.paymentMethod || '').toLowerCase();
        if (eMethod !== 'cash' && !eMethod.includes('petty')) {
          rawTxList.push({
            date: e.date,
            docNo: `EXP-${e.id}`,
            particulars: `Operating Expense: ${e.head} (${e.paymentMethod})`,
            debit: 0,
            credit: e.amount
          });
        }
      });

      data.payments.forEach(p => {
        if (!matchesDate(p.date)) return;
        if (p.method !== 'CASH' && (p.amount || 0) > 0) {
          rawTxList.push({
            date: p.date,
            docNo: `PAY-${p.id}`,
            particulars: `Bank/MFS Supplier Settlement to ${p.vendor}`,
            debit: 0,
            credit: p.amount
          });
        }
      });
    }

    // 3. Accounts Receivable (Customer Dues)
    else if (activeRole === 'ACCOUNTS_RECEIVABLE' || activeHead.id === '1050') {
      data.sales.forEach(s => {
        if (!matchesDate(s.date)) return;
        if ((s.dueGiven || 0) > 0) {
          rawTxList.push({
            date: s.date,
            docNo: s.invoiceNo,
            particulars: `Credit Dining Sale to ${s.dueCustomer || 'Customer'}`,
            debit: s.dueGiven,
            credit: 0
          });
        }
        if ((s.dueCollected || 0) > 0) {
          rawTxList.push({
            date: s.date,
            docNo: `COL-${s.id}`,
            particulars: `Due Collection from ${s.dueCollectedFrom || 'Customer'}`,
            debit: 0,
            credit: s.dueCollected
          });
        }
      });
    }

    // 4. Accounts Payable (Vendor Dues)
    else if (activeRole === 'ACCOUNTS_PAYABLE' || activeHead.id === '2010') {
      data.purchases.forEach(p => {
        if (p.status === 'DRAFT' || !matchesDate(p.date)) return;
        const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
        const due = Math.max(0, p.total - paid);
        if (due > 0) {
          rawTxList.push({
            date: p.date,
            docNo: p.billNo,
            particulars: `Credit Purchase Inward from ${p.vendor}`,
            debit: 0,
            credit: due
          });
        }
      });

      data.payments.forEach(pay => {
        if (!matchesDate(pay.date)) return;
        rawTxList.push({
          date: pay.date,
          docNo: `PAY-${pay.id}`,
          particulars: `Settlement Paid to ${pay.vendor}`,
          debit: pay.amount,
          credit: 0
        });
      });
    }

    // 5. Revenue Accounts
    else if (activeHead.type === 'REVENUE') {
      data.sales.forEach(s => {
        if (!matchesDate(s.date)) return;
        rawTxList.push({
          date: s.date,
          docNo: s.invoiceNo,
          particulars: `Food & Beverage Dine-in Sales (${s.details || 'Sales'})`,
          debit: 0,
          credit: s.total
        });
      });
    }

    // 6. Expense Accounts
    else if (activeHead.type === 'EXPENSE') {
      data.expenses.forEach(e => {
        if (!matchesDate(e.date)) return;
        const matched = (e.accountId === activeHead.id || e.accountCode === activeHead.code || e.head === activeHead.name);
        if (matched) {
          rawTxList.push({
            date: e.date,
            docNo: `EXP-${e.id}`,
            particulars: `Operating Expense: ${e.head} - ${e.note || ''}`,
            debit: e.amount,
            credit: 0
          });
        }
      });
    }

    // 7. General Assets (e.g. Staff Advances, Fixed Assets) - check disbursements allocated to asset head
    else if (activeHead.type === 'ASSET') {
      data.expenses.forEach(e => {
        if (!matchesDate(e.date)) return;
        const matched = (e.accountId === activeHead.id || e.accountCode === activeHead.code || e.head === activeHead.name);
        if (matched) {
          rawTxList.push({
            date: e.date,
            docNo: `EXP-${e.id}`,
            particulars: `Disbursement / Advance: ${e.head} - ${e.note || ''}`,
            debit: e.amount,
            credit: 0
          });
        }
      });
    }

    // 8. DOUBLE-ENTRY JOURNAL VOUCHERS (Integrated across ALL account heads!)
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;
      const isDr = j.debitAccountId === activeHead.id || j.debitAccountId === activeHead.code;
      const isCr = j.creditAccountId === activeHead.id || j.creditAccountId === activeHead.code;
      if (isDr) {
        rawTxList.push({
          date: j.date,
          docNo: j.voucherNo,
          particulars: `Journal Voucher (JV): ${j.narration} [Cr: ${j.creditAccountName}]`,
          debit: j.amount,
          credit: 0
        });
      }
      if (isCr) {
        rawTxList.push({
          date: j.date,
          docNo: j.voucherNo,
          particulars: `Journal Voucher (JV): ${j.narration} [Dr: ${j.debitAccountName}]`,
          debit: 0,
          credit: j.amount
        });
      }
    });

    // Calculate chronological running balance accurately
    let running = openingBalance;
    const processedEntries = rawTxList
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(tx => {
        if (isDebitNormal) {
          running += (tx.debit - tx.credit);
        } else {
          running += (tx.credit - tx.debit);
        }
        return { ...tx, balance: running };
      });

    const totalDebit = processedEntries.reduce((s, r) => s + r.debit, 0);
    const totalCredit = processedEntries.reduce((s, r) => s + r.credit, 0);

    return {
      head: activeHead,
      entries: [...processedEntries].reverse(),
      opening: openingBalance,
      totalDebit,
      totalCredit,
      closing: running
    };
  }, [data.chartOfAccounts, selectedLedgerHead, data.sales, data.purchases, data.payments, data.expenses, data.journalEntries, data.customerAdvances, startDate, endDate]);

  // --- 13. RECEIPT & PAYMENT REPORT (CASH & BANK BOOK) ---
  const receiptPaymentData = useMemo(() => {
    // Opening Cash
    const coaListReport = data.chartOfAccounts || [];
    const getReportBalance = (roleOrCode: string) => {
      const byRole = coaListReport.find(a => (a.systemRole || getAccountSystemRole(a)) === roleOrCode);
      if (byRole) return Number(byRole.balance) || 0;
      const acc = coaListReport.find(a => a.code === roleOrCode || a.id === roleOrCode);
      return Number(acc?.balance) || 0;
    };
    const openingCash = getReportBalance('CASH') || getReportBalance('1010');
    const openingBank = (getReportBalance('BANK') || getReportBalance('1030')) + (getReportBalance('MOBILE_BANKING') || getReportBalance('1040'));

    let cashReceipts = 0;
    let bankReceipts = 0;
    let cashPayments = 0;
    let bankPayments = 0;

    const receiptRows: Array<{ particulars: string; cash: number; bank: number; total: number }> = [];
    const paymentRows: Array<{ particulars: string; cash: number; bank: number; total: number }> = [];

    // Sales Receipts
    let salesCash = 0;
    let salesBank = 0;
    let dueColCash = 0;

    data.sales.forEach(s => {
      if (!matchesDate(s.date)) return;
      salesCash += (s.cash || 0);
      salesBank += ((s.card || 0) + (s.bkash || 0) + (s.nagad || 0));
      dueColCash += (s.dueCollected || 0);
    });

    if (salesCash > 0 || salesBank > 0) {
      receiptRows.push({
        particulars: 'POS Restaurant Sales Collections',
        cash: salesCash,
        bank: salesBank,
        total: salesCash + salesBank
      });
    }

    if (dueColCash > 0) {
      receiptRows.push({
        particulars: 'Customer Arrears Due Collections',
        cash: dueColCash,
        bank: 0,
        total: dueColCash
      });
    }

    // Customer Advances
    let advCash = 0;
    let advBank = 0;
    (data.customerAdvances || []).forEach(adv => {
      if (!matchesDate(adv.date)) return;
      if (adv.method === 'CASH') advCash += adv.amount;
      else advBank += adv.amount;
    });

    if (advCash > 0 || advBank > 0) {
      receiptRows.push({
        particulars: 'Customer Advance Booking Deposits',
        cash: advCash,
        bank: advBank,
        total: advCash + advBank
      });
    }

    // Owner Capital Injections & Journal Voucher Cash Inflows
    let capitalCash = 0;
    let capitalBank = 0;
    (data.journalEntries || []).forEach(j => {
      if (!matchesDate(j.date)) return;
      const amt = Number(j.amount) || 0;
      if (amt <= 0) return;
      const isDebitCash = j.debitAccountId === '1010' || (j.debitAccountName && j.debitAccountName.toLowerCase().includes('cash'));
      const isDebitBank = j.debitAccountId === '1030' || (j.debitAccountName && j.debitAccountName.toLowerCase().includes('bank'));
      if (isDebitCash) capitalCash += amt;
      else if (isDebitBank) capitalBank += amt;
    });

    if (capitalCash > 0 || capitalBank > 0) {
      receiptRows.push({
        particulars: 'Owner Capital Investment / Equity Injection',
        cash: capitalCash,
        bank: capitalBank,
        total: capitalCash + capitalBank
      });
    }

    // Direct Cash Purchases
    let purCash = 0;
    let purBank = 0;
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (!matchesDate(p.date)) return;
      const hasLinkedPayment = (data.payments || []).some(pay => 
        pay.billNo && p.billNo && (
          pay.billNo.trim().toLowerCase() === p.billNo.trim().toLowerCase() ||
          pay.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === p.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        )
      );
      if (hasLinkedPayment) return; // Handled by supplier payments below!
      const paid = p.paid ?? (p.paymentType === 'CASH' ? p.total : 0);
      if (p.paymentType === 'CASH') purCash += paid;
    });

    if (purCash > 0) {
      paymentRows.push({
        particulars: 'Cash Purchases of Raw Materials',
        cash: purCash,
        bank: 0,
        total: purCash
      });
    }

    // Supplier Payments
    let suppCash = 0;
    let suppBank = 0;
    data.payments.forEach(pay => {
      if (!matchesDate(pay.date)) return;
      const m = (pay.method || '').toUpperCase();
      if (m === 'CASH') suppCash += pay.amount;
      else suppBank += pay.amount;
    });

    if (suppCash > 0 || suppBank > 0) {
      paymentRows.push({
        particulars: 'Vendor Payments & Bill Settlements',
        cash: suppCash,
        bank: suppBank,
        total: suppCash + suppBank
      });
    }

    // Expenses
    let expCash = 0;
    data.expenses.forEach(e => {
      if (!matchesDate(e.date)) return;
      expCash += e.amount;
    });

    if (expCash > 0) {
      paymentRows.push({
        particulars: 'Operating Expenses (Electricity, Cleaning, Staff)',
        cash: expCash,
        bank: 0,
        total: expCash
      });
    }

    const totalReceiptsCash = receiptRows.reduce((s, r) => s + r.cash, 0);
    const totalReceiptsBank = receiptRows.reduce((s, r) => s + r.bank, 0);
    const totalPaymentsCash = paymentRows.reduce((s, r) => s + r.cash, 0);
    const totalPaymentsBank = paymentRows.reduce((s, r) => s + r.bank, 0);

    const closingCash = openingCash + totalReceiptsCash - totalPaymentsCash;
    const closingBank = openingBank + totalReceiptsBank - totalPaymentsBank;

    return {
      openingCash,
      openingBank,
      receiptRows,
      paymentRows,
      totalReceiptsCash,
      totalReceiptsBank,
      totalPaymentsCash,
      totalPaymentsBank,
      closingCash,
      closingBank
    };
  }, [data.sales, data.customerAdvances, data.purchases, data.payments, data.expenses, data.journalEntries, data.chartOfAccounts, startDate, endDate]);

  // CSV Exporters
  const handleExportReceivables = () => {
    const headers = ['Customer Name', 'Orders Count', 'Total Billed (৳)', 'Total Paid (৳)', 'Due Incurred (৳)', 'Advance (৳)', 'Net Due Balance (৳)'];
    const rows = customerReceivablesData.map(r => [
      r.customer,
      r.totalSalesCount,
      r.totalBilled,
      r.totalPaid,
      r.totalDueIncurred,
      r.activeAdvance,
      r.netDueBalance
    ]);
    exportCsvHelper('customer_receivables_report', headers, rows);
  };

  const handleExportAgeing = () => {
    const headers = ['Party Name', '0 - 30 Days (৳)', '31 - 60 Days (৳)', '61 - 90 Days (৳)', '90+ Days (৳)', 'Total Outstanding (৳)'];
    const rows = ageingScheduleData.map(r => [
      r.party,
      r.bracket0_30,
      r.bracket31_60,
      r.bracket61_90,
      r.bracket90_plus,
      r.totalOutstanding
    ]);
    exportCsvHelper(`${ageingView}_ageing_schedule`, headers, rows);
  };

  const handleExportDayBook = () => {
    const headers = ['Date', 'Type', 'Voucher No', 'Party Involved', 'Details / Narration', 'Inflow (৳)', 'Outflow (৳)'];
    const rows = dayBookData.map(r => [
      r.date,
      r.type,
      r.voucherNo,
      r.party,
      r.details,
      r.inflow,
      r.outflow
    ]);
    exportCsvHelper('restaurant_day_book', headers, rows);
  };

  const handleExportLedger = () => {
    const headers = ['Date', 'Doc No', 'Particulars', 'Debit (৳)', 'Credit (৳)', 'Balance (৳)'];
    const rows = generalLedgerData.entries.map(r => [
      r.date,
      r.docNo,
      r.particulars,
      r.debit,
      r.credit,
      r.balance
    ]);
    exportCsvHelper(`general_ledger_${generalLedgerData.head?.code || 'report'}`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* 9. RECEIVABLE REPORT */}
      {reportType === 'receivables' && (
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
            searchPlaceholder="Search customer account..."
            totalRecords={customerReceivablesData.length}
            onExportCsv={handleExportReceivables}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
            }}
          />

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Total Customer Dues Incurred</div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                ৳{customerReceivablesData.reduce((s, r) => s + r.totalDueIncurred, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Credit meals extended to guests</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Total Due Collected</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                ৳{customerReceivablesData.reduce((s, r) => s + r.totalDueCollected, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Recovered arrears revenue</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Active Customer Advances</div>
              <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
                ৳{customerReceivablesData.reduce((s, r) => s + r.activeAdvance, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Advance banquet deposits</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500">Net Receivable Due</div>
              <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                ৳{customerReceivablesData.reduce((s, r) => s + r.netDueBalance, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Unsettled outstanding balance</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>Customer Accounts Receivable Statement (Customer Ledger)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Customer-wise credit sales history, collections, and net outstanding balance</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4 text-center">Orders Count</th>
                    <th className="py-3 px-4 text-right">Total Billed (৳)</th>
                    <th className="py-3 px-4 text-right">Paid at POS (৳)</th>
                    <th className="py-3 px-4 text-right">Due Incurred (৳)</th>
                    <th className="py-3 px-4 text-right">Advance (৳)</th>
                    <th className="py-3 px-4 text-right">Net Due Balance (৳)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerReceivablesData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        No customer accounts found.
                      </td>
                    </tr>
                  ) : (
                    customerReceivablesData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-extrabold text-slate-900">{row.customer}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{row.totalSalesCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">৳{row.totalBilled.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">৳{row.totalPaid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                          {row.totalDueIncurred > 0 ? `৳${row.totalDueIncurred.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                          {row.activeAdvance > 0 ? `৳${row.activeAdvance.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                          {row.netDueBalance > 0 ? `৳${row.netDueBalance.toLocaleString()}` : '৳0'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.netDueBalance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.netDueBalance === 0 ? 'CLEARED' : 'DUE ARREARS'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {customerReceivablesData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={2} className="py-3 px-4">Total Accounts Receivable</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        ৳{customerReceivablesData.reduce((s, r) => s + r.totalBilled, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ৳{customerReceivablesData.reduce((s, r) => s + r.totalPaid, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        ৳{customerReceivablesData.reduce((s, r) => s + r.totalDueIncurred, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700">
                        ৳{customerReceivablesData.reduce((s, r) => s + r.activeAdvance, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                        ৳{customerReceivablesData.reduce((s, r) => s + r.netDueBalance, 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 10. AGEING SCHEDULE */}
      {reportType === 'ageing' && (
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
            searchPlaceholder="Search party in ageing schedule..."
            totalRecords={ageingScheduleData.length}
            onExportCsv={handleExportAgeing}
            onPrint={() => window.print()}
          >
            {/* Toggle AR / AP */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full">
              <button
                onClick={() => setAgeingView('receivables')}
                className={`flex-1 py-1 px-2 rounded-lg transition ${ageingView === 'receivables' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500'}`}
              >
                AR (Receivables)
              </button>
              <button
                onClick={() => setAgeingView('payables')}
                className={`flex-1 py-1 px-2 rounded-lg transition ${ageingView === 'payables' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500'}`}
              >
                AP (Payables)
              </button>
            </div>
          </ReportFilters>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>{ageingView === 'receivables' ? 'Accounts Receivable (Customer Dues)' : 'Accounts Payable (Supplier Dues)'} Ageing Schedule</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Overdue exposure classified into 30-day time brackets</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">{ageingView === 'receivables' ? 'Customer Name' : 'Supplier Name'}</th>
                    <th className="py-3 px-4 text-right">0 - 30 Days (৳)</th>
                    <th className="py-3 px-4 text-right">31 - 60 Days (৳)</th>
                    <th className="py-3 px-4 text-right">61 - 90 Days (৳)</th>
                    <th className="py-3 px-4 text-right">90+ Days (৳)</th>
                    <th className="py-3 px-4 text-right bg-slate-100/50">Total Outstanding (৳)</th>
                    <th className="py-3 px-4 text-center">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ageingScheduleData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No outstanding dues recorded in this category.
                      </td>
                    </tr>
                  ) : (
                    ageingScheduleData.map((row, idx) => {
                      const isHighRisk = row.bracket90_plus > 0 || row.bracket61_90 > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-extrabold text-slate-900">{row.party}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {row.bracket0_30 > 0 ? `৳${row.bracket0_30.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">
                            {row.bracket31_60 > 0 ? `৳${row.bracket31_60.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-orange-700">
                            {row.bracket61_90 > 0 ? `৳${row.bracket61_90.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                            {row.bracket90_plus > 0 ? `৳${row.bracket90_plus.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-100/50 text-sm">
                            ৳{row.totalOutstanding.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isHighRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isHighRisk ? 'OVERDUE RISK' : 'CURRENT NORMAL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {ageingScheduleData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-4">Total Ageing Summary</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ৳{ageingScheduleData.reduce((s, r) => s + r.bracket0_30, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        ৳{ageingScheduleData.reduce((s, r) => s + r.bracket31_60, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-orange-700">
                        ৳{ageingScheduleData.reduce((s, r) => s + r.bracket61_90, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">
                        ৳{ageingScheduleData.reduce((s, r) => s + r.bracket90_plus, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                        ৳{ageingScheduleData.reduce((s, r) => s + r.totalOutstanding, 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 11. DAY BOOK */}
      {reportType === 'day-book' && (
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
            searchPlaceholder="Search voucher no, party, transaction type..."
            totalRecords={dayBookData.length}
            onExportCsv={handleExportDayBook}
            onPrint={() => window.print()}
          />

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>Total Day Inflow (Receipts)</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                +৳{dayBookData.reduce((s, r) => s + r.inflow, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Sales & Due Collections received</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>Total Day Outflow (Disbursements)</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                -৳{dayBookData.reduce((s, r) => s + r.outflow, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Purchases, Expenses & Supplier Payments</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>Net Daily Cash Surplus / Deficit</span>
                <DollarSign className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-teal-800 mt-1">
                ৳{(dayBookData.reduce((s, r) => s + r.inflow, 0) - dayBookData.reduce((s, r) => s + r.outflow, 0)).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Net liquidity generated during period</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  <span>Restaurant Day Book (Chronological Transaction Journal)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Audit trail of every financial and operational event in chronological sequence</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Voucher / Doc #</th>
                    <th className="py-3 px-4">Account / Party</th>
                    <th className="py-3 px-4">Description & Narration</th>
                    <th className="py-3 px-4 text-right">Inflow (৳)</th>
                    <th className="py-3 px-4 text-right">Outflow (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayBookData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No transactional entries found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    dayBookData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-600">{row.date}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.type === 'POS Sales' ? 'bg-emerald-100 text-emerald-800' :
                            row.type === 'Due Collection' ? 'bg-teal-100 text-teal-800' :
                            row.type === 'Purchase Bill' ? 'bg-blue-100 text-blue-800' :
                            row.type === 'Supplier Payment' ? 'bg-amber-100 text-amber-800' :
                            row.type === 'Expense Voucher' ? 'bg-rose-100 text-rose-800' :
                            row.type === 'Journal Voucher' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.voucherNo}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{row.party}</td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] max-w-sm truncate" title={row.details}>
                          {row.details}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {row.inflow > 0 ? `+৳${row.inflow.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          {row.outflow > 0 ? `-৳${row.outflow.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {dayBookData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={5} className="py-3 px-4">Total Day Book Flow</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                        +৳{dayBookData.reduce((s, r) => s + r.inflow, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 text-sm">
                        -৳{dayBookData.reduce((s, r) => s + r.outflow, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 12. GENERAL LEDGER REPORT */}
      {reportType === 'ledger' && (
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
            searchPlaceholder="Search ledger particulars..."
            totalRecords={generalLedgerData.entries.length}
            onExportCsv={handleExportLedger}
            onPrint={() => window.print()}
          >
            {/* Head Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Head:</span>
              <select
                value={selectedLedgerHead}
                onChange={(e) => setSelectedLedgerHead(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {(data.chartOfAccounts || []).map(h => (
                  <option key={h.id} value={h.id}>
                    [{h.code}] {h.name} ({h.type})
                  </option>
                ))}
              </select>
            </div>
          </ReportFilters>

          {/* Ledger Banner */}
          {generalLedgerData.head && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-amber-400 text-xs font-mono font-bold">A/C Code: {generalLedgerData.head.code} &bull; {generalLedgerData.head.type}</span>
                <h3 className="text-lg font-black mt-0.5">{generalLedgerData.head.name}</h3>
                <p className="text-xs text-slate-400">{generalLedgerData.head.category}</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="bg-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Opening Balance</span>
                  <span className="font-mono font-black text-slate-200">৳{generalLedgerData.opening.toLocaleString()}</span>
                </div>
                <div className="bg-teal-900/60 p-3 rounded-xl border border-teal-500/30">
                  <span className="text-teal-300 block text-[10px] uppercase font-black">Closing Balance</span>
                  <span className="font-mono font-black text-amber-400 text-sm">৳{generalLedgerData.closing.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Doc / Voucher #</th>
                    <th className="py-3 px-4">Particulars & Description</th>
                    <th className="py-3 px-4 text-right">Debit (৳)</th>
                    <th className="py-3 px-4 text-right">Credit (৳)</th>
                    <th className="py-3 px-4 text-right bg-slate-100/50">Running Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generalLedgerData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        No transactions recorded in this account head during the active period.
                      </td>
                    </tr>
                  ) : (
                    generalLedgerData.entries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-600">{row.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.docNo}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{row.particulars}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {row.debit > 0 ? `৳${row.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          {row.credit > 0 ? `৳${row.credit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-100/50">
                          ৳{row.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {generalLedgerData.entries.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={3} className="py-3 px-4">Total Period Debits & Credits</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        ৳{generalLedgerData.totalDebit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">
                        ৳{generalLedgerData.totalCredit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 text-sm">
                        ৳{generalLedgerData.closing.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 13. RECEIPT & PAYMENT REPORT */}
      {reportType === 'receipt-payment' && (
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4 text-center">
              <h2 className="text-lg font-black text-slate-900">Receipts and Payments Statement</h2>
              <p className="text-xs text-slate-500 mt-1">Summary of all cash and bank inflows and disbursements for the financial period</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: RECEIPTS (INFLOWS) */}
              <div className="border border-emerald-200 rounded-2xl overflow-hidden">
                <div className="bg-emerald-50 p-3 border-b border-emerald-200 flex items-center justify-between font-black text-emerald-900 text-xs">
                  <span>RECEIPTS (CASH & BANK INFLOWS)</span>
                  <span>TOTAL (৳)</span>
                </div>
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-700">
                    <span>Opening Balance (Cash in Hand)</span>
                    <span className="font-mono">৳{receiptPaymentData.openingCash.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-700">
                    <span>Opening Balance (Bank & Mobile Wallets)</span>
                    <span className="font-mono">৳{receiptPaymentData.openingBank.toLocaleString()}</span>
                  </div>

                  {receiptPaymentData.receiptRows.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-800">
                      <div>
                        <span className="font-bold">{r.particulars}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Cash: ৳{r.cash.toLocaleString()} &bull; Bank: ৳{r.bank.toLocaleString()}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">৳{r.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-100/60 p-3 border-t border-emerald-200 flex items-center justify-between font-black text-emerald-950 text-xs">
                  <span>TOTAL RECEIPTS (WITH OPENING)</span>
                  <span className="font-mono text-sm">
                    ৳{(receiptPaymentData.openingCash + receiptPaymentData.openingBank + receiptPaymentData.totalReceiptsCash + receiptPaymentData.totalReceiptsBank).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* RIGHT: PAYMENTS (OUTFLOWS) */}
              <div className="border border-rose-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-rose-50 p-3 border-b border-rose-200 flex items-center justify-between font-black text-rose-900 text-xs">
                    <span>PAYMENTS (DISBURSEMENTS)</span>
                    <span>TOTAL (৳)</span>
                  </div>
                  <div className="p-4 space-y-3 text-xs">
                    {receiptPaymentData.paymentRows.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-800">
                        <div>
                          <span className="font-bold">{p.particulars}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Cash: ৳{p.cash.toLocaleString()} &bull; Bank: ৳{p.bank.toLocaleString()}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-700">৳{p.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>Closing Balance (Cash in Hand)</span>
                      <span className="font-mono text-slate-900">৳{receiptPaymentData.closingCash.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>Closing Balance (Bank & Mobile Accounts)</span>
                      <span className="font-mono text-slate-900">৳{receiptPaymentData.closingBank.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-rose-100/60 p-3 border-t border-rose-200 flex items-center justify-between font-black text-rose-950 text-xs">
                    <span>TOTAL PAYMENTS & CLOSING CASH</span>
                    <span className="font-mono text-sm">
                      ৳{(receiptPaymentData.totalPaymentsCash + receiptPaymentData.totalPaymentsBank + receiptPaymentData.closingCash + receiptPaymentData.closingBank).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
