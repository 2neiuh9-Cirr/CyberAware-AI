import React from 'react';
import { Activity, Link2, ShieldCheck } from 'lucide-react';
import './LoginSecurityVisual.css';

export const LoginSecurityVisual: React.FC = () => (
  <div className="login-security-visual" role="img" aria-label="Lá chắn AI đang quét và bảo vệ kết nối">
    <div className="login-security-visual__glow" aria-hidden="true" />
    <div className="login-security-visual__orbit login-security-visual__orbit--outer" aria-hidden="true" />
    <div className="login-security-visual__orbit login-security-visual__orbit--inner" aria-hidden="true" />
    <div className="login-security-visual__orbit login-security-visual__orbit--dash" aria-hidden="true" />

    <svg className="login-security-visual__connections" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
      <path d="M54 107 C106 107 121 78 166 91" />
      <path d="M234 88 C279 72 300 56 347 57" />
      <path d="M231 115 C278 132 300 148 348 146" />
    </svg>

    <div className="login-security-visual__scan" aria-hidden="true" />

    <div className="login-security-visual__badge login-security-visual__badge--left" aria-hidden="true">
      <Link2 size={15} strokeWidth={2.2} />
    </div>
    <div className="login-security-visual__badge login-security-visual__badge--right" aria-hidden="true">
      <Activity size={15} strokeWidth={2.2} />
    </div>

    <div className="login-security-visual__core" aria-hidden="true">
      <div className="login-security-visual__shield">
        <ShieldCheck size={31} strokeWidth={1.8} />
      </div>
      <span>AI GUARD</span>
    </div>

    <div className="login-security-visual__label" aria-hidden="true">
      <span className="login-security-visual__pulse" />
      <span>ĐANG GIÁM SÁT</span>
    </div>
    <div className="login-security-visual__caption" aria-hidden="true">
      <span>PHÒNG VỆ THỜI GIAN THỰC</span>
      <span>Liên kết · Danh tính · Giao dịch</span>
    </div>
  </div>
);
