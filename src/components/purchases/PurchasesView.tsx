import React, { useState, useMemo } from 'react';
import { useRestaurant, DEFAULT_PAYMENT_METHODS } from '../../context/RestaurantContext';
import { SearchableRawSelect, RawSelectOption } from '../common/SearchableRawSelect';
import { 
  PurchaseVoucher, 
  PurchaseOrder, 
  PurchaseReturn, 
  PurchaseItem, 
  PurchasePaymentType, 
  PurchaseStatus 
} from '../../types';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Check,
  CheckCircle, 
  Clock, 
  X, 
  PackageCheck, 
  RotateCcw, 
  Building2, 
  Calendar, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Truck,
  DollarSign,
  ChevronDown,
  CreditCard,
  Phone,
  Tag,
  Receipt,
  Pencil
} from 'lucide-react';

const SUPPLIER_CONTACTS_KEY = 'tsc_supplier_contacts_v1';

interface SupplierContactInfo {
  phone?: string;
  contactPerson?: string;
  address?: string;
}

export const PurchasesView: React.FC = () => {
  const { 
    data, 
    metrics, 
    savePurchaseVoucher, 
    deletePurchaseVoucher,
    savePurchaseOrder,
    deletePurchaseOrder,
    receivePurchaseOrderItems,
    savePurchaseReturn,
    deletePurchaseReturn,
    addConfigItem,
    editConfigItem,
    settlePurchaseBill,
    getMethodLiveBalance,
    currentUser
  } = useRestaurant();

  // Navigation Tab State: 'vouchers' | 'po' | 'returns' | 'vendors'
  const [activeTab, setActiveTab] = useState<'vouchers' | 'po' | 'returns' | 'vendors'>('vouchers');
  const [search, setSearch] = useState('');

  // --- Purchase Voucher Modal States ---
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<PurchaseVoucher | null>(null);
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherVendor, setVoucherVendor] = useState(data.vendors[0] || 'Kader Meat Supply');
  const [voucherBillNo, setVoucherBillNo] = useState('');
  const [voucherPaymentType, setVoucherPaymentType] = useState<PurchasePaymentType>('CREDIT');
  const [voucherPartialPaid, setVoucherPartialPaid] = useState<number>(0);
  const [voucherPartialMethod, setVoucherPartialMethod] = useState<string>('Cash in Hand');
  const [voucherStatus, setVoucherStatus] = useState<PurchaseStatus>('FINAL');
  const [voucherItems, setVoucherItems] = useState<PurchaseItem[]>([]);

  // --- Purchase Order (PO) Modal States ---
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [viewingPo, setViewingPo] = useState<PurchaseOrder | null>(null);
  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [poExpectedDate, setPoExpectedDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [poVendor, setPoVendor] = useState(data.vendors[0] || 'Kader Meat Supply');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);

  const [voucherUpdateMasterRates, setVoucherUpdateMasterRates] = useState(true);
  const [poUpdateMasterRates, setPoUpdateMasterRates] = useState(false);
  const [receiveUpdateMasterRates, setReceiveUpdateMasterRates] = useState(true);

  // --- Receive Items Modal State ---
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receiveBillNo, setReceiveBillNo] = useState('');
  const [receivePaymentType, setReceivePaymentType] = useState<PurchasePaymentType>('CREDIT');
  const [receivePartialPaid, setReceivePartialPaid] = useState<number>(0);
  const [receivePartialMethod, setReceivePartialMethod] = useState<string>('Cash in Hand');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiveItemsList, setReceiveItemsList] = useState<{
    itemId: number;
    item: string;
    category: string;
    uom: string;
    orderedQty: number;
    alreadyReceivedQty: number;
    receiveQty: number;
    rate: number;
    total: number;
  }[]>([]);

  // --- Supplier Return Modal States ---
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturn | null>(null);
  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnVendor, setReturnVendor] = useState(data.vendors[0] || 'Kader Meat Supply');
  const [returnBillNo, setReturnBillNo] = useState('');
  const [returnItemId, setReturnItemId] = useState<number | string>(data.masterItems[0]?.id || 1);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnRate, setReturnRate] = useState<number>(data.masterItems[0]?.defaultRate || 0);
  const [returnReason, setReturnReason] = useState('Damaged packaging or quality mismatch on delivery');
  const [refundStatus, setRefundStatus] = useState<'REFUNDED' | 'ADJUSTED' | 'PENDING'>('ADJUSTED');

  // --- Vendor Contacts & Directory States ---
  const [supplierContacts, setSupplierContacts] = useState<Record<string, SupplierContactInfo>>(() => {
    try {
      const saved = localStorage.getItem(SUPPLIER_CONTACTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const saveSupplierContact = (vendorName: string, info: SupplierContactInfo, oldVendorName?: string) => {
    setSupplierContacts(prev => {
      const next = { ...prev };
      if (oldVendorName && oldVendorName !== vendorName) {
        delete next[oldVendorName];
      }
      next[vendorName] = { ...next[vendorName], ...info };
      try {
        localStorage.setItem(SUPPLIER_CONTACTS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const getSupplierPhone = (vendorName: string, idx: number) => {
    if (supplierContacts[vendorName]?.phone) {
      return supplierContacts[vendorName].phone!;
    }
    return `017${(56007600 + idx * 111111).toString().slice(0, 8)}`;
  };

  // --- Vendor Add & Edit Modal States ---
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorContactPerson, setNewVendorContactPerson] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');

  const [editingVendor, setEditingVendor] = useState<{
    originalName: string;
    name: string;
    phone: string;
    contactPerson: string;
    address: string;
  } | null>(null);

  // --- SUPPLIER LEDGER & BILL-WISE PAYMENT MODAL STATES ---
  const [selectedSupplierLedger, setSelectedSupplierLedger] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'RECEIVED' | 'PENDING' | 'RETURNS'>('ALL');
  
  // Specific Pay Bill Popup inside Ledger
  const [payBillTarget, setPayBillTarget] = useState<{
    billNo?: string;
    vendor: string;
    dueAmount: number;
    totalAmount: number;
    isAllDues?: boolean;
  } | null>(null);
  const activeFundMethods = (data.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : DEFAULT_PAYMENT_METHODS)
    .filter(m => m.isActive !== false && m.type !== 'CREDIT');

  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>(() => activeFundMethods[0]?.name || 'Cash in Hand');
  const [payNote, setPayNote] = useState('');

  const selectedPaymentMethodObj = activeFundMethods.find(m => m.name === payMethod || m.id === payMethod || m.name.toLowerCase() === payMethod.toLowerCase()) || activeFundMethods[0];
  const selectedMethodBalance = selectedPaymentMethodObj ? getMethodLiveBalance(selectedPaymentMethodObj) : 0;

  // ================= HANDLERS ================= //

  // --- Voucher Handlers ---
  const handleOpenNewVoucher = () => {
    setVoucherUpdateMasterRates(true);
    setVoucherDate(new Date().toISOString().split('T')[0]);
    setVoucherVendor(data.vendors[0] || 'Kader Meat Supply');
    setVoucherBillNo('BILL-' + Date.now().toString().slice(-4));
    setVoucherPaymentType('CREDIT');
    setVoucherPartialPaid(0);
    setVoucherPartialMethod(activeFundMethods[0]?.name || 'Cash in Hand');
    setVoucherStatus('FINAL');
    
    if (data.masterItems.length > 0) {
      const defaultRaw = data.masterItems[0];
      setVoucherItems([{
        itemId: defaultRaw.id,
        item: defaultRaw.name,
        category: defaultRaw.category,
        uom: defaultRaw.uom,
        qty: 1,
        rate: defaultRaw.defaultRate,
        total: defaultRaw.defaultRate
      }]);
    } else {
      setVoucherItems([]);
    }
    setIsVoucherModalOpen(true);
  };

  const handleAddVoucherRow = () => {
    if (data.masterItems.length === 0) {
      alert('No raw materials found. Please create raw materials in master inventory first.');
      return;
    }
    const defaultRaw = data.masterItems[0];
    setVoucherItems(prev => [...prev, {
      itemId: defaultRaw.id,
      item: defaultRaw.name,
      category: defaultRaw.category,
      uom: defaultRaw.uom,
      qty: 1,
      rate: defaultRaw.defaultRate,
      total: defaultRaw.defaultRate
    }]);
  };

  const handleVoucherItemChange = (index: number, rawId: number) => {
    const raw = data.masterItems.find(m => m.id === rawId);
    if (!raw) return;
    setVoucherItems(prev => {
      const arr = [...prev];
      const qty = arr[index].qty || 1;
      arr[index] = {
        itemId: raw.id,
        item: raw.name,
        category: raw.category,
        uom: raw.uom,
        qty,
        rate: raw.defaultRate,
        total: qty * raw.defaultRate
      };
      return arr;
    });
  };

  const handleVoucherQtyRateChange = (index: number, qty: number, rate: number) => {
    setVoucherItems(prev => {
      const arr = [...prev];
      arr[index] = {
        ...arr[index],
        qty,
        rate,
        total: Math.round(qty * rate)
      };
      return arr;
    });
  };

  const handleRemoveVoucherRow = (index: number) => {
    setVoucherItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalVoucherAmount = voucherItems.reduce((sum, i) => sum + (i.total || 0), 0);

  const handleSubmitVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherItems.length === 0) {
      alert('Please add at least one raw item to the voucher!');
      return;
    }

    const isPartial = voucherPaymentType === 'PARTIAL';
    const isPaid = !isPartial && voucherPaymentType !== 'CREDIT';
    const actualPaid = isPartial 
      ? Math.min(totalVoucherAmount, Math.max(0, Number(voucherPartialPaid) || 0))
      : (isPaid ? totalVoucherAmount : 0);
    const payMethodName = isPartial 
      ? voucherPartialMethod 
      : (isPaid ? (voucherPaymentType === 'CASH' ? 'Cash in Hand' : voucherPaymentType) : undefined);
    const effectivePaymentType = isPartial
      ? (actualPaid >= totalVoucherAmount ? (voucherPartialMethod || 'CASH') : 'CREDIT')
      : voucherPaymentType;

    const newVoucher: PurchaseVoucher = {
      id: Date.now(),
      date: voucherDate,
      vendor: voucherVendor,
      billNo: voucherBillNo.trim() || ('BILL-' + Date.now().toString().slice(-4)),
      paymentType: effectivePaymentType,
      paymentMethod: payMethodName,
      status: voucherStatus,
      total: totalVoucherAmount,
      paid: actualPaid,
      items: JSON.parse(JSON.stringify(voucherItems))
    };

    savePurchaseVoucher(newVoucher, voucherUpdateMasterRates);
    setIsVoucherModalOpen(false);
  };

  // --- Purchase Order (PO) Handlers ---
  const handleOpenNewPo = () => {
    setPoUpdateMasterRates(false);
    setPoNo('DCC-PO-2026-' + Math.floor(1000 + Math.random() * 9000));
    setPoDate(new Date().toISOString().split('T')[0]);
    setPoExpectedDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setPoVendor(data.vendors[0] || 'Kader Meat Supply');
    setPoNotes('');

    if (data.masterItems.length > 0) {
      const defaultRaw = data.masterItems[0];
      setPoItems([{
        itemId: defaultRaw.id,
        item: defaultRaw.name,
        category: defaultRaw.category,
        uom: defaultRaw.uom,
        qty: 5,
        rate: defaultRaw.defaultRate,
        total: 5 * defaultRaw.defaultRate
      }]);
    } else {
      setPoItems([]);
    }
    setIsPoModalOpen(true);
  };

  const handleAddPoRow = () => {
    if (data.masterItems.length === 0) {
      alert('No raw materials available. Please add raw materials first.');
      return;
    }
    const defaultRaw = data.masterItems[0];
    setPoItems(prev => [...prev, {
      itemId: defaultRaw.id,
      item: defaultRaw.name,
      category: defaultRaw.category,
      uom: defaultRaw.uom,
      qty: 1,
      rate: defaultRaw.defaultRate,
      total: defaultRaw.defaultRate
    }]);
  };

  const handlePoItemChange = (index: number, rawId: number) => {
    const raw = data.masterItems.find(m => m.id === rawId);
    if (!raw) return;
    setPoItems(prev => {
      const arr = [...prev];
      const qty = arr[index].qty || 1;
      arr[index] = {
        itemId: raw.id,
        item: raw.name,
        category: raw.category,
        uom: raw.uom,
        qty,
        rate: raw.defaultRate,
        total: qty * raw.defaultRate
      };
      return arr;
    });
  };

  const handlePoQtyRateChange = (index: number, qty: number, rate: number) => {
    setPoItems(prev => {
      const arr = [...prev];
      arr[index] = {
        ...arr[index],
        qty,
        rate,
        total: Math.round(qty * rate)
      };
      return arr;
    });
  };

  const handleRemovePoRow = (index: number) => {
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalPoAmount = poItems.reduce((sum, i) => sum + (i.total || 0), 0);

  const handleSubmitPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Please add at least one item to the Purchase Order!');
      return;
    }

    const newPo: PurchaseOrder = {
      id: Date.now(),
      poNo: poNo.trim() || ('DCC-PO-2026-' + Date.now().toString().slice(-4)),
      date: poDate,
      expectedDate: poExpectedDate,
      vendor: poVendor,
      items: JSON.parse(JSON.stringify(poItems)),
      total: totalPoAmount,
      status: 'PENDING',
      notes: poNotes
    };

    savePurchaseOrder(newPo, poUpdateMasterRates);
    setIsPoModalOpen(false);
  };

  // --- Receive Items against PO Handlers ---
  const handleOpenReceiveModal = (po: PurchaseOrder) => {
    setReceiveUpdateMasterRates(true);
    setReceivingPo(po);
    setReceiveBillNo('INV-' + Math.floor(1000 + Math.random() * 9000));
    setReceivePaymentType('CREDIT');
    setReceivePartialPaid(0);
    setReceivePartialMethod(activeFundMethods[0]?.name || 'Cash in Hand');
    setReceiveDate(new Date().toISOString().split('T')[0]);

    // Calculate already received quantities
    const receivedMap = new Map<number, number>();
    (po.receivedHistory || []).forEach(hist => {
      hist.items.forEach(hi => {
        receivedMap.set(hi.itemId, (receivedMap.get(hi.itemId) || 0) + (hi.qty || 0));
      });
    });

    const initialList = po.items.map(item => {
      const alreadyReceived = receivedMap.get(item.itemId) || 0;
      const remaining = Math.max(0, item.qty - alreadyReceived);
      return {
        itemId: item.itemId,
        item: item.item,
        category: item.category,
        uom: item.uom,
        orderedQty: item.qty,
        alreadyReceivedQty: alreadyReceived,
        receiveQty: remaining,
        rate: item.rate,
        total: Math.round(remaining * item.rate)
      };
    });

    setReceiveItemsList(initialList);
  };

  const handleReceiveQtyChange = (index: number, newQty: number) => {
    setReceiveItemsList(prev => {
      const arr = [...prev];
      const maxAllowed = arr[index].orderedQty - arr[index].alreadyReceivedQty;
      const validQty = Math.max(0, Math.min(newQty, maxAllowed > 0 ? maxAllowed * 2 : newQty));
      arr[index] = {
        ...arr[index],
        receiveQty: validQty,
        total: Math.round(validQty * arr[index].rate)
      };
      return arr;
    });
  };

  const handleReceiveRateChange = (index: number, newRate: number) => {
    setReceiveItemsList(prev => {
      const arr = [...prev];
      const validRate = Math.max(0, newRate);
      arr[index] = {
        ...arr[index],
        rate: validRate,
        total: Math.round(arr[index].receiveQty * validRate)
      };
      return arr;
    });
  };

  const totalReceiveBillAmount = receiveItemsList.reduce((sum, i) => sum + i.total, 0);

  const handleSubmitReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    const itemsToReceive = receiveItemsList
      .filter(i => i.receiveQty > 0)
      .map(i => ({
        itemId: i.itemId,
        item: i.item,
        category: i.category,
        uom: i.uom,
        qty: i.receiveQty,
        rate: i.rate,
        total: i.total
      }));

    if (itemsToReceive.length === 0) {
      alert('Please enter at least 1 received quantity greater than 0!');
      return;
    }

    receivePurchaseOrderItems(
      receivingPo.id,
      itemsToReceive,
      receiveBillNo,
      receivePaymentType,
      receiveDate,
      receiveUpdateMasterRates,
      receivePartialPaid,
      receivePartialMethod
    );

    setReceivingPo(null);
  };

  // --- Supplier Return Handlers ---
  const handleOpenNewReturn = () => {
    setReturnNo('RET-' + new Date().getFullYear().toString().slice(-2) + '-' + Math.floor(10 + Math.random() * 90));
    setReturnDate(new Date().toISOString().split('T')[0]);
    const defaultVendor = data.vendors[0] || 'Kader Meat Supply';
    setReturnVendor(defaultVendor);
    setReturnBillNo('');
    if (data.masterItems.length > 0) {
      setReturnItemId(data.masterItems[0].id);
      setReturnRate(data.masterItems[0].defaultRate || 0);
    } else {
      setReturnItemId(1);
      setReturnRate(0);
    }
    setReturnQty(1);
    setReturnReason('Damaged packaging / seal broken upon delivery');
    setRefundStatus('ADJUSTED');
    setIsReturnModalOpen(true);
  };

  const handleReturnItemSelect = (selectedKey: string | number) => {
    // 1. Check if user selected an item from the matched bill
    const matchedBill = data.purchases.find(
      p => p.vendor === returnVendor && p.billNo.toLowerCase() === returnBillNo.toLowerCase().trim()
    );
    if (matchedBill && matchedBill.items) {
      const billItem = matchedBill.items.find(
        i => String(i.itemId) === String(selectedKey) || i.item === String(selectedKey)
      );
      if (billItem) {
        const masterMatch = data.masterItems.find(
          m => (billItem.itemId && String(m.id) === String(billItem.itemId)) ||
               (billItem.item && m.name.trim().toLowerCase() === billItem.item.trim().toLowerCase())
        );
        setReturnItemId(masterMatch ? masterMatch.id : (billItem.itemId || billItem.item));
        setReturnRate(billItem.rate || 0);
        setReturnQty(Math.min(returnQty || 1, billItem.qty || 1));
        return;
      }
    }

    // 2. Check in master inventory by ID or name
    const raw = data.masterItems.find(m => String(m.id) === String(selectedKey) || m.name.toLowerCase() === String(selectedKey).toLowerCase());
    if (raw) {
      setReturnItemId(raw.id);
      setReturnRate(raw.defaultRate);
      return;
    }

    setReturnItemId(selectedKey);
  };

  const returnSelectOptions = useMemo<RawSelectOption[]>(() => {
    const opts: RawSelectOption[] = [];
    const matchedBill = data.purchases.find(
      p => p.vendor === returnVendor && p.billNo.toLowerCase() === returnBillNo.toLowerCase().trim()
    );
    const billItems = matchedBill ? matchedBill.items : [];
    if (billItems.length > 0) {
      billItems.forEach((bi, idx) => {
        opts.push({
          id: String(bi.itemId || bi.item),
          name: bi.item,
          category: bi.category || 'Bill Item',
          uom: bi.uom || 'Unit',
          rate: bi.rate || 0,
          subtitle: `Purchased: ${bi.qty} ${bi.uom || ''}`,
          group: `Items from Bill ${returnBillNo}`,
          badge: 'Bill Item',
        });
      });
    }
    data.masterItems.forEach(m => {
      opts.push({
        id: m.id,
        name: m.name,
        category: m.category,
        uom: m.uom,
        rate: m.defaultRate,
        group: 'All Master Raw Materials',
      });
    });
    return opts;
  }, [data.purchases, data.masterItems, returnVendor, returnBillNo]);

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();

    if (returnQty <= 0) {
      alert('Return quantity must be greater than 0!');
      return;
    }

    // Match raw material from master items by ID or name
    let raw = data.masterItems.find(m => String(m.id) === String(returnItemId));
    if (!raw) {
      raw = data.masterItems.find(
        m => m.name.trim().toLowerCase() === String(returnItemId).trim().toLowerCase()
      );
    }

    // If not found in masterItems, check in the matched bill
    const matchedBill = data.purchases.find(
      p => p.billNo.toLowerCase() === returnBillNo.toLowerCase().trim()
    );
    const billItem = matchedBill?.items.find(
      i => String(i.itemId) === String(returnItemId) ||
           i.item.trim().toLowerCase() === String(returnItemId).trim().toLowerCase()
    ) || matchedBill?.items[0];

    let finalItemId: number;
    let finalItemName: string;
    let finalUom: string;

    if (raw) {
      finalItemId = Number(raw.id) || Date.now();
      finalItemName = raw.name;
      finalUom = raw.uom;
    } else if (billItem) {
      finalItemId = Number(billItem.itemId) || (data.masterItems[0]?.id ? Number(data.masterItems[0].id) : Date.now());
      finalItemName = billItem.item;
      finalUom = billItem.uom || 'Unit';
    } else if (data.masterItems.length > 0) {
      const firstMaster = data.masterItems[0];
      finalItemId = Number(firstMaster.id);
      finalItemName = firstMaster.name;
      finalUom = firstMaster.uom;
    } else {
      alert('Selected item not found in master inventory!');
      return;
    }

    const totalRetAmount = Math.round(returnQty * returnRate);

    const newReturn: PurchaseReturn = {
      id: Date.now(),
      returnNo: returnNo.trim() || ('RET-' + Date.now().toString().slice(-4)),
      date: returnDate,
      vendor: returnVendor,
      billNo: returnBillNo.trim(),
      itemId: finalItemId,
      item: finalItemName,
      qty: returnQty,
      uom: finalUom,
      rate: returnRate,
      total: totalRetAmount,
      reason: returnReason.trim() || 'Returned to supplier',
      refundStatus
    };

    savePurchaseReturn(newReturn);
    setIsReturnModalOpen(false);
  };

  // --- Vendor Handlers ---
  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    const trimmed = newVendorName.trim();
    addConfigItem('vendors', trimmed);
    if (newVendorPhone.trim() || newVendorContactPerson.trim() || newVendorAddress.trim()) {
      saveSupplierContact(trimmed, {
        phone: newVendorPhone.trim(),
        contactPerson: newVendorContactPerson.trim(),
        address: newVendorAddress.trim()
      });
    }
    setNewVendorName('');
    setNewVendorPhone('');
    setNewVendorContactPerson('');
    setNewVendorAddress('');
    setIsVendorModalOpen(false);
  };

  const handleOpenEditVendor = (vendorName: string, defaultPhone: string) => {
    const contact = supplierContacts[vendorName];
    setEditingVendor({
      originalName: vendorName,
      name: vendorName,
      phone: contact?.phone || defaultPhone,
      contactPerson: contact?.contactPerson || '',
      address: contact?.address || ''
    });
  };

  const handleSaveEditVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editingVendor.name.trim()) return;

    const trimmedName = editingVendor.name.trim();
    const vendorIndex = data.vendors.indexOf(editingVendor.originalName);

    if (vendorIndex >= 0 && trimmedName !== editingVendor.originalName) {
      editConfigItem('vendors', vendorIndex, trimmedName);
      if (selectedSupplierLedger === editingVendor.originalName) {
        setSelectedSupplierLedger(trimmedName);
      }
    }

    saveSupplierContact(trimmedName, {
      phone: editingVendor.phone.trim(),
      contactPerson: editingVendor.contactPerson.trim(),
      address: editingVendor.address.trim()
    }, editingVendor.originalName);

    setEditingVendor(null);
  };

  const handleSettleVendorPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBillTarget || payAmount <= 0) return;

    const methodLabel = selectedPaymentMethodObj?.name || payMethod;

    settlePurchaseBill(
      payBillTarget.billNo || '',
      payBillTarget.vendor,
      payAmount,
      methodLabel,
      payNote || (payBillTarget.isAllDues ? 'Full Vendor Dues Settlement' : `Payment for Bill ${payBillTarget.billNo}`)
    );

    setPayBillTarget(null);
    setPayNote('');
  };

  // --- Filtering Data ---
  const purchaseOrders = data.purchaseOrders || [];
  const purchaseReturns = data.purchaseReturns || [];

  const filteredVouchers = data.purchases.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return p.vendor.toLowerCase().includes(q) || p.billNo.toLowerCase().includes(q) || p.date.includes(q);
  });

  const filteredPOs = purchaseOrders.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return p.poNo.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q) || p.status.toLowerCase().includes(q);
  });

  const filteredReturns = purchaseReturns.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return r.returnNo.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q) || r.item.toLowerCase().includes(q);
  });

  const filteredVendors = data.vendors.filter((v, idx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const phone = getSupplierPhone(v, idx);
    const contactPerson = supplierContacts[v]?.contactPerson || '';
    return v.toLowerCase().includes(q) || phone.toLowerCase().includes(q) || contactPerson.toLowerCase().includes(q);
  });

  // Calculate Ledger Data for Selected Supplier (matching screenshot)
  const getSupplierLedgerDetails = (supplierName: string) => {
    const vouchers = data.purchases.filter(p => p.vendor === supplierName);
    const pos = (data.purchaseOrders || []).filter(p => p.vendor === supplierName && p.status === 'PENDING');
    const returns = (data.purchaseReturns || []).filter(p => p.vendor === supplierName);

    let totalBillsVal = 0;
    let totalPaidVal = 0;
    let totalDueVal = 0;

    const adjustedReturnsVal = returns
      .filter(r => r.refundStatus === 'ADJUSTED')
      .reduce((sum, r) => sum + r.total, 0);

    const refundedReturnsVal = returns
      .filter(r => r.refundStatus === 'REFUNDED')
      .reduce((sum, r) => sum + r.total, 0);

    const billRows: {
      id: string | number;
      poNoOrBillNo: string;
      date: string;
      itemsSummary: string;
      destination: string;
      total: number;
      paid: number;
      due: number;
      status: 'PENDING_UNRECEIVED' | 'DUE' | 'PAID' | 'RETURN_ADJUSTED' | 'RETURN_REFUNDED' | 'RETURN_PENDING';
      type: 'BILL' | 'PO' | 'RETURN';
      poObject?: PurchaseOrder;
      returnObject?: PurchaseReturn;
    }[] = [];

    // Add Received Purchase Bills
    vouchers.forEach(v => {
      const paid = v.paid !== undefined ? v.paid : (v.paymentType === 'CASH' ? v.total : 0);
      const billReturns = returns
        .filter(r => r.refundStatus === 'ADJUSTED' && r.billNo && (r.billNo.toLowerCase() === v.billNo.toLowerCase() || r.billNo.replace(/\s+/g, '-').toLowerCase() === v.billNo.replace(/\s+/g, '-').toLowerCase()))
        .reduce((sum, r) => sum + r.total, 0);
      const due = Math.max(0, v.total - paid - billReturns);

      totalBillsVal += v.total;
      totalPaidVal += paid;
      totalDueVal += due;

      billRows.push({
        id: `BILL-${v.id}`,
        poNoOrBillNo: v.billNo,
        date: v.date,
        itemsSummary: v.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', '),
        destination: billReturns > 0 ? `Main Kitchen (Adj -৳${billReturns})` : 'Main Kitchen',
        total: v.total,
        paid,
        due,
        status: due > 0 ? 'DUE' : 'PAID',
        type: 'BILL'
      });
    });

    // Add Supplier Returns
    returns.forEach(r => {
      billRows.push({
        id: `RET-${r.id}`,
        poNoOrBillNo: r.returnNo,
        date: r.date,
        itemsSummary: `[Return Claim] ${r.item} (${r.qty} ${r.uom}) — Reason: ${r.reason}`,
        destination: `Supplier Return (${r.refundStatus})`,
        total: r.total,
        paid: r.refundStatus === 'REFUNDED' ? r.total : 0,
        due: 0,
        status: r.refundStatus === 'ADJUSTED' ? 'RETURN_ADJUSTED' : (r.refundStatus === 'REFUNDED' ? 'RETURN_REFUNDED' : 'RETURN_PENDING'),
        type: 'RETURN',
        returnObject: r
      });
    });

    // Add Pending Unreceived POs
    let pendingOrdersVal = 0;
    pos.forEach(p => {
      pendingOrdersVal += p.total;
      totalBillsVal += p.total;

      billRows.push({
        id: `PO-${p.id}`,
        poNoOrBillNo: p.poNo,
        date: p.date,
        itemsSummary: p.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', '),
        destination: 'Factory / Kitchen',
        total: p.total,
        paid: 0,
        due: 0,
        status: 'PENDING_UNRECEIVED',
        type: 'PO',
        poObject: p
      });
    });

    // Deduct unlinked general adjusted returns from overall supplier due if any
    const unlinkedAdjustedReturns = returns
      .filter(r => r.refundStatus === 'ADJUSTED' && (!r.billNo || !vouchers.some(v => v.billNo.toLowerCase() === r.billNo?.toLowerCase() || v.billNo.replace(/\s+/g, '-').toLowerCase() === r.billNo?.replace(/\s+/g, '-').toLowerCase())))
      .reduce((sum, r) => sum + r.total, 0);
    const finalTotalDue = Math.max(0, totalDueVal - unlinkedAdjustedReturns);

    return {
      totalBillsVal,
      totalPaidVal,
      totalDueVal: finalTotalDue,
      adjustedReturnsVal,
      refundedReturnsVal,
      receivedBillsCount: vouchers.length,
      pendingOrdersCount: pos.length,
      returnsCount: returns.length,
      pendingOrdersVal,
      billRows
    };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Module Title Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span>Purchases, Purchase Orders & Supplier Returns</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage raw material purchases, PO requisition & receiving, vendor bills, and supplier returns
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'vouchers' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Purchase Bills ({data.purchases.length})</span>
          </button>

          <button
            id="tab-btn-purchase-orders"
            onClick={() => setActiveTab('po')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'po' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Purchase Orders / PO ({purchaseOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'returns' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Supplier Returns ({purchaseReturns.length})</span>
          </button>

          <button
            id="tab-btn-suppliers-directory"
            onClick={() => setActiveTab('vendors')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'vendors' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Suppliers Directory ({data.vendors.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Total Purchase Bills</div>
          <div className="text-lg font-extrabold text-blue-700 mt-0.5">৳ {metrics.totalPurchases.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 font-medium">{data.purchases.length} invoices</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Pending POs</div>
          <div className="text-lg font-extrabold text-amber-600 mt-0.5">
            {purchaseOrders.filter(p => p.status === 'PENDING' || p.status === 'PARTIALLY_RECEIVED').length} Active POs
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Items awaiting receiving</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Supplier Dues & Payables</div>
          <div className="text-lg font-extrabold text-rose-600 mt-0.5">৳ {metrics.totalVendorDue.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 font-medium">Unsettled credit bills</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500">Supplier Returns</div>
          <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
            ৳ {purchaseReturns.reduce((sum, r) => sum + r.total, 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">{purchaseReturns.length} return claims</div>
        </div>
      </div>

      {/* Filter / Search & Action Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              activeTab === 'po' ? "Search PO#, supplier..." :
              activeTab === 'returns' ? "Search return#, item..." :
              activeTab === 'vendors' ? "Search supplier name..." :
              "Search vendor, bill no, date..."
            }
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {activeTab === 'vouchers' && (
            <button
              onClick={handleOpenNewVoucher}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Bill</span>
            </button>
          )}

          {activeTab === 'po' && (
            <button
              id="btn-create-purchase-order"
              onClick={handleOpenNewPo}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Purchase Order (PO)</span>
            </button>
          )}

          {activeTab === 'returns' && (
            <button
              onClick={handleOpenNewReturn}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Supplier Return</span>
            </button>
          )}

          {activeTab === 'vendors' && (
            <button
              onClick={() => setIsVendorModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: PURCHASE BILLS / VOUCHERS ================= */}
      {activeTab === 'vouchers' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Voucher / Bill No</th>
                  <th className="py-3 px-4 font-bold">Vendor / Supplier</th>
                  <th className="py-3 px-4 font-bold">Payment Type</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold">Items Received</th>
                  <th className="py-3 px-4 font-bold text-right">Total (৳)</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No purchase bills found. Click "+ New Purchase Bill" to record a bill.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map(voucher => {
                    const linkedPayments = (data.payments || []).filter(pay => 
                      pay.billNo && voucher.billNo && (
                        pay.billNo.trim().toLowerCase() === voucher.billNo.trim().toLowerCase() ||
                        pay.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === voucher.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                      )
                    );
                    const linkedPaymentsTotal = linkedPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
                    const paid = Math.max(
                      voucher.paid !== undefined ? voucher.paid : 0,
                      linkedPaymentsTotal,
                      voucher.paymentType === 'CASH' ? voucher.total : 0
                    );
                    const matchingReturns = purchaseReturns.filter(r => 
                      r.refundStatus === 'ADJUSTED' && 
                      r.vendor === voucher.vendor && 
                      r.billNo && 
                      (r.billNo.toLowerCase() === voucher.billNo.toLowerCase() || r.billNo.replace(/\s+/g, '-').toLowerCase() === voucher.billNo.replace(/\s+/g, '-').toLowerCase())
                    );
                    const billAdjustedReturn = matchingReturns.reduce((sum, r) => sum + r.total, 0);
                    const due = Math.max(0, voucher.total - paid - billAdjustedReturn);
                    const isFullyPaid = due === 0;
                    const isPartiallyPaid = paid > 0 && due > 0;

                    return (
                      <tr 
                        key={voucher.id} 
                        onDoubleClick={() => setViewingVoucher(voucher)}
                        title="Double-click to view Voucher Memo"
                        className="hover:bg-slate-50 transition cursor-pointer select-none"
                      >
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{voucher.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{voucher.billNo}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{voucher.vendor}</td>
                        <td className="py-3 px-4">
                          {voucher.paymentType === 'CREDIT' ? (
                            isFullyPaid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Credit (Settled)
                              </span>
                            ) : isPartiallyPaid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1.5 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                Partial Paid (Due: ৳{due.toLocaleString()})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                Credit (Due)
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                              <Check className="w-3 h-3 text-emerald-600" />
                              {voucher.paymentMethod || voucher.paymentType || 'Cash Paid'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            voucher.status === 'FINAL' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {voucher.status === 'FINAL' ? '✓ Final (Inwarded)' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-medium">
                          {voucher.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-slate-900 text-sm font-mono">৳ {voucher.total.toLocaleString()}</div>
                          {voucher.paymentType === 'CREDIT' && (
                            <div className="text-[10px] font-mono mt-0.5">
                              <span className="text-emerald-700 font-bold">Paid: ৳{paid.toLocaleString()}</span>
                              {due > 0 && (
                                <span className="text-rose-700 font-black ml-1.5">Due: ৳{due.toLocaleString()}</span>
                              )}
                            </div>
                          )}
                          {billAdjustedReturn > 0 && (
                            <div className="text-[10px] text-purple-700 font-extrabold mt-0.5" title={`Adjusted return for bill #${voucher.billNo}`}>
                              Ret Adj: -৳{billAdjustedReturn.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingVoucher(voucher)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 cursor-pointer"
                              title="View Voucher Memo"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {due > 0 && (
                              <button
                                onClick={() => {
                                  setPayBillTarget({
                                    billNo: voucher.billNo,
                                    vendor: voucher.vendor,
                                    dueAmount: due,
                                    totalAmount: voucher.total
                                  });
                                  setPayAmount(due);
                                }}
                                className={`p-1 px-2.5 text-[10px] font-extrabold rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1 ${
                                  isPartiallyPaid 
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                }`}
                                title={`Pay Bill #${voucher.billNo} - Remaining Due: ৳${due.toLocaleString()}`}
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>{isPartiallyPaid ? `Pay Due (৳${due.toLocaleString()})` : 'Pay Bill'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => deletePurchaseVoucher(voucher.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                              title="Delete"
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
      )}

      {/* ================= TAB 2: PURCHASE ORDERS (PO) ================= */}
      {activeTab === 'po' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm">Purchase Orders (PO) & Receiving Workbench</h3>
              </div>
              <span className="text-xs text-slate-400">
                1. Create PO → 2. Supplier Delivers → 3. Click "Receive Items" to Generate Bill & Inward Stock
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">PO Date</th>
                    <th className="py-3 px-4">Expected Date</th>
                    <th className="py-3 px-4">Vendor / Supplier</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4 text-right">PO Total (৳)</th>
                    <th className="py-3 px-4 text-center">Actions / Receive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No purchase orders found. Click "+ Create Purchase Order (PO)" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map(po => (
                      <tr 
                        key={po.id} 
                        onDoubleClick={() => setViewingPo(po)}
                        title="Double-click to view PO Memo"
                        className="hover:bg-slate-50 transition cursor-pointer select-none"
                      >
                        <td className="py-3 px-4 font-mono font-extrabold text-blue-700">{po.poNo}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{po.date}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{po.expectedDate || 'N/A'}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{po.vendor}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${
                            po.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            po.status === 'PARTIALLY_RECEIVED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            po.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          }`}>
                            {po.status === 'FULFILLED' ? '✓ FULFILLED' :
                             po.status === 'PARTIALLY_RECEIVED' ? 'PARTIAL RECEIVED' :
                             po.status === 'CANCELLED' ? 'CANCELLED' :
                             '⏳ PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-medium">
                          {po.items.map(i => `${i.item} (${i.qty} ${i.uom})`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm whitespace-nowrap">
                          ৳ {po.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {po.status !== 'FULFILLED' && po.status !== 'CANCELLED' && (
                              <button
                                id={`btn-receive-po-${po.id}`}
                                onClick={() => handleOpenReceiveModal(po)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="Receive Items & Auto-Generate Bill"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Receive Items</span>
                              </button>
                            )}

                            <button
                              onClick={() => setViewingPo(po)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 cursor-pointer"
                              title="View PO Details"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => deletePurchaseOrder(po.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                              title="Delete PO"
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
          </div>
        </div>
      )}

      {/* ================= TAB 3: SUPPLIER RETURNS ================= */}
      {activeTab === 'returns' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Return No</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Vendor / Supplier</th>
                  <th className="py-3 px-4 font-bold">Bill No</th>
                  <th className="py-3 px-4 font-bold">Item Name</th>
                  <th className="py-3 px-4 font-bold text-center">Returned Qty</th>
                  <th className="py-3 px-4 font-bold text-right">Amount (৳)</th>
                  <th className="py-3 px-4 font-bold">Reason</th>
                  <th className="py-3 px-4 font-bold text-center">Refund Status</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No supplier returns recorded. Click "+ New Supplier Return" to record one.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map(ret => (
                    <tr 
                      key={ret.id} 
                      onDoubleClick={() => setViewingReturn(ret)}
                      title="Double-click to view Return Note"
                      className="hover:bg-slate-50 transition cursor-pointer select-none group"
                    >
                      <td className="py-3 px-4 font-mono font-extrabold text-rose-700">{ret.returnNo}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{ret.date}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{ret.vendor}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{ret.billNo || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{ret.item}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {ret.qty} {ret.uom}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-rose-600 whitespace-nowrap">
                        ৳ {ret.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">{ret.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          ret.refundStatus === 'REFUNDED' ? 'bg-emerald-100 text-emerald-800' :
                          ret.refundStatus === 'ADJUSTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {ret.refundStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setViewingReturn(ret)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 cursor-pointer"
                            title="View Return Note"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePurchaseReturn(ret.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                            title="Delete Return Record"
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
        </div>
      )}

      {/* ================= TAB 4: SUPPLIERS DIRECTORY ================= */}
      {activeTab === 'vendors' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Supplier / Company</th>
                  <th className="py-3 px-4 font-bold">Contact Phone</th>
                  <th className="py-3 px-4 font-bold text-center">Received Bills</th>
                  <th className="py-3 px-4 font-bold text-center">Pending Orders</th>
                  <th className="py-3 px-4 font-bold text-right">Total Purchases (৳)</th>
                  <th className="py-3 px-4 font-bold text-right">Balance Payable Due (৳)</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No suppliers found matching "{search}".
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v) => {
                    const originalIndex = data.vendors.indexOf(v);
                    const idx = originalIndex >= 0 ? originalIndex : 0;
                    const vendorBills = data.purchases.filter(p => p.vendor === v);
                    const vendorPos = (data.purchaseOrders || []).filter(p => p.vendor === v && p.status === 'PENDING');

                    const totalVendorPurchase = vendorBills.reduce((sum, b) => sum + b.total, 0);
                    const vendorPaid = vendorBills.reduce((sum, b) => sum + (b.paid !== undefined ? b.paid : (b.paymentType === 'CASH' ? b.total : 0)), 0);
                    const vendorAdjustedReturns = (data.purchaseReturns || []).filter(r => r.vendor === v && r.refundStatus === 'ADJUSTED').reduce((sum, r) => sum + r.total, 0);
                    const vendorDues = Math.max(0, totalVendorPurchase - vendorPaid - vendorAdjustedReturns);
                    const phoneMock = getSupplierPhone(v, idx);
                    const contactInfo = supplierContacts[v];

                    return (
                      <tr
                        key={v}
                        onDoubleClick={() => {
                          setSelectedSupplierLedger(v);
                          setLedgerFilter('ALL');
                        }}
                        title="Double-click to view Bills & Ledger"
                        className="hover:bg-slate-50 transition cursor-pointer select-none"
                      >
                        {/* Supplier / Company */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg font-bold shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 text-xs">{v}</span>
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                Raw Materials Supplier
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Phone & Person */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-xs text-slate-800">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{phoneMock}</span>
                          </div>
                          {contactInfo?.contactPerson && (
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {contactInfo.contactPerson}
                            </div>
                          )}
                        </td>

                        {/* Received Bills */}
                        <td className="py-3 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                          {vendorBills.length} Invoices
                        </td>

                        {/* Pending Orders */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            vendorPos.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400'
                          }`}>
                            {vendorPos.length} POs
                          </span>
                        </td>

                        {/* Total Purchases */}
                        <td className="py-3 px-4 text-right font-extrabold text-blue-700 whitespace-nowrap">
                          ৳ {totalVendorPurchase.toLocaleString()}
                        </td>

                        {/* Balance Payable Due */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={`font-black text-sm ${vendorDues > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ৳ {vendorDues.toLocaleString()}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEditVendor(v, phoneMock)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                              title="Edit Supplier Details"
                            >
                              <Pencil className="w-3 h-3 text-slate-600" />
                              <span>Edit</span>
                            </button>

                            <button
                              id={`btn-view-ledger-${v.replace(/\s+/g, '-').toLowerCase()}`}
                              onClick={() => {
                                setSelectedSupplierLedger(v);
                                setLedgerFilter('ALL');
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-[11px] rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="View Supplier Bills & Ledger"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Ledger</span>
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
      )}

      {/* ================= MODAL: SUPPLIER LEDGER & INDIVIDUAL BILL-WISE PAYMENTS (MATCHING SCREENSHOT) ================= */}
      {selectedSupplierLedger && (() => {
        const ledgerData = getSupplierLedgerDetails(selectedSupplierLedger);
        const supplierIndex = data.vendors.indexOf(selectedSupplierLedger);
        const mockPhone = `017${(56007600 + (supplierIndex >= 0 ? supplierIndex : 0) * 111111).toString().slice(0, 8)}`;

        const filteredRows = ledgerData.billRows.filter(row => {
          if (ledgerFilter === 'RECEIVED') return row.type === 'BILL';
          if (ledgerFilter === 'PENDING') return row.type === 'PO';
          if (ledgerFilter === 'RETURNS') return row.type === 'RETURN';
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden">
              {/* Modal Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-xl text-slate-900 tracking-tight">{selectedSupplierLedger}</h3>
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-extrabold rounded-full">
                        Raw Materials Supplier
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mockPhone}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSupplierLedger(null)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-6">
                {/* 3 Summary Cards (Top) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: TOTAL BILLS */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>TOTAL BILLS</span>
                        <Receipt className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-2">
                        ৳ {ledgerData.totalBillsVal.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-3">
                      {ledgerData.receivedBillsCount} received bills • ({ledgerData.pendingOrdersCount} pending)
                    </div>
                  </div>

                  {/* Card 2: TOTAL PAID & ADJUSTMENTS */}
                  <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        <span>TOTAL PAID & ADJUSTED</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black text-emerald-700 mt-2">
                        ৳ {(ledgerData.totalPaidVal + ledgerData.adjustedReturnsVal).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-emerald-700 font-semibold mt-3 flex items-center justify-between">
                      <span>Paid: ৳{ledgerData.totalPaidVal.toLocaleString()}</span>
                      {ledgerData.adjustedReturnsVal > 0 && (
                        <span className="text-rose-700 font-bold">• Ret Adj: ৳{ledgerData.adjustedReturnsVal.toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Card 3: BALANCE (DUE) */}
                  <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 uppercase tracking-wider">
                        <span>BALANCE (DUE)</span>
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-black text-amber-800 mt-2">
                        ৳ {ledgerData.totalDueVal.toLocaleString()}
                      </div>
                      <div className="text-xs text-amber-800/80 font-medium mt-1">
                        Pending orders: ৳ {ledgerData.pendingOrdersVal.toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-4">
                      {ledgerData.totalDueVal > 0 ? (
                        <button
                          onClick={() => {
                            setPayBillTarget({
                              vendor: selectedSupplierLedger,
                              dueAmount: ledgerData.totalDueVal,
                              totalAmount: ledgerData.totalBillsVal,
                              isAllDues: true
                            });
                            setPayAmount(ledgerData.totalDueVal);
                          }}
                          className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>💳 Pay All Dues</span>
                        </button>
                      ) : (
                        <div className="px-3 py-2 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-xl text-center">
                          ✓ All Dues Settled
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Header & Filter Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">Individual Purchase Bills & Adjustments</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Bills are due upon receiving and adjusted against returns.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLedgerFilter('ALL')}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                        ledgerFilter === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({ledgerData.billRows.length})
                    </button>
                    <button
                      onClick={() => setLedgerFilter('RECEIVED')}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                        ledgerFilter === 'RECEIVED'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {ledgerData.receivedBillsCount} Received
                    </button>
                    <button
                      onClick={() => setLedgerFilter('PENDING')}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                        ledgerFilter === 'PENDING'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {ledgerData.pendingOrdersCount} Pending
                    </button>
                    {ledgerData.returnsCount > 0 && (
                      <button
                        onClick={() => setLedgerFilter('RETURNS')}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                          ledgerFilter === 'RETURNS'
                            ? 'bg-rose-700 text-white'
                            : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {ledgerData.returnsCount} Returns
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual Purchase Bills Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">PO NO & DATE</th>
                          <th className="py-3 px-4">ITEMS & DESTINATION</th>
                          <th className="py-3 px-4 text-right">TOTAL BILL</th>
                          <th className="py-3 px-4 text-right">PAID</th>
                          <th className="py-3 px-4 text-right">DUE</th>
                          <th className="py-3 px-4 text-center">STATUS</th>
                          <th className="py-3 px-4 text-center">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                              No bills found for this filter.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50 transition">
                              {/* PO NO & DATE */}
                              <td className="py-3.5 px-4">
                                <div className="font-mono font-black text-slate-900 text-xs">{row.poNoOrBillNo}</div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{row.date}</span>
                                </div>
                              </td>

                              {/* ITEMS & DESTINATION */}
                              <td className="py-3.5 px-4 max-w-xs">
                                <div className="font-bold text-slate-900 text-xs truncate">{row.itemsSummary}</div>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                                  {row.destination}
                                </span>
                              </td>

                              {/* TOTAL BILL */}
                              <td className="py-3.5 px-4 text-right font-black text-xs">
                                {row.type === 'RETURN' ? (
                                  <span className="text-rose-600">-৳{row.total.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-900">৳{row.total.toLocaleString()}</span>
                                )}
                              </td>

                              {/* PAID */}
                              <td className="py-3.5 px-4 text-right font-bold text-xs">
                                {row.type === 'RETURN' ? (
                                  row.paid > 0 ? (
                                    <span className="text-emerald-700">৳{row.paid.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )
                                ) : (
                                  <span className="text-emerald-700">৳{row.paid.toLocaleString()}</span>
                                )}
                              </td>

                              {/* DUE */}
                              <td className="py-3.5 px-4 text-right">
                                {row.type === 'RETURN' ? (
                                  <span className="text-slate-400 font-medium text-xs">—</span>
                                ) : row.status === 'PENDING_UNRECEIVED' ? (
                                  <span className="text-slate-400 font-medium text-xs">— (Pending)</span>
                                ) : (
                                  <span className={`font-black text-xs ${row.due > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                    ৳{row.due.toLocaleString()}
                                  </span>
                                )}
                              </td>

                              {/* STATUS */}
                              <td className="py-3.5 px-4 text-center">
                                {row.status === 'PENDING_UNRECEIVED' && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 justify-center">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span>Pending (Unreceived)</span>
                                  </span>
                                )}

                                {row.status === 'DUE' && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                    Due
                                  </span>
                                )}

                                {row.status === 'PAID' && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ✓ Paid
                                  </span>
                                )}

                                {row.status === 'RETURN_ADJUSTED' && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                                    Adjusted (Due)
                                  </span>
                                )}

                                {row.status === 'RETURN_REFUNDED' && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Cash Refunded
                                  </span>
                                )}

                                {row.status === 'RETURN_PENDING' && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                    Claim Pending
                                  </span>
                                )}
                              </td>

                              {/* ACTION */}
                              <td className="py-3.5 px-4 text-center">
                                {row.type === 'RETURN' && (
                                  <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    Return Entry
                                  </span>
                                )}

                                {row.status === 'PENDING_UNRECEIVED' && row.poObject && (
                                  <button
                                    onClick={() => handleOpenReceiveModal(row.poObject!)}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center gap-1 mx-auto cursor-pointer"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Receive</span>
                                  </button>
                                )}
                                {row.status === 'DUE' && (
                                  <button
                                    onClick={() => {
                                      setPayBillTarget({
                                        billNo: row.poNoOrBillNo,
                                        vendor: selectedSupplierLedger,
                                        dueAmount: row.due,
                                        totalAmount: row.total
                                      });
                                      setPayAmount(row.due);
                                    }}
                                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-2xs transition flex items-center gap-1 mx-auto cursor-pointer"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Pay Due</span>
                                  </button>
                                )}

                                {row.status === 'PAID' && (
                                  <span className="text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Cleared</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Close Action */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedSupplierLedger(null)}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL: PAY SPECIFIC BILL / PAY ALL DUES POPUP ================= */}
      {payBillTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  {payBillTarget.isAllDues ? 'Pay All Vendor Dues' : `Pay Bill #${payBillTarget.billNo}`}
                </h3>
              </div>
              <button onClick={() => setPayBillTarget(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleVendorPayment} className="py-4 space-y-3">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
                <div className="text-slate-600">Supplier: <strong className="text-slate-900 font-extrabold">{payBillTarget.vendor}</strong></div>
                {payBillTarget.billNo && (
                  <div className="text-slate-600">Bill Invoice: <strong className="text-slate-900 font-mono font-bold">{payBillTarget.billNo}</strong></div>
                )}
                <div className="text-slate-600">Total Outstanding Balance: <strong className="text-rose-600 font-extrabold">৳ {payBillTarget.dueAmount.toLocaleString()}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (৳) *</label>
                <input
                  type="number"
                  min="1"
                  max={payBillTarget.dueAmount}
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Payment Method *</label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Channel Balances
                  </span>
                </div>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  {activeFundMethods.map(m => {
                    const bal = getMethodLiveBalance(m);
                    const icon = m.type === 'CASH' ? '💵' : m.type === 'BANK' ? '🏦' : m.type === 'CARD' ? '💳' : '📱';
                    return (
                      <option key={m.id} value={m.name}>
                        {icon} {m.name} {m.accountNumber ? `(${m.accountNumber})` : ''} (Available: ৳ {bal.toLocaleString()})
                      </option>
                    );
                  })}
                </select>

                <div className="mt-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Available In Selected Channel:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black text-sm ${selectedMethodBalance < payAmount ? 'text-rose-600' : 'text-emerald-700'}`}>
                      ৳ {selectedMethodBalance.toLocaleString()}
                    </span>
                    {selectedMethodBalance < payAmount && (
                      <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Low Balance
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note / Reference (Optional)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="e.g. Bank slip #9821 / Cash voucher"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPayBillTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD NEW DIRECT PURCHASE BILL / VOUCHER ================= */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <span>Record Direct Purchase Bill / Inward Voucher</span>
                </h3>
                <p className="text-xs text-slate-500">Directly inward raw materials received from vendor without prior PO</p>
              </div>
              <button onClick={() => setIsVoucherModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="flex-1 overflow-y-auto my-4 pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher / Bill No *</label>
                  <input
                    type="text"
                    required
                    value={voucherBillNo}
                    onChange={e => setVoucherBillNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-700 font-mono"
                    placeholder="e.g. BILL-6264"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier *</label>
                  <select
                    value={voucherVendor}
                    onChange={e => setVoucherVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {data.vendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={e => setVoucherDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method / Type *</label>
                  <select
                    value={voucherPaymentType}
                    onChange={e => setVoucherPaymentType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value="CREDIT">Credit (Full Due)</option>
                    <option value="PARTIAL">Partial Payment (Pay Part Now, Rest as Due)</option>
                    {activeFundMethods.map(m => {
                      const bal = getMethodLiveBalance(m);
                      return (
                        <option key={m.id} value={m.name}>
                          Full Payment via {m.name} (Available: ৳{bal.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {voucherPaymentType === 'PARTIAL' && (
                <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Partial Payment Breakdown
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      Total Bill Amount: <strong className="text-slate-900 font-mono">৳{totalVoucherAmount.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Pay Now Amount (৳) *</label>
                      <input
                        type="number"
                        min="0"
                        max={totalVoucherAmount}
                        step="any"
                        value={voucherPartialPaid || ''}
                        onChange={e => setVoucherPartialPaid(Math.max(0, Math.min(totalVoucherAmount, parseFloat(e.target.value) || 0)))}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-900"
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Paid From Account *</label>
                      <select
                        value={voucherPartialMethod}
                        onChange={e => setVoucherPartialMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        {activeFundMethods.map(m => {
                          const bal = getMethodLiveBalance(m);
                          return (
                            <option key={m.id} value={m.name}>
                              {m.name} (৳{bal.toLocaleString()})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 mb-1">Remaining Due (৳)</label>
                      <div className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-black text-rose-700 flex items-center justify-between">
                        <span>৳{Math.max(0, totalVoucherAmount - voucherPartialPaid).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-rose-600">Payable Later</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Radio / Badge */}
              <div className="flex flex-wrap items-center gap-4 px-1 text-xs font-bold">
                <span className="text-slate-600">Stock Inward Status:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="voucherStatus"
                    value="FINAL"
                    checked={voucherStatus === 'FINAL'}
                    onChange={() => setVoucherStatus('FINAL')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-700 font-extrabold">✓ Final (Add stock to inventory immediately)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="voucherStatus"
                    value="DRAFT"
                    checked={voucherStatus === 'DRAFT'}
                    onChange={() => setVoucherStatus('DRAFT')}
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span className="text-slate-600">Draft (Pending verification)</span>
                </label>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                    Received Raw Materials & Items
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddVoucherRow}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Raw Material Item</th>
                        <th className="py-2 px-2 font-semibold text-center">UOM</th>
                        <th className="py-2 px-2 font-semibold text-center">Received Qty</th>
                        <th className="py-2 px-2 font-semibold text-right">Rate (৳)</th>
                        <th className="py-2 px-3 font-semibold text-right">Total (৳)</th>
                        <th className="py-2 px-2 text-center font-semibold">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {voucherItems.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 min-w-[220px]">
                            <SearchableRawSelect
                              value={row.itemId}
                              rawItems={data.masterItems}
                              onChange={newId => handleVoucherItemChange(idx, Number(newId))}
                              buttonClassName="py-1 px-2 text-xs font-bold"
                              placeholder="Search raw material..."
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-600">
                            {row.uom}
                          </td>
                          <td className="py-2 px-2 text-center w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={row.qty}
                              onChange={e => handleVoucherQtyRateChange(idx, parseFloat(e.target.value) || 0, row.rate)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-extrabold text-blue-800"
                            />
                          </td>
                          <td className="py-2 px-2 text-right w-28">
                            <input
                              type="number"
                              min="0"
                              required
                              value={row.rate}
                              onChange={e => handleVoucherQtyRateChange(idx, row.qty, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                            ৳ {row.total.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveVoucherRow(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center gap-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="voucherUpdateMasterRates"
                    checked={voucherUpdateMasterRates}
                    onChange={e => setVoucherUpdateMasterRates(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
                  />
                  <label htmlFor="voucherUpdateMasterRates" className="text-xs font-bold text-indigo-950 cursor-pointer select-none flex items-center gap-1.5">
                    <span>Update Raw Materials Master Catalog standard rate with these purchase prices</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">(Recommended)</span>
                  </label>
                </div>

                <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400">Total Purchase Bill Amount:</div>
                  <div className="text-xl font-extrabold text-amber-400">৳ {totalVoucherAmount.toLocaleString()}</div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-sm shadow-md transition cursor-pointer"
                >
                  Save & Inward Purchase Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW PURCHASE ORDER (PO) ================= */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-amber-600" />
                  <span>Create New Purchase Order (PO)</span>
                </h3>
                <p className="text-xs text-slate-500">Send purchase requisition to supplier before item delivery</p>
              </div>
              <button onClick={() => setIsPoModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPo} className="flex-1 overflow-y-auto my-4 pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={poNo}
                    onChange={e => setPoNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier *</label>
                  <select
                    value={poVendor}
                    onChange={e => setPoVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {data.vendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PO Date *</label>
                  <input
                    type="date"
                    required
                    value={poDate}
                    onChange={e => setPoDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Delivery *</label>
                  <input
                    type="date"
                    required
                    value={poExpectedDate}
                    onChange={e => setPoExpectedDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                    Ordered Raw Materials
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPoRow}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Raw Material Item</th>
                        <th className="py-2 px-2 font-semibold text-center">UOM</th>
                        <th className="py-2 px-2 font-semibold text-center">Ordered Qty</th>
                        <th className="py-2 px-2 font-semibold text-right">Rate (৳)</th>
                        <th className="py-2 px-3 font-semibold text-right">Total (৳)</th>
                        <th className="py-2 px-2 text-center font-semibold">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poItems.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 min-w-[220px]">
                            <SearchableRawSelect
                              value={row.itemId}
                              rawItems={data.masterItems}
                              onChange={newId => handlePoItemChange(idx, Number(newId))}
                              buttonClassName="py-1 px-2 text-xs font-bold"
                              placeholder="Search raw material..."
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-600">
                            {row.uom}
                          </td>
                          <td className="py-2 px-2 text-center w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={row.qty}
                              onChange={e => handlePoQtyRateChange(idx, parseFloat(e.target.value) || 0, row.rate)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center text-xs font-extrabold text-blue-800"
                            />
                          </td>
                          <td className="py-2 px-2 text-right w-28">
                            <input
                              type="number"
                              min="0"
                              required
                              value={row.rate}
                              onChange={e => handlePoQtyRateChange(idx, row.qty, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                            ৳ {row.total.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePoRow(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center gap-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="poUpdateMasterRates"
                    checked={poUpdateMasterRates}
                    onChange={e => setPoUpdateMasterRates(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
                  />
                  <label htmlFor="poUpdateMasterRates" className="text-xs font-bold text-indigo-950 cursor-pointer select-none flex items-center gap-1.5">
                    <span>Update Raw Materials Master Catalog standard rate with PO estimated rates</span>
                  </label>
                </div>

                <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400">Total Purchase Order Estimate:</div>
                  <div className="text-xl font-extrabold text-amber-400">৳ {totalPoAmount.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PO Notes / Special Requirements</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={e => setPoNotes(e.target.value)}
                  placeholder="e.g. Delivery required at morning 8 AM before kitchen prep..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm shadow-md transition cursor-pointer"
                >
                  Save & Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECEIVE ITEMS AGAINST PO (AUTO GENERATE BILL) ================= */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    Receive Goods & Auto-Generate Bill for {receivingPo.poNo}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor: <strong className="text-slate-900">{receivingPo.vendor}</strong> • PO Date: {receivingPo.date}
                </p>
              </div>
              <button onClick={() => setReceivingPo(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="flex-1 overflow-y-auto my-4 pr-1 space-y-4">
              {/* Bill Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Bill / Invoice No *</label>
                  <input
                    type="text"
                    required
                    value={receiveBillNo}
                    onChange={e => setReceiveBillNo(e.target.value)}
                    placeholder="INV-9901"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-emerald-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receive Date *</label>
                  <input
                    type="date"
                    required
                    value={receiveDate}
                    onChange={e => setReceiveDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bill Payment Type *</label>
                  <select
                    value={receivePaymentType}
                    onChange={e => setReceivePaymentType(e.target.value as PurchasePaymentType)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <option value="CREDIT">Credit (Add to Vendor Payable Due)</option>
                    <option value="PARTIAL">Partial Payment (Pay Part Now, Rest as Due)</option>
                    {activeFundMethods.map(m => {
                      const bal = getMethodLiveBalance(m);
                      return (
                        <option key={m.id} value={m.name}>
                          Full Payment via {m.name} (Available: ৳{bal.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {receivePaymentType === 'PARTIAL' && (
                <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Partial Payment Breakdown
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      Total Inward Amount: <strong className="text-slate-900 font-mono">৳{totalReceiveBillAmount.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Pay Now Amount (৳) *</label>
                      <input
                        type="number"
                        min="0"
                        max={totalReceiveBillAmount}
                        step="any"
                        value={receivePartialPaid || ''}
                        onChange={e => setReceivePartialPaid(Math.max(0, Math.min(totalReceiveBillAmount, parseFloat(e.target.value) || 0)))}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-900"
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Paid From Account *</label>
                      <select
                        value={receivePartialMethod}
                        onChange={e => setReceivePartialMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-900"
                      >
                        {activeFundMethods.map(m => {
                          const bal = getMethodLiveBalance(m);
                          return (
                            <option key={m.id} value={m.name}>
                              {m.name} (৳{bal.toLocaleString()})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 mb-1">Remaining Due (৳)</label>
                      <div className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-black text-rose-700 flex items-center justify-between">
                        <span>৳{Math.max(0, totalReceiveBillAmount - receivePartialPaid).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-rose-600">Supplier Payable Due</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Receiving Matrix */}
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide mb-2">
                  Item Receiving Quantities (Full or Partial Receive)
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Item Name</th>
                        <th className="py-2.5 px-2 font-bold text-center">UOM</th>
                        <th className="py-2.5 px-2 font-bold text-center">Ordered Qty</th>
                        <th className="py-2.5 px-2 font-bold text-center">Prev Received</th>
                        <th className="py-2.5 px-3 font-extrabold text-emerald-800 text-center">Receiving Now</th>
                        <th className="py-2.5 px-2 font-bold text-right">Rate (৳)</th>
                        <th className="py-2.5 px-3 font-bold text-right">Bill Total (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receiveItemsList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{row.item}</td>
                          <td className="py-2 px-2 text-center text-slate-600 font-bold">{row.uom}</td>
                          <td className="py-2 px-2 text-center text-slate-600 font-bold">{row.orderedQty}</td>
                          <td className="py-2 px-2 text-center text-slate-500 font-semibold">{row.alreadyReceivedQty}</td>
                          <td className="py-2 px-3 text-center w-32 bg-emerald-50/50">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.receiveQty}
                              onChange={e => handleReceiveQtyChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-white border border-emerald-400 rounded text-center text-xs font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.rate}
                              onChange={e => handleReceiveRateChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-1 bg-white border border-slate-300 rounded text-right text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-slate-900">
                            ৳ {row.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center gap-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="receiveUpdateMasterRates"
                    checked={receiveUpdateMasterRates}
                    onChange={e => setReceiveUpdateMasterRates(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
                  />
                  <label htmlFor="receiveUpdateMasterRates" className="text-xs font-bold text-indigo-950 cursor-pointer select-none flex items-center gap-1.5">
                    <span>Update Raw Materials Master Catalog standard rate with these purchase prices</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">(Recommended)</span>
                  </label>
                </div>

                <div className="mt-3 p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Generated Bill Amount & Stock Inward Value</span>
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Automatically updates inventory stock upon submit</span>
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    ৳ {totalReceiveBillAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Goods Received & Generate Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NEW SUPPLIER RETURN ================= */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-slate-900 text-base">New Supplier Return Entry</h3>
              </div>
              <button onClick={() => setIsReturnModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return No *</label>
                  <input
                    type="text"
                    required
                    value={returnNo}
                    onChange={e => setReturnNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vendor / Supplier *</label>
                  <select
                    value={returnVendor}
                    onChange={e => {
                      setReturnVendor(e.target.value);
                      setReturnBillNo('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  >
                    {data.vendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Original Bill / Invoice No</label>
                  <input
                    type="text"
                    list="return-bill-datalist"
                    value={returnBillNo}
                    onChange={e => {
                      const val = e.target.value;
                      setReturnBillNo(val);
                      const matchedBill = data.purchases.find(
                        p => p.vendor === returnVendor && p.billNo.toLowerCase() === val.toLowerCase().trim()
                      );
                      if (matchedBill && matchedBill.items && matchedBill.items.length > 0) {
                        const firstItem = matchedBill.items[0];
                        const masterMatch = data.masterItems.find(
                          m => (firstItem.itemId && String(m.id) === String(firstItem.itemId)) ||
                               (firstItem.item && m.name.trim().toLowerCase() === firstItem.item.trim().toLowerCase())
                        );
                        if (masterMatch) {
                          setReturnItemId(masterMatch.id);
                          setReturnRate(firstItem.rate || masterMatch.defaultRate);
                        } else {
                          setReturnItemId(firstItem.itemId || firstItem.item);
                          setReturnRate(firstItem.rate || 0);
                        }
                        setReturnQty(Math.min(returnQty || 1, firstItem.qty || 1));
                      }
                    }}
                    placeholder="Select or enter bill e.g. INV-6865"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <datalist id="return-bill-datalist">
                    {data.purchases.filter(p => p.vendor === returnVendor).map(b => (
                      <option key={b.id} value={b.billNo}>{b.billNo} — ৳{b.total.toLocaleString()} ({b.date})</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Returned Raw Material *</label>
                <SearchableRawSelect
                  value={String(returnItemId)}
                  options={returnSelectOptions}
                  onChange={newKey => handleReturnItemSelect(newKey)}
                  displayFormat="full"
                  buttonClassName="px-2.5 py-1.5"
                  placeholder="Search returned raw material..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={returnQty}
                    onChange={e => setReturnQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate per Unit (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={returnRate}
                    onChange={e => setReturnRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              {/* Total Return Amount preview */}
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-700 block">Total Return Value:</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    ({returnQty} {(() => {
                      const mItem = data.masterItems.find(m => String(m.id) === String(returnItemId) || m.name.toLowerCase() === String(returnItemId).toLowerCase());
                      if (mItem) return mItem.uom;
                      const matchedBill = data.purchases.find(p => p.vendor === returnVendor && p.billNo.toLowerCase() === returnBillNo.toLowerCase().trim());
                      const bItem = matchedBill?.items.find(i => String(i.itemId) === String(returnItemId) || i.item.toLowerCase() === String(returnItemId).toLowerCase());
                      return bItem?.uom || 'Unit';
                    })()} × ৳{returnRate})
                  </span>
                </div>
                <div className="text-lg font-black text-rose-700">
                  ৳ {Math.round((returnQty || 0) * (returnRate || 0)).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Return *</label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="e.g. Excess fat ratio, damaged packaging, quality issues..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Refund / Settlement Status</label>
                <select
                  value={refundStatus}
                  onChange={e => setRefundStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="ADJUSTED">ADJUSTED (Adjusted from vendor payable bill)</option>
                  <option value="REFUNDED">REFUNDED (Cash / Bank cash refund received)</option>
                  <option value="PENDING">PENDING (Awaiting supplier decision)</option>
                </select>
                {refundStatus === 'ADJUSTED' && (
                  <p className="text-[11px] text-blue-700 bg-blue-50/90 p-2 rounded-lg border border-blue-200 mt-1 font-medium">
                    ℹ️ <strong>Auto-Adjust:</strong> ৳{Math.round((returnQty || 0) * (returnRate || 0)).toLocaleString()} will be automatically deducted from <strong>{returnVendor}</strong>'s payable due and supplier ledger.
                  </p>
                )}
                {refundStatus === 'REFUNDED' && (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50/90 p-2 rounded-lg border border-emerald-200 mt-1 font-medium">
                    ℹ️ <strong>Cash Refund:</strong> Cash or bank refund was directly received from the vendor for this return.
                  </p>
                )}
                {refundStatus === 'PENDING' && (
                  <p className="text-[11px] text-amber-700 bg-amber-50/90 p-2 rounded-lg border border-amber-200 mt-1 font-medium">
                    ℹ️ <strong>Pending Claim:</strong> Claim logged; awaiting vendor approval or replacement goods.
                  </p>
                )}
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  Save Return Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW VENDOR ================= */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Add New Registered Supplier</span>
              </h3>
              <button onClick={() => setIsVendorModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVendor} className="py-3 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorName}
                  onChange={e => setNewVendorName(e.target.value)}
                  placeholder="e.g. Haji And Sons / Bengal Meat"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={newVendorPhone}
                  onChange={e => setNewVendorPhone(e.target.value)}
                  placeholder="e.g. 01756007600"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person (Optional)</label>
                <input
                  type="text"
                  value={newVendorContactPerson}
                  onChange={e => setNewVendorContactPerson(e.target.value)}
                  placeholder="e.g. Md. Rafiqul Islam"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Note (Optional)</label>
                <input
                  type="text"
                  value={newVendorAddress}
                  onChange={e => setNewVendorAddress(e.target.value)}
                  placeholder="e.g. Kawran Bazar, Dhaka"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT REGISTERED SUPPLIER ================= */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Supplier Details</span>
              </h3>
              <button onClick={() => setEditingVendor(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVendor} className="py-3 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.name}
                  onChange={e => setEditingVendor(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Note: Renaming will automatically update all matching purchase bills, orders, and returns.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={editingVendor.phone}
                  onChange={e => setEditingVendor(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  placeholder="e.g. 01756007600"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person (Optional)</label>
                <input
                  type="text"
                  value={editingVendor.contactPerson}
                  onChange={e => setEditingVendor(prev => prev ? { ...prev, contactPerson: e.target.value } : null)}
                  placeholder="e.g. Md. Rafiqul Islam"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Note (Optional)</label>
                <input
                  type="text"
                  value={editingVendor.address}
                  onChange={e => setEditingVendor(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="e.g. Kawran Bazar, Dhaka"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW PO MEMO ================= */}
      {viewingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Purchase Order Memo: {viewingPo.poNo}</h3>
                <span className="text-xs text-slate-500">Issued to: <strong>{viewingPo.vendor}</strong></span>
              </div>
              <button onClick={() => setViewingPo(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-3 text-xs">
              <div className="flex justify-between text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span>Date: <strong className="text-slate-900">{viewingPo.date}</strong></span>
                <span>Expected Date: <strong className="text-slate-900">{viewingPo.expectedDate || 'N/A'}</strong></span>
                <span>Status: <strong className="text-amber-700">{viewingPo.status}</strong></span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Ordered Line Items:</h4>
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Ordered Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingPo.items.map((i, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold text-slate-900">{i.item}</td>
                        <td className="p-2 text-center font-bold">{i.qty} {i.uom}</td>
                        <td className="p-2 text-right">৳{i.rate}</td>
                        <td className="p-2 text-right font-extrabold">৳{i.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingPo.receivedHistory && viewingPo.receivedHistory.length > 0 && (
                <div>
                  <h4 className="font-bold text-emerald-800 mb-1">Receiving History (GRNs & Bills):</h4>
                  <div className="space-y-1.5">
                    {viewingPo.receivedHistory.map((h, idx) => (
                      <div key={idx} className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-extrabold text-emerald-900">GRN / Bill: {h.billNo}</span>
                          <span className="text-slate-500 ml-2">({h.date})</span>
                        </div>
                        <span className="font-extrabold text-emerald-700">৳ {h.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between font-black text-sm text-slate-900 border-t border-slate-100">
                <span>Grand Total PO Value:</span>
                <span className="text-amber-600">৳ {viewingPo.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setViewingPo(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Memo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW PURCHASE VOUCHER MEMO ================= */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Purchase Voucher Memo: {viewingVoucher.billNo}</h3>
              <button onClick={() => setViewingVoucher(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Date: <strong className="text-slate-900">{viewingVoucher.date}</strong></span>
                <span>Vendor: <strong className="text-slate-900">{viewingVoucher.vendor}</strong></span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment: <strong className="text-slate-900">{viewingVoucher.paymentType}</strong></span>
                <span>Status: <strong className="text-emerald-700">{viewingVoucher.status}</strong></span>
              </div>

              <div className="pt-2">
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingVoucher.items.map((i, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold">{i.item}</td>
                        <td className="p-2 text-center">{i.qty} {i.uom}</td>
                        <td className="p-2 text-right">৳{i.rate}</td>
                        <td className="p-2 text-right font-extrabold">৳{i.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const memoPayments = (data.payments || []).filter(pay => 
                  pay.billNo && viewingVoucher.billNo && (
                    pay.billNo.trim().toLowerCase() === viewingVoucher.billNo.trim().toLowerCase() ||
                    pay.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === viewingVoucher.billNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                  )
                );
                const memoPaid = Math.max(
                  viewingVoucher.paid !== undefined ? viewingVoucher.paid : 0,
                  memoPayments.reduce((s, p) => s + (p.amount || 0), 0),
                  viewingVoucher.paymentType === 'CASH' ? viewingVoucher.total : 0
                );
                const memoDue = Math.max(0, viewingVoucher.total - memoPaid);
                return (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between font-black text-sm text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-blue-700 font-mono">৳ {viewingVoucher.total.toLocaleString()}</span>
                    </div>
                    {viewingVoucher.paymentType === 'CREDIT' && (
                      <div className="flex justify-between text-xs font-bold pt-0.5">
                        <span className="text-emerald-700">Total Settled / Paid:</span>
                        <span className="text-emerald-700 font-mono">৳ {memoPaid.toLocaleString()}</span>
                      </div>
                    )}
                    {viewingVoucher.paymentType === 'CREDIT' && memoDue > 0 && (
                      <div className="flex justify-between text-xs font-black pt-0.5">
                        <span className="text-rose-700">Remaining Balance Due:</span>
                        <span className="text-rose-700 font-mono">৳ {memoDue.toLocaleString()}</span>
                      </div>
                    )}
                    {viewingVoucher.paymentType === 'CREDIT' && memoDue === 0 && (
                      <div className="text-right text-xs font-extrabold text-emerald-700 pt-0.5">
                        ✓ Bill Fully Settled
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-3">
              <button
                onClick={() => setViewingVoucher(null)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW SUPPLIER RETURN DEBIT NOTE ================= */}
      {viewingReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl shadow-2xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    Supplier Return Memo / Debit Note
                  </h3>
                  <span className="font-mono font-bold text-xs text-rose-600">
                    {viewingReturn.returnNo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                  title="Print Debit Note"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingReturn(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3.5 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Return Date</span>
                  <strong className="text-slate-900 font-extrabold">{viewingReturn.date}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Vendor / Supplier</span>
                  <strong className="text-slate-900 font-black">{viewingReturn.vendor}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Original Bill / Invoice</span>
                  <strong className="text-slate-900 font-mono font-bold">{viewingReturn.billNo || 'Direct / None'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Settlement Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${
                    viewingReturn.refundStatus === 'REFUNDED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    viewingReturn.refundStatus === 'ADJUSTED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {viewingReturn.refundStatus}
                  </span>
                </div>
              </div>

              {/* Returned Material Detail Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Returned Item</th>
                      <th className="py-2.5 px-2 font-bold text-center">Quantity</th>
                      <th className="py-2.5 px-2 font-bold text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        {viewingReturn.item}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-700">
                        {viewingReturn.qty} {viewingReturn.uom}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 font-semibold">
                        ৳ {viewingReturn.rate.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-600 text-sm">
                        ৳ {viewingReturn.total.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Return Reason */}
              <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200">
                <span className="text-[10px] text-rose-800 font-extrabold uppercase tracking-wider block mb-1">
                  Reason for Return
                </span>
                <p className="text-slate-800 font-medium text-xs leading-relaxed">
                  {viewingReturn.reason || 'Returned to supplier'}
                </p>
              </div>

              {/* Status Explanation */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                {viewingReturn.refundStatus === 'ADJUSTED' && (
                  <p>
                    ℹ️ <strong>Auto-Adjusted:</strong> ৳{viewingReturn.total.toLocaleString()} has been automatically adjusted against <strong>{viewingReturn.vendor}</strong>'s bill and deducted from the payable ledger.
                  </p>
                )}
                {viewingReturn.refundStatus === 'REFUNDED' && (
                  <p>
                    ℹ️ <strong>Cash/Bank Refund:</strong> A direct refund of ৳{viewingReturn.total.toLocaleString()} was received from <strong>{viewingReturn.vendor}</strong>.
                  </p>
                )}
                {viewingReturn.refundStatus === 'PENDING' && (
                  <p>
                    ℹ️ <strong>Pending Claim:</strong> Awaiting supplier credit note confirmation or replacement goods.
                  </p>
                )}
              </div>

              {/* Grand Total */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-slate-300">Total Return Credit Amount:</span>
                <span className="text-lg font-black text-rose-400">
                  ৳ {viewingReturn.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setViewingReturn(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs transition"
              >
                Close Memo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
