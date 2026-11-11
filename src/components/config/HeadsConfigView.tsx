import React, { useState } from 'react';
import { useRestaurant, DEFAULT_PAYMENT_METHODS, getNextAccountCode, resolveExpenseAccount, CANONICAL_EXPENSE_HEAD_MAP, getAccountSystemRole } from '../../context/RestaurantContext';
import { AccountHead, AccountType, AccountSystemRole, RestaurantProfile, CommissionAgent } from '../../types';
import { PrintersConfigView } from './PrintersConfigView';
import { PrintTemplatesConfigView } from './PrintTemplatesConfigView';
import { PaymentMethodsConfigView } from './PaymentMethodsConfigView';
import { SerialConfigView } from './SerialConfigView';
import { 
  CreditCard,
  Hash,
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Grid, 
  Users, 
  Truck, 
  Layers, 
  Tag, 
  Wallet, 
  UserCheck, 
  Utensils, 
  BookOpen, 
  Search, 
  MapPin, 
  Building2,
  Upload,
  Image as ImageIcon,
  Coffee,
  ChefHat,
  Crown,
  Store,
  Flame,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Camera,
  Globe,
  RefreshCw,
  Receipt,
  Percent,
  Sliders,
  Printer,
  AlertTriangle
} from 'lucide-react';

export const HeadsConfigView: React.FC = () => {
  const { 
    data, 
    addConfigItem, 
    editConfigItem, 
    removeConfigItem,
    addAccountHead,
    editAccountHead,
    deleteAccountHead,
    getLiveAccountBalance,
    metrics,
    addCustomTable,
    editCustomTable,
    deleteCustomTable,
    addTableZone,
    editTableZone,
    deleteTableZone,
    updateRestaurantProfile,
    addCommissionAgent,
    updateCommissionAgent,
    deleteCommissionAgent,
    activeSubNav,
    setActiveSubNav,
    language,
    t
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'profile' | 'heads' | 'coa' | 'agents' | 'printers' | 'templates' | 'payments' | 'vat'>(() => {
    if (activeSubNav === 'coa' || activeSubNav === 'chart-of-accounts') return 'coa';
    if (activeSubNav === 'payments' || activeSubNav === 'payment-methods') return 'payments';
    if (activeSubNav === 'heads') return 'heads';
    if (activeSubNav === 'agents') return 'agents';
    if (activeSubNav === 'printers') return 'printers';
    if (activeSubNav === 'templates') return 'templates';
    if (activeSubNav === 'vat' || activeSubNav === 'vat-tax') return 'vat';
    return 'profile';
  });

  React.useEffect(() => {
    if (activeSubNav === 'coa' || activeSubNav === 'chart-of-accounts') {
      setActiveTab('coa');
    } else if (activeSubNav === 'payments' || activeSubNav === 'payment-methods') {
      setActiveTab('payments');
    } else if (activeSubNav === 'profile') {
      setActiveTab('profile');
    } else if (activeSubNav === 'heads') {
      setActiveTab('heads');
    } else if (activeSubNav === 'agents') {
      setActiveTab('agents');
    } else if (activeSubNav === 'printers') {
      setActiveTab('printers');
    } else if (activeSubNav === 'templates') {
      setActiveTab('templates');
    } else if (activeSubNav === 'vat' || activeSubNav === 'vat-tax') {
      setActiveTab('vat');
    } else if (!activeSubNav) {
      setActiveTab('profile');
    }
  }, [activeSubNav]);

  const switchTab = (tab: 'profile' | 'heads' | 'coa' | 'agents' | 'printers' | 'templates' | 'payments' | 'vat' | 'serials') => {
    setActiveTab(tab);
    setActiveSubNav(tab);
  };

  // Commission Agent Modal State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CommissionAgent | null>(null);
  const [agentForm, setAgentForm] = useState<{
    id?: string;
    name: string;
    commissionPercent: number;
    priceListMultiplier: number;
    contactPerson: string;
    phone: string;
    isActive: boolean;
  }>({
    name: '',
    commissionPercent: 15,
    priceListMultiplier: 1.15,
    contactPerson: '',
    phone: '',
    isActive: true
  });

  // Restaurant Profile & Logo State
  const [profileForm, setProfileForm] = useState<RestaurantProfile>({
    name: data.restaurantProfile?.name || 'BD HOSTT POS',
    tagline: data.restaurantProfile?.tagline || 'Restaurant POS & Recipe BOM ERP',
    logoUrl: data.restaurantProfile?.logoUrl || '',
    logoType: data.restaurantProfile?.logoType || 'preset',
    presetIcon: data.restaurantProfile?.presetIcon || 'flame',
    address: data.restaurantProfile?.address || 'Chattogram, Bangladesh',
    phone: data.restaurantProfile?.phone || '+880 1756-007600',
    email: data.restaurantProfile?.email || 'bdhosttpos@gmail.com',
    binOrVat: data.restaurantProfile?.binOrVat || '0029381-01',
    currencySymbol: data.restaurantProfile?.currencySymbol || '৳',
    vatPercent: data.restaurantProfile?.vatPercent ?? 5,
    vatMode: data.restaurantProfile?.vatMode || 'inclusive',
    enableVat: data.restaurantProfile?.enableVat ?? true
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [vatSavedSuccess, setVatSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (data.restaurantProfile) {
      setProfileForm(prev => ({
        ...prev,
        name: data.restaurantProfile?.name || prev.name,
        tagline: data.restaurantProfile?.tagline || prev.tagline,
        logoUrl: data.restaurantProfile?.logoUrl ?? prev.logoUrl,
        logoType: data.restaurantProfile?.logoType || prev.logoType,
        presetIcon: data.restaurantProfile?.presetIcon || prev.presetIcon,
        address: data.restaurantProfile?.address || prev.address,
        phone: data.restaurantProfile?.phone || prev.phone,
        email: data.restaurantProfile?.email || prev.email,
        binOrVat: data.restaurantProfile?.binOrVat || prev.binOrVat,
        currencySymbol: data.restaurantProfile?.currencySymbol || prev.currencySymbol,
        vatPercent: data.restaurantProfile?.vatPercent ?? prev.vatPercent,
        vatMode: data.restaurantProfile?.vatMode || prev.vatMode,
        enableVat: data.restaurantProfile?.enableVat ?? prev.enableVat
      }));
    }
  }, [data.restaurantProfile]);

  const handleSaveVatPage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateRestaurantProfile({
      enableVat: profileForm.enableVat,
      vatPercent: profileForm.vatPercent,
      vatMode: profileForm.vatMode,
      binOrVat: profileForm.binOrVat
    });
    setVatSavedSuccess(true);
    setTimeout(() => {
      setVatSavedSuccess(false);
    }, 3000);
  };

  const presetIcons = [
    { id: 'flame', label: 'Flame / Grill', icon: Flame, color: 'from-amber-600 to-amber-400' },
    { id: 'coffee', label: 'Coffee & Cafe', icon: Coffee, color: 'from-amber-700 to-yellow-600' },
    { id: 'utensils', label: 'Dine & Fork', icon: Utensils, color: 'from-emerald-600 to-teal-500' },
    { id: 'chef', label: 'Chef Hat', icon: ChefHat, color: 'from-indigo-600 to-violet-500' },
    { id: 'crown', label: 'VIP Lounge', icon: Crown, color: 'from-amber-500 to-yellow-400' },
    { id: 'store', label: 'Storefront', icon: Store, color: 'from-blue-600 to-cyan-500' },
    { id: 'sparkles', label: 'Premium Gold', icon: Sparkles, color: 'from-rose-600 to-amber-500' },
  ];

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Logo file size must be less than 3 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Str = uploadEvent.target?.result as string;
        setProfileForm(prev => ({
          ...prev,
          logoUrl: base64Str,
          logoType: 'custom'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurantProfile(profileForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Input states for Master Heads
  const [inputVal, setInputVal] = useState<Record<string, string>>({
    tables: '',
    tableZones: '',
    waiters: '',
    vendors: '',
    purchaseCategories: '',
    departments: '',
    menuCategories: '',
    expenseHeads: '',
    customers: ''
  });

  const [selectedZoneForNewTable, setSelectedZoneForNewTable] = useState<string>(
    data.tableZones?.[0] || 'Floor 1'
  );

  // Inline editing state for Master Heads: { sectionId, index, text, extraZone }
  const [editingItem, setEditingItem] = useState<{ sectionId: string; index: number; text: string; extraZone?: string } | null>(null);

  // Search filter for COA
  const [coaFilter, setCoaFilter] = useState<'ALL' | AccountType>('ALL');
  const [coaSearch, setCoaSearch] = useState('');

  // Modal states for Chart of Accounts
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountHead | null>(null);
  const [coaForm, setCoaForm] = useState<{
    code: string;
    name: string;
    type: AccountType;
    category: string;
    systemRole: AccountSystemRole;
    balance: number;
  }>({
    code: '',
    name: '',
    type: 'EXPENSE',
    category: 'Operating Expenses',
    systemRole: 'OPERATING_EXPENSE',
    balance: 0
  });

  const [justAddedSec, setJustAddedSec] = useState<string | null>(null);

  // In-app Delete Confirmation Modal State (replaces blocked native confirm)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    itemDescription: string;
    actionType: string;
    onConfirm: () => void;
  } | null>(null);

  const allZones = data.tableZones && data.tableZones.length > 0
    ? data.tableZones
    : ['Floor 1', 'Floor 2', 'VIP Lounge', 'Rooftop Garden'];

  React.useEffect(() => {
    if (allZones.length > 0 && !allZones.includes(selectedZoneForNewTable)) {
      setSelectedZoneForNewTable(allZones[0]);
    }
  }, [allZones, selectedZoneForNewTable]);

  const handleAdd = (type: string) => {
    const rawVal = inputVal[type];
    const val = rawVal?.trim();
    if (!val) {
      alert(language === 'bn' ? 'অনুগ্রহ করে একটি নাম লিখুন।' : 'Please enter a name first.');
      return;
    }

    const secObj = sections.find(s => s.id === type);
    const secTitle = secObj?.title || type;

    // Duplicate check across existing items in this section
    const currentItems = secObj?.items || [];
    if (currentItems.some(i => i.toLowerCase().trim() === val.toLowerCase().trim())) {
      alert(language === 'bn' ? `"${val}" ইতিমধ্যে "${secTitle}"-এ রয়েছে!` : `"${val}" already exists in ${secTitle}!`);
      return;
    }

    let success: boolean | void = false;
    if (type === 'tables') {
      success = addCustomTable(val, selectedZoneForNewTable || allZones[0]);
    } else if (type === 'tableZones') {
      success = addTableZone(val);
    } else {
      success = addConfigItem(type as any, val);
    }

    if (success !== false) {
      setInputVal(prev => ({ ...prev, [type]: '' }));
      setJustAddedSec(type);
      setTimeout(() => setJustAddedSec(null), 2500);
    }
  };

  const handleStartEdit = (sectionId: string, index: number, currentText: string, currentZone?: string) => {
    setEditingItem({ sectionId, index, text: currentText, extraZone: currentZone || allZones[0] });
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editingItem.text.trim()) return;
    if (editingItem.sectionId === 'tables') {
      editCustomTable(editingItem.index, editingItem.text.trim(), editingItem.extraZone);
    } else if (editingItem.sectionId === 'tableZones') {
      const oldZone = (data.tableZones || [])[editingItem.index];
      if (oldZone) editTableZone(oldZone, editingItem.text.trim());
    } else {
      editConfigItem(editingItem.sectionId as any, editingItem.index, editingItem.text.trim());
    }
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleDelete = (sectionId: string, index: number, name: string) => {
    const sectionObj = sections.find(s => s.id === sectionId);
    const secTitle = sectionObj?.title || 'Configuration Item';
    setDeleteConfirm({
      title: `Delete "${name}"?`,
      itemDescription: `Are you sure you want to remove this entry from ${secTitle}?`,
      actionType: secTitle,
      onConfirm: () => {
        if (sectionId === 'tables') {
          deleteCustomTable(index);
        } else if (sectionId === 'tableZones') {
          deleteTableZone(name);
        } else {
          removeConfigItem(sectionId as any, index);
        }
        setDeleteConfirm(null);
      }
    });
  };

  // COA modal handlers

  const handleOpenAddCoa = () => {
    setEditingAccount(null);
    const autoCode = getNextAccountCode('EXPENSE', chartList, 'Operating Expenses');
    setCoaForm({
      code: autoCode,
      name: '',
      type: 'EXPENSE',
      category: 'Operating Expenses',
      systemRole: 'OPERATING_EXPENSE',
      balance: 0
    });
    setIsCoaModalOpen(true);
  };

  const handleOpenEditCoa = (acc: AccountHead) => {
    setEditingAccount(acc);
    setCoaForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category,
      systemRole: acc.systemRole || getAccountSystemRole(acc),
      balance: acc.balance || 0
    });
    setIsCoaModalOpen(true);
  };

  const handleCoaTypeChange = (newType: AccountType) => {
    const defaultCat = 
      newType === 'ASSET' ? 'Current Assets' :
      newType === 'LIABILITY' ? 'Current Liabilities' :
      newType === 'EQUITY' ? 'Owner Equity' :
      newType === 'REVENUE' ? 'Food Sales Revenue' : 'Operating Expenses';
    const autoCode = getNextAccountCode(newType, chartList, defaultCat);
    const defaultRole: AccountSystemRole = 
      newType === 'ASSET' ? 'STANDARD' :
      newType === 'LIABILITY' ? 'STANDARD' :
      newType === 'EQUITY' ? 'OWNER_EQUITY' :
      newType === 'REVENUE' ? 'DINE_IN_REVENUE' : 'OPERATING_EXPENSE';

    setCoaForm(prev => ({
      ...prev,
      type: newType,
      category: defaultCat,
      code: autoCode,
      systemRole: defaultRole
    }));
  };

  const handleSaveCoa = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = coaForm.code.trim();
    const trimmedName = coaForm.name.trim();

    if (!trimmedName || !trimmedCode) {
      alert('Please enter both Account Code and Account Title.');
      return;
    }

    const codeConflict = chartList.some(a => 
      (a.code || '').trim() === trimmedCode && (!editingAccount || a.id !== editingAccount.id)
    );
    if (codeConflict) {
      alert(`Account Code "${trimmedCode}" already exists! Each account code must be strictly unique.`);
      return;
    }

    if (editingAccount) {
      editAccountHead(editingAccount.id, {
        code: trimmedCode,
        name: trimmedName,
        type: coaForm.type,
        category: coaForm.category.trim(),
        systemRole: coaForm.systemRole,
        balance: Number(coaForm.balance) || 0
      });
    } else {
      addAccountHead({
        code: trimmedCode,
        name: trimmedName,
        type: coaForm.type,
        category: coaForm.category.trim(),
        systemRole: coaForm.systemRole,
        balance: Number(coaForm.balance) || 0
      });
    }
    setIsCoaModalOpen(false);
  };

  const handleDeleteCoa = (acc: AccountHead) => {
    setDeleteConfirm({
      title: `Delete Account Head "${acc.code} - ${acc.name}"?`,
      itemDescription: `This will permanently remove the ledger account head (${acc.type} • ${acc.category}) from the Chart of Accounts.`,
      actionType: 'Chart of Accounts',
      onConfirm: () => {
        deleteAccountHead(acc.id);
        setDeleteConfirm(null);
      }
    });
  };

  // Commission Agent Handlers
  const handleOpenAddAgent = () => {
    setEditingAgent(null);
    setAgentForm({
      name: '',
      commissionPercent: 15,
      priceListMultiplier: 1.15,
      contactPerson: '',
      phone: '',
      isActive: true
    });
    setIsAgentModalOpen(true);
  };

  const handleOpenEditAgent = (agent: CommissionAgent) => {
    setEditingAgent(agent);
    setAgentForm({
      id: agent.id,
      name: agent.name,
      commissionPercent: agent.commissionPercent,
      priceListMultiplier: agent.priceListMultiplier || 1.15,
      contactPerson: agent.contactPerson || '',
      phone: agent.phone || '',
      isActive: agent.isActive !== undefined ? agent.isActive : true
    });
    setIsAgentModalOpen(true);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.name.trim()) return;

    if (editingAgent) {
      updateCommissionAgent(editingAgent.id, {
        name: agentForm.name.trim(),
        commissionPercent: Number(agentForm.commissionPercent) || 0,
        priceListMultiplier: Number(agentForm.priceListMultiplier) || 1.0,
        contactPerson: agentForm.contactPerson.trim(),
        phone: agentForm.phone.trim(),
        isActive: agentForm.isActive
      });
    } else {
      addCommissionAgent({
        name: agentForm.name.trim(),
        commissionPercent: Number(agentForm.commissionPercent) || 0,
        priceListMultiplier: Number(agentForm.priceListMultiplier) || 1.0,
        contactPerson: agentForm.contactPerson.trim(),
        phone: agentForm.phone.trim(),
        isActive: agentForm.isActive
      });
    }
    setIsAgentModalOpen(false);
  };

  const handleDeleteAgent = (agent: CommissionAgent) => {
    setDeleteConfirm({
      title: `Delete Commission Agent "${agent.name}"?`,
      itemDescription: `This will remove ${agent.name} (${agent.commissionPercent}% commission discount) from delivery channels and POS order billing.`,
      actionType: 'Commission Agent',
      onConfirm: () => {
        deleteCommissionAgent(agent.id);
        setDeleteConfirm(null);
      }
    });
  };

  const sections = [
    {
      id: 'tableZones',
      title: 'Floor Plan Zones',
      desc: 'Floor 1, Floor 2, VIP Lounge, Rooftop Garden',
      icon: MapPin,
      color: 'text-amber-700 bg-amber-50 border-amber-300',
      items: (data.tableZones && data.tableZones.length > 0) ? data.tableZones : ['Floor 1', 'Floor 2', 'VIP Lounge', 'Rooftop Garden']
    },
    {
      id: 'tables',
      title: 'Dining Tables',
      desc: 'Floor layout tables with assigned zones',
      icon: Grid,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      items: (data.tables || []).map(t => t.name),
      tableObjs: data.tables || []
    },
    {
      id: 'waiters',
      title: 'Waiters & Service Staff',
      desc: 'Floor stewards and order booking staff',
      icon: Users,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      items: data.waiters || []
    },
    {
      id: 'vendors',
      title: 'Vendors & Suppliers',
      desc: 'Poultry, meat, grocery, and packaging suppliers',
      icon: Truck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      items: data.vendors || []
    },
    {
      id: 'purchaseCategories',
      title: 'Raw Material Categories',
      desc: 'Grocery, Meat, Dairy, Bakery, Beverage ingredients',
      icon: Layers,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      items: data.purchaseCategories || []
    },
    {
      id: 'departments',
      title: 'Kitchen Departments',
      desc: 'Main Kitchen, Rooftop BBQ, Coffee & Mocktail Counter',
      icon: Utensils,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      items: data.departments || []
    },
    {
      id: 'menuCategories',
      title: 'Menu Categories',
      desc: 'Appetizers, Steaks, Biryani, Drinks, Desserts',
      icon: Tag,
      color: 'text-pink-600 bg-pink-50 border-pink-200',
      items: data.menuCategories || []
    },
    {
      id: 'expenseHeads',
      title: 'Head of Cost / Expense Heads',
      desc: 'Staff salary, cleaning, electricity, gas, conveyance',
      icon: Wallet,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      items: data.expenseHeads || []
    },
    {
      id: 'customers',
      title: 'Customer & Client Accounts',
      desc: 'Regular, corporate, and VIP customer accounts',
      icon: UserCheck,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      items: data.customers || []
    }
  ];

  const chartList = [...(data.chartOfAccounts || [])].sort((a, b) => 
    (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
  );
  const filteredAccounts = chartList.filter(acc => {
    const matchesType = coaFilter === 'ALL' || acc.type === coaFilter;
    const matchesSearch = !coaSearch || 
      acc.name.toLowerCase().includes(coaSearch.toLowerCase()) || 
      acc.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
      acc.category.toLowerCase().includes(coaSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getAccountTypeBadge = (type: AccountType) => {
    switch(type) {
      case 'ASSET': return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Asset (1000)</span>;
      case 'LIABILITY': return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Liability (2000)</span>;
      case 'EQUITY': return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Equity (3000)</span>;
      case 'REVENUE': return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Revenue (4000)</span>;
      case 'EXPENSE': return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Expense (5000/6000)</span>;
    }
  };

  // Dynamic Soft Color Badge for Categories / Non-System Role Heads
  const getDynamicCategoryBadgeStyle = (category: string) => {
    const norm = (category || '').toLowerCase().trim();
    if (norm.includes('staff') || norm.includes('advance') || norm.includes('employee')) {
      return 'bg-violet-50 text-violet-700 border-violet-200';
    }
    if (norm.includes('current asset')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (norm.includes('fixed') || norm.includes('depreciation') || norm.includes('equipment') || norm.includes('property')) {
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
    if (norm.includes('liability') || norm.includes('payable') || norm.includes('due') || norm.includes('loan')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (norm.includes('equity') || norm.includes('capital') || norm.includes('retained')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (norm.includes('revenue') || norm.includes('sales') || norm.includes('income')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (norm.includes('salary') || norm.includes('payroll') || norm.includes('wage')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (norm.includes('rent') || norm.includes('utility') || norm.includes('electricity') || norm.includes('gas') || norm.includes('water')) {
      return 'bg-teal-50 text-teal-700 border-teal-200';
    }
    if (norm.includes('tax') || norm.includes('vat') || norm.includes('statutory')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }

    const DYNAMIC_PALETTES = [
      'bg-violet-50 text-violet-700 border-violet-200',
      'bg-sky-50 text-sky-700 border-sky-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-slate-100 text-slate-700 border-slate-200',
    ];

    let hash = 0;
    for (let i = 0; i < norm.length; i++) {
      hash = norm.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % DYNAMIC_PALETTES.length;
    return DYNAMIC_PALETTES[idx];
  };

  const getAccountBadge = (acc: AccountHead | (Partial<AccountHead> & { name?: string; category?: string; systemRole?: AccountSystemRole; type?: AccountType })) => {
    const role = acc.systemRole || getAccountSystemRole(acc as AccountHead);

    // 1. Specific automated ERP system role
    if (role && role !== 'STANDARD') {
      switch (role) {
        case 'CASH':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Cash Drawer</span>;
        case 'PETTY_CASH':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">Petty Cash</span>;
        case 'BANK':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Bank A/C</span>;
        case 'MOBILE_BANKING':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200">MFS / Wallet</span>;
        case 'ACCOUNTS_RECEIVABLE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Customer Dues</span>;
        case 'INVENTORY_ASSET':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">Stock Inventory</span>;
        case 'ACCOUNTS_PAYABLE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Vendor Dues</span>;
        case 'CUSTOMER_ADVANCE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Customer Advance</span>;
        case 'TAX_PAYABLE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">VAT / Tax</span>;
        case 'OWNER_EQUITY':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">Owner Capital</span>;
        case 'RETAINED_EARNINGS':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">Retained Earnings</span>;
        case 'OWNER_DRAWINGS':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">Owner Drawings</span>;
        case 'DINE_IN_REVENUE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Dine-in Sales</span>;
        case 'DELIVERY_REVENUE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-300">Delivery Sales</span>;
        case 'BEVERAGE_REVENUE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-300">Beverage Sales</span>;
        case 'OPERATING_REVENUE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Sales Revenue</span>;
        case 'COGS':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">BOM / COGS</span>;
        case 'OPERATING_EXPENSE':
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">Operating Expense</span>;
      }
    }

    // 2. If STANDARD (or unlinked), dynamically generate soft color badge from Category
    const categoryLabel = (acc.category || '').trim();
    if (categoryLabel) {
      const style = getDynamicCategoryBadgeStyle(categoryLabel);
      return (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${style}`}>
          {categoryLabel}
        </span>
      );
    }

    // 3. Fallback for unclassified general accounts
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
        General Ledger
      </span>
    );
  };

  const getAccountSystemRoleBadge = (role: AccountSystemRole, category?: string) => {
    return getAccountBadge({ systemRole: role, category } as any);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header - Master Configurations & Hardware Setup (Hidden when viewing Payment Methods or Chart of Accounts) */}
      {activeTab !== 'payments' && activeTab !== 'coa' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Master Configurations & Hardware Setup
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage Floor Zones, Tables, Staff, Vendors, Categories, Expense Heads, and Hardware Routing with Add & Edit capability
                </p>
              </div>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => switchTab('profile')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-[#004b9b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>'Restaurant Profile & Logo'</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('heads')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'heads'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Master Heads (9 Modules)</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('agents')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'agents'
                  ? 'bg-[#004b9b] text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Commission Agents / Delivery ({(data.commissionAgents || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('printers')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'printers'
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Printers & Routing ({(data.printers || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('templates')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'templates'
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bill & KOT Templates ({(data.printTemplates || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('vat')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'vat'
                  ? 'bg-amber-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="VAT & Tax Configuration"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>VAT & Tax Configuration</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('serials')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'serials'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="KOT & POS Invoice Numbering Sequences"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Serial & Sequences</span>
            </button>
          </div>
        </div>
      )}

      {/* Restaurant Profile & Logo Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in">
          {savedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 font-bold text-sm shadow-xs animate-in slide-in-from-top">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  {language === 'bn' 
                    ? 'Restaurant profile and logo updated successfully!' 
                    : 'Restaurant Profile, Logo & Branding saved successfully!'}
                </span>
              </div>
              <span className="text-xs bg-emerald-200/80 px-2.5 py-1 rounded-lg">Active Everywhere</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Logo & Visual Assets (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Logo Setup Card */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      'Restaurant Logo & Icon'
                    </h3>
                    <p className="text-xs text-slate-500">
                      'Upload custom brand logo or select preset icon'
                    </p>
                  </div>
                </div>

                {/* Current Logo Preview Box */}
                <div className="p-4 bg-slate-950 rounded-2xl text-center border border-slate-800 flex flex-col items-center justify-center gap-3">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-1 flex items-center justify-center shadow-xl shadow-amber-500/20 text-slate-950 overflow-hidden relative group">
                    {profileForm.logoUrl ? (
                      <img 
                        src={profileForm.logoUrl} 
                        alt="Restaurant Logo Preview" 
                        className="w-full h-full object-contain rounded-xl bg-slate-900"
                      />
                    ) : profileForm.presetIcon === 'coffee' ? (
                      <Coffee className="w-12 h-12 text-slate-950" />
                    ) : profileForm.presetIcon === 'utensils' ? (
                      <Utensils className="w-12 h-12 text-slate-950" />
                    ) : profileForm.presetIcon === 'chef' ? (
                      <ChefHat className="w-12 h-12 text-slate-950" />
                    ) : profileForm.presetIcon === 'crown' ? (
                      <Crown className="w-12 h-12 text-slate-950" />
                    ) : profileForm.presetIcon === 'store' ? (
                      <Store className="w-12 h-12 text-slate-950" />
                    ) : profileForm.presetIcon === 'sparkles' ? (
                      <Sparkles className="w-12 h-12 text-slate-950" />
                    ) : (
                      <Flame className="w-12 h-12 text-slate-950" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-base tracking-tight">{profileForm.name || 'Restaurant Name'}</h4>
                    <p className="text-xs text-amber-400 font-medium">{profileForm.tagline || 'Tagline'}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                      {profileForm.logoUrl ? 'Custom Image Logo Active' : `Preset: ${(profileForm.presetIcon || 'flame').toUpperCase()}`}
                    </span>
                  </div>
                </div>

                {/* Option 1: File Upload */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>'1. Upload Logo from Device'</span>
                    <span className="text-[10px] text-slate-400 font-normal">PNG, JPG, WebP, SVG (&lt; 3MB)</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 rounded-2xl cursor-pointer transition text-center group">
                    <Upload className="w-6 h-6 text-amber-600 group-hover:scale-110 transition mb-1" />
                    <span className="text-xs font-bold text-slate-800 group-hover:text-amber-800">
                      'Click or Drag image file to upload'
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      'Will render on Sidebar, Header & Customer Thermal Bills'
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* Option 2: Image URL */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    '2. Or Paste Online Image URL'
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={profileForm.logoUrl}
                        onChange={e => setProfileForm(prev => ({ ...prev, logoUrl: e.target.value, logoType: e.target.value ? 'custom' : 'preset' }))}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    {profileForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, logoUrl: '', logoType: 'preset' }))}
                        className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                        title="Remove custom logo and use preset icon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Option 3: Preset Icons Selector */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">
                    '3. Preset Brand Icons (When no image is uploaded)'
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {presetIcons.map(p => {
                      const IconComp = p.icon;
                      const isSelected = profileForm.presetIcon === p.id && !profileForm.logoUrl;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProfileForm(prev => ({ ...prev, presetIcon: p.id as any, logoUrl: '', logoType: 'preset' }))}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-[#004b9b] border-[#004b9b] ring-2 ring-[#004b9b]/20 font-black'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${p.color} text-slate-950 flex items-center justify-center shadow-xs`}>
                            <IconComp className="w-4 h-4 text-slate-950" />
                          </div>
                          <span className="text-[10px] tracking-tight">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Restaurant Identity & Thermal Receipt Live Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Identity Form Card */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      'Restaurant Profile & Branch Info'
                    </h3>
                    <p className="text-xs text-slate-500">
                      'Used on Customer Bills, Invoices, and Reports'
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      'Restaurant Name' *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="BD HOSTT POS"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      'Tagline / Slogan'
                    </label>
                    <input
                      type="text"
                      value={profileForm.tagline}
                      onChange={e => setProfileForm(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="Restaurant POS & Recipe BOM ERP"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      'Branch Address'
                    </label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={e => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Chattogram, Bangladesh"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      'Hotline / Phone'
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+880 1756-007600"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      'Official Email'
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="bdhosttpos@gmail.com"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'bn' ? 'BIN / VAT Reg No' : 'BIN / VAT Registration No'}
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileForm.binOrVat}
                        onChange={e => setProfileForm(prev => ({ ...prev, binOrVat: e.target.value }))}
                        placeholder="0029381-01"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'bn' ? 'মুদ্রা প্রতীক' : 'Currency Symbol'}
                    </label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileForm.currencySymbol}
                        onChange={e => setProfileForm(prev => ({ ...prev, currencySymbol: e.target.value }))}
                        placeholder="৳"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    id="btn-save-restaurant-profile"
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Save Restaurant Profile</span>
                  </button>
                </div>
              </div>

              {/* Thermal Receipt Live Mockup Preview Card */}
              <div className="p-5 bg-slate-100 border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-700" />
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    'Live Thermal Receipt Header Preview'
                  </h4>
                </div>

                <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl font-mono text-center text-xs text-slate-800 shadow-2xs max-w-sm mx-auto">
                  {profileForm.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img 
                        src={profileForm.logoUrl} 
                        alt="Receipt Logo" 
                        className="h-8 max-w-[120px] object-contain grayscale"
                      />
                    </div>
                  )}
                  <div className="font-extrabold text-sm uppercase text-slate-900 tracking-wide font-sans">
                    {profileForm.name || 'BD HOSTT POS'}
                  </div>
                  <div className="text-[10px] text-slate-600 font-sans mt-0.5">
                    {profileForm.address || 'Chattogram, Bangladesh'}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    Hotline: {profileForm.phone || '+880 1756-007600'} &bull; VAT Reg: {profileForm.binOrVat || '0029381-01'}
                  </div>
                  <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px] font-bold uppercase tracking-wider">
                    PAID CASH MEMO #INV-16001
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'heads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-slate-600">
              Click the <span className="inline-flex items-center font-bold text-blue-700"><Edit3 className="w-3 h-3 mx-0.5" /> Edit</span> button on any item to rename or reassign zones, or use the input box below each card to add new items.
            </p>
          </div>

          {/* 9 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sections.map(sec => {
              const Icon = sec.icon;

              return (
                <div 
                  key={sec.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${sec.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">{sec.title}</h3>
                          <span className="text-[11px] text-slate-500 font-medium">{sec.items.length} records</span>
                        </div>
                      </div>

                      {justAddedSec === sec.id && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 animate-in fade-in flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Added!</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 mb-3 leading-relaxed">{sec.desc}</p>

                    {/* Items List with Edit & Delete */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 mb-4 custom-scrollbar">
                      {sec.items.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-medium">
                          No items added yet
                        </div>
                      ) : (
                        sec.items.map((item, idx) => {
                          const isEditingThis = editingItem?.sectionId === sec.id && editingItem.index === idx;
                          const tableObj = sec.id === 'tables' ? sec.tableObjs?.[idx] : null;
                          const currentZone = tableObj?.zone || 'Floor 1';

                          if (isEditingThis) {
                            return (
                              <div key={idx} className="p-2 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingItem.text}
                                    onChange={e => setEditingItem({ ...editingItem, text: e.target.value })}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveEdit();
                                      if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                    placeholder="Item name..."
                                    className="flex-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                                  />

                                  {sec.id === 'tables' && (
                                    <select
                                      value={editingItem.extraZone}
                                      onChange={e => setEditingItem({ ...editingItem, extraZone: e.target.value })}
                                      className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                                    >
                                      {allZones.map(z => (
                                        <option key={z} value={z}>{z}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Cancel</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Save</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              className="group flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-150 text-slate-800 text-xs font-semibold transition"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="truncate">{item}</span>
                                {sec.id === 'tables' && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black shrink-0">
                                    {currentZone}
                                  </span>
                                )}
                                {sec.id === 'expenseHeads' && (() => {
                                  const linked = resolveExpenseAccount({ id: 0, date: '', head: item, amount: 0 }, chartList);
                                  return linked ? (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-mono font-bold shrink-0">
                                      [{linked.code}] {linked.name}
                                    </span>
                                  ) : null;
                                })()}
                              </div>

                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(sec.id, idx, item, currentZone)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer transition"
                                  title="Edit Item"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(sec.id, idx, item)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Add New Input */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {sec.id === 'tables' && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">Assign Zone:</span>
                        <select
                          value={selectedZoneForNewTable}
                          onChange={e => setSelectedZoneForNewTable(e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                        >
                          {allZones.map(z => (
                            <option key={z} value={z}>{z}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <input
                        id={`input-add-${sec.id}`}
                        type="text"
                        value={inputVal[sec.id] || ''}
                        onChange={e => setInputVal(prev => ({ ...prev, [sec.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd(sec.id);
                          }
                        }}
                        placeholder={`Add ${sec.title.toLowerCase()}...`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                      />
                      <button
                        id={`btn-add-${sec.id}`}
                        type="button"
                        onClick={() => handleAdd(sec.id)}
                        title={`Add new ${sec.title}`}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart of Accounts Tab */}
      {activeTab === 'coa' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Main Actions */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {language === 'bn' ? 'চার্ট অব অ্যাকাউন্টস (COA)' : 'Chart of Accounts (COA)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn'
                      ? 'জেনারেল লেজার অ্যাকাউন্ট হেড, অ্যাসেট, লায়াবিলিটি, ইকুইটি, রাজস্ব ও খরচ হিসাব এবং লাইভ ব্যালেন্স'
                      : 'Configure General Ledger accounts, assets, liabilities, equity, revenue, and expense heads with live balances'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddCoa}
                className="px-4 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Account Head</span>
              </button>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Live Total Assets</div>
              <div className="text-xl font-black text-blue-950 mt-1">
                ৳ {chartList.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + getLiveAccountBalance(a), 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-blue-700 mt-0.5 truncate">Cash, Bank, Stock & Dues</div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Live Total Liabilities</div>
              <div className="text-xl font-black text-amber-950 mt-1">
                ৳ {chartList.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + getLiveAccountBalance(a), 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5 truncate">Vendor dues & Advances</div>
            </div>

            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">Live Total Equity</div>
              <div className="text-xl font-black text-purple-950 mt-1">
                ৳ {chartList.filter(a => a.type === 'EQUITY').reduce((sum, a) => sum + getLiveAccountBalance(a), 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-purple-700 mt-0.5 truncate">Owner Capital & Profit</div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-xs">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Live Revenue / Sales</div>
              <div className="text-xl font-black text-emerald-950 mt-1">
                ৳ {metrics.totalSales.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5 truncate">POS Dine-in & Delivery</div>
            </div>

            {(() => {
              const expenseAccounts = chartList.filter(a => a.type === 'EXPENSE');
              const liveTotalExpenses = expenseAccounts.reduce((sum, a) => sum + getLiveAccountBalance(a), 0);
              const liveCogs = expenseAccounts
                .filter(a => (a.systemRole || getAccountSystemRole(a)) === 'COGS' || a.category === 'Cost of Goods Sold (BOM)')
                .reduce((sum, a) => sum + getLiveAccountBalance(a), 0);
              const liveOpEx = Math.max(0, liveTotalExpenses - liveCogs);
              return (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl shadow-xs">
                  <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">Live Total Expenses</div>
                  <div className="text-xl font-black text-rose-950 mt-1">
                    ৳ {liveTotalExpenses.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-rose-700 mt-0.5 truncate">
                    COGS: ৳{liveCogs.toLocaleString()} | OpEx: ৳{liveOpEx.toLocaleString()}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code or account..."
                  value={coaSearch}
                  onChange={e => setCoaSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none w-56"
                />
              </div>

              {/* Type Filters */}
              {(['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCoaFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    coaFilter === type
                      ? 'bg-slate-900 text-amber-400 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'ALL' ? 'All Types' : type}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpenAddCoa}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Account Head</span>
            </button>
          </div>

          {/* Table of Accounts */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4">Account Code</th>
                    <th className="py-3 px-4">Account Title / Name</th>
                    <th className="py-3 px-4">Account Type</th>
                    <th className="py-3 px-4">Classification / Category</th>
                    <th className="py-3 px-4 text-right">Opening (৳)</th>
                    <th className="py-3 px-4 text-right">Live Current Balance (৳)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        No accounts match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map(acc => {
                      const liveBalance = getLiveAccountBalance(acc);
                      const isCashHead = acc.code === '1010' || (acc.systemRole || getAccountSystemRole(acc)) === 'CASH';
                      const isEquityHead = acc.code === '3010' || (acc.systemRole || getAccountSystemRole(acc)) === 'OWNER_EQUITY';
                      const activeShiftFloat = (data.session?.isActive && Number(data.session.openingCash) > 0) ? Number(data.session.openingCash) : 0;
                      const effectiveDisplayOpening = (acc.balance && acc.balance > 0)
                        ? acc.balance
                        : ((isCashHead || isEquityHead) ? activeShiftFloat : (acc.balance || 0));
                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {acc.code}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{acc.name}</span>
                              {getAccountBadge(acc)}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getAccountTypeBadge(acc.type)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {acc.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                            ৳ {effectiveDisplayOpening.toLocaleString()}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold font-mono text-sm whitespace-nowrap ${
                            acc.type === 'EXPENSE' ? 'text-rose-700' :
                            acc.type === 'REVENUE' ? 'text-emerald-700' :
                            acc.type === 'ASSET' ? 'text-blue-900' : 'text-slate-900'
                          }`}>
                            ৳ {liveBalance.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCoa(acc)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Edit Account Head"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCoa(acc)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Account Head"
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
        </div>
      )}

      {/* COA Add / Edit Modal */}
      {isCoaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingAccount ? 'Edit Account Head' : 'Add New Account Head'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure financial chart of account ledger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCoaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoa} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Account Code *</label>
                  {!editingAccount && (
                    <button
                      type="button"
                      onClick={() => setCoaForm(prev => ({ ...prev, code: getNextAccountCode(prev.type, chartList, prev.category) }))}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto-Generate Next Code</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={coaForm.code}
                  onChange={e => setCoaForm({ ...coaForm, code: e.target.value })}
                  placeholder="e.g. 6060"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold font-mono text-slate-900 focus:bg-white focus:ring-2 focus:outline-none ${
                    chartList.some(a => (a.code || '').trim() === coaForm.code.trim() && (!editingAccount || a.id !== editingAccount.id))
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/50'
                      : 'border-slate-300 focus:ring-amber-500'
                  }`}
                />
                {chartList.some(a => (a.code || '').trim() === coaForm.code.trim() && (!editingAccount || a.id !== editingAccount.id)) ? (
                  <p className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>⚠️ Account Code &quot;{coaForm.code.trim()}&quot; already in use! Must be strictly unique.</span>
                  </p>
                ) : coaForm.code.trim() ? (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>✓ Unique system-verified account code</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  value={coaForm.name}
                  onChange={e => setCoaForm({ ...coaForm, name: e.target.value })}
                  placeholder="e.g. Kitchen Maintenance & Gas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Type *</label>
                  <select
                    value={coaForm.type}
                    onChange={e => handleCoaTypeChange(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="ASSET">ASSET (1000)</option>
                    <option value="LIABILITY">LIABILITY (2000)</option>
                    <option value="EQUITY">EQUITY (3000)</option>
                    <option value="REVENUE">REVENUE (4000)</option>
                    <option value="EXPENSE">EXPENSE (5000/6000)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Classification Category</label>
                  <input
                    type="text"
                    value={coaForm.category}
                    onChange={e => setCoaForm({ ...coaForm, category: e.target.value })}
                    placeholder="e.g. Operating Expenses"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening Balance (৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    value={coaForm.balance}
                    onChange={e => setCoaForm({ ...coaForm, balance: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  System Role (ERP Ledger Linkage)
                </label>
                <select
                  value={coaForm.systemRole}
                  onChange={e => setCoaForm(prev => ({ ...prev, systemRole: e.target.value as AccountSystemRole }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="STANDARD">Standard General Ledger (Strictly Journals & Opening)</option>
                  {coaForm.type === 'LIABILITY' && (
                    <>
                      <option value="ACCOUNTS_PAYABLE">Accounts Payable (Vendor / Supplier Dues)</option>
                      <option value="TAX_PAYABLE">VAT & Tax Payable (Statutory Liabilities)</option>
                      <option value="CUSTOMER_ADVANCE">Customer Advance Deposits</option>
                    </>
                  )}
                  {coaForm.type === 'ASSET' && (
                    <>
                      <option value="CASH">Cash in Hand (POS Drawer)</option>
                      <option value="PETTY_CASH">Petty Cash Fund</option>
                      <option value="BANK">Bank Account</option>
                      <option value="MOBILE_BANKING">Mobile Banking (bKash / Nagad)</option>
                      <option value="ACCOUNTS_RECEIVABLE">Accounts Receivable (Customer Dues)</option>
                      <option value="INVENTORY_ASSET">Food & Beverage Inventory Asset</option>
                    </>
                  )}
                  {coaForm.type === 'EQUITY' && (
                    <>
                      <option value="OWNER_EQUITY">Owner Equity & Capital</option>
                      <option value="RETAINED_EARNINGS">Retained Earnings</option>
                      <option value="OWNER_DRAWINGS">Owner Drawings & Withdrawals (ADE Debit Nature)</option>
                    </>
                  )}
                  {coaForm.type === 'REVENUE' && (
                    <>
                      <option value="DINE_IN_REVENUE">Dine-in Sales Revenue</option>
                      <option value="DELIVERY_REVENUE">Takeaway & Delivery Sales</option>
                      <option value="BEVERAGE_REVENUE">Beverage & Bar Counter Sales</option>
                      <option value="OPERATING_REVENUE">General Operating Sales Revenue</option>
                    </>
                  )}
                  {coaForm.type === 'EXPENSE' && (
                    <>
                      <option value="COGS">Cost of Goods Sold (Recipe BOM / COGS)</option>
                      <option value="OPERATING_EXPENSE">Operating Expense</option>
                    </>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Determines the automated live accounting logic without relying on fragile name matching.
                </p>

                <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Live Account Badge:</span>
                  <div className="flex items-center gap-1.5">
                    {getAccountBadge({ ...coaForm, id: 'preview' })}
                    <span className="text-[10px] text-slate-400">
                      {coaForm.systemRole === 'STANDARD' ? '(Auto from Category)' : '(System Role)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoaModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingAccount ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commission Agents / Delivery Portals Tab */}
      {activeTab === 'agents' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Strip with Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{(data.commissionAgents || []).length} Portals</div>
                <div className="text-xs text-slate-500 font-medium">Registered Commission Agents</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-emerald-700">
                  {((data.commissionAgents || []).filter(a => a.isActive !== false)).length} Active
                </div>
                <div className="text-xs text-slate-500 font-medium">Available for POS Orders</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-bold">Manage & Add Portals</div>
                <div className="text-xs text-slate-400">Foodpanda, Pathao, Foodi, etc.</div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddAgent}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Agent</span>
              </button>
            </div>
          </div>

          {/* Agents Table List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Commission Agents & Multi-Price Configuration</h3>
                <p className="text-xs text-slate-500">
                  When selected as customer or channel at POS, automatic commission discounts apply and menu items reflect their custom price list.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Agent Name / Portal</th>
                    <th className="py-3 px-4 text-center">Commission (%)</th>
                    <th className="py-3 px-4 text-center">Price Multiplier</th>
                    <th className="py-3 px-4">Contact Person / Phone</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(data.commissionAgents || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        No commission agents configured. Click "+ Add Agent" to register Foodpanda, Pathao, Foodi, etc.
                      </td>
                    </tr>
                  ) : (
                    (data.commissionAgents || []).map(agent => (
                      <tr key={agent.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <span>{agent.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {agent.id}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black rounded-lg text-xs border border-amber-200">
                            {agent.commissionPercent}% Commission
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded-md text-[11px] border border-blue-200">
                            {agent.priceListMultiplier ? `${agent.priceListMultiplier}x` : '1.0x (Standard)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{agent.contactPerson || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500">{agent.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            agent.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {agent.isActive !== false ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAgent(agent)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit Agent & Commission Rate"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(agent)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Agent"
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

      {/* Hardware Printers (USB & LAN) Tab */}
      {activeTab === 'printers' && (
        <div className="animate-in fade-in">
          <PrintersConfigView />
        </div>
      )}

      {/* Bill & KOT Print Templates Tab */}
      {activeTab === 'templates' && (
        <div className="animate-in fade-in">
          <PrintTemplatesConfigView />
        </div>
      )}

      {/* Payment Methods Configuration Tab */}
      {activeTab === 'payments' && (
        <div className="animate-in fade-in">
          <PaymentMethodsConfigView />
        </div>
      )}

      {/* Serial & Sequence Setup Tab */}
      {activeTab === 'serials' && (
        <div className="animate-in fade-in">
          <SerialConfigView />
        </div>
      )}

      {/* VAT & Tax Configuration Tab */}
      {activeTab === 'vat' && (
        <div className="space-y-6 animate-in fade-in">
          {vatSavedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 font-bold text-sm shadow-xs animate-in slide-in-from-top">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>VAT & Tax Configuration saved successfully!</span>
              </div>
              <span className="text-xs bg-emerald-200/80 px-2.5 py-1 rounded-lg font-bold">Active Everywhere</span>
            </div>
          )}

          <form onSubmit={handleSaveVatPage} className="max-w-4xl space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      VAT & Tax Configuration
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure global tax rates, calculation mode, and business registration numbers
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition shrink-0">
                  <input 
                    type="checkbox"
                    checked={profileForm.enableVat ?? true}
                    onChange={e => setProfileForm(prev => ({ ...prev, enableVat: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Enable VAT Calculation
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* BIN / VAT Reg No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>BIN / VAT Registration Number</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.binOrVat}
                    onChange={e => setProfileForm(prev => ({ ...prev, binOrVat: e.target.value }))}
                    placeholder="e.g. 0029381-01"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Printed on customer thermal receipts and invoices</p>
                </div>

                {/* VAT Percentage */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>VAT Rate / Percentage (%)</span>
                    <span className="text-[11px] text-amber-600 font-bold">Default: 5%</span>
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={profileForm.vatPercent ?? 5}
                      onChange={e => setProfileForm(prev => ({ ...prev, vatPercent: parseFloat(e.target.value) || 0 }))}
                      placeholder="5"
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[0, 5, 7.5, 10, 15].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, vatPercent: pct, enableVat: pct > 0 }))}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          (profileForm.vatPercent ?? 5) === pct
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* VAT Calculation Mode */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    VAT Calculation Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProfileForm(prev => ({ ...prev, vatMode: 'inclusive' }))}
                      className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        (profileForm.vatMode || 'inclusive') === 'inclusive'
                          ? 'bg-amber-50/80 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">Inclusive</span>
                        {(profileForm.vatMode || 'inclusive') === 'inclusive' && (
                          <Check className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal">
                        Menu prices already include VAT (Standard Retail / NBR)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileForm(prev => ({ ...prev, vatMode: 'exclusive' }))}
                      className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        (profileForm.vatMode || 'inclusive') === 'exclusive'
                          ? 'bg-amber-50/80 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">Exclusive</span>
                        {(profileForm.vatMode || 'inclusive') === 'exclusive' && (
                          <Check className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal">
                        VAT is calculated and added on top of the bill subtotal
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Simulation Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-2">
                <div className="flex items-center justify-between font-bold border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-extrabold text-slate-900">Live Calculation Preview (100.00 Base Sale)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold uppercase">
                    Tax Engine Active
                  </span>
                </div>
                {(profileForm.vatMode || 'inclusive') === 'inclusive' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span>Net Sales Revenue: <strong>৳{((100 * 100) / (100 + (profileForm.vatPercent ?? 5))).toFixed(2)}</strong></span>
                    <span>VAT Amount: <strong className="text-amber-700">৳{(100 - (100 * 100) / (100 + (profileForm.vatPercent ?? 5))).toFixed(2)}</strong></span>
                    <span>Customer Total: <strong>৳100.00</strong></span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span>Bill Subtotal: <strong>৳100.00</strong></span>
                    <span>VAT Amount ({(profileForm.vatPercent ?? 5)}%): <strong className="text-amber-700">৳{(100 * (profileForm.vatPercent ?? 5) / 100).toFixed(2)}</strong></span>
                    <span>Customer Total: <strong>৳{(100 + 100 * (profileForm.vatPercent ?? 5) / 100).toFixed(2)}</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save VAT & Tax Configuration</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* Commission Agent Add / Edit Modal */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingAgent ? `Edit ${editingAgent.name}` : 'Add Commission Agent / Delivery Portal'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure portal commission rate and selling price multiplier</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Agent / Portal Name *</label>
                <input
                  type="text"
                  required
                  value={agentForm.name}
                  onChange={e => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="e.g. Foodpanda, Pathao, Foodi, HungryNaki"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Commission Rate (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={agentForm.commissionPercent}
                      onChange={e => setAgentForm({ ...agentForm, commissionPercent: parseFloat(e.target.value) || 0 })}
                      placeholder="20"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-amber-700 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price Multiplier (e.g. 1.2x)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    value={agentForm.priceListMultiplier}
                    onChange={e => setAgentForm({ ...agentForm, priceListMultiplier: parseFloat(e.target.value) || 1.0 })}
                    placeholder="1.20"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Manager / Contact</label>
                  <input
                    type="text"
                    value={agentForm.contactPerson}
                    onChange={e => setAgentForm({ ...agentForm, contactPerson: e.target.value })}
                    placeholder="e.g. Mr. Rafiq"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Helpline / Phone</label>
                  <input
                    type="text"
                    value={agentForm.phone}
                    onChange={e => setAgentForm({ ...agentForm, phone: e.target.value })}
                    placeholder="e.g. +880 17..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="agent-active-toggle"
                  checked={agentForm.isActive}
                  onChange={e => setAgentForm({ ...agentForm, isActive: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="agent-active-toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Active for POS Order Selection
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAgentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingAgent ? 'Update Agent' : 'Save Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Bypasses browser iframe dialog blocking) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider border border-rose-200">
                    {deleteConfirm.actionType}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1.5 leading-snug">
                  {deleteConfirm.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {deleteConfirm.itemDescription}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteConfirm.onConfirm();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
