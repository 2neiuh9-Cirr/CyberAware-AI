export function PasswordStrengthMeter({ newPassword }: { newPassword: string }) {
  // Password strength calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const criteriaMetCount = [hasMinLength, hasUpperLower, hasNumber, hasSpecial].filter(Boolean).length;

  let strengthLabel = 'Chưa nhập mật khẩu';
  let strengthColor = 'text-slate-400';
  if (newPassword.length > 0) {
    if (criteriaMetCount === 4) {
      strengthLabel = 'Rất mạnh (Khuyến nghị)';
      strengthColor = 'text-emerald-600';
    } else if (criteriaMetCount === 3) {
      strengthLabel = 'Mạnh';
      strengthColor = 'text-emerald-500';
    } else if (criteriaMetCount === 2) {
      strengthLabel = 'Trung bình';
      strengthColor = 'text-amber-500';
    } else {
      strengthLabel = 'Yếu';
      strengthColor = 'text-rose-500';
    }
  }

  return (
                  <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col gap-2.5 mt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                      <span className={strengthColor}>{strengthLabel}</span>
                    </div>

                    {/* 4 segment bar */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 1
                            ? criteriaMetCount >= 3
                              ? 'bg-emerald-500'
                              : criteriaMetCount === 2
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                            : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 2
                            ? criteriaMetCount >= 3
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                            : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 3 ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 4 ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    </div>

                    {/* Checklist criteria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Tối thiểu 8 ký tự</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpperLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasUpperLower ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Ký tự viết hoa &amp; viết thường</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Ít nhất 1 chữ số (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Ký hiệu đặc biệt (@, #, $, %...)</span>
                      </div>
                    </div>
                  </div>
  );
}
