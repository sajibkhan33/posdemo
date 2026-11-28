import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant, isDepartmentKotActive } from '../../context/RestaurantContext';
import { 
  Printer, 
  X, 
  ChefHat, 
  ReceiptText, 
  Settings2, 
  Sliders, 
  CheckCircle2, 
  Wifi, 
  Usb, 
  Filter, 
  Layers, 
  Store,
  Sparkles,
  Percent,
  Scissors,
  Send,
  RefreshCw,
  Download
} from 'lucide-react';
import { PrinterConfig, PrintTemplate, ThermalPaperWidth, TableCartItem } from '../../types';
import { dispatchHardwarePrint } from '../../utils/hardwarePrint';

export const ThermalBillModal: React.FC = () => {
  const { printableReceipt: contextReceipt, closePrintReceipt, data, voidSale } = useRestaurant();
  const [activeSlipTab, setActiveSlipTab] = useState<'BILL' | 'ADDON_KOT' | 'VOID_KOT'>('BILL');

  const printableReceipt = useMemo(() => {
    if (activeSlipTab === 'ADDON_KOT' && contextReceipt?.addonKotReceipt) {
      return contextReceipt.addonKotReceipt;
    }
    if (activeSlipTab === 'VOID_KOT' && contextReceipt?.voidKotReceipt) {
      return contextReceipt.voidKotReceipt;
    }
    return contextReceipt;
  }, [activeSlipTab, contextReceipt]);

  const isCancelKot = printableReceipt?.receiptType === 'CANCEL_KOT';
  const isVoidMemo = printableReceipt?.receiptType === 'VOID_MEMO';
  const isKot = isCancelKot || printableReceipt?.receiptType === 'KOT';
  const profile = data?.restaurantProfile;
  const restaurantName = profile?.name || 'BD HOSTT POS';
  const restaurantAddress = profile?.address || 'Chattogram, Bangladesh';
  const restaurantHotline = profile?.phone || '+880 1756-007600';
  const restaurantBin = profile?.binOrVat || '0029381-01';

  // Format Date and Time
  const rawDt = printableReceipt?.dateTime || '';
  let receiptDateStr = '';
  let receiptTimeStr = '';
  if (rawDt.includes(',')) {
    const parts = rawDt.split(',');
    receiptDateStr = parts[0].trim();
    receiptTimeStr = parts.slice(1).join(',').trim();
  } else {
    const parts = rawDt.trim().split(/\s+/);
    if (parts.length >= 2) {
      receiptDateStr = parts[0];
      receiptTimeStr = parts.slice(1).join(' ');
    } else {
      receiptDateStr = rawDt;
      receiptTimeStr = '';
    }
  }

  // Available configured printers & templates
const allPrinters = (data?.printers && data.printers.length > 0) ? data.printers : [];
  const printers = useMemo(() => allPrinters.filter(p => p.isActive), [allPrinters]);
  const hasActiveKotPrinter = useMemo(() => allPrinters.some(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL')), [allPrinters]);
  const hasActiveBillPrinter = useMemo(() => allPrinters.some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL')), [allPrinters]);
  const hasMatchingActivePrinter = isKot ? hasActiveKotPrinter : hasActiveBillPrinter;
  const templates = (data?.printTemplates && data.printTemplates.length > 0) ? data.printTemplates : [];

  // Match items with their menu catalog department & category
  const enrichedItems = useMemo(() => {
    if (!printableReceipt) return [];

    const rawItems: TableCartItem[] = (printableReceipt.receiptType === 'CANCEL_KOT' && printableReceipt.cancelledItems)
      ? printableReceipt.cancelledItems.map((c, i): TableCartItem => ({
          id: i + 9000,
          name: c?.name || 'Cancelled Item',
          price: c?.price || 0,
          qty: c?.qty || 1,
          department: c?.department || 'Main Kitchen',
          category: (c as any)?.category,
          notes: c?.reason ? `Reason: ${c.reason}` : undefined,
          selectedVariation: undefined,
          selectedAddons: undefined
        }))
      : (Array.isArray(printableReceipt.items) ? (printableReceipt.items as TableCartItem[]) : []);

    const menuCatalog = Array.isArray(data?.menuItems) ? data.menuItems : [];

    return rawItems.map(item => {
      if (!item) {
        return { name: 'Item', qty: 1, price: 0, department: 'Main Kitchen', category: 'General' };
      }
      const itemName = item.name ? String(item.name).trim() : '';
      const itemId = item.id != null ? String(item.id) : null;

      const menuObj = menuCatalog.find(m => {
        if (!m) return false;
        if (itemId && m.id != null && String(m.id) === itemId) return true;
        if (itemName && m.name && String(m.name).trim().toLowerCase() === itemName.toLowerCase()) return true;
        return false;
      });

      const resolvedId = menuObj?.id != null ? Number(menuObj.id) : (item.id != null ? Number(item.id) : undefined);
      return {
        ...item,
        id: (resolvedId !== undefined && !isNaN(resolvedId)) ? resolvedId : item.id,
        name: itemName || 'Item',
        qty: item.qty || 1,
        price: item.price || 0,
        department: item.department || menuObj?.department || 'Main Kitchen',
        category: (item as any)?.category || menuObj?.category || 'Appetizers & Soup'
      };
    });
  }, [printableReceipt, data?.menuItems]);

  // Unique departments present in this order
  const orderDepartments = useMemo(() => {
    const set = new Set<string>();
    enrichedItems.forEach(i => {
      if (i && i.department) set.add(i.department);
    });
    return Array.from(set);
  }, [enrichedItems]);

  // Departments whose KOT template is active
  const activeOrderDepartments = useMemo(() => {
    return orderDepartments.filter(dept => isDepartmentKotActive(dept, templates));
  }, [orderDepartments, templates]);

  // Selected Department Filter (Default: If order has multiple active departments, default to SPLIT_ALL so separate slips with auto-cut are ready immediately without extra clicks!)
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(() => {
    return activeOrderDepartments.length > 1 ? 'SPLIT_ALL' : 'ALL';
  });

  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Helper to match configured hardware printer for a specific department
  const getPrinterForDept = (dept: string): PrinterConfig | null => {
    return printers.find(p => p.isActive && p.type === 'KOT' && p.departments?.includes(dept))
      || printers.find(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL') && p.isDefault)
      || printers.find(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL'))
      || null;
  };

  // Initial matched printer
  const defaultMatchedPrinter = useMemo(() => {
    const targetType = isKot ? 'KOT' : 'BILL';
    const found = printers.find(p => p.isActive && (p.type === targetType || p.type === 'ALL'));
    return found || printers[0] || null;
  }, [printers, isKot]);

  // Initial matched template
  const defaultMatchedTemplate = useMemo(() => {
    const targetType = isKot ? 'KOT' : 'BILL';
    if (printableReceipt?.targetTemplateId) {
      const found = templates.find(t => t.id === printableReceipt.targetTemplateId && t.isActive);
      if (found) return found;
    }
    if (selectedDeptFilter && selectedDeptFilter !== 'ALL' && selectedDeptFilter !== 'SPLIT_ALL') {
      const found = templates.find(t => t.isActive && (t.templateType === targetType || t.templateType === 'BOTH') && t.departments?.includes(selectedDeptFilter));
      if (found) return found;
    }
    const defaultTpl = templates.find(t => t.isActive && t.isDefault && (t.templateType === targetType || t.templateType === 'BOTH'));
    if (defaultTpl) return defaultTpl;
    const anyType = templates.find(t => t.isActive && (t.templateType === targetType || t.templateType === 'BOTH'));
    if (anyType) return anyType;
    return templates[0] || null;
  }, [templates, isKot, printableReceipt?.targetTemplateId, selectedDeptFilter]);

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(defaultMatchedPrinter?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultMatchedTemplate?.id || '');
  const [showConfigBar, setShowConfigBar] = useState<boolean>(false);

  useEffect(() => {
    if (defaultMatchedTemplate) {
      setSelectedTemplateId(defaultMatchedTemplate.id);
      if (isKot && defaultMatchedTemplate.combineAllStationsOnKot) {
        setSelectedDeptFilter('ALL');
      }
    }
  }, [defaultMatchedTemplate?.id]);

  // Switch tab and automatically align active hardware printer
  const handleSelectDept = (dept: string) => {
    setSelectedDeptFilter(dept);
    setDispatchSuccess(null);
    if (dept === 'ALL' || dept === 'SPLIT_ALL') {
      if (defaultMatchedPrinter) {
        setSelectedPrinterId(defaultMatchedPrinter.id);
      }
    } else {
      const mapped = getPrinterForDept(dept);
      if (mapped) {
        setSelectedPrinterId(mapped.id);
      }
    }
  };

  const handleDispatchAllStations = () => {
    const logs = orderDepartments.map(dept => {
      const p = getPrinterForDept(dept);
      const count = enrichedItems.filter(i => i.department === dept).length;
      const portInfo = p?.connectionType === 'LAN' ? `LAN ${p.ipAddress}:${p.port}` : `USB ${p?.usbPort || 'USB001'}`;
      return `• ${dept} (${count} item${count > 1 ? 's' : ''}) ➔ ${p?.name || 'Default KOT Printer'} [${portInfo}]`;
    });
    setDispatchSuccess(`Dispatched ${orderDepartments.length} KOT tickets simultaneously to respective station hardware:\n${logs.join('\n')}`);
  };

  const activePrinter = printers.find(p => p.id === selectedPrinterId) || defaultMatchedPrinter;
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || defaultMatchedTemplate;

  // Paper width from template or printer
  const paperWidth: ThermalPaperWidth = activeTemplate?.paperWidth || activePrinter?.paperWidth || '80mm';

  // Filter items based on selected department filter
  const displayedItems = useMemo(() => {
    if (selectedDeptFilter === 'ALL' || selectedDeptFilter === 'SPLIT_ALL') {
      return enrichedItems;
    }
    return enrichedItems.filter(i => i.department === selectedDeptFilter);
  }, [enrichedItems, selectedDeptFilter]);

  const displayedSubtotal = displayedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const [isPrinting, setIsPrinting] = useState(false);
  const [hardwarePrintStatus, setHardwarePrintStatus] = useState<string | null>(null);


  const handlePrint = async () => {
    if (!printableReceipt) return;
    setIsPrinting(true);
    setHardwarePrintStatus(null);

    // 1. Customer Bill / Cash Memo: Dispatch directly to Printer via hardware bridge (No browser PDF dialog)
    if (!isKot) {
      const isSettledMemo = printableReceipt.isSettled || printableReceipt.receiptType === 'PAID_MEMO';
      const isActionActive = isSettledMemo 
        ? (activePrinter?.printOnSettle !== false) 
        : (activePrinter?.printOnBill !== false);

      if (isActionActive) {
        try {
          const billPayload = {
            restaurantName: printableReceipt.restaurantName,
            restaurantAddress: printableReceipt.restaurantAddress,
            restaurantHotline: printableReceipt.restaurantHotline,
            restaurantBin: printableReceipt.restaurantBin,
            invoiceNo: printableReceipt.invoiceNo,
            dateTime: printableReceipt.dateTime,
            tableName: printableReceipt.tableName,
            tableZone: printableReceipt.tableZone,
            channelOrAgent: printableReceipt.channelOrAgent,
            waiter: printableReceipt.waiter,
            orderTakenBy: printableReceipt.orderTakenBy,
            settleBillRole: printableReceipt.settleBillRole,
            customer: printableReceipt.customer,
            items: displayedItems.map(i => ({
              name: i.name,
              qty: i.qty,
              price: i.price,
              variation: i.selectedVariation?.name,
              addons: i.selectedAddons?.map(a => a.name),
              notes: i.notes
            })),
            subtotal: printableReceipt.subtotal,
            discountDeduction: printableReceipt.discountDeduction,
            discountType: printableReceipt.discountType,
            discountVal: printableReceipt.discountVal,
            netTotal: printableReceipt.netTotal,
            paymentBreakdown: (printableReceipt as any).paymentBreakdown,
            changeReturn: (printableReceipt as any).changeReturn,
            isSettled: printableReceipt.isSettled,
            paperWidth: activeTemplate?.paperWidth || (printableReceipt as any)?.paperWidth || '80mm',
            headerTitle: activeTemplate?.headerTitle || printableReceipt.headerTitle,
            showLogo: activeTemplate?.showLogo !== false,
            showAddress: activeTemplate?.showAddress !== false,
            showPhone: activeTemplate?.showPhone !== false,
            showBinVat: Boolean(activeTemplate?.showBinVat ?? printableReceipt.showBinVat),
            showTableZone: activeTemplate?.showTableZone !== false,
            showWaiter: activeTemplate?.showWaiter !== false,
            showCustomer: activeTemplate?.showCustomer !== false,
            showPrices: activeTemplate?.showPrices !== false,
            showPaymentBreakdown: activeTemplate?.showPaymentBreakdown !== false,
            footerMessage: activeTemplate?.footerMessage,
            footerNotes: activeTemplate?.footerNotes
          };

          await dispatchHardwarePrint('/api/hardware/print-bill', billPayload);
        } catch (err) {
          console.warn('Hardware bill print error:', err);
        }
      }

      setIsPrinting(false);
      setHardwarePrintStatus(isActionActive ? '✅ Bill sent to Printer!' : 'ℹ️ Physical print is muted for this action in settings');
      setTimeout(() => {
        closePrintReceipt();
      }, 600);
      return;
    }

    // 2. KOT Ticket: Hardware kitchen station print
    try {
      const showPrices = Boolean(activeTemplate?.showPricesOnKot || printableReceipt?.showPrices);
      const slipsToPrint = (selectedDeptFilter === 'ALL')
        ? [{
            station: 'Master KOT (All Active Stations)',
            targetPrinterName: activePrinter?.systemPrinterName || activePrinter?.name || 'Kot Printer',
            showPrices,
            showWaiter: activeTemplate?.showWaiter !== false,
            paperWidth: activeTemplate?.paperWidth || '80mm',
            items: displayedItems
              .filter(i => {
                if (!isDepartmentKotActive(i.department || 'Main Kitchen', templates)) return false;
                if (Array.isArray(activePrinter?.itemIds) && activePrinter.itemIds.length > 0) {
                  return i.id != null && activePrinter.itemIds.includes(Number(i.id));
                }
                return true;
              })
              .map(i => ({
                name: (activeTemplate?.showItemDepartmentOnKot && i.department) ? `${i.name} [${i.department}]` : i.name,
                qty: i.qty,
                price: Number(i.price || 0),
                variation: i.selectedVariation?.name,
                addons: i.selectedAddons?.map(a => a.name),
                notes: i.notes
              }))
          }].filter(s => s.items.length > 0)
        : (selectedDeptFilter === 'SPLIT_ALL')
          ? (activeOrderDepartments.length > 0 
              ? activeOrderDepartments.map(dept => {
                  const deptPrinter = getPrinterForDept(dept);
                  const deptItems = enrichedItems.filter(i => {
                    if (i.department !== dept) return false;
                    if (Array.isArray(deptPrinter?.itemIds) && deptPrinter.itemIds.length > 0) {
                      return i.id != null && deptPrinter.itemIds.includes(Number(i.id));
                    }
                    return true;
                  });
                  const deptTemplate = templates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH') && t.departments?.includes(dept)) || activeTemplate;
                  return {
                    station: dept,
                    targetPrinterName: deptPrinter?.systemPrinterName || deptPrinter?.name || 'Kot Printer',
                    showPrices: Boolean(deptTemplate?.showPricesOnKot || showPrices || printableReceipt?.showPrices),
                    showWaiter: Boolean(deptTemplate?.showWaiter ?? activeTemplate?.showWaiter ?? true),
                    paperWidth: deptTemplate?.paperWidth || activeTemplate?.paperWidth || '80mm',
                    items: deptItems.map(i => ({
                      name: i.name,
                      qty: i.qty,
                      price: Number(i.price || 0),
                      variation: i.selectedVariation?.name,
                      addons: i.selectedAddons?.map((a: any) => a.name),
                      notes: i.notes
                    }))
                  };
                }).filter(s => s.items.length > 0)
              : [])
          : (isDepartmentKotActive(selectedDeptFilter, templates)
              ? [{
                  station: selectedDeptFilter,
                  targetPrinterName: activePrinter?.systemPrinterName || activePrinter?.name || 'Kot Printer',
                  showPrices,
                  showWaiter: activeTemplate?.showWaiter !== false,
                  paperWidth: activeTemplate?.paperWidth || '80mm',
                  items: displayedItems
                    .filter(i => {
                      if (Array.isArray(activePrinter?.itemIds) && activePrinter.itemIds.length > 0) {
                        return i.id != null && activePrinter.itemIds.includes(Number(i.id));
                      }
                      return true;
                    })
                    .map(i => ({
                      name: i.name,
                      qty: i.qty,
                      price: Number(i.price || 0),
                      variation: i.selectedVariation?.name,
                      addons: i.selectedAddons?.map((a: any) => a.name),
                      notes: i.notes
                    }))
                }].filter(s => s.items.length > 0)
              : []);

      if (slipsToPrint.length === 0) {
        setHardwarePrintStatus('ℹ️ Physical KOT skipped: Kitchen station template is inactive');
        setTimeout(() => {
          closePrintReceipt();
        }, 1200);
        setIsPrinting(false);
        return;
      }

      const kotPayload = {
        invoiceNo: printableReceipt.invoiceNo,
        dateTime: printableReceipt.dateTime,
        tableName: printableReceipt.tableName,
        tableZone: printableReceipt.tableZone,
        waiter: printableReceipt.waiter,
        customer: printableReceipt.customer,
        isCancelKot,
        showPrices,
        showWaiter: activeTemplate?.showWaiter !== false,
        showCustomer: Boolean(activeTemplate?.showCustomer),
        showDateTime: activeTemplate?.showDateTime !== false,
        paperWidth: activeTemplate?.paperWidth || '80mm',
        slips: slipsToPrint
      };

      await dispatchHardwarePrint('/api/hardware/print-kot', kotPayload);
    } catch (e) {
      console.warn('Hardware KOT print failed:', e);
    }

    setIsPrinting(false);
    setHardwarePrintStatus('✅ KOT sent to Kitchen Thermal Printer!');
    setTimeout(() => {
      closePrintReceipt();
    }, 600);
  };

  const generateReceiptHtml = () => {
    if (!printableReceipt) return '';

    const paperWidth = activeTemplate?.paperWidth || (printableReceipt as any)?.paperWidth || '80mm';
    const width = paperWidth === '58mm' ? 32 : 48;
    const divider = '-'.repeat(width);

    // Monospace alignment helpers (Strict 48 columns for 80mm or 32 columns for 58mm)
    const line2Col = (left: string, right: string, w = width) => {
      const l = left.trim();
      const r = right.trim();
      const maxL = Math.max(0, w - 1 - r.length);
      const safeL = l.length > maxL ? l.slice(0, maxL) : l;
      const spaces = Math.max(1, w - safeL.length - r.length);
      return safeL + ' '.repeat(spaces) + r;
    };

    const centerLine = (text: string, w = width) => {
      const t = text.trim();
      if (t.length >= w) return t;
      const leftPad = Math.floor((w - t.length) / 2);
      return ' '.repeat(leftPad) + t;
    };

    if (isKot) {
      const stationName = (!selectedDeptFilter || selectedDeptFilter === 'ALL' || selectedDeptFilter === 'SPLIT_ALL') 
        ? 'MAIN KITCHEN' 
        : selectedDeptFilter.toUpperCase();

      const kotLines: string[] = [];
      kotLines.push(divider);
      kotLines.push(centerLine(`STATION: ${stationName}`, width));
      const invoiceVal = (printableReceipt.invoiceNo || 'KOT-0000') + (isCancelKot ? ' (VOID)' : '');
      kotLines.push(centerLine(`${isCancelKot ? 'VOID KOT NO:' : 'KOT NO:'} ${invoiceVal}`, width));
      kotLines.push(divider);

      // Metadata (Left and Right flush)
      kotLines.push(line2Col('Table & Zone :', `${printableReceipt.tableName || 'Table'}${printableReceipt.tableZone ? ` (${printableReceipt.tableZone})` : ''}`, width));

      let dateStr = '';
      let timeStr = '';
      const rawDt = printableReceipt.dateTime || `${receiptDateStr}, ${receiptTimeStr}`;
      if (rawDt.includes(',')) {
        const parts = rawDt.split(',');
        dateStr = parts[0].trim();
        timeStr = parts.slice(1).join(',').trim();
      } else {
        const parts = rawDt.trim().split(/\s+/);
        if (parts.length >= 2) {
          dateStr = parts[0];
          timeStr = parts.slice(1).join(' ');
        } else {
          dateStr = rawDt;
          timeStr = new Date().toLocaleTimeString('en-US');
        }
      }
      kotLines.push(line2Col('Date : ' + dateStr, 'Time: ' + timeStr, width));
      if (activeTemplate?.showWaiter !== false) {
        kotLines.push(line2Col('Waiter :', printableReceipt.waiter || 'Staff', width));
      }
      if (printableReceipt.customer && printableReceipt.customer !== 'Walk-in Customer') {
        kotLines.push(line2Col('Customer :', printableReceipt.customer, width));
      }
      if (isCancelKot && printableReceipt.voidAuthorizedBy) {
        kotLines.push(line2Col('Auth By :', printableReceipt.voidAuthorizedBy, width));
      }
      if (isCancelKot && printableReceipt.voidReason) {
        kotLines.push(line2Col('Reason :', printableReceipt.voidReason, width));
      }
      kotLines.push(divider);

      const showPrices = Boolean(activeTemplate?.showPricesOnKot || printableReceipt?.showPrices);
      if (showPrices) {
        if (width === 48) {
          const kotItemH = 'ITEM'.padEnd(28, ' ');
          const kotQtyH = ' QTY  ';
          const kotPriceH = '       PRICE';
          kotLines.push(`${kotItemH} ${kotQtyH} ${kotPriceH}`);
        } else {
          const kotItemH = 'ITEM'.padEnd(14, ' ');
          const kotQtyH = ' QTY ';
          const kotPriceH = '     PRICE';
          kotLines.push(`${kotItemH} ${kotQtyH} ${kotPriceH}`);
        }
        kotLines.push(divider);

        const nameLimit = width === 48 ? 28 : 14;
        for (const item of displayedItems) {
          const itemPrice = Number(item.price || 0);

          let firstLineName = (item.name || '').trim();
          let remainder = '';
          if (firstLineName.length > nameLimit) {
            const lastSpace = firstLineName.lastIndexOf(' ', nameLimit);
            if (lastSpace > 8) {
              remainder = firstLineName.slice(lastSpace + 1).trim();
              firstLineName = firstLineName.slice(0, lastSpace);
            } else {
              remainder = firstLineName.slice(nameLimit).trim();
              firstLineName = firstLineName.slice(0, nameLimit);
            }
          }

          if (width === 48) {
            const nameCol = firstLineName.padEnd(28, ' ');
            const qtyCol = (item.qty + 'x').padStart(4, ' ').padEnd(6, ' ');
            const priceCol = itemPrice.toFixed(2).padStart(12, ' ');
            kotLines.push(`${nameCol} ${qtyCol} ${priceCol}`);
          } else {
            const nameCol = firstLineName.padEnd(14, ' ');
            const qtyCol = (item.qty + 'x').padStart(4, ' ').padEnd(5, ' ');
            const priceCol = itemPrice.toFixed(2).padStart(11, ' ');
            kotLines.push(`${nameCol} ${qtyCol} ${priceCol}`);
          }
          if (remainder) kotLines.push(`  ${remainder}`);
          if (item.selectedVariation?.name) kotLines.push(`   - Cut: ${item.selectedVariation.name}`);
          if (item.selectedAddons && item.selectedAddons.length > 0) {
            kotLines.push(`   - Extras: ${item.selectedAddons.map((a: any) => a.name).join(', ')}`);
          }
          if (item.notes) kotLines.push(`   - Note: ${item.notes}`);
        }
        kotLines.push(divider);
      } else {
        if (width === 48) {
          const kotItemH = 'ITEM'.padEnd(38, ' ');
          const kotQtyH = '      QTY';
          kotLines.push(`${kotItemH} ${kotQtyH}`);
        } else {
          const kotItemH = 'ITEM'.padEnd(22, ' ');
          const kotQtyH = '      QTY';
          kotLines.push(`${kotItemH} ${kotQtyH}`);
        }
        kotLines.push(divider);

        const nameLimit = width === 48 ? 38 : 22;
        for (const item of displayedItems) {
          const name = item.name.length > nameLimit ? item.name.slice(0, nameLimit) : item.name;
          if (width === 48) {
            const nameCol = name.padEnd(38, ' ');
            const qtyCol = (item.qty + 'x').padStart(9, ' ');
            kotLines.push(`${nameCol} ${qtyCol}`);
          } else {
            const nameCol = name.padEnd(22, ' ');
            const qtyCol = (item.qty + 'x').padStart(9, ' ');
            kotLines.push(`${nameCol} ${qtyCol}`);
          }
          if (item.selectedVariation?.name) kotLines.push(`   - Cut: ${item.selectedVariation.name}`);
          if (item.selectedAddons && item.selectedAddons.length > 0) {
            kotLines.push(`   - Extras: ${item.selectedAddons.map((a: any) => a.name).join(', ')}`);
          }
          if (item.notes) kotLines.push(`   - Note: ${item.notes}`);
        }
        kotLines.push(divider);
      }

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isCancelKot ? 'VOID_KOT' : 'KOT'}_${printableReceipt.invoiceNo}</title>
  <style>
    @page {
      size: ${paperWidth === '58mm' ? '58mm' : '80mm'} auto;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${paperWidth === '58mm' ? '48mm' : '72mm'} !important;
        max-width: ${paperWidth === '58mm' ? '48mm' : '72mm'} !important;
      }
      .no-print { display: none !important; }
    }
    *, *::before, *::after {
      box-sizing: border-box;
      color: #000000 !important;
    }
    body {
      margin: 0 auto;
      padding: 2mm 1mm;
      width: ${paperWidth === '58mm' ? '48mm' : '72mm'};
      max-width: ${paperWidth === '58mm' ? '48mm' : '72mm'};
      background: #ffffff;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    pre {
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace !important;
      font-size: ${paperWidth === '58mm' ? '10px' : '12.5px'} !important;
      line-height: 1.25 !important;
      letter-spacing: 0px !important;
      white-space: pre !important;
      word-break: normal !important;
      font-weight: 700 !important;
      color: #000000 !important;
    }
  </style>
</head>
<body>
  <pre>${kotLines.join('\n')}</pre>
</body>
</html>`;
    }

    // CUSTOMER BILL / CASH MEMO (Standard 48-col 80mm or 32-col 58mm receipt)
    const titleText = printableReceipt.isSettled 
      ? (printableReceipt.headerTitle && printableReceipt.headerTitle.includes('PAID') ? printableReceipt.headerTitle : 'PAID CASH MEMO')
      : (activeTemplate?.headerTitle || printableReceipt.headerTitle || 'INVOICE / GUEST BILL');
    const lines: string[] = [];

    lines.push(centerLine(restaurantName || 'BD HOSTT POS', width));
    if (activeTemplate?.showAddress !== false) {
      const rawAddress = restaurantAddress || 'Chattogram, Bangladesh';
      if (rawAddress) {
        if (rawAddress.includes(',')) {
          const parts = rawAddress.split(',').map(p => p.trim());
          let currentLine = '';
          for (const part of parts) {
            if (!currentLine) {
              currentLine = part;
            } else if ((currentLine + ', ' + part).length <= (width - 2)) {
              currentLine += ', ' + part;
            } else {
              lines.push(centerLine(currentLine, width));
              currentLine = part;
            }
          }
          if (currentLine) lines.push(centerLine(currentLine, width));
        } else {
          lines.push(centerLine(rawAddress, width));
        }
      }
    }
    if (activeTemplate?.showPhone !== false && restaurantHotline) {
      lines.push(centerLine(`Hotline: ${restaurantHotline}`, width));
    }
    if (activeTemplate?.showBinVat && restaurantBin) {
      lines.push(centerLine(`BIN/VAT Reg: ${restaurantBin}`, width));
    }

    lines.push(divider);
    lines.push(centerLine(titleText, width));
    lines.push(divider);

    lines.push(line2Col('Invoice No :', printableReceipt.invoiceNo, width));
    let dateStr = receiptDateStr;
    let timeStr = receiptTimeStr;
    const rawDt = printableReceipt.dateTime || `${receiptDateStr}, ${receiptTimeStr}`;
    if (rawDt.includes(',')) {
      const parts = rawDt.split(',');
      dateStr = parts[0].trim();
      timeStr = parts.slice(1).join(',').trim();
    } else {
      const parts = rawDt.trim().split(/\s+/);
      if (parts.length >= 2) {
        dateStr = parts[0];
        timeStr = parts.slice(1).join(' ');
      }
    }
    lines.push(line2Col(`Date : ${dateStr}`, `Time: ${timeStr}`, width));
    if (activeTemplate?.showTableZone !== false) {
      lines.push(line2Col('Table & Zone :', `${printableReceipt.tableName}${printableReceipt.tableZone ? ` (${printableReceipt.tableZone})` : ''}`, width));
    }
    if (printableReceipt.channelOrAgent) {
      lines.push(line2Col('Channel :', printableReceipt.channelOrAgent, width));
    }
    const waiterText = (printableReceipt.waiter && printableReceipt.waiter !== 'N/A' && printableReceipt.waiter !== 'Staff')
      ? printableReceipt.waiter
      : (printableReceipt.waiter || 'Staff');
    if (activeTemplate?.showWaiter !== false) {
      lines.push(line2Col('Waiter :', waiterText, width));
    }
    if (printableReceipt.orderTakenBy && printableReceipt.orderTakenBy !== printableReceipt.waiter) {
      lines.push(line2Col('Order Taken By :', printableReceipt.orderTakenBy, width));
    }
    if (printableReceipt.isSettled) {
      lines.push(line2Col('Bill Settled By :', printableReceipt.settleBillRole || 'Cashier', width));
    }
    if (activeTemplate?.showCustomer !== false && printableReceipt.customer && printableReceipt.customer !== 'Walk-in Customer') {
      lines.push(line2Col('Customer :', printableReceipt.customer, width));
    }
    lines.push(divider);

    // Column Header
    if (width === 48) {
      const colItemH = 'ITEM'.padEnd(21, ' ');
      const colQtyH = ' QTY ';
      const colPriceH = '    PRICE';
      const colTotalH = '     TOTAL';
      lines.push(`${colItemH} ${colQtyH} ${colPriceH} ${colTotalH}`);
    } else {
      const colItemH = 'ITEM'.padEnd(14, ' ');
      const colQtyH = 'QTY';
      const colPriceH = ' PRICE';
      const colTotalH = ' TOTAL';
      lines.push(`${colItemH} ${colQtyH} ${colPriceH} ${colTotalH}`);
    }
    lines.push(divider);

    const itemLimit = width === 48 ? 21 : 14;
    for (const item of displayedItems) {
      let firstLineName = (item.name || '').trim();
      let remainder = '';
      if (firstLineName.length > itemLimit) {
        const lastSpace = firstLineName.lastIndexOf(' ', itemLimit);
        if (lastSpace > 8) {
          remainder = firstLineName.slice(lastSpace + 1).trim();
          firstLineName = firstLineName.slice(0, lastSpace);
        } else {
          remainder = firstLineName.slice(itemLimit).trim();
          firstLineName = firstLineName.slice(0, itemLimit);
        }
      }
      if (width === 48) {
        const colItem = firstLineName.padEnd(21, ' ');
        const colQty = (' ' + item.qty + ' ').padStart(5, ' ');
        const colPrice = Number(item.price).toFixed(2).padStart(9, ' ');
        const colTotal = Number(item.price * item.qty).toFixed(2).padStart(10, ' ');
        lines.push(`${colItem} ${colQty} ${colPrice} ${colTotal}`);
      } else {
        const colItem = firstLineName.padEnd(14, ' ');
        const colQty = String(item.qty).padStart(3, ' ');
        const colPrice = Number(item.price).toFixed(0).padStart(6, ' ');
        const colTotal = Number(item.price * item.qty).toFixed(0).padStart(6, ' ');
        lines.push(`${colItem} ${colQty} ${colPrice} ${colTotal}`);
      }
      if (remainder) lines.push(`  ${remainder}`);
      if (item.selectedVariation?.name) lines.push(`  * Cut: ${item.selectedVariation.name}`);
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        lines.push(`  + Extras: ${item.selectedAddons.map((a: any) => a.name).join(', ')}`);
      }
      if (item.notes) lines.push(`  - Note: ${item.notes}`);
    }

    lines.push(divider);
    lines.push(line2Col('Subtotal:', Number(displayedSubtotal).toFixed(2), width));
    if (printableReceipt.discountDeduction > 0) {
      const discLbl = printableReceipt.discountType === 'percent' && printableReceipt.discountVal
        ? `Discount (${printableReceipt.discountVal}%):`
        : 'Discount:';
      lines.push(line2Col(discLbl, `-${Number(printableReceipt.discountDeduction).toFixed(2)}`, width));
    }
    if (printableReceipt.vatVal && printableReceipt.vatVal > 0) {
      const vatLbl = `VAT (${printableReceipt.vatPercent || 5}% ${printableReceipt.vatMode === 'inclusive' ? 'Inc' : 'Ext'}):`;
      lines.push(line2Col(vatLbl, `${printableReceipt.vatMode === 'exclusive' ? '+' : ''}${Number(printableReceipt.vatVal).toFixed(2)}`, width));
    }
    lines.push(divider);
    lines.push(line2Col('TOTAL PAYABLE:', Number(printableReceipt.netTotal).toFixed(2), width));

    const pb = printableReceipt.paymentBreakdown;
    if (pb && activeTemplate?.showPaymentBreakdown !== false) {
      lines.push(divider);
      if (pb.byMethod && Object.keys(pb.byMethod).length > 0) {
        Object.entries(pb.byMethod).forEach(([mKey, amt]) => {
          if (Number(amt) > 0) {
            if (mKey === 'advance') {
              lines.push(line2Col('Advance Adjusted:', Number(amt).toFixed(2), width));
              return;
            }
            const methodObj = (data?.paymentMethods || []).find(m => m.id === mKey || m.name.toLowerCase() === mKey.toLowerCase());
            const mName = methodObj?.name || mKey;
            lines.push(line2Col(`${mName} Paid:`, Number(amt).toFixed(2), width));
          }
        });
      } else {
        if (pb.advance && Number(pb.advance) > 0) lines.push(line2Col('Advance Adjusted:', Number(pb.advance).toFixed(2), width));
        if (Number(pb.cash || 0) > 0) lines.push(line2Col('Cash Paid:', Number(pb.cash).toFixed(2), width));
        if (Number(pb.card || 0) > 0) lines.push(line2Col('Card Paid:', Number(pb.card).toFixed(2), width));
        if (Number(pb.bkash || 0) > 0) lines.push(line2Col('bKash Paid:', Number(pb.bkash).toFixed(2), width));
        if (Number(pb.nagad || 0) > 0) lines.push(line2Col('Nagad Paid:', Number(pb.nagad).toFixed(2), width));
        if (Number(pb.due || 0) > 0) lines.push(line2Col('Due / Credit:', Number(pb.due).toFixed(2), width));
      }
      if (printableReceipt.changeReturn && printableReceipt.changeReturn > 0) {
        lines.push(line2Col('Change Return:', Number(printableReceipt.changeReturn).toFixed(2), width));
      }
    }

    lines.push(divider);
    if (printableReceipt.receiptType === 'VOID_MEMO') {
      lines.push(centerLine('*** ORDER CANCELLED / VOIDED ***', width));
      lines.push(centerLine(`*** REFUND: ${printableReceipt.refundStatus || 'REFUNDED'} ***`, width));
      if (printableReceipt.voidReason) {
        lines.push(line2Col('Void Reason:', printableReceipt.voidReason, width));
      }
      if (printableReceipt.voidAuthorizedBy) {
        lines.push(line2Col('Auth By:', printableReceipt.voidAuthorizedBy, width));
      }
    } else if (printableReceipt.isSettled) {
      lines.push(centerLine('*** PAID & SETTLED ***', width));
    }
    if (activeTemplate?.footerMessage) {
      lines.push(centerLine(activeTemplate.footerMessage, width));
    } else {
      lines.push(centerLine('Thank you for dining with us!', width));
      lines.push(centerLine('Please visit again', width));
    }
    if (activeTemplate?.footerNotes) {
      lines.push(centerLine(activeTemplate.footerNotes, width));
    }
    lines.push(divider);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt_${printableReceipt.invoiceNo}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 72mm !important;
        max-width: 72mm !important;
      }
      .no-print { display: none !important; }
    }
    *, *::before, *::after {
      box-sizing: border-box;
      color: #000000 !important;
    }
    body {
      margin: 0 auto;
      padding: 2mm 1mm;
      width: 72mm;
      max-width: 72mm;
      background: #ffffff;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    pre {
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 12.5px !important;
      line-height: 1.25 !important;
      letter-spacing: 0px !important;
      white-space: pre !important;
      word-break: normal !important;
      font-weight: 700 !important;
      color: #000000 !important;
    }
  </style>
</head>
<body>
  <pre>${lines.join('\n')}</pre>
</body>
</html>`;
  };

  const handleExportPdf = () => {
    window.print();
  };

  // Reusable layout for rendering single KOT slip or individual department slips in split mode
  const renderKotTicketLayout = (
    itemsList: typeof enrichedItems,
    deptLabel?: string,
    ticketPrinter?: PrinterConfig | null,
    ticketIndex?: number,
    totalTickets?: number
  ) => {
    if (!printableReceipt) return null;
    return (
      <div>
        {/* Clean, Uniform KOT Header */}
        <div className="text-center pb-2 border-b border-dashed border-slate-700 space-y-0.5">
          {deptLabel && deptLabel !== 'ALL' && (
            <div className="font-bold text-xs uppercase text-slate-900 tracking-wide">
              STATION: {deptLabel}
            </div>
          )}
          <div className="font-semibold text-xs text-slate-700">
            {isCancelKot ? 'VOID KOT #' : 'KOT #'} {printableReceipt.invoiceNo}
          </div>
        </div>



        {/* Cancel Warning Box if Cancel Kot */}
        {isCancelKot && (
          <div className="my-2 p-1.5 bg-rose-600 text-white rounded text-center text-xs font-bold">
            ⚠️ DO NOT PREPARE / CANCELLED ORDER
          </div>
        )}

        {/* Table & Zone Box */}
        <div className="my-2 p-1.5 bg-amber-50/80 border border-amber-200 rounded text-center text-xs font-bold text-slate-900">
          Table: {printableReceipt.tableName}{printableReceipt.tableZone ? ` (${printableReceipt.tableZone})` : ''}
          {printableReceipt.channelOrAgent && ` • ${printableReceipt.channelOrAgent}`}
        </div>

        {/* Meta details */}
        <div className="py-1.5 border-b border-dashed border-slate-300 text-xs space-y-1">
          {activeTemplate?.showDateTime !== false && (
            <div className="flex justify-between">
              <span className="text-slate-500">Time:</span>
              <span className="font-semibold text-slate-800">{printableReceipt.dateTime}</span>
            </div>
          )}
          {activeTemplate?.showWaiter !== false && (
            <div className="flex justify-between">
              <span className="text-slate-500">Server / Waiter:</span>
              <span className="font-semibold text-slate-800">
                {printableReceipt.waiter && printableReceipt.waiter !== 'N/A' && printableReceipt.waiter !== 'Staff' ? printableReceipt.waiter : (printableReceipt.waiter || 'Not Assigned')}
              </span>
            </div>
          )}
          {activeTemplate?.showCustomer !== false && printableReceipt.customer && printableReceipt.customer !== 'Walk-in Customer' && (
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[150px]">{printableReceipt.customer}</span>
            </div>
          )}
          {isCancelKot && printableReceipt.voidAuthorizedBy && (
            <div className="flex justify-between py-0.5 bg-rose-50 px-1 rounded">
              <span className="text-rose-700 font-bold">Authorized By:</span>
              <span className="font-bold text-rose-900">{printableReceipt.voidAuthorizedBy}</span>
            </div>
          )}
          {isCancelKot && printableReceipt.voidReason && (
            <div className="flex justify-between py-0.5 bg-rose-50 px-1 rounded">
              <span className="text-rose-700 font-bold">Void Reason:</span>
              <span className="font-bold text-rose-900 truncate max-w-[160px]">{printableReceipt.voidReason}</span>
            </div>
          )}
        </div>

        {/* Food Items Table with Uniform Font Sizes */}
        {(() => {
          const isKotPricesEnabled = Boolean(activeTemplate?.showPricesOnKot ?? printableReceipt?.showPrices);
          const isKotTotalEnabled = Boolean(activeTemplate?.showTotalPriceOnKot ?? printableReceipt?.showTotalPrice);
          return (
            <>
              <div className="py-2 border-b border-dashed border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 font-semibold text-xs">
                      <th className="py-1">Food Item &amp; Customization</th>
                      <th className={`py-1 ${isKotPricesEnabled || isKotTotalEnabled ? 'text-center' : 'text-right'}`}>Qty</th>
                      {isKotPricesEnabled && <th className="py-1 text-right">Price</th>}
                      {isKotTotalEnabled && <th className="py-1 text-right">Total</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsList.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 text-xs">
                          <div className={`font-bold ${isCancelKot ? 'text-rose-900 line-through' : 'text-slate-900'}`}>
                            {item.name}
                          </div>
                          {item.selectedVariation && (
                            <div className="text-xs text-blue-700">
                              • Cut: {item.selectedVariation.name}
                            </div>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-xs text-amber-800">
                              • Extras: {item.selectedAddons.map(a => a.name).join(', ')}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs italic text-rose-600">
                              • Note: {item.notes}
                            </div>
                          )}
                        </td>
                        <td className={`py-1.5 font-bold text-xs text-slate-900 align-top ${isKotPricesEnabled || isKotTotalEnabled ? 'text-center' : 'text-right'}`}>
                          {item.qty}x {isCancelKot ? 'VOID' : ''}
                        </td>
                        {isKotPricesEnabled && (
                          <td className="py-1.5 text-right font-bold text-xs text-slate-900 align-top">
                            ৳{Number(item.price || 0).toLocaleString()}
                          </td>
                        )}
                        {isKotTotalEnabled && (
                          <td className="py-1.5 text-right font-bold text-xs text-slate-900 align-top">
                            ৳{Number((item.price || 0) * (item.qty || 1)).toLocaleString()}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </div>
    );
  };

  const isDirect = printableReceipt?.isDirectPrint;

  React.useEffect(() => {
    if (isDirect) {
      closePrintReceipt();
    }
  }, [isDirect]);

  if (!printableReceipt || isDirect) return null;

  return (
    <div 
      id="printModalBackdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
    >
      <div 
        id="printModalContainer" 
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] transition-all duration-200 ${
          paperWidth === '58mm' ? 'max-w-sm' : 'max-w-md'
        }`}
      >
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="p-4 border-b border-slate-200 no-print space-y-3 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {(contextReceipt?.addonKotReceipt || contextReceipt?.voidKotReceipt) ? (
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveSlipTab('BILL')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                      activeSlipTab === 'BILL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-300/60'
                    }`}
                  >
                    <ReceiptText className="w-3.5 h-3.5" />
                    <span>Bill / Memo</span>
                  </button>

                  {contextReceipt.addonKotReceipt && (
                    <button
                      type="button"
                      onClick={() => setActiveSlipTab('ADDON_KOT')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                        activeSlipTab === 'ADDON_KOT'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-300/60'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>KOT (#{contextReceipt.addonKotReceipt.kotSequence || contextReceipt.addonKotReceipt.kotCount || 2})</span>
                    </button>
                  )}

                  {contextReceipt.voidKotReceipt && (
                    <button
                      type="button"
                      onClick={() => setActiveSlipTab('VOID_KOT')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                        activeSlipTab === 'VOID_KOT'
                          ? 'bg-rose-700 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-300/60'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5 animate-bounce" />
                      <span>VOID KOT</span>
                    </button>
                  )}
                </div>
              ) : isCancelKot ? (
                <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black flex items-center gap-1.5 shadow-sm text-xs">
                  <ChefHat className="w-4 h-4 animate-bounce" />
                  <span>VOID KOT (CANCELLED)</span>
                </div>
              ) : isKot ? (
                <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black flex items-center gap-1.5 shadow-sm text-xs">
                  <ChefHat className="w-4 h-4" />
                  <span>KOT Ticket</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#004b9b] font-bold text-xs border border-blue-200 shadow-xs">
                  <ReceiptText className="w-3.5 h-3.5" />
                  <span>Bill / Memo</span>
                </div>
              )}

              <div className="text-xs font-bold text-slate-800">
                <span>{printableReceipt.tableName}</span>
                <span className="text-slate-400 font-normal ml-1">({paperWidth})</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowConfigBar(!showConfigBar)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showConfigBar 
                    ? 'bg-[#004b9b] text-white border-[#004b9b]' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Toggle Printer & Template Routing"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Routing</span>
              </button>

              <button
                id="close-thermal-receipt"
                onClick={closePrintReceipt}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Real-time Hardware Thermal Print Feedback */}
          {hardwarePrintStatus && (
            <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
              hardwarePrintStatus.startsWith('✅') 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-amber-600 text-white shadow-xs'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{hardwarePrintStatus}</span>
            </div>
          )}

          {/* Quick Hardware Routing Toolbar (Collapsible or visible) */}
          {showConfigBar && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs animate-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 text-[10px] mb-1 flex items-center gap-1">
                    <Printer className="w-3 h-3 text-blue-600" />
                    Target Hardware Printer:
                  </label>
                  <select
                    value={selectedPrinterId}
                    onChange={e => setSelectedPrinterId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#004b9b]"
                  >
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.connectionType} • {p.paperWidth}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-[10px] mb-1 flex items-center gap-1">
                    <ReceiptText className="w-3 h-3 text-[#004b9b]" />
                    Print Template:
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#004b9b]"
                  >
                    {templates
                      .filter(t => isKot ? (t.templateType === 'KOT' || t.templateType === 'BOTH') : (t.templateType === 'BILL' || t.templateType === 'BOTH'))
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} [{t.paperWidth}] {t.showPricesOnKot ? '• ৳ Price ON' : ''} {t.isDefault ? '★' : ''}
                        </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Printer Details pill */}
              {activePrinter && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                  <div className="flex items-center gap-1">
                    {activePrinter.connectionType === 'LAN' ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Wifi className="w-2.5 h-2.5" /> LAN: {activePrinter.ipAddress || '192.168.1.100'}:{activePrinter.port || 9100}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        <Usb className="w-2.5 h-2.5" /> USB: {activePrinter.usbPort || 'USB001'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-700">Paper: {paperWidth}</span>
                </div>
              )}
            </div>
          )}

          {/* Hardware Print Feedback Alert */}
          {hardwarePrintStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hardware Printer Status:</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-200 font-mono text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-bold">
                {hardwarePrintStatus}
              </div>
            </div>
          )}

          {/* Department filter tabs for KOT routing */}
          {isKot && orderDepartments.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-amber-500" />
                  Kitchen Station Routing:
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {orderDepartments.length} Stations Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
                {/* 1. Split All Button (Single printer auto-split cuts) */}
                <button
                  type="button"
                  onClick={() => handleSelectDept('SPLIT_ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition flex flex-col items-start cursor-pointer border ${
                    selectedDeptFilter === 'SPLIT_ALL'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Split into separate slips with auto-cut for each station"
                >
                  <span className="text-xs flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-amber-300" />
                    Separate Slips ({activeOrderDepartments.length} Active)
                  </span>
                  <span className="text-[9px] opacity-80 font-normal">Auto-Cut per Dept</span>
                </button>

                {/* 2. Master KOT Button (Single Combined Slip) */}
                <button
                  type="button"
                  onClick={() => handleSelectDept('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition flex flex-col items-start cursor-pointer border ${
                    selectedDeptFilter === 'ALL'
                      ? 'bg-[#004b9b] text-white border-[#004b9b] shadow-xs ring-2 ring-blue-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Master KOT: All items in 1 combined slip"
                >
                  <span className="text-xs">Combined Slip ({enrichedItems.length})</span>
                  <span className="text-[9px] opacity-75 font-normal">Master KOT (1 Slip)</span>
                </button>

                {/* 3. Individual Department Station Tabs */}
                {orderDepartments.map(dept => {
                  const isDeptActive = isDepartmentKotActive(dept, templates);
                  const count = enrichedItems.filter(i => i.department === dept).length;
                  const deptPrinter = getPrinterForDept(dept);
                  const isSelected = selectedDeptFilter === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectDept(dept)}
                      className={`px-2.5 py-1.5 rounded-xl font-bold shrink-0 transition flex flex-col items-start cursor-pointer border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : !isDeptActive
                          ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isDeptActive ? `Station: ${dept}` : `Station: ${dept} (Inactive - KOT Muted)`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${!isDeptActive ? 'line-through text-slate-400' : ''}`}>{dept} ({count})</span>
                        {!isDeptActive && (
                          <span className="text-[9px] px-1 bg-amber-100 text-amber-800 rounded font-normal">Inactive</span>
                        )}
                      </div>
                      <span className="text-[9px] opacity-85 font-mono truncate max-w-[130px]">
                        {isDeptActive ? `➔ ${deptPrinter?.name || 'Default Printer'}` : '🔇 Print Muted'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Printable Thermal Receipt / KOT Body */}
        <div 
          id="printReceiptModal" 
          className={`flex-1 overflow-y-auto my-2 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-900 font-mono text-xs mx-4 custom-scrollbar ${
            paperWidth === '58mm' ? 'max-w-[280px] mx-auto text-[11px]' : 'max-w-[360px] mx-auto text-xs'
          }`}
        >
          {isKot ? (
            /* ===== KITCHEN ORDER TICKET (KOT / VOID KOT) LAYOUT ===== */
            selectedDeptFilter === 'SPLIT_ALL' ? (
              <div className="space-y-6 print:space-y-0">
                {activeOrderDepartments.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-800 my-4">
                    <p className="font-bold">⚠️ All kitchen stations in this order are inactive for KOT printing.</p>
                    <p className="text-xs text-amber-700 mt-1">No physical KOT slips will be printed to hardware.</p>
                  </div>
                ) : (
                  activeOrderDepartments.map((dept, idx) => {
                    const deptItems = enrichedItems.filter(i => i.department === dept);
                    if (deptItems.length === 0) return null;
                    const deptPrinter = getPrinterForDept(dept);
                    return (
                      <div 
                        key={dept} 
                        className="kot-slip-page bg-white p-3 rounded-xl border border-dashed border-slate-300 shadow-xs print:p-0 print:border-none print:shadow-none"
                      >
                        {idx > 0 && (
                          <div className="no-print -mt-1.5 mb-3 py-1 px-2 bg-amber-50 border border-dashed border-amber-300 rounded text-center text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5 text-amber-600" />
                            <span>✂️ Thermal Paper Auto-Cut ({dept})</span>
                          </div>
                        )}
                        {renderKotTicketLayout(deptItems, dept, deptPrinter, idx + 1, activeOrderDepartments.length)}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="kot-slip-page bg-white p-1 print:p-0">
                {renderKotTicketLayout(
                  displayedItems, 
                  selectedDeptFilter === 'ALL' ? undefined : selectedDeptFilter, 
                  activePrinter
                )}
              </div>
            )
          ) : (
            /* ===== CUSTOMER BILL / CASH MEMO LAYOUT ===== */
            <div>
              {/* Restaurant Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                {activeTemplate?.showLogo !== false && profile?.logoUrl && (
                  <div className="flex justify-center mb-1.5">
                    <img 
                      src={profile.logoUrl} 
                      alt="Logo" 
                      className="h-10 max-w-[140px] object-contain grayscale"
                    />
                  </div>
                )}
                <h2 className="font-extrabold text-base tracking-tight font-sans text-slate-900 uppercase">
                  {restaurantName}
                </h2>
                {activeTemplate?.showAddress !== false && (
                  <p className="text-[11px] text-slate-600 font-sans">
                    {restaurantAddress}
                  </p>
                )}
                {activeTemplate?.showPhone !== false && (
                  <p className="text-[10px] text-slate-500 font-sans">
                    Hotline: {restaurantHotline}
                  </p>
                )}
                {activeTemplate?.showBinVat !== false && restaurantBin && (
                  <p className="text-[10px] text-slate-500 font-sans">
                    BIN / VAT Reg: {restaurantBin}
                  </p>
                )}
                <div className="mt-2 inline-block px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold uppercase tracking-wider font-sans">
                  {printableReceipt.isSettled ? 'PAID CASH MEMO' : (activeTemplate?.headerTitle || 'TABLE RUNNING BILL')}
                </div>
              </div>

              {/* Invoice Info with Table & Zone */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Invoice No:</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="font-bold">{printableReceipt.invoiceNo}</span>
                    {printableReceipt.billVersion && printableReceipt.billVersion > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                        Rev #{printableReceipt.billVersion}
                      </span>
                    )}
                  </div>
                </div>

                {activeTemplate?.showDateTime !== false && (
                  <div className="flex justify-between">
                    <span><span className="text-slate-500">Date :</span> <span className="font-semibold text-slate-800">{receiptDateStr}</span></span>
                    <span><span className="text-slate-500">Time:</span> <span className="font-semibold text-slate-800">{receiptTimeStr}</span></span>
                  </div>
                )}
                {activeTemplate?.showTableZone !== false && (
                  <div className="flex justify-between items-center py-0.5 bg-amber-50/80 px-1 rounded">
                    <span className="text-slate-700 font-semibold">Table & Zone:</span>
                    <span className="font-black text-amber-950 font-sans">
                      {printableReceipt.tableName} ({printableReceipt.tableZone || 'Floor 1'})
                    </span>
                  </div>
                )}
                {printableReceipt.channelOrAgent && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Channel:</span>
                    <span className="font-bold text-amber-900 font-sans">{printableReceipt.channelOrAgent}</span>
                  </div>
                )}
                {activeTemplate?.showWaiter !== false && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waiter:</span>
                    <span className="font-bold text-slate-800">
                      {printableReceipt.waiter && printableReceipt.waiter !== 'N/A' && printableReceipt.waiter !== 'Staff' ? printableReceipt.waiter : (printableReceipt.waiter || 'Not Assigned')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Taken By:</span>
                  <span className="font-semibold">{printableReceipt.orderTakenBy || 'Cashier'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Settled By:</span>
                  <span className="font-bold text-slate-800">{printableReceipt.isSettled ? (printableReceipt.settleBillRole || 'Cashier') : (printableReceipt.settleBillRole || '')}</span>
                </div>
                {activeTemplate?.showCustomer !== false && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="truncate max-w-[150px] font-medium">{printableReceipt.customer}</span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 text-xs">
                      <th className="py-1 w-[46%] text-left">Item</th>
                      <th className="py-1 w-[14%] text-center">Qty</th>
                      <th className="py-1 w-[18%] text-right font-mono">Price</th>
                      <th className="py-1 w-[22%] text-right font-mono">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedItems.map((item, idx) => (
                      <tr key={idx} className="py-1.5">
                        <td className="py-1.5 w-[46%] pr-1 font-sans">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          {item.selectedVariation && (
                            <div className="text-[10px] text-blue-600 font-medium">{item.selectedVariation.name}</div>
                          )}
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <div className="text-[9px] text-slate-500">+{item.selectedAddons.map(a => a.name).join(', ')}</div>
                          )}
                          {item.notes && (
                            <div className="text-[9px] text-amber-700 italic">📝 {item.notes}</div>
                          )}
                        </td>
                        <td className="py-1.5 w-[14%] text-center font-bold text-slate-800">{item.qty}</td>
                        <td className="py-1.5 w-[18%] text-right font-mono text-slate-700">৳{Number(item.price).toFixed(2)}</td>
                        <td className="py-1.5 w-[22%] text-right font-mono font-bold text-slate-900">৳{Number(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation */}
              <div className="py-2 space-y-1.5 text-xs border-b border-dashed border-slate-400">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Subtotal:</span>
                  <span className="font-bold font-mono text-slate-900">৳{Number(displayedSubtotal).toFixed(2)}</span>
                </div>

                {printableReceipt.discountDeduction > 0 && (
                  <div className="flex justify-between items-center text-emerald-700">
                    <span>
                      Discount 
                      {printableReceipt.discountType === 'percent' ? ` (${printableReceipt.discountVal}%)` : ''}:
                    </span>
                    <span className="font-mono font-semibold">- ৳{Number(printableReceipt.discountDeduction).toFixed(2)}</span>
                  </div>
                )}

                {printableReceipt.vatVal && printableReceipt.vatVal > 0 ? (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>
                      VAT ({printableReceipt.vatPercent || 5}% {printableReceipt.vatMode === 'inclusive' ? 'Included' : 'Extra'}):
                    </span>
                    <span className="font-mono font-semibold">
                      {printableReceipt.vatMode === 'exclusive' ? '+ ' : ''}৳{Number(printableReceipt.vatVal).toFixed(2)}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-300">
                  <span>Net Total:</span>
                  <span className="font-mono text-base font-black text-amber-600">৳{Number(printableReceipt.netTotal).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Breakdown (if settled) */}
              {activeTemplate?.showPaymentBreakdown !== false && printableReceipt.paymentBreakdown && (
                <div className="py-2 text-[11px] border-b border-dashed border-slate-300 space-y-1">
                  <div className="text-slate-500 font-semibold mb-1">Payment Method Details:</div>
                  {printableReceipt.paymentBreakdown.byMethod && Object.keys(printableReceipt.paymentBreakdown.byMethod).length > 0 ? (
                    Object.entries(printableReceipt.paymentBreakdown.byMethod).map(([mKey, amt]) => {
                      if (!amt || Number(amt) <= 0) return null;
                      if (mKey === 'advance') {
                        return (
                          <div key="advance" className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-50/70 px-1 py-0.5 rounded">
                            <span>Customer Advance Adjusted:</span>
                            <span className="font-mono font-bold text-emerald-900">৳{Number(amt).toFixed(2)}</span>
                          </div>
                        );
                      }
                      const methodObj = (data?.paymentMethods || []).find(m => m.id === mKey || m.name.toLowerCase() === mKey.toLowerCase());
                      const mName = methodObj?.name || mKey;
                      const isDue = methodObj?.type === 'CREDIT' || mName.toLowerCase().includes('due');
                      return (
                        <div key={mKey} className={`flex justify-between items-center ${isDue ? 'text-amber-800 font-bold' : ''}`}>
                          <span className={isDue ? '' : 'text-slate-600'}>{mName}:</span>
                          <span className="font-mono font-semibold text-slate-800">৳{Number(amt).toFixed(2)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      {printableReceipt.paymentBreakdown.advance ? (
                        <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-50/70 px-1 py-0.5 rounded">
                          <span>Customer Advance Adjusted:</span>
                          <span className="font-mono font-bold text-emerald-900">৳{Number(printableReceipt.paymentBreakdown.advance).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {printableReceipt.paymentBreakdown.cash ? (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Cash Received:</span>
                          <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.cash).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {printableReceipt.paymentBreakdown.card ? (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Card:</span>
                          <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.card).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {printableReceipt.paymentBreakdown.bkash ? (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">bKash:</span>
                          <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.bkash).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {printableReceipt.paymentBreakdown.nagad ? (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Nagad:</span>
                          <span className="font-mono font-semibold text-slate-800">৳{Number(printableReceipt.paymentBreakdown.nagad).toFixed(2)}</span>
                        </div>
                      ) : null}
                      {printableReceipt.paymentBreakdown.due ? (
                        <div className="flex justify-between items-center text-amber-800 font-bold">
                          <span>Customer Due:</span>
                          <span className="font-mono font-bold">৳{Number(printableReceipt.paymentBreakdown.due).toFixed(2)}</span>
                        </div>
                      ) : null}
                    </>
                  )}
                  {printableReceipt.changeReturn !== undefined && printableReceipt.changeReturn > 0 && (
                    <div className="flex justify-between items-center font-bold text-emerald-800 pt-1 border-t border-slate-200">
                      <span>Change Given:</span>
                      <span className="font-mono">৳{Number(printableReceipt.changeReturn).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Note */}
              <div className="text-center pt-3 text-[10px] text-slate-500 font-sans">
                <p className="font-semibold text-slate-700">
                  {activeTemplate?.footerMessage || `Thank you for dining at ${restaurantName}!`}
                </p>
                <p>
                  {activeTemplate?.footerNotes || `Powered by ${restaurantName} • All VAT & Taxes Included`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Hidden in Print) */}
        <div className="p-4 border-t border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2.5 no-print bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={closePrintReceipt}
            className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 text-xs transition cursor-pointer"
          >
            Close
          </button>

          {!hasMatchingActivePrinter ? (
            <div
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 text-slate-500 flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300"
              title={isKot ? "No active KOT printer configured in Settings" : "No active Bill printer configured in Settings"}
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>{isKot ? "KOT Printer Inactive" : "Bill Printer Inactive"}</span>
            </div>
          ) : (
            <button
              type="button"
              id="btn-trigger-print"
            disabled={isPrinting}
            onClick={handlePrint}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              isKot
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#004b9b] hover:bg-[#005bb8] text-white'
            }`}
          >
            {isPrinting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Printing...</span>
              </span>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>
                  {isCancelKot 
                    ? `Print Cancel KOT (${paperWidth})` 
                    : isKot 
                      ? selectedDeptFilter === 'SPLIT_ALL'
                        ? `Print KOT (${activeOrderDepartments.length} slips auto-cut)`
                        : selectedDeptFilter === 'ALL'
                          ? `Print Master KOT (${paperWidth})`
                          : `Print ${selectedDeptFilter} Slip (${paperWidth})`
                      : `Print Bill (${paperWidth})`}
                </span>
              </>
            )}
          </button>
          )}

          <button
            type="button"
            id="btn-export-receipt-pdf"
            onClick={handleExportPdf}
            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Export and Save Receipt as clean PDF"
          >
            <Download className="w-4 h-4" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
