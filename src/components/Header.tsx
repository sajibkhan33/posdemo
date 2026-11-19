import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { 
  Clock, 
  LogOut, 
  ChevronDown, 
  LayoutGrid,
  Home,
  Printer,
  Menu
} from 'lucide-react';
import logo4 from '../image/logo4.png';
import { PrinterBridgeModal } from './common/PrinterBridgeModal';

export const Header: React.FC<{ onOpenMobileSidebar?: () => void }> = ({ 
  onOpenMobileSidebar = () => {} 
}) => {
  const { 
    data, 
    activeTab,
    setActiveTab, 
    currentUser, 
    logout,
    language,
    t,
    setIsTableZoneModalOpen
  } = useRestaurant();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isPrinterOnline, setIsPrinterOnline] = useState<boolean | null>(null);

  const checkPrinterHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:9123/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        setIsPrinterOnline(true);
        return;
      }
    } catch {
      // Fallback to cloud bridge heartbeat check
    }

    try {
      const cRes = await fetch('/api/print-bridge/status', {
        signal: AbortSignal.timeout(3000)
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        setIsPrinterOnline(Boolean(cData.isAgentOnline));
        return;
      }
    } catch {
      // ignore
    }
    setIsPrinterOnline(false);
  };

  useEffect(() => {
    checkPrinterHealth();
    const interval = setInterval(checkPrinterHealth, 10000);
    const onStatusChanged = (e: any) => {
      if (typeof e.detail?.online === 'boolean') {
        setIsPrinterOnline(e.detail.online);
      } else {
        checkPrinterHealth();
      }
    };
    window.addEventListener('printer-status-changed', onStatusChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('printer-status-changed', onStatusChanged);
    };
  }, []);

  const handleMouseEnterUser = () => {
    if (userDropdownTimeoutRef.current) {
      clearTimeout(userDropdownTimeoutRef.current);
      userDropdownTimeoutRef.current = null;
    }
    setIsUserDropdownOpen(true);
  };

  const handleMouseLeaveUser = () => {
    if (userDropdownTimeoutRef.current) {
      clearTimeout(userDropdownTimeoutRef.current);
    }
    userDropdownTimeoutRef.current = setTimeout(() => {
      setIsUserDropdownOpen(false);
    }, 150);
  };

  const clockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      if (clockRef.current) {
        clockRef.current.textContent = `${dateStr} • ${timeStr}`;
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'WAITER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CHEF':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-14 sm:h-16 shrink-0 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="w-full max-w-[1920px] mx-auto px-2.5 sm:px-5 lg:px-6 h-full flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Hamburger menu toggle + Brand info & Time Display */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            id="btn-mobile-sidebar-toggle"
            onClick={onOpenMobileSidebar}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-tight flex items-center gap-1.5 truncate">
              <img 
                src={logo4} 
                alt="BD HOSTT" 
                className="h-4 sm:h-6 w-auto object-contain select-none shrink-0" 
              />
              <span className="text-slate-300 font-normal hidden xs:inline">/</span>
              <span className="text-slate-800 font-bold truncate max-w-[110px] xs:max-w-[180px] sm:max-w-xs">{data.restaurantProfile?.name || 'Restaurant POS'}</span>
            </div>
            <div className="text-[7.5px] sm:text-[8.5px] text-slate-400 font-medium flex items-center gap-1 tracking-tight mt-0.5 select-none truncate">
              <Clock className="w-2 h-2 text-[#004b9b] shrink-0" />
              <span ref={clockRef} className="truncate"></span>
            </div>
          </div>
        </div>

      {/* Right: Actions & Session */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Printer Bridge Live Status & Quick Action Button */}
        <button
          type="button"
          id="btn-printer-bridge-status"
          onClick={() => setIsPrinterModalOpen(true)}
          className={`h-8 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-bold shadow-2xs transition cursor-pointer ${
            isPrinterOnline
              ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800'
          }`}
          title={isPrinterOnline ? 'Printer Bridge Active (Click to inspect or test)' : 'Printer Agent Offline (Click to install / download)'}
        >
          <span className="relative flex h-2 w-2">
            {isPrinterOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPrinterOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <Printer className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">{isPrinterOnline ? 'Printer OK' : 'Printer Offline'}</span>
        </button>

        {/* Return to Main Launchpad Home Button */}
        <button
          type="button"
          id="btn-nav-launcher-home"
          onClick={() => setActiveTab('launcher')}
          className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs transition cursor-pointer"
          title="Return to Main Launchpad / Home Grid"
        >
          <Home className="w-3.5 h-3.5 text-[#004b9b]" />
          <span className="hidden md:inline">Main Menu</span>
        </button>

        {/* Table & Zone Edit button (only shown to admin) */}
        {currentUser?.role === 'ADMIN' && (
          <button
            type="button"
            id="btn-table-zone-edit-header"
            onClick={() => setIsTableZoneModalOpen(true)}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-blue-700/40 bg-[#004b9b] hover:bg-[#005bb8] text-white text-xs font-bold shadow-xs transition cursor-pointer animate-in fade-in"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
            <span>Table & Zone Edit</span>
          </button>
        )}

        {/* User Account / Profile Menu (Opens on hover, collapses on mouse off) */}
        <div 
          className="relative"
          onMouseEnter={handleMouseEnterUser}
          onMouseLeave={handleMouseLeaveUser}
        >
          <button
            type="button"
            id="btn-user-switcher"
            onClick={() => setIsUserDropdownOpen(prev => !prev)}
            className="h-8 flex items-center gap-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-slate-700 text-xs font-bold cursor-pointer shadow-2xs"
          >
            <div className="w-5 h-5 rounded-md bg-[#004b9b] text-white font-black flex items-center justify-center text-[10px] shadow-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex items-center gap-1.5 text-left hidden md:flex">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {currentUser?.name || 'Guest'}
              </span>
              <span className="text-[10px] text-[#004b9b] font-black uppercase tracking-tight bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 leading-none">
                {currentUser?.role || 'NO ROLE'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180 text-[#004b9b]' : ''}`} />
          </button>

          {/* Hover / Click Dropdown Prompt (Short, Compact & Auto-collapsing) */}
          {isUserDropdownOpen && (
            <div 
              role="menu"
              className="absolute right-0 top-full pt-1 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-2">
                {/* Short Compact User Info */}
                <div className="flex items-center gap-2 px-1.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-6 h-6 rounded-md bg-[#004b9b] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {currentUser?.name}
                    </div>
                    <div className="text-[9px] font-semibold text-[#004b9b] uppercase">
                      {currentUser?.role}
                    </div>
                  </div>
                </div>

                {/* Direct Log Out Button */}
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Printer Bridge Live Inspection & Download Modal */}
      <PrinterBridgeModal
        isOpen={isPrinterModalOpen}
        onClose={() => {
          setIsPrinterModalOpen(false);
          checkPrinterHealth();
        }}
      />
    </header>
  );
};
