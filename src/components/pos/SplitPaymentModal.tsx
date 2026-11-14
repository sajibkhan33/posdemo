import React, { useState, useEffect } from 'react';
import { useRestaurant, DEFAULT_PAYMENT_METHODS } from '../../context/RestaurantContext';
import { PaymentMethodConfig } from '../../types';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  UserX, 
  UserCheck,
  Coins, 
  Zap,
  Building,
  QrCode,
  Users
} from 'lucide-react';

export const SplitPaymentModal: React.FC = () => {
  const { 
    activeSettlingTable, 
    closeSettleModal, 
    settlePayment, 
    data, 
    setTableCustomer, 
    setTableWaiter,
    getCustomerAvailableAdvance 
  } = useRestaurant();

  const paymentMethods: PaymentMethodConfig[] = (
    data.paymentMethods && data.paymentMethods.length > 0 
      ? data.paymentMethods 
      : DEFAULT_PAYMENT_METHODS
  ).filter(m => m.isActive !== false);

  const [splitAmounts, setSplitAmounts] = useState<Record<string, number>>({});
  const [advanceInputAmt, setAdvanceInputAmt] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cashNoteMode, setCashNoteMode] = useState<'set' | 'add'>('set');
  const [isCustomCustomerInput, setIsCustomCustomerInput] = useState<boolean>(false);
  const [selectedWaiter, setSelectedWaiter] = useState<string>(
    activeSettlingTable?.waiter && activeSettlingTable.waiter !== 'Staff' && activeSettlingTable.waiter !== 'N/A'
      ? activeSettlingTable.waiter
      : ''
  );
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    activeSettlingTable?.customer && activeSettlingTable.customer !== 'Walk-in Customer'
      ? activeSettlingTable.customer
      : ''
  );

  if (!activeSettlingTable) return null;

  const getMethodAmt = (mId: string): number => splitAmounts[mId] || 0;
  const setMethodAmt = (mId: string, val: number) => {
    setSplitAmounts(prev => ({ ...prev, [mId]: val }));
  };

  const subtotal = activeSettlingTable.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discDeduction = activeSettlingTable.discountType === 'percent' 
    ? (subtotal * activeSettlingTable.discountVal) / 100 
    : activeSettlingTable.discountVal;
  const baseAfterDiscount = Math.max(0, subtotal - discDeduction);

  const profile = data.restaurantProfile;
  const vatPct = Number(profile?.vatPercent ?? 5);
  const isVatEnabled = Boolean(profile?.enableVat ?? (vatPct > 0));
  const vatMode = profile?.vatMode || 'inclusive';

  let modalVatVal = 0;
  let netTotal = Math.round(baseAfterDiscount);

  if (isVatEnabled && vatPct > 0) {
    if (vatMode === 'exclusive') {
      modalVatVal = Math.round(((baseAfterDiscount * vatPct) / 100) * 100) / 100;
      netTotal = Math.round(baseAfterDiscount + modalVatVal);
    } else {
      modalVatVal = Math.round(((baseAfterDiscount * vatPct) / (100 + vatPct)) * 100) / 100;
      netTotal = Math.round(baseAfterDiscount);
    }
  }

  const effectiveCustomer = (selectedCustomer.trim() || activeSettlingTable.customer || '').trim();
  const isWalkIn = !effectiveCustomer || effectiveCustomer.toLowerCase().includes('walk-in');
  const availableAdvance = !isWalkIn && getCustomerAvailableAdvance ? getCustomerAvailableAdvance(effectiveCustomer) : 0;

  // Auto-suggest available advance if customer has advance and no payment entered yet
  useEffect(() => {
    if (availableAdvance > 0 && advanceInputAmt === 0) {
      const hasAnySplit = Object.values(splitAmounts).some(v => Number(v) > 0);
      if (!hasAnySplit) {
        setAdvanceInputAmt(Math.min(netTotal, availableAdvance));
      }
    }
  }, [availableAdvance, netTotal]);

  const totalEntered = paymentMethods.reduce((sum, m) => sum + (Number(splitAmounts[m.id]) || 0), 0) + advanceInputAmt;
  const remaining = Math.max(0, netTotal - totalEntered);
  const changeReturn = Math.max(0, totalEntered - netTotal);

  const handleFillAll = (mId: string) => {
    setAdvanceInputAmt(0);
    const next: Record<string, number> = {};
    paymentMethods.forEach(m => {
      next[m.id] = m.id === mId ? netTotal : 0;
    });
    setSplitAmounts(next);
  };

  const handleApplyAdvance = (customAmt?: number) => {
    const amtToUse = customAmt !== undefined ? customAmt : Math.min(netTotal, availableAdvance);
    setAdvanceInputAmt(amtToUse);
    if (amtToUse >= netTotal) {
      setSplitAmounts({});
    } else {
      const rem = netTotal - amtToUse;
      const cashMethod = paymentMethods.find(m => m.type === 'CASH');
      if (cashMethod) {
        setSplitAmounts({ [cashMethod.id]: rem });
      }
    }
  };

  const creditMethod = paymentMethods.find(m => m.type === 'CREDIT');
  const creditEntered = creditMethod ? (splitAmounts[creditMethod.id] || 0) : 0;

  const cashMethod = paymentMethods.find(m => m.type === 'CASH') || paymentMethods[0];

  const handleCashDenomination = (amt: number) => {
    if (!cashMethod) return;
    setSplitAmounts(prev => {
      const current = Number(prev[cashMethod.id]) || 0;
      const nextVal = cashNoteMode === 'add' ? current + amt : amt;
      return {
        ...prev,
        [cashMethod.id]: nextVal
      };
    });
  };

  const handleResetCash = () => {
    if (!cashMethod) return;
    setSplitAmounts(prev => ({
      ...prev,
      [cashMethod.id]: 0
    }));
  };

  const handleExactCash = () => {
    if (!cashMethod) return;
    const otherSum = paymentMethods.filter(m => m.id !== cashMethod.id).reduce((s, m) => s + (Number(splitAmounts[m.id]) || 0), 0) + advanceInputAmt;
    const exactNeed = Math.max(0, netTotal - otherSum);
    setSplitAmounts(prev => ({
      ...prev,
      [cashMethod.id]: exactNeed
    }));
  };

  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (totalEntered < netTotal) {
      alert(`Payment incomplete! Remaining ৳${remaining.toLocaleString()} is due.`);
      return;
    }

    const finalWaiter = selectedWaiter.trim() || activeSettlingTable.waiter || '';
    const finalCustomer = (selectedCustomer.trim() || activeSettlingTable.customer || '').trim();

    if (advanceInputAmt > 0) {
      if (!finalCustomer || finalCustomer.toLowerCase().includes('walk-in')) {
        alert('Please select a customer with registered advance deposit to adjust advance!');
        return;
      }
    }

    if (creditEntered > 0) {
      if (!finalCustomer || finalCustomer.toLowerCase().includes('walk-in')) {
        alert('Please select or specify a registered customer name for due/credit sales!');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      settlePayment(
        activeSettlingTable.id, 
        {
          byMethod: splitAmounts,
          advance: advanceInputAmt
        }, 
        finalWaiter,
        finalCustomer || undefined
      );
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const getMethodIcon = (m: PaymentMethodConfig) => {
    const nameLower = (m.name + ' ' + (m.providerName || '')).toLowerCase();
    if (m.type === 'CASH') return <Banknote className="w-4 h-4 text-emerald-600" />;
    if (m.type === 'BANGLA_QR') return <QrCode className="w-4 h-4 text-purple-600" />;
    if (m.type === 'MFS') {
      if (nameLower.includes('nagad')) return <Smartphone className="w-4 h-4 text-orange-600" />;
      return <Smartphone className="w-4 h-4 text-pink-600" />;
    }
    if (m.type === 'CARD') return <CreditCard className="w-4 h-4 text-blue-600" />;
    if (m.type === 'BANK') return <Building className="w-4 h-4 text-indigo-600" />;
    if (m.type === 'CREDIT') return <UserX className="w-4 h-4 text-amber-600" />;
    return <Zap className="w-4 h-4 text-cyan-600" />;
  };

  const getMethodButtonColor = (m: PaymentMethodConfig) => {
    const nameLower = (m.name + ' ' + (m.providerName || '')).toLowerCase();
    if (m.type === 'CASH') return 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800';
    if (m.type === 'BANGLA_QR') return 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-900';
    if (m.type === 'MFS') {
      if (nameLower.includes('nagad')) return 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-800';
      return 'bg-pink-50 hover:bg-pink-100 border-pink-300 text-pink-800';
    }
    if (m.type === 'CARD') return 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800';
    if (m.type === 'BANK') return 'bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-800';
    if (m.type === 'CREDIT') return 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800';
    return 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800';
  };

  const currentWaiterDisplay = selectedWaiter || activeSettlingTable.waiter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-[#004b9b] text-white font-extrabold text-sm">
                {activeSettlingTable.name}
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">Bill Settlement & Split Payment</h3>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-xs border border-amber-300 font-mono tracking-wider">
                Ref: {activeSettlingTable.orderRef || (activeSettlingTable.orderCreatedAt ? ('ORD-' + String(activeSettlingTable.orderCreatedAt).slice(-5)) : 'ORD-NEW')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Order Taker: <strong className="text-slate-800 font-bold">{activeSettlingTable.orderCreatedBy || 'Staff'} {activeSettlingTable.orderCreatedRole ? `(${activeSettlingTable.orderCreatedRole})` : ''}</strong></span>
              <span>• Waiter: <strong className="text-[#004b9b] font-bold">{currentWaiterDisplay && currentWaiterDisplay !== 'Staff' && currentWaiterDisplay !== 'N/A' ? currentWaiterDisplay : 'Not Assigned'}</strong></span>
              <span>• Customer: <strong className="text-slate-800 font-semibold">{effectiveCustomer || 'Walk-in Customer'}</strong></span>
            </p>
          </div>
          <button
            id="close-split-payment-modal"
            onClick={closeSettleModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assigned Waiter & Customer Quick Link Bar */}
        <div className="mt-3 p-2 px-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-[#004b9b]" />
              <span>Waiter:</span>
            </div>
            <select
              id="settle-select-waiter"
              value={selectedWaiter}
              onChange={e => {
                const w = e.target.value;
                setSelectedWaiter(w);
                if (w) setTableWaiter(activeSettlingTable.id, w);
              }}
              className="flex-1 max-w-[160px] px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004b9b] cursor-pointer truncate"
            >
              <option value="">-- Choose Waiter --</option>
              {(data.waiters || []).map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Customer:</span>
            </div>
            {isCustomCustomerInput ? (
              <div className="flex items-center gap-1 flex-1 max-w-[190px]">
                <input
                  type="text"
                  value={selectedCustomer}
                  onChange={e => {
                    const c = e.target.value;
                    setSelectedCustomer(c);
                  }}
                  placeholder="Type customer name..."
                  className="w-full px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCustomerInput(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline shrink-0 cursor-pointer"
                  title="Back to customer list"
                >
                  List
                </button>
              </div>
            ) : (
              <select
                id="settle-select-customer"
                value={selectedCustomer}
                onChange={e => {
                  if (e.target.value === '__TYPE_NEW__') {
                    setIsCustomCustomerInput(true);
                    setSelectedCustomer('');
                    setAdvanceInputAmt(0);
                    return;
                  }
                  const c = e.target.value;
                  setSelectedCustomer(c);
                  if (c) setTableCustomer(activeSettlingTable.id, c);
                  const cAdv = c && getCustomerAvailableAdvance ? getCustomerAvailableAdvance(c) : 0;
                  if (cAdv > 0) {
                    setAdvanceInputAmt(Math.min(netTotal, cAdv));
                    setSplitAmounts({});
                  } else {
                    setAdvanceInputAmt(0);
                  }
                }}
                className="flex-1 max-w-[190px] px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 cursor-pointer truncate"
              >
                <option value="">Walk-in Customer</option>
                {(data.customers || []).map(c => {
                  const cAdv = getCustomerAvailableAdvance(c);
                  return (
                    <option key={c} value={c}>
                      {c} {cAdv > 0 ? `(💰 Adv: ৳${cAdv.toLocaleString()})` : ''}
                    </option>
                  );
                })}
                <option value="__TYPE_NEW__">+ Type New Customer...</option>
              </select>
            )}
          </div>
        </div>

        {/* Customer Advance Available Notification Card */}
        {availableAdvance > 0 && (
          <div className="mt-2.5 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-emerald-950">Customer Advance Available</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-extrabold text-[10px]">
                    Account 2030 (Liability)
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 font-medium truncate">
                  {effectiveCustomer} has <strong className="text-emerald-950 font-black">৳ {availableAdvance.toLocaleString()}</strong> advance deposit balance
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-apply-advance-header"
              onClick={() => handleApplyAdvance(Math.min(netTotal, availableAdvance))}
              className="shrink-0 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer"
              title="Auto-fill advance deduction"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Adjust ৳{Math.min(netTotal, availableAdvance).toLocaleString()}</span>
            </button>
          </div>
        )}

        {/* Bill Summary Banner */}
        <div className="my-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-inner">
          <div>
            <div className="text-xs text-slate-400 font-medium">Net Payable Bill</div>
            <div className="text-2xl font-extrabold text-blue-400 tracking-tight">
              ৳ {netTotal.toLocaleString()}
            </div>
            {discDeduction > 0 && (
              <div className="text-[11px] text-emerald-400">
                Discount: ৳{discDeduction.toLocaleString()} (Subtotal: ৳{subtotal.toLocaleString()})
              </div>
            )}
            {isVatEnabled && vatPct > 0 && (
              <div className="text-[11px] text-blue-200">
                VAT ({vatPct}% {vatMode === 'inclusive' ? 'Included' : 'Extra'}): ৳{modalVatVal.toFixed(2)}
              </div>
            )}
            {advanceInputAmt > 0 && (
              <div className="text-[11px] text-emerald-300 font-bold">
                Advance Deducted: ৳{advanceInputAmt.toLocaleString()}
              </div>
            )}
          </div>

          <div className="text-right">
            {remaining > 0 ? (
              <div>
                <div className="text-xs text-rose-300 font-bold">Remaining Due</div>
                <div className="text-xl font-extrabold text-rose-400">৳ {remaining.toLocaleString()}</div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-emerald-300 font-bold">Change Return</div>
                <div className="text-xl font-extrabold text-emerald-400">৳ {changeReturn.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Fast Presets */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#004b9b]" />
            <span>1-Click Full Payment Shortcut</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {availableAdvance > 0 && (
              <button
                type="button"
                id="preset-all-advance"
                onClick={() => handleApplyAdvance(Math.min(netTotal, availableAdvance))}
                title={`Adjust Advance (Max ৳${availableAdvance.toLocaleString()})`}
                className="py-2 px-1 text-center border rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer bg-emerald-100 hover:bg-emerald-200 border-emerald-400 text-emerald-950 shadow-xs"
              >
                <Coins className="w-4 h-4 text-emerald-700" />
                <span className="truncate max-w-full">
                  {availableAdvance >= netTotal ? 'Full Advance' : `Adv ৳${availableAdvance.toLocaleString()}`}
                </span>
              </button>
            )}
            {paymentMethods.map(m => {
              const colorCls = getMethodButtonColor(m);
              const icon = getMethodIcon(m);
              const isDue = m.type === 'CREDIT' || m.name.toLowerCase().includes('due');
              const label = isDue ? 'Full Due' : `Full ${m.name}`;
              return (
                <button
                  key={m.id}
                  type="button"
                  id={`preset-all-${m.id}`}
                  onClick={() => handleFillAll(m.id)}
                  title={`Full ${m.name}`}
                  className={`py-2 px-1 text-center border rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${colorCls}`}
                >
                  {icon}
                  <span className="truncate max-w-full">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Cash Tender Notes (দ্রুত নগদ নোট শর্টকাট) */}
        {cashMethod && (
          <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-emerald-50/70 border border-emerald-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-extrabold text-slate-800">Quick Cash Tender (নোট শর্টকাট)</span>
                <span className="text-[10px] text-emerald-850 bg-emerald-100 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200">
                  {cashNoteMode === 'set' ? 'নোট সিলেক্ট' : '+ যোগ মোড'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="bg-slate-200 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCashNoteMode('set')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      cashNoteMode === 'set'
                        ? 'bg-white text-emerald-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="ক্লিক করলে সরাসরি এই নোটের টাকা বসবে"
                  >
                    Set Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashNoteMode('add')}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      cashNoteMode === 'add'
                        ? 'bg-white text-emerald-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="ক্লিক করলে আগের টাকার সাথে এই নোট যোগ হবে"
                  >
                    + Add
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleExactCash}
                  className="px-2 py-1 text-[10px] font-black bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-md border border-emerald-300 transition cursor-pointer shadow-2xs"
                  title="বিল সমপরিমাণ ক্যাশ বসান"
                >
                  Exact (৳{netTotal.toLocaleString()})
                </button>
                {(Number(splitAmounts[cashMethod.id]) || 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleResetCash}
                    className="px-2 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md border border-rose-200 transition cursor-pointer"
                    title="ক্যাশ ক্লিয়ার করুন"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {[10, 20, 50, 100, 150, 200, 500, 1000].map(amt => {
                const isSelected = (Number(splitAmounts[cashMethod.id]) || 0) === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    id={`quick-tender-${amt}`}
                    onClick={() => handleCashDenomination(amt)}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center border shadow-2xs ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 scale-[1.03]'
                        : 'bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border-slate-300 hover:border-emerald-400 active:scale-95'
                    }`}
                  >
                    <span className="font-mono">{cashNoteMode === 'add' ? `+৳${amt}` : `৳${amt}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Split Payment Form */}
        <form onSubmit={handleSettle} className="space-y-3">
          {/* Customer Advance Adjustment Field */}
          {availableAdvance > 0 && (
            <div className="p-3 bg-emerald-50/80 border-2 border-emerald-300 rounded-xl mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-700" />
                  <span>Adjust from Customer Advance (Account 2030)</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    Max: ৳{availableAdvance.toLocaleString()}
                  </span>
                </label>
                {advanceInputAmt > 0 && (
                  <span className="text-[11px] font-bold text-emerald-800">
                    Remaining Deposit: <strong className="font-mono">৳{Math.max(0, availableAdvance - advanceInputAmt).toLocaleString()}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700">৳</span>
                  <input
                    type="number"
                    id="input-pay-advance"
                    min="0"
                    max={availableAdvance}
                    step="1"
                    value={advanceInputAmt === 0 ? '' : advanceInputAmt}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      const clamped = Math.min(availableAdvance, Math.max(0, val));
                      setAdvanceInputAmt(clamped);
                    }}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-base font-black text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyAdvance(Math.min(netTotal, availableAdvance))}
                  className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-300 transition cursor-pointer"
                >
                  Max (৳{Math.min(netTotal, availableAdvance).toLocaleString()})
                </button>
                {advanceInputAmt > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdvanceInputAmt(0)}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border border-slate-300 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-emerald-700 mt-1.5 font-medium">
                <span>✓ Reduces liability (Code 2030) and registers food sales revenue</span>
                <span>Physical Drawer Cash: Unaltered</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {paymentMethods.map(m => {
              const val = getMethodAmt(m.id);
              const isCredit = m.type === 'CREDIT';
              return (
                <div key={m.id} className={isCredit ? 'col-span-2 sm:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    {getMethodIcon(m)}
                    <span className="truncate">{m.name} {isCredit && (selectedCustomer ? `(${selectedCustomer})` : `(${activeSettlingTable.customer})`)}</span>
                  </label>
                  <input
                    type="number"
                    id={`input-pay-${m.id}`}
                    min="0"
                    step="1"
                    value={val === 0 ? '' : val}
                    onChange={e => setMethodAmt(m.id, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-lg text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:outline-none ${
                      isCredit
                        ? 'bg-amber-50/60 border-amber-300 focus:ring-amber-500'
                        : 'bg-slate-50 border-slate-300 focus:ring-[#004b9b]'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Customer Selection for Credit/Due Sales */}
          {creditEntered > 0 && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 animate-in fade-in">
              <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-amber-700" />
                <span>Assign Customer for Due / Accounts Receivable *</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Select Registered Customer</label>
                  <select
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {(data.customers || []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Or Type Customer Name</label>
                  <input
                    type="text"
                    value={selectedCustomer}
                    onChange={e => setSelectedCustomer(e.target.value)}
                    placeholder="Enter customer / company name..."
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={closeSettleModal}
              className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-settle-payment"
              disabled={totalEntered < netTotal || isSubmitting}
              className={`flex-1 py-3 rounded-xl font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                totalEntered >= netTotal && !isSubmitting
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  <span>Processing Settlement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Payment & Settle Bill</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
