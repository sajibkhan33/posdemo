import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Wifi, 
  ShieldCheck, 
  Cpu, 
  PowerOff, 
  Play,
  Sparkles,
  Check,
  ChevronRight
} from 'lucide-react';
import { dispatchHardwarePrint } from '../../utils/hardwarePrint';
import { useRestaurant } from '../../context/RestaurantContext';

interface PrinterBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterBridgeModal: React.FC<PrinterBridgeModalProps> = ({ isOpen, onClose }) => {
  const { data: appData } = useRestaurant();
  const brandName = appData.restaurantProfile?.name || 'POS';
  const safeFileSlug = brandName.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'POS';
  const [isChecking, setIsChecking] = useState(false);
  const [localAgentStatus, setLocalAgentStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activePrinter, setActivePrinter] = useState<string>('');
  const [installedPrinters, setInstalledPrinters] = useState<string[]>([]);
  const [cloudStatus, setCloudStatus] = useState<{ isAgentOnline: boolean; pendingCount: number } | null>(null);
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean | null>(null);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [isStoppingAgent, setIsStoppingAgent] = useState(false);
  const [isStartingAgent, setIsStartingAgent] = useState(false);
  const [stopAgentSuccess, setStopAgentSuccess] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    setTestPrintSuccess(null);
    setStopAgentSuccess(null);

    let detectedLocal = false;

    // 1. Check local agent on port 9123
    try {
      const res = await fetch('http://127.0.0.1:9123/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const data = await res.json();
        detectedLocal = true;
        setLocalAgentStatus('online');
        setActivePrinter(data.activePrinter || '80 Printer');
        setInstalledPrinters(data.printers || []);
      }
    } catch {
      // Fallback to cloud check below
    }

    // 2. Check cloud server status
    try {
      const cRes = await fetch('/api/print-bridge/status', {
        signal: AbortSignal.timeout(3000)
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        const isCloudBridgeOnline = Boolean(cData.isAgentOnline);
        setCloudStatus({
          isAgentOnline: isCloudBridgeOnline,
          pendingCount: cData.pendingCount || 0
        });
        if (!detectedLocal && isCloudBridgeOnline) {
          detectedLocal = true;
          setLocalAgentStatus('online');
          setActivePrinter(prev => prev || '80 Printer (192.168.1.87 - Cloud Bridge Active)');
        }
      }
    } catch {
      // ignore
    }

    if (!detectedLocal) {
      setLocalAgentStatus('offline');
    }

    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    setTestPrintSuccess(null);
    try {
      const testPayload = {
        invoiceNo: 'TEST-001',
        tableName: 'TEST DEVICE',
        tableZone: 'Local Counter',
        waiter: 'System Test',
        dateTime: new Date().toLocaleString(),
        slips: [{
          station: 'MAIN PRINTER TEST',
          items: [
            { name: 'Thermal Hardware Communication', qty: 1 },
            { name: `${brandName} Print Bridge OK`, qty: 1 }
          ]
        }]
      };
      const ok = await dispatchHardwarePrint('/api/hardware/print-kot', testPayload);
      setTestPrintSuccess(ok);
    } catch {
      setTestPrintSuccess(false);
    } finally {
      setIsTestingPrint(false);
    }
  };

  const handleStopAgent = async () => {
    if (!window.confirm('Are you sure you want to stop the local Printer Agent on this PC?\n\nOnce stopped, background thermal printing will be paused until you start it again using the "Start Printer Agent" button or Desktop shortcut.')) {
      return;
    }
    setIsStoppingAgent(true);
    setStopAgentSuccess(null);
    try {
      try {
        await fetch('http://127.0.0.1:9123/api/hardware/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'user_requested_ui_stop' }),
          signal: AbortSignal.timeout(3000)
        });
      } catch {
        // Socket closes immediately on exit
      }

      await new Promise(r => setTimeout(r, 1200));
      setLocalAgentStatus('offline');
      setStopAgentSuccess('Printer Agent has been stopped. You can start it anytime using the green "Start Printer Agent" button above or via your Desktop shortcut.');
    } catch (err: any) {
      alert('Failed to stop agent: ' + (err?.message || err));
    } finally {
      setIsStoppingAgent(false);
    }
  };

  const handleStartAgentFromWeb = () => {
    setIsStartingAgent(true);
    setStopAgentSuccess(null);

    // Trigger custom URL protocol posbridge://start
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'posbridge://start';
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 2000);

    // Poll for up to 8 seconds to detect port 9123 activation
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('http://127.0.0.1:9123/health', {
          method: 'GET',
          signal: AbortSignal.timeout(1200)
        });
        if (res.ok) {
          clearInterval(interval);
          setIsStartingAgent(false);
          checkStatus();
        }
      } catch {}

      if (attempts >= 8) {
        clearInterval(interval);
        setIsStartingAgent(false);
        checkStatus();
      }
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
              localAgentStatus === 'online' 
                ? 'bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20' 
                : 'bg-linear-to-br from-rose-500 to-red-600 text-white shadow-rose-500/20'
            }`}>
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                  {brandName} Printer Bridge
                </h3>
                {localAgentStatus === 'online' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Not Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hardware Thermal Printing Service • Direct USB & LAN (192.168.1.87)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                This PC Agent Status:
              </span>
            </div>
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Re-check'}</span>
            </button>
          </div>

          {localAgentStatus === 'online' ? (
            /* ACTIVE CARD */
            <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50/90 via-white to-emerald-50/40 border border-emerald-200 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                    <span>Local Print Bridge is Active & Ready</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
                      Instant 0ms
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Orders, KOTs, and Receipts print directly to connected thermal hardware without print dialogues.
                  </p>
                </div>
              </div>

              {/* Printer Details Chip */}
              <div className="bg-white/80 backdrop-blur-xs border border-emerald-200/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold text-[11px]">Primary Target:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-[11px] shadow-2xs">
                    🎯 {activePrinter}
                  </span>
                </div>
                {installedPrinters.length > 0 && (
                  <span className="text-[11px] text-slate-500 truncate" title={installedPrinters.join(', ')}>
                    {installedPrinters.length} printer(s) installed on this PC
                  </span>
                )}
              </div>

              {/* Action Buttons: Stop & Test Print */}
              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleStopAgent}
                  disabled={isStoppingAgent}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Pause background print agent on this PC"
                >
                  <PowerOff className={`w-3.5 h-3.5 text-rose-600 ${isStoppingAgent ? 'animate-spin' : ''}`} />
                  <span>{isStoppingAgent ? 'Stopping Agent...' : 'Stop Printer Agent'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTestingPrint}
                  className="px-4 py-2 bg-linear-to-r from-[#004b9b] to-[#0062cc] hover:from-[#003d7e] hover:to-[#004b9b] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/15 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isTestingPrint ? 'Sending Test...' : 'Send Hardware Test Print'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* OFFLINE CARD */
            <div className="p-4 rounded-2xl bg-linear-to-br from-rose-50/90 via-white to-rose-50/30 border border-rose-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-rose-950">
                      Printer Agent Not Running on this PC
                    </h4>
                    <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                      Instant hardware printing is paused. If already installed on this computer, click <strong>Start Agent</strong> to resume printing immediately.
                    </p>
                  </div>
                </div>

                {/* Prominent One-Click Start Button */}
                <button
                  type="button"
                  onClick={handleStartAgentFromWeb}
                  disabled={isStartingAgent}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  title="Launch local printer bridge directly from browser"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isStartingAgent ? 'animate-spin' : ''}`} />
                  <span>{isStartingAgent ? 'Starting Agent...' : 'Start Printer Agent'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback alerts */}
          {stopAgentSuccess && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{stopAgentSuccess}</span>
            </div>
          )}

          {testPrintSuccess === true && (
            <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Test print sent successfully to thermal printer head & cutter!</span>
            </div>
          )}

          {testPrintSuccess === false && (
            <div className="p-3 bg-rose-100 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Failed to send test print. Make sure your thermal printer is turned on and connected.</span>
            </div>
          )}
        </div>

        {/* 1-Click Device Setup (Hero Card - Standalone EXE Only) */}
        <div className="mt-5 p-5 rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-800 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="font-black text-sm text-white tracking-tight">
                1-Click Device Setup (Standalone Installer)
              </h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-blue-200 border border-white/10">
              Windows 10 / 11
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Need to set up a new cash counter or kitchen PC? Download this standalone installer once — no zip extraction required.
          </p>

          <div>
            <a
              href="/api/download/printer-agent-exe"
              download={`${safeFileSlug}-Printer-Setup.exe`}
              className="w-full py-3 px-5 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
              title="Download Standalone 1-Click Windows EXE Installer"
            >
              <Download className="w-4 h-4" />
              <span>Download {brandName} Printer Setup (.EXE)</span>
            </a>
          </div>

          {/* Value Badges */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Unzip Needed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto Windows Boot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Single Desktop Controller</span>
            </div>
          </div>
        </div>

        {/* 3 Step Visual Stepper */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Easy 3-Step Setup Guide:
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition border border-slate-200/80 rounded-2xl space-y-1">
              <div className="w-6 h-6 rounded-full bg-[#004b9b] text-white font-black text-xs flex items-center justify-center mb-1">
                1
              </div>
              <div className="font-extrabold text-xs text-slate-900">Download (.EXE)</div>
              <div className="text-[11px] text-slate-500 leading-snug">
                Click download button above. No extraction or password needed.
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition border border-slate-200/80 rounded-2xl space-y-1">
              <div className="w-6 h-6 rounded-full bg-[#004b9b] text-white font-black text-xs flex items-center justify-center mb-1">
                2
              </div>
              <div className="font-extrabold text-xs text-slate-900">1-Click Install</div>
              <div className="text-[11px] text-slate-500 leading-snug">
                Double-click the .exe file and click "Install Now" in the window.
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition border border-slate-200/80 rounded-2xl space-y-1">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-1">
                3
              </div>
              <div className="font-extrabold text-xs text-slate-900">1-Click Control</div>
              <div className="text-[11px] text-slate-500 leading-snug">
                Start/Stop anytime from this web screen or single Desktop icon.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <Wifi className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium text-slate-600">Default LAN: 192.168.1.87 (80 Printer)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
