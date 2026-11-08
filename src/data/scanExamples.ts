import type { ScanType } from '../types';

export const scanExamples: Record<ScanType, string[]> = {
  url: [
    'https://vcb-digibank-xac-thuc-2025.com',
    'https://shopee-thuong-tet-sieusale.cc',
    'https://vietcombank.com.vn',
  ],
  sms: [
    'VCB Digibank: Tai khoan dang nhap tai thiet bi la. Nhan vao https://vcb-top.com de huy uy nhiem chi.',
    'Shopee: Quy khach may man trung 01 xe may SH. Vui long nop thue 2 trieu dong vao STK 098123...',
  ],
  phone: ['+84 902 381 928', '+84 28 8888 9999', '+1 800 234 567'],
  bank: ['19038291028301 - TECHCOMBANK', '1029384756 - VIETCOMBANK'],
};
