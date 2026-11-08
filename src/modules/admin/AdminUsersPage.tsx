import React, { useState, useMemo, useEffect } from 'react';
import { api, json } from '../../api';
import { notify } from '../../components/common/toast';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: 'Công dân' | 'Chuyên gia kiểm duyệt' | 'Admin';
  registeredDate: string;
  status: 'active' | 'locked';
  statusLabel: string;
  statusDetail?: string;
  lastActive: string;
  lastActiveAction: string;
  phone?: string;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState({ total: 0, byRole: { member: 0, reviewer: 0, admin: 0 }, locked: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Interactive editing states
  const [roleEditUser, setRoleEditUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'Công dân' | 'Chuyên gia kiểm duyệt' | 'Admin'>('Chuyên gia kiểm duyệt');
  
  // Account lock dialog state
  const [lockTargetUser, setLockTargetUser] = useState<AdminUserItem | null>(null);
  const [lockReason, setLockReason] = useState('');
  
  // User detail drawer modal
  const [viewingUser, setViewingUser] = useState<AdminUserItem | null>(null);

  // New user modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Công dân' | 'Chuyên gia kiểm duyệt' | 'Admin'>('Công dân');

  const showToast = (msg: string) => notify(msg, msg.startsWith('Đang') || msg.startsWith('Vai trò hiện tại') ? 'info' : 'success');
  const load = async () => {
    try {
      const [list, summary] = await Promise.all([
        api<{ items: Array<{ id: string; name: string; email: string; role: string; phone: string; status: 'active'|'locked'; statusReason: string|null; createdAt: string; lastActiveAt: string|null }>; total: number }>('/admin/users?pageSize=100'),
        api<{ total: number; byRole: { member: number; reviewer: number; admin: number }; locked: number }>('/admin/users/summary'),
      ]);
      const all = [...list.items];
      for (let nextPage = 2; all.length < list.total; nextPage++) {
        const next = await api<typeof list>(`/admin/users?pageSize=100&page=${nextPage}`);
        all.push(...next.items);
      }
      const mapped = all.map(u => ({ id: u.id, name: u.name, email: u.email, initials: u.name.split(' ').slice(-2).map(word => word[0]).join('').toUpperCase(), role: u.role === 'admin' ? 'Admin' : u.role === 'reviewer' ? 'Chuyên gia kiểm duyệt' : 'Công dân', registeredDate: new Date(u.createdAt).toLocaleDateString('vi-VN'), status: u.status, statusLabel: u.status === 'locked' ? 'Bị khóa' : 'Đang hoạt động', statusDetail: u.statusReason || undefined, lastActive: u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('vi-VN') : 'Chưa có', lastActiveAction: '', phone: u.phone || '' })) as AdminUserItem[];
      setUsers(mapped);
      setRoleEditUser(previous => mapped.find(user => user.id === previous?.id) || mapped[0] || null);
      if (mapped[0] && !roleEditUser) setSelectedNewRole(mapped[0].role);
      setStats(summary); setError('');
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  const mutate = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true); setError('');
    try { await task(); await load(); showToast(success); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'citizen' && u.role === 'Công dân') ||
        (roleFilter === 'reviewer' && u.role === 'Chuyên gia kiểm duyệt') ||
        (roleFilter === 'admin' && u.role === 'Admin');

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'active' && u.status === 'active') ||
        (statusFilter === 'locked' && u.status === 'locked');

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const previewLockUser = users.find(user => user.status === 'active' && user.role !== 'Admin');
  useEffect(() => { setPage(1); }, [searchQuery, roleFilter, statusFilter, pageSize]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveRole = () => {
    if (!roleEditUser) return;
    if (selectedNewRole === roleEditUser.role) { showToast('Vai trò hiện tại đã được giữ nguyên.'); return; }
    const role = selectedNewRole === 'Admin' ? 'admin' : selectedNewRole === 'Chuyên gia kiểm duyệt' ? 'reviewer' : 'member';
    void mutate(() => api(`/admin/users/${roleEditUser.id}/role`, json('PATCH', { role })), `Đã cập nhật vai trò của ${roleEditUser.name}; các phiên cũ đã được thu hồi.`);
  };

  const handleToggleLock = (user: AdminUserItem) => {
    if (user.status === 'locked') {
      void mutate(() => api(`/admin/users/${user.id}/unlock`, json('POST')), `Đã mở khóa tài khoản ${user.name}.`);
    } else {
      // Open lock confirmation modal
      setLockTargetUser(user);
    }
  };

  const handleConfirmLock = () => {
    if (!lockTargetUser) return;
    const target = lockTargetUser;
    void mutate(async () => { await api(`/admin/users/${target.id}/lock`, json('POST', { reason: lockReason })); setLockTargetUser(null); }, `Đã khóa tài khoản ${target.name} và thu hồi phiên.`);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const role = newUserRole === 'Admin' ? 'admin' : newUserRole === 'Chuyên gia kiểm duyệt' ? 'reviewer' : 'member';
    setBusy(true); setError('');
    try {
      const result = await api<{ setup: { deliveryMode: string; message?: string } }>('/admin/users', json('POST', { name: newUserName, email: newUserEmail, role }));
      setIsAddUserOpen(false); setNewUserName(''); setNewUserEmail('');
      await load();
      showToast(result.setup.deliveryMode === 'email' ? 'Đã tạo tài khoản và gửi mã đặt mật khẩu tới email.' : result.setup.message || 'Đã tạo tài khoản; mã được lưu trong hộp thư phát triển cục bộ.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-[1440px] mx-auto">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        
        {/* 1. Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col space-y-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-blue-50 text-[#004AC6] text-xs font-semibold tracking-wide border border-blue-100">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>IDENTITY &amp; ACCESS MANAGEMENT • Kiểm soát phân quyền và an toàn tài khoản v3.4</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Quản lý người dùng
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl">
              Quản lý tài khoản, phân quyền và kiểm soát trạng thái người dùng trên hệ thống CyberAware AI.
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { window.location.href = '/api/admin/users/export'; }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
              <span>Xuất danh sách (CSV)</span>
            </button>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>Thêm người dùng mới</span>
            </button>
          </div>
        </div>

        {/* 2. Thống kê 4 thẻ (Đồng bộ SCREEN_20) */}
        <div role="region" aria-label="Thống kê người dùng" tabIndex={0} className="no-scrollbar grid w-full grid-flow-col grid-rows-2 auto-cols-[calc(100%_-_2.5rem)] gap-5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-2 sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0 xl:grid-cols-4">
          {/* Card 1 */}
          <div className="rounded-xl bg-white p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tổng người dùng</span>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#004AC6]">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">{stats.total}</div>
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>Dữ liệu tài khoản hiện có</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl bg-white p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Công dân</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">{stats.byRole.member}</div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">pie_chart</span>
                <span>{stats.total ? Math.round(stats.byRole.member / stats.total * 100) : 0}% tổng tài khoản</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl bg-white p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Chuyên gia kiểm duyệt</span>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#004AC6]">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">{stats.byRole.reviewer}</div>
              <div className="flex items-center gap-1.5 text-[#004AC6] text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">security</span>
                <span>Kiểm duyệt viên an ninh &amp; SOC</span>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl bg-white p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Tài khoản bị khóa</span>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <span className="material-symbols-outlined text-[22px]">lock_person</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">{stats.locked}</div>
              <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>Vi phạm chính sách / Tạm khóa</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Thanh tìm kiếm và bộ lọc đa năng */}
        <div className="rounded-xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative min-w-0 flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 border border-slate-200 outline-none transition-all shadow-inner focus:ring-2 focus:ring-[#004AC6]/20 focus:border-[#004AC6]"
                placeholder="Tìm theo tên, email, số điện thoại, mã USR-xxx..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter: Role */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg pl-3.5 pr-8 py-2.5 border border-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="citizen">Công dân</option>
                  <option value="reviewer">Chuyên gia kiểm duyệt</option>
                  <option value="admin">Admin</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[18px] text-slate-400">
                  expand_more
                </span>
              </div>

              {/* Filter: Status */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg pl-3.5 pr-8 py-2.5 border border-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Tạm khóa / Bị khóa</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[18px] text-slate-400">
                  expand_more
                </span>
              </div>

              {/* Reset CTA */}
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Đặt lại bộ lọc</span>
              </button>
            </div>
          </div>

          {/* Active counter line */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Hiển thị <span className="font-semibold text-slate-900">{filteredUsers.length ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, filteredUsers.length)}</span> trên tổng số{' '}
              <span className="font-semibold text-slate-900">{filteredUsers.length}</span> người dùng
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500">Dữ liệu thời gian thực được đồng bộ</span>
            </div>
          </div>
        </div>

        {/* 4. Bảng dữ liệu người dùng */}
        <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#004AC6] focus:ring-0 cursor-pointer"
                      checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="py-3.5 px-4">Người dùng</th>
                  <th className="py-3.5 px-4">Mã ID</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Ngày đăng ký</th>
                  <th className="py-3.5 px-4">Trạng thái tài khoản</th>
                  <th className="py-3.5 px-4">Hoạt động gần nhất</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Không tìm thấy người dùng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  visibleUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    const isLocked = user.status === 'locked';

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectUser(user.id)}
                            className="w-4 h-4 rounded text-[#004AC6] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center font-bold text-xs shrink-0">
                              {user.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-500 font-medium">{user.id}</td>
                        <td className="py-4 px-4">
                          {user.role === 'Admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-200">
                              <span className="material-symbols-outlined text-[14px]">shield</span>
                              Admin
                            </span>
                          ) : user.role === 'Chuyên gia kiểm duyệt' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#004AC6] font-semibold text-[11px] border border-blue-200">
                              <span className="material-symbols-outlined text-[14px]">shield_person</span>
                              Chuyên gia kiểm duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              <span className="material-symbols-outlined text-[14px]">person</span>
                              Công dân
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-500">{user.registeredDate}</td>
                        <td className="py-4 px-4">
                          {isLocked ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                Bị khóa
                              </span>
                              {user.statusDetail && (
                                <span className="block text-red-600 text-[11px] font-medium mt-0.5">
                                  {user.statusDetail}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Đang hoạt động
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-500">
                          <span className="text-slate-800 font-medium">{user.lastActive}</span>
                          <span className="block text-slate-400 text-[11px]">{user.lastActiveAction}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingUser(user)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                              title="Xem chi tiết"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRoleEditUser(user);
                                setSelectedNewRole(user.role);
                                showToast(`Đang chỉnh sửa phân quyền cho ${user.name}`);
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-[#004AC6] transition-colors"
                              title="Sửa quyền"
                            >
                              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                            </button>
                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleToggleLock(user)}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Mở khóa tài khoản"
                              >
                                <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                <span>Mở khóa</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleLock(user)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                                title="Khóa tài khoản"
                              >
                                <span className="material-symbols-outlined text-[18px]">lock</span>
                              </button>
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

          {/* Table Pagination */}
          <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>Số hàng mỗi trang:</span>
              <div className="relative">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="appearance-none bg-slate-50 text-slate-800 font-semibold rounded px-3 py-1 pr-6 border border-slate-200 outline-none cursor-pointer">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] text-slate-400">
                  expand_more
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40" type="button">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-[#004AC6] text-white font-semibold flex items-center justify-center shadow-xs" type="button">
                {page}
              </button>
              <span className="px-1 text-slate-400">/ {pageCount}</span>
              <button disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40" type="button">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Khu vực tương tác quản trị mô phỏng trực quan (Interactive Panels) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* a) Modal/Card Phân quyền & Chỉnh sửa vai trò */}
          <div className="rounded-xl bg-white p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#004AC6] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Phân quyền &amp; Chỉnh sửa vai trò</h2>
                    <p className="text-xs text-slate-500">Cập nhật đặc quyền an ninh cho tài khoản nội bộ</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
                  {roleEditUser?.id || 'Chọn người dùng'}
                </span>
              </div>

              {/* Target User Preview */}
              <div className="flex items-center gap-3.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center text-sm font-bold shrink-0">
                  {roleEditUser?.initials || '—'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{roleEditUser?.name || 'Chọn tài khoản trong bảng'}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-[#004AC6]">
                      Hiện tại: {roleEditUser?.role || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{roleEditUser?.email || ''}</p>
                </div>
              </div>

              {/* Role Select Options */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-900">Chọn vai trò hệ thống mới:</label>

                {/* Option 1: Công dân */}
                <label
                  onClick={() => setSelectedNewRole('Công dân')}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedNewRole === 'Công dân'
                      ? 'bg-blue-50/60 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="system_role"
                    checked={selectedNewRole === 'Công dân'}
                    onChange={() => setSelectedNewRole('Công dân')}
                    className="mt-1 w-4 h-4 text-[#004AC6] focus:ring-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Công dân</span>
                      <span className="text-xs text-slate-500 font-medium">Quyền cơ bản</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sử dụng dịch vụ tra cứu URL, số điện thoại, tham gia khóa học cộng đồng và làm bài trắc nghiệm.
                    </p>
                  </div>
                </label>

                {/* Option 2: Chuyên gia kiểm duyệt */}
                <label
                  onClick={() => setSelectedNewRole('Chuyên gia kiểm duyệt')}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedNewRole === 'Chuyên gia kiểm duyệt'
                      ? 'bg-blue-50/60 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="system_role"
                    checked={selectedNewRole === 'Chuyên gia kiểm duyệt'}
                    onChange={() => setSelectedNewRole('Chuyên gia kiểm duyệt')}
                    className="mt-1 w-4 h-4 text-[#004AC6] focus:ring-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#004AC6]">Chuyên gia kiểm duyệt</span>
                      <span className="text-xs text-[#004AC6] font-medium">SOC / Threat Hunter</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Xác thực chứng cứ phishing, phê duyệt báo cáo lừa đảo cộng đồng, đóng góp kịch bản bài thi kiểm thử.
                    </p>
                  </div>
                </label>

                {/* Option 3: Admin */}
                <label
                  onClick={() => setSelectedNewRole('Admin')}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedNewRole === 'Admin'
                      ? 'bg-blue-50/60 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="system_role"
                    checked={selectedNewRole === 'Admin'}
                    onChange={() => setSelectedNewRole('Admin')}
                    className="mt-1 w-4 h-4 text-[#004AC6] focus:ring-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Admin</span>
                      <span className="text-xs text-red-600 font-medium">Đặc quyền cao nhất</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Quản lý toàn bộ cấu hình lõi AI, phân quyền người dùng, can thiệp danh sách đen máy chủ quốc gia.
                    </p>
                  </div>
                </label>
              </div>

              {/* Warning Callout */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70">
                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5 text-amber-600">warning</span>
                <p className="text-xs leading-relaxed">
                  Cảnh báo phân quyền nhạy cảm: Việc thay đổi vai trò sẽ tạo bản ghi kiểm toán Audit Log và có hiệu lực ngay trong phiên làm việc tiếp theo.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedNewRole(roleEditUser?.role || 'Công dân')}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="px-5 py-2 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>

          {/* b) Hộp thoại cảnh báo Khóa tài khoản an toàn */}
          <div className="rounded-xl bg-white p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">gavel</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Xác nhận khóa tài khoản an toàn</h2>
                    <p className="text-xs text-slate-500">Đình chỉ tức thì các hành vi khả nghi hoặc vi phạm chính sách</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold font-mono">
                  {previewLockUser?.id.slice(0, 8) || '—'}
                </span>
              </div>

              {/* Alert User Context */}
              <div className="p-4 rounded-lg bg-red-50/70 border border-red-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">Đối tượng áp dụng:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-600 text-white">
                    Tài khoản đang hoạt động
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                    {previewLockUser?.initials || '—'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{previewLockUser?.name || 'Chưa có tài khoản phù hợp'}</p>
                    <p className="text-xs text-slate-500 font-mono">{previewLockUser?.email || ''}</p>
                  </div>
                </div>
              </div>

              {/* Security Impact Analysis */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-900">Hậu quả bảo mật khi khóa:</label>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span>Thu hồi ngay các phiên đăng nhập web của tài khoản</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span>Vô hiệu hóa token truy cập API hiện tại</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span>Ghi lại lý do và người thực hiện vào nhật ký quản trị</span>
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">Lý do khóa tài khoản (Ghi vào Audit Log):</label>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-red-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => showToast('Đã hủy thao tác khóa tài khoản.')}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => { if (previewLockUser) setLockTargetUser(previewLockUser); }}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Khóa tài khoản</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Thêm người dùng mới */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setIsAddUserOpen(false); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004AC6] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thêm người dùng mới</h3>
                  <p className="text-xs text-slate-500">Cấp tài khoản thủ công cho chuyên viên hoặc công dân</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              {error && <p role="alert" className="text-red-700">{error}</p>}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Tuấn Anh"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="tuananh.hoang@domain.vn"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vai trò hệ thống</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6] cursor-pointer"
                >
                  <option value="Công dân">Công dân</option>
                  <option value="Chuyên gia kiểm duyệt">Chuyên gia kiểm duyệt</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết người dùng */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setViewingUser(null); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center font-bold text-base">
                  {viewingUser.initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingUser.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{viewingUser.id} • {viewingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Vai trò hiện tại</span>
                <span className="text-slate-900 font-semibold text-sm">{viewingUser.role}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Trạng thái</span>
                <span className={`font-semibold text-sm ${viewingUser.status === 'locked' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {viewingUser.statusLabel}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Ngày gia nhập</span>
                <span className="text-slate-900 font-semibold">{viewingUser.registeredDate}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Hoạt động gần nhất</span>
                <span className="text-slate-900 font-semibold">{viewingUser.lastActive} {viewingUser.lastActiveAction}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-slate-700 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#004AC6] text-base shrink-0 mt-0.5">security</span>
              <div>
                <p className="font-semibold text-[#004AC6]">Thông tin tài khoản</p>
                <p className="mt-0.5 text-slate-600">Hệ thống chưa ghi nhận xác thực 2FA hoặc VNeID cho tài khoản này.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" disabled={busy} onClick={() => void mutate(() => api(`/admin/users/${viewingUser.id}/invitation/resend`, json('POST')), 'Đã gửi mã đặt mật khẩu mới hoặc lưu trong hộp thư phát triển.')} className="px-4 py-2 rounded-lg bg-blue-50 text-[#004AC6] text-xs font-semibold disabled:opacity-50">Gửi mã đặt mật khẩu</button>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Confirmation Dialog */}
      {lockTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setLockTargetUser(null); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-red-200 space-y-4 animate-scale-up">
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-red-100">
              <span className="material-symbols-outlined text-2xl">gavel</span>
              <h3 className="text-base font-bold text-slate-900">Xác nhận khóa tài khoản</h3>
            </div>
            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn khóa tài khoản <span className="font-semibold text-slate-900">{lockTargetUser.name}</span> ({lockTargetUser.id})? Hành động này sẽ thu hồi quyền truy cập ngay lập tức.
            </p>
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Lý do:</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setLockTargetUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLock}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};
