type UserDetails = { id: string; name: string; email: string; initials: string; role: string; status: string; statusLabel: string; registeredDate: string; lastActive: string; lastActiveAction: string };

export function UserDetailsModal({ user, busy, onClose, onResend }: { user: UserDetails | null; busy: boolean; onClose: () => void; onResend: (id: string) => void }) {
  if (!user) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center font-bold text-base">
                  {user.initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{user.id} • {user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onClose()}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Vai trò hiện tại</span>
                <span className="text-slate-900 font-semibold text-sm">{user.role}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Trạng thái</span>
                <span className={`font-semibold text-sm ${user.status === 'locked' ? 'text-red-600' : 'text-emerald-600'}`}>
                  {user.statusLabel}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Ngày gia nhập</span>
                <span className="text-slate-900 font-semibold">{user.registeredDate}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Hoạt động gần nhất</span>
                <span className="text-slate-900 font-semibold">{user.lastActive} {user.lastActiveAction}</span>
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
              <button type="button" disabled={busy} onClick={() => onResend(user.id)} className="px-4 py-2 rounded-lg bg-blue-50 text-[#004AC6] text-xs font-semibold disabled:opacity-50">Gửi mã đặt mật khẩu</button>
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
  );
}
