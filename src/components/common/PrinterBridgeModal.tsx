import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Wifi, 
  PowerOff, 
  Play,
  Monitor
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
  const [activePrinter, setActivePrinter] = useState<string>('80 Printer');
  const [installedPrinters, setInstalledPrinters] = useState<string[]>([]);
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
      // Fallback
    }

    // 2. Check cloud server status fallback
    if (!detectedLocal) {
      try {
        const cRes = await fetch('/api/print-bridge/status', {
          signal: AbortSignal.timeout(3000)
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.isAgentOnline) {
            detectedLocal = true;
            setLocalAgentStatus('online');
            setActivePrinter('80 Printer (Cloud Bridge)');
          }
        }
      } catch {}
    }

    if (!detectedLocal) {
      setLocalAgentStatus('offline');
    }

    try {
      window.dispatchEvent(new CustomEvent('printer-status-changed', { detail: { online: detectedLocal } }));
    } catch {}

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
    if (!window.confirm('Are you sure you want to stop the local Printer Agent on this PC?\n\nOnce stopped, background thermal printing will be paused until you start it again.')) {
      return;
    }
    setIsStoppingAgent(true);
    setStopAgentSuccess(null);

    // 1. Instantly flip UI and Header status in 0ms
    setLocalAgentStatus('offline');
    try {
      window.dispatchEvent(new CustomEvent('printer-status-changed', { detail: { online: false } }));
    } catch {}

    // 2. Immediately notify server to clear 30-sec cloud heartbeat cache
    fetch('/api/print-bridge/offline', { method: 'POST' }).catch(() => {});

    // 3. Trigger OS native stop protocol posbridge://stop
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'posbridge://stop';
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 1500);

    // 4. Send stop command directly to local port 9123
    try {
      await fetch('http://127.0.0.1:9123/api/hardware/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'user_requested_ui_stop' }),
        signal: AbortSignal.timeout(1500)
      });
    } catch {}

    setStopAgentSuccess('Printer Agent has been stopped. You can start it again anytime by pressing "Start Agent".');
    setIsStoppingAgent(false);
  };

  const handleStartAgentFromWeb = () => {
    setIsStartingAgent(true);
    setStopAgentSuccess(null);

    // Trigger custom protocol posbridge://start
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'posbridge://start';
    document.body.appendChild(iframe);
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 2000);

    // Poll for port 9123
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
          setLocalAgentStatus('online');
          try {
            window.dispatchEvent(new CustomEvent('printer-status-changed', { detail: { online: true } }));
          } catch {}
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

  const isOnline = localAgentStatus === 'online';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${
              isOnline 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-rose-100 text-rose-700'
            }`}>
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight leading-tight">
                  Printer Bridge {isOnline ? 'Online' : 'Offline'}
                </h3>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {brandName} · KOT & bill printing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={checkStatus}
              disabled={isChecking}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Target Printer Info Bar */}
        <div className="mt-3 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>Printing to:</span>
            <strong className="text-slate-900 font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {activePrinter}
            </strong>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 font-mono text-[11px]">192.168.1.87</span>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
            Direct USB & LAN
          </span>
        </div>

        {/* Live Status & Action Row */}
        <div className="mt-2.5">
          {isOnline ? (
            /* ONLINE ACTIONS */
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Connected & Ready (Instant 0ms print)</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleStopAgent}
                  disabled={isStoppingAgent}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Stop background print service"
                >
                  <PowerOff className={`w-3.5 h-3.5 text-rose-600 ${isStoppingAgent ? 'animate-spin' : ''}`} />
                  <span>{isStoppingAgent ? 'Stopping...' : 'Stop'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTestingPrint}
                  className="px-3.5 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isTestingPrint ? 'Sending...' : 'Test Print'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* OFFLINE ACTIONS */
            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Hardware agent offline on this PC</span>
              </div>

              <button
                type="button"
                onClick={handleStartAgentFromWeb}
                disabled={isStartingAgent}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                title="Start Printer Bridge on this computer"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isStartingAgent ? 'animate-spin' : ''}`} />
                <span>{isStartingAgent ? 'Starting...' : 'Start Agent'}</span>
              </button>
            </div>
          )}

          {/* Feedback toasts */}
          {stopAgentSuccess && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{stopAgentSuccess}</span>
            </div>
          )}

          {testPrintSuccess === true && (
            <div className="mt-2 p-2 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Test print sent successfully to thermal printer head & cutter!</span>
            </div>
          )}

          {testPrintSuccess === false && (
            <div className="mt-2 p-2 bg-rose-100 text-rose-900 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Failed to send test print. Make sure your thermal printer is turned on and connected.</span>
            </div>
          )}
        </div>

        {/* Setting up a new computer? (Compact Card) */}
        <div className="mt-3.5 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-600" />
                <span>Setting up a new computer?</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Install once on any cash counter. Works on Windows 10 / 11.
              </p>
            </div>

            <a
              href="/api/download/printer-agent-exe"
              download={`${safeFileSlug}-Printer-Setup.exe`}
              className="px-3.5 py-1.5 bg-[#004b9b] hover:bg-[#005bb8] text-white text-xs font-black rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Download 1-Click Installer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.exe)</span>
            </a>
          </div>

          {/* 3 Step Micro Guide */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-left">
            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-[10px]">
              <span className="font-bold text-slate-800 block text-[11px]">1. Download</span>
              <span className="text-slate-500">Get the .exe file</span>
            </div>

            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-[10px]">
              <span className="font-bold text-slate-800 block text-[11px]">2. Install</span>
              <span className="text-slate-500">Open it, click Install Now</span>
            </div>

            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-[10px]">
              <span className="font-bold text-emerald-700 block text-[11px]">3. Start</span>
              <span className="text-slate-500">Press Start above</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <Wifi className="w-3 h-3 text-blue-600" />
            <span className="font-mono text-slate-600">Default LAN: 192.168.1.87</span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
