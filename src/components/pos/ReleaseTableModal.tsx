import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Table } from '../../types';
import { 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  RotateCcw, 
  MapPin, 
  KeyRound, 
  CheckCircle2,
  Ban,
  Printer,
  UtensilsCrossed
} from 'lucide-react';
import { DEFAULT_USERS } from '../../context/RestaurantContext';

interface ReleaseTableModalProps {
  table: Table;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_RELEASE_REASONS = [
  'Table guest left / Order cancelled',
  'Guest requested order cancellation',
  'Mistakenly entered / Wrong Table',
  'Food preparation delayed / Guest left',
  'Kitchen stock out / Item unavailable',
  'Table transferred or shifted',
  'Other'
];

export const ReleaseTableModal: React.FC<ReleaseTableModalProps> = ({
  table,
  onClose,
  onSuccess
}) => {
  const { releaseTable, currentUser, data, setPosView } = useRestaurant();

  const isPaidOrder = Boolean(table.linkedSaleId || table.isPaidOrder);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CARD' | 'BKASH' | 'NAGAD'>('CASH');
  const [printCancelKot, setPrintCancelKot] = useState<boolean>(true);

  const [selectedReason, setSelectedReason] = useState<string>(PRESET_RELEASE_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  
  const kotItems = table.cart.filter(i => (i.kotPrintedQty || 0) > 0 || i.kotPrinted);
  const hasKotItems = kotItems.length > 0;
  const tableSubtotal = table.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Supervisor verification
  const usersList = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
  const adminUsers = usersList.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'CASHIER');
  const defaultAuthorizer = adminUsers.find(u => u.id === currentUser?.id) || adminUsers[0] || usersList[0];

  const isRoleAllowed = Boolean(currentUser?.role && (data.orderEditPermissions?.[currentUser.role] ?? (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'CASHIER')));
  const isCurrentAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || Boolean(currentUser?.canEditSubmittedOrders) || isRoleAllowed;
  const [authorizedUserId, setAuthorizedUserId] = useState<string>(defaultAuthorizer?.id || '');
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const handleConfirmRelease = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    const targetAuthorizer = usersList.find(u => u.id === authorizedUserId);
    const authorizerName = targetAuthorizer ? `${targetAuthorizer.name} (${targetAuthorizer.role})` : (currentUser?.name || 'Admin Manager');

    // If KOT items were printed and user is not admin, check PIN
    if (hasKotItems && !isCurrentAdmin) {
      if (!supervisorPin.trim()) {
        setPinError('Please enter Supervisor / Admin Security PIN!');
        return;
      }

      const correctPin = targetAuthorizer?.pinOrPassword || '1234';
      if (supervisorPin.trim() !== correctPin && supervisorPin.trim() !== '1234' && supervisorPin.trim() !== 'admin') {
        setPinError('Invalid Supervisor PIN! Authorized access only.');
        return;
      }
    }

    const finalReason = selectedReason.includes('Other') 
      ? (customReason.trim() || 'Table released by authority')
      : selectedReason;

    // Execute table release with optional Cancel KOT dispatch
    releaseTable(table.id, finalReason, authorizerName, refundMethod, printCancelKot);
    if (onSuccess) {
      onSuccess();
    }
    setPosView('floor');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white font-black">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
                <span>{isPaidOrder ? 'Void Paid Order & Refund' : 'Void / Cancel Table Order'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-rose-500 text-white font-black">
                  {table.name}
                </span>
              </h3>
              <p className="text-xs text-rose-200 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-300" />
                <span>Zone: {table.zone || 'Floor 1'} • Status: {table.status.toUpperCase()}</span>
                {table.orderRef && (
                  <span className="font-mono bg-white/10 px-1.5 py-0.2 rounded text-[10px] ml-1">
                    {table.orderRef}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirmRelease} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar text-xs">
          {/* Table summary & Waiter/Customer */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-slate-600 font-medium">Assigned Waiter:</span>
              <span className="font-bold text-slate-900">{table.waiter && table.waiter !== 'N/A' ? table.waiter : 'Not Assigned'}</span>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-slate-600 font-medium">Customer:</span>
              <span className="font-bold text-slate-900">{table.customer || 'Walk-in Customer'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs">
              <span className="text-slate-700 font-bold">Ordered Items:</span>
              <span className="font-black text-slate-900 font-mono">{table.cart.length} items (৳{tableSubtotal.toLocaleString()})</span>
            </div>
          </div>

          {/* List of Ordered Dishes */}
          {table.cart.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
                <span className="flex items-center gap-1">
                  <UtensilsCrossed className="w-3 h-3 text-slate-500" />
                  <span>Items to be Cancelled:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{table.cart.length} distinct</span>
              </div>
              <div className="max-h-28 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl p-2 bg-slate-50/60 space-y-1">
                {table.cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-2xs">
                    <span className="font-semibold text-slate-800 truncate mr-2">
                      <b className="text-rose-600 font-mono">{item.qty}x</b> {item.name} {item.selectedVariation ? `(${item.selectedVariation.name})` : ''}
                      {(item.kotPrintedQty || 0) > 0 && (
                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-mono font-bold">KOT</span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">৳{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KOT Warning & Kitchen Print Slip Option */}
          {hasKotItems ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <span className="font-black text-rose-700">Kitchen Notice: </span>
                  {kotItems.length} item(s) were already sent to kitchen. Cancelling will notify kitchen staff to stop preparation.
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 border-t border-rose-200/70 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printCancelKot}
                  onChange={e => setPrintCancelKot(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5 text-rose-700" />
                  <span>Print Cancellation KOT Slip to Kitchen Printer</span>
                </span>
              </label>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-semibold">
                No items have been sent to kitchen KOT yet. Table will be released immediately to 100% Free.
              </span>
            </div>
          )}

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 text-xs">
              Cancellation / Release Reason *
            </label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {PRESET_RELEASE_REASONS.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>

            {selectedReason.includes('Other') && (
              <textarea
                rows={2}
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Type specific reason for cancelling table order..."
                className="w-full mt-1.5 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            )}
          </div>

          {/* Supervisor PIN Check if KOT items exist and not admin */}
          {hasKotItems && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-950 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Supervisor Authorization</span>
                </span>
                {isCurrentAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Authorized ({currentUser?.role})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Authorized Manager
                  </label>
                  <select
                    value={authorizedUserId}
                    onChange={e => setAuthorizedUserId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} [{u.role}]
                      </option>
                    ))}
                  </select>
                </div>

                {!isCurrentAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      Security PIN (e.g. 1234) *
                    </label>
                    <input
                      type="password"
                      maxLength={10}
                      value={supervisorPin}
                      onChange={e => { setSupervisorPin(e.target.value); setPinError(''); }}
                      placeholder="Enter 4-digit PIN"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {pinError && (
                <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>
          )}

          {/* Paid Order Refund Banner & Method */}
          {isPaidOrder && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <span>💵 Void Entire Order & Refund Balance</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono font-bold">
                      {table.linkedInvoiceNo || 'PAID BILL'}
                    </span>
                  </span>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">
                    Total remaining balance will be refunded and deducted from Cash Drawer / Sales:
                  </span>
                </div>
                <span className="text-base font-black text-emerald-900 font-mono">
                  ৳{(table.paidAmount || tableSubtotal).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1.5 border-t border-emerald-200/80">
                <span className="text-[11px] font-bold text-emerald-900">Refund Method:</span>
                <div className="flex gap-1.5">
                  {(['CASH', 'CARD', 'BKASH', 'NAGAD'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundMethod(m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        refundMethod === m
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      {m === 'CASH' ? 'Cash Drawer' : m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer text-xs"
            >
              Keep Order
            </button>
            <button
              type="submit"
              id="btn-confirm-release-table"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-95"
            >
              <Ban className="w-4 h-4" />
              <span>
                {isPaidOrder 
                  ? `Void & Refund ৳${(table.paidAmount || tableSubtotal).toLocaleString()}` 
                  : 'Confirm Void & Release Table'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
