import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { PrintTemplate, TemplateTargetType, ThermalPaperWidth } from '../../types';
import { 
  FileCode2, 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Check, 
  X, 
  Receipt, 
  ChefHat, 
  Sliders, 
  Eye, 
  Printer, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  ReceiptText,
  Type,
  LayoutTemplate
} from 'lucide-react';

export const PrintTemplatesConfigView: React.FC = () => {
  const { 
    data, 
    addPrintTemplate, 
    updatePrintTemplate, 
    deletePrintTemplate, 
    duplicatePrintTemplate, 
    setDefaultPrintTemplate,
    setAllKotShowPrices,
    language 
  } = useRestaurant();

  const templates = data.printTemplates || [];
  const profile = data.restaurantProfile;

  // Resolve Primary Default Templates
  const primaryKotTemplate = templates.find(t => t.isActive && t.isDefault && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
    || templates.find(t => t.isActive && (t.templateType === 'KOT' || t.templateType === 'BOTH'))
    || templates[0];

  const primaryBillTemplate = templates.find(t => t.isActive && t.isDefault && (t.templateType === 'BILL' || t.templateType === 'BOTH'))
    || templates.find(t => t.isActive && (t.templateType === 'BILL' || t.templateType === 'BOTH'))
    || templates[1];

  // Toast feedback
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Filter
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal / Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [templateType, setTemplateType] = useState<TemplateTargetType>('KOT');
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [headerTitle, setHeaderTitle] = useState('*** KITCHEN ORDER TICKET ***');
  const [showLogo, setShowLogo] = useState(true);
  const [showTagline, setShowTagline] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showBinVat, setShowBinVat] = useState(false);
  const [showTableZone, setShowTableZone] = useState(true);
  const [showWaiter, setShowWaiter] = useState(true);
  const [showCustomer, setShowCustomer] = useState(true);
  const [showDateTime, setShowDateTime] = useState(true);
  const [showPricesOnKot, setShowPricesOnKot] = useState(true);
  const [showTotalPriceOnKot, setShowTotalPriceOnKot] = useState(false);
  const [combineAllStationsOnKot, setCombineAllStationsOnKot] = useState(false);
  const [showItemDepartmentOnKot, setShowItemDepartmentOnKot] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [footerMessage, setFooterMessage] = useState('⚡ Fast Kitchen Dispatch Required');
  const [footerNotes, setFooterNotes] = useState('Generated via Barcode Cafe POS');
  const [showVatBreakdown, setShowVatBreakdown] = useState(false);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  const [showOrderCount, setShowOrderCount] = useState(true);
  const [isDefault, setIsDefault] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Open Modal for Add
  const handleOpenAdd = (type: TemplateTargetType = 'KOT') => {
    const base = type === 'KOT' ? primaryKotTemplate : primaryBillTemplate;
    setEditingTemplateId(null);
    setName(type === 'KOT' ? 'Custom Kitchen KOT (80mm)' : 'Custom Guest Bill (80mm)');
    setTemplateType(type);
    setPaperWidth(base?.paperWidth || '80mm');
    setSelectedDepts(base?.departments ? [...base.departments] : []);
    setSelectedCats([]);
    setHeaderTitle(base?.headerTitle || (type === 'KOT' ? '*** KITCHEN ORDER TICKET ***' : 'INVOICE / CASH MEMO'));
    setShowLogo(base ? base.showLogo !== false : true);
    setShowTagline(base ? Boolean(base.showTagline) : type === 'BILL');
    setShowAddress(base ? Boolean(base.showAddress) : type === 'BILL');
    setShowPhone(base ? Boolean(base.showPhone) : type === 'BILL');
    setShowBinVat(base ? Boolean(base.showBinVat) : type === 'BILL');
    setShowTableZone(base ? base.showTableZone !== false : true);
    setShowWaiter(base ? base.showWaiter !== false : true);
    setShowCustomer(base ? base.showCustomer !== false : true);
    setShowDateTime(base ? base.showDateTime !== false : true);
    setShowPricesOnKot(base ? Boolean(base.showPricesOnKot) : true);
    setShowTotalPriceOnKot(base ? Boolean(base.showTotalPriceOnKot) : false);
    setCombineAllStationsOnKot(base ? Boolean(base.combineAllStationsOnKot) : false);
    setShowItemDepartmentOnKot(base ? Boolean(base.showItemDepartmentOnKot) : false);
    setShowNotes(base ? base.showNotes !== false : true);
    setFontSize(base?.fontSize || 'base');
    const currentRestName = profile?.name || 'Restaurant POS';
    setFooterMessage(base?.footerMessage || (type === 'KOT' ? '⚡ Fast Kitchen Dispatch Required' : `Thank you for dining at ${currentRestName}!`));
    setFooterNotes(base?.footerNotes || (type === 'KOT' ? 'Generated via POS Kitchen Link' : `Powered by ${currentRestName} • VAT & SD Included`));
    setShowVatBreakdown(base ? Boolean(base.showVatBreakdown) : type === 'BILL');
    setShowPaymentBreakdown(base ? Boolean(base.showPaymentBreakdown) : type === 'BILL');
    setShowOrderCount(base ? base.showOrderCount !== false : true);
    setIsDefault(true);
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (t: PrintTemplate) => {
    setEditingTemplateId(t.id);
    setName(t.name);
    setTemplateType(t.templateType);
    setPaperWidth(t.paperWidth);
    const activeDepts = data.departments || [];
    setSelectedDepts((t.departments || []).filter(d => activeDepts.includes(d)));
    setSelectedCats(t.categories ? [...t.categories] : []);
    setHeaderTitle(t.headerTitle || (t.templateType === 'KOT' ? '*** KITCHEN ORDER TICKET ***' : 'INVOICE / CASH MEMO'));
    setShowLogo(t.showLogo !== false);
    setShowTagline(Boolean(t.showTagline));
    setShowAddress(Boolean(t.showAddress));
    setShowPhone(Boolean(t.showPhone));
    setShowBinVat(Boolean(t.showBinVat));
    setShowTableZone(t.showTableZone !== false);
    setShowWaiter(t.showWaiter !== false);
    setShowCustomer(t.showCustomer !== false);
    setShowDateTime(t.showDateTime !== false);
    setShowPricesOnKot(Boolean(t.showPricesOnKot));
    setShowTotalPriceOnKot(Boolean(t.showTotalPriceOnKot));
    setCombineAllStationsOnKot(Boolean(t.combineAllStationsOnKot));
    setShowItemDepartmentOnKot(Boolean(t.showItemDepartmentOnKot));
    setShowNotes(t.showNotes !== false);
    setFontSize(t.fontSize || 'base');
    setFooterMessage(t.footerMessage || '');
    setFooterNotes(t.footerNotes || '');
    setShowVatBreakdown(Boolean(t.showVatBreakdown));
    setShowPaymentBreakdown(Boolean(t.showPaymentBreakdown));
    setShowOrderCount(t.showOrderCount !== false);
    setIsDefault(Boolean(t.isDefault));
    setIsActive(t.isActive !== false);
    setIsModalOpen(true);
  };

  // Save Template
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a template name!');
      return;
    }

    const activeDepts = data.departments || [];
    const sanitizedDepts = selectedDepts.filter(d => activeDepts.includes(d));

    const payload: Omit<PrintTemplate, 'id'> = {
      name: name.trim(),
      templateType,
      paperWidth,
      departments: sanitizedDepts,
      categories: selectedCats,
      headerTitle: headerTitle.trim(),
      showLogo,
      showTagline,
      showAddress,
      showPhone,
      showBinVat,
      showTableZone,
      showWaiter,
      showCustomer,
      showDateTime,
      showPricesOnKot: Boolean(showPricesOnKot),
      showTotalPriceOnKot: Boolean(showTotalPriceOnKot),
      combineAllStationsOnKot: Boolean(isDefault && combineAllStationsOnKot),
      showItemDepartmentOnKot: Boolean(isDefault && combineAllStationsOnKot && showItemDepartmentOnKot),
      showNotes,
      fontSize,
      footerMessage: footerMessage.trim(),
      footerNotes: footerNotes.trim(),
      showVatBreakdown,
      showPaymentBreakdown,
      showOrderCount,
      isDefault: Boolean(isDefault),
      isActive: Boolean(isActive)
    };

    if (editingTemplateId) {
      updatePrintTemplate(editingTemplateId, payload);
      if ((templateType === 'KOT' || templateType === 'BOTH') && isDefault) {
        setAllKotShowPrices(Boolean(showPricesOnKot));
      }
      showToast('Template settings updated and saved successfully!');
    } else {
      addPrintTemplate(payload);
      if ((templateType === 'KOT' || templateType === 'BOTH') && isDefault) {
        setAllKotShowPrices(Boolean(showPricesOnKot));
      }
      showToast('New template created and set as active!');
    }

    setIsModalOpen(false);
  };

  // Delete Template
  const handleDelete = (id: string) => {
    deletePrintTemplate(id);
    showToast('Template deleted');
  };

  // Duplicate
  const handleDuplicate = (id: string) => {
    duplicatePrintTemplate(id);
  };

  // Toggle Department
  const toggleDept = (dept: string) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  // Toggle Category
  const toggleCat = (cat: string) => {
    setSelectedCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Filtered Templates
  const filteredTemplates = templates.filter(t => {
    if (filterType !== 'ALL' && t.templateType !== filterType && t.templateType !== 'BOTH') return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Main Actions */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#004b9b] border border-blue-200">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Bill & KOT Template Builder
              </h3>
              <p className="text-xs text-slate-500">
                {'Design, edit, and configure Kitchen KOT and Customer Bill slip templates'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => primaryKotTemplate ? handleOpenEdit(primaryKotTemplate) : handleOpenAdd('KOT')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Configure Active Primary Kitchen KOT Slip"
          >
            <ChefHat className="w-4 h-4" />
            <span>Configure KOT Slip</span>
          </button>

          <button
            type="button"
            onClick={() => primaryBillTemplate ? handleOpenEdit(primaryBillTemplate) : handleOpenAdd('BILL')}
            className="px-3.5 py-2 bg-[#004b9b] hover:bg-[#005bb8] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Configure Active Primary Customer Bill Slip"
          >
            <ReceiptText className="w-4 h-4" />
            <span>Configure Bill Slip</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd('KOT')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center gap-1 cursor-pointer"
            title="Add a new custom template for a specific kitchen counter or station"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom</span>
          </button>
        </div>
      </div>


      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
        {[
          { id: 'ALL', label: 'All Templates' },
          { id: 'KOT', label: 'Kitchen KOT Templates' },
          { id: 'BILL', label: 'Customer Bill Templates' },
          { id: 'BOTH', label: 'Universal (Both)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === tab.id
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map(template => {
          const isKot = template.templateType === 'KOT';
          const isBill = template.templateType === 'BILL';

          return (
            <div
              key={template.id}
              className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${
                      isKot 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : isBill 
                          ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                    }`}>
                      {isKot ? <ChefHat className="w-3 h-3" /> : <ReceiptText className="w-3 h-3" />}
                      <span>{template.templateType}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {template.paperWidth}
                    </span>
                  </div>

                  {template.isDefault ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                      ★ Primary Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDefaultPrintTemplate(template.id)}
                      className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                      title="Set as Primary Default Template"
                    >
                      ☆ Make Default
                    </button>
                  )}
                </div>

                {/* Template Title */}
                <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1 mb-1">
                  {template.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono line-clamp-1">
                  Header: "{template.headerTitle}"
                </p>

                {/* Assigned Departments */}
                <div className="my-3 space-y-1">
                  <div className="text-[11px] font-bold text-slate-600">Assigned Kitchen / Counter Depts:</div>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const activeDepts = data.departments || [];
                      const validAssigned = (template.departments || []).filter(d => activeDepts.includes(d));
                      if (validAssigned.length === 0) {
                        return (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] italic">
                            All Departments (Global Fallback)
                          </span>
                        );
                      }
                      return validAssigned.map(d => (
                        <span key={d} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                          {d}
                        </span>
                      ));
                    })()}
                  </div>
                </div>

                {/* Feature Chips */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Show Logo / Branding:</span>
                    <span className="font-bold text-slate-800">{template.showLogo ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Table & Zone Prominent:</span>
                    <span className="font-bold text-slate-800">{template.showTableZone ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Prices Displayed:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !template.showPricesOnKot;
                        updatePrintTemplate(template.id, { showPricesOnKot: nextVal });
                        if (template.isDefault && (template.templateType === 'KOT' || template.templateType === 'BOTH')) {
                          setAllKotShowPrices(nextVal);
                        }
                        showToast(nextVal ? '✓ Prices on KOT enabled' : '✓ Prices on KOT disabled');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition flex items-center gap-1 ${
                        template.showPricesOnKot 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300' 
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'
                      }`}
                      title="Click to toggle Show Prices on KOT"
                    >
                      <span>{template.showPricesOnKot ? '✓ Yes (Prices ON)' : '✕ Hidden (Chef Only)'}</span>
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span>Font Size:</span>
                    <span className="font-bold text-slate-800 uppercase">{template.fontSize || 'base'}</span>
                  </div>
                  {template.isDefault && template.combineAllStationsOnKot && (
                    <div className="flex justify-between items-center text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[10px] font-bold border border-teal-200">
                      <span>Ticket Mode:</span>
                      <span>Single Combined Slip</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(template)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customize</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(template.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    title="Duplicate Template"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-extrabold text-sm text-slate-700">No Templates Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create customizable thermal bill and KOT slip templates for each kitchen department or billing counter.
            </p>
            <button
              onClick={() => handleOpenAdd('KOT')}
              className="px-4 py-2 bg-[#004b9b] text-white font-bold text-xs rounded-xl hover:bg-[#005bb8] transition"
            >
              + Create Template
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Template Live Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingTemplateId 
                      ? (templateType === 'KOT' ? 'Configure Kitchen KOT Slip' : 'Configure Customer Bill Slip') 
                      : (templateType === 'KOT' ? 'Create Custom KOT Template' : 'Create Custom Bill Template')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {'Customize layout, toggles, paper width (58mm / 80mm), and save changes'}
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

            {/* Modal Body: Left Settings Form (7 cols) + Right Live Preview (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {/* Left Settings Form */}
              <form onSubmit={handleSave} id="template-edit-form" className="lg:col-span-7 space-y-4">
                {/* Template Name & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Main Kitchen KOT (80mm)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Target Slip Type *
                    </label>
                    <select
                      value={templateType}
                      onChange={e => {
                        const newType = e.target.value as TemplateTargetType;
                        setTemplateType(newType);
                        if (newType === 'KOT') {
                          setHeaderTitle('*** KITCHEN ORDER TICKET ***');
                        } else if (newType === 'BILL') {
                          setHeaderTitle('INVOICE / CASH MEMO');
                          setShowPricesOnKot(true);
                          setShowAddress(true);
                          setShowPhone(true);
                          setShowBinVat(true);
                          setShowPaymentBreakdown(true);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="KOT">KOT (Kitchen Order Ticket)</option>
                      <option value="BILL">BILL (Customer Invoice / Cash Memo)</option>
                      <option value="BOTH">BOTH (Universal Receipt)</option>
                    </select>
                  </div>
                </div>

                {/* Paper Width & Font Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Thermal Paper Width *
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Text Font Size
                    </label>
                    <select
                      value={fontSize}
                      onChange={e => setFontSize(e.target.value as 'sm' | 'base' | 'lg')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="sm">Small / Dense (Fits more lines)</option>
                      <option value="base">Standard (Recommended)</option>
                      <option value="lg">Large / High-Visibility (Easy for Chefs)</option>
                    </select>
                  </div>
                </div>

                {/* Custom Header Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Header Banner Text
                  </label>
                  <input
                    type="text"
                    value={headerTitle}
                    onChange={e => setHeaderTitle(e.target.value)}
                    placeholder="e.g. *** KITCHEN ORDER TICKET *** or INVOICE"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Department Routing Binding */}
                <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Bind to Kitchen / Counter Departments
                    </label>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedDepts(data.departments || [])}
                        className="text-amber-600 font-bold hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDepts([])}
                        className="text-slate-500 font-bold hover:underline cursor-pointer"
                      >
                        None (Global)
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.departments.map(dept => {
                      const isChecked = selectedDepts.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => toggleDept(dept)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isChecked 
                              ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{dept}</span>
                          {isChecked && <Check className="w-3 h-3 text-amber-700" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Header & Business Info Toggles */}
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-bold text-slate-800 mb-1">Header & Branding Elements</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={e => setShowLogo(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Logo</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTagline}
                        onChange={e => setShowTagline(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Tagline</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAddress}
                        onChange={e => setShowAddress(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Address</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPhone}
                        onChange={e => setShowPhone(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Phone</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showBinVat}
                        onChange={e => setShowBinVat(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show BIN / VAT #</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDateTime}
                        onChange={e => setShowDateTime(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Date/Time</span>
                    </label>
                  </div>
                </div>

                {/* Table, Waiter, Prices & Items Toggles */}
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-bold text-slate-800 mb-1">Body & Order Content</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTableZone}
                        onChange={e => setShowTableZone(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Table & Zone Box</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showWaiter}
                        onChange={e => setShowWaiter(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Waiter</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCustomer}
                        onChange={e => setShowCustomer(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Customer</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer" title="Print single unit price for each item">
                      <input
                        type="checkbox"
                        checked={showPricesOnKot}
                        onChange={e => setShowPricesOnKot(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Unit Price</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer" title="Print total amount (Qty × Price) for each item">
                      <input
                        type="checkbox"
                        checked={showTotalPriceOnKot}
                        onChange={e => setShowTotalPriceOnKot(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Total Price</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showNotes}
                        onChange={e => setShowNotes(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Addons/Notes</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOrderCount}
                        onChange={e => setShowOrderCount(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Total Item Count</span>
                    </label>
                  </div>
                </div>

                {/* Single Consolidated Ticket Toggle for KOT (Only available on Primary Default Template) */}
                {(templateType === 'KOT' || templateType === 'BOTH') && isDefault && (
                  <div className="p-3 bg-linear-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/80 rounded-xl space-y-2 shadow-2xs">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={combineAllStationsOnKot}
                        onChange={e => setCombineAllStationsOnKot(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">Combine all kitchen departments into 1 single ticket</span>
                    </label>

                    {combineAllStationsOnKot && (
                      <div className="pt-2 pl-6 border-t border-emerald-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showItemDepartmentOnKot}
                            onChange={e => setShowItemDepartmentOnKot(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-bold text-slate-700">
                            Show Department tag beside dish name (e.g. [Beverage], [Tea])
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Financials & Settlement Toggles (for Bill) */}
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-bold text-slate-800 mb-1">Financials (For Bills)</div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showVatBreakdown}
                        onChange={e => setShowVatBreakdown(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show VAT & Tax Breakdown</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPaymentBreakdown}
                        onChange={e => setShowPaymentBreakdown(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span>Show Cash/Card/bKash Split</span>
                    </label>
                  </div>
                </div>

                {/* Footer Messages */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Footer Main Greeting
                    </label>
                    <input
                      type="text"
                      value={footerMessage}
                      onChange={e => setFooterMessage(e.target.value)}
                      placeholder="e.g. Thank you for dining with us!"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Footer Sub-notes / Disclaimer
                    </label>
                    <input
                      type="text"
                      value={footerNotes}
                      onChange={e => setFooterNotes(e.target.value)}
                      placeholder="e.g. Powered by Barcode Cafe ERP"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Default & Active Toggles */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={e => setIsDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-bold text-slate-700">Set as Primary Default Template</span>
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
              </form>

              {/* Right Col: Live Thermal Receipt Preview (5 cols) */}
              <div className="lg:col-span-5 bg-slate-100 p-4 rounded-2xl border border-slate-300 flex flex-col">
                <div className="flex items-center justify-between mb-3 text-xs font-extrabold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-600" />
                    <span>Live Thermal Preview ({paperWidth})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">
                    Font: {fontSize}
                  </span>
                </div>

                {/* Mock Paper Slip */}
                <div 
                  className={`mx-auto bg-white border border-dashed border-slate-400 p-4 shadow-md rounded-md font-mono text-slate-900 flex-1 overflow-y-auto ${
                    paperWidth === '58mm' ? 'max-w-[240px]' : 'max-w-[320px]'
                  } ${
                    fontSize === 'sm' ? 'text-[10px]' : fontSize === 'lg' ? 'text-xs' : 'text-[11px]'
                  }`}
                >
                  {/* Header */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-400">
                    {showLogo && profile?.logoUrl && (
                      <div className="flex justify-center mb-1">
                        <img 
                          src={profile.logoUrl} 
                          alt="Logo" 
                          className="h-8 max-w-[100px] object-contain grayscale"
                        />
                      </div>
                    )}
                    <h3 className="font-extrabold font-sans text-sm text-slate-900">
                      {profile?.name || 'BD HOSTT POS'}
                    </h3>
                    {showTagline && profile?.tagline && (
                      <p className="text-[9px] text-slate-500 font-sans italic">{profile.tagline}</p>
                    )}
                    {showAddress && (
                      <p className="text-[9px] text-slate-600 font-sans">
                        {profile?.address || 'Chattogram, Bangladesh'}
                      </p>
                    )}
                    {showPhone && (
                      <p className="text-[9px] text-slate-500 font-sans">
                        Hotline: {profile?.phone || '+880 1756-007600'}
                      </p>
                    )}
                    {showBinVat && (
                      <p className="text-[9px] text-slate-500 font-sans">
                        VAT Reg: {profile?.binOrVat || '0029381-01'}
                      </p>
                    )}

                    <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-200 text-slate-900 rounded font-sans font-extrabold text-[10px] tracking-wider uppercase">
                      {headerTitle}
                    </div>
                  </div>

                  {/* Table & Zone Box */}
                  {showTableZone && (
                    <div className="my-2 p-1.5 bg-amber-50 border border-amber-300 rounded text-center font-sans">
                      <div className="font-black text-xs text-amber-950">Table 01</div>
                      <div className="text-[10px] font-bold text-amber-800">Zone: Floor 1</div>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="py-1 border-b border-dashed border-slate-300 space-y-0.5">
                    {showDateTime && (
                      <div className="flex justify-between text-slate-600">
                        <span>Time:</span>
                        <span className="font-bold text-slate-800">{new Date().toLocaleTimeString()}</span>
                      </div>
                    )}
                    {showWaiter && (
                      <div className="flex justify-between text-slate-600">
                        <span>Waiter:</span>
                        <span className="font-bold text-slate-800 font-sans">Rahim (Staff)</span>
                      </div>
                    )}
                    {showCustomer && (
                      <div className="flex justify-between text-slate-600">
                        <span>Customer:</span>
                        <span className="font-sans">Walk-in Customer</span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="py-2 border-b border-dashed border-slate-400">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-300 text-slate-500 font-sans text-[10px]">
                          <th className="py-0.5">Item</th>
                          <th className="py-0.5 text-center">Qty</th>
                          {showPricesOnKot && <th className="py-0.5 text-right">Price</th>}
                          {showTotalPriceOnKot && <th className="py-0.5 text-right">Total</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1 font-bold font-sans">
                            BBQ Chicken Steak
                            {showNotes && <div className="text-[9px] text-slate-500">+ Extra Cheese</div>}
                          </td>
                          <td className="py-1 text-center font-extrabold text-rose-700">2x</td>
                          {showPricesOnKot && <td className="py-1 text-right font-bold">৳290</td>}
                          {showTotalPriceOnKot && <td className="py-1 text-right font-bold text-amber-800">৳580</td>}
                        </tr>
                        <tr>
                          <td className="py-1 font-bold font-sans">Mineral Water 500ml</td>
                          <td className="py-1 text-center font-extrabold text-rose-700">1x</td>
                          {showPricesOnKot && <td className="py-1 text-right font-bold">৳30</td>}
                          {showTotalPriceOnKot && <td className="py-1 text-right font-bold text-amber-800">৳30</td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financials for Bill */}
                  {(templateType === 'BILL' || templateType === 'BOTH') && (
                    <div className="py-1.5 space-y-0.5 border-b border-dashed border-slate-400">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-bold">৳1,190</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount (10%):</span>
                        <span>- ৳119</span>
                      </div>
                      {showVatBreakdown && (
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>VAT (5% Included):</span>
                          <span>৳53.5</span>
                        </div>
                      )}
                      <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-300">
                        <span>Net Total:</span>
                        <span>৳1,071</span>
                      </div>

                      {showPaymentBreakdown && (
                        <div className="pt-1 text-[10px] space-y-0.5 text-slate-600 border-t border-dotted border-slate-200">
                          <div className="flex justify-between">
                            <span>Paid Cash:</span>
                            <span>৳1,100</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>Change:</span>
                            <span>৳29</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Count */}
                  {showOrderCount && (
                    <div className="py-1 flex justify-between font-sans font-bold text-[10px] text-slate-700">
                      <span>Total Items:</span>
                      <span>3 Items (2 Dishes)</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-2 text-center text-[10px] text-slate-600 font-sans border-t border-dashed border-slate-300">
                    {footerMessage && <p className="font-bold text-slate-800">{footerMessage}</p>}
                    {footerNotes && <p className="text-[9px] text-slate-500 mt-0.5">{footerNotes}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-[#004b9b] hover:bg-[#005bb8] text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                {editingTemplateId ? 'Save & Apply Changes' : 'Create & Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold text-xs">{saveToast}</span>
        </div>
      )}
    </div>
  );
};
