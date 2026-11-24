import React, { useState } from 'react';
import { useRestaurant, formatRoleTitle, getOrderTakerDisplay, isSaleActive, DEFAULT_PAYMENT_METHODS, DEFAULT_REOPEN_BILL_PERMISSIONS } from '../../context/RestaurantContext';
import { 
  Receipt, 
  Search, 
  Trash2, 
  Plus, 
  Minus,
  Coins, 
  Filter, 
  Printer, 
  Download, 
  CheckCircle2,
  FileText,
  X,
  Eye,
  FileSpreadsheet,
  ReceiptText,
  UserCheck,
  RotateCcw,
  Ban,
  AlertTriangle,
  Undo2,
  Check,
  ArrowRightLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Save,
  CreditCard
} from 'lucide-react';
import { SaleRecord, TableCartItem, DiscountType } from '../../types';

export const SalesLedgerView: React.FC = () => {
  const { 
    data, 
    metrics, 
    deleteSale, 
    voidSale, 
    restoreVoidedSale, 
    reopenSettledSaleInPos,
    modifySettledSale,
    updateSaleWaiter, 
    saveDirectDueCollection, 
    openPrintBill, 
    setPrintableReceipt, 
    currentUser 
  } = useRestaurant();
  const hasActiveBillPrinter = Boolean(
    (data.printers || []).some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL'))
  );
  const reopenPerms = data.reopenBillPermissions || DEFAULT_REOPEN_BILL_PERMISSIONS;
  const canReopenBill = currentUser?.role === 'ADMIN' || Boolean(currentUser?.role && reopenPerms[currentUser.role]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VOIDED'>('ALL');
  const [sortField, setSortField] = useState<'invoice' | 'kot' | 'time'>('invoice');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isDueModalOpen, setIsDueModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reassignSale, setReassignSale] = useState<{ id: number; invoiceNo: string; waiterName: string } | null>(null);
  const [newWaiterChoice, setNewWaiterChoice] = useState<string>('');

  // Void / Cancel Order Modal state
  const [voidingSale, setVoidingSale] = useState<SaleRecord | null>(null);
  const [voidReason, setVoidReason] = useState<string>('Customer Cancellation');
  const [customVoidReason, setCustomVoidReason] = useState<string>('');
  const activeFundMethods = (data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : DEFAULT_PAYMENT_METHODS)
    .filter(m => m.isActive !== false && m.type !== 'CREDIT');

  const [refundPayment, setRefundPayment] = useState<boolean>(true);
  const [refundMethod, setRefundMethod] = useState<string>(() => activeFundMethods[0]?.id || 'cash');
  const [restoreToTable, setRestoreToTable] = useState<boolean>(true);

  // Direct Bill Edit / Refund Modal state (Option 3 - 0% floor table conflict)
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editItems, setEditItems] = useState<TableCartItem[]>([]);
  const [editDiscountVal, setEditDiscountVal] = useState<number>(0);
  const [editDiscountType, setEditDiscountType] = useState<DiscountType>('taka');
  const [editRefundMethod, setEditRefundMethod] = useState<string>('cash');
  const [editRefundReason, setEditRefundReason] = useState<string>('Customer returned item');
  const [editCustomReason, setEditCustomReason] = useState<string>('');
  const [selectedAddMenuItemId, setSelectedAddMenuItemId] = useState<number | ''>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Due collection modal state
  const [dueCust, setDueCust] = useState(data.customers[0] || 'Walk-in Customer');
  const [dueAmount, setDueAmount] = useState<number>(0);
  const [dueMethod, setDueMethod] = useState<string>(() => activeFundMethods[0]?.id || 'cash');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSaveDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (dueAmount <= 0) return;
    saveDirectDueCollection(dueDate, dueCust, dueAmount, dueMethod);
    setIsDueModalOpen(false);
    setDueAmount(0);
  };

  const filteredSales = data.sales.filter(s => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchInv = (s.invoiceNo || '').toLowerCase().includes(q);
      const matchDet = (s.details || '').toLowerCase().includes(q);
      const matchCust = (s.dueCustomer || '').toLowerCase().includes(q) || (s.dueCollectedFrom || '').toLowerCase().includes(q);
      const matchTable = (s.table || '').toLowerCase().includes(q);
      const matchChannel = (s.channelOrAgent || '').toLowerCase().includes(q);

      // Smart table number matching (matches Table 01, Table 1, 01, 1, T-01, etc.)
      let matchTableSmart = false;
      const detLower = (s.details || '').toLowerCase();
      const tableLower = (s.table || '').toLowerCase();
      const numMatch = q.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        const numPadded = num.padStart(2, '0');
        const numUnpadded = parseInt(num, 10).toString();
        
        matchTableSmart = 
          detLower.includes(`table ${num}`) || 
          detLower.includes(`table ${numPadded}`) || 
          detLower.includes(`table ${numUnpadded}`) || 
          detLower.includes(`t-${num}`) || 
          detLower.includes(`t-${numPadded}`) || 
          detLower.includes(`t-${numUnpadded}`) || 
          tableLower.includes(num) || 
          tableLower.includes(numPadded);
      }

      if (!matchInv && !matchDet && !matchCust && !matchTable && !matchChannel && !matchTableSmart) {
        return false;
      }
    }
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    if (statusFilter === 'ACTIVE' && !isSaleActive(s)) return false;
    if (statusFilter === 'VOIDED' && isSaleActive(s)) return false;
    return true;
  });

  // Helper to extract KOT serial for display and sorting
  const extractKotSerial = (s: SaleRecord): string => {
    return (
      s.kotBaseSerial || 
      (s.orderRef?.startsWith('KOT-') ? s.orderRef : null) || 
      (s.details?.match(/KOT:\s*([^):#\s]+)/i)?.[1]?.trim()) || 
      (s.orderRef ? s.orderRef.replace(/^ORD-/, 'KOT-') : null) || 
      (s.details?.match(/Ref:\s*([^):]+)/i)?.[1]?.trim()?.replace(/^ORD-/, 'KOT-')) || 
      (s.invoiceNo ? 'KOT-' + s.invoiceNo.replace(/\D/g, '').padStart(4, '0').slice(-4) : 'KOT-0001')
    );
  };

  // Sort sales: default is Descending by POS Invoice (POS-0026 -> POS-0001)
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sortField === 'kot') {
      const kotA = extractKotSerial(a);
      const kotB = extractKotSerial(b);
      const numA = parseInt(kotA.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(kotB.replace(/\D/g, '') || '0', 10);
      if (numA !== numB) {
        return sortOrder === 'desc' ? numB - numA : numA - numB;
      }
      return sortOrder === 'desc' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0);
    }

    if (sortField === 'time') {
      return sortOrder === 'desc' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0);
    }

    // Default: 'invoice'
    const numA = parseInt((a.invoiceNo || '').replace(/\D/g, '') || '0', 10);
    const numB = parseInt((b.invoiceNo || '').replace(/\D/g, '') || '0', 10);
    if (numA !== numB) {
      return sortOrder === 'desc' ? numB - numA : numA - numB;
    }
    return sortOrder === 'desc' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0);
  });

  const activeFilteredSales = sortedSales.filter(isSaleActive);
  const voidedFilteredSales = sortedSales.filter(s => !isSaleActive(s));

  const totalFilteredSales = activeFilteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalFilteredCash = activeFilteredSales.reduce((sum, s) => sum + (s.cash || 0), 0);
  const totalFilteredCard = activeFilteredSales.reduce((sum, s) => sum + (s.card || 0), 0);
  const totalFilteredBkash = activeFilteredSales.reduce((sum, s) => sum + (s.bkash || 0), 0);
  const totalFilteredNagad = activeFilteredSales.reduce((sum, s) => sum + (s.nagad || 0), 0);
  const totalFilteredDigital = totalFilteredCard + totalFilteredBkash + totalFilteredNagad;
  const totalFilteredDue = activeFilteredSales.reduce((sum, s) => sum + (s.dueGiven || 0), 0);
  const totalFilteredVoided = voidedFilteredSales.reduce((sum, s) => sum + (s.total || 0), 0);

  const handleOpenVoidModal = (sale: SaleRecord) => {
    setVoidingSale(sale);
    setVoidReason('Customer Cancellation');
    setCustomVoidReason('');
    setRefundPayment(true);
    const firstMethod = activeFundMethods[0]?.id || 'cash';
    if (sale.paymentBreakdown) {
      const keys = Object.keys(sale.paymentBreakdown);
      const matchedKey = keys.find(k => activeFundMethods.some(m => m.id === k || m.name === k));
      setRefundMethod(matchedKey || keys[0] || firstMethod);
    } else if (sale.card && !sale.cash && !sale.bkash && !sale.nagad) {
      const cardMethod = activeFundMethods.find(m => m.type === 'CARD');
      setRefundMethod(cardMethod?.id || firstMethod);
    } else if (sale.bkash && !sale.cash && !sale.card && !sale.nagad) {
      const bkashMethod = activeFundMethods.find(m => m.type === 'MFS' && m.name.toLowerCase().includes('bkash')) || activeFundMethods.find(m => m.type === 'MFS');
      setRefundMethod(bkashMethod?.id || firstMethod);
    } else if (sale.nagad && !sale.cash && !sale.card && !sale.bkash) {
      const nagadMethod = activeFundMethods.find(m => m.type === 'MFS' && m.name.toLowerCase().includes('nagad')) || activeFundMethods.find(m => m.type === 'MFS');
      setRefundMethod(nagadMethod?.id || firstMethod);
    } else {
      setRefundMethod(firstMethod);
    }
    setRestoreToTable(true);
  };

  const handleConfirmVoid = () => {
    if (!voidingSale) return;
    const finalReason = customVoidReason.trim() ? customVoidReason.trim() : voidReason;
    voidSale(voidingSale.id, {
      reason: finalReason,
      refundPayment,
      refundMethod,
      restoreToTable
    });
    setVoidingSale(null);
  };

  const handlePrintVoidSlip = (sale: SaleRecord) => {
    let tableName = sale.table || 'Table';
    setPrintableReceipt({
      restaurantName: data.restaurantProfile?.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || 'Chattogram, Bangladesh',
      restaurantHotline: data.restaurantProfile?.phone || '+880 1756-007600',
      restaurantBin: data.restaurantProfile?.binOrVat || '0029381-01',
      invoiceNo: sale.invoiceNo || `POS-${sale.id}`,
      dateTime: sale.date || new Date().toISOString().split('T')[0],
      tableName,
      tableZone: 'Floor 1',
      waiter: sale.waiterName || 'Staff',
      orderTakenBy: getOrderTakerDisplay(sale.orderCreatedBy || sale.sellerName || sale.waiterName, sale.orderCreatedRole || sale.sellerRole),
      settleBillRole: formatRoleTitle(sale.cashierRole || 'Cashier'),
      customer: sale.dueCustomer || 'Walk-in Customer',
      items: sale.items || [],
      subtotal: sale.subtotal || sale.total,
      discountDeduction: Math.max(0, (sale.subtotal || sale.total) - sale.total),
      discountType: 'taka',
      discountVal: 0,
      netTotal: sale.total,
      netRestaurantRevenue: sale.netRestaurantRevenue ?? sale.total,
      paymentBreakdown: {
        cash: sale.cash || 0,
        card: sale.card || 0,
        bkash: sale.bkash || 0,
        nagad: sale.nagad || 0,
        due: sale.dueGiven || 0,
        byMethod: sale.paymentBreakdown
      },
      changeReturn: sale.change || 0,
      isSettled: false,
      receiptType: 'VOID_MEMO',
      voidReason: sale.voidReason || 'Order Cancelled / Voided',
      voidAuthorizedBy: sale.voidedBy || (currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Staff'})` : 'Manager'),
      refundAmount: sale.refundAmount || sale.total,
      refundMethod: sale.refundMethod || 'CASH',
      refundStatus: sale.refundStatus || 'REFUNDED'
    });
  };

  const handleOpenEditModal = (sale: SaleRecord) => {
    setEditingSale(sale);
    let initialItems: TableCartItem[] = [];
    if (sale.items && sale.items.length > 0) {
      initialItems = JSON.parse(JSON.stringify(sale.items));
    } else {
      initialItems = [{
        id: sale.id,
        cartItemId: `item-${sale.id}-0`,
        name: sale.details || 'Billed Items',
        price: sale.total,
        qty: 1,
        basePrice: sale.total
      }];
    }
    setEditItems(initialItems);
    setEditDiscountVal(sale.discountVal || 0);
    setEditDiscountType(sale.discountType || 'taka');
    setEditRefundReason('Customer returned item');
    setEditCustomReason('');
    setSelectedAddMenuItemId('');

    const firstMethod = activeFundMethods[0]?.id || 'cash';
    if (sale.paymentBreakdown) {
      const keys = Object.keys(sale.paymentBreakdown).filter(k => (sale.paymentBreakdown![k] || 0) > 0);
      const matchedKey = keys.find(k => activeFundMethods.some(m => m.id === k || m.name === k));
      setEditRefundMethod(matchedKey || keys[0] || firstMethod);
    } else if (sale.card && !sale.cash) {
      setEditRefundMethod('card');
    } else if (sale.bkash && !sale.cash) {
      setEditRefundMethod('bkash');
    } else {
      setEditRefundMethod('cash');
    }
  };

  const handleIncreaseQty = (idx: number) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: item.qty + 1 } : item));
  };

  const handleDecreaseQty = (idx: number) => {
    setEditItems(prev => {
      const target = prev[idx];
      if (!target) return prev;
      if (target.qty <= 1) {
        return prev.filter((_, i) => i !== idx);
      }
      return prev.map((item, i) => i === idx ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const handleRemoveItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddMenuItem = (menuItemId: number) => {
    const m = (data.menuItems || []).find(item => item.id === menuItemId);
    if (!m) return;
    const existingIdx = editItems.findIndex(i => i.id === m.id);
    if (existingIdx >= 0) {
      handleIncreaseQty(existingIdx);
    } else {
      setEditItems(prev => [
        ...prev,
        {
          id: m.id,
          cartItemId: `edit-${Date.now()}-${m.id}`,
          name: m.name,
          department: m.department,
          category: m.category,
          basePrice: m.price,
          price: m.price,
          qty: 1,
          addedAt: Date.now(),
          addedAtTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        }
      ]);
    }
    setSelectedAddMenuItemId('');
  };

  const handleConfirmSaveEdit = () => {
    if (!editingSale) return;
    if (editItems.length === 0) {
      alert("Bill cannot be empty! If you wish to cancel or void the entire bill, please use the Void / Cancel button.");
      return;
    }
    setIsSavingEdit(true);
    const finalReason = editCustomReason.trim() ? editCustomReason.trim() : editRefundReason;
    
    const computedSub = editItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const computedDisc = editDiscountType === 'percentage'
      ? Math.round((computedSub * (editDiscountVal || 0)) / 100)
      : Math.min(computedSub, editDiscountVal || 0);
    const computedTot = Math.max(0, computedSub - computedDisc);
    const diff = computedTot - (editingSale.total || 0);

    const adjType = diff < 0 ? 'REFUND' : diff > 0 ? 'COLLECT' : 'EXACT';
    const adjAmount = Math.abs(diff);

    modifySettledSale(editingSale.id, editItems, {
      discountVal: editDiscountVal,
      discountType: editDiscountType,
      adjustmentType: adjType,
      adjustmentAmount: adjAmount,
      adjustmentMethod: editRefundMethod,
      reason: finalReason
    });

    setIsSavingEdit(false);
    setEditingSale(null);
  };

  const handleOpenReceipt = (sale: any, defaultType: 'PAID_MEMO' | 'KOT' = 'PAID_MEMO') => {
    if (currentUser?.role === 'WAITER') return;
    let tableName = sale.table || 'Table';
    let tableZone = 'Floor 1';
    let waiter = (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff';
    let customer = sale.dueCustomer || sale.dueCollectedFrom || 'Walk-in Customer';

    const detailsStr = sale.details || '';

    if (!sale.table && detailsStr) {
      const tableMatch = detailsStr.match(/(Table\s*\w+|T-\w+|Takeaway|Delivery)/i);
      if (tableMatch) {
        tableName = tableMatch[0];
      }
    }

    if (detailsStr) {
      const zoneMatch = detailsStr.match(/Zone:\s*([^\]]+)/i);
      if (zoneMatch) {
        tableZone = zoneMatch[1].trim();
      }
      const waiterMatch = detailsStr.match(/W:\s*([^):,]+)/i);
      if (waiterMatch && waiterMatch[1].trim() !== 'N/A' && waiterMatch[1].trim() !== 'Staff') {
        waiter = waiterMatch[1].trim();
      }
      if (!sale.dueCustomer && detailsStr.includes('•')) {
        const parts = detailsStr.split('•');
        if (parts.length >= 3) {
          customer = parts[2].trim();
        }
        if (parts.length >= 2 && !waiterMatch) {
          waiter = parts[1].trim();
        }
      }
    }

    let receiptItems: any[] = [];
    if (Array.isArray(sale.items) && sale.items.length > 0) {
      receiptItems = sale.items;
    } else {
      if (detailsStr.includes(':')) {
        const itemsPart = detailsStr.split(':').slice(1).join(':').trim();
        if (itemsPart) {
          const rawItems = itemsPart.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (rawItems.length > 0) {
            receiptItems = rawItems.map((str: string, idx: number) => {
              const qtyMatch = str.match(/^(\d+)\s*[xX*]\s*(.+)$/);
              if (qtyMatch) {
                return {
                  id: idx + 1,
                  name: qtyMatch[2].trim(),
                  qty: parseInt(qtyMatch[1], 10),
                  price: Math.round(sale.total / rawItems.length)
                };
              }
              return {
                id: idx + 1,
                name: str,
                qty: 1,
                price: Math.round(sale.total / rawItems.length)
              };
            });
          }
        }
      }

      if (receiptItems.length === 0) {
        receiptItems = [
          {
            id: 1,
            name: detailsStr || 'Restaurant Order',
            qty: 1,
            price: sale.total
          }
        ];
      }
    }

    const subtotal = sale.subtotal || sale.total;
    const discountDeduction = Math.max(0, subtotal - sale.total);

    let orderRef = sale.kotBaseSerial || (sale.orderRef?.startsWith('KOT-') ? sale.orderRef : null);
    if (!orderRef && detailsStr) {
      const kotMatch = detailsStr.match(/KOT:\s*([^):#\s]+)/i);
      if (kotMatch) {
        orderRef = kotMatch[1].trim();
      } else {
        const refMatch = detailsStr.match(/Ref:\s*([^):]+)/i);
        if (refMatch) {
          orderRef = refMatch[1].trim().replace(/^ORD-/, 'KOT-');
        }
      }
    }
    if (!orderRef) {
      orderRef = sale.invoiceNo ? 'KOT-' + sale.invoiceNo.replace(/\D/g, '').padStart(4, '0').slice(-4) : 'KOT-0001';
    }

    setPrintableReceipt({
      restaurantName: data.restaurantProfile?.name || 'BD HOSTT POS',
      restaurantAddress: data.restaurantProfile?.address || 'Chattogram, Bangladesh',
      restaurantHotline: data.restaurantProfile?.phone || '+880 1756-007600',
      restaurantBin: data.restaurantProfile?.binOrVat || '0029381-01',
      invoiceNo: sale.invoiceNo || `POS-${sale.id}`,
      orderRef,
      dateTime: sale.date || new Date().toISOString().split('T')[0],
      tableName,
      tableZone,
      waiter,
      orderTakenBy: getOrderTakerDisplay(sale.orderCreatedBy || sale.sellerName || sale.waiterName, sale.orderCreatedRole || sale.sellerRole),
      settleBillRole: formatRoleTitle(sale.cashierRole || 'Cashier'),
      customer,
      channelOrAgent: sale.channelOrAgent,
      channelCommissionPercent: sale.channelCommissionPercent,
      channelCommissionAmount: sale.channelCommissionAmount,
      items: receiptItems,
      subtotal,
      discountDeduction,
      discountType: 'taka',
      discountVal: discountDeduction,
      netTotal: sale.total,
      netRestaurantRevenue: sale.netRestaurantRevenue ?? sale.total,
      paymentBreakdown: {
        cash: sale.cash || 0,
        card: sale.card || 0,
        bkash: sale.bkash || 0,
        nagad: sale.nagad || 0,
        due: sale.dueGiven || 0,
        byMethod: sale.paymentBreakdown
      },
      changeReturn: sale.change || 0,
      isSettled: true,
      receiptType: defaultType
    });
  };

  const generateReportHtml = () => {
    const restaurantName = data.restaurantProfile?.name || 'BD HOSTT POS';
    const address = data.restaurantProfile?.address || 'Chattogram, Bangladesh';
    const phone = data.restaurantProfile?.phone || '+880 1756-007600';
    const reportDateRange = startDate && endDate 
      ? `${startDate} to ${endDate}` 
      : startDate 
        ? `From ${startDate}` 
        : endDate 
          ? `Up to ${endDate}` 
          : 'All Recorded Transactions';
    const filterNote = search.trim() ? `Search Filter: "${search.trim()}"` : '';

    const rowsHtml = sortedSales.map((s, idx) => {
      const active = isSaleActive(s);
      let payments = '';
      if (s.paymentBreakdown && Object.keys(s.paymentBreakdown).length > 0) {
        payments = Object.entries(s.paymentBreakdown)
          .filter(([_, amt]) => Number(amt) > 0)
          .map(([mKey, amt]) => {
            const mObj = (data.paymentMethods || []).find(m => m.id === mKey || m.name.toLowerCase() === mKey.toLowerCase());
            return `${mObj?.name || mKey}: ৳${Number(amt).toLocaleString()}`;
          })
          .join(', ');
      }
      if (!payments) {
        payments = [
          s.cash ? `Cash: ৳${s.cash.toLocaleString()}` : '',
          s.card ? `Card: ৳${s.card.toLocaleString()}` : '',
          s.bkash ? `bKash: ৳${s.bkash.toLocaleString()}` : '',
          s.nagad ? `Nagad: ৳${s.nagad.toLocaleString()}` : '',
        ].filter(Boolean).join(', ');
      }

      if (!active) {
        return `
          <tr style="border-bottom: 1px solid #fecdd3; font-size: 11px; background: #fff1f2;">
            <td style="padding: 7px 8px; text-align: center; color: #9f1239;">${idx + 1}</td>
            <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; color: #9f1239;">
              ${s.invoiceNo} <span style="font-size: 9px; background: #fecdd3; color: #881337; padding: 1px 4px; border-radius: 3px; font-weight: 900;">VOIDED</span>
            </td>
            <td style="padding: 7px 8px; font-family: monospace; color: #94a3b8;">${s.date}</td>
            <td style="padding: 7px 8px; color: #64748b;">
              ${s.details} <div style="font-size: 10px; color: #e11d48; font-weight: 700; margin-top: 2px;">(Void Reason: ${s.voidReason || 'Order Cancelled'})</div>
            </td>
            <td style="padding: 7px 8px; font-size: 10px; font-family: monospace; color: #94a3b8;">${payments ? `${payments} (Refunded)` : 'Refunded'}</td>
            <td style="padding: 7px 8px; text-align: right; color: #94a3b8;">—</td>
            <td style="padding: 7px 8px; text-align: right; font-weight: bold; color: #94a3b8; text-decoration: line-through;">৳${s.total.toLocaleString()}</td>
          </tr>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 7px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; color: #0f172a;">${s.invoiceNo}</td>
          <td style="padding: 7px 8px; font-family: monospace; color: #475569;">${s.date}</td>
          <td style="padding: 7px 8px; color: #1e293b;">${s.details}</td>
          <td style="padding: 7px 8px; font-size: 10px; font-family: monospace;">${payments || '—'}</td>
          <td style="padding: 7px 8px; text-align: right; color: ${s.dueGiven ? '#dc2626' : '#64748b'}; font-weight: ${s.dueGiven ? 'bold' : 'normal'};">
            ${s.dueGiven ? '৳' + s.dueGiven.toLocaleString() : '—'}
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: bold; color: #0f172a;">৳${s.total.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sales_Report_${new Date().toISOString().split('T')[0]}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
          .restaurant-name { font-size: 20px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #0f172a; margin: 0; }
          .sub-header { font-size: 11px; color: #64748b; margin: 3px 0 0 0; }
          .report-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 8px 0 2px 0; color: #0284c7; }
          .meta-info { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 14px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .kpi-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
          .kpi-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .kpi-value { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #0f172a; color: #f8fafc; font-size: 10px; text-transform: uppercase; padding: 8px; text-align: left; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="restaurant-name">${restaurantName}</h1>
          <p class="sub-header">${address} • Phone: ${phone}</p>
          <div class="report-title">Sales Invoices & Revenue Statement</div>
        </div>

        <div class="meta-info">
          <div><strong>Period:</strong> ${reportDateRange} ${filterNote ? ` | ${filterNote}` : ''}</div>
          <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US')}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Active Orders</div>
            <div class="kpi-value">${activeFilteredSales.length}${voidedFilteredSales.length > 0 ? ` <span style="font-size: 11px; color: #dc2626;">(${voidedFilteredSales.length} Voided)</span>` : ''}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Net Sales</div>
            <div class="kpi-value" style="color: #047857;">৳${totalFilteredSales.toLocaleString()}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Cash Collected</div>
            <div class="kpi-value">৳${totalFilteredCash.toLocaleString()}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Digital (Card/MFS)</div>
            <div class="kpi-value" style="color: #1d4ed8;">৳${totalFilteredDigital.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 95px;">Invoice No</th>
              <th style="width: 80px;">Date</th>
              <th>Details / Table / Dishes</th>
              <th style="width: 140px;">Payment Breakdown</th>
              <th style="width: 80px; text-align: right;">Due</th>
              <th style="width: 90px; text-align: right;">Total (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 25px; color: #94a3b8;">No sales records found for this period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; font-size: 11px;">
              <td colspan="5" style="padding: 10px; text-align: right; text-transform: uppercase;">
                Net Total Sales Summary (${activeFilteredSales.length} Active Records):
              </td>
              <td style="padding: 10px; text-align: right; color: #dc2626;">৳${totalFilteredDue.toLocaleString()}</td>
              <td style="padding: 10px; text-align: right; font-size: 14px; font-weight: 900; color: #047857;">৳${totalFilteredSales.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Prepared By: ${currentUser?.name || 'Cashier'} (${currentUser?.role || 'Staff'}) • BD HOSTT Cloud ERP</div>
          <div>Authorized Manager Signature: ___________________________</div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(generateReportHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(generateReportHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>Sales Ledger & Customer Receivables</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction history across POS billing, payment channels, and customer credit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-due-collection"
            onClick={() => setIsDueModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>Customer Due Collection</span>
          </button>
        </div>
      </div>

      {/* Mini KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Total Sales</div>
          <div className="text-lg font-extrabold text-emerald-700 mt-0.5">৳ {metrics.totalSales.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Cash Received</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">৳ {metrics.payCash.toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Digital (Card/MFS)</div>
          <div className="text-lg font-extrabold text-blue-700 mt-0.5">৳ {(metrics.payCard + metrics.payBkash + metrics.payNagad).toLocaleString()}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Receivables (Due)</div>
          <div className="text-lg font-extrabold text-rose-700 mt-0.5">৳ {metrics.totalCustomerDue.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-80 md:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice no, table no (e.g. Table 01), dishes, or customer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            title="Start Date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            title="End Date"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* Status Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({data.sales.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              Active ({data.sales.filter(isSaleActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('VOIDED')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'VOIDED' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              Voided ({data.sales.filter(s => !isSaleActive(s)).length})
            </button>
          </div>

          {/* Quick Sort Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                if (sortField === 'invoice') {
                  setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortField('invoice');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                sortField === 'invoice' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sort by POS Invoice number (Click to toggle Descending / Ascending)"
            >
              <span>POS Invoice</span>
              {sortField === 'invoice' ? (
                sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> : <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (sortField === 'kot') {
                  setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                } else {
                  setSortField('kot');
                  setSortOrder('desc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                sortField === 'kot' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sort by Kitchen KOT sequence (Click to toggle Descending / Ascending)"
            >
              <span>KOT Order</span>
              {sortField === 'kot' ? (
                sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-amber-700" /> : <ArrowUp className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
              )}
            </button>
          </div>

          {/* Mark 2: View Report Button (Print, Export to PDF) */}
          <button
            id="btn-view-sales-report"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer whitespace-nowrap ml-auto sm:ml-1"
            title="View, Print and Export Sales Report"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>View Report</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px]">
              <tr>
                <th 
                  className="py-2.5 px-3 font-bold select-none cursor-pointer hover:bg-slate-800 transition"
                  onClick={() => {
                    if (sortField === 'invoice') {
                      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortField('invoice');
                      setSortOrder('desc');
                    }
                  }}
                  title="Click to sort by POS Invoice (Latest to Oldest / Oldest to Latest)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Invoice & Date</span>
                    {sortField === 'invoice' ? (
                      sortOrder === 'desc' ? (
                        <span className="flex items-center text-[10px] text-blue-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-blue-500/30">
                          <ArrowDown className="w-3 h-3 mr-0.5 text-blue-400" /> Desc
                        </span>
                      ) : (
                        <span className="flex items-center text-[10px] text-emerald-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          <ArrowUp className="w-3 h-3 mr-0.5 text-emerald-400" /> Asc
                        </span>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3 font-bold select-none cursor-pointer hover:bg-slate-800 transition"
                  onClick={() => {
                    if (sortField === 'kot') {
                      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortField('kot');
                      setSortOrder('desc');
                    }
                  }}
                  title="Click to sort by Kitchen KOT sequence"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Details / Customer</span>
                    {sortField === 'kot' ? (
                      sortOrder === 'desc' ? (
                        <span className="flex items-center text-[10px] text-amber-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-amber-500/30">
                          <ArrowDown className="w-3 h-3 mr-0.5 text-amber-400" /> KOT Desc
                        </span>
                      ) : (
                        <span className="flex items-center text-[10px] text-emerald-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          <ArrowUp className="w-3 h-3 mr-0.5 text-emerald-400" /> KOT Asc
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal hover:text-amber-300 inline-flex items-center gap-0.5">
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" /> KOT
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-bold">Payment Methods Breakdown</th>
                <th className="py-2.5 px-3 font-bold text-center">Status / Undo</th>
                <th className="py-2.5 px-2.5 font-bold text-right">Due / Collected</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Bill</th>
                <th className="py-2.5 px-3 font-bold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No sales records found.
                  </td>
                </tr>
              ) : (
                sortedSales.map(sale => {
                  let paymentItems: { label: string; amt: number; color: string }[] = [];
                  if (sale.paymentBreakdown && Object.keys(sale.paymentBreakdown).length > 0) {
                    paymentItems = Object.entries(sale.paymentBreakdown)
                      .filter(([_, amt]) => Number(amt) > 0)
                      .map(([mKey, amt]) => {
                        const mObj = (data.paymentMethods || []).find(m => m.id === mKey || m.name.toLowerCase() === mKey.toLowerCase());
                        const label = mObj?.name || mKey;
                        let color = 'text-slate-800';
                        if (mObj?.type === 'CASH') color = 'text-emerald-700';
                        else if (mObj?.type === 'CARD') color = 'text-blue-700';
                        else if (mObj?.type === 'MFS') color = label.toLowerCase().includes('nagad') ? 'text-orange-700' : 'text-pink-700';
                        else if (mObj?.type === 'BANK') color = 'text-indigo-700';
                        else if (mObj?.type === 'CREDIT') color = 'text-amber-700';
                        return { label, amt: Number(amt), color };
                      });
                  }
                  if (paymentItems.length === 0) {
                    paymentItems = [
                      sale.cash ? { label: 'Cash', amt: sale.cash, color: 'text-emerald-700' } : null,
                      sale.card ? { label: 'Card', amt: sale.card, color: 'text-blue-700' } : null,
                      sale.bkash ? { label: 'bKash', amt: sale.bkash, color: 'text-pink-700' } : null,
                      sale.nagad ? { label: 'Nagad', amt: sale.nagad, color: 'text-orange-700' } : null,
                    ].filter(Boolean) as any;
                  }

                  const active = isSaleActive(sale);

                  return (
                    <tr 
                      key={sale.id} 
                      onClick={() => hasActiveBillPrinter && handleOpenReceipt(sale, 'PAID_MEMO')}
                      className={`transition cursor-pointer group ${
                        active 
                          ? 'hover:bg-amber-50/70' 
                          : 'bg-rose-50/30 hover:bg-rose-100/40 text-slate-600'
                      }`}
                      title={active ? "Click to view & print thermal receipt" : `Voided: ${sale.voidReason || 'Order Cancelled'}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className={`font-mono font-bold transition flex items-center gap-1.5 ${
                          active ? 'text-slate-900 group-hover:text-blue-700' : 'text-slate-500'
                        }`}>
                          <span>{sale.invoiceNo}</span>
                          {hasActiveBillPrinter && <ReceiptText className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">{sale.date}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <span>
                              {extractKotSerial(sale)}
                            </span>
                            {(sale.kotCount && sale.kotCount > 1) ? (
                              <span className="text-[8px] px-1 py-0.2 bg-amber-200 text-amber-900 rounded font-black">
                                x{sale.kotCount}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="text-slate-800 font-medium line-clamp-1 group-hover:text-slate-900">{sale.details}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {currentUser?.role !== 'WAITER' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentW = (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff';
                                setReassignSale({
                                  id: sale.id,
                                  invoiceNo: sale.invoiceNo,
                                  waiterName: currentW
                                });
                                setNewWaiterChoice(currentW !== 'Staff' ? currentW : '');
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A'
                                    ? 'bg-blue-50 hover:bg-blue-100 text-[#004b9b] border-blue-200'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                              title="Click to reassign/change waiter"
                            >
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Waiter: {(sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff'}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <UserCheck className="w-2.5 h-2.5" />
                              <span>Waiter: {(sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff'}</span>
                            </span>
                          )}
                          {sale.dueCustomer && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                              Due: {sale.dueCustomer}
                            </span>
                          )}
                          {sale.dueCollectedFrom && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                              From: {sale.dueCollectedFrom}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-semibold">
                          {paymentItems.length > 0 ? (
                            paymentItems.map((p, idx) => (
                              <span key={idx} className={`${p!.color} bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded`}>
                                {p!.label}: ৳{p!.amt.toLocaleString()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      {/* User Marked Column: Order Status / Undo Action */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {active ? (
                          <div className="inline-flex items-center gap-1">
                            {canReopenBill ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(sale)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                                  title="Edit items, change quantities, add dishes, or refund directly in ledger without hijacking floor tables"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Edit / Refund Bill</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenVoidModal(sale)}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 hover:text-rose-800 border border-rose-200 transition cursor-pointer"
                                  title="Full Order Cancel / Void Modal (1-Click)"
                                >
                                  <Ban className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold uppercase">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Settled</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider">
                              <Ban className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Voided</span>
                            </span>
                            {sale.refundStatus === 'REFUNDED' && (
                              <span className="text-[9px] font-bold text-emerald-700 mt-0.5" title={`Refunded via ${sale.refundMethod || 'Cash'}`}>
                                Refund: ৳{(sale.refundAmount || sale.total).toLocaleString()}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button
                                type="button"
                                onClick={() => restoreVoidedSale(sale.id)}
                                className="text-[10px] text-slate-500 hover:text-blue-700 underline font-medium cursor-pointer"
                                title="Restore this order back to active"
                              >
                                Restore
                              </button>
                              {hasActiveBillPrinter && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <button
                                    type="button"
                                    onClick={() => handlePrintVoidSlip(sale)}
                                className="text-[10px] text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
                                title="Print Void Receipt / Slip"
                              >
                                Slip
                              </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 text-right font-mono font-bold">
                        {sale.dueGiven ? (
                          <div className={`text-xs ${active ? 'text-rose-700' : 'text-slate-400 line-through'}`}>
                            Due: ৳{sale.dueGiven.toLocaleString()}
                          </div>
                        ) : null}
                        {sale.dueCollected ? (
                          <div className="text-emerald-700 text-xs">Rec: ৳{sale.dueCollected.toLocaleString()}</div>
                        ) : null}
                        {!sale.dueGiven && !sale.dueCollected ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {active ? (
                          <span className="font-black text-slate-900 text-sm">৳{sale.total.toLocaleString()}</span>
                        ) : (
                          <div>
                            <span className="line-through text-slate-400 text-xs font-bold">৳{sale.total.toLocaleString()}</span>
                            <div className="text-[10px] text-rose-600 font-black tracking-tight">CANCELLED</div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {currentUser?.role !== 'WAITER' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentW = (sale.waiterName && sale.waiterName !== 'Staff' && sale.waiterName !== 'N/A') ? sale.waiterName : 'Staff';
                                  setReassignSale({
                                    id: sale.id,
                                    invoiceNo: sale.invoiceNo,
                                    waiterName: currentW
                                  });
                                  setNewWaiterChoice(currentW !== 'Staff' ? currentW : '');
                                }}
                                className="p-1.5 text-slate-500 hover:text-[#004b9b] rounded-lg hover:bg-blue-50 transition cursor-pointer"
                                title="Reassign / Change Waiter"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                              {hasActiveBillPrinter && (
                              <button
                                type="button"
                                onClick={() => hasActiveBillPrinter && handleOpenReceipt(sale, 'PAID_MEMO')}
                                className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-100/70 transition cursor-pointer"
                                title="View & Print Bill / Cash Memo Receipt"
                              >
                                <ReceiptText className="w-3.5 h-3.5" />
                              </button>
                            )}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteSale(sale.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer ml-0.5"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Due Collection Modal */}
      {isDueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Customer Due Collection</h3>
            <p className="text-xs text-slate-500 mb-4">Record direct payment received from credit customers</p>

            <form onSubmit={handleSaveDue} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer *</label>
                <select
                  value={dueCust}
                  onChange={e => setDueCust(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                >
                  {data.customers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (৳) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={dueAmount || ''}
                  onChange={e => setDueAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount collected"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Received Via</label>
                <select
                  value={dueMethod}
                  onChange={e => setDueMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                >
                  {activeFundMethods.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.accountNumber ? `(${m.accountNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDueModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Complete Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void & Cancel Order Modal with Payment Refund & Restore to Table */}
      {voidingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>Void & Cancel Order</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black">REFUND</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Invoice: <span className="font-mono font-bold text-slate-800">{voidingSale.invoiceNo}</span> • {voidingSale.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoidingSale(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Details Brief */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Order / Table:</span>
                <span className="font-bold text-slate-900">{voidingSale.table || 'Table Order'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Items Ordered:</span>
                <span className="font-medium text-slate-800 max-w-xs truncate text-right">{voidingSale.details}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                <span className="text-slate-600 font-bold">Total Bill:</span>
                <span className="font-black text-slate-900 text-sm">৳{voidingSale.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Payment Breakdown:</span>
                <span className="font-mono font-medium">
                  {[
                    voidingSale.cash ? `Cash: ৳${voidingSale.cash.toLocaleString()}` : null,
                    voidingSale.card ? `Card: ৳${voidingSale.card.toLocaleString()}` : null,
                    voidingSale.bkash ? `bKash: ৳${voidingSale.bkash.toLocaleString()}` : null,
                    voidingSale.nagad ? `Nagad: ৳${voidingSale.nagad.toLocaleString()}` : null,
                    voidingSale.dueGiven ? `Due: ৳${voidingSale.dueGiven.toLocaleString()}` : null,
                  ].filter(Boolean).join(' • ') || 'None'}
                </span>
              </div>
            </div>

            {/* Step 1: Cancellation Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Reason for Cancellation / Void *
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[
                  'Customer Cancellation',
                  'Wrong Entry / Mistake',
                  'Food Quality Issue',
                  'Customer Refused Payment',
                  'Duplicate Order Re-billed',
                  'Other Reason'
                ].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setVoidReason(r);
                      if (r !== 'Other Reason') setCustomVoidReason('');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition border cursor-pointer ${
                      voidReason === r 
                        ? 'bg-[#004b9b] text-white border-[#004b9b] shadow-xs' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customVoidReason}
                onChange={e => setCustomVoidReason(e.target.value)}
                placeholder="Specific reason or notes (optional)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Step 2: Payment Refund Control */}
            <div className="bg-rose-50/60 rounded-2xl p-3.5 border border-rose-200/80 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-refund-payment"
                  checked={refundPayment}
                  onChange={e => setRefundPayment(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="chk-refund-payment" className="text-xs font-bold text-slate-900 cursor-pointer">
                  Process Payment Refund to Customer
                  <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
                    Refund ৳{voidingSale.total.toLocaleString()} from collection. Reports and cash drawer will auto-adjust.
                  </span>
                </label>
              </div>

              {refundPayment && (
                <div className="pl-6 pt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 shrink-0">Refund Method:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeFundMethods.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRefundMethod(m.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          refundMethod === m.id
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-rose-200 hover:bg-rose-100/50'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Undo Settlement & Re-open Table in POS Billing */}
            <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-200/80">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-restore-table"
                  checked={restoreToTable}
                  onChange={e => setRestoreToTable(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="chk-restore-table" className="text-xs font-bold text-slate-900 cursor-pointer">
                  Re-open Table in Live POS with Order Cart
                  <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
                    Restore the table as occupied with these items in POS Billing so staff can make changes or re-bill.
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setVoidingSale(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className={`flex-2 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                  restoreToTable ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {restoreToTable ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                <span>{restoreToTable ? 'Confirm Void & Re-open in POS Cart' : 'Confirm Void & Refund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option 3: Direct Bill Edit & Refund Modal (Zero Floor Table Impact) */}
      {editingSale && (() => {
        const computedSubtotal = editItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const computedDiscount = editDiscountType === 'percentage'
          ? Math.round((computedSubtotal * (editDiscountVal || 0)) / 100)
          : Math.min(computedSubtotal, editDiscountVal || 0);
        const computedTotal = Math.max(0, computedSubtotal - computedDiscount);
        const originalTotal = editingSale.total || 0;
        const diff = computedTotal - originalTotal;
        const isRefund = diff < 0;
        const isExtraPay = diff > 0;
        const absDiff = Math.abs(diff);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <span>Edit & Refund Bill</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">
                        DIRECT LEDGER
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Invoice: <span className="font-mono font-bold text-slate-800">{editingSale.invoiceNo}</span> • Table: <span className="font-bold text-slate-800">{editingSale.table || 'N/A'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0 text-xs">
                
                {/* 1. Items List with Quantity Controls */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700">Order Items ({editItems.length})</span>
                    <span className="text-[11px] text-slate-400">Click + / - to change qty or trash to remove</span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    {editItems.map((item, idx) => (
                      <div key={item.cartItemId || idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            ৳{item.price.toLocaleString()} each
                          </p>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDecreaseQty(idx)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 flex items-center justify-center font-black transition cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono font-black text-slate-900 text-sm">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncreaseQty(idx)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 flex items-center justify-center font-black transition cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className="w-16 text-right font-mono font-black text-slate-900 ml-1">
                            ৳{(item.price * item.qty).toLocaleString()}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition ml-1 cursor-pointer"
                            title="Remove this item completely"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {editItems.length === 0 && (
                      <p className="text-center py-4 text-slate-400 italic font-medium">
                        No items remaining in this order.
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Quick Add Menu Item Selector */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={selectedAddMenuItemId}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setSelectedAddMenuItemId(val);
                        if (val) handleAddMenuItem(val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">+ Add Extra Dish / Item to this Bill...</option>
                      {(data.menuItems || []).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — ৳{m.price.toLocaleString()} ({m.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Discount Adjustment */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount Value</label>
                    <input
                      type="number"
                      min="0"
                      value={editDiscountVal}
                      onChange={e => setEditDiscountVal(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold font-mono text-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Discount Type</label>
                    <select
                      value={editDiscountType}
                      onChange={e => setEditDiscountType(e.target.value as DiscountType)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs cursor-pointer"
                    >
                      <option value="taka">Fixed Taka (৳)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Live Financial Reconciliation Box */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Original Paid Amount:</span>
                    <span className="font-mono font-bold text-slate-200">৳{originalTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Revised New Bill Value:</span>
                    <span className="font-mono font-bold text-amber-300">৳{computedTotal.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-xs">
                      {isRefund ? 'Customer Refund Amount:' : isExtraPay ? 'Additional Payment Due:' : 'Adjustment Difference:'}
                    </span>
                    <span className={`font-mono font-black text-base ${isRefund ? 'text-rose-400' : isExtraPay ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {isRefund ? `- ৳${absDiff.toLocaleString()}` : isExtraPay ? `+ ৳${absDiff.toLocaleString()}` : '৳0 (No Change)'}
                    </span>
                  </div>
                </div>

                {/* 5. Adjustment Payment Method & Reason (If amount changed) */}
                {diff !== 0 && (
                  <div className={`p-3 rounded-2xl border space-y-2.5 ${isRefund ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                    <div>
                      <label className="block font-bold text-slate-800 text-xs mb-1">
                        {isRefund ? 'Refund From Payment Method *' : 'Receive Additional Payment In *'}
                      </label>
                      <select
                        value={editRefundMethod}
                        onChange={e => setEditRefundMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                      >
                        {activeFundMethods.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {isRefund && (
                      <div>
                        <label className="block font-bold text-slate-800 text-xs mb-1">Reason for Refund / Edit</label>
                        <select
                          value={editRefundReason}
                          onChange={e => setEditRefundReason(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 text-xs mb-1.5 cursor-pointer"
                        >
                          <option value="Customer returned item">Customer returned item / Dish cancelled</option>
                          <option value="Wrong item entered by waiter">Wrong item entered by waiter / mistake</option>
                          <option value="Kitchen out of stock / unable to serve">Kitchen out of stock / unable to serve</option>
                          <option value="Food quality issue">Food quality issue</option>
                          <option value="Manager special discount conceded">Manager special discount conceded</option>
                          <option value="Other">Other custom reason...</option>
                        </select>
                        {editRefundReason === 'Other' && (
                          <input
                            type="text"
                            value={editCustomReason}
                            onChange={e => setEditCustomReason(e.target.value)}
                            placeholder="Enter custom reason..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmSaveEdit}
                    disabled={isSavingEdit || editItems.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingEdit ? 'Saving...' : 'Save & Update Invoice'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reassign Waiter Modal */}
      {reassignSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#004b9b] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Reassign Order Waiter</h3>
                  <div className="text-[11px] text-slate-500 font-mono font-bold">
                    Invoice: {reassignSale.invoiceNo}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReassignSale(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="my-4 space-y-3">
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                Current Assigned: <strong className="text-slate-900 font-bold">{reassignSale.waiterName || 'Staff'}</strong>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select New Waiter</label>
                <select
                  value={newWaiterChoice}
                  onChange={e => setNewWaiterChoice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004b9b] cursor-pointer"
                >
                  <option value="">-- Choose Waiter --</option>
                  {(data.waiters || []).map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                  <option value="Staff">Staff (Unassigned)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignSale(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetWaiter = newWaiterChoice.trim() || 'Staff';
                  updateSaleWaiter(reassignSale.id, targetWaiter);
                  setReassignSale(null);
                }}
                className="px-4 py-2 text-xs font-extrabold text-white bg-[#004b9b] hover:bg-blue-800 rounded-xl shadow-xs cursor-pointer transition"
              >
                Save Waiter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Sales Report Modal with Live Preview, Print, and PDF Export */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Modal Top Action Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#004b9b] text-white flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    Sales Invoices & Revenue Statement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {startDate && endDate 
                      ? `Period: ${startDate} to ${endDate}` 
                      : startDate 
                        ? `From: ${startDate}` 
                        : endDate 
                          ? `Up to: ${endDate}` 
                          : 'All Recorded Transactions'}
                    {search.trim() ? ` • Filter: "${search.trim()}"` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-print-sales-report"
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition cursor-pointer"
                  title="Print Report directly or send to physical printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
                <button
                  id="btn-pdf-sales-report"
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  title="Export and Save as clean PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to PDF</span>
                </button>
                <button
                  id="btn-close-sales-report-modal"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                  title="Close Report View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: A4 Printable Styled Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-100/60">
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 shadow-xs max-w-4xl mx-auto space-y-5">
                {/* Document Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-wider uppercase">
                    {data.restaurantProfile?.name || 'BD HOSTT POS'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {data.restaurantProfile?.address || 'Chattogram, Bangladesh'} • Phone: {data.restaurantProfile?.phone || '+880 1756-007600'}
                  </p>
                  <div className="text-sm font-bold text-[#004b9b] uppercase tracking-wide mt-2">
                    Sales Invoices & Revenue Statement
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-600 gap-1 pb-2 border-b border-dashed border-slate-200 font-mono">
                  <div>
                    <strong>Period:</strong> {startDate && endDate ? `${startDate} to ${endDate}` : (startDate ? `From ${startDate}` : (endDate ? `Up to ${endDate}` : 'All Recorded Transactions'))}
                    {search.trim() ? <span className="ml-2 font-sans font-bold text-[#004b9b]">(Filter: "{search.trim()}")</span> : ''}
                  </div>
                  <div>
                    <strong>Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </div>
                </div>

                {/* KPI Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Invoices</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{filteredSales.length}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Sales</div>
                    <div className="text-base font-extrabold text-emerald-700 mt-0.5">৳ {totalFilteredSales.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Cash Collected</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">৳ {totalFilteredCash.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Digital (Card/MFS)</div>
                    <div className="text-base font-extrabold text-blue-700 mt-0.5">৳ {totalFilteredDigital.toLocaleString()}</div>
                  </div>
                </div>

                {/* Statement Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-200 text-[10.5px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10 font-bold">#</th>
                        <th className="py-2.5 px-3 font-bold">Invoice & Date</th>
                        <th className="py-2.5 px-3 font-bold">Details / Table / Dishes</th>
                        <th className="py-2.5 px-3 font-bold">Payment Methods</th>
                        <th className="py-2.5 px-3 text-right font-bold">Due</th>
                        <th className="py-2.5 px-3 text-right font-bold">Total Bill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No sales records found for this period.
                          </td>
                        </tr>
                      ) : (
                        sortedSales.map((sale, idx) => {
                          const active = isSaleActive(sale);
                          let payments: string[] = [];
                          if (sale.paymentBreakdown && Object.keys(sale.paymentBreakdown).length > 0) {
                            payments = Object.entries(sale.paymentBreakdown)
                              .filter(([_, amt]) => Number(amt) > 0)
                              .map(([mKey, amt]) => {
                                const mObj = (data.paymentMethods || []).find(m => m.id === mKey || m.name.toLowerCase() === mKey.toLowerCase());
                                return `${mObj?.name || mKey}: ৳${Number(amt).toLocaleString()}`;
                              });
                          }
                          if (payments.length === 0) {
                            payments = [
                              sale.cash ? `Cash: ৳${sale.cash.toLocaleString()}` : '',
                              sale.card ? `Card: ৳${sale.card.toLocaleString()}` : '',
                              sale.bkash ? `bKash: ৳${sale.bkash.toLocaleString()}` : '',
                              sale.nagad ? `Nagad: ৳${sale.nagad.toLocaleString()}` : '',
                            ].filter(Boolean);
                          }

                          return (
                            <tr key={sale.id} className={active ? "hover:bg-slate-50/80" : "bg-rose-50/40 text-slate-500 hover:bg-rose-100/40"}>
                              <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{sale.invoiceNo}</span>
                                  {!active && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-black border border-rose-300">
                                      VOID
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">{sale.date}</div>
                              </td>
                              <td className="py-2 px-3 max-w-sm">
                                <div className="text-slate-800 font-medium">{sale.details}</div>
                                {!active && (
                                  <div className="text-[10px] text-rose-600 font-bold">
                                    Void Reason: {sale.voidReason || 'Order Cancelled'}
                                  </div>
                                )}
                                {sale.dueCustomer && (
                                  <div className="text-[10px] text-amber-700 font-bold">Due Customer: {sale.dueCustomer}</div>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                                  {payments.length > 0 ? (
                                    payments.map((p, pIdx) => (
                                      <span key={pIdx} className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-200">
                                        {p} {!active ? '(Refunded)' : ''}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {sale.dueGiven ? (
                                  <span className={active ? "text-rose-600" : "text-slate-400 line-through"}>৳{sale.dueGiven.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                {active ? (
                                  <span className="font-black text-slate-900">৳{sale.total.toLocaleString()}</span>
                                ) : (
                                  <span className="line-through text-slate-400 font-bold">৳{sale.total.toLocaleString()}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-900 text-xs">
                        <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700 font-black">
                          Total Summary ({filteredSales.length} Records):
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-600">
                          {totalFilteredDue > 0 ? `৳${totalFilteredDue.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          ৳{totalFilteredSales.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Audit Signatures */}
                <div className="pt-8 flex flex-col sm:flex-row justify-between text-xs text-slate-500 gap-6 border-t border-slate-200">
                  <div>
                    <div className="border-t border-slate-400 w-44 pt-1 text-center font-bold text-slate-700">
                      Prepared By: {currentUser?.name || 'Cashier'}
                    </div>
                    <div className="text-[10px] text-center text-slate-400">{currentUser?.role || 'Staff Operator'}</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-48 pt-1 text-center font-bold text-slate-700">
                      Authorized Signature
                    </div>
                    <div className="text-[10px] text-center text-slate-400">Branch Manager / Owner</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
