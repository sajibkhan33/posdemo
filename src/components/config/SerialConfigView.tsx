import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { SerialNumberConfig, SerialResetCycle } from '../../types';
import { 
  Hash, 
  Receipt, 
  ChefHat, 
  RotateCcw, 
  Save, 
  Check, 
  Sparkles, 
  Info, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const SerialConfigView: React.FC = () => {
  const { data, updateSerialConfig, currentUser } = useRestaurant();

  const currentConfig: SerialNumberConfig = data.serialConfig || {
    posInvoicePrefix: 'POS-',
    posInvoiceNextNumber: 1,
    posInvoicePadding: 4,
    posInvoiceIncludeDate: false,
    posInvoiceResetCycle: 'NEVER',

    kotPrefix: 'KOT-',
    kotNextNumber: 1,
    kotPadding: 4,
    kotIncludeDate: false,
    kotResetCycle: 'NEVER',

    orderRefPrefix: 'ORD-',
    orderRefNextNumber: 1,
    orderRefPadding: 4,
    orderRefResetCycle: 'NEVER'
  };

  // Form local state
  const [formData, setFormData] = useState<SerialNumberConfig>(currentConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (data.serialConfig) {
      setFormData(data.serialConfig);
    }
  }, [data.serialConfig]);

  const todayStr = (data.businessDay?.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');

  // Formatter preview helpers
  const formatSample = (prefix: string, num: number, padding: number, includeDate: boolean) => {
    const padded = String(Math.max(1, num || 1)).padStart(padding || 4, '0');
    if (includeDate) {
      return `${prefix || ''}${todayStr}-${padded}`;
    }
    return `${prefix || ''}${padded}`;
  };

  const sampleInvoice = formatSample(
    formData.posInvoicePrefix,
    formData.posInvoiceNextNumber,
    formData.posInvoicePadding,
    formData.posInvoiceIncludeDate
  );

  const sampleKot = formatSample(
    formData.kotPrefix || 'KOT-',
    formData.kotNextNumber,
    formData.kotPadding,
    formData.kotIncludeDate
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSerialConfig(formData);
    try {
      fetch('/api/restaurant/pos-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialConfig: formData })
      }).catch(() => {});
    } catch {}
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to restore default numbering configurations (POS-0001, KOT-0001 with Continuous numbering)?')) {
      const defaults: SerialNumberConfig = {
        posInvoicePrefix: 'POS-',
        posInvoiceNextNumber: 1,
        posInvoicePadding: 4,
        posInvoiceIncludeDate: false,
        posInvoiceResetCycle: 'NEVER',

        kotPrefix: 'KOT-',
        kotNextNumber: 1,
        kotPadding: 4,
        kotIncludeDate: false,
        kotResetCycle: 'NEVER',

        orderRefPrefix: 'ORD-',
        orderRefNextNumber: 1,
        orderRefPadding: 4,
        orderRefResetCycle: 'NEVER'
      };
      setFormData(defaults);
      updateSerialConfig(defaults);
      try {
        fetch('/api/restaurant/pos-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serialConfig: defaults })
        }).catch(() => {});
      } catch {}
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const isSuperAdminOrAdmin = (currentUser?.role as string) === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-blue-900/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Master Serial & Sequence Control
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                Live Dynamic Numbering
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Hash className="w-6 h-6 text-blue-400 shrink-0" />
              KOT & POS Invoice Numbering Sequences
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Configure sequential serial numbering, starting numbers after day end or data reset, continuous numbering, prefix formats, and digit padding for customer receipts and kitchen tickets (KOT).
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
              title="Reset numbering parameters to system default starting values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Sequences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Sample Preview Strip - 2 Columns */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
              Live Real-Time Numbering Preview
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Updates live as you configure below</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sample POS Invoice */}
          <div className="bg-blue-50/80 rounded-xl p-3.5 border border-blue-200/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-blue-800">Next Customer Bill</p>
                <p className="font-mono font-black text-base text-blue-950 mt-0.5">{sampleInvoice}</p>
              </div>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-200/80 text-blue-900 uppercase">
              {formData.posInvoiceResetCycle === 'NEVER' ? 'Continuous' : formData.posInvoiceResetCycle}
            </span>
          </div>

          {/* Sample KOT Order */}
          <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-800">Next Kitchen KOT</p>
                <p className="font-mono font-black text-base text-emerald-950 mt-0.5">{sampleKot}</p>
                <p className="text-[11px] font-mono text-emerald-700 mt-0.5 font-bold">2nd KOT: {sampleKot}-#2</p>
              </div>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 uppercase">
              {formData.kotResetCycle === 'NEVER' ? 'Continuous' : formData.kotResetCycle}
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid - 2 Columns */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. POS Customer Bill Sequence */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">POS Bill & Invoice Numbering</h4>
                <p className="text-[11px] text-slate-500">Customer cash memos & guest bills</p>
              </div>
            </div>

            <div className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={formData.posInvoicePrefix}
                  onChange={e => setFormData({ ...formData, posInvoicePrefix: e.target.value })}
                  placeholder="e.g. POS-, INV-, BILL-"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Starting letters before invoice number</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Starting Serial Number *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.posInvoiceNextNumber}
                  onChange={e => setFormData({ ...formData, posInvoiceNextNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-mono font-black text-blue-700 bg-blue-50/30"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Change this number anytime (e.g. 500, 1001) to restart or migrate serial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Digit Padding (Zero-Fill)
                </label>
                <select
                  value={formData.posInvoicePadding}
                  onChange={e => setFormData({ ...formData, posInvoicePadding: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-medium bg-white"
                >
                  <option value={3}>3 Digits (e.g. 001)</option>
                  <option value={4}>4 Digits (e.g. 0001 - Recommended)</option>
                  <option value={5}>5 Digits (e.g. 00001)</option>
                  <option value={6}>6 Digits (e.g. 000001)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reset Frequency Across Days
                </label>
                <select
                  value={formData.posInvoiceResetCycle}
                  onChange={e => setFormData({ ...formData, posInvoiceResetCycle: e.target.value as SerialResetCycle })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-medium bg-white"
                >
                  <option value="NEVER">Continuous (Never Reset - Continues next day)</option>
                  <option value="DAILY">Daily Reset (Starts from 1 every morning)</option>
                  <option value="YEARLY">Yearly Reset (Starts from 1 on Jan 1st)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {formData.posInvoiceResetCycle === 'NEVER' 
                    ? 'Tomorrow will continue from yesterday\'s last number.' 
                    : formData.posInvoiceResetCycle === 'DAILY'
                      ? 'Resets to 1 automatically at the start of each new business day.'
                      : 'Resets to 1 at the beginning of each calendar year.'}
                </p>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.posInvoiceIncludeDate}
                    onChange={e => setFormData({ ...formData, posInvoiceIncludeDate: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Include Date in Invoice Number</span>
                </label>
                <p className="text-[10px] text-slate-400 pl-6 mt-0.5">
                  e.g. POS-{todayStr}-0001 instead of POS-0001
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Sequential Guarantee:</strong> POS Invoices auto-increment atomically across all POS tabs and cash registers without duplicates.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Kitchen KOT Sequence */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Kitchen KOT Serial Numbering</h4>
                <p className="text-[11px] text-slate-500">Kitchen order tickets for chefs</p>
              </div>
            </div>

            <div className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  KOT Prefix
                </label>
                <input
                  type="text"
                  value={formData.kotPrefix}
                  onChange={e => setFormData({ ...formData, kotPrefix: e.target.value })}
                  placeholder="e.g. KOT-, KTN-"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Starting letters printed on KOT slips</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Starting KOT Serial *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.kotNextNumber}
                  onChange={e => setFormData({ ...formData, kotNextNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-mono font-black text-emerald-700 bg-emerald-50/30"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Next order's KOT ticket number (e.g. 1, 101, 501).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Digit Padding (Zero-Fill)
                </label>
                <select
                  value={formData.kotPadding}
                  onChange={e => setFormData({ ...formData, kotPadding: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-medium bg-white"
                >
                  <option value={3}>3 Digits (e.g. 001)</option>
                  <option value={4}>4 Digits (e.g. 0001 - Recommended)</option>
                  <option value={5}>5 Digits (e.g. 00001)</option>
                  <option value={6}>6 Digits (e.g. 000001)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reset Frequency Across Days
                </label>
                <select
                  value={formData.kotResetCycle}
                  onChange={e => setFormData({ ...formData, kotResetCycle: e.target.value as SerialResetCycle })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-medium bg-white"
                >
                  <option value="NEVER">Continuous (Never Reset - Continues next day)</option>
                  <option value="DAILY">Daily Reset (Starts from 1 every morning)</option>
                  <option value="YEARLY">Yearly Reset (Starts from 1 on Jan 1st)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {formData.kotResetCycle === 'NEVER'
                    ? 'KOT numbering keeps counting forward without resetting every morning.'
                    : 'KOT numbering restarts at 1 each morning.'}
                </p>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.kotIncludeDate}
                    onChange={e => setFormData({ ...formData, kotIncludeDate: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Include Date in KOT Number</span>
                </label>
                <p className="text-[10px] text-slate-400 pl-6 mt-0.5">
                  e.g. KOT-{todayStr}-0001 instead of KOT-0001
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Sequential Guarantee:</strong> Kitchen KOT serials auto-increment atomically across all POS tabs and kitchen stations without duplicates.
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Configured sequences apply immediately to all newly created orders, KOT slips, and bills.</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Configuration Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Serial Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
