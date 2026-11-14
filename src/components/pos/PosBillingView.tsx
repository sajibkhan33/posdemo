import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRestaurant, isSaleActive } from '../../context/RestaurantContext';
import { 
  Search, 
  Utensils, 
  ArrowLeft, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CreditCard, 
  PauseCircle, 
  User, 
  Percent, 
  Coins, 
  Layers, 
  Check, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  MapPin,
  Filter,
  Building2,
  ReceiptText,
  LayoutGrid,
  Grid3X3,
  Maximize2,
  SlidersHorizontal,
  Power,
  RotateCcw,
  RefreshCw,
  ShieldAlert,
  Ban,
  ShieldCheck,
  CheckCircle2,
  CheckCheck,
  Scaling,
  MoveDiagonal,
  Wand2,
  X,
  FileText,
  Edit2,
  UserCheck,
  BookOpen,
  ArrowRightLeft,
  Lock,
  Unlock,
  Sun,
  Moon,
  LogOut,
  Clock,
  Timer
} from 'lucide-react';
import { DiscountType, Table, TableCartItem, MenuItem } from '../../types';
import { VoidItemModal } from './VoidItemModal';
import { ReleaseTableModal } from './ReleaseTableModal';
import { ItemVariationModal } from './ItemVariationModal';
import { SelectWaiterCustomerModal } from './SelectWaiterCustomerModal';

export interface TableDimensions {
  width: number;
  height: number;
}

const TABLE_SIZE_PRESETS: Record<'compact' | 'medium' | 'large' | 'xl', TableDimensions> = {
  compact: { width: 110, height: 75 },
  medium: { width: 150, height: 100 },
  large: { width: 200, height: 135 },
  xl: { width: 260, height: 175 },
};

interface CartItemQtyInputProps {
  qty: number;
  minQty: number;
  disabled?: boolean;
  onCommit: (newQty: number) => void;
  onVoidRequest?: () => void;
}

const CartItemQtyInput: React.FC<CartItemQtyInputProps> = ({
  qty,
  minQty,
  disabled,
  onCommit,
  onVoidRequest
}) => {
  const [val, setVal] = useState<string>(String(qty));

  useEffect(() => {
    setVal(String(qty));
  }, [qty]);

  const handleBlurOrCommit = () => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) {
      setVal(String(qty));
      return;
    }
    if (minQty && num < minQty) {
      setVal(String(qty));
      if (onVoidRequest) onVoidRequest();
      return;
    }
    if (num !== qty) {
      onCommit(num);
    }
  };

  return (
    <input
      type="number"
      min={minQty}
      disabled={disabled}
      value={val}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        const parsed = parseInt(next, 10);
        if (!isNaN(parsed) && parsed >= minQty) {
          onCommit(parsed);
        }
      }}
      onBlur={handleBlurOrCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleBlurOrCommit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-8 h-6 text-center font-black text-xs text-slate-900 bg-white border border-slate-300 rounded-md shadow-2xs hover:border-[#004b9b] focus:ring-1 focus:ring-[#004b9b] focus:border-[#004b9b] focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text px-0.5 select-all transition"
      title="Click to type quantity directly"
    />
  );
};

export const PosBillingView: React.FC = () => {
  const { 
    data, 
    activeTableId, 
    setActiveTableId, 
    posView, 
    setPosView,
    selectTable,
    addToCart,
    updateCartQty,
    updateCartItemQty,
    setCartItemQty,
    updateCartItemNotes,
    removeCartItem,
    voidCartItem,
    releaseTable,
    cancelPosOrder,
    clearCart,
    setTableDiscount,
    setTableWaiter,
    setTableCustomer,
    setTableZone,
    holdTableOrder,
    updateGlobalTableDimensions,
    openPrintBill,
    openPrintKot,
    directSubmitKotAndHold,
    directPrintBill,
    openSettleModal,
    addCustomTable,
    addTableZone,
    setIsStartSessionModalOpen,
    setIsCloseSessionModalOpen,
    setIsWaiterShiftModalOpen,
    activeSessionStats,
    businessDay,
    endSession,
    currentUser,
    setActiveTab,
    canAccessTab,
    language,
    t,
    voidSale,
    finishLinkedOrderInPos
  } = useRestaurant();

  const activeTable = data.tables?.find(t => t.id === activeTableId) || data.tables?.[0];
  const isWaiter = currentUser?.role === 'WAITER';
  const hasActiveKotPrinter = Boolean(
    (data.printers || []).some(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL'))
  );
  const hasActiveBillPrinter = Boolean(
    (data.printers || []).some(p => p.isActive && (p.type === 'BILL' || p.type === 'ALL'))
  );
  const activeTableHasActiveKotPrinter = useMemo(() => {
    const activeKotPrinters = (data.printers || []).filter(p => p.isActive && (p.type === 'KOT' || p.type === 'ALL'));
    if (activeKotPrinters.length === 0) return false;
    if (!activeTable || !activeTable.cart || activeTable.cart.length === 0) return true;
    const unprintedItems = activeTable.cart.filter(i => {
      const alreadyPrintedQty = i.kotPrintedQty || (i.kotPrinted ? i.qty : 0);
      return (i.qty - alreadyPrintedQty) > 0;
    });
    if (unprintedItems.length === 0) return false;
    const hasGenericOrDef = activeKotPrinters.some(p => p.isDefault || !p.departments || p.departments.length === 0);
    if (hasGenericOrDef) return true;
    return unprintedItems.some(i => {
      const dept = i.department || 'Main Kitchen';
      return activeKotPrinters.some(p => p.departments?.includes(dept));
    });
  }, [data.printers, activeTable]);
  const isRoleAllowed = Boolean(currentUser?.role && (data.orderEditPermissions?.[currentUser.role] ?? (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'CASHIER')));
  const canCancelOrEditOrder = 
    currentUser?.role === 'ADMIN' || 
    currentUser?.role === 'MANAGER' || 
    Boolean(currentUser?.canEditSubmittedOrders) ||
    isRoleAllowed;

  // Void and Release Modals state
  const [voidingItem, setVoidingItem] = useState<{ item: TableCartItem; index: number } | null>(null);
  const [releasingTable, setReleasingTable] = useState<Table | null>(null);
  const [selectedDishForCustomization, setSelectedDishForCustomization] = useState<MenuItem | null>(null);
  // Billed table is strictly locked in POS
  const canUnlockBilledTable = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || Boolean(currentUser?.canEditSubmittedOrders);
  const [assigningTable, setAssigningTable] = useState<Table | null>(null);
  const [isSubmittingKot, setIsSubmittingKot] = useState(false);

  // Special Note for Cart Item
  const [editingNoteItem, setEditingNoteItem] = useState<{ item: TableCartItem; index: number } | null>(null);
  const [itemNoteInput, setItemNoteInput] = useState<string>('');

  // Direct Bill Print Feedback State
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [billPrintedSuccess, setBillPrintedSuccess] = useState(false);

  // Live Clock Tick for Order Elapsed Minutes Tracking
  
  // Cart container auto-scroll on new item addition
  const cartListRef = useRef<HTMLDivElement>(null);
  const prevCartLengthRef = useRef<number>(0);
  useEffect(() => {
    const curLen = activeTable?.cart?.length || 0;
    if (curLen > prevCartLengthRef.current && cartListRef.current) {
      cartListRef.current.scrollTop = cartListRef.current.scrollHeight;
    }
    prevCartLengthRef.current = curLen;
  }, [activeTable?.cart?.length]);
const [nowTime, setNowTime] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const handleTableCardClick = (table: Table) => {
    setActiveTableId(table.id);
    if (table.status === 'billed') {
      if (isWaiter) {
        alert("This table's bill has already been printed. Awaiting payment settlement.");
      } else {
        openSettleModal(table.id);
      }
      return;
    }
    selectTable(table.id);
  };

  // Floor Plan Filters
  const [selectedFloorZone, setSelectedFloorZone] = useState<string>('ALL');
  const [tableStatusFilter, setTableStatusFilter] = useState<'ALL' | 'free' | 'hold' | 'billed'>('ALL');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');

  // Global Table Card Dimensions & Custom Table Overrides
  const [globalTableDimensions, setGlobalTableDimensions] = useState<TableDimensions>(() => {
    if (data.tableDimensions && data.tableDimensions.width && data.tableDimensions.height) {
      if (
        (data.tableDimensions.width === 210 && data.tableDimensions.height === 140) ||
        (data.tableDimensions.width === 147 && data.tableDimensions.height === 98)
      ) {
        return TABLE_SIZE_PRESETS.compact;
      }
      return data.tableDimensions;
    }
    try {
      const saved = localStorage.getItem('pos_table_global_dims');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          (parsed.width === 210 && parsed.height === 140) ||
          (parsed.width === 147 && parsed.height === 98)
        ) {
          return TABLE_SIZE_PRESETS.compact;
        }
        if (parsed.width && parsed.height) return parsed;
      }
      const legacySize = localStorage.getItem('pos_table_card_size');
      if (legacySize === 'medium') return TABLE_SIZE_PRESETS.medium;
      if (legacySize === 'large') return TABLE_SIZE_PRESETS.large;
    } catch {
      // fallback
    }
    return TABLE_SIZE_PRESETS.compact;
  });

  // Keep globalTableDimensions in sync when server state updates tableDimensions
  useEffect(() => {
    if (data.tableDimensions && data.tableDimensions.width && data.tableDimensions.height) {
      if (
        (data.tableDimensions.width === 210 && data.tableDimensions.height === 140) ||
        (data.tableDimensions.width === 147 && data.tableDimensions.height === 98)
      ) {
        setGlobalTableDimensions(TABLE_SIZE_PRESETS.compact);
        updateGlobalTableDimensions(TABLE_SIZE_PRESETS.compact);
      } else {
        setGlobalTableDimensions(data.tableDimensions);
      }
      setCustomTableDimensions({});
    }
  }, [data.tableDimensions]);

  // Listen to immediate custom dimension updates dispatched from TableZoneEditModal
  useEffect(() => {
    const handleDimensionsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TableDimensions>;
      if (customEvent.detail) {
        setGlobalTableDimensions(customEvent.detail);
        setCustomTableDimensions({});
      }
    };
    window.addEventListener('pos_table_dimensions_updated', handleDimensionsUpdated);
    return () => {
      window.removeEventListener('pos_table_dimensions_updated', handleDimensionsUpdated);
    };
  }, []);

  const effectiveGlobalDimensions: TableDimensions = 
    ((data.tableDimensions?.width === 210 && data.tableDimensions?.height === 140) || (data.tableDimensions?.width === 147 && data.tableDimensions?.height === 98))
      ? TABLE_SIZE_PRESETS.compact
      : (data.tableDimensions || globalTableDimensions || TABLE_SIZE_PRESETS.compact);

  const [customTableDimensions, setCustomTableDimensions] = useState<{ [tableId: string]: TableDimensions }>(() => {
    try {
      const saved = localStorage.getItem('pos_table_custom_dims');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  // Active dragging state while resizing table card corner
  const [resizingState, setResizingState] = useState<{
    tableId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    currentWidth: number;
    currentHeight: number;
  } | null>(null);

  // Floating prompt when a table is resized with mouse
  const [lastResizedPrompt, setLastResizedPrompt] = useState<{
    tableId: string;
    tableName: string;
    width: number;
    height: number;
  } | null>(null);

  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [showCustomSizePanel, setShowCustomSizePanel] = useState<boolean>(false);

  const handlePresetSelect = (presetKey: 'compact' | 'medium' | 'large' | 'xl') => {
    const preset = TABLE_SIZE_PRESETS[presetKey];
    setGlobalTableDimensions(preset);
    setCustomTableDimensions({});
    setLastResizedPrompt(null);
    updateGlobalTableDimensions(preset);
    try {
      localStorage.setItem('pos_table_global_dims', JSON.stringify(preset));
      localStorage.removeItem('pos_table_custom_dims');
      localStorage.setItem('pos_table_card_size', presetKey);
    } catch {
      // ignore
    }
  };

  const handleApplyAll = (targetWidth?: number, targetHeight?: number) => {
    const widthToApply = targetWidth || lastResizedPrompt?.width || effectiveGlobalDimensions.width;
    const heightToApply = targetHeight || lastResizedPrompt?.height || effectiveGlobalDimensions.height;

    const newDims = { width: widthToApply, height: heightToApply };
    setGlobalTableDimensions(newDims);
    setCustomTableDimensions({});
    setLastResizedPrompt(null);
    updateGlobalTableDimensions(newDims);

    try {
      localStorage.setItem('pos_table_global_dims', JSON.stringify(newDims));
      localStorage.removeItem('pos_table_custom_dims');
    } catch {
      // ignore
    }

    setAppliedFeedback(`✅ Size (${widthToApply}px × ${heightToApply}px) applied to all ${data.tables.length} tables!`);
    setTimeout(() => setAppliedFeedback(null), 4000);
  };

  const handleResetTableSizes = () => {
    setGlobalTableDimensions(TABLE_SIZE_PRESETS.compact);
    setCustomTableDimensions({});
    setLastResizedPrompt(null);
    updateGlobalTableDimensions(TABLE_SIZE_PRESETS.compact);
    try {
      localStorage.setItem('pos_table_global_dims', JSON.stringify(TABLE_SIZE_PRESETS.compact));
      localStorage.removeItem('pos_table_custom_dims');
      localStorage.setItem('pos_table_card_size', 'compact');
    } catch {
      // ignore
    }
    setAppliedFeedback('🔄 Table size reset to standard default!');
    setTimeout(() => setAppliedFeedback(null), 3000);
  };

  // Mouse Drag Resize Start on table corner
  const handleResizeStart = (e: React.MouseEvent, tableId: string, currentW: number, currentH: number) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;

    setResizingState({
      tableId,
      startX,
      startY,
      startWidth: currentW,
      startHeight: currentH,
      currentWidth: currentW,
      currentHeight: currentH,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newW = Math.max(175, Math.min(550, Math.round(currentW + deltaX)));
      const newH = Math.max(120, Math.min(420, Math.round(currentH + deltaY)));

      setResizingState({
        tableId,
        startX,
        startY,
        startWidth: currentW,
        startHeight: currentH,
        currentWidth: newW,
        currentHeight: newH,
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - startX;
      const deltaY = upEvent.clientY - startY;
      const finalW = Math.max(175, Math.min(550, Math.round(currentW + deltaX)));
      const finalH = Math.max(120, Math.min(420, Math.round(currentH + deltaY)));

      setResizingState(null);

      // Save for this specific table
      setCustomTableDimensions(prev => {
        const updated = { ...prev, [tableId]: { width: finalW, height: finalH } };
        try {
          localStorage.setItem('pos_table_custom_dims', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      const tbl = data.tables.find(t => t.id === tableId);
      setLastResizedPrompt({
        tableId,
        tableName: tbl?.name || tableId,
        width: finalW,
        height: finalH,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // POS Order View Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isMobileCategoryDrawerOpen, setIsMobileCategoryDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Desktop Category Horizontal Scroll Handlers (Mouse Wheel, Drag & Buttons)
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const isCategoryDragging = useRef(false);
  const categoryStartX = useRef(0);
  const categoryScrollLeft = useRef(0);
  const categoryHasDragged = useRef(false);

  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(false);

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollCatLeft(scrollLeft > 2);
    setCanScrollCatRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    checkCategoryScroll();
    const el = categoryScrollRef.current;
    if (!el) return;
    window.addEventListener('resize', checkCategoryScroll);
    return () => window.removeEventListener('resize', checkCategoryScroll);
  }, [data.menuCategories]);

  const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkCategoryScroll();
    }
  };

  const handleCategoryMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    isCategoryDragging.current = true;
    categoryStartX.current = e.pageX - el.offsetLeft;
    categoryScrollLeft.current = el.scrollLeft;
    categoryHasDragged.current = false;
  };

  const handleCategoryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCategoryDragging.current) return;
    const el = categoryScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - categoryStartX.current);
    if (Math.abs(walk) > 5) {
      categoryHasDragged.current = true;
    }
    el.scrollLeft = categoryScrollLeft.current - walk;
    checkCategoryScroll();
  };

  const handleCategoryMouseUp = () => {
    isCategoryDragging.current = false;
  };

  const handleCategoryMouseLeave = () => {
    isCategoryDragging.current = false;
  };

  const handleScrollCat = (direction: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = 180;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    setTimeout(checkCategoryScroll, 300);
  };

  const allZones = data.tableZones && data.tableZones.length > 0 
    ? data.tableZones 
    : ['Floor 1', 'Floor 2', 'VIP Lounge', 'Rooftop Garden'];



  // Filtered menu items (Memoized to eliminate main-thread lag during rapid typing/clicks)
  // SMART SEARCH: When search is active, ignore category filter and search globally
  const filteredMenuItems = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;
    return data.menuItems.filter(item => {
      if (selectedDept !== 'ALL' && item.department !== selectedDept) return false;
      // When searching, bypass category filter for global search across all categories
      if (!hasSearch && selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (hasSearch) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [data.menuItems, selectedDept, selectedCategory, searchQuery]);

  // Mobile Terminal Tab: 'menu' (Food Menu catalog) or 'cart' (Order, Cart & Bill)
  const [mobilePosTab, setMobilePosTab] = useState<'menu' | 'cart'>('menu');

  // Automatically reset to 'menu' view when selecting a table
  useEffect(() => {
    setMobilePosTab('menu');
  }, [activeTableId]);

  // Financial calculations for active table
  const subtotal = activeTable?.cart?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;
  const discountDeduction = activeTable?.discountType === 'percent'
    ? (subtotal * (activeTable?.discountVal || 0)) / 100
    : (activeTable?.discountVal || 0);
  const baseAfterDiscount = Math.max(0, subtotal - discountDeduction);

  const profile = data.restaurantProfile;
  const vatPct = Number(profile?.vatPercent ?? 5);
  const isVatEnabled = Boolean(profile?.enableVat ?? (vatPct > 0));
  const vatMode = profile?.vatMode || 'inclusive';

  let cartVatVal = 0;
  let netTotal = Math.round(baseAfterDiscount);

  if (isVatEnabled && vatPct > 0) {
    if (vatMode === 'exclusive') {
      cartVatVal = Math.round(((baseAfterDiscount * vatPct) / 100) * 100) / 100;
      netTotal = Math.round(baseAfterDiscount + cartVatVal);
    } else {
      cartVatVal = Math.round(((baseAfterDiscount * vatPct) / (100 + vatPct)) * 100) / 100;
      netTotal = Math.round(baseAfterDiscount);
    }
  }
  const cartTotalQty = activeTable?.cart?.reduce((sum, item) => sum + item.qty, 0) || 0;

  // Filtered floor plan tables sorted sequentially by floor/zone order and table number
  const filteredTables = data.tables.filter(table => {
    const tableZone = table.zone || 'Floor 1';
    if (selectedFloorZone !== 'ALL' && tableZone !== selectedFloorZone) {
      return false;
    }
    if (tableStatusFilter !== 'ALL' && table.status !== tableStatusFilter) {
      return false;
    }
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      const matchName = table.name.toLowerCase().includes(q);
      const matchId = table.id.toLowerCase().includes(q);
      const matchZone = tableZone.toLowerCase().includes(q);
      const matchWaiter = (table.waiter || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchZone && !matchWaiter) return false;
    }
    return true;
  }).sort((a, b) => {
    const zoneA = a.zone || 'Floor 1';
    const zoneB = b.zone || 'Floor 1';
    const idxA = allZones.indexOf(zoneA);
    const idxB = allZones.indexOf(zoneB);
    const effA = idxA === -1 ? 999 : idxA;
    const effB = idxB === -1 ? 999 : idxB;
    if (effA !== effB) {
      return effA - effB;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  // If on Floor view:
  if (posView === 'floor') {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {/* Floor Header */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          {/* Floor Plan Zone Selector Tabs & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Zone Pills (All Zone, Floor 1, Floor 2, VIP, etc.) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#004b9b]" />
                Zones:
              </span>

              {/* ALL ZONES BUTTON */}
              <button
                type="button"
                id="zone-tab-all"
                onClick={() => setSelectedFloorZone('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  selectedFloorZone === 'ALL'
                    ? 'bg-black text-white shadow-sm ring-2 ring-[#004b9b]/50 border border-slate-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>All Zones</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFloorZone === 'ALL' ? 'bg-[#004b9b] text-white font-black' : 'bg-slate-200 text-slate-600'
                }`}>
                  {data.tables.length}
                </span>
              </button>

              {/* DYNAMIC ZONE TABS */}
              {allZones.map(zone => {
                const countInZone = data.tables.filter(t => (t.zone || 'Floor 1') === zone).length;
                const activeInZone = data.tables.filter(t => (t.zone || 'Floor 1') === zone && t.status !== 'free').length;
                const isSelected = selectedFloorZone === zone;

                return (
                  <button
                    key={zone}
                    id={`zone-tab-${zone.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setSelectedFloorZone(zone)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#004b9b] text-white shadow-sm ring-2 ring-blue-500/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{zone}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected 
                        ? 'bg-black text-blue-300 font-bold' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {countInZone}
                    </span>
                    {activeInZone > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title={`${activeInZone} Active`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Table Search input & Waiter Handover Button */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearchQuery}
                  onChange={e => setTableSearchQuery(e.target.value)}
                  placeholder="Search table, zone, or waiter..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#004b9b] focus:border-[#004b9b] focus:outline-none"
                />
              </div>

              {(currentUser?.role === 'CASHIER' || currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN') && (
                <>
                  {!businessDay?.isOpen ? (
                    <button
                      type="button"
                      id="btn-pos-day-start"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                      title="Start Business Day & Shift 1"
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Day Start (Shift 1)</span>
                    </button>
                  ) : !data.session?.isActive ? (
                    <button
                      type="button"
                      id="btn-pos-start-shift"
                      onClick={() => setIsStartSessionModalOpen(true)}
                      className="px-3 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                      title="Start Shift 2"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{businessDay?.pendingHandoverCashier ? 'Start Shift 2' : 'Open Shift'}</span>
                    </button>
                  ) : null}
                </>
              )}

            </div>
          </div>
        </div>

        {/* Applied Feedback Notification */}
        {appliedFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{appliedFeedback}</span>
            </div>
            <button onClick={() => setAppliedFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Prompt after Mouse Corner Drag Resize */}
        {lastResizedPrompt && (
          <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-[#002652] text-white rounded-2xl border-2 border-[#004b9b] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#004b9b] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <Scaling className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-blue-300 flex items-center gap-1.5">
                  <span>📐 {lastResizedPrompt.tableName} Table Resized:</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-blue-400/40 text-white">
                    {lastResizedPrompt.width}px × {lastResizedPrompt.height}px
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] mt-0.5">
                  Do you want to apply this size to all tables on the floor?
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-apply-all-prompt"
                onClick={() => handleApplyAll(lastResizedPrompt.width, lastResizedPrompt.height)}
                className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-white" />
                <span>Apply to All Tables</span>
              </button>
              <button
                type="button"
                onClick={() => setLastResizedPrompt(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Floor Table Cards Grid */}
        {filteredTables.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No tables found matching this filter</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try switching to "All Zones" or resetting status filters.
            </p>
            <button
              type="button"
              onClick={() => { setSelectedFloorZone('ALL'); setTableStatusFilter('ALL'); setTableSearchQuery(''); }}
              className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div 
            className="grid gap-3.5 transition-all duration-150"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${effectiveGlobalDimensions.width}px, 1fr))`
            }}
          >
            {filteredTables.map(table => {
              const tableSubtotal = table.cart.reduce((s, i) => s + (i.price * i.qty), 0);
              const isReallyEmpty = !table.cart || table.cart.length === 0;
              const isHoldSyncOnKotOnly = data.restaurantProfile?.tableHoldSyncMode === 'on_kot';
              const hasAnyKotPrinted = !isReallyEmpty && table.cart.some(item => (item.kotPrintedQty || 0) > 0 || item.kotPrinted);
              const isFree = (table.status === 'free' || isReallyEmpty) || (isHoldSyncOnKotOnly && !hasAnyKotPrinted && table.status !== 'billed');
              const isHold = !isReallyEmpty && table.status === 'hold' && (!isHoldSyncOnKotOnly || hasAnyKotPrinted);
              const isBilled = !isReallyEmpty && table.status === 'billed';
              const hasUnprintedKot = !isReallyEmpty && table.cart.length > 0 && table.cart.some(item => !item.kotPrinted || item.qty > (item.kotPrintedQty || 0));
              const isBillPrinted = !isReallyEmpty && table.status === 'billed';
              const zoneLabel = table.zone || 'Floor 1';

              // Sizing specific variables
              const isBeingResized = resizingState?.tableId === table.id;
              const customDim = customTableDimensions[table.id];
              const cardWidth = isBeingResized ? resizingState.currentWidth : (customDim?.width || effectiveGlobalDimensions.width);
              const cardHeight = isBeingResized ? resizingState.currentHeight : (customDim?.height || effectiveGlobalDimensions.height);

              const isUltraCompact = cardHeight < 115 || cardWidth < 165;
              const isCompact = cardHeight < 155 || cardWidth < 225;
              const isLarge = cardHeight >= 215 || cardWidth >= 330;

              const cardPadding = isUltraCompact ? 'p-2.5 rounded-xl' : isCompact ? 'p-3 rounded-xl' : isLarge ? 'p-6 rounded-2xl' : 'p-4 rounded-2xl';
              const titleSize = isUltraCompact ? 'text-xs font-black' : isCompact ? 'text-sm font-black' : isLarge ? 'text-xl font-black' : 'text-base font-black';
              const zoneBadgeClass = isUltraCompact
                ? 'text-[8px] px-1 py-0.2 mt-0.5 rounded'
                : isCompact 
                  ? 'text-[9px] px-1.5 py-0.2 mt-0.5 rounded' 
                  : isLarge 
                    ? 'text-xs px-2.5 py-1 mt-1.5 rounded-lg' 
                    : 'text-[10px] px-2 py-0.5 mt-1 rounded-md';
              const statusBadgeClass = isUltraCompact
                ? 'px-1 py-0.2 text-[8px] font-black'
                : isCompact
                  ? 'px-1.5 py-0.5 text-[9px] font-black'
                  : isLarge
                    ? 'px-3 py-1 text-xs font-black'
                    : 'px-2 py-0.5 text-[11px] font-black';

              return (
                <div
                  key={table.id}
                  id={`table-card-${table.id}`}
                  style={{
                    minHeight: `${cardHeight}px`,
                  }}
                  onClick={() => {
                    if (isFree) {
                      if (!data.session || !data.session.isActive) {
                        setIsStartSessionModalOpen(true);
                        return;
                      }
                      const flow = data.restaurantProfile?.posTableOrderFlow || 'direct';
                      if (flow === 'modal') {
                        setAssigningTable(table);
                      } else {
                        selectTable(table.id);
                      }
                    }
                  }}
                  className={`${cardPadding} border-2 transition-all duration-150 flex flex-col justify-between relative overflow-hidden group shadow-xs hover:shadow-md select-none ${
                    isFree ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
                  } ${
                    isBeingResized
                      ? 'border-[#004b9b] ring-4 ring-blue-400/30 bg-blue-50/70 shadow-lg z-30'
                      : isFree 
                        ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white' 
                        : isHold
                          ? 'bg-[#004b9b] border-[#002b59] text-white ring-2 ring-blue-400/30'
                          : 'bg-blue-600 border-blue-700 text-white ring-2 ring-blue-400/30'
                  }`}
                >
                  {/* Active Resizing Overlay & Dimensions Badge */}
                  {isBeingResized && (
                    <div className="absolute inset-0 bg-[#004b9b]/10 border-2 border-dashed border-[#004b9b] rounded-2xl pointer-events-none flex items-center justify-center z-30 animate-pulse">
                      <div className="bg-slate-900 text-blue-300 font-mono font-black text-xs px-3 py-1.5 rounded-xl shadow-lg border border-blue-400/40 flex items-center gap-1.5">
                        <Scaling className="w-3.5 h-3.5 text-blue-400" />
                        <span>{cardWidth}px × {cardHeight}px</span>
                      </div>
                    </div>
                  )}

                  {isFree ? (
                    /* Centered Table Name & Floor (Free Table: No 1 badge, No 2 Take Order button) */
                    <div className="flex-1 flex flex-col items-center justify-center text-center my-auto p-0.5 select-none">
                      <h3 className={`${isUltraCompact ? 'text-sm font-black' : isCompact ? 'text-base font-black' : isLarge ? 'text-2xl font-black' : 'text-xl font-black'} text-white tracking-tight drop-shadow-xs`}>
                        {table.name}
                      </h3>
                      <div className={`inline-flex items-center gap-1 font-bold text-emerald-100 mt-0.5 ${isUltraCompact ? 'text-[9px]' : isCompact ? 'text-[10px]' : isLarge ? 'text-xs' : 'text-[11px]'}`}>
                        <MapPin className={`${isUltraCompact ? 'w-2 h-2' : isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-200 shrink-0`} />
                        <span>{zoneLabel}</span>
                      </div>
                    </div>
                  ) : (
                    /* Occupied / Hold / Billed Table */
                    <>
                      {/* Top: Name and Zone centered */}
                      <div onClick={() => handleTableCardClick(table)} className="cursor-pointer flex flex-col items-center text-center">
                        <div className="flex items-center justify-center gap-1.5 max-w-full">
                          <h3 className={`${titleSize} font-black text-white truncate`}>
                            {table.name}
                          </h3>
                        </div>
                        <div className={`inline-flex items-center gap-1 font-bold text-blue-100 ${zoneBadgeClass}`}>
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{zoneLabel}</span>
                        </div>
                      </div>

                      {/* Middle: Cart Overview */}
                      <div onClick={() => handleTableCardClick(table)} className={`cursor-pointer text-center ${isUltraCompact ? 'my-0.5' : isCompact ? 'my-1' : isLarge ? 'my-3' : 'my-2'}`}>
                        <div className={`${isUltraCompact ? 'text-xs font-black' : isCompact ? 'text-sm font-black' : isLarge ? 'text-2xl font-black' : 'text-lg font-black'} text-white`}>
                          ৳ {tableSubtotal.toLocaleString()}
                        </div>
                        <div className={`${isUltraCompact ? 'text-[8px]' : 'text-[10px]'} text-blue-100 font-semibold truncate`}>
                          {table.cart.length} items • <span>{table.waiter ? `Waiter: ${table.waiter}` : 'No Waiter'}</span>
                        </div>
                      </div>

                      {/* Bottom: Action bar */}
                      <div className={`border-t border-blue-700/60 flex items-center justify-between gap-1 ${isUltraCompact ? 'pt-1' : isCompact ? 'pt-1.5' : 'pt-2'} relative`}>
                        <div className="w-full flex items-center gap-1 pr-1.5">
                          {/* Quick KOT Direct Print - only if KOT printer active and table not billed */}
                          {hasActiveKotPrinter && hasUnprintedKot && !isBillPrinted && (
                            <button
                              type="button"
                              title="Direct Print KOT"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await directSubmitKotAndHold(table.id);
                              }}
                              className={`flex-1 bg-white/90 hover:bg-white text-slate-900 font-black flex items-center justify-center gap-0.5 transition cursor-pointer shadow-xs active:scale-95 ${
                                isUltraCompact ? 'py-0.5 px-0.5 rounded text-[8px]' : isCompact ? 'py-1 px-1 rounded-md text-[10px]' : isLarge ? 'py-2 px-2 rounded-xl text-xs' : 'py-1.5 px-1.5 rounded-lg text-[11px]'
                              }`}
                            >
                              <ChefHat className={isUltraCompact ? 'w-2 h-2 text-rose-600' : isCompact ? 'w-2.5 h-2.5 text-rose-600' : 'w-3 h-3 text-rose-600'} />
                              <span className={isUltraCompact ? 'hidden' : ''}>KOT</span>
                            </button>
                          )}

                          {/* Quick Bill Direct Print - only if Bill printer active and table not billed */}
                          {!isBillPrinted && (!table.cart || table.cart.length > 0) && (
                            <button
                              type="button"
                              title="Direct Print Bill"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await directPrintBill(table.id);
                              }}
                              className={`flex-1 bg-white/90 hover:bg-white text-slate-900 font-bold flex items-center justify-center gap-0.5 transition cursor-pointer shadow-xs active:scale-95 ${
                                isUltraCompact ? 'py-0.5 px-0.5 rounded text-[8px]' : isCompact ? 'py-1 px-1 rounded-md text-[10px]' : isLarge ? 'py-2 px-2 rounded-xl text-xs' : 'py-1.5 px-1.5 rounded-lg text-[11px]'
                              }`}
                            >
                              <Printer className={isUltraCompact ? 'w-2 h-2 text-slate-600' : isCompact ? 'w-2.5 h-2.5 text-slate-600' : 'w-3 h-3 text-slate-600'} />
                              <span className={isUltraCompact ? 'hidden' : ''}>Bill</span>
                            </button>
                          )}

                          {/* Settle / Pay Button (Hidden for WAITER role) */}
                          {!isWaiter && (
                            <button
                              type="button"
                              title="Settle Payment & Pay"
                              onClick={(e) => { e.stopPropagation(); openSettleModal(table.id); }}
                              className={`flex-1 bg-black hover:bg-slate-900 text-blue-300 font-black flex items-center justify-center gap-0.5 transition cursor-pointer shadow-xs active:scale-95 ${
                                isUltraCompact ? 'py-0.5 px-0.5 rounded text-[8px]' : isCompact ? 'py-1 px-1 rounded-md text-[10px]' : isLarge ? 'py-2 px-2 rounded-xl text-xs' : 'py-1.5 px-1.5 rounded-lg text-[11px]'
                              }`}
                            >
                              <CreditCard className={isUltraCompact ? 'w-2 h-2' : isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                              <span className={isUltraCompact ? 'hidden' : ''}>Pay</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                    {/* Corner Resize Drag Handle - only visible for ADMIN */}
                    {currentUser?.role === 'ADMIN' && (
                      <div
                        onMouseDown={(e) => handleResizeStart(e, table.id, cardWidth, cardHeight)}
                        className="absolute -bottom-1 -right-1 w-5 h-5 flex items-end justify-end p-0.5 z-20 cursor-nwse-resize select-none group/resize opacity-40 hover:opacity-100 transition"
                        title="Drag to resize table card"
                      >
                        <div className="w-3 h-3 flex flex-col items-end justify-end gap-[1px] pr-0.5 pb-0.5">
                          <div className="w-0.5 h-0.5 rounded-full bg-slate-400 group-hover/resize:bg-blue-600 transition-colors" />
                          <div className="flex gap-[1px]">
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-400 group-hover/resize:bg-blue-600 transition-colors" />
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-400 group-hover/resize:bg-blue-600 transition-colors" />
                          </div>
                          <div className="flex gap-[1px]">
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-400 group-hover/resize:bg-blue-600 transition-colors" />
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-400 group-hover/resize:bg-blue-600 transition-colors" />
                            <div className="w-0.5 h-0.5 rounded-full bg-slate-400 group-hover/resize:bg-blue-600 transition-colors" />
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
        {/* Release Table Modal (if triggered in floor view) */}
        

      {releasingTable && (
          <ReleaseTableModal
            table={releasingTable}
            onClose={() => setReleasingTable(null)}
          />
        )}

        {/* Waiter & Customer Selection Modal (Step 2 after table click) */}
        {assigningTable && (
          <SelectWaiterCustomerModal
            table={assigningTable}
            onClose={() => setAssigningTable(null)}
            onConfirm={(waiter, customer) => {
              setTableWaiter(assigningTable.id, waiter);
              setTableCustomer(assigningTable.id, customer);
              selectTable(assigningTable.id);
              setAssigningTable(null);
            }}
          />
        )}
      </div>
    );
  }

  // Active Order / POS Terminal View
  return (
    <div className="flex-1 h-full min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-3 overflow-hidden">
      {/* Mobile Top Navigation Switcher (Only visible on screens < lg) */}
      <div className="lg:hidden shrink-0 flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs">
        {/* Return to Tables Floor Plan */}
        <button
          type="button"
          onClick={() => setPosView('floor')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
          title="Return to Table Floor Plan"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Tables</span>
        </button>

        {/* Active Table Badge */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-extrabold text-[#004b9b]">
          <MapPin className="w-3 h-3 text-[#004b9b]" />
          <span>{activeTable.name}</span>
        </div>

        {/* Segmented Switcher: Menu vs Cart */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setMobilePosTab('menu')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black transition cursor-pointer ${
              mobilePosTab === 'menu'
                ? 'bg-[#004b9b] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3 h-3" />
            <span>Menu</span>
          </button>

          <button
            type="button"
            onClick={() => setMobilePosTab('cart')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black transition relative cursor-pointer ${
              mobilePosTab === 'cart'
                ? 'bg-[#004b9b] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ReceiptText className="w-3 h-3" />
            <span>Bill</span>
            {cartTotalQty > 0 && (
              <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${
                mobilePosTab === 'cart' ? 'bg-white text-[#004b9b]' : 'bg-[#004b9b] text-white'
              }`}>
                {cartTotalQty}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Left Column: Food Menu catalog, categories, search (takes all remaining space) */}
      <div className={`${mobilePosTab === 'menu' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 min-h-0 flex-col h-full overflow-hidden space-y-1.5`}>
        {/* DESKTOP VIEW (Visible on Desktop >= lg): Horizontal Category Tabs + 4-5 Column Grid */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0 space-y-1.5 overflow-hidden">
          {/* Desktop Category Tabs & Search Bar */}
          <div className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white border border-slate-200/90 shadow-none flex items-center gap-2 shrink-0">
            <div className="w-44 relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-pos-menu"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search all dishes..."
                className={`w-full pl-7 ${searchQuery ? 'pr-7' : 'pr-2.5'} py-1 bg-slate-50 border rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#004b9b] focus:outline-none ${
                  searchQuery ? 'border-[#004b9b] bg-blue-50/50 font-bold' : 'border-slate-200'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-300 hover:bg-rose-500 text-white flex items-center justify-center transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Desktop Category Navigation with Mouse Wheel + Drag + Arrows */}
            <div className="flex-1 min-w-0 relative flex items-center group">
              {/* Left Scroll Chevron Button */}
              {canScrollCatLeft && (
                <button
                  type="button"
                  onClick={() => handleScrollCat('left')}
                  className="absolute left-0 z-10 w-6 h-6 rounded-full bg-white/95 border border-slate-300 text-slate-700 hover:text-[#004b9b] hover:bg-slate-100 shadow-md transition flex items-center justify-center cursor-pointer -ml-1"
                  title="Scroll left (or roll mouse wheel)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Scrollable Container with Mouse Wheel + Drag + Smooth Touch */}
              <div
                ref={categoryScrollRef}
                onWheel={handleCategoryWheel}
                onMouseDown={handleCategoryMouseDown}
                onMouseMove={handleCategoryMouseMove}
                onMouseUp={handleCategoryMouseUp}
                onMouseLeave={handleCategoryMouseLeave}
                onScroll={checkCategoryScroll}
                className="flex-1 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 cursor-grab active:cursor-grabbing select-none scroll-smooth px-0.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (categoryHasDragged.current) return;
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer select-none ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#004b9b] text-white font-black shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Categories
                </button>
                {data.menuCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      if (categoryHasDragged.current) return;
                      setSelectedCategory(cat);
                      setSearchQuery('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer select-none ${
                      selectedCategory === cat
                        ? 'bg-[#004b9b] text-white font-black shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Right Scroll Chevron Button */}
              {canScrollCatRight && (
                <button
                  type="button"
                  onClick={() => handleScrollCat('right')}
                  className="absolute right-0 z-10 w-6 h-6 rounded-full bg-white/95 border border-slate-300 text-slate-700 hover:text-[#004b9b] hover:bg-slate-100 shadow-md transition flex items-center justify-center cursor-pointer -mr-1"
                  title="Scroll right (or roll mouse wheel)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Menu Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 auto-rows-max">
                            {filteredMenuItems.map(dish => {
                const inCart = activeTable?.cart?.find(c => c.id === dish.id);
                const hasOptions = (dish.variations && dish.variations.length > 0) || (dish.addons && dish.addons.length > 0);

                return (
                  <button
                    key={dish.id}
                    id={`menu-item-btn-${dish.id}`}
                    onClick={() => {
                      if (activeTable?.status === 'billed') {
                        alert('This table is already billed and locked. Adding items is disabled. Please settle payment.');
                        return;
                      }
                      if (hasOptions) {
                        setSelectedDishForCustomization(dish);
                      } else {
                        addToCart(activeTable.id, dish.id);
                      }
                    }}
                    className={`overflow-hidden rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] flex flex-col justify-between min-h-[110px] relative cursor-pointer hover:shadow-md select-none ${
                      inCart 
                        ? 'bg-blue-50/80 border-[#004b9b] ring-2 ring-blue-400/20' 
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Dish Photo Banner on Desktop if available - Edge-to-edge flush with zero gap */}
                    {dish.imageUrl && (
                      <div className="w-full h-26 sm:h-28 bg-slate-100 relative shrink-0 overflow-hidden">
                        <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                      </div>
                    )}

                    <div className={`flex flex-col justify-between flex-1 w-full ${
                      dish.imageUrl ? 'px-2.5 sm:px-3 pt-1 pb-2.5 sm:pb-3' : 'p-2.5 sm:p-3'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                          {dish.category}
                        </span>
                        {hasOptions && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shrink-0">
                            Options
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug">
                        {dish.name}
                      </h4>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                      <span className="font-extrabold text-sm text-slate-900">
                        ৳ {dish.price}
                      </span>

                      {inCart ? (
                        <span className="w-6 h-6 rounded-full bg-[#004b9b] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                          {inCart.qty}
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-100 hover:bg-[#004b9b] hover:text-white text-slate-600 text-xs flex items-center justify-center transition">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    </div>
                  </button>
                );
              })}

              {/* Empty State when no dishes match search */}
              {filteredMenuItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <Search className="w-10 h-10 text-slate-300 mb-3" />
                  <h3 className="text-sm font-extrabold text-slate-500 mb-1">
                    {searchQuery ? `"${searchQuery}" — কোনো খাবার পাওয়া যায়নি` : 'এই ক্যাটাগরিতে কোনো আইটেম নেই'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    {searchQuery 
                      ? 'বানান ঠিক আছে কিনা দেখুন, অথবা অন্যভাবে সার্চ করুন' 
                      : 'অন্য একটি ক্যাটাগরি বেছে নিন'
                    }
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('ALL');
                      }}
                      className="px-4 py-1.5 bg-[#004b9b] text-white rounded-lg text-xs font-bold hover:bg-[#003a7a] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Search & Show All</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE VIEW (Visible on Mobile < lg): Vertical Category Strip on Left + 3-Column Menu on Right */}
        <div className="lg:hidden flex-1 flex min-h-0 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-2xs">
          {/* Left Vertical Category Strip (Matching reference screenshot) */}
          <div className="w-[74px] sm:w-[82px] shrink-0 bg-slate-50/80 border-r border-slate-200/90 flex flex-col h-full overflow-hidden select-none">
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 custom-scrollbar">
              {/* All Option */}
              <button
                type="button"
                onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                className={`w-full py-2.5 px-1 text-center transition cursor-pointer relative flex flex-col items-center justify-center gap-0.5 ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-50 text-emerald-900 font-black border-l-4 border-emerald-600'
                    : 'text-slate-600 hover:bg-slate-100 font-bold'
                }`}
              >
                <span className="text-[11px] leading-tight block">All</span>
                <span className={`text-[9px] px-1 rounded-full font-mono ${
                  selectedCategory === 'ALL' ? 'bg-emerald-200 text-emerald-900 font-black' : 'text-slate-400'
                }`}>
                  {data.menuItems.length}
                </span>
              </button>

              {/* Each Category */}
              {data.menuCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                const catItemCount = data.menuItems.filter(m => m.category === cat).length;
                const displayName = cat.replace(/ Items$/i, '');

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setSelectedCategory(cat); setSearchQuery(''); }}
                    className={`w-full py-2.5 px-1 text-center transition cursor-pointer relative flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-black border-l-4 border-emerald-600'
                        : 'text-slate-600 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <span className="text-[11px] leading-tight block break-words max-w-[68px]">
                      {displayName}
                    </span>
                    <span className={`text-[9px] px-1 rounded-full font-mono ${
                      isSelected ? 'bg-emerald-200 text-emerald-900 font-black' : 'text-slate-400'
                    }`}>
                      {catItemCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Area: Search Bar + 3-Column Dish Grid */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 p-1 sm:p-1.5 overflow-hidden">
            {/* Search Input */}
            <div className="pb-1 shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search dish..."
                  className="w-full pl-6 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#004b9b] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 3-Column Menu Grid */}
            <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar min-h-0">
              <div className="grid grid-cols-3 gap-1.5 auto-rows-max pb-1">
                              {filteredMenuItems.map(dish => {
                  const inCart = activeTable?.cart?.find(c => c.id === dish.id);
                  const hasOptions = (dish.variations && dish.variations.length > 0) || (dish.addons && dish.addons.length > 0);

                  return (
                    <button
                      key={dish.id}
                      onClick={() => {
                        if (activeTable?.status === 'billed') {
                          alert('This table is already billed and locked. Adding items is disabled. Please settle payment.');
                          return;
                        }
                        if (hasOptions) {
                          setSelectedDishForCustomization(dish);
                        } else {
                          addToCart(activeTable.id, dish.id);
                        }
                      }}
                      className={`overflow-hidden rounded-xl border text-left transition-all duration-150 active:scale-[0.96] flex flex-col justify-between min-h-[76px] sm:min-h-[82px] relative cursor-pointer select-none ${
                        inCart
                          ? 'bg-blue-50 border-[#004b9b] ring-1 ring-blue-500/40 shadow-xs'
                          : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-2xs'
                      }`}
                    >
                      {/* Mobile Food Photo if available - Edge-to-edge flush with zero gap */}
                      {dish.imageUrl && (
                        <div className="w-full h-16 sm:h-18 bg-slate-100 relative shrink-0 overflow-hidden">
                          <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className={`flex flex-col justify-between flex-1 w-full min-w-0 ${
                        dish.imageUrl ? 'px-1.5 pt-0.5 pb-1.5' : 'p-1.5'
                      }`}>
                        <div className="min-w-0 w-full">
                          {hasOptions && (
                          <span className="text-[7.5px] px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200 inline-block mb-0.5">
                            Opt
                          </span>
                        )}
                        <h4 className="font-extrabold text-[10.5px] text-slate-900 line-clamp-2 leading-tight">
                          {dish.name}
                        </h4>
                      </div>

                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between w-full">
                        <span className="font-black text-[11px] text-[#004b9b]">
                          ৳{dish.price}
                        </span>

                        {inCart ? (
                          <span className="w-4.5 h-4.5 rounded-full bg-[#004b9b] text-white font-black text-[9.5px] flex items-center justify-center shadow-xs">
                            {inCart.qty}
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-slate-100 hover:bg-[#004b9b] hover:text-white text-slate-500 text-[10px] flex items-center justify-center transition">
                            <Plus className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Cart Bar (Visible on mobile when in Menu tab and items exist in cart) */}
        {cartTotalQty > 0 && (
          <div className="lg:hidden shrink-0 pt-1">
            <button
              type="button"
              onClick={() => setMobilePosTab('cart')}
              className="w-full py-2 px-3 bg-[#004b9b] hover:bg-[#005bb8] text-white rounded-xl font-bold flex items-center justify-between shadow-md active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-[#004b9b] font-black text-[11px] flex items-center justify-center shadow-xs">
                  {cartTotalQty}
                </span>
                <span className="text-xs font-extrabold">{activeTable.name} • ৳{netTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-black bg-white/20 px-2 py-0.5 rounded-lg">
                <span>View Cart & Bill</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Dedicated POS Cart (Exact compact fixed width like on lg, never bloated on 2xl/3xl/4xl) */}
      <div className={`${mobilePosTab === 'cart' ? 'flex' : 'hidden'} lg:flex w-full lg:w-[380px] xl:w-[410px] 2xl:w-[430px] flex-1 min-h-0 lg:flex-initial lg:h-full lg:shrink-0 flex-col overflow-hidden`}>
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3.5 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
          {/* Cart Header with Table Name & Zone */}
          <div className="pb-2.5 sm:pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mobile Back to Menu button */}
              <button
                type="button"
                onClick={() => setMobilePosTab('menu')}
                className="lg:hidden px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition cursor-pointer"
                title="Add more dishes from menu"
              >
                <Plus className="w-3 h-3" />
                <span>Add Dishes</span>
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-[#004b9b] text-white font-black text-xs">
                {activeTable.name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1 border border-slate-200">
                <MapPin className="w-3 h-3 text-[#004b9b]" />
                <span>{activeTable.zone || 'Floor 1'}</span>
              </span>
              {activeTable.status === 'billed' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[10px] flex items-center gap-1 border border-emerald-300" title="Bill has already been printed for this table">
                  <Printer className="w-3 h-3 text-emerald-700" />
                  <span>Billed</span>
                </span>
              )}
              {/* Clickable Waiter / Customer badge to change waiter or customer if needed */}
              <button
                type="button"
                onClick={() => setAssigningTable(activeTable)}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 border cursor-pointer transition ${
                  activeTable.waiter && activeTable.waiter !== 'Staff' && activeTable.waiter !== 'N/A'
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title="Click to edit Waiter or Customer"
              >
                <UserCheck className="w-3 h-3 text-[#004b9b]" />
                <span className="truncate max-w-[120px]">
                  {activeTable.waiter && activeTable.waiter !== 'Staff' && activeTable.waiter !== 'N/A' ? `Waiter: ${activeTable.waiter}` : 'Assign Waiter'}
                </span>
              </button>


            </div>
          </div>

          {/* Linked Paid Order Alert Banner */}
          {activeTable.linkedSaleId && (
            <div className="mx-2 mt-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center justify-between text-xs shadow-2xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-500 text-white shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <span>Reopened Paid Order:</span>
                    <span className="font-mono text-blue-800 bg-white px-1.5 py-0.2 rounded border border-amber-200">{activeTable.linkedInvoiceNo}</span>
                  </div>
                  <div className="text-[10.5px] text-amber-800 font-semibold">
                    Paid: <b className="text-slate-900">৳{(activeTable.paidAmount || 0).toLocaleString()}</b> • Click <span className="text-rose-700 font-black">⊘</span> or <span className="text-rose-700 font-black">-</span> to refund item-by-item
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReleasingTable(activeTable)}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[10px] flex items-center gap-1 shadow cursor-pointer transition shrink-0 ml-2"
                title="Cancel & Void the Entire Order with Refund"
              >
                <Ban className="w-3 h-3" />
                <span>Void Full Order</span>
              </button>
            </div>
          )}

          {/* Order Timing Row: Start Time • End Time • Total Duration (Matching mark 1 text size and style) */}
          {(() => {
            const orderStartTimestamp = activeTable.orderCreatedAt || (
              activeTable.cart.length > 0
                ? activeTable.cart.reduce((earliest, item) => {
                    const t = item.addedAt || item.kotPrintedTimestamp || null;
                    return t ? (earliest ? Math.min(earliest, t) : t) : earliest;
                  }, null as number | null)
                : null
            );

            const latestKotTimestamp = activeTable.cart.reduce((max, item) => {
              const t = item.kotPrintedTimestamp || 0;
              return t > max ? t : max;
            }, 0);

            const isBilled = activeTable.status === 'billed';
            const billedTimestamp = activeTable.billedAt;

            const startTimeDisplay = orderStartTimestamp
              ? new Date(orderStartTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : '--:--';

            // End Time:
            // 1. If billed -> billed time
            // 2. Else if KOT printed items exist -> latest KOT timestamp
            // 3. Otherwise -> '--:--'
            const endTimestamp = isBilled && billedTimestamp
              ? billedTimestamp
              : (latestKotTimestamp > 0 ? latestKotTimestamp : null);

            const endTimeDisplay = endTimestamp
              ? new Date(endTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              : '--:--';

            // Total Duration calculation:
            // If endTimestamp exists -> duration between start and end (e.g. KOT submit or Billed)
            // Else if orderStartTimestamp exists -> live elapsed duration from start to nowTime
            const durationMinutes = (orderStartTimestamp && endTimestamp)
              ? Math.max(0, Math.floor((endTimestamp - orderStartTimestamp) / 60000))
              : (orderStartTimestamp ? Math.max(0, Math.floor((nowTime - orderStartTimestamp) / 60000)) : 0);

            const formatDuration = (mins: number) => {
              if (mins < 1) return '< 1m';
              if (mins < 60) return `${mins}m`;
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return `${h}h ${m}m`;
            };

            const totalDurationDisplay = orderStartTimestamp ? formatDuration(durationMinutes) : '--';
            const liveDiningMinutes = orderStartTimestamp ? Math.max(0, Math.floor((nowTime - orderStartTimestamp) / 60000)) : 0;

            return (
              <div 
                className="py-1.5 px-2 border-b border-slate-100 flex items-center justify-between text-[8.5px] text-slate-400 font-medium select-none tracking-tight shrink-0"
                title={orderStartTimestamp ? `Start Time: ${startTimeDisplay} • End Time: ${endTimeDisplay} • Total Duration: ${totalDurationDisplay}${!isBilled && liveDiningMinutes > durationMinutes ? ` (Live table duration: ${formatDuration(liveDiningMinutes)})` : ''}` : 'Order timing'}
              >
                <div className="inline-flex items-center gap-1">
                  <Clock className="w-2 h-2 text-[#004b9b] shrink-0" />
                  <span className="text-slate-500">Start Time:</span>
                  <span className="font-semibold text-slate-700">{startTimeDisplay}</span>
                </div>

                <span className="text-slate-300">•</span>

                <div className="inline-flex items-center gap-1">
                  <Clock className="w-2 h-2 text-[#004b9b] shrink-0" />
                  <span className="text-slate-500">End Time:</span>
                  <span className="font-semibold text-slate-700">{endTimeDisplay}</span>
                </div>

                <span className="text-slate-300">•</span>

                <div className="inline-flex items-center gap-1">
                  <Timer className="w-2 h-2 text-[#004b9b] shrink-0" />
                  <span className="text-slate-500">Total Duration:</span>
                  <span className="font-bold text-slate-800">{totalDurationDisplay}</span>
                </div>
              </div>
            );
          })()}

          {/* Cart Items List */}
          <div ref={cartListRef} className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 my-2 pr-1 custom-scrollbar">
            {activeTable?.cart?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center justify-center gap-3">
                <p>Cart is empty. Click items from the menu to add dishes.</p>



                <button
                  type="button"
                  onClick={() => setMobilePosTab('menu')}
                  className="lg:hidden px-3.5 py-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Browse Food Menu</span>
                </button>
              </div>
            ) : (
              activeTable.cart.map((item, idx) => {
                const isItemKotPrinted = item.kotPrinted && (item.kotPrintedQty || 0) > 0;
                const unsentQty = Math.max(0, item.qty - (item.kotPrintedQty || 0));

                const kotTimestamp = item.kotPrintedTimestamp || item.addedAt || activeTable.orderCreatedAt || null;
                const kotElapsedMinutes = (isItemKotPrinted && kotTimestamp) ? Math.max(0, Math.floor((nowTime - kotTimestamp) / 60000)) : 0;

                const isTableBilled = activeTable.status === 'billed';
                const isItemLocked = (isItemKotPrinted || isTableBilled) && !canCancelOrEditOrder;

                return (
                  <div key={item.cartItemId || `${item.id}-${idx}`} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{item.name}</h5>
                        {unsentQty > 0 && isItemKotPrinted && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                            +{unsentQty} Unsent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">৳{item.price} × {item.qty}</span>
                        {item.selectedVariation && <span className="text-slate-400 font-medium">({item.selectedVariation.name})</span>}

                        {/* KOT Submitted Time & Live Elapsed Minutes (Matching top-left #2 size and color) */}
                        {isItemKotPrinted && item.kotPrintedAt && (
                          <span 
                            className="text-[8.5px] text-slate-400 font-medium inline-flex items-center gap-1 tracking-tight select-none ml-0.5"
                            title={`KOT sent to kitchen at ${item.kotPrintedAt} (${kotElapsedMinutes} minutes elapsed)`}
                          >
                            <Clock className="w-2 h-2 text-[#004b9b]" />
                            <span>{item.kotPrintedAt}</span>
                            <span>({kotElapsedMinutes}m)</span>
                          </span>
                        )}
                      </div>

                      {/* Special Instruction / Item Note */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {item.notes ? (
                          isItemLocked ? (
                            <div 
                              className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5 select-none"
                              title="Special instruction (Read-only)"
                            >
                              <FileText className="w-2.5 h-2.5 text-slate-400" />
                              <span className="font-medium italic truncate max-w-[140px]">{item.notes}</span>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingNoteItem({ item, index: idx });
                                setItemNoteInput(item.notes || '');
                              }}
                              className="group flex items-center gap-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded px-1.5 py-0.5 cursor-pointer transition"
                              title="Click to edit special instruction"
                            >
                              <FileText className="w-2.5 h-2.5 text-blue-700" />
                              <span className="font-semibold italic truncate max-w-[140px]">{item.notes}</span>
                              <Edit2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-blue-700 ml-0.5" />
                            </div>
                          )
                        ) : (
                          !isItemLocked && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteItem({ item, index: idx });
                                setItemNoteInput('');
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#004b9b] hover:bg-blue-50 px-1.5 py-0.5 rounded transition cursor-pointer border border-dashed border-slate-200 hover:border-blue-300"
                              title="Add special cooking note / instruction (prints on KOT)"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>+ Note</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {isItemLocked ? (
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        <span 
                          className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs"
                          title="This item was submitted and is read-only. Contact Admin or Supervisor to modify."
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Qty: {item.qty}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Decrement or Void */}
                        <button
                          type="button"
                          onClick={() => {
                            if ((isItemKotPrinted && item.qty <= (item.kotPrintedQty || 0)) || activeTable.linkedSaleId) {
                              // Cannot decrement below printed KOT qty without void authorization (or paid order requiring refund)
                              setVoidingItem({ item, index: idx });
                            } else {
                              updateCartItemQty(activeTable.id, item.cartItemId || idx, -1);
                            }
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                            (isItemKotPrinted && item.qty <= (item.kotPrintedQty || 0)) || activeTable.linkedSaleId
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={
                            activeTable.linkedSaleId
                              ? 'Reduce quantity & Refund item'
                              : (isItemKotPrinted && item.qty <= (item.kotPrintedQty || 0)
                                  ? 'Void Item (KOT already sent to kitchen - authorization required)'
                                  : 'Decrease quantity')
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <CartItemQtyInput
                          qty={item.qty}
                          minQty={isItemKotPrinted ? (item.kotPrintedQty || 1) : 1}
                          disabled={Boolean(activeTable.linkedSaleId) || isTableBilled}
                          onCommit={(newQty) => {
                            if (isTableBilled) {
                              alert('This table order is already billed. Cannot change quantity after bill has been printed.');
                              return;
                            }
                            setCartItemQty(activeTable.id, item.cartItemId || idx, newQty);
                          }}
                          onVoidRequest={() => setVoidingItem({ item, index: idx })}
                        />

                        {/* Increment */}
                        <button
                          type="button"
                          disabled={isTableBilled}
                          onClick={() => {
                            if (isTableBilled) {
                              alert('This table order is already billed. Cannot add quantity after bill has been printed.');
                              return;
                            }
                            updateCartItemQty(activeTable.id, item.cartItemId || idx, 1);
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition ${
                            isTableBilled ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200 text-blue-900 cursor-pointer'
                          }`}
                          title={isTableBilled ? 'Order is already billed' : 'Increase quantity'}
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        {/* Screen 1 (Desktop / Laptop): Void / Delete Button right after Plus button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isItemKotPrinted || activeTable.linkedSaleId) {
                              setVoidingItem({ item, index: idx });
                            } else {
                              removeCartItem(activeTable.id, item.cartItemId || idx);
                            }
                          }}
                          className={`hidden lg:flex w-6 h-6 rounded-lg items-center justify-center transition cursor-pointer ml-0.5 ${
                            isItemKotPrinted || activeTable.linkedSaleId
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                              : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600'
                          }`}
                          title={
                            activeTable.linkedSaleId
                              ? 'Void Item & Refund amount'
                              : (isItemKotPrinted
                                  ? 'Void KOT Item (Admin/Manager Permission Required)'
                                  : 'Remove from cart')
                          }
                        >
                          {isItemKotPrinted || activeTable.linkedSaleId ? (
                            <Ban className="w-3 h-3 text-rose-700" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Right side: Price (Desktop: right-aligned) & Mobile Delete Button (Screen 2: far right after price) */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      <div className="w-14 text-right font-extrabold text-xs text-slate-900 shrink-0">
                        ৳{item.price * item.qty}
                      </div>

                      {/* Screen 2 (Mobile): Void / Delete Button placed on the far right after price */}
                      {!isItemLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isItemKotPrinted || activeTable.linkedSaleId) {
                              setVoidingItem({ item, index: idx });
                            } else {
                              removeCartItem(activeTable.id, item.cartItemId || idx);
                            }
                          }}
                          className={`flex lg:hidden w-6 h-6 rounded-lg items-center justify-center transition cursor-pointer ${
                            isItemKotPrinted || activeTable.linkedSaleId
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                              : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                          }`}
                          title={
                            activeTable.linkedSaleId
                              ? 'Void Item & Refund amount'
                              : (isItemKotPrinted
                                  ? 'Void KOT Item (Admin/Manager Permission Required)'
                                  : 'Remove from cart')
                          }
                        >
                          {isItemKotPrinted || activeTable.linkedSaleId ? (
                            <Ban className="w-3.5 h-3.5 text-rose-700" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Discount and Summary calculation */}
          {(() => {
            const hasSubmittedKotItems = Boolean(activeTable?.cart?.some(item => item.kotPrinted && (item.kotPrintedQty || 0) > 0));
            const isTableBilled = activeTable.status === 'billed';
            const isDiscountLocked = !canCancelOrEditOrder && (hasSubmittedKotItems || isTableBilled);

            return (
              <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs shrink-0">
                {/* Discount Form Row */}
                <div className="flex items-center justify-between gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700 text-[11px] shrink-0">Discount:</span>
                    {isDiscountLocked && (
                      <span title="Discount locked after KOT / Bill submission">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <div className="flex rounded-lg overflow-hidden border border-slate-300">
                      <button
                        type="button"
                        disabled={isDiscountLocked}
                        onClick={() => setTableDiscount(activeTable.id, 'taka', activeTable.discountVal)}
                        className={`px-2 py-0.5 text-[10px] font-bold transition ${
                          isDiscountLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        } ${
                          activeTable.discountType === 'taka' ? 'bg-black text-blue-300' : 'bg-white text-slate-600'
                        }`}
                      >
                        ৳ BDT
                      </button>
                      <button
                        type="button"
                        disabled={isDiscountLocked}
                        onClick={() => setTableDiscount(activeTable.id, 'percent', activeTable.discountVal)}
                        className={`px-2 py-0.5 text-[10px] font-bold transition ${
                          isDiscountLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        } ${
                          activeTable.discountType === 'percent' ? 'bg-black text-blue-300' : 'bg-white text-slate-600'
                        }`}
                      >
                        % Percent
                      </button>
                    </div>

                    <input
                      type="number"
                      min="0"
                      disabled={isDiscountLocked}
                      readOnly={isDiscountLocked}
                      value={activeTable.discountVal === 0 ? '' : activeTable.discountVal}
                      onChange={e => setTableDiscount(activeTable.id, activeTable.discountType, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`w-16 px-2 py-0.5 border border-slate-300 rounded-lg text-xs font-bold text-right focus:outline-none ${
                        isDiscountLocked
                          ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          : 'bg-white text-slate-900 focus:ring-1 focus:ring-[#004b9b]'
                      }`}
                    />
                  </div>
                </div>

                {/* Subtotal & Net Total */}
                <div className="flex justify-between text-slate-600 font-medium text-[11px]">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900 font-mono">৳{subtotal.toLocaleString()}</span>
                </div>

                {discountDeduction > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium text-[11px]">
                    <span>Discount:</span>
                    <span>- ৳{discountDeduction.toLocaleString()}</span>
                  </div>
                )}

                {isVatEnabled && vatPct > 0 && (
                  <div className="flex justify-between text-slate-500 font-medium text-[11px]">
                    <span>VAT ({vatPct}% {vatMode === 'inclusive' ? 'Included' : 'Extra'}):</span>
                    <span className="font-semibold font-mono text-slate-700">
                      {vatMode === 'exclusive' ? '+ ' : ''}৳{cartVatVal.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                  <span>{activeTable.linkedSaleId ? 'Current Bill Value:' : 'Total Payable:'}</span>
                  <span className="text-[#004b9b] text-base font-black font-mono">৳{netTotal.toLocaleString()}</span>
                </div>

                {activeTable.linkedSaleId && (
                  <div className="mt-1 pt-1 border-t border-amber-200/80 space-y-0.5 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Already Settled ({activeTable.linkedInvoiceNo}):</span>
                      <span className="font-bold text-emerald-700 font-mono">৳{(activeTable.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    {netTotal < (activeTable.paidAmount || 0) && (
                      <div className="flex justify-between font-bold text-amber-700">
                        <span>Total Refunded:</span>
                        <span className="font-mono">৳{((activeTable.paidAmount || 0) - netTotal).toLocaleString()}</span>
                      </div>
                    )}
                    {netTotal > (activeTable.paidAmount || 0) && (
                      <div className="flex justify-between font-extrabold text-rose-700">
                        <span>Additional Due to Collect:</span>
                        <span className="font-mono">৳{(netTotal - (activeTable.paidAmount || 0)).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action Buttons: Dynamically adapts to POS order lifecycle */}
          {(() => {
            const isCartEmpty = (activeTable?.cart?.length || 0) === 0;
            const hasUnprintedKotItems = !isCartEmpty && activeTable!.cart.some(
              item => !item.kotPrinted || item.qty > (item.kotPrintedQty || 0)
            );

            const cancelBtn = (fullWidth = false) => {
              const hasSubmittedKotItems = Boolean(
                activeTable?.cart?.some(item => (item.kotPrintedQty || 0) > 0)
              );
              const isTableOccupied = hasSubmittedKotItems;

              return (
                <button
                  id="btn-cancel-pos-order"
                  type="button"
                  onClick={() => {
                    if (activeTable) {
                      cancelPosOrder(activeTable.id);
                    } else {
                      setPosView('floor');
                    }
                  }}
                  className={`py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-1.5 sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-[13px] tracking-tight transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs border border-slate-300/80 ${fullWidth ? 'w-full' : ''}`}
                  title={isTableOccupied ? "Back to Table Floor Plan" : "Cancel, clear items, and release table"}
                >
                  <X className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">Cancel</span>
                </button>
              );
            };

            const submitKotBtn = (
              <button
                id="btn-submit-pos-order"
                type="button"
                disabled={activeTable.cart.length === 0 || isSubmittingKot}
                onClick={async () => {
                  setIsSubmittingKot(true);
                  try {
                    await directSubmitKotAndHold(activeTable.id);
                  } finally {
                    setIsSubmittingKot(false);
                  }
                }}
                className="py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-1.5 sm:px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-[13px] tracking-tight transition flex items-center justify-center gap-1.5 shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer w-full"
                title="Submit Order: Sends KOT to Kitchen & Holds Order on Table"
              >
                <ChefHat className="w-4 h-4 shrink-0" />
                <span className="truncate">{isSubmittingKot ? 'Submitting...' : 'Submit (KOT)'}</span>
              </button>
            );

            const printBillBtn = (fullWidth = false) => (
              <button
                id="btn-print-table-bill"
                type="button"
                disabled={activeTable.cart.length === 0 || isPrintingBill}
                onClick={async () => {
                  setIsPrintingBill(true);
                  await directPrintBill(activeTable.id);
                  setIsPrintingBill(false);
                  setBillPrintedSuccess(true);
                  setTimeout(() => setBillPrintedSuccess(false), 2000);
                }}
                className={`py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-1.5 sm:px-2 rounded-xl text-xs sm:text-[13px] font-black tracking-tight transition flex items-center justify-center gap-1.5 shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${fullWidth ? 'w-full' : ''} ${
                  billPrintedSuccess
                    ? 'bg-emerald-700 text-white'
                    : 'bg-black hover:bg-slate-900 text-white'
                }`}
                title="Print Guest Bill"
              >
                {isPrintingBill ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span className="truncate">Printing...</span>
                  </>
                ) : billPrintedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="truncate">Printed!</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 shrink-0" />
                    <span className="truncate">Print Bill</span>
                  </>
                )}
              </button>
            );

            const settlePayBtn = (fullWidth = false) => (
              <button
                id="btn-open-settle-modal"
                type="button"
                disabled={activeTable.cart.length === 0}
                onClick={() => openSettleModal(activeTable.id)}
                className={`py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-1.5 sm:px-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs sm:text-[13px] tracking-tight transition flex items-center justify-center gap-1.5 shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${fullWidth ? 'w-full' : ''}`}
                title="Settle Payment & Pay"
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span className="truncate">Settle & Pay</span>
              </button>
            );

            const isBillAlreadyPrinted = activeTable?.status === 'billed';

            // Special State: Reopened Settled Sale (Paid Order being modified or voided)
            if (activeTable.linkedSaleId) {
              const remainingDue = Math.max(0, netTotal - (activeTable.paidAmount || 0));
              return (
                <div className="pt-2 sm:pt-2.5 shrink-0">
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => finishLinkedOrderInPos(activeTable.id)}
                      className="py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-[13px] transition flex items-center justify-center gap-1.5 shadow-2xs border border-slate-300 cursor-pointer"
                      title="Save and return to Sales Ledger"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Back to Sales</span>
                    </button>
                    {remainingDue > 0 ? (
                      <button
                        type="button"
                        onClick={() => openSettleModal(activeTable.id)}
                        className="py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-2 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs sm:text-[13px] transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        title="Settle additional items added to this order"
                      >
                        <CreditCard className="w-4 h-4 shrink-0" />
                        <span>Settle Due (৳{remainingDue})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => finishLinkedOrderInPos(activeTable.id)}
                        className="py-2.5 sm:py-3 min-h-[44px] sm:min-h-[46px] px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-[13px] transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        title="Done modifying order - save and release table"
                      >
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Done / Release</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // State 1: Cart is empty -> Only Cancel button view hobe
            if (isCartEmpty) {
              return (
                <div className="pt-2 sm:pt-2.5 shrink-0">
                  {cancelBtn(true)}
                </div>
              );
            }

            // State: Bill is ALREADY printed -> Order is locked. Only Cancel & Settle & Pay
            if (isBillAlreadyPrinted) {
              const billedButtons: React.ReactNode[] = [];
              billedButtons.push(cancelBtn(isWaiter));
              if (!isWaiter) {
                billedButtons.push(settlePayBtn(false));
              }
              const billedGridCols = billedButtons.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
              return (
                <div className="pt-2 sm:pt-2.5 shrink-0">
                  <div className={`grid ${billedGridCols} gap-1.5 sm:gap-2`}>
                    {billedButtons.map((btn, bIdx) => (
                      <React.Fragment key={bIdx}>{btn}</React.Fragment>
                    ))}
                  </div>
                </div>
              );
            }

            // State: Order is active and NOT yet billed
            const actionButtons: React.ReactNode[] = [];
            actionButtons.push(cancelBtn(false));

            if ((hasUnprintedKotItems || isSubmittingKot) && activeTableHasActiveKotPrinter) {
              actionButtons.push(submitKotBtn);
            } else {
              actionButtons.push(printBillBtn(false));
            }

            if (!isWaiter) {
              actionButtons.push(settlePayBtn(false));
            }

            const colCount = actionButtons.length;
            const gridClass = colCount === 1 
              ? 'grid-cols-1' 
              : colCount === 2 
                ? 'grid-cols-2' 
                : colCount === 3 
                  ? 'grid-cols-3' 
                  : 'grid-cols-4';

            return (
              <div className="pt-2 sm:pt-2.5 shrink-0">
                <div className={`grid ${gridClass} gap-1.5 sm:gap-2`}>
                  {actionButtons.map((btn, bIdx) => (
                    <React.Fragment key={bIdx}>{btn}</React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Void Cart Item Modal */}
      {voidingItem && (
        <VoidItemModal
          tableId={activeTable.id}
          tableName={activeTable.name}
          item={voidingItem.item}
          itemIndex={voidingItem.index}
          onClose={() => setVoidingItem(null)}
        />
      )}

      

            

      {/* Release Table Modal */}
      {releasingTable && (
        <ReleaseTableModal
          table={releasingTable}
          onClose={() => setReleasingTable(null)}
        />
      )}

      {/* Item Variation & Add-on Customization Modal */}
      {selectedDishForCustomization && (
        <ItemVariationModal
          item={selectedDishForCustomization}
          tableName={activeTable.name}
          channelOrAgentName={
            activeTable.channelOrAgentId && activeTable.channelOrAgentId !== 'dine_in'
              ? data.commissionAgents?.find(a => a.id === activeTable.channelOrAgentId)?.name
              : undefined
          }
          channelMultiplier={
            activeTable.channelOrAgentId && activeTable.channelOrAgentId !== 'dine_in'
              ? data.commissionAgents?.find(a => a.id === activeTable.channelOrAgentId)?.priceListMultiplier || 1
              : 1
          }
          channelPrice={
            activeTable.channelOrAgentId && activeTable.channelOrAgentId !== 'dine_in'
              ? selectedDishForCustomization.channelPrices?.[activeTable.channelOrAgentId]
              : undefined
          }
          onAddToCart={(dish, variation, addons, quantity, itemNotes) => {
            addToCart(activeTable.id, dish.id, variation, addons, itemNotes, quantity);
          }}
          onClose={() => setSelectedDishForCustomization(null)}
        />
      )}

      {/* Item Cooking Note / Special Instruction Modal */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#004b9b] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Special Cooking Instruction</h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                    {editingNoteItem.item.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteItem(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Instruction Note (prints on KOT):
              </label>
              <textarea
                value={itemNoteInput}
                onChange={(e) => setItemNoteInput(e.target.value)}
                placeholder="e.g. Less spicy, Extra crispy, No onion, Parcel..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004b9b] focus:outline-none transition resize-none h-20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (activeTable) {
                      updateCartItemNotes(activeTable.id, editingNoteItem.item.cartItemId || editingNoteItem.index, itemNoteInput.trim());
                    }
                    setEditingNoteItem(null);
                  }
                }}
              />
            </div>

            {/* Quick preset tags */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quick Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Less Spicy', 'Extra Spicy', 'No Onion', 'Extra Crispy', 'Takeaway / Parcel', 'Less Salt', 'Sugar Free'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setItemNoteInput(prev => prev ? `${prev}, ${tag}` : tag);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-[#004b9b] hover:border-blue-300 border border-slate-200 text-slate-700 text-[11px] rounded-lg font-medium transition cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {editingNoteItem.item.notes ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTable) {
                      updateCartItemNotes(activeTable.id, editingNoteItem.item.cartItemId || editingNoteItem.index, '');
                    }
                    setEditingNoteItem(null);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  Clear Note
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNoteItem(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTable) {
                      updateCartItemNotes(activeTable.id, editingNoteItem.item.cartItemId || editingNoteItem.index, itemNoteInput.trim());
                    }
                    setEditingNoteItem(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#004b9b] hover:bg-[#005bb8] text-white rounded-xl transition shadow-xs cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waiter & Customer Selection Modal (if triggered from order view) */}
      {assigningTable && (
        <SelectWaiterCustomerModal
          table={assigningTable}
          onClose={() => setAssigningTable(null)}
          onConfirm={(waiter, customer) => {
            setTableWaiter(assigningTable.id, waiter);
            setTableCustomer(assigningTable.id, customer);
            setAssigningTable(null);
          }}
        />
      )}

      {/* Mobile Slide-Over Category Sidebar Drawer (Option 1) */}
      {isMobileCategoryDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop with smooth blur */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileCategoryDrawerOpen(false)}
          />

          {/* Slide-in Drawer from Left */}
          <div className="fixed inset-y-0 left-0 w-[285px] sm:w-[320px] max-w-[85vw] bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#004b9b] text-white flex items-center justify-center shadow-xs">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 leading-tight">Food Categories</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {data.menuCategories.length} Categories • {data.menuItems.length} Dishes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCategoryDrawerOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Close Categories Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Items List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
              {/* All Categories Option */}
              {(() => {
                const isSelected = selectedCategory === 'ALL';
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSearchQuery('');
                      setIsMobileCategoryDrawerOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left font-bold text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#004b9b] to-[#002652] text-white shadow-sm ring-1 ring-blue-500'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className={`w-4 h-4 ${isSelected ? 'text-blue-200' : 'text-[#004b9b]'}`} />
                      <span>All Categories</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {data.menuItems.length}
                    </span>
                  </button>
                );
              })()}

              <div className="py-1">
                <div className="h-px bg-slate-100" />
              </div>

              {/* Individual Categories */}
              {data.menuCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                const catItemCount = data.menuItems.filter(m => m.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSearchQuery('');
                      setIsMobileCategoryDrawerOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left font-bold text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#004b9b] to-[#002652] text-white shadow-sm ring-1 ring-blue-500'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      <span className="truncate max-w-[170px]">{cat}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {catItemCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 shrink-0">
              {selectedCategory !== 'ALL' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                    setIsMobileCategoryDrawerOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to All Categories</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMobileCategoryDrawerOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
