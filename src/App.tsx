import React, { useState, useRef, useEffect } from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { ActiveTab } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosBillingView } from './components/pos/PosBillingView';
import { MenuItemsView } from './components/menu/MenuItemsView';
import { SalesLedgerView } from './components/sales/SalesLedgerView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { PayablesView } from './components/payables/PayablesView';
import { ReceivablesView } from './components/receivables/ReceivablesView';
import { RawItemsMasterView } from './components/inventory/RawItemsMasterView';
import { StockValuationView } from './components/inventory/StockValuationView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { HeadsConfigView } from './components/config/HeadsConfigView';
import { DataCleanupView } from './components/danger/DataCleanupView';
import { HRView } from './components/hr/HRView';
import { JournalEntryView } from './components/accounts/JournalEntryView';
import { LauncherHomeView } from './components/launcher/LauncherHomeView';

// Modals
import { StartSessionModal } from './components/pos/StartSessionModal';
import { CloseSessionModal } from './components/pos/CloseSessionModal';
import { WaiterShiftModal } from './components/pos/WaiterShiftModal';
import { ChefShiftModal } from './components/pos/ChefShiftModal';
import { ShiftZReportModal } from './components/pos/ShiftZReportModal';
import { ConsolidatedDayZReportModal } from './components/pos/ConsolidatedDayZReportModal';
import { SplitPaymentModal } from './components/pos/SplitPaymentModal';
import { ThermalBillModal } from './components/pos/ThermalBillModal';
import { AIChefAssistantModal } from './components/ai/AIChefAssistantModal';
import { TableZoneEditModal } from './components/pos/TableZoneEditModal';
import { AuthPage } from './components/auth/AuthPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShieldAlert, LogOut, Power, Home } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    data,
    isStartSessionModalOpen, 
    setIsStartSessionModalOpen,
    isCloseSessionModalOpen,
    isWaiterShiftModalOpen,
    isChefShiftModalOpen,
    selectedZReportSession,
    selectedDayEndPreview,
    activeSettlingTable,
    printableReceipt,
    canAccessTab,
    currentUser,
    logout,
    language,
    isTableZoneModalOpen
  } = useRestaurant();

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterSidebar = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsSidebarOpen(true);
  };

  const handleMouseLeaveSidebar = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 200);
  };

  // Shift condition: Only Live POS ('pos') requires an active shift session (cash open / day start).
  // When shift is closed/not active, everyone (including Waiter and Chef) is redirected to launcher if trying to access 'pos'.
  useEffect(() => {
    if (currentUser && activeTab === 'pos') {
      if (!data.session?.isActive) {
        setActiveTab('launcher');
      }
    }
  }, [currentUser, data.session?.isActive, activeTab, setActiveTab]);

  // If user is not authenticated, show production-grade AuthPage gateway
  if (!currentUser) {
    return <AuthPage />;
  }

  // If activeTab is launcher, render full-screen Launchpad Kiosk
  if (activeTab === 'launcher') {
    return (
      <div className="min-h-screen bg-slate-100 font-sans antialiased text-slate-800">
        <LauncherHomeView onOpenAiAssistant={() => setIsAiAssistantOpen(true)} />

        {/* Modals & Dialogs */}
        {isStartSessionModalOpen && <StartSessionModal />}
        {isCloseSessionModalOpen && <CloseSessionModal />}
        {isWaiterShiftModalOpen && <WaiterShiftModal />}
        {isChefShiftModalOpen && <ChefShiftModal />}
        {selectedZReportSession && <ShiftZReportModal />}
        {selectedDayEndPreview && <ConsolidatedDayZReportModal />}
        {activeSettlingTable && <SplitPaymentModal />}
        {printableReceipt && <ThermalBillModal key={printableReceipt.invoiceNo || 'receipt'} />}
        {isTableZoneModalOpen && <TableZoneEditModal />}
        {isAiAssistantOpen && <AIChefAssistantModal onClose={() => setIsAiAssistantOpen(false)} />}
      </div>
    );
  }

  const hasAccess = canAccessTab(activeTab);

  const primaryAllowedTab: ActiveTab = (() => {
    if (!currentUser) return 'pos';
    if (!data.session?.isActive) return 'launcher';
    if (currentUser.role === 'CHEF') return 'menu-items';
    if (currentUser.role === 'WAITER' || currentUser.role === 'CASHIER') return 'pos';
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') return 'dashboard';
    if (currentUser.permissions && currentUser.permissions.length > 0) return currentUser.permissions[0];
    return 'launcher';
  })();

  const primaryAllowedTabLabel = (() => {
    switch (primaryAllowedTab) {
      case 'menu-items':
        return 'Go to Menu & Recipes';
      case 'sales':
        return 'Go to Sales Invoices & Memos';
      case 'pos':
        return 'Return to Live POS';
      case 'dashboard':
        return 'Go to Dashboard';
      default:
        return 'Go to My Workspace';
    }
  })();

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 flex font-sans antialiased text-slate-800 selection:bg-[#004b9b] selection:text-white relative">
      {/* Invisible Left Edge Hover Zone for Desktop: Hovering mouse on left edge opens sidebar smoothly */}
      <div 
        onMouseEnter={handleMouseEnterSidebar}
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-30 transition-all ${
          isSidebarOpen ? 'w-0 pointer-events-none' : 'w-3.5 hover:w-5 cursor-pointer'
        }`}
        title="Hover mouse here to open menu"
      />

      {/* Mobile Dark Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer Container: Fixed slide-over on Mobile (<md), Side-by-side push on Desktop (>=md) */}
      <div 
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-20 h-full shrink-0 overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen 
            ? 'w-72 translate-x-0' 
            : '-translate-x-full md:translate-x-0 md:w-0'
        }`}
      >
        <div className="w-72 h-full flex flex-col overflow-hidden">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onCloseMobile={() => setIsSidebarOpen(false)} 
          />
        </div>
      </div>

      {/* Main Container - Always 100% viewport height */}
      <div className="flex-1 h-screen h-[100dvh] max-h-[100dvh] flex flex-col min-w-0 w-full overflow-hidden transition-all duration-300 ease-in-out">
        {/* Top Header - Always docked at top */}
        <Header onOpenMobileSidebar={() => setIsSidebarOpen(prev => !prev)} />

        {/* Page View Body */}
        <main 
          className={`flex-1 min-h-0 w-full ${
            activeTab === 'pos' 
              ? 'overflow-hidden flex flex-col' 
              : 'overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
          } transition-all duration-300 ease-in-out`}
        >
          <div className={`w-full max-w-[1920px] mx-auto px-2 sm:px-5 lg:px-6 ${
            activeTab === 'pos' 
              ? 'pt-1 pb-1 sm:pt-1.5 sm:pb-2.5 flex flex-col flex-1 min-h-0 h-full' 
              : 'py-3 sm:py-5 lg:py-6'
          }`}>
            {!hasAccess ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-sm space-y-4 my-12">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Access Restricted by RBAC Policy</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your role <span className="font-bold text-purple-700 font-mono">({currentUser?.role || 'GUEST'})</span> does not have permission to access the <strong>{activeTab}</strong> module.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab(primaryAllowedTab)}
                    className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                  >
                    {primaryAllowedTabLabel}
                  </button>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'pos' && <PosBillingView />}
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'menu-items' && <MenuItemsView />}
                {activeTab === 'sales' && <SalesLedgerView />}
                {activeTab === 'expenses' && <ExpensesView />}
                {activeTab === 'purchases' && <PurchasesView />}
                {activeTab === 'payables' && <PayablesView />}
                {activeTab === 'receivables' && <ReceivablesView />}
                {activeTab === 'inv-items' && <RawItemsMasterView />}
                {activeTab === 'inventory' && <StockValuationView />}
                {activeTab === 'hr' && <HRView />}
                {activeTab === 'journal' && <JournalEntryView />}
                {activeTab === 'reports' && <ReportsView />}
                {activeTab === 'users' && <UsersView />}
                {activeTab === 'heads' && <HeadsConfigView />}
                {activeTab === 'data-cleanup' && <DataCleanupView />}
              </>
            )}
          </div>
        </main>

        {/* Bottom Bar with Main Menu / Home Button - Seamless background matching main page */}
        <footer className="h-9 sm:h-10 bg-slate-100 shrink-0 z-20">
          <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-6 h-full flex items-center justify-end">
            <div className="flex items-center p-0.5 bg-white border border-slate-200 rounded-sm shadow-2xs">
              <button
                type="button"
                id="btn-footer-launcher-home"
                onClick={() => setActiveTab('launcher')}
                title="Main Menu"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xs bg-[#004b9b] hover:bg-[#005bb8] active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals & Dialogs */}
      {isStartSessionModalOpen && <StartSessionModal />}
      {isCloseSessionModalOpen && <CloseSessionModal />}
      {isWaiterShiftModalOpen && <WaiterShiftModal />}
      {isChefShiftModalOpen && <ChefShiftModal />}
      {selectedZReportSession && <ShiftZReportModal />}
      {selectedDayEndPreview && <ConsolidatedDayZReportModal />}
      {activeSettlingTable && <SplitPaymentModal />}
      {printableReceipt && <ThermalBillModal key={printableReceipt.invoiceNo || 'receipt'} />}
      {isTableZoneModalOpen && <TableZoneEditModal />}
      {isAiAssistantOpen && <AIChefAssistantModal onClose={() => setIsAiAssistantOpen(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <RestaurantProvider>
        <MainLayout />
      </RestaurantProvider>
    </ErrorBoundary>
  );
}
