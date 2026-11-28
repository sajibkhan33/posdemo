import React, { useState, useMemo } from 'react';
import { useRestaurant, DEFAULT_ROLE_PERMISSIONS, DEFAULT_USERS, DEFAULT_ORDER_EDIT_PERMISSIONS, DEFAULT_REOPEN_BILL_PERMISSIONS } from '../../context/RestaurantContext';
import { AppUser, UserRole, ActiveTab } from '../../types';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Shield, 
  Phone, 
  Layers,
  Save,
  AlertTriangle,
  Search,
  X,
  ChevronDown
} from 'lucide-react';

const ROLE_DEFINITIONS: Array<{ role: UserRole; title: string; desc: string; color: string }> = [
  { role: 'ADMIN', title: 'System Administrator', desc: 'Full unrestricted system access to all modules, financial data, and configurations.', color: 'border-purple-500 bg-purple-50 text-purple-800' },
  { role: 'MANAGER', title: 'Restaurant / Floor Manager', desc: 'Operational control over POS, menu recipes, purchases, billing, stock, and reports.', color: 'border-blue-500 bg-blue-50 text-blue-800' },
  { role: 'CASHIER', title: 'Billing Cashier', desc: 'Live POS order settlement, sales register, receipt printing, and customer receivables.', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { role: 'WAITER', title: 'Service Waiter', desc: 'Taking table food orders, sending kitchen KOTs, and managing floor tables.', color: 'border-amber-500 bg-amber-50 text-amber-800' },
  { role: 'CHEF', title: 'Kitchen Executive Chef', desc: 'Kitchen order display, recipe ingredients, inventory usage, and raw materials.', color: 'border-orange-500 bg-orange-50 text-orange-800' }
];

const ALL_MODULES: Array<{ id: ActiveTab; label: string; group: string }> = [
  { id: 'dashboard', label: 'Executive Dashboard', group: 'Overview' },
  { id: 'pos', label: 'Live Tables & POS Billing', group: 'Operations' },
  { id: 'menu-items', label: 'Menu & Recipe BOM', group: 'Catalog' },
  { id: 'sales', label: 'Sales & Customer Dues', group: 'Finance' },
  { id: 'expenses', label: 'Operating Expenses', group: 'Finance' },
  { id: 'purchases', label: 'Purchases & Stock Inward', group: 'Inventory' },
  { id: 'payables', label: 'Vendor Payables Ledger', group: 'Finance' },
  { id: 'receivables', label: 'Customer Receivables Ledger', group: 'Finance' },
  { id: 'inv-items', label: 'Raw Materials Master', group: 'Inventory' },
  { id: 'inventory', label: 'Stock Ledger & Valuation', group: 'Inventory' },
  { id: 'reports', label: 'Reports & Business Analytics', group: 'Analytics' },
  { id: 'users', label: 'Users & Roles (RBAC)', group: 'Administration' },
  { id: 'heads', label: 'System Configurations', group: 'Administration' },
  { id: 'data-cleanup', label: 'Data Management & Cleanup', group: 'Administration' }
];

export const UsersView: React.FC = () => {
  const { 
    data, 
    currentUser, 
    addUser, 
    editUser, 
    deleteUser, 
    updateRolePermissions,
    updateOrderEditPermission,
    updateReopenBillPermission
  } = useRestaurant();

  const usersList: AppUser[] = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
  const rolePermissions = data.rolePermissions || DEFAULT_ROLE_PERMISSIONS;

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isFloorDropdownOpen, setIsFloorDropdownOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        user.name.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.phone && user.phone.includes(q));
      return matchesRole && matchesSearch;
    });
  }, [usersList, roleFilter, searchQuery]);

  const allConfiguredZones = useMemo(() => {
    return (data.tableZones && data.tableZones.length > 0)
      ? data.tableZones
      : ['Floor 1', 'Floor 2', 'VIP Lounge', 'Rooftop Garden'];
  }, [data.tableZones]);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    email: string;
    pinOrPassword: string;
    role: UserRole;
    phone: string;
    isActive: boolean;
    canEditSubmittedOrders: boolean;
    assignedZones: string[];
  }>({
    name: '',
    username: '',
    email: '',
    pinOrPassword: '',
    role: 'CASHIER',
    phone: '',
    isActive: true,
    canEditSubmittedOrders: true,
    assignedZones: []
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      pinOrPassword: '123',
      role: 'CASHIER',
      phone: '',
      isActive: true,
      canEditSubmittedOrders: false,
      assignedZones: []
    });
    setIsFloorDropdownOpen(false);
    setEditingUserId(null);
    setIsAddUserModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      pinOrPassword: user.pinOrPassword || '',
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive !== false,
      canEditSubmittedOrders: user.canEditSubmittedOrders ?? (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'CASHIER'),
      assignedZones: user.assignedZones || []
    });
    setIsFloorDropdownOpen(false);
    setEditingUserId(user.id);
    setIsAddUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      alert('Please provide Name and Username');
      return;
    }

    const cleanPin = formData.pinOrPassword.trim();
    if (!cleanPin) {
      alert('Please provide a unique Security PIN for this operator.');
      return;
    }

    const pinConflict = usersList.find(u => 
      u.id !== editingUserId && 
      u.isActive !== false && 
      (u.pinOrPassword || '').trim() === cleanPin
    );

    if (pinConflict) {
      alert(`PIN "${cleanPin}" is already assigned to "${pinConflict.name}" (${pinConflict.role}).\n\nEach staff member must have a unique PIN so the system can automatically identify them upon login.`);
      return;
    }

    if (editingUserId) {
      editUser(editingUserId, {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase() || undefined,
        pinOrPassword: cleanPin,
        role: formData.role,
        phone: formData.phone.trim(),
        isActive: formData.isActive,
        canEditSubmittedOrders: formData.canEditSubmittedOrders,
        assignedZones: formData.assignedZones
      });
    } else {
      addUser({
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase() || undefined,
        pinOrPassword: cleanPin,
        role: formData.role,
        phone: formData.phone.trim(),
        isActive: formData.isActive,
        canEditSubmittedOrders: formData.canEditSubmittedOrders,
        assignedZones: formData.assignedZones
      });
    }
    setIsAddUserModalOpen(false);
  };


  const togglePermissionForRole = (role: UserRole, tabId: ActiveTab) => {
    const currentPerms = rolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    let updated: ActiveTab[];
    if (currentPerms.includes(tabId)) {
      updated = currentPerms.filter(t => t !== tabId);
    } else {
      updated = [...currentPerms, tabId];
    }
    updateRolePermissions(role, updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              User & Role Access Management (RBAC)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Manage system operators, secure login credentials, and assign module-level access permissions
            </p>
          </div>
        </div>

        {/* Current User Quick Badge */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-[#004b9b] text-white font-bold flex items-center justify-center text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                <div className="text-[10px] font-extrabold text-blue-700 uppercase">{currentUser.role}</div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              Not Logged In
            </span>
          )}

          <button
            id="btn-add-new-user"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit">
        <button
          id="tab-btn-users-directory"
          type="button"
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer shadow-2xs ${
            activeSubTab === 'users'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Staff Directory ({usersList.length})</span>
        </button>

        <button
          id="tab-btn-role-matrix"
          type="button"
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer shadow-2xs ${
            activeSubTab === 'roles'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="space-y-3">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, username, phone..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'CHEF'] as const).map(role => {
                const isSelected = roleFilter === role;
                const count = role === 'ALL' ? usersList.length : usersList.filter(u => u.role === role).length;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{role}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ultra-Slim Enterprise Table View (Like Image 2) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Operator / Staff</th>
                    <th className="py-2.5 px-3">System Role</th>
                    <th className="py-2.5 px-3">Contact (Phone / Email)</th>
                    <th className="py-2.5 px-3 text-center">Security PIN</th>
                    <th className="py-2.5 px-3 text-center">Modules</th>
                    <th className="py-2.5 px-3 text-center">Assigned Floors</th>
                    <th className="py-2.5 px-3 text-center">Order Edit / Void</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 text-xs font-semibold">
                        No operators found matching your filter
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const isCurrent = currentUser?.id === user.id;
                      const roleDef = ROLE_DEFINITIONS.find(r => r.role === user.role);
                      const canEditOrder = user.role === 'ADMIN' || user.role === 'MANAGER' || Boolean(user.canEditSubmittedOrders);

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-50/90 transition select-none group cursor-pointer ${
                            isCurrent ? 'bg-purple-50/30' : ''
                          }`}
                          onDoubleClick={() => handleOpenEdit(user)}
                        >
                          {/* 1. Operator / Staff Name + Username */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#004b9b] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {user.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 leading-tight">
                                  <span className="truncate">{user.name}</span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-800 shrink-0">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono leading-none mt-0.5">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. System Role Badge */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                              roleDef ? roleDef.color : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {user.role}
                            </span>
                          </td>

                          {/* 3. Contact (Phone / Email) */}
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap font-medium text-[11px]">
                            <div className="flex flex-col">
                              {user.phone ? (
                                <span className="font-mono text-slate-700">{user.phone}</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">No phone</span>
                              )}
                              {user.email && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[170px] font-mono">
                                  {user.email}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Security PIN */}
                          <td className="py-2 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                            {user.pinOrPassword ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                ••••
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">None</span>
                            )}
                          </td>

                          {/* 5. Modules Access */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {user.role === 'ADMIN' ? (
                              <span className="text-purple-700 font-extrabold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[10px]">
                                All (Full)
                              </span>
                            ) : (
                              <span className="text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {(user.permissions || []).length} modules
                              </span>
                            )}
                          </td>

                          {/* 6. Assigned Floors */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {(!user.assignedZones || user.assignedZones.length === 0) ? (
                              <span className="text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                                All Floors
                              </span>
                            ) : (
                              <div className="inline-flex flex-wrap items-center justify-center gap-1 max-w-[170px]">
                                {user.assignedZones.map(zone => (
                                  <span key={zone} className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold">
                                    {zone}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* 7. Order Edit / Cancel Permission */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              canEditOrder
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              <span>{canEditOrder ? '✓ Allowed' : 'Locked'}</span>
                            </span>
                          </td>

                          {/* 7. Status */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                              <span className={`w-2 h-2 rounded-full ${
                                user.isActive !== false ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'
                              }`} />
                              <span className={user.isActive !== false ? 'text-emerald-700 text-[10px]' : 'text-slate-400 text-[10px]'}>
                                {user.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td className="py-2 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(user)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Edit user"
                              >
                                <Edit3 className="w-3 h-3 text-slate-500" />
                                <span>Edit</span>
                              </button>

                              {user.id !== 'USR-01' ? (
                                <button
                                  type="button"
                                  onClick={() => deleteUser(user.id)}
                                  className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className="w-5" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom summary strip */}
            <div className="py-2 px-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Showing {filteredUsers.length} of {usersList.length} staff accounts</span>
              <span className="text-[10px] text-slate-400">Double-click any row to edit</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERMISSION MATRIX */}
      {activeSubTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-900">Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-500">Configure which modules each staff role can view and operate in the system</p>
            </div>
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>ADMIN role always has full unrestricted access</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Module Name</th>
                  <th className="p-3">Group</th>
                  <th className="p-3 text-center text-purple-900 bg-purple-50/70">ADMIN</th>
                  <th className="p-3 text-center text-blue-900 bg-blue-50/70">MANAGER</th>
                  <th className="p-3 text-center text-emerald-900 bg-emerald-50/70">CASHIER</th>
                  <th className="p-3 text-center text-amber-900 bg-amber-50/70">WAITER</th>
                  <th className="p-3 text-center text-orange-900 bg-orange-50/70">CHEF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ALL_MODULES.map(mod => {
                  return (
                    <tr key={mod.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{mod.label}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {mod.group}
                        </span>
                      </td>

                      {/* ADMIN Column (Always true) */}
                      <td className="p-3 text-center bg-purple-50/30">
                        <div className="flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        </div>
                      </td>

                      {/* MANAGER */}
                      <td className="p-3 text-center bg-blue-50/30">
                        <button
                          onClick={() => togglePermissionForRole('MANAGER', mod.id)}
                          className="p-1 rounded hover:bg-blue-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.MANAGER || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* CASHIER */}
                      <td className="p-3 text-center bg-emerald-50/30">
                        <button
                          onClick={() => togglePermissionForRole('CASHIER', mod.id)}
                          className="p-1 rounded hover:bg-emerald-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.CASHIER || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* WAITER */}
                      <td className="p-3 text-center bg-amber-50/30">
                        <button
                          onClick={() => togglePermissionForRole('WAITER', mod.id)}
                          className="p-1 rounded hover:bg-amber-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.WAITER || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* CHEF */}
                      <td className="p-3 text-center bg-orange-50/30">
                        <button
                          onClick={() => togglePermissionForRole('CHEF', mod.id)}
                          className="p-1 rounded hover:bg-orange-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.CHEF || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* CANCEL OR EDIT SUBMITTED ORDERS ROW */}
                <tr className="hover:bg-slate-50 transition border-b border-slate-100">
                  <td className="p-3 font-bold text-slate-900">
                    Cancel or Edit Submitted Orders
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Operations
                    </span>
                  </td>

                  {/* ADMIN */}
                  <td className="p-3 text-center bg-purple-50/30">
                    <div className="flex items-center justify-center" title="Admin always has full unrestricted access">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    </div>
                  </td>

                  {/* MANAGER */}
                  <td className="p-3 text-center bg-blue-50/30">
                    <button
                      type="button"
                      onClick={() => updateOrderEditPermission('MANAGER', !(data.orderEditPermissions?.MANAGER ?? true))}
                      className="p-1 rounded hover:bg-blue-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Manager permission"
                    >
                      {(data.orderEditPermissions?.MANAGER ?? true) ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>

                  {/* CASHIER */}
                  <td className="p-3 text-center bg-emerald-50/30">
                    <button
                      type="button"
                      onClick={() => updateOrderEditPermission('CASHIER', !(data.orderEditPermissions?.CASHIER ?? true))}
                      className="p-1 rounded hover:bg-emerald-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Cashier permission"
                    >
                      {(data.orderEditPermissions?.CASHIER ?? true) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>

                  {/* WAITER */}
                  <td className="p-3 text-center bg-amber-50/30">
                    <button
                      type="button"
                      id="toggle-waiter-order-edit-matrix"
                      onClick={() => updateOrderEditPermission('WAITER', !(data.orderEditPermissions?.WAITER ?? false))}
                      className="p-1 rounded hover:bg-amber-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Click to toggle Waiter permission to cancel or edit submitted orders"
                    >
                      {(data.orderEditPermissions?.WAITER ?? false) ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 font-bold" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 hover:text-rose-600" />
                      )}
                    </button>
                  </td>

                  {/* CHEF */}
                  <td className="p-3 text-center bg-orange-50/30">
                    <button
                      type="button"
                      onClick={() => updateOrderEditPermission('CHEF', !(data.orderEditPermissions?.CHEF ?? false))}
                      className="p-1 rounded hover:bg-orange-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Chef permission"
                    >
                      {(data.orderEditPermissions?.CHEF ?? false) ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>
                </tr>

                {/* REOPEN / VOID SETTLED BILLS IN POS ROW */}
                <tr className="hover:bg-slate-50 transition border-b border-slate-100">
                  <td className="p-3 font-bold text-slate-900">
                    Reopen / Void Settled Bills in POS
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Finance
                    </span>
                  </td>

                  {/* ADMIN */}
                  <td className="p-3 text-center bg-purple-50/30">
                    <div className="flex items-center justify-center" title="Admin always has full unrestricted access">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    </div>
                  </td>

                  {/* MANAGER */}
                  <td className="p-3 text-center bg-blue-50/30">
                    <button
                      type="button"
                      onClick={() => updateReopenBillPermission('MANAGER', !(data.reopenBillPermissions?.MANAGER ?? DEFAULT_REOPEN_BILL_PERMISSIONS.MANAGER))}
                      className="p-1 rounded hover:bg-blue-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Manager permission to reopen settled bills"
                    >
                      {(data.reopenBillPermissions?.MANAGER ?? DEFAULT_REOPEN_BILL_PERMISSIONS.MANAGER) ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>

                  {/* CASHIER */}
                  <td className="p-3 text-center bg-emerald-50/30">
                    <button
                      type="button"
                      onClick={() => updateReopenBillPermission('CASHIER', !(data.reopenBillPermissions?.CASHIER ?? DEFAULT_REOPEN_BILL_PERMISSIONS.CASHIER))}
                      className="p-1 rounded hover:bg-emerald-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Cashier permission to reopen settled bills"
                    >
                      {(data.reopenBillPermissions?.CASHIER ?? DEFAULT_REOPEN_BILL_PERMISSIONS.CASHIER) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>

                  {/* WAITER */}
                  <td className="p-3 text-center bg-amber-50/30">
                    <button
                      type="button"
                      onClick={() => updateReopenBillPermission('WAITER', !(data.reopenBillPermissions?.WAITER ?? DEFAULT_REOPEN_BILL_PERMISSIONS.WAITER))}
                      className="p-1 rounded hover:bg-amber-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Waiter permission to reopen settled bills"
                    >
                      {(data.reopenBillPermissions?.WAITER ?? DEFAULT_REOPEN_BILL_PERMISSIONS.WAITER) ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 font-bold" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 hover:text-rose-600" />
                      )}
                    </button>
                  </td>

                  {/* CHEF */}
                  <td className="p-3 text-center bg-orange-50/30">
                    <button
                      type="button"
                      onClick={() => updateReopenBillPermission('CHEF', !(data.reopenBillPermissions?.CHEF ?? DEFAULT_REOPEN_BILL_PERMISSIONS.CHEF))}
                      className="p-1 rounded hover:bg-orange-100 transition inline-flex items-center justify-center cursor-pointer"
                      title="Toggle Chef permission"
                    >
                      {(data.reopenBillPermissions?.CHEF ?? DEFAULT_REOPEN_BILL_PERMISSIONS.CHEF) ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-black text-slate-900 mb-4">
              {editingUserId ? 'Edit Operator Profile' : 'Add New Operator Account'}
            </h2>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sajib Khan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. sajib"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Security PIN</label>
                  <input
                    type="text"
                    value={formData.pinOrPassword}
                    onChange={e => setFormData({ ...formData, pinOrPassword: e.target.value })}
                    placeholder="e.g. 123"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. staff@bdhosttpos.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +880 1711-000000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="MANAGER">MANAGER (Operations & Menu)</option>
                  <option value="CASHIER">CASHIER (Live POS & Billing)</option>
                  <option value="WAITER">WAITER (Table Orders & KOT)</option>
                  <option value="CHEF">CHEF (Kitchen & Recipe BOM)</option>
                </select>
              </div>

              {/* Compact Assigned Floor Zones Multi-select Dropdown */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Floor Zones
                </label>
                <div
                  onClick={() => setIsFloorDropdownOpen(!isFloorDropdownOpen)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white hover:border-slate-400 cursor-pointer flex items-center justify-between transition focus:ring-2 focus:ring-purple-500 select-none shadow-2xs"
                >
                  <span className="font-semibold truncate text-slate-800">
                    {formData.assignedZones.length === 0
                      ? 'All Floors (Unrestricted)'
                      : formData.assignedZones.join(', ')}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {formData.assignedZones.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-extrabold text-[10px]">
                        {formData.assignedZones.length}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isFloorDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Dropdown Menu with Checkboxes */}
                {isFloorDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsFloorDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 space-y-0.5 max-h-52 overflow-y-auto">
                      <label
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition select-none"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedZones.length === 0}
                          onChange={() => {
                            setFormData(prev => ({ ...prev, assignedZones: [] }));
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          All Floors (Unrestricted)
                        </span>
                      </label>
                      <div className="border-t border-slate-100 my-1" />
                      {allConfiguredZones.map(zone => {
                        const isChecked = formData.assignedZones.includes(zone);
                        return (
                          <label
                            key={zone}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setFormData(prev => {
                                  const current = prev.assignedZones;
                                  const exists = current.includes(zone);
                                  if (exists) {
                                    return { ...prev, assignedZones: current.filter(z => z !== zone) };
                                  } else {
                                    return { ...prev, assignedZones: [...current, zone] };
                                  }
                                });
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <span className="text-xs font-medium text-slate-700">
                              {zone}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveUser"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isActiveUser" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Account Active & Enabled for Sign In
                </label>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="canEditSubmittedOrders"
                    checked={formData.canEditSubmittedOrders}
                    onChange={e => setFormData({ ...formData, canEditSubmittedOrders: e.target.checked })}
                    className="w-4 h-4 rounded border-amber-400 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="canEditSubmittedOrders" className="text-xs font-bold text-slate-800 cursor-pointer">
                    🛡️ Permission: Can Cancel or Edit Submitted Orders
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  Allow this staff member to edit, modify quantities, void items, or cancel table orders after KOT is sent or bill is printed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Operator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
