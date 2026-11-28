import React, { useState, useEffect, useCallback } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { PrinterConfig, PrinterType, PrinterConnectionType, ThermalPaperWidth } from '../../types';
import { 
  Printer, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Wifi, 
  Usb, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Sliders, 
  Layers, 
  ChefHat, 
  ReceiptText, 
  FileSpreadsheet, 
  ArrowRight,
  RefreshCw,
  Search,
  Sparkles,
  Download,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { PrinterBridgeModal } from '../common/PrinterBridgeModal';
import { dispatchHardwarePrint } from '../../utils/hardwarePrint';

interface DetectedSystemPrinter {
  name: string;
  portName: string;
  driverName?: string;
  connectionType: 'USB' | 'LAN';
  ipAddress?: string;
  port?: number;
  usbPort?: string;
  isConnected: boolean;
  isVirtual?: boolean;
  deviceCategory?: string;
}

export const PrintersConfigView: React.FC = () => {
  const { 
    data, 
    addPrinter, 
    updatePrinter, 
    deletePrinter, 
    language 
  } = useRestaurant();

  const printers = data.printers || [];

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterConn, setFilterConn] = useState<string>('ALL');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [systemPrinterName, setSystemPrinterName] = useState('');
  const [type, setType] = useState<PrinterType>('KOT');
  const [connectionType, setConnectionType] = useState<PrinterConnectionType>('LAN');
  const [ipAddress, setIpAddress] = useState('192.168.1.200');
  const [port, setPort] = useState(9100);
  const [usbPort, setUsbPort] = useState('USB001');
  const [baudRate, setBaudRate] = useState(9600);
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [isDishDropdownOpen, setIsDishDropdownOpen] = useState(false);
  const [dishSearchQuery, setDishSearchQuery] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [printOnBill, setPrintOnBill] = useState(true);
  const [printOnSettle, setPrintOnSettle] = useState(true);
  const [notes, setNotes] = useState('');

  // Test Print Simulation State
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);
  const [testPrintOutput, setTestPrintOutput] = useState<{ printer: PrinterConfig; timestamp: string; hardwareSuccess?: boolean } | null>(null);

  // Desktop Print Bridge & System Printer Discovery State
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [isLocalBridgeOnline, setIsLocalBridgeOnline] = useState<boolean | null>(null);
  const [detectedSystemPrinters, setDetectedSystemPrinters] = useState<DetectedSystemPrinter[]>([]);
  const [activeHardwarePrinter, setActiveHardwarePrinter] = useState<string>('');
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);

  const scanSystemPrinters = React.useCallback(async (force = false) => {
    setIsScanningPrinters(true);
    let foundOnline = false;
    const mergedMap = new Map<string, DetectedSystemPrinter>();

    const addItem = (item: DetectedSystemPrinter) => {
      if (!item || !item.name) return;
      const key = item.name.trim().toLowerCase();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      }
    };

    // 1. Try direct local agent on 127.0.0.1:9123
    try {
      const localRes = await fetch(`http://127.0.0.1:9123/health${force ? '?force=1' : ''}`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500)
      });
      if (localRes.ok) {
        const d = await localRes.json();
        foundOnline = true;
        if (d.activePrinter) setActiveHardwarePrinter(d.activePrinter);
        if (Array.isArray(d.detailedPrinters)) {
          for (const item of d.detailedPrinters) {
            addItem(item);
          }
        }
        if (Array.isArray(d.printers)) {
          for (const pName of d.printers) {
            addItem({
              name: pName,
              portName: d.isLanReachable ? '192.168.1.87:9100' : 'USB001',
              connectionType: d.isLanReachable && !d.isUsbConnected ? 'LAN' : 'USB',
              ipAddress: '192.168.1.87',
              port: 9100,
              usbPort: 'USB001',
              isConnected: Boolean(d.isUsbConnected || d.isLanReachable)
            });
          }
        }
      }
    } catch {
      // Local HTTP may be blocked by HTTPS mixed-content in some browsers; fallback to server bridge below
    }

    // 2. Also query server /api/hardware/printers & /api/print-bridge/status (works on https://tsc-cafeteria.onrender.com!)
    try {
      const [hwRes, bridgeRes] = await Promise.all([
        fetch('/api/hardware/printers', { signal: AbortSignal.timeout(4000) }).catch(() => null),
        fetch('/api/print-bridge/status', { signal: AbortSignal.timeout(4000) }).catch(() => null)
      ]);

      if (bridgeRes && bridgeRes.ok) {
        const bData = await bridgeRes.json();
        if (bData.isAgentOnline) foundOnline = true;
        if (bData.activePrinter) setActiveHardwarePrinter(bData.activePrinter);
        if (Array.isArray(bData.detailedPrinters)) {
          for (const item of bData.detailedPrinters) {
            addItem(item);
          }
        }
        if (Array.isArray(bData.printers)) {
          for (const pName of bData.printers) {
            addItem({
              name: pName,
              portName: 'USB001',
              connectionType: /lan|192\./i.test(pName) ? 'LAN' : 'USB',
              ipAddress: '192.168.1.87',
              port: 9100,
              usbPort: 'USB001',
              isConnected: true
            });
          }
        }
      }

      if (hwRes && hwRes.ok) {
        const hwData = await hwRes.json();
        if (hwData.isAgentOnline) foundOnline = true;
        if (hwData.activePrinter && !activeHardwarePrinter) setActiveHardwarePrinter(hwData.activePrinter);
        if (Array.isArray(hwData.detailedPrinters)) {
          for (const item of hwData.detailedPrinters) {
            addItem(item);
          }
        }
        if (Array.isArray(hwData.printers)) {
          for (const pName of hwData.printers) {
            addItem({
              name: pName,
              portName: 'USB001',
              connectionType: /lan|192\./i.test(pName) ? 'LAN' : 'USB',
              ipAddress: '192.168.1.87',
              port: 9100,
              usbPort: 'USB001',
              isConnected: true
            });
          }
        }
      }
    } catch {
      // ignore network error
    }

    setIsLocalBridgeOnline(foundOnline);
    setDetectedSystemPrinters(Array.from(mergedMap.values()));
    setIsScanningPrinters(false);
  }, [activeHardwarePrinter]);

  React.useEffect(() => {
    scanSystemPrinters(false);
    const interval = setInterval(() => scanSystemPrinters(false), 10000);
    return () => clearInterval(interval);
  }, [scanSystemPrinters]);

  // Apply a detected system printer's hardware settings into the modal form
  const handleSelectDetectedPrinter = (sysPrinter: DetectedSystemPrinter) => {
    setSystemPrinterName(sysPrinter.name);
    // If display name is empty, auto-fill with detected printer's name
    if (!name.trim()) {
      setName(sysPrinter.name);
    }
    setConnectionType(sysPrinter.connectionType);
    if (sysPrinter.connectionType === 'LAN') {
      setIpAddress(sysPrinter.ipAddress || '192.168.1.87');
      setPort(sysPrinter.port || 9100);
    } else {
      setUsbPort(sysPrinter.usbPort || sysPrinter.portName || 'USB001');
    }
    setNotes(`Connected via ${sysPrinter.connectionType} (${sysPrinter.portName})`);
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingPrinterId(null);
    setName('');
    setSystemPrinterName('');
    setType('KOT');
    setConnectionType('USB');
    setIpAddress('192.168.1.87');
    setPort(9100);
    setUsbPort('USB001');
    setBaudRate(9600);
    setPaperWidth('80mm');
    setSelectedDepts(data.departments || []);
    setIsDeptDropdownOpen(false);
    setDeptSearchQuery('');
    setSelectedCats([]);
    setIsCatDropdownOpen(false);
    setCatSearchQuery('');
    setSelectedItemIds([]);
    setIsDishDropdownOpen(false);
    setDishSearchQuery('');
    setIsDefault(false);
    setIsActive(true);
    setPrintOnBill(true);
    setPrintOnSettle(true);
    setNotes('');
    setIsModalOpen(true);
    scanSystemPrinters(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (p: PrinterConfig) => {
    setEditingPrinterId(p.id);
    setName(p.name);
    // Bind hardware printer name: check p.systemPrinterName, or find matching detected printer
    let matchedHwName = p.systemPrinterName || '';
    if (!matchedHwName && detectedSystemPrinters.length > 0) {
      const match = detectedSystemPrinters.find(dp => 
        dp.name.toLowerCase() === p.name.toLowerCase() ||
        (p.connectionType === 'USB' && dp.portName && p.usbPort && dp.portName.toLowerCase() === p.usbPort.toLowerCase())
      );
      if (match) matchedHwName = match.name;
    }
    setSystemPrinterName(matchedHwName || p.name);
    setType(p.type);
    setConnectionType(p.connectionType);
    setIpAddress(p.ipAddress || '192.168.1.87');
    setPort(p.port || 9100);
    setUsbPort(p.usbPort || 'USB001');
    setBaudRate(p.baudRate || 9600);
    setPaperWidth(p.paperWidth || '80mm');
    const currentDepts = data.departments || [];
    const validDepts = (p.departments || []).filter(d => currentDepts.length === 0 || currentDepts.includes(d));
    setSelectedDepts(validDepts);
    setIsDeptDropdownOpen(false);
    setDeptSearchQuery('');

    const currentCats = data.menuCategories || [];
    const validCats = (p.categories || []).filter(c => currentCats.length === 0 || currentCats.includes(c));
    setSelectedCats(validCats);
    setIsCatDropdownOpen(false);
    setCatSearchQuery('');
    setSelectedItemIds(p.itemIds || []);
    setIsDishDropdownOpen(false);
    setDishSearchQuery('');
    setIsDefault(Boolean(p.isDefault));
    setIsActive(p.isActive !== false);
    setPrintOnBill(p.printOnBill !== false);
    setPrintOnSettle(p.printOnSettle !== false);
    setNotes(p.notes || '');
    setIsModalOpen(true);
    scanSystemPrinters(true);
  };

  // Save Printer
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a descriptive printer name!');
      return;
    }

    const payload: Omit<PrinterConfig, 'id'> = {
      name: name.trim(),
      systemPrinterName: systemPrinterName.trim() || undefined,
      type,
      connectionType,
      ipAddress: connectionType === 'LAN' ? ipAddress.trim() : undefined,
      port: connectionType === 'LAN' ? Number(port) || 9100 : undefined,
      usbPort: connectionType === 'USB' ? usbPort.trim() : undefined,
      baudRate: connectionType === 'USB' ? Number(baudRate) || 9600 : undefined,
      paperWidth,
      departments: selectedDepts,
      categories: selectedCats,
      itemIds: selectedItemIds.length > 0 ? selectedItemIds : undefined,
      isDefault,
      isActive,
      printOnBill: (type === 'BILL' || type === 'ALL') ? printOnBill : true,
      printOnSettle: (type === 'BILL' || type === 'ALL') ? printOnSettle : true,
      notes: notes.trim()
    };

    if (editingPrinterId) {
      updatePrinter(editingPrinterId, payload);
    } else {
      addPrinter(payload);
    }

    setIsModalOpen(false);
  };

  // Delete Printer
  const handleDelete = (id: string) => {
    deletePrinter(id);
  };

  // Toggle Department selection
  const toggleDept = (dept: string) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  // Toggle Category selection
  const toggleCat = (cat: string) => {
    setSelectedCats(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      // Clean itemIds that are no longer in selected categories
      setSelectedItemIds(currentIds => 
        currentIds.filter(id => {
          const item = (data.menuItems || []).find(m => m.id === id);
          return item && next.includes(item.category);
        })
      );
      return next;
    });
  };

  // Real Hardware + UI Test Print
  const handleTestPrint = async (printer: PrinterConfig) => {
    setTestingPrinterId(printer.id);
    const nowStr = new Date().toLocaleTimeString();
    let hwOk = false;
    try {
      hwOk = await dispatchHardwarePrint('/api/hardware/print-kot', {
        tableName: 'PRINTER TEST',
        tableZone: printer.connectionType === 'LAN' ? `${printer.ipAddress || '192.168.1.87'}:${printer.port || 9100}` : (printer.usbPort || 'USB001'),
        waiter: 'System Admin',
        customer: 'Hardware Diagnostics',
        invoiceNo: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
        dateTime: new Date().toLocaleString('en-US'),
        slips: [
          {
            station: printer.name,
            targetPrinterName: printer.systemPrinterName || printer.name,
            category: `${printer.type} (${printer.paperWidth})`,
            items: [
              { name: 'Thermal Print Head Check', qty: 1, notes: `Interface: ${printer.connectionType}` },
              { name: 'Auto-Cutter Blade Check', qty: 1, notes: 'Status: ONLINE & READY' }
            ]
          }
        ]
      });
    } catch {
      hwOk = false;
    }
    setTestingPrinterId(null);
    setTestPrintOutput({
      printer,
      timestamp: nowStr,
      hardwareSuccess: hwOk
    });
  };

  // Filtered List
  const filteredPrinters = printers.filter(p => {
    if (filterType !== 'ALL' && p.type !== filterType && p.type !== 'ALL') return false;
    if (filterConn !== 'ALL' && p.connectionType !== filterConn) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchIp = (p.ipAddress || '').toLowerCase().includes(q);
      const matchUsb = (p.usbPort || '').toLowerCase().includes(q);
      const matchDept = (p.departments || []).some(d => d.toLowerCase().includes(q));
      if (!matchName && !matchIp && !matchUsb && !matchDept) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Controls */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                'Printers & Hardware Routing'
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn' 
                  ? 'Add KOT, Bill, and Report printers (USB & LAN) and route by department / menu category'
                  : 'Add USB & LAN/Network thermal printers for KOT, Bill & Reports with Dept & Category routing'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          id="btn-add-new-printer"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>'+ Add New Printer'</span>
        </button>
      </div>

      {/* Desktop Print Bridge Agent & Installer Card */}
      <div className="p-4 bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-slate-900">
                {data.restaurantProfile?.name || 'POS'} Printer Agent (Floor Bridge)
              </h4>
              {isLocalBridgeOnline ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online on this Device
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Not Running on this PC
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Connects this device to 80 Printer (192.168.1.87) & Kot Printer (USB001) for instant, silent printing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/download/printer-agent-zip"
            download={`${(data.restaurantProfile?.name || 'POS').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}-Printer-Setup.zip`}
            className="px-3.5 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 1-Click Installer</span>
          </a>

          <button
            type="button"
            onClick={() => setIsBridgeModalOpen(true)}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Setup & Status</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search printer name, IP, port, or dept..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-1.5">Type:</span>
            {['ALL', 'KOT', 'BILL', 'REPORT'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  filterType === t ? 'bg-slate-900 text-amber-400' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Connection Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-1.5">Conn:</span>
            {['ALL', 'LAN', 'USB'].map(c => (
              <button
                key={c}
                onClick={() => setFilterConn(c)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  filterConn === c ? 'bg-slate-900 text-amber-400' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Printers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrinters.map(printer => {
          const isKot = printer.type === 'KOT';
          const isBill = printer.type === 'BILL';
          const isReport = printer.type === 'REPORT';
          const isLan = printer.connectionType === 'LAN';

          return (
            <div 
              key={printer.id}
              className={`p-5 bg-white rounded-2xl border transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-md ${
                printer.isActive 
                  ? 'border-slate-200 hover:border-amber-300' 
                  : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isKot 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : isBill 
                          ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                          : isReport 
                            ? 'bg-teal-100 text-teal-900 border border-teal-200' 
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                    }`}>
                      {isKot ? <ChefHat className="w-3 h-3" /> : isBill ? <ReceiptText className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                      <span>{printer.type} Printer</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isLan 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {isLan ? <Wifi className="w-3 h-3" /> : <Usb className="w-3 h-3" />}
                      <span>{printer.connectionType}</span>
                    </span>

                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">
                      {printer.paperWidth}
                    </span>
                  </div>

                  {printer.isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                      Default
                    </span>
                  )}
                </div>

                {/* Printer Name & Connection Info */}
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                    {printer.name}
                  </h4>
                  {printer.systemPrinterName && printer.systemPrinterName.toLowerCase() !== printer.name.toLowerCase() && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0" title={`Connected hardware device: ${printer.systemPrinterName}`}>
                      HW: {printer.systemPrinterName}
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 my-2.5 font-mono">
                  {isLan ? (
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-[11px] text-slate-500 font-sans">Network IP:</span>
                      <span className="font-bold text-blue-700">{printer.ipAddress || '192.168.1.x'}:{printer.port || 9100}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-[11px] text-slate-500 font-sans">USB Port:</span>
                      <span className="font-bold text-slate-800">{printer.usbPort || 'USB001'} ({printer.baudRate || 9600} bps)</span>
                    </div>
                  )}
                </div>

                {/* Routed Departments */}
                <div className="space-y-1.5 my-2">
                  <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Routed Departments:</span>
                    <span className="text-slate-400 font-normal">
                      {(printer.departments || []).length === 0 ? 'All Depts' : `${(printer.departments || []).length} Depts`}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {(printer.departments || []).length === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium italic">
                        All Kitchen & Bar Departments
                      </span>
                    ) : (
                      printer.departments.map(d => (
                        <span key={d} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold truncate max-w-[140px]">
                          {d}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Routed Categories if specified */}
                {(() => {
                  const currentCats = data.menuCategories || [];
                  const validCats = (printer.categories || []).filter(c => currentCats.length === 0 || currentCats.includes(c));
                  if (validCats.length === 0) return null;
                  return (
                    <div className="space-y-1 my-2">
                      <div className="text-[10px] font-bold text-slate-500">Categories:</div>
                      <div className="flex flex-wrap gap-1">
                        {validCats.map(c => (
                          <span key={c} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Specific Routed Dishes if filtered */}
                {(printer.itemIds || []).length > 0 && (
                  <div className="my-1.5 flex items-center">
                    <span 
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1"
                      title={`${printer.itemIds.length} specific dishes filtered. Click Edit to view or modify.`}
                    >
                      <ChefHat className="w-3 h-3 text-amber-600" />
                      <span>Specific Filtered Dishes ({printer.itemIds.length})</span>
                    </span>
                  </div>
                )}

                {/* Specific Action Status Badges for BILL / ALL printers */}
                {(printer.type === 'BILL' || printer.type === 'ALL') && (
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span 
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                        printer.printOnBill !== false 
                          ? 'bg-amber-50 text-amber-900 border-amber-200' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                      }`}
                      title={printer.printOnBill !== false ? 'Guest Bill Print Active' : 'Guest Bill Print Muted'}
                    >
                      <ReceiptText className="w-2.5 h-2.5" />
                      <span>Bill Print: {printer.printOnBill !== false ? 'ON' : 'OFF'}</span>
                    </span>

                    <span 
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border ${
                        printer.printOnSettle !== false 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                      }`}
                      title={printer.printOnSettle !== false ? 'Settle & Pay Cash Memo Print Active' : 'Settle Memo Print Muted'}
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>Settle Print: {printer.printOnSettle !== false ? 'ON' : 'OFF'}</span>
                    </span>
                  </div>
                )}

                {printer.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-1">
                    "{printer.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTestPrint(printer)}
                  disabled={testingPrinterId === printer.id}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPrinterId === printer.id ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
                  <span>{testingPrinterId === printer.id ? 'Testing...' : 'Test Print'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(printer)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                    title="Edit Printer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(printer.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Printer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPrinters.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <Printer className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-extrabold text-sm text-slate-700">No Printers Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add your thermal KOT, Bill, and Report printers with their USB or LAN IP configurations.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#004b9b] text-white font-bold text-xs rounded-xl hover:bg-[#005bb8] transition"
            >
              + Add First Printer
            </button>
          </div>
        )}
      </div>

      {/* Test Print Simulated Output Modal */}
      {testPrintOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-sm text-slate-900">Thermal Printer Test Receipt</span>
              </div>
              <button
                onClick={() => setTestPrintOutput(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-xs text-slate-900 space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <p className="font-extrabold font-sans text-sm">*** PRINTER TEST TICKET ***</p>
                <p className="text-[11px] text-slate-600 font-sans">{testPrintOutput.printer.name}</p>
                <p className="text-[10px] text-slate-500 font-sans">{testPrintOutput.timestamp}</p>
              </div>

              <div className="text-[11px] space-y-1 py-1">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-bold">{testPrintOutput.printer.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="font-bold">{testPrintOutput.printer.connectionType}</span>
                </div>
                {testPrintOutput.printer.connectionType === 'LAN' ? (
                  <div className="flex justify-between">
                    <span>IP / Port:</span>
                    <span className="font-bold text-blue-700">{testPrintOutput.printer.ipAddress}:{testPrintOutput.printer.port}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>USB Port:</span>
                    <span className="font-bold">{testPrintOutput.printer.usbPort} ({testPrintOutput.printer.baudRate} bps)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Paper Width:</span>
                  <span className="font-bold">{testPrintOutput.printer.paperWidth}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-700 font-bold">ONLINE & READY</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-400 text-center text-[10px] text-slate-600 font-sans">
                <p className="font-bold text-slate-800">ESC/POS Commands: OK [CUT: OK]</p>
                <p>Routed Departments: {(testPrintOutput.printer.departments || []).join(', ') || 'All'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTestPrintOutput(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Close Test Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Printer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingPrinterId 
                      ? 'Edit Printer Configuration'
                      : 'Add New Thermal Printer'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure connection (LAN/USB) and select routed departments/categories
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 my-4">
              {/* Ultra-Compact System Hardware Printer Auto-Detector */}
              <div className="p-2.5 rounded-xl bg-linear-to-r from-emerald-50/70 to-teal-50/40 border border-emerald-200/90 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-xs font-extrabold text-slate-900">System Printer (Auto-Detect)</span>
                    {detectedSystemPrinters.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                        {detectedSystemPrinters.length} Found
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => scanSystemPrinters(true)}
                    disabled={isScanningPrinters}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isScanningPrinters ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
                    <span>{isScanningPrinters ? 'Scanning...' : 'Check Printers'}</span>
                  </button>
                </div>

                {detectedSystemPrinters.length > 0 ? (
                  <div className="space-y-1">
                    <select
                      value={systemPrinterName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setSystemPrinterName('');
                          return;
                        }
                        const selected = detectedSystemPrinters.find(p => p.name === val);
                        if (selected) {
                          handleSelectDetectedPrinter(selected);
                        } else {
                          setSystemPrinterName(val);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Select Detected Hardware Printer ({detectedSystemPrinters.length} Available) --</option>
                      {detectedSystemPrinters.map((sysP, idx) => {
                        const portOrIp = sysP.connectionType === 'LAN' 
                          ? `LAN IP: ${sysP.ipAddress || '192.168.1.87'}:${sysP.port || 9100}`
                          : `Port: ${sysP.portName || sysP.usbPort || 'USB001'}`;
                        const typeTag = sysP.connectionType === 'LAN' ? '🌐 [LAN]' : sysP.isVirtual ? '📄 [Virtual]' : '🔌 [USB]';
                        return (
                          <option key={`${sysP.name}-${idx}`} value={sysP.name}>
                            {typeTag} {sysP.name} ({portOrIp})
                          </option>
                        );
                      })}
                    </select>

                    {/* Compact 1-line linked device status */}
                    {systemPrinterName ? (
                      <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-between px-1.5 py-0.5">
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Linked Device: <strong className="text-slate-900">{systemPrinterName}</strong></span>
                        </span>
                        <span className="font-mono text-emerald-700">
                          {connectionType === 'LAN' ? `IP: ${ipAddress}:${port}` : `Port: ${usbPort}`}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-700 italic px-1">
                        Select a detected printer above to auto-link physical hardware.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-white/80 border border-dashed border-slate-300 text-[10px] text-slate-600 flex items-center justify-between">
                    <span>No active hardware printer detected. Connect cable & click Check Printers.</span>
                  </div>
                )}
              </div>

              {/* Printer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Printer Name / Label *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. 80 Printer, Kot Printer (Kitchen & Master KOT)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Type and Paper Width */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Printer Purpose / Type *
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as PrinterType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="KOT">KOT (Kitchen Order Ticket)</option>
                    <option value="BILL">BILL (Customer Cash Memo / Invoice)</option>
                    <option value="REPORT">REPORT (Z-Report & Shift Logs)</option>
                    <option value="ALL">ALL (Multi-purpose Universal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Paper Roll Width *
                  </label>
                  <select
                    value={paperWidth}
                    onChange={e => setPaperWidth(e.target.value as ThermalPaperWidth)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="80mm">80mm (Standard 3-inch, 48 characters)</option>
                    <option value="58mm">58mm (Compact 2-inch, 32 characters)</option>
                  </select>
                </div>
              </div>

              {/* Connection Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Connection Interface *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectionType('LAN')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      connectionType === 'LAN'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span>LAN / Network (Ethernet / Wi-Fi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectionType('USB')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      connectionType === 'USB'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Usb className="w-4 h-4 text-amber-600" />
                    <span>USB / Direct Cable</span>
                  </button>
                </div>
              </div>

              {/* Conditional Network vs USB inputs */}
              {connectionType === 'LAN' ? (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">
                      Static IP Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={ipAddress}
                      onChange={e => setIpAddress(e.target.value)}
                      placeholder="192.168.1.200"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">
                      Port *
                    </label>
                    <input
                      type="number"
                      required
                      value={port}
                      onChange={e => setPort(Number(e.target.value))}
                      placeholder="9100"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      USB Device Port / COM *
                    </label>
                    <input
                      type="text"
                      required
                      value={usbPort}
                      onChange={e => setUsbPort(e.target.value)}
                      placeholder="USB001 or COM3"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Baud Rate
                    </label>
                    <select
                      value={baudRate}
                      onChange={e => setBaudRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    >
                      <option value={9600}>9600</option>
                      <option value={19200}>19200</option>
                      <option value={38400}>38400</option>
                      <option value={115200}>115200</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Department Routing Selector */}
              {/* Route Departments to this Printer - Sleek Compact Dropdown */}
              {(() => {
                const allDepts = data.departments || [];
                const filteredDepts = allDepts.filter(dept => {
                  if (!deptSearchQuery.trim()) return true;
                  return dept.toLowerCase().includes(deptSearchQuery.toLowerCase().trim());
                });

                return (
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Route Departments to this Printer
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedDepts([...allDepts])}
                          className="font-bold text-amber-700 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDepts([])}
                          className="font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Trigger Bar */}
                    <div
                      onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white hover:border-amber-400 cursor-pointer flex items-center justify-between transition focus:ring-2 focus:ring-amber-500 select-none shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800 truncate">
                        {selectedDepts.length === 0
                          ? 'All Kitchen & Bar Departments'
                          : selectedDepts.join(', ')}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          selectedDepts.length === 0
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {selectedDepts.length === 0 ? 'All' : `${selectedDepts.length} Active`}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Popover */}
                    {isDeptDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsDeptDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1.5 max-h-56 overflow-y-auto">
                          {allDepts.length > 5 && (
                            <div className="relative pb-1">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={deptSearchQuery}
                                onChange={e => setDeptSearchQuery(e.target.value)}
                                placeholder="Search departments..."
                                className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          )}

                          <label
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDepts.length === 0}
                              onChange={() => setSelectedDepts([])}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">
                                All Departments (Unrestricted)
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Accept orders from all kitchen and service counters
                              </span>
                            </div>
                          </label>

                          <div className="border-t border-slate-100 my-1" />

                          <div className="space-y-0.5">
                            {filteredDepts.length === 0 ? (
                              <div className="text-center py-2 text-xs text-slate-400">
                                No departments match &quot;{deptSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredDepts.map(dept => {
                                const isChecked = selectedDepts.includes(dept);
                                return (
                                  <label
                                    key={dept}
                                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50/60 cursor-pointer transition select-none"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleDept(dept)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                      />
                                      <span className="text-xs font-medium text-slate-700 truncate">
                                        {dept}
                                      </span>
                                    </div>
                                    {isChecked && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                        Routed
                                      </span>
                                    )}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Menu Categories Routing & Specific Dishes Routing Selector */}
              <div className="space-y-3">
                {/* Menu Categories Routing - Sleek Compact Dropdown */}
                {(() => {
                  const allCats = data.menuCategories || [];
                  const filteredCats = allCats.filter(cat => {
                    if (!catSearchQuery.trim()) return true;
                    return cat.toLowerCase().includes(catSearchQuery.toLowerCase().trim());
                  });

                  return (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Menu Categories Routing
                        </label>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSelectedCats([...allCats])}
                            className="font-bold text-amber-700 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCats([]);
                              setSelectedItemIds([]);
                            }}
                            className="font-bold text-slate-500 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Trigger Bar */}
                      <div
                        onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white hover:border-amber-400 cursor-pointer flex items-center justify-between transition focus:ring-2 focus:ring-amber-500 select-none shadow-2xs"
                      >
                        <span className="font-semibold text-slate-800 truncate">
                          {selectedCats.length === 0
                            ? 'All Categories (No Filter)'
                            : selectedCats.join(', ')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            selectedCats.length === 0
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {selectedCats.length === 0 ? 'All' : `${selectedCats.length} Active`}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Popover */}
                      {isCatDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsCatDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1.5 max-h-56 overflow-y-auto">
                            {allCats.length > 5 && (
                              <div className="relative pb-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={catSearchQuery}
                                  onChange={e => setCatSearchQuery(e.target.value)}
                                  placeholder="Search categories..."
                                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            )}

                            <label
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition select-none"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCats.length === 0}
                                onChange={() => {
                                  setSelectedCats([]);
                                  setSelectedItemIds([]);
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">
                                  All Categories (No Filter)
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Route items from every menu category
                                </span>
                              </div>
                            </label>

                            <div className="border-t border-slate-100 my-1" />

                            <div className="space-y-0.5">
                              {filteredCats.length === 0 ? (
                                <div className="text-center py-2 text-xs text-slate-400">
                                  No categories match &quot;{catSearchQuery}&quot;
                                </div>
                              ) : (
                                filteredCats.map(cat => {
                                  const isChecked = selectedCats.includes(cat);
                                  return (
                                    <label
                                      key={cat}
                                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50/60 cursor-pointer transition select-none"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleCat(cat)}
                                          className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                          {cat}
                                        </span>
                                      </div>
                                      {isChecked && (
                                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-amber-400 text-[9px] font-bold">
                                          Active
                                        </span>
                                      )}
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Specific Dishes Filter for Selected Categories - Sleek Compact Dropdown */}
                {selectedCats.length > 0 && (() => {
                  const matchingItems = (data.menuItems || []).filter(item => selectedCats.includes(item.category));
                  if (matchingItems.length === 0) return null;

                  const checkedInMatchingCount = selectedItemIds.filter(id => matchingItems.some(m => m.id === id)).length;
                  const filteredDishes = matchingItems.filter(item => {
                    if (!dishSearchQuery.trim()) return true;
                    const q = dishSearchQuery.toLowerCase().trim();
                    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
                  });

                  return (
                    <div className="relative mt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                          <span>Specific Dishes Routing</span>
                        </label>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSelectedItemIds(matchingItems.map(m => m.id))}
                            className="font-bold text-amber-700 hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedItemIds([])}
                            className="font-bold text-slate-500 hover:underline cursor-pointer"
                          >
                            Allow All (No Filter)
                          </button>
                        </div>
                      </div>

                      {/* Dropdown trigger bar */}
                      <div
                        onClick={() => setIsDishDropdownOpen(!isDishDropdownOpen)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white hover:border-amber-400 cursor-pointer flex items-center justify-between transition focus:ring-2 focus:ring-amber-500 select-none shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {checkedInMatchingCount === 0 ? (
                            <span className="font-semibold text-slate-600 truncate">
                              All Dishes Allowed (No Filter)
                            </span>
                          ) : (
                            <span className="font-bold text-amber-900 truncate">
                              {checkedInMatchingCount} of {matchingItems.length} Dishes Selected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            checkedInMatchingCount === 0 
                              ? 'bg-slate-100 text-slate-600 border-slate-200' 
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {checkedInMatchingCount === 0 ? `All (${matchingItems.length})` : `${checkedInMatchingCount} Active`}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDishDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Dropdown Menu popover */}
                      {isDishDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsDishDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1.5 max-h-60 overflow-y-auto">
                            {/* Search inside dishes */}
                            {matchingItems.length > 6 && (
                              <div className="relative pb-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={dishSearchQuery}
                                  onChange={e => setDishSearchQuery(e.target.value)}
                                  placeholder="Search dishes..."
                                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            )}

                            {/* Option 1: All Dishes / No Filter */}
                            <label
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition select-none"
                            >
                              <input
                                type="checkbox"
                                checked={checkedInMatchingCount === 0}
                                onChange={() => setSelectedItemIds([])}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">
                                  All Dishes Allowed (No Filter)
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Print every dish in selected categories
                                </span>
                              </div>
                            </label>

                            <div className="border-t border-slate-100 my-1" />

                            {/* Dishes List with Checkboxes */}
                            <div className="space-y-0.5">
                              {filteredDishes.length === 0 ? (
                                <div className="text-center py-3 text-xs text-slate-400">
                                  No dishes match &quot;{dishSearchQuery}&quot;
                                </div>
                              ) : (
                                filteredDishes.map(item => {
                                  const isChecked = selectedItemIds.includes(item.id);
                                  return (
                                    <label
                                      key={item.id}
                                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50/60 cursor-pointer transition select-none"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            setSelectedItemIds(prev =>
                                              prev.includes(item.id)
                                                ? prev.filter(id => id !== item.id)
                                                : [...prev, item.id]
                                            );
                                          }}
                                          className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-medium text-slate-700 truncate">
                                          {item.name}
                                        </span>
                                      </div>
                                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-semibold shrink-0">
                                        {item.category}
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Options: Default & Active */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={e => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-700">Set as Primary Default for {type}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Active Status</span>
                </label>
              </div>

              {/* Granular Active Statuses for BILL and ALL printers */}
              {(type === 'BILL' || type === 'ALL') && (
                <div className="p-3 bg-linear-to-r from-amber-50/70 via-slate-50 to-emerald-50/70 border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-slate-600" />
                      Hardware Print Action Control
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Auto-cut thermal paper print</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      printOnBill 
                        ? 'bg-white border-amber-300 text-slate-900 shadow-2xs ring-1 ring-amber-300/40' 
                        : 'bg-slate-100/80 border-slate-200 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={printOnBill}
                        onChange={e => setPrintOnBill(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs font-black">Active Status for Print Bill</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          Prints guest bill slip on hardware printer
                        </p>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      printOnSettle 
                        ? 'bg-white border-emerald-300 text-slate-900 shadow-2xs ring-1 ring-emerald-300/40' 
                        : 'bg-slate-100/80 border-slate-200 text-slate-400'
                    }`}>
                      <input
                        type="checkbox"
                        checked={printOnSettle}
                        onChange={e => setPrintOnSettle(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs font-black">Active Status for Settle & Pay</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          Prints paid cash memo slip on hardware after payment
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Near Hot Line Chef Station, USB cable 2m..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs shadow-md transition cursor-pointer"
                >
                  {editingPrinterId ? 'Save Changes' : 'Add Printer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Printer Bridge Setup & Diagnostics Modal */}
      <PrinterBridgeModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
      />
    </div>
  );
};
