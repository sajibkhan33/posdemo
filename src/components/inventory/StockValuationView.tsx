import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RawMasterItem, StockInventoryRecord } from '../../types';

export type EditableColumn = 'open' | 'manualUsed' | 'wastage';

const STOCK_START_DATE_KEY = 'barcode_cafe_stock_start_date';
const STOCK_END_DATE_KEY = 'barcode_cafe_stock_end_date';
import { 
  Boxes, 
  Search, 
  Calendar, 
  Filter, 
  ArrowDownRight, 
  ArrowUpRight, 
  Download, 
  Printer, 
  RotateCcw, 
  FileText, 
  Eye, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  X, 
  Check,
  TrendingDown, 
  TrendingUp, 
  Edit3, 
  Save,
  Clock,
  Sparkles,
  UtensilsCrossed,
  ShoppingCart
} from 'lucide-react';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'OPENING' | 'PURCHASE' | 'POS_BOM' | 'MANUAL_USED' | 'WASTAGE';
  reference: string;
  detail: string;
  inQty: number;
  inRate: number;
  inVal: number;
  outQty: number;
  outRate: number;
  outVal: number;
  balanceQty: number;
  balanceVal: number;
}

export const StockValuationView: React.FC = () => {
  const { data, metrics, saveInventoryRecord } = useRestaurant();

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockStatus, setStockStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [startDate, setStartDate] = useState<string>(() => {
    try {
      return localStorage.getItem(STOCK_START_DATE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [endDate, setEndDate] = useState<string>(() => {
    try {
      return localStorage.getItem(STOCK_END_DATE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Persist date filters across page refresh and tab navigation
  useEffect(() => {
    try {
      if (startDate) {
        localStorage.setItem(STOCK_START_DATE_KEY, startDate);
      } else {
        localStorage.removeItem(STOCK_START_DATE_KEY);
      }
    } catch {
      // ignore
    }
  }, [startDate]);

  useEffect(() => {
    try {
      if (endDate) {
        localStorage.setItem(STOCK_END_DATE_KEY, endDate);
      } else {
        localStorage.removeItem(STOCK_END_DATE_KEY);
      }
    } catch {
      // ignore
    }
  }, [endDate]);

  // Stock Adjustment / Inline Edit state
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [activeCol, setActiveCol] = useState<EditableColumn | null>(null);
  const [editOpen, setEditOpen] = useState<number>(0);
  const [editManualUsed, setEditManualUsed] = useState<number>(0);
  const [editWastage, setEditWastage] = useState<number>(0);
  const [savedSuccess, setSavedSuccess] = useState<number | null>(null);

  const isCancellingRef = useRef(false);
  const openInputRef = useRef<HTMLInputElement | null>(null);
  const manualUsedInputRef = useRef<HTMLInputElement | null>(null);
  const wastageInputRef = useRef<HTMLInputElement | null>(null);
  const editValuesRef = useRef({
    itemId: null as number | null,
    open: 0,
    manualUsed: 0,
    wastage: 0
  });

  // Keep latest values in ref for synchronous access during blur/mouseLeave
  useEffect(() => {
    editValuesRef.current = {
      itemId: editingRow,
      open: editOpen,
      manualUsed: editManualUsed,
      wastage: editWastage
    };
  }, [editingRow, editOpen, editManualUsed, editWastage]);

  // Auto-focus and highlight the active cell's input on edit start or column switch
  useEffect(() => {
    if (editingRow !== null && activeCol) {
      const timer = setTimeout(() => {
        let el: HTMLInputElement | null = null;
        if (activeCol === 'open') el = openInputRef.current;
        else if (activeCol === 'manualUsed') el = manualUsedInputRef.current;
        else if (activeCol === 'wastage') el = wastageInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [editingRow, activeCol]);

  // Drilldown / Stock Ledger Modal State
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<RawMasterItem | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'ALL' | 'PURCHASE' | 'POS_BOM' | 'MANUAL_USED' | 'WASTAGE'>('ALL');

  // Quick Date Preset Helpers
  const handleSetDatePreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH') => {
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'TODAY') {
      const today = toDateStr(now);
      setStartDate(today);
      setEndDate(today);
      return;
    }

    if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const str = toDateStr(yest);
      setStartDate(str);
      setEndDate(str);
      return;
    }

    if (preset === 'THIS_WEEK') {
      const firstDay = new Date(now);
      const day = firstDay.getDay();
      const diff = firstDay.getDate() - day + (day === 0 ? -6 : 1); // Monday
      firstDay.setDate(diff);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(now));
      return;
    }

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(now));
      return;
    }

    if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
      return;
    }
  };

  const isPresetActive = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH') => {
    if (preset === 'ALL') return !startDate && !endDate;
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    const today = toDateStr(now);

    if (preset === 'TODAY') return startDate === today && endDate === today;

    if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toDateStr(yest);
      return startDate === yestStr && endDate === yestStr;
    }

    if (preset === 'THIS_WEEK') {
      const firstDay = new Date(now);
      const day = firstDay.getDay();
      const diff = firstDay.getDate() - day + (day === 0 ? -6 : 1);
      firstDay.setDate(diff);
      return startDate === toDateStr(firstDay) && endDate === today;
    }

    if (preset === 'THIS_MONTH') {
      const firstDay = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      return startDate === firstDay && endDate === today;
    }

    if (preset === 'LAST_MONTH') {
      const firstDay = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastDay = toDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
      return startDate === firstDay && endDate === lastDay;
    }

    return false;
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setStockStatus('ALL');
    setStartDate('');
    setEndDate('');
    try {
      localStorage.removeItem(STOCK_START_DATE_KEY);
      localStorage.removeItem(STOCK_END_DATE_KEY);
    } catch {
      // ignore
    }
  };

  // Format currency without truncation, preserving up to 2 decimal places for accurate BOM costs
  const formatVal = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Main Stock Calculation Engine with Date Range Filter support
  const stockRows = useMemo(() => {
    return data.masterItems.map(item => {
      // 1. Initial inventory record
      const invRecord = data.inventory.find(x => x.id === item.id);
      const initialOpenQty = invRecord ? (Number(invRecord.open) || 0) : 0;
      const initialManualUsedQty = invRecord ? (invRecord.manualUsed !== undefined ? Number(invRecord.manualUsed) : (Number(invRecord.used) || 0)) : 0;
      const initialWastageQty = invRecord ? (Number(invRecord.wastage) || 0) : 0;

      // 2. Pre-period calculations (if startDate is specified)
      let preReceivedQty = 0;
      let preReceivedVal = 0;
      let preBomUsedQty = 0;

      // 3. In-period calculations (between startDate and endDate)
      let inPeriodReceivedQty = 0;
      let inPeriodReceivedVal = 0;
      let inPeriodBomUsedQty = 0;

      // 4. Lifetime totals for weighted average rate calculation
      let lifetimeReceivedQty = 0;
      let lifetimeReceivedVal = 0;

      // Analyze Purchase Vouchers
      data.purchases.forEach(p => {
        if (p.status === 'DRAFT') return;
        const pDate = p.date ? p.date.split('T')[0] : '';
        
        if (p.items && Array.isArray(p.items)) {
          p.items.forEach(sub => {
            if (sub.itemId === item.id || (sub.item && sub.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
              const q = Number(sub.qty) || 0;
              const r = Number(sub.rate) || 0;
              const val = q * r;

              lifetimeReceivedQty += q;
              lifetimeReceivedVal += val;

              if (startDate && pDate < startDate) {
                preReceivedQty += q;
                preReceivedVal += val;
              } else if ((!startDate || pDate >= startDate) && (!endDate || pDate <= endDate)) {
                inPeriodReceivedQty += q;
                inPeriodReceivedVal += val;
              }
            }
          });
        }
      });

      // Analyze Purchase Returns (deduct from inwards)
      (data.purchaseReturns || []).forEach(ret => {
        const rDate = ret.date ? ret.date.split('T')[0] : '';
        if (ret.itemId === item.id || (ret.item && ret.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
          const q = Number(ret.qty) || 0;
          const r = Number(ret.rate) || 0;
          const val = q * r;

          lifetimeReceivedQty = Math.max(0, lifetimeReceivedQty - q);
          lifetimeReceivedVal = Math.max(0, lifetimeReceivedVal - val);

          if (startDate && rDate < startDate) {
            preReceivedQty = Math.max(0, preReceivedQty - q);
            preReceivedVal = Math.max(0, preReceivedVal - val);
          } else if ((!startDate || rDate >= startDate) && (!endDate || rDate <= endDate)) {
            inPeriodReceivedQty = Math.max(0, inPeriodReceivedQty - q);
            inPeriodReceivedVal = Math.max(0, inPeriodReceivedVal - val);
          }
        }
      });

      // Analyze POS Sales & Recipe BOM Consumption
      data.sales.forEach(sale => {
        if (sale.isVoid || sale.status === 'VOIDED' || sale.status === 'CANCELLED') return;
        const sDate = sale.date ? sale.date.split('T')[0] : '';
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(soldItem => {
            const menuItem = data.menuItems.find(m => m.id === soldItem.id);
            if (menuItem && menuItem.recipe && Array.isArray(menuItem.recipe)) {
              menuItem.recipe.forEach(ing => {
                if (ing.rawItemId === item.id) {
                  const usedQty = (Number(ing.qty) || 0) * (Number(soldItem.qty) || 0);

                  if (startDate && sDate < startDate) {
                    preBomUsedQty += usedQty;
                  } else if ((!startDate || sDate >= startDate) && (!endDate || sDate <= endDate)) {
                    inPeriodBomUsedQty += usedQty;
                  }
                }
              });
            }
          });
        }
      });

      // Valuation Rate Calculation (Weighted Average Rate of Opening Stock + Inward Purchases)
      const totalAvailableQty = initialOpenQty + lifetimeReceivedQty;
      const totalAvailableVal = (initialOpenQty * (Number(item.defaultRate) || 0)) + lifetimeReceivedVal;
      const weightedAvgRate = totalAvailableQty > 0 
        ? (totalAvailableVal / totalAvailableQty) 
        : (Number(item.defaultRate) || (invRecord && invRecord.rate ? Number(invRecord.rate) : 0));

      const valuationRate = weightedAvgRate;

      // Inward Rate for the period
      const periodAvgInwardRate = inPeriodReceivedQty > 0 
        ? (inPeriodReceivedVal / inPeriodReceivedQty) 
        : valuationRate;

      // Opening Stock for the filtered period
      // If startDate is set, Opening = initialOpen + prePurchases - preBomUsage
      const effectiveOpenQty = startDate 
        ? Math.max(0, (initialOpenQty + preReceivedQty) - preBomUsedQty)
        : initialOpenQty;
      const openValuation = effectiveOpenQty * valuationRate;

      // Inward Purchases in Period
      const totalReceivedQty = inPeriodReceivedQty;
      const totalReceivedVal = inPeriodReceivedVal;

      // Outward Auto Recipe BOM Consumed in Period
      const autoBomUsedQty = inPeriodBomUsedQty;
      const bomCostVal = autoBomUsedQty * valuationRate;

      // Manual Kitchen Usage
      const manualUsedQty = initialManualUsedQty;
      const manualUsedVal = manualUsedQty * valuationRate;

      // Wastage / Spoilage
      const wastageQty = initialWastageQty;
      const wastageVal = wastageQty * valuationRate;

      // Total Outward & Closing Stock
      const totalOutwardQty = autoBomUsedQty + manualUsedQty + wastageQty;
      const closingQty = (effectiveOpenQty + totalReceivedQty) - totalOutwardQty;
      const closingValuation = Math.max(0, closingQty * valuationRate);

      // Stock Status Alert
      let status: 'NORMAL' | 'LOW' | 'NEGATIVE' = 'NORMAL';
      if (closingQty < 0) {
        status = 'NEGATIVE';
      } else if (closingQty <= 5) {
        status = 'LOW';
      }

      return {
        item,
        openQty: effectiveOpenQty,
        openValuation,
        totalReceivedQty,
        totalReceivedVal,
        periodAvgInwardRate,
        autoBomUsedQty,
        bomCostVal,
        manualUsedQty,
        manualUsedVal,
        wastageQty,
        wastageVal,
        totalOutwardQty,
        closingQty,
        valuationRate,
        closingValuation,
        status
      };
    });
  }, [data, startDate, endDate]);

  // Filtered Main Stock Rows
  const filteredRows = useMemo(() => {
    return stockRows.filter(r => {
      // Category filter
      if (selectedCategory !== 'ALL' && r.item.category !== selectedCategory) return false;

      // Stock status filter
      if (stockStatus === 'IN_STOCK' && r.closingQty <= 5) return false;
      if (stockStatus === 'LOW_STOCK' && (r.closingQty <= 0 || r.closingQty > 5)) return false;
      if (stockStatus === 'OUT_OF_STOCK' && r.closingQty > 0) return false;

      // Search keyword
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          r.item.name.toLowerCase().includes(q) ||
          r.item.category.toLowerCase().includes(q) ||
          (r.item.vendor || '').toLowerCase().includes(q) ||
          r.item.id.toString().includes(q)
        );
      }

      return true;
    });
  }, [stockRows, selectedCategory, stockStatus, search]);

  // Enhanced Inline Edit Handlers with Spreadsheet-style navigation & auto-save
  const handleStartEdit = (
    itemId: number,
    currentOpen: number,
    currentManualUsed: number,
    currentWastage: number,
    col: EditableColumn = 'open'
  ) => {
    isCancellingRef.current = false;
    setEditingRow(itemId);
    setActiveCol(col);
    setEditOpen(currentOpen);
    setEditManualUsed(currentManualUsed);
    setEditWastage(currentWastage);
  };

  const handleSaveRow = (itemId?: number, rate?: number) => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    const targetId = itemId ?? editingRow;
    if (targetId === null || targetId === undefined) return;

    const row = filteredRows.find(r => r.item.id === targetId);
    const valuationRate = rate ?? row?.valuationRate;
    
    // Synchronously read values from ref
    const currentValues = editValuesRef.current;
    const finalOpen = targetId === currentValues.itemId ? currentValues.open : (row ? row.openQty : 0);
    const finalManual = targetId === currentValues.itemId ? currentValues.manualUsed : (row ? row.manualUsedQty : 0);
    const finalWastage = targetId === currentValues.itemId ? currentValues.wastage : (row ? row.wastageQty : 0);

    saveInventoryRecord(targetId, finalOpen, finalManual, valuationRate, finalWastage);
    setEditingRow(null);
    setActiveCol(null);
    setSavedSuccess(targetId);
    setTimeout(() => setSavedSuccess(null), 1800);
  };

  const handleCancelEdit = () => {
    isCancellingRef.current = true;
    setEditingRow(null);
    setActiveCol(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    row: (typeof filteredRows)[number],
    col: EditableColumn
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRow(row.item.id, row.valuationRate);
      const currentIndex = filteredRows.findIndex(r => r.item.id === row.item.id);
      if (currentIndex < filteredRows.length - 1) {
        const nextRow = filteredRows[currentIndex + 1];
        setTimeout(() => {
          handleStartEdit(nextRow.item.id, nextRow.openQty, nextRow.manualUsedQty, nextRow.wastageQty, col);
        }, 40);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = filteredRows.findIndex(r => r.item.id === row.item.id);
      if (currentIndex > 0) {
        handleSaveRow(row.item.id, row.valuationRate);
        const prevRow = filteredRows[currentIndex - 1];
        setTimeout(() => {
          handleStartEdit(prevRow.item.id, prevRow.openQty, prevRow.manualUsedQty, prevRow.wastageQty, col);
        }, 40);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = filteredRows.findIndex(r => r.item.id === row.item.id);
      if (currentIndex < filteredRows.length - 1) {
        handleSaveRow(row.item.id, row.valuationRate);
        const nextRow = filteredRows[currentIndex + 1];
        setTimeout(() => {
          handleStartEdit(nextRow.item.id, nextRow.openQty, nextRow.manualUsedQty, nextRow.wastageQty, col);
        }, 40);
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const currentValues = editValuesRef.current;
      if (currentValues.itemId !== null) {
        saveInventoryRecord(
          currentValues.itemId,
          currentValues.open,
          currentValues.manualUsed,
          row.valuationRate,
          currentValues.wastage
        );
      }

      if (e.shiftKey) {
        if (col === 'wastage') setActiveCol('manualUsed');
        else if (col === 'manualUsed') setActiveCol('open');
      } else {
        if (col === 'open') setActiveCol('manualUsed');
        else if (col === 'manualUsed') setActiveCol('wastage');
        else if (col === 'wastage') {
          const currentIndex = filteredRows.findIndex(r => r.item.id === row.item.id);
          if (currentIndex < filteredRows.length - 1) {
            const nextRow = filteredRows[currentIndex + 1];
            setTimeout(() => {
              handleStartEdit(nextRow.item.id, nextRow.openQty, nextRow.manualUsedQty, nextRow.wastageQty, 'open');
            }, 40);
          }
        }
      }
      return;
    }

    // Left Arrow: Immediately saves current changes and navigates to left-side clickable column
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentValues = editValuesRef.current;
      if (currentValues.itemId !== null) {
        saveInventoryRecord(
          currentValues.itemId,
          currentValues.open,
          currentValues.manualUsed,
          row.valuationRate,
          currentValues.wastage
        );
      }

      if (col === 'wastage') {
        setActiveCol('manualUsed');
      } else if (col === 'manualUsed') {
        setActiveCol('open');
      } else if (col === 'open') {
        // Wrap to previous row's last clickable column (wastage)
        const currentIndex = filteredRows.findIndex(r => r.item.id === row.item.id);
        if (currentIndex > 0) {
          const prevRow = filteredRows[currentIndex - 1];
          setTimeout(() => {
            handleStartEdit(prevRow.item.id, prevRow.openQty, prevRow.manualUsedQty, prevRow.wastageQty, 'wastage');
          }, 40);
        }
      }
      return;
    }

    // Right Arrow: Immediately saves current changes and navigates to right-side clickable column
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const currentValues = editValuesRef.current;
      if (currentValues.itemId !== null) {
        saveInventoryRecord(
          currentValues.itemId,
          currentValues.open,
          currentValues.manualUsed,
          row.valuationRate,
          currentValues.wastage
        );
      }

      if (col === 'open') {
        setActiveCol('manualUsed');
      } else if (col === 'manualUsed') {
        setActiveCol('wastage');
      } else if (col === 'wastage') {
        // Wrap to next row's first clickable column (open)
        const currentIndex = filteredRows.findIndex(r => r.item.id === row.item.id);
        if (currentIndex < filteredRows.length - 1) {
          const nextRow = filteredRows[currentIndex + 1];
          setTimeout(() => {
            handleStartEdit(nextRow.item.id, nextRow.openQty, nextRow.manualUsedQty, nextRow.wastageQty, 'open');
          }, 40);
        }
      }
      return;
    }
  };

  // Aggregate Metrics based on filtered date range
  const summaryMetrics = useMemo(() => {
    let totalOpeningVal = 0;
    let totalOpeningQty = 0;
    let totalPurchasesVal = 0;
    let totalPurchasesQty = 0;
    let totalBomVal = 0;
    let totalBomQty = 0;
    let totalManualUsedVal = 0;
    let totalManualUsedQty = 0;
    let totalWastageVal = 0;
    let totalWastageQty = 0;
    let totalClosingVal = 0;
    let lowStockCount = 0;
    let negativeStockCount = 0;

    stockRows.forEach(r => {
      totalOpeningVal += r.openValuation;
      totalOpeningQty += r.openQty;
      totalPurchasesVal += r.totalReceivedVal;
      totalPurchasesQty += r.totalReceivedQty;
      totalBomVal += r.bomCostVal;
      totalBomQty += r.autoBomUsedQty;
      totalManualUsedVal += r.manualUsedVal;
      totalManualUsedQty += r.manualUsedQty;
      totalWastageVal += r.wastageVal;
      totalWastageQty += r.wastageQty;
      totalClosingVal += r.closingValuation;
      if (r.status === 'LOW') lowStockCount++;
      if (r.status === 'NEGATIVE') negativeStockCount++;
    });

    return {
      totalOpeningVal,
      totalOpeningQty,
      totalPurchasesVal,
      totalPurchasesQty,
      totalBomVal,
      totalBomQty,
      totalManualUsedVal,
      totalManualUsedQty,
      totalWastageVal,
      totalWastageQty,
      totalClosingVal,
      lowStockCount,
      negativeStockCount
    };
  }, [stockRows]);

  // Build Full Chronological Stock Movement / Ledger for Selected Item
  const itemLedgerEntries = useMemo(() => {
    if (!selectedLedgerItem) return [];

    const entries: LedgerEntry[] = [];
    const item = selectedLedgerItem;
    const invRecord = data.inventory.find(x => x.id === item.id);
    const initialOpen = invRecord ? (Number(invRecord.open) || 0) : 0;
    const initialManualUsed = invRecord ? (invRecord.manualUsed !== undefined ? Number(invRecord.manualUsed) : (Number(invRecord.used) || 0)) : 0;
    const initialWastage = invRecord ? (Number(invRecord.wastage) || 0) : 0;
    const defaultRate = Number(item.defaultRate) || 0;

    // 1. Initial Opening Entry
    entries.push({
      id: `open-${item.id}`,
      date: '2025-01-01',
      type: 'OPENING',
      reference: `INIT-OPEN-#${item.id}`,
      detail: 'Opening Stock Balance Register',
      inQty: initialOpen,
      inRate: defaultRate,
      inVal: initialOpen * defaultRate,
      outQty: 0,
      outRate: 0,
      outVal: 0,
      balanceQty: 0,
      balanceVal: 0
    });

    // 2. Purchase Vouchers
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      const pDate = p.date ? p.date.split('T')[0] : '2025-01-01';

      if (p.items && Array.isArray(p.items)) {
        p.items.forEach((sub, idx) => {
          if (sub.itemId === item.id || (sub.item && sub.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
            const q = Number(sub.qty) || 0;
            const r = Number(sub.rate) || defaultRate;
            entries.push({
              id: `pur-${p.id}-${idx}`,
              date: pDate,
              type: 'PURCHASE',
              reference: p.billNo || `VOUCHER-${p.id}`,
              detail: `Inward Purchase from ${p.vendor} (${p.paymentType})`,
              inQty: q,
              inRate: r,
              inVal: q * r,
              outQty: 0,
              outRate: 0,
              outVal: 0,
              balanceQty: 0,
              balanceVal: 0
            });
          }
        });
      }
    });

    // 2.5 Purchase Returns (Outwards to supplier)
    (data.purchaseReturns || []).forEach((ret, rIdx) => {
      const rDate = ret.date ? ret.date.split('T')[0] : '2025-01-01';
      if (ret.itemId === item.id || (ret.item && ret.item.toLowerCase().trim() === item.name.toLowerCase().trim())) {
        const q = Number(ret.qty) || 0;
        const r = Number(ret.rate) || defaultRate;
        entries.push({
          id: `ret-${ret.id || rIdx}`,
          date: rDate,
          type: 'PURCHASE',
          reference: ret.returnNo || `RET-${ret.id || rIdx}`,
          detail: `Supplier Return to ${ret.vendor} (${ret.reason || 'Returned'})`,
          inQty: 0,
          inRate: 0,
          inVal: 0,
          outQty: q,
          outRate: r,
          outVal: q * r,
          balanceQty: 0,
          balanceVal: 0
        });
      }
    });

    // 3. POS Sales & Recipe BOM Deductions
    data.sales.forEach(sale => {
      if (sale.isVoid || sale.status === 'VOIDED' || sale.status === 'CANCELLED') return;
      const sDate = sale.date ? sale.date.split('T')[0] : '2025-01-01';
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((soldItem, sIdx) => {
          const menuItem = data.menuItems.find(m => m.id === soldItem.id);
          if (menuItem && menuItem.recipe && Array.isArray(menuItem.recipe)) {
            menuItem.recipe.forEach((ing, iIdx) => {
              if (ing.rawItemId === item.id) {
                const consumedQty = (Number(ing.qty) || 0) * (Number(soldItem.qty) || 0);
                entries.push({
                  id: `sale-${sale.id}-${sIdx}-${iIdx}`,
                  date: sDate,
                  type: 'POS_BOM',
                  reference: sale.invoiceNo || `POS-${sale.id}`,
                  detail: `Auto Recipe BOM: ${soldItem.qty}x ${menuItem.name} (${ing.qty} ${item.uom}/portion)`,
                  inQty: 0,
                  inRate: 0,
                  inVal: 0,
                  outQty: consumedQty,
                  outRate: defaultRate,
                  outVal: consumedQty * defaultRate,
                  balanceQty: 0,
                  balanceVal: 0
                });
              }
            });
          }
        });
      }
    });

    // 4. Manual Kitchen Usage (if any recorded)
    if (initialManualUsed > 0) {
      entries.push({
        id: `manual-${item.id}`,
        date: new Date().toISOString().split('T')[0],
        type: 'MANUAL_USED',
        reference: `ADJ-MANUAL-#${item.id}`,
        detail: 'Direct Kitchen Consumption / Manual Requisition',
        inQty: 0,
        inRate: 0,
        inVal: 0,
        outQty: initialManualUsed,
        outRate: defaultRate,
        outVal: initialManualUsed * defaultRate,
        balanceQty: 0,
        balanceVal: 0
      });
    }

    // 5. Wastage / Spoilage (if any recorded)
    if (initialWastage > 0) {
      entries.push({
        id: `waste-${item.id}`,
        date: new Date().toISOString().split('T')[0],
        type: 'WASTAGE',
        reference: `ADJ-WASTE-#${item.id}`,
        detail: 'Kitchen Spoilage, Damage & Physical Adjustment',
        inQty: 0,
        inRate: 0,
        inVal: 0,
        outQty: initialWastage,
        outRate: defaultRate,
        outVal: initialWastage * defaultRate,
        balanceQty: 0,
        balanceVal: 0
      });
    }

    // Sort chronologically
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance and running weighted average valuation
    let runningQty = 0;
    let totalInQty = 0;
    let totalInVal = 0;

    entries.forEach(e => {
      if (e.inQty > 0) {
        totalInQty += e.inQty;
        totalInVal += e.inVal;
      }
      const currentAvgRate = totalInQty > 0 ? (totalInVal / totalInQty) : defaultRate;

      if (e.outQty > 0) {
        e.outRate = currentAvgRate;
        e.outVal = e.outQty * currentAvgRate;
      }

      runningQty += (e.inQty - e.outQty);
      e.balanceQty = runningQty;
      e.balanceVal = runningQty * currentAvgRate;
    });

    return entries;
  }, [selectedLedgerItem, data]);

  // Filtered Ledger entries for selected item
  const filteredLedgerEntries = useMemo(() => {
    return itemLedgerEntries.filter(entry => {
      if (ledgerTypeFilter !== 'ALL' && entry.type !== ledgerTypeFilter) return false;
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;

      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase().trim();
        return (
          entry.reference.toLowerCase().includes(q) ||
          entry.detail.toLowerCase().includes(q) ||
          entry.date.includes(q)
        );
      }
      return true;
    });
  }, [itemLedgerEntries, ledgerTypeFilter, startDate, endDate, ledgerSearch]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Item Code',
      'Item Name',
      'Category',
      'UOM',
      'Opening Stock Qty',
      'Opening Stock Val (BDT)',
      'Inward Received Qty',
      'Inward Purchase Val (BDT)',
      'Inward Avg Rate (BDT)',
      'Auto BOM Used Qty',
      'Auto BOM Cost Val (BDT)',
      'Manual Used Qty',
      'Manual Used Val (BDT)',
      'Wastage Qty',
      'Wastage Val (BDT)',
      'Closing Stock Qty',
      'Valuation Rate (BDT)',
      'Closing Stock Valuation (BDT)',
      'Stock Status'
    ];

    const rows = filteredRows.map(r => [
      r.item.id,
      `"${r.item.name}"`,
      `"${r.item.category}"`,
      r.item.uom,
      r.openQty.toFixed(2),
      (Math.round((r.openValuation + Number.EPSILON) * 100) / 100).toFixed(2),
      r.totalReceivedQty.toFixed(2),
      (Math.round((r.totalReceivedVal + Number.EPSILON) * 100) / 100).toFixed(2),
      (Math.round((r.periodAvgInwardRate + Number.EPSILON) * 100) / 100).toFixed(2),
      r.autoBomUsedQty.toFixed(2),
      (Math.round((r.bomCostVal + Number.EPSILON) * 100) / 100).toFixed(2),
      r.manualUsedQty.toFixed(2),
      (Math.round((r.manualUsedVal + Number.EPSILON) * 100) / 100).toFixed(2),
      r.wastageQty.toFixed(2),
      (Math.round((r.wastageVal + Number.EPSILON) * 100) / 100).toFixed(2),
      r.closingQty.toFixed(2),
      (Math.round((r.valuationRate + Number.EPSILON) * 100) / 100).toFixed(2),
      (Math.round((r.closingValuation + Number.EPSILON) * 100) / 100).toFixed(2),
      r.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Ledger_Report_${startDate || 'all'}_to_${endDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Automatic Stock Ledger & Valuation</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                  Live POS Recipe BOM
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time raw material deduction from POS sales, weighted average purchase valuation & date-wise stock ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Export Stock Ledger to CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Print Stock Report"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* 6 Summary Valuation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Opening Stock */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Opening Stock Balance</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
              ৳ {formatVal(summaryMetrics.totalOpeningVal)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Opening Quantity In Period</span>
            <span className="font-bold text-emerald-700 font-mono">+{summaryMetrics.totalOpeningQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 2. Inward Purchases */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Inward Received Purchases</span>
              <ArrowDownRight className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
              ৳ {formatVal(summaryMetrics.totalPurchasesVal)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Received Quantity In Period</span>
            <span className="font-bold text-blue-700 font-mono">+{summaryMetrics.totalPurchasesQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 3. Auto Recipe BOM Cost */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Auto Recipe (BOM) Cost</span>
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2 font-mono">
              ৳ {formatVal(summaryMetrics.totalBomVal)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Auto Deducted via POS Sales</span>
            <span className="font-bold text-amber-700 font-mono">-{summaryMetrics.totalBomQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 4. Manual Used Cost */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Manual Used Cost</span>
              <UtensilsCrossed className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-orange-600 mt-2 font-mono">
              ৳ {formatVal(summaryMetrics.totalManualUsedVal)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Manual Kitchen Used</span>
            <span className="font-bold text-orange-700 font-mono">-{summaryMetrics.totalManualUsedQty.toFixed(1)} Units</span>
          </div>
        </div>

        {/* 5. Manual Wastage & Alerts */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Wastage & Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-2 font-mono">
              ৳ {formatVal(summaryMetrics.totalWastageVal)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Alerts in Storeroom</span>
            <span className="font-bold text-rose-600">
              {summaryMetrics.lowStockCount} Low / {summaryMetrics.negativeStockCount} Negative
            </span>
          </div>
        </div>

        {/* 6. Closing Stock Valuation */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Closing Stock Valuation</span>
              <Boxes className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-500 mt-2 font-mono">
              ৳ {formatVal(summaryMetrics.totalClosingVal)}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Total On-Hand Asset Value</span>
            <span className="font-bold text-amber-300 font-mono">{filteredRows.length} Items</span>
          </div>
        </div>
      </div>

      {/* Stock Ledger Filter & Search Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Stock Ledger Filter & Search
            </h3>
            {(startDate || endDate || search || selectedCategory !== 'ALL' || stockStatus !== 'ALL') && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                Filtered
              </span>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Period Presets:</span>
            {(['ALL', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH'] as const).map(preset => {
              const labelMap = {
                ALL: 'All Time',
                TODAY: 'Today',
                YESTERDAY: 'Yesterday',
                THIS_WEEK: 'This Week',
                THIS_MONTH: 'This Month',
                LAST_MONTH: 'Last Month'
              };
              const isSelected = isPresetActive(preset);

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSetDatePreset(preset)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-amber-400 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {labelMap[preset]}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer ml-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-4 relative">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Raw Material</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search raw item name, code or vendor..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Start Date (From Date) */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date (From Date)</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* End Date (To Date) */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date (To Date)</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Item Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {data.purchaseCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Stock Status</label>
            <select
              value={stockStatus}
              onChange={e => setStockStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock (&gt; 5)</option>
              <option value="LOW_STOCK">Low Stock (≤ 5)</option>
              <option value="OUT_OF_STOCK">Zero / Negative (≤ 0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Ledger Master Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
              Stock Valuation Ledger ({filteredRows.length} Items Listed)
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Period: <span className="font-bold text-slate-900">{startDate || 'Initial'}</span> to <span className="font-bold text-slate-900">{endDate || 'Latest'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-bold">Item Name & Category</th>
                <th className="py-2.5 px-2 font-bold text-center">UOM</th>
                <th className="py-2.5 px-2.5 font-bold text-right">Opening Stock</th>
                <th className="py-2.5 px-2.5 font-bold text-right text-blue-300">Inward Purchases (+)</th>
                <th className="py-2.5 px-2.5 font-bold text-right text-amber-300">POS Recipe Used (-)</th>
                <th className="py-2.5 px-2.5 font-bold text-right text-orange-300">Manual Used (-)</th>
                <th className="py-2.5 px-2.5 font-bold text-right text-rose-300">Wastage (-)</th>
                <th className="py-2.5 px-2.5 font-bold text-right text-white">Closing Stock</th>
                <th className="py-2.5 px-2.5 font-bold text-right">Avg Rate (৳)</th>
                <th className="py-2.5 px-3 font-bold text-right text-amber-400">Total Stock Value (৳)</th>
                <th className="py-2.5 px-3 font-bold text-center">Ledger Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No stock records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map(row => {
                  const isEditing = editingRow === row.item.id;

                  const getStatusBadge = () => {
                    if (row.closingQty < 0) {
                      return (
                        <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-rose-100 text-rose-800 border border-rose-300">
                          {row.closingQty.toFixed(2)} (Negative)
                        </span>
                      );
                    }
                    if (row.closingQty <= 5) {
                      return (
                        <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-amber-100 text-amber-800 border border-amber-300">
                          {row.closingQty.toFixed(2)} (Low)
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {row.closingQty.toFixed(2)}
                      </span>
                    );
                  };

                  return (
                    <tr 
                      key={row.item.id} 
                      onMouseLeave={() => {
                        if (isEditing) {
                          handleSaveRow(row.item.id, row.valuationRate);
                        }
                      }}
                      onBlur={(e) => {
                        if (isEditing && !e.currentTarget.contains(e.relatedTarget as Node)) {
                          handleSaveRow(row.item.id, row.valuationRate);
                        }
                      }}
                      className={`transition-colors duration-300 ${
                        savedSuccess === row.item.id 
                          ? 'bg-emerald-50/90 ring-1 ring-emerald-400' 
                          : isEditing 
                            ? 'bg-amber-50/40' 
                            : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* Item Details */}
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{row.item.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {row.item.category}
                          </span>
                          <span className="text-slate-400 font-mono">ID: #{row.item.id}</span>
                        </div>
                      </td>

                      {/* UOM */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700 font-mono text-xs">
                        {row.item.uom}
                      </td>

                      {/* Opening Stock */}
                      <td 
                        className="py-2.5 px-2.5 text-right font-mono"
                        onDoubleClick={() => !isEditing && handleStartEdit(row.item.id, row.openQty, row.manualUsedQty, row.wastageQty, 'open')}
                      >
                        {isEditing ? (
                          <input
                            ref={openInputRef}
                            type="number"
                            step="0.01"
                            value={editOpen}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditOpen(val);
                              editValuesRef.current.open = val;
                            }}
                            onFocus={() => setActiveCol('open')}
                            onKeyDown={e => handleKeyDown(e, row, 'open')}
                            className="w-16 px-1.5 py-1 bg-white border-2 border-amber-500 rounded text-right text-xs font-bold font-mono shadow-xs focus:outline-none"
                            title="Opening Stock (Enter / ↑↓ to navigate, auto-saves on leave)"
                          />
                        ) : (
                          <div 
                            className="cursor-pointer group/cell hover:bg-amber-100/70 hover:ring-1 hover:ring-amber-400/70 rounded px-1.5 py-0.5 transition"
                            title="Double-click to edit Opening Stock"
                          >
                            <div className="font-bold text-slate-800">{row.openQty.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400">৳{formatVal(row.openValuation)}</div>
                          </div>
                        )}
                      </td>

                      {/* Inward Purchases (+) */}
                      <td className="py-2.5 px-2.5 text-right font-mono">
                        <div className="font-bold text-blue-600">+{row.totalReceivedQty.toFixed(2)}</div>
                        <div className="text-[10px] text-blue-500">৳{formatVal(row.totalReceivedVal)}</div>
                      </td>

                      {/* POS Recipe Used (-) */}
                      <td className="py-2.5 px-2.5 text-right font-mono">
                        <div className="font-bold text-amber-700">-{row.autoBomUsedQty.toFixed(2)}</div>
                        <div className="text-[10px] text-amber-600">৳{formatVal(row.bomCostVal)}</div>
                      </td>

                      {/* Manual Used (-) */}
                      <td 
                        className="py-2.5 px-2.5 text-right font-mono"
                        onDoubleClick={() => !isEditing && handleStartEdit(row.item.id, row.openQty, row.manualUsedQty, row.wastageQty, 'manualUsed')}
                      >
                        {isEditing ? (
                          <input
                            ref={manualUsedInputRef}
                            type="number"
                            step="0.01"
                            min="0"
                            value={editManualUsed}
                            onChange={e => {
                              const val = Math.max(0, Math.abs(parseFloat(e.target.value) || 0));
                              setEditManualUsed(val);
                              editValuesRef.current.manualUsed = val;
                            }}
                            onFocus={() => setActiveCol('manualUsed')}
                            onKeyDown={e => handleKeyDown(e, row, 'manualUsed')}
                            placeholder="0.00"
                            className="w-16 px-1 py-0.5 bg-orange-50 border-2 border-orange-500 rounded text-right text-xs font-bold font-mono text-orange-700 focus:bg-white shadow-xs focus:outline-none"
                            title="Manual Kitchen Used (Enter / ↑↓ to navigate, auto-saves on leave)"
                          />
                        ) : (
                          <div 
                            className="cursor-pointer group/cell hover:bg-orange-100/70 hover:ring-1 hover:ring-orange-400/70 rounded px-1.5 py-0.5 transition"
                            title="Double-click to edit Manual Kitchen Used"
                          >
                            <div className="font-bold text-orange-600">-{row.manualUsedQty.toFixed(2)}</div>
                            <div className="text-[10px] text-orange-500">৳{formatVal(row.manualUsedVal)}</div>
                          </div>
                        )}
                      </td>

                      {/* Wastage (-) */}
                      <td 
                        className="py-2.5 px-2.5 text-right font-mono"
                        onDoubleClick={() => !isEditing && handleStartEdit(row.item.id, row.openQty, row.manualUsedQty, row.wastageQty, 'wastage')}
                      >
                        {isEditing ? (
                          <input
                            ref={wastageInputRef}
                            type="number"
                            step="0.01"
                            min="0"
                            value={editWastage}
                            onChange={e => {
                              const val = Math.max(0, Math.abs(parseFloat(e.target.value) || 0));
                              setEditWastage(val);
                              editValuesRef.current.wastage = val;
                            }}
                            onFocus={() => setActiveCol('wastage')}
                            onKeyDown={e => handleKeyDown(e, row, 'wastage')}
                            placeholder="0.00"
                            className="w-16 px-1 py-0.5 bg-rose-50 border-2 border-rose-500 rounded text-right text-xs font-bold font-mono text-rose-700 focus:bg-white shadow-xs focus:outline-none"
                            title="Spoilage / Wastage (Enter / ↑↓ to navigate, auto-saves on leave)"
                          />
                        ) : (
                          <div 
                            className="cursor-pointer group/cell hover:bg-rose-100/70 hover:ring-1 hover:ring-rose-400/70 rounded px-1.5 py-0.5 transition"
                            title="Double-click to edit Spoilage / Wastage"
                          >
                            <div className="font-bold text-rose-600">-{row.wastageQty.toFixed(2)}</div>
                            <div className="text-[10px] text-rose-500">৳{formatVal(row.wastageVal)}</div>
                          </div>
                        )}
                      </td>

                      {/* Closing Balance On Hand */}
                      <td className="py-2.5 px-2.5 text-right font-mono">
                        {getStatusBadge()}
                      </td>

                      {/* Avg Rate */}
                      <td className="py-2.5 px-2.5 text-right font-mono">
                        <div className="font-bold text-slate-800 text-xs">৳{formatVal(row.valuationRate)}</div>
                      </td>

                      {/* Total Stock Value */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <div className="font-black text-indigo-900 text-xs sm:text-sm">
                          ৳ {formatVal(row.closingValuation)}
                        </div>
                      </td>

                      {/* Actions / Ledger Drilldown */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {savedSuccess === row.item.id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300 animate-pulse">
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span>Saved</span>
                            </span>
                          ) : isEditing ? (
                            <>
                              <button
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleSaveRow(row.item.id, row.valuationRate);
                                }}
                                onClick={() => handleSaveRow(row.item.id, row.valuationRate)}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleCancelEdit();
                                }}
                                onClick={() => handleCancelEdit()}
                                className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedLedgerItem(row.item)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="View Stock Ledger Statement"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ledger</span>
                            </button>
                          )}
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

      {/* Item Stock Ledger Detailed Modal */}
      {selectedLedgerItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <span>Stock Ledger Statement: {selectedLedgerItem.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                      {selectedLedgerItem.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological stock movement audit trail, inward purchases & live POS Recipe (BOM) consumption
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Bar */}
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    placeholder="Search voucher, invoice or dish..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <select
                  value={ledgerTypeFilter}
                  onChange={e => setLedgerTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="ALL">All Transactions</option>
                  <option value="PURCHASE">Inward Purchases</option>
                  <option value="POS_BOM">POS Recipe BOM Used</option>
                  <option value="MANUAL_USED">Manual Used</option>
                  <option value="WASTAGE">Wastage / Adjustments</option>
                </select>
              </div>

              <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                UOM: <span className="text-indigo-700">{selectedLedgerItem.uom}</span> | Weighted Avg Rate: <span className="text-indigo-700">৳{(stockRows.find(r => r.item.id === selectedLedgerItem.id)?.valuationRate ?? Number(selectedLedgerItem.defaultRate) ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Ledger Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-300 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Date</th>
                    <th className="py-2.5 px-3 font-bold">Type & Ref</th>
                    <th className="py-2.5 px-3 font-bold">Transaction Details</th>
                    <th className="py-2.5 px-2 font-bold text-right text-blue-300">Inward Qty (+)</th>
                    <th className="py-2.5 px-2 font-bold text-right text-amber-300">Outward Qty (-)</th>
                    <th className="py-2.5 px-3 font-bold text-right text-white">Running Stock</th>
                    <th className="py-2.5 px-3 font-bold text-right text-amber-400">Balance Value (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No transactions found for this item in the selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredLedgerEntries.map((entry, idx) => {
                      const getTypeBadge = () => {
                        switch (entry.type) {
                          case 'OPENING':
                            return <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPENING</span>;
                          case 'PURCHASE':
                            return <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">PURCHASE</span>;
                          case 'POS_BOM':
                            return <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">POS BOM</span>;
                          case 'MANUAL_USED':
                            return <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">MANUAL</span>;
                          case 'WASTAGE':
                            return <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">WASTE</span>;
                        }
                      };

                      return (
                        <tr key={entry.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {entry.date}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {getTypeBadge()}
                              <span className="font-mono text-slate-700 font-bold">{entry.reference}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                            {entry.detail}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700">
                            {entry.inQty > 0 ? `+${entry.inQty.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-700">
                            {entry.outQty > 0 ? `-${entry.outQty.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            {entry.balanceQty.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                            ৳ {formatVal(entry.balanceVal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLedgerItem(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
