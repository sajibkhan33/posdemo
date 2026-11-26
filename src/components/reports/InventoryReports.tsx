import React, { useState, useMemo } from 'react';
import { useRestaurant, isSaleActive } from '../../context/RestaurantContext';
import { RawMasterItem } from '../../types';
import { ReportFilters, DatePreset, exportCsvHelper } from './ReportFilters';
import { 
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowDownRight,
  Layers, 
  Receipt, 
  Sparkles, 
  Package, 
  AlertTriangle,
  ChefHat,
  FileSpreadsheet,
  Eye,
  X,
  Filter,
  Search,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Activity,
  FileText,
  Printer,
  Download,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';

interface SubReportProps {
  reportType: 'daily-stock' | 'daily-opening' | 'daily-closing' | 'inwards' | 'outwards' | 'transactional';
}

interface StockValuationRow {
  item: RawMasterItem;
  openQty: number;
  openValuation: number;
  totalReceivedQty: number;
  totalReceivedVal: number;
  periodAvgInwardRate: number;
  autoBomUsedQty: number;
  bomCostVal: number;
  manualUsedQty: number;
  manualUsedVal: number;
  wastageQty: number;
  wastageVal: number;
  totalOutwardQty: number;
  totalOutwardVal: number;
  closingQty: number;
  valuationRate: number;
  closingValuation: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface ContinuousLedgerRow {
  id: string;
  date: string;
  refNo: string;
  itemId: number;
  item: string;
  category: string;
  uom: string;
  type: 'OPENING' | 'PURCHASE' | 'POS_BOM' | 'MANUAL_USED' | 'WASTAGE';
  typeLabel: string;
  inQty: number;
  inRate: number;
  inVal: number;
  outQty: number;
  outRate: number;
  outVal: number;
  balanceQty: number;
  valuationRate: number;
  balanceVal: number;
  notes: string;
}

export const InventoryReports: React.FC<SubReportProps> = ({ reportType }) => {
  const { data } = useRestaurant();

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRawItem, setSelectedRawItem] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [ledgerViewMode, setLedgerViewMode] = useState<'consolidated' | 'continuous'>(() => {
    return reportType === 'transactional' ? 'continuous' : 'consolidated';
  });
  const [outwardTypeFilter, setOutwardTypeFilter] = useState<'ALL' | 'BOM' | 'MANUAL' | 'WASTAGE'>('ALL');
  const isDailyStockReport = reportType === 'daily-stock' || reportType === 'daily-opening' || reportType === 'daily-closing';
  const [dailyViewMode, setDailyViewMode] = useState<'date-log' | 'item-sheet'>('date-log');
  const [stockFocusMode, setStockFocusMode] = useState<'combined' | 'opening-only' | 'closing-only'>(() => {
    if (reportType === 'daily-opening') return 'opening-only';
    if (reportType === 'daily-closing') return 'closing-only';
    return 'combined';
  });

  React.useEffect(() => {
    if (reportType === 'daily-opening') setStockFocusMode('opening-only');
    else if (reportType === 'daily-closing') setStockFocusMode('closing-only');
    else if (reportType === 'daily-stock') setStockFocusMode('combined');
  }, [reportType]);
  const [selectedDayLog, setSelectedDayLog] = useState<{
    date: string;
    formattedDate: string;
    dayName: string;
    openingValuation: number;
    purchasesVal: number;
    recipeCostVal: number;
    totalUsedVal: number;
    closingValuation: number;
    itemBreakdown: Array<{
      id: number;
      name: string;
      category: string;
      uom: string;
      openQty: number;
      openVal: number;
      inQty: number;
      inVal: number;
      usedQty: number;
      usedVal: number;
      closeQty: number;
      closeVal: number;
      rate: number;
    }>;
  } | null>(null);
  const [dayModalSearch, setDayModalSearch] = useState('');

  // Drilldown Modal State
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<RawMasterItem | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalTypeFilter, setModalTypeFilter] = useState<'ALL' | 'PURCHASE' | 'POS_BOM' | 'MANUAL_USED' | 'WASTAGE'>('ALL');

  // Date filter checker helper
  const matchesDate = (itemDate: string) => {
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // --- 1. INVENTORY INWARDS DATA (GRN / Purchases) ---
  const inwardsData = useMemo(() => {
    const rows: Array<{
      date: string;
      billNo: string;
      vendor: string;
      itemId: number;
      item: string;
      category: string;
      uom: string;
      qty: number;
      rate: number;
      total: number;
      paymentType: string;
    }> = [];

    data.purchases.forEach(p => {
      if (p.status === 'DRAFT') return;
      if (!matchesDate(p.date)) return;

      p.items.forEach(item => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
          p.billNo.toLowerCase().includes(query) ||
          p.vendor.toLowerCase().includes(query) ||
          item.item.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);

        if (matchesSearch) {
          rows.push({
            date: p.date,
            billNo: p.billNo,
            vendor: p.vendor,
            itemId: item.itemId,
            item: item.item,
            category: item.category,
            uom: item.uom,
            qty: item.qty,
            rate: item.rate,
            total: item.total,
            paymentType: p.paymentType
          });
        }
      });
    });

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.purchases, startDate, endDate, searchQuery]);

  // --- 2. INVENTORY OUTWARDS DATA (BOM Consumption from Sales + Manual Wastage) ---
  const outwardsData = useMemo(() => {
    const rows: Array<{
      date: string;
      refNo: string;
      source: string;
      type: 'BOM Consumption' | 'Manual Kitchen Usage' | 'Kitchen Wastage';
      itemId: number;
      item: string;
      category: string;
      uom: string;
      qty: number;
      rate: number;
      total: number;
    }> = [];

    // Outward 1: Sales Recipe BOM consumptions
    data.sales.forEach(sale => {
      if (!isSaleActive(sale)) return;
      if (!matchesDate(sale.date)) return;

      (sale.items || []).forEach(cartItem => {
        const menu = data.menuItems.find(m => m.id === cartItem.id);
        if (!menu || !menu.recipe) return;

        menu.recipe.forEach(ing => {
          const raw = data.masterItems.find(r => r.id === ing.rawItemId);
          if (!raw) return;

          const consumedQty = (Number(cartItem.qty) || 0) * (Number(ing.qty) || 0);
          const costRate = raw.defaultRate || 0;
          const totalVal = consumedQty * costRate;

          const query = searchQuery.toLowerCase();
          const matchesSearch = !searchQuery ||
            sale.invoiceNo.toLowerCase().includes(query) ||
            cartItem.name.toLowerCase().includes(query) ||
            raw.name.toLowerCase().includes(query) ||
            raw.category.toLowerCase().includes(query);

          if (matchesSearch) {
            rows.push({
              date: sale.date,
              refNo: sale.invoiceNo,
              source: `POS Sale: ${cartItem.name} (x${cartItem.qty})`,
              type: 'BOM Consumption',
              itemId: raw.id,
              item: raw.name,
              category: raw.category,
              uom: raw.uom,
              qty: parseFloat(consumedQty.toFixed(3)),
              rate: costRate,
              total: Math.round(totalVal)
            });
          }
        });
      });
    });

    // Outward 2 & 3: Manual Kitchen Usage & Kitchen Wastage (Accurately Separated)
    data.inventory.forEach(inv => {
      const raw = data.masterItems.find(r => r.id === inv.id);
      if (!raw) return;

      const rate = inv.rate || raw.defaultRate || 0;
      const mUsed = inv.manualUsed !== undefined ? Number(inv.manualUsed) : (Number(inv.used) || 0);
      const wUsed = Number(inv.wastage) || 0;

      const query = searchQuery.toLowerCase();
      const matchesRaw = !searchQuery ||
        raw.name.toLowerCase().includes(query) ||
        raw.category.toLowerCase().includes(query);

      // Separate Entry: Manual Kitchen Prep / Direct Cooking Usage
      if (mUsed > 0 && (matchesRaw || 'manual'.includes(query) || 'usage'.includes(query) || 'kitchen'.includes(query))) {
        rows.push({
          date: new Date().toISOString().split('T')[0],
          refNo: `USE-INV-${raw.id}`,
          source: `Kitchen Manual Prep / Bulk Usage`,
          type: 'Manual Kitchen Usage',
          itemId: raw.id,
          item: raw.name,
          category: raw.category,
          uom: raw.uom,
          qty: mUsed,
          rate: rate,
          total: Math.round(mUsed * rate)
        });
      }

      // Separate Entry: Kitchen Spoilage & Wastage Loss
      if (wUsed > 0 && (matchesRaw || 'wastage'.includes(query) || 'spoilage'.includes(query) || 'damage'.includes(query))) {
        rows.push({
          date: new Date().toISOString().split('T')[0],
          refNo: `WST-INV-${raw.id}`,
          source: `Kitchen Spoilage & Wastage Loss`,
          type: 'Kitchen Wastage',
          itemId: raw.id,
          item: raw.name,
          category: raw.category,
          uom: raw.uom,
          qty: wUsed,
          rate: rate,
          total: Math.round(wUsed * rate)
        });
      }
    });

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.sales, data.inventory, data.masterItems, data.menuItems, startDate, endDate, searchQuery]);

  // Filtered Outwards Data (Aware of outwardTypeFilter)
  const filteredOutwards = useMemo(() => {
    return outwardsData.filter(row => {
      if (outwardTypeFilter === 'BOM') return row.type === 'BOM Consumption';
      if (outwardTypeFilter === 'MANUAL') return row.type === 'Manual Kitchen Usage';
      if (outwardTypeFilter === 'WASTAGE') return row.type === 'Kitchen Wastage';
      return true;
    });
  }, [outwardsData, outwardTypeFilter]);

  // --- 3. EXACT STOCK VALUATION LEDGER (CONSOLIDATED ITEM-WISE & PERIOD-AWARE) ---
  const stockValuationData = useMemo(() => {
    const calculatedRows: StockValuationRow[] = data.masterItems.map(item => {
      const invRecord = data.inventory.find(x => x.id === item.id);
      const initialOpenQty = invRecord ? (Number(invRecord.open) || 0) : 0;
      const initialManualUsedQty = invRecord ? (invRecord.manualUsed !== undefined ? Number(invRecord.manualUsed) : (Number(invRecord.used) || 0)) : 0;
      const initialWastageQty = invRecord ? (Number(invRecord.wastage) || 0) : 0;

      let preReceivedQty = 0;
      let preReceivedVal = 0;
      let preBomUsedQty = 0;

      let inPeriodReceivedQty = 0;
      let inPeriodReceivedVal = 0;
      let inPeriodBomUsedQty = 0;

      let lifetimeReceivedQty = 0;
      let lifetimeReceivedVal = 0;

      // Purchase Inward records
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

      // Sales BOM Recipe consumption records
      data.sales.forEach(sale => {
        if (!isSaleActive(sale)) return;
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

      // Valuation Rate calculation (Weighted average rate of Opening Stock + Inward Purchases)
      const totalAvailableQty = initialOpenQty + lifetimeReceivedQty;
      const totalAvailableVal = (initialOpenQty * (Number(item.defaultRate) || 0)) + lifetimeReceivedVal;
      const weightedAvgRate = totalAvailableQty > 0 
        ? (totalAvailableVal / totalAvailableQty) 
        : (Number(item.defaultRate) || (invRecord && invRecord.rate ? Number(invRecord.rate) : 0));

      const valuationRate = weightedAvgRate;

      const periodAvgInwardRate = inPeriodReceivedQty > 0 
        ? (inPeriodReceivedVal / inPeriodReceivedQty) 
        : valuationRate;

      // Period-aware Opening Balance
      const effectiveOpenQty = startDate 
        ? Math.max(0, (initialOpenQty + preReceivedQty) - preBomUsedQty)
        : initialOpenQty;
      const openValuation = effectiveOpenQty * valuationRate;

      // Inward Purchases
      const totalReceivedQty = inPeriodReceivedQty;
      const totalReceivedVal = inPeriodReceivedVal;

      // Outward Consumptions
      const autoBomUsedQty = inPeriodBomUsedQty;
      const bomCostVal = autoBomUsedQty * valuationRate;

      const manualUsedQty = initialManualUsedQty;
      const manualUsedVal = manualUsedQty * valuationRate;

      const wastageQty = initialWastageQty;
      const wastageVal = wastageQty * valuationRate;

      const totalOutwardQty = autoBomUsedQty + manualUsedQty + wastageQty;
      const totalOutwardVal = bomCostVal + manualUsedVal + wastageVal;

      // Net Closing Position
      const closingQty = (effectiveOpenQty + totalReceivedQty) - totalOutwardQty;
      const closingValuation = Math.max(0, closingQty * valuationRate);

      let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (closingQty <= 0) status = 'OUT_OF_STOCK';
      else if (closingQty <= 5) status = 'LOW_STOCK';

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
        totalOutwardVal,
        closingQty,
        valuationRate,
        closingValuation,
        status
      };
    });

    // Apply Filter Criteria
    const filtered = calculatedRows.filter(row => {
      if (selectedRawItem !== 'ALL' && row.item.name !== selectedRawItem) return false;
      if (selectedCategory !== 'ALL' && row.item.category !== selectedCategory) return false;
      if (stockStatusFilter !== 'ALL' && row.status !== stockStatusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          row.item.name.toLowerCase().includes(q) ||
          row.item.category.toLowerCase().includes(q) ||
          row.item.vendor?.toLowerCase().includes(q) ||
          String(row.item.id).includes(q)
        );
      }
      return true;
    });

    // Compute Grand Summary Metrics
    const totalClosingVal = filtered.reduce((sum, r) => sum + r.closingValuation, 0);
    const totalOpeningVal = filtered.reduce((sum, r) => sum + r.openValuation, 0);
    const totalPurchasesVal = filtered.reduce((sum, r) => sum + r.totalReceivedVal, 0);
    const totalPurchasesQty = filtered.reduce((sum, r) => sum + r.totalReceivedQty, 0);
    const totalBomVal = filtered.reduce((sum, r) => sum + r.bomCostVal, 0);
    const totalBomQty = filtered.reduce((sum, r) => sum + r.autoBomUsedQty, 0);
    const totalWastageVal = filtered.reduce((sum, r) => sum + r.wastageVal, 0);
    const lowStockCount = filtered.filter(r => r.status === 'LOW_STOCK').length;
    const negativeStockCount = filtered.filter(r => r.status === 'OUT_OF_STOCK').length;

    return {
      rows: filtered,
      totalClosingVal,
      totalOpeningVal,
      totalPurchasesVal,
      totalPurchasesQty,
      totalBomVal,
      totalBomQty,
      totalWastageVal,
      lowStockCount,
      negativeStockCount
    };
  }, [
    data.masterItems, 
    data.inventory, 
    data.purchases, 
    data.sales, 
    data.menuItems, 
    startDate, 
    endDate, 
    selectedRawItem, 
    selectedCategory, 
    stockStatusFilter, 
    searchQuery
  ]);

  // --- 4. CONTINUOUS CHRONOLOGICAL TRANSACTIONAL MOVEMENT LEDGER (BIN CARD) ---
  const continuousLedgerData = useMemo(() => {
    const rawEvents: Array<{
      id: string;
      date: string;
      refNo: string;
      itemId: number;
      item: string;
      category: string;
      uom: string;
      type: 'OPENING' | 'PURCHASE' | 'POS_BOM' | 'WASTAGE';
      typeLabel: string;
      inQty: number;
      inRate: number;
      inVal: number;
      outQty: number;
      outRate: number;
      outVal: number;
      defaultRate: number;
      notes: string;
    }> = [];

    data.masterItems.forEach(raw => {
      if (selectedRawItem !== 'ALL' && raw.name !== selectedRawItem) return;
      if (selectedCategory !== 'ALL' && raw.category !== selectedCategory) return;

      const inv = data.inventory.find(i => i.id === raw.id);
      const opening = inv ? inv.open : 0;
      const rate = inv?.rate || raw.defaultRate || 0;

      // Event 1: Initial Opening Stock
      rawEvents.push({
        id: `open-${raw.id}`,
        date: '2026-08-01',
        refNo: `OPEN-${raw.id}`,
        itemId: raw.id,
        item: raw.name,
        category: raw.category,
        uom: raw.uom,
        type: 'OPENING',
        typeLabel: 'Opening Stock Balance',
        inQty: opening,
        inRate: rate,
        inVal: opening * rate,
        outQty: 0,
        outRate: 0,
        outVal: 0,
        defaultRate: rate,
        notes: 'Initial Stock Balance Carryforward'
      });

      // Event 2: Inward Purchases
      data.purchases.forEach(p => {
        if (p.status === 'DRAFT') return;
        const pDate = p.date ? p.date.split('T')[0] : '2026-08-01';
        p.items.forEach((pi, idx) => {
          if (pi.itemId === raw.id || pi.item.toLowerCase().trim() === raw.name.toLowerCase().trim()) {
            const q = Number(pi.qty) || 0;
            const r = Number(pi.rate) || rate;
            rawEvents.push({
              id: `pur-${p.id}-${idx}`,
              date: pDate,
              refNo: p.billNo || `VOUCHER-${p.id}`,
              itemId: raw.id,
              item: raw.name,
              category: raw.category,
              uom: raw.uom,
              type: 'PURCHASE',
              typeLabel: 'Inward Purchase (GRN)',
              inQty: q,
              inRate: r,
              inVal: q * r,
              outQty: 0,
              outRate: 0,
              outVal: 0,
              defaultRate: rate,
              notes: `Received from ${p.vendor} (${p.paymentType})`
            });
          }
        });
      });

      // Event 3: Sales Recipe BOM consumptions
      data.sales.forEach(s => {
        if (!isSaleActive(s)) return;
        const sDate = s.date ? s.date.split('T')[0] : '2026-08-01';
        (s.items || []).forEach((cartItem, sIdx) => {
          const menu = data.menuItems.find(m => m.id === cartItem.id);
          if (!menu?.recipe) return;
          menu.recipe.forEach((ing, iIdx) => {
            if (ing.rawItemId === raw.id) {
              const consumed = (Number(cartItem.qty) || 0) * (Number(ing.qty) || 0);
              rawEvents.push({
                id: `sale-${s.id}-${sIdx}-${iIdx}`,
                date: sDate,
                refNo: s.invoiceNo || `INV-${s.id}`,
                itemId: raw.id,
                item: raw.name,
                category: raw.category,
                uom: raw.uom,
                type: 'POS_BOM',
                typeLabel: 'POS Recipe BOM Consumed',
                inQty: 0,
                inRate: 0,
                inVal: 0,
                outQty: parseFloat(consumed.toFixed(3)),
                outRate: rate,
                outVal: consumed * rate,
                defaultRate: rate,
                notes: `POS Sold: ${cartItem.qty}x ${menu.name} (${ing.qty} ${raw.uom}/portion)`
              });
            }
          });
        });
      });

      const mUsed = inv ? (inv.manualUsed !== undefined ? Number(inv.manualUsed) : (Number(inv.used) || 0)) : 0;
      const wUsed = inv ? (Number(inv.wastage) || 0) : 0;

      // Event 4: Manual Kitchen Usage
      if (mUsed > 0) {
        rawEvents.push({
          id: `manual-use-${raw.id}`,
          date: new Date().toISOString().split('T')[0],
          refNo: `USE-INV-${raw.id}`,
          itemId: raw.id,
          item: raw.name,
          category: raw.category,
          uom: raw.uom,
          type: 'MANUAL_USED',
          typeLabel: 'Manual Kitchen Prep Usage',
          inQty: 0,
          inRate: 0,
          inVal: 0,
          outQty: mUsed,
          outRate: rate,
          outVal: mUsed * rate,
          defaultRate: rate,
          notes: 'Kitchen manual recipe & bulk food preparation'
        });
      }

      // Event 5: Kitchen Spoilage / Wastage
      if (wUsed > 0) {
        rawEvents.push({
          id: `waste-${raw.id}`,
          date: new Date().toISOString().split('T')[0],
          refNo: `WST-INV-${raw.id}`,
          itemId: raw.id,
          item: raw.name,
          category: raw.category,
          uom: raw.uom,
          type: 'WASTAGE',
          typeLabel: 'Kitchen Spoilage & Wastage Loss',
          inQty: 0,
          inRate: 0,
          inVal: 0,
          outQty: wUsed,
          outRate: rate,
          outVal: wUsed * rate,
          defaultRate: rate,
          notes: 'Kitchen spoilage, damage & physical adjustment'
        });
      }
    });

    // Sort chronologically
    rawEvents.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate Running Balance and Valuation per item
    const itemRunningQty: Record<number, number> = {};
    const itemTotalInQty: Record<number, number> = {};
    const itemTotalInVal: Record<number, number> = {};

    const ledgerWithBalance: ContinuousLedgerRow[] = rawEvents.map(e => {
      if (!itemRunningQty[e.itemId]) itemRunningQty[e.itemId] = 0;
      if (!itemTotalInQty[e.itemId]) itemTotalInQty[e.itemId] = 0;
      if (!itemTotalInVal[e.itemId]) itemTotalInVal[e.itemId] = 0;

      if (e.inQty > 0) {
        itemTotalInQty[e.itemId] += e.inQty;
        itemTotalInVal[e.itemId] += e.inVal;
      }

      const currentAvgRate = itemTotalInQty[e.itemId] > 0 
        ? (itemTotalInVal[e.itemId] / itemTotalInQty[e.itemId]) 
        : e.defaultRate;

      if (e.outQty > 0) {
        e.outRate = currentAvgRate;
        e.outVal = e.outQty * currentAvgRate;
      }

      itemRunningQty[e.itemId] += (e.inQty - e.outQty);
      const balanceQty = parseFloat(itemRunningQty[e.itemId].toFixed(3));
      const balanceVal = Math.round(balanceQty * currentAvgRate);

      return {
        ...e,
        balanceQty,
        valuationRate: Math.round(currentAvgRate),
        balanceVal
      };
    });

    // Filter by date & search query
    return ledgerWithBalance.filter(row => {
      if (!matchesDate(row.date)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        row.item.toLowerCase().includes(q) ||
        row.refNo.toLowerCase().includes(q) ||
        row.notes.toLowerCase().includes(q) ||
        row.typeLabel.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q)
      );
    });
  }, [
    data.masterItems, 
    data.inventory, 
    data.purchases, 
    data.sales, 
    data.menuItems, 
    selectedRawItem, 
    selectedCategory, 
    startDate, 
    endDate, 
    searchQuery
  ]);

  // --- 4.5 CHRONOLOGICAL DATE-WISE DAILY OPENING & CLOSING LOG DATA ---
  const dailyDateLogData = useMemo(() => {
    const itemRates = new Map<number, number>();
    const itemInitials = new Map<number, number>();
    data.masterItems.forEach(item => {
      const inv = data.inventory.find(i => i.id === item.id);
      const initOpen = inv ? Number(inv.open) || 0 : 0;
      const rate = inv?.rate || item.defaultRate || 0;
      itemRates.set(item.id, rate);
      itemInitials.set(item.id, initOpen);
    });

    const allDateSet = new Set<string>();
    const todayStr = new Date().toISOString().split('T')[0];
    allDateSet.add(todayStr);

    data.purchases.forEach(p => {
      if (p.status !== 'DRAFT' && p.date) {
        allDateSet.add(p.date.split('T')[0]);
      }
    });

    data.sales.forEach(s => {
      if (isSaleActive(s) && s.date) {
        allDateSet.add(s.date.split('T')[0]);
      }
    });

    const sortedDates = Array.from(allDateSet).sort();

    // Map purchases by date and raw item id
    const dayPurchases: Record<string, Record<number, { qty: number; val: number }>> = {};
    data.purchases.forEach(p => {
      if (p.status === 'DRAFT' || !p.date) return;
      const d = p.date.split('T')[0];
      if (!dayPurchases[d]) dayPurchases[d] = {};
      (p.items || []).forEach(pi => {
        const raw = data.masterItems.find(m => m.id === pi.itemId || m.name.toLowerCase().trim() === pi.item?.toLowerCase().trim());
        if (!raw) return;
        const q = Number(pi.qty) || 0;
        const r = Number(pi.rate) || (itemRates.get(raw.id) || 0);
        if (!dayPurchases[d][raw.id]) dayPurchases[d][raw.id] = { qty: 0, val: 0 };
        dayPurchases[d][raw.id].qty += q;
        dayPurchases[d][raw.id].val += q * r;
      });
    });

    // Map sales BOM recipe consumptions by date and raw item id
    const daySalesBom: Record<string, Record<number, { qty: number; val: number }>> = {};
    data.sales.forEach(s => {
      if (!isSaleActive(s) || !s.date) return;
      const d = s.date.split('T')[0];
      if (!daySalesBom[d]) daySalesBom[d] = {};
      (s.items || []).forEach(item => {
        const menuItem = data.menuItems.find(m => m.id === item.id);
        if (!menuItem?.recipe) return;
        menuItem.recipe.forEach(ing => {
          const raw = data.masterItems.find(m => m.id === ing.rawItemId);
          if (!raw) return;
          const used = (Number(ing.qty) || 0) * (Number(item.qty) || 0);
          const r = itemRates.get(raw.id) || 0;
          if (!daySalesBom[d][raw.id]) daySalesBom[d][raw.id] = { qty: 0, val: 0 };
          daySalesBom[d][raw.id].qty += used;
          daySalesBom[d][raw.id].val += used * r;
        });
      });
    });

    // Chronological simulation
    const runningStock = new Map<number, number>();
    data.masterItems.forEach(item => {
      runningStock.set(item.id, itemInitials.get(item.id) || 0);
    });

    const allDayLogs: Array<{
      date: string;
      formattedDate: string;
      dayName: string;
      isToday: boolean;
      openingValuation: number;
      purchasesQty: number;
      purchasesVal: number;
      recipeUsedQty: number;
      recipeCostVal: number;
      manualUsedQty: number;
      manualUsedVal: number;
      wastageQty: number;
      wastageVal: number;
      totalUsedVal: number;
      closingValuation: number;
      netChangeVal: number;
      itemBreakdown: Array<{
        id: number;
        name: string;
        category: string;
        uom: string;
        openQty: number;
        openVal: number;
        inQty: number;
        inVal: number;
        usedQty: number;
        usedVal: number;
        closeQty: number;
        closeVal: number;
        rate: number;
      }>;
    }> = [];

    sortedDates.forEach(d => {
      let dayOpenVal = 0;
      let dayPurchasesQty = 0;
      let dayPurchasesVal = 0;
      let dayRecipeUsedQty = 0;
      let dayRecipeCostVal = 0;
      let dayCloseVal = 0;

      const itemBreakdown: Array<{
        id: number;
        name: string;
        category: string;
        uom: string;
        openQty: number;
        openVal: number;
        inQty: number;
        inVal: number;
        usedQty: number;
        usedVal: number;
        closeQty: number;
        closeVal: number;
        rate: number;
      }> = [];

      data.masterItems.forEach(item => {
        const curOpen = runningStock.get(item.id) || 0;
        const rate = itemRates.get(item.id) || 0;
        dayOpenVal += (curOpen * rate);

        const inEvent = dayPurchases[d]?.[item.id] || { qty: 0, val: 0 };
        const bomEvent = daySalesBom[d]?.[item.id] || { qty: 0, val: 0 };

        dayPurchasesQty += inEvent.qty;
        dayPurchasesVal += inEvent.val;
        dayRecipeUsedQty += bomEvent.qty;
        dayRecipeCostVal += bomEvent.val;

        const curClose = curOpen + inEvent.qty - bomEvent.qty;
        runningStock.set(item.id, curClose);
        dayCloseVal += Math.max(0, curClose * rate);

        itemBreakdown.push({
          id: item.id,
          name: item.name,
          category: item.category,
          uom: item.uom,
          openQty: parseFloat(curOpen.toFixed(2)),
          openVal: Math.round(curOpen * rate),
          inQty: parseFloat(inEvent.qty.toFixed(2)),
          inVal: Math.round(inEvent.val),
          usedQty: parseFloat(bomEvent.qty.toFixed(2)),
          usedVal: Math.round(bomEvent.val),
          closeQty: parseFloat(curClose.toFixed(2)),
          closeVal: Math.round(Math.max(0, curClose * rate)),
          rate: Math.round(rate)
        });
      });

      const totalUsedVal = dayRecipeCostVal;
      const netChangeVal = dayPurchasesVal - totalUsedVal;

      const dateObj = new Date(d + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });

      allDayLogs.push({
        date: d,
        formattedDate,
        dayName,
        isToday: d === todayStr,
        openingValuation: Math.round(dayOpenVal),
        purchasesQty: parseFloat(dayPurchasesQty.toFixed(2)),
        purchasesVal: Math.round(dayPurchasesVal),
        recipeUsedQty: parseFloat(dayRecipeUsedQty.toFixed(2)),
        recipeCostVal: Math.round(dayRecipeCostVal),
        manualUsedQty: 0,
        manualUsedVal: 0,
        wastageQty: 0,
        wastageVal: 0,
        totalUsedVal: Math.round(totalUsedVal),
        closingValuation: Math.round(dayCloseVal),
        netChangeVal: Math.round(netChangeVal),
        itemBreakdown
      });
    });

    const filteredDays = allDayLogs.filter(day => {
      if (startDate && day.date < startDate) return false;
      if (endDate && day.date > endDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          day.date.includes(q) ||
          day.formattedDate.toLowerCase().includes(q) ||
          day.dayName.toLowerCase().includes(q)
        );
      }
      return true;
    }).reverse();

    const totalPeriodPurchasesVal = filteredDays.reduce((sum, d) => sum + d.purchasesVal, 0);
    const totalPeriodUsedVal = filteredDays.reduce((sum, d) => sum + d.totalUsedVal, 0);
    const latestClosingVal = filteredDays[0]?.closingValuation || (allDayLogs[allDayLogs.length - 1]?.closingValuation || 0);
    const latestOpeningVal = filteredDays[0]?.openingValuation || (allDayLogs[allDayLogs.length - 1]?.openingValuation || 0);
    const avgDailyClosingVal = filteredDays.length > 0 ? Math.round(filteredDays.reduce((sum, d) => sum + d.closingValuation, 0) / filteredDays.length) : 0;
    const avgDailyOpeningVal = filteredDays.length > 0 ? Math.round(filteredDays.reduce((sum, d) => sum + d.openingValuation, 0) / filteredDays.length) : 0;
    const avgDailyUsedVal = filteredDays.length > 0 ? Math.round(totalPeriodUsedVal / filteredDays.length) : 0;

    return {
      days: filteredDays,
      totalPeriodPurchasesVal,
      totalPeriodUsedVal,
      latestClosingVal,
      latestOpeningVal,
      avgDailyClosingVal,
      avgDailyOpeningVal,
      avgDailyUsedVal
    };
  }, [
    data.masterItems, 
    data.inventory, 
    data.purchases, 
    data.sales, 
    data.menuItems, 
    startDate, 
    endDate, 
    searchQuery
  ]);

  // --- 5. ITEM SPECIFIC LEDGER DRILLDOWN DATA FOR MODAL ---
  const modalItemLedgerEntries = useMemo(() => {
    if (!selectedLedgerItem) return [];

    const entries: ContinuousLedgerRow[] = continuousLedgerData.filter(
      e => e.itemId === selectedLedgerItem.id
    );

    return entries.filter(e => {
      if (modalTypeFilter !== 'ALL' && e.type !== modalTypeFilter) return false;
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase().trim();
        return (
          e.refNo.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q) ||
          e.date.includes(q)
        );
      }
      return true;
    });
  }, [selectedLedgerItem, continuousLedgerData, modalTypeFilter, modalSearch]);

  // --- CSV EXPORT HANDLERS ---
  const handleExportDailyStockLog = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (stockFocusMode === 'opening-only') {
      headers = ['Date', 'Day', 'Opening Stock Value (৳)', 'Monitored Items'];
      rows = dailyDateLogData.days.map(d => [
        d.date,
        d.dayName,
        d.openingValuation,
        data.masterItems.length
      ]);
      exportCsvHelper('daily_opening_stock_report', headers, rows);
    } else if (stockFocusMode === 'closing-only') {
      headers = ['Date', 'Day', 'Closing Stock Value (৳)', 'Monitored Items'];
      rows = dailyDateLogData.days.map(d => [
        d.date,
        d.dayName,
        d.closingValuation,
        data.masterItems.length
      ]);
      exportCsvHelper('daily_closing_stock_report', headers, rows);
    } else {
      headers = ['Date', 'Day', 'Opening Stock Value (৳)', 'Closing Stock Value (৳)'];
      rows = dailyDateLogData.days.map(d => [
        d.date,
        d.dayName,
        d.openingValuation,
        d.closingValuation
      ]);
      exportCsvHelper('daily_opening_closing_stock_report', headers, rows);
    }
  };

  const handleExportInwards = () => {
    const headers = ['Date', 'Bill No', 'Vendor', 'Raw Item', 'Category', 'Quantity', 'UoM', 'Unit Rate (৳)', 'Total Value (৳)', 'Payment Type'];
    const rows = inwardsData.map(r => [
      r.date,
      r.billNo,
      r.vendor,
      r.item,
      r.category,
      r.qty,
      r.uom,
      r.rate,
      r.total,
      r.paymentType
    ]);
    exportCsvHelper('inventory_inwards_report', headers, rows);
  };

  const handleExportOutwards = () => {
    const headers = ['Date', 'Ref No', 'Source / Order', 'Type', 'Raw Material', 'Category', 'Outward Qty', 'UoM', 'Unit Cost (৳)', 'Total Value (৳)'];
    const rows = filteredOutwards.map(r => [
      r.date,
      r.refNo,
      r.source,
      r.type,
      r.item,
      r.category,
      r.qty,
      r.uom,
      r.rate,
      r.total
    ]);
    exportCsvHelper('inventory_outward_report', headers, rows);
  };

  const handleExportStockValuationLedger = () => {
    if (ledgerViewMode === 'consolidated') {
      const headers = [
        'Item Code',
        'Raw Material Name',
        'Category',
        'UoM',
        'Opening Stock Qty',
        'Opening Stock Val (৳)',
        'Inward Received Qty',
        'Inward Purchase Val (৳)',
        'Inward Avg Rate (৳)',
        'Auto BOM Used Qty',
        'Auto BOM Cost Val (৳)',
        'Manual Wastage Qty',
        'Closing Stock Qty',
        'Valuation Rate (৳)',
        'Closing Stock Valuation (৳)',
        'Stock Health Status'
      ];
      const rows = stockValuationData.rows.map(r => [
        r.item.id,
        r.item.name,
        r.item.category,
        r.item.uom,
        r.openQty.toFixed(2),
        Math.round(r.openValuation),
        r.totalReceivedQty.toFixed(2),
        Math.round(r.totalReceivedVal),
        Math.round(r.periodAvgInwardRate),
        r.autoBomUsedQty.toFixed(2),
        Math.round(r.bomCostVal),
        r.manualUsedQty.toFixed(2),
        r.closingQty.toFixed(2),
        Math.round(r.valuationRate),
        Math.round(r.closingValuation),
        r.status
      ]);
      exportCsvHelper('stock_valuation_ledger_consolidated', headers, rows);
    } else {
      const headers = [
        'Date',
        'Document / Voucher Ref',
        'Raw Material',
        'Category',
        'Movement Type',
        'Inward Qty',
        'Inward Rate (৳)',
        'Inward Value (৳)',
        'Outward Qty',
        'Outward Rate (৳)',
        'Outward Value (৳)',
        'Running Balance Qty',
        'UoM',
        'Valuation Rate (৳)',
        'Running Valuation (৳)',
        'Notes / Particulars'
      ];
      const rows = continuousLedgerData.map(r => [
        r.date,
        r.refNo,
        r.item,
        r.category,
        r.typeLabel,
        r.inQty,
        r.inRate,
        r.inVal,
        r.outQty,
        r.outRate,
        r.outVal,
        r.balanceQty,
        r.uom,
        r.valuationRate,
        r.balanceVal,
        r.notes
      ]);
      exportCsvHelper('stock_valuation_continuous_ledger', headers, rows);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. INVENTORY INWARDS REPORT */}
      {reportType === 'inwards' && (
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
            searchPlaceholder="Search vendor, bill no, raw item, category..."
            totalRecords={inwardsData.length}
            onExportCsv={handleExportInwards}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
            }}
          />

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>Total Inward Value</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ৳{inwardsData.reduce((s, r) => s + r.total, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Gross stock value received into warehouse
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>Inward Entries Count</span>
                <Boxes className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {inwardsData.length} lines
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Individual raw material receipts
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                <span>Total Inward Quantity</span>
                <Package className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {inwardsData.reduce((s, r) => s + r.qty, 0).toLocaleString()} units
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Total aggregate raw materials received
              </div>
            </div>
          </div>

          {/* Inwards Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>Inventory Inwards Register (GRN Inward Receipts)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Detailed raw material procurement logs by supplier and bill</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Bill No</th>
                    <th className="py-3 px-4">Vendor / Supplier</th>
                    <th className="py-3 px-4">Raw Material</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Inward Qty</th>
                    <th className="py-3 px-4 text-right">Rate (৳)</th>
                    <th className="py-3 px-4 text-right">Total (৳)</th>
                    <th className="py-3 px-4 text-center">Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inwardsData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                        No inventory inward records found matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    inwardsData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-600">{row.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.billNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{row.vendor}</td>
                        <td className="py-3 px-4 font-extrabold text-teal-900">{row.item}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                          {row.qty} <span className="text-[10px] text-slate-400 font-normal">{row.uom}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">৳{row.rate}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          ৳{row.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.paymentType === 'CASH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.paymentType}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {inwardsData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={5} className="py-3 px-4">Total Inventory Inwards</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900">
                        {inwardsData.reduce((s, r) => s + r.qty, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        ৳{inwardsData.reduce((s, r) => s + r.total, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. INVENTORY OUTWARDS REPORT */}
      {reportType === 'outwards' && (
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
            searchPlaceholder="Search invoice, dish name, raw ingredient..."
            totalRecords={outwardsData.length}
            onExportCsv={handleExportOutwards}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
            }}
          />

          {/* Summary Metric Highlights */}
          {(() => {
            const totalOutwardVal = filteredOutwards.reduce((s, r) => s + r.total, 0);
            const totalOutwardQty = filteredOutwards.reduce((s, r) => s + r.qty, 0);
            const bomCostVal = outwardsData.filter(r => r.type === 'BOM Consumption').reduce((s, r) => s + r.total, 0);
            const manualCostVal = outwardsData.filter(r => r.type === 'Manual Kitchen Usage').reduce((s, r) => s + r.total, 0);
            const wastageCostVal = outwardsData.filter(r => r.type === 'Kitchen Wastage').reduce((s, r) => s + r.total, 0);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>Total Outwards Value</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                    ৳{totalOutwardVal.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {totalOutwardQty.toFixed(2)} units ({filteredOutwards.length} records)
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>BOM Recipe Sales Cost</span>
                    <Package className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                    ৳{bomCostVal.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Auto-deducted from POS Sales
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>Manual Kitchen Prep Cost</span>
                    <ChefHat className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                    ৳{manualCostVal.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Direct bulk prep & food usage
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>Kitchen Wastage Loss</span>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                    ৳{wastageCostVal.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Spoilage, damage & trimming losses
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Outwards Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>Inventory Outwards Register (BOM Sales Usage, Manual Prep & Wastage)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Live raw material deductions linked to POS menu sales, manual bulk preparation, and kitchen spoilage</p>
              </div>

              {/* Type Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                {(['ALL', 'BOM', 'MANUAL', 'WASTAGE'] as const).map(tab => {
                  const count = tab === 'ALL'
                    ? outwardsData.length
                    : tab === 'BOM'
                      ? outwardsData.filter(r => r.type === 'BOM Consumption').length
                      : tab === 'MANUAL'
                        ? outwardsData.filter(r => r.type === 'Manual Kitchen Usage').length
                        : outwardsData.filter(r => r.type === 'Kitchen Wastage').length;
                  const label = tab === 'ALL' 
                    ? `All Outwards (${count})` 
                    : tab === 'BOM' 
                      ? `BOM Sales (${count})` 
                      : tab === 'MANUAL' 
                        ? `Manual Prep (${count})` 
                        : `Wastage (${count})`;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setOutwardTypeFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        outwardTypeFilter === tab
                          ? 'bg-[#004b9b] text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Ref / Order No</th>
                    <th className="py-3 px-4">Source / Context</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Raw Ingredient</th>
                    <th className="py-3 px-4 text-right">Outward Qty</th>
                    <th className="py-3 px-4 text-right">Cost Rate (৳)</th>
                    <th className="py-3 px-4 text-right">Total Cost (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOutwards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        No inventory outward consumption records found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOutwards.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-600">{row.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.refNo}</td>
                        <td className="py-3 px-4 font-medium text-slate-700">{row.source}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            row.type === 'BOM Consumption' 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : row.type === 'Manual Kitchen Usage'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{row.item}</td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-700">
                          -{row.qty} <span className="text-[10px] text-slate-400 font-normal">{row.uom}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">৳{row.rate}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                          ৳{row.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredOutwards.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={5} className="py-3 px-4">Total Filtered Outward Valuation</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-800">
                        -{filteredOutwards.reduce((s, r) => s + r.qty, 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                        ৳{filteredOutwards.reduce((s, r) => s + r.total, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* 3. EXACT STOCK VALUATION LEDGER (DAILY OPENING & CLOSING REPORT / TRANSACTIONAL LEDGER) */}
      {(isDailyStockReport || reportType === 'transactional') && (
        <>
          {/* Top Mode Toggle & Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
                {stockFocusMode === 'opening-only' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : stockFocusMode === 'closing-only' ? (
                  <Moon className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Boxes className="w-5 h-5 text-teal-600" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>
                    {!isDailyStockReport
                      ? 'Stock Valuation & Transactional Ledger'
                      : stockFocusMode === 'opening-only'
                      ? 'Daily Opening Stock Report (দৈনিক প্রারম্ভিক স্টক রিপোর্ট)'
                      : stockFocusMode === 'closing-only'
                      ? 'Daily Closing Stock Report (দৈনিক সমাপনী স্টক রিপোর্ট)'
                      : 'Daily Opening & Closing Stock Report'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                    {stockFocusMode === 'opening-only' ? 'Morning Asset' : stockFocusMode === 'closing-only' ? 'Store Closing Asset' : 'Opening & Closing'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {!isDailyStockReport
                    ? 'Complete opening stock, inward procurement, recipe BOM outward & net valuation ledger'
                    : stockFocusMode === 'opening-only'
                    ? 'Day-by-day morning opening stock balances and initial physical store asset valuation'
                    : stockFocusMode === 'closing-only'
                    ? 'Day-by-day end-of-day store closing balances and physical store inventory asset valuation'
                    : 'Complete date-wise opening stock and end-of-day closing balance valuation'}
                </p>
              </div>
            </div>

            {/* View Mode & Stock Focus Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {isDailyStockReport && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStockFocusMode('combined')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      stockFocusMode === 'combined'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="দুটোই একসাথে দেখুন"
                  >
                    <Boxes className="w-3.5 h-3.5 text-teal-600" />
                    <span>Combined (উভয়)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockFocusMode('opening-only')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      stockFocusMode === 'opening-only'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="শুধু ওপেনিং স্টক দেখুন"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Opening Only (ওপেনিং)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockFocusMode('closing-only')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      stockFocusMode === 'closing-only'
                        ? 'bg-slate-900 text-amber-400 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="শুধু ক্লোজিং স্টক দেখুন"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Closing Only (ক্লোজিং)</span>
                  </button>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                {isDailyStockReport ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDailyViewMode('date-log')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        dailyViewMode === 'date-log'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>Date-wise Daily Log (তারিখ ভিত্তিক)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyViewMode('item-sheet')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        dailyViewMode === 'item-sheet'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Item-wise Stock Sheet (আইটেম ভিত্তিক)</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setLedgerViewMode('consolidated')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        ledgerViewMode === 'consolidated'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>Consolidated Valuation Ledger</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerViewMode('continuous')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        ledgerViewMode === 'continuous'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Continuous Movement Ledger</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* VIEW A: DATE-WISE DAILY LOG (When in daily stock report and date-log mode) */}
          {isDailyStockReport && dailyViewMode === 'date-log' ? (
            <div className="space-y-4">
              {/* 4 Summary Cards for Daily Stock Log (Focus strictly on Opening & Closing Asset) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Today's / Latest Opening Stock */}
                <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
                  stockFocusMode === 'opening-only'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div>
                    <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wide ${
                      stockFocusMode === 'opening-only' ? 'text-amber-100' : 'text-slate-500'
                    }`}>
                      <span>Morning Opening Stock</span>
                      <Sun className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className={`text-2xl font-black mt-2 font-mono ${
                      stockFocusMode === 'opening-only' ? 'text-white' : 'text-teal-700'
                    }`}>
                      ৳ {Math.round(dailyDateLogData.latestOpeningVal).toLocaleString()}
                    </div>
                  </div>
                  <div className={`text-[11px] mt-2 pt-2 border-t flex items-center justify-between ${
                    stockFocusMode === 'opening-only' ? 'border-amber-400 text-amber-100' : 'border-slate-100 text-slate-500'
                  }`}>
                    <span>Day Start Asset Valuation</span>
                    <span className="font-bold font-mono">{data.masterItems.length} Items</span>
                  </div>
                </div>

                {/* Card 2: Today's / Latest Closing Stock */}
                <div className={`p-4 rounded-2xl shadow-xs flex flex-col justify-between ${
                  stockFocusMode === 'closing-only'
                    ? 'bg-slate-950 text-white border border-slate-800'
                    : stockFocusMode === 'opening-only'
                    ? 'bg-white border border-slate-200 text-slate-900'
                    : 'bg-slate-900 text-white'
                }`}>
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wide">
                      <span>Latest Closing Stock</span>
                      <Moon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
                      ৳ {Math.round(dailyDateLogData.latestClosingVal).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span>Store Closing Asset Valuation</span>
                    <span className="font-bold text-amber-300 font-mono">{data.masterItems.length} Items</span>
                  </div>
                </div>

                {/* Card 3: Total Monitored Master Raw Materials */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                      <span>Monitored Raw Materials</span>
                      <Boxes className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-indigo-700 mt-2 font-mono">
                      {data.masterItems.length} <span className="text-xs font-normal text-slate-500">Master SKUs</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>Active items tracked in inventory</span>
                  </div>
                </div>

                {/* Card 4: Average Daily Stock Valuation */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                      <span>Avg Daily Stock Value</span>
                      <Calendar className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="text-2xl font-black text-teal-700 mt-2 font-mono">
                      ৳ {Math.round(stockFocusMode === 'opening-only' ? dailyDateLogData.avgDailyOpeningVal : dailyDateLogData.avgDailyClosingVal).toLocaleString()} <span className="text-xs font-normal text-slate-500">/ Day</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span>Across {dailyDateLogData.days.length} Recorded Days</span>
                  </div>
                </div>
              </div>

              {/* Date Filters for Daily Date Log */}
              <ReportFilters
                datePreset={datePreset}
                setDatePreset={setDatePreset}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search date or day (e.g. 2026-11, Nov, Thu)..."
                totalRecords={dailyDateLogData.days.length}
                onExportCsv={handleExportDailyStockLog}
                onPrint={() => window.print()}
                onResetFilters={() => {
                  setDatePreset('all');
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                }}
              />

              {/* Date-wise Daily Movement Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span>
                        {stockFocusMode === 'opening-only'
                          ? 'Date-wise Daily Opening Stock History'
                          : stockFocusMode === 'closing-only'
                          ? 'Date-wise Daily Closing Stock History'
                          : 'Date-by-Date Opening & Closing Stock History'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {stockFocusMode === 'opening-only'
                        ? 'Chronological morning opening stock valuation records per day'
                        : stockFocusMode === 'closing-only'
                        ? 'Chronological end-of-day store closing valuation records per day'
                        : 'Chronological daily record of morning opening stock and end-of-day closing valuation'}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                    {dailyDateLogData.days.length} Days Recorded
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-200 text-[11px]">
                        <th className="py-2.5 px-3 font-bold">Date & Day (তারিখ)</th>
                        {stockFocusMode !== 'closing-only' && (
                          <th className="py-2.5 px-3 font-bold text-right text-teal-300">Opening Stock (৳)</th>
                        )}
                        {stockFocusMode !== 'opening-only' && (
                          <th className="py-2.5 px-3 font-bold text-right text-amber-300">Closing Stock (৳)</th>
                        )}
                        {(stockFocusMode === 'opening-only' || stockFocusMode === 'closing-only') && (
                          <th className="py-2.5 px-3 font-bold text-center text-slate-300">Monitored Items</th>
                        )}
                        <th className="py-2.5 px-3 font-bold text-center">Day Item Sheet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {dailyDateLogData.days.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 font-medium font-sans">
                            No daily stock records found for the selected period.
                          </td>
                        </tr>
                      ) : (
                        dailyDateLogData.days.map(d => (
                          <tr key={d.date} className="hover:bg-teal-50/40 transition">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm font-mono">
                                  {d.formattedDate}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-sans">
                                  {d.dayName}
                                </span>
                                {d.isToday && (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans">
                                    Today
                                  </span>
                                )}
                              </div>
                            </td>

                            {stockFocusMode !== 'closing-only' && (
                              <td className="py-3 px-3 text-right font-bold text-slate-800">
                                ৳ {d.openingValuation.toLocaleString()}
                              </td>
                            )}

                            {stockFocusMode !== 'opening-only' && (
                              <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                                ৳ {d.closingValuation.toLocaleString()}
                              </td>
                            )}

                            {(stockFocusMode === 'opening-only' || stockFocusMode === 'closing-only') && (
                              <td className="py-3 px-3 text-center text-slate-600 font-sans font-bold">
                                {data.masterItems.length} SKUs
                              </td>
                            )}

                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedDayLog(d)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer font-sans"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-600" />
                                <span>
                                  {stockFocusMode === 'opening-only'
                                    ? 'View Opening Items'
                                    : stockFocusMode === 'closing-only'
                                    ? 'View Closing Items'
                                    : 'View Items'}
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {dailyDateLogData.days.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-mono text-xs">
                          <td className="py-3 px-3 font-bold font-sans">
                            {stockFocusMode === 'opening-only'
                              ? 'Period Opening Valuation'
                              : stockFocusMode === 'closing-only'
                              ? 'Latest Closing Valuation'
                              : 'Period Summary'}
                          </td>
                          {stockFocusMode !== 'closing-only' && (
                            <td className="py-3 px-3 text-right font-bold text-teal-300">
                              ৳ {(dailyDateLogData.days[dailyDateLogData.days.length - 1]?.openingValuation || 0).toLocaleString()}
                            </td>
                          )}
                          {stockFocusMode !== 'opening-only' && (
                            <td className="py-3 px-3 text-right font-bold text-amber-400 text-sm">
                              ৳ {(dailyDateLogData.days[0]?.closingValuation || 0).toLocaleString()}
                            </td>
                          )}
                          {(stockFocusMode === 'opening-only' || stockFocusMode === 'closing-only') && (
                            <td className="py-3 px-3 text-center font-bold text-slate-300 font-sans">
                              {data.masterItems.length} Active Items
                            </td>
                          )}
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div>
          {/* 5 Summary Valuation KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Opening Stock Valuation */}
            <div className="p-4 rounded-2xl bg-slate-800 text-white shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wide">
                  <span>Opening Stock Valuation</span>
                  <Calendar className="w-4 h-4 text-teal-300" />
                </div>
                <div className="text-2xl font-black text-teal-300 mt-2 font-mono">
                  ৳ {Math.round(stockValuationData.totalOpeningVal).toLocaleString()}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-700 flex items-center justify-between">
                <span>Period-Start Asset Value</span>
                <span className="font-bold text-teal-200 font-mono">{stockValuationData.rows.length} Items</span>
              </div>
            </div>

            {/* 2. Inward Purchases */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>Inward Purchases (+)</span>
                  <ArrowDownRight className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
                  ৳ {Math.round(stockValuationData.totalPurchasesVal).toLocaleString()}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Received Quantity</span>
                <span className="font-bold text-blue-700 font-mono">+{stockValuationData.totalPurchasesQty.toFixed(1)} Units</span>
              </div>
            </div>

            {/* 3. Auto Recipe BOM Cost */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>POS Recipe Used (-)</span>
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-600 mt-2 font-mono">
                  ৳ {Math.round(stockValuationData.totalBomVal).toLocaleString()}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Via POS Sales</span>
                <span className="font-bold text-amber-700 font-mono">-{stockValuationData.totalBomQty.toFixed(1)} Units</span>
              </div>
            </div>

            {/* 4. Wastage & Alerts */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                  <span>Wastage & Loss (-)</span>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-rose-700 mt-2 font-mono">
                  ৳ {Math.round(stockValuationData.totalWastageVal).toLocaleString()}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Alerts in Storeroom</span>
                <span className="font-bold text-rose-600">
                  {stockValuationData.lowStockCount} Low / {stockValuationData.negativeStockCount} Negative
                </span>
              </div>
            </div>

            {/* 5. Closing Stock Valuation */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wide">
                  <span>Closing Stock Valuation</span>
                  <Boxes className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
                  ৳ {Math.round(stockValuationData.totalClosingVal).toLocaleString()}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span>Total On-Hand Asset Value</span>
                <span className="font-bold text-amber-300 font-mono">{stockValuationData.rows.length} Items</span>
              </div>
            </div>
          </div>

          {/* Master Filters for Stock Valuation Ledger */}
          <ReportFilters
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search raw item name, category, code, vendor..."
            totalRecords={ledgerViewMode === 'consolidated' ? stockValuationData.rows.length : continuousLedgerData.length}
            onExportCsv={handleExportStockValuationLedger}
            onPrint={() => window.print()}
            onResetFilters={() => {
              setDatePreset('all');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
              setSelectedRawItem('ALL');
              setSelectedCategory('ALL');
              setStockStatusFilter('ALL');
            }}
            topRightControl={
              /* 1: Raw Item Selector Dropdown (Row 2 right) */
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-72">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Item:</span>
                <select
                  value={selectedRawItem}
                  onChange={(e) => setSelectedRawItem(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none truncate cursor-pointer"
                >
                  <option value="ALL">All Master Items</option>
                  {data.masterItems.map(item => (
                    <option key={item.id} value={item.name}>{item.name} ({item.uom})</option>
                  ))}
                </select>
              </div>
            }
            bottomControl={
              /* 3: Stock Status Filter (Row 4 right) */
              ledgerViewMode === 'consolidated' ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-72">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
                  <select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value as any)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none truncate cursor-pointer"
                  >
                    <option value="ALL">All Levels</option>
                    <option value="IN_STOCK">In Stock (&gt; 5)</option>
                    <option value="LOW_STOCK">Low Stock (≤ 5)</option>
                    <option value="OUT_OF_STOCK">Zero/Negative (≤ 0)</option>
                  </select>
                </div>
              ) : undefined
            }
          >
            {/* 2: Category Filter (Row 3 right, beside Filters: icon) */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-72">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Cat:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none truncate cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {data.purchaseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </ReportFilters>

          {/* VIEW 1: CONSOLIDATED STOCK VALUATION LEDGER TABLE */}
          {ledgerViewMode === 'consolidated' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>Item-Wise Stock Valuation Ledger (Consolidated Asset Register)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Period: <span className="font-bold text-slate-900">{startDate || 'Genesis'}</span> to <span className="font-bold text-slate-900">{endDate || 'Latest'}</span> | Opening, Inward Procurement, Outward Usage & Closing Stock Valuation
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                  {stockValuationData.rows.length} Items Listed
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-200 text-[11px]">
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
                  <tbody className="divide-y divide-slate-100">
                    {stockValuationData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                          No stock valuation records match the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      stockValuationData.rows.map(row => {
                        const getStatusBadge = () => {
                          if (row.closingQty <= 0) {
                            return (
                              <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-rose-100 text-rose-800 border border-rose-300">
                                {row.closingQty.toFixed(2)} (Out)
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
                          <tr key={row.item.id} className="hover:bg-slate-50/80 transition">
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
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              <div className="font-bold text-slate-800">{row.openQty.toFixed(2)}</div>
                              <div className="text-[10px] text-slate-400">৳{Math.round(row.openValuation).toLocaleString()}</div>
                            </td>

                            {/* Inward Purchases (+) */}
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              <div className="font-bold text-blue-600">+{row.totalReceivedQty.toFixed(2)}</div>
                              <div className="text-[10px] text-blue-500">৳{Math.round(row.totalReceivedVal).toLocaleString()}</div>
                            </td>

                            {/* POS Recipe Used (-) */}
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              <div className="font-bold text-amber-700">-{row.autoBomUsedQty.toFixed(2)}</div>
                              <div className="text-[10px] text-amber-600">৳{Math.round(row.bomCostVal).toLocaleString()}</div>
                            </td>

                            {/* Manual Used (-) */}
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              <div className="font-bold text-orange-600">-{row.manualUsedQty.toFixed(2)}</div>
                              <div className="text-[10px] text-orange-500">৳{Math.round(row.manualUsedVal).toLocaleString()}</div>
                            </td>

                            {/* Wastage (-) */}
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              <div className="font-bold text-rose-600">-{row.wastageQty.toFixed(2)}</div>
                              <div className="text-[10px] text-rose-500">৳{Math.round(row.wastageVal).toLocaleString()}</div>
                            </td>

                            {/* Closing Balance On Hand */}
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              {getStatusBadge()}
                            </td>

                            {/* Avg Rate */}
                            <td className="py-2.5 px-2.5 text-right font-mono">
                              <div className="font-bold text-slate-800 text-xs">৳{Math.round(row.valuationRate)}</div>
                            </td>

                            {/* Total Stock Value */}
                            <td className="py-2.5 px-3 text-right font-mono">
                              <div className="font-black text-indigo-900 text-xs sm:text-sm">
                                ৳ {Math.round(row.closingValuation).toLocaleString()}
                              </div>
                            </td>

                            {/* Action: Ledger Drilldown */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedLedgerItem(row.item)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1 mx-auto transition cursor-pointer"
                                title="Open Detailed Stock Ledger Statement"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ledger</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {stockValuationData.rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                        <td colSpan={2} className="py-3 px-3 uppercase tracking-wider text-amber-400">
                          TOTAL VALUATION
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-slate-200">
                          ৳{Math.round(stockValuationData.totalOpeningVal).toLocaleString()}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-blue-300">
                          ৳{Math.round(stockValuationData.totalPurchasesVal).toLocaleString()}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-amber-300">
                          ৳{Math.round(stockValuationData.totalBomVal).toLocaleString()}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-rose-300">
                          ৳{Math.round(stockValuationData.totalWastageVal).toLocaleString()}
                        </td>
                        <td className="py-3 px-2.5"></td>
                        <td className="py-3 px-2.5"></td>
                        <td className="py-3 px-3 text-right font-mono text-amber-400 text-xs sm:text-sm">
                          ৳ {Math.round(stockValuationData.totalClosingVal).toLocaleString()}
                        </td>
                        <td className="py-3 px-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: CONTINUOUS TRANSACTIONAL MOVEMENT LEDGER (BIN CARD) */}
          {ledgerViewMode === 'continuous' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span>Continuous Stock Movement Ledger & Transactional Bin Card</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Item-by-item chronological audit trail with live Inwards, Outward BOM sales usage, running balances & valuations
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                  {continuousLedgerData.length} Events Logged
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5">Doc / Ref No</th>
                      <th className="py-3 px-3.5">Raw Material</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3 text-right text-emerald-700">In Qty</th>
                      <th className="py-3 px-3 text-right text-rose-700">Out Qty</th>
                      <th className="py-3 px-3 text-right bg-slate-100/70 font-black text-slate-900">Running Stock</th>
                      <th className="py-3 px-2.5 text-right">Rate (৳)</th>
                      <th className="py-3 px-3.5 text-right font-black text-teal-800">Valuation (৳)</th>
                      <th className="py-3 px-4">Notes / Particulars</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {continuousLedgerData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                          No transactional ledger entries found for the selected raw item and date window.
                        </td>
                      </tr>
                    ) : (
                      continuousLedgerData.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3.5 font-mono text-slate-600">{row.date}</td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">{row.refNo}</td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-800">
                            {row.item} <span className="text-[10px] text-slate-400 font-normal">({row.category})</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              row.type === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                              row.type === 'OPENING' ? 'bg-slate-100 text-slate-800' :
                              row.type === 'POS_BOM' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {row.typeLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {row.inQty > 0 ? `+${row.inQty}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            {row.outQty > 0 ? `-${row.outQty}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-100/50">
                            {row.balanceQty} <span className="text-[10px] text-slate-400 font-normal">{row.uom}</span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-slate-700">৳{row.valuationRate}</td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-black text-teal-800">
                            ৳{row.balanceVal.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-xs">{row.notes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
          )}

          {/* ITEM STOCK LEDGER DRILLDOWN MODAL */}
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
                        value={modalSearch}
                        onChange={e => setModalSearch(e.target.value)}
                        placeholder="Search voucher, invoice or dish..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <select
                      value={modalTypeFilter}
                      onChange={e => setModalTypeFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Transactions</option>
                      <option value="PURCHASE">Inward Purchases</option>
                      <option value="POS_BOM">POS Recipe BOM Used</option>
                      <option value="MANUAL_USED">Manual Kitchen Prep Used</option>
                      <option value="WASTAGE">Kitchen Spoilage & Wastage</option>
                    </select>
                  </div>

                  <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    UOM: <span className="text-indigo-700 font-bold">{selectedLedgerItem.uom}</span> | Default Rate: <span className="text-indigo-700 font-bold">৳{selectedLedgerItem.defaultRate}</span>
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
                        <th className="py-2.5 px-2.5 font-bold text-right text-blue-300">Inward Qty (+)</th>
                        <th className="py-2.5 px-2.5 font-bold text-right text-amber-300">Outward Qty (-)</th>
                        <th className="py-2.5 px-3 font-bold text-right text-white">Running Stock</th>
                        <th className="py-2.5 px-3 font-bold text-right text-amber-400">Balance Value (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {modalItemLedgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                            No transactions found for this item in the selected period.
                          </td>
                        </tr>
                      ) : (
                        modalItemLedgerEntries.map((entry, idx) => (
                          <tr key={entry.id || idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {entry.date}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  entry.type === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                                  entry.type === 'OPENING' ? 'bg-slate-100 text-slate-700' :
                                  entry.type === 'POS_BOM' ? 'bg-indigo-100 text-indigo-800' :
                                  entry.type === 'MANUAL_USED' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {entry.type === 'MANUAL_USED' ? 'MANUAL' : entry.type}
                                </span>
                                <span className="font-mono text-slate-700 font-bold">{entry.refNo}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                              {entry.notes}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-bold text-blue-700">
                              {entry.inQty > 0 ? `+${entry.inQty.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-700">
                              {entry.outQty > 0 ? `-${entry.outQty.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                              {entry.balanceQty.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">
                              ৳ {Math.round(entry.balanceVal).toLocaleString()}
                            </td>
                          </tr>
                        ))
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

          {/* DAY ITEMIZED BREAKDOWN MODAL */}
          {selectedDayLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
                      {stockFocusMode === 'opening-only' ? (
                        <Sun className="w-5 h-5 text-amber-500" />
                      ) : stockFocusMode === 'closing-only' ? (
                        <Moon className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Calendar className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                        <span>
                          {stockFocusMode === 'opening-only'
                            ? `Day Opening Stock Sheet: ${selectedDayLog.formattedDate} (${selectedDayLog.dayName})`
                            : stockFocusMode === 'closing-only'
                            ? `Day Closing Stock Sheet: ${selectedDayLog.formattedDate} (${selectedDayLog.dayName})`
                            : `Daily Stock Sheet: ${selectedDayLog.formattedDate} (${selectedDayLog.dayName})`}
                        </span>
                        {selectedDayLog.date === new Date().toISOString().split('T')[0] && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">
                            Today
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {stockFocusMode === 'opening-only'
                          ? 'Itemized morning opening quantities and asset valuation for this day'
                          : stockFocusMode === 'closing-only'
                          ? 'Itemized end-of-day closing quantities and store asset valuation for this day'
                          : 'Itemized opening stock and closing balances for this day'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedDayLog(null); setDayModalSearch(''); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Day Summary KPI Bar */}
                <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  {stockFocusMode !== 'closing-only' && (
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-sans font-bold">Opening Valuation</div>
                      <div className="font-black text-slate-800 text-sm mt-0.5">৳ {selectedDayLog.openingValuation.toLocaleString()}</div>
                    </div>
                  )}
                  {stockFocusMode !== 'opening-only' && (
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-sans font-bold">Closing Valuation</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">৳ {selectedDayLog.closingValuation.toLocaleString()}</div>
                    </div>
                  )}
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-sans font-bold">Active Master Items</div>
                    <div className="font-black text-indigo-700 text-sm mt-0.5">{selectedDayLog.itemBreakdown.length} Items</div>
                  </div>
                </div>

                {/* Search Bar inside Modal */}
                <div className="mb-3 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dayModalSearch}
                    onChange={e => setDayModalSearch(e.target.value)}
                    placeholder="Search raw material name, category in this day's sheet..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Modal Items Table */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-300 sticky top-0 text-[11px]">
                      <tr>
                        <th className="py-2 px-3 font-bold">Raw Material</th>
                        <th className="py-2 px-2 font-bold text-center">UOM</th>
                        {stockFocusMode !== 'closing-only' && (
                          <th className="py-2 px-2.5 font-bold text-right text-teal-300">Opening Qty</th>
                        )}
                        {stockFocusMode !== 'closing-only' && (
                          <th className="py-2 px-3 font-bold text-right text-teal-400">Opening Value (৳)</th>
                        )}
                        {stockFocusMode !== 'opening-only' && (
                          <th className="py-2 px-2.5 font-bold text-right text-white">Closing Qty</th>
                        )}
                        {stockFocusMode !== 'opening-only' && (
                          <th className="py-2 px-3 font-bold text-right text-amber-400">Closing Value (৳)</th>
                        )}
                        <th className="py-2 px-2.5 font-bold text-right">Avg Rate (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedDayLog.itemBreakdown
                        .filter(item => !dayModalSearch.trim() || item.name.toLowerCase().includes(dayModalSearch.toLowerCase().trim()) || item.category.toLowerCase().includes(dayModalSearch.toLowerCase().trim()))
                        .map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-3 font-sans font-bold text-slate-900">
                              {item.name}
                              <span className="text-[10px] text-slate-400 font-normal ml-1.5 font-sans">({item.category})</span>
                            </td>
                            <td className="py-2 px-2 text-center text-slate-600 font-sans">{item.uom}</td>
                            {stockFocusMode !== 'closing-only' && (
                              <td className="py-2 px-2.5 text-right text-slate-700">{item.openQty.toFixed(2)}</td>
                            )}
                            {stockFocusMode !== 'closing-only' && (
                              <td className="py-2 px-3 text-right font-bold text-teal-800">৳{Math.round(item.openVal).toLocaleString()}</td>
                            )}
                            {stockFocusMode !== 'opening-only' && (
                              <td className="py-2 px-2.5 text-right font-black text-slate-900">{item.closeQty.toFixed(2)}</td>
                            )}
                            {stockFocusMode !== 'opening-only' && (
                              <td className="py-2 px-3 text-right font-bold text-slate-900">৳{Math.round(item.closeVal).toLocaleString()}</td>
                            )}
                            <td className="py-2 px-2.5 text-right text-slate-600">৳{item.rate}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Modal Footer */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => { setSelectedDayLog(null); setDayModalSearch(''); }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Close Day Sheet
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
