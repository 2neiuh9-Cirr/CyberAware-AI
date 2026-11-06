import { db } from './database';

export type ScamRule = { id: string; type: string; title: string; terms: string; weight: number; enabled: number; updatedAt: string };

db.exec(`
  CREATE TABLE IF NOT EXISTS scam_rules (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, terms TEXT NOT NULL,
    weight INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS threat_intel (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, summary TEXT NOT NULL,
    source_name TEXT NOT NULL, source_url TEXT NOT NULL, source_date TEXT NOT NULL,
    terms TEXT NOT NULL, indicators TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'reviewed',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS threat_intel_status ON threat_intel(status, category);
`);

const stamp = new Date().toISOString();
const seedRules: Array<[string, string, string, string[], number]> = [
  ['sms-authority-threat', 'sms', 'Mạo danh cơ quan, đe dọa hoặc ép thời gian', ['cong an', 'vien kiem sat', 'co quan dieu tra', 'truy to', 'lenh bat', 'phat nguoi', 'cat dien', 'khoa tai khoan', 'trong 2 gio', 'trong 24 gio'], 20],
  ['sms-credential-theft', 'sms', 'Lấy cắp thông tin xác thực hoặc cài ứng dụng', ['otp', 'ma xac thuc', 'mat khau', 'ma pin', 'ma cvv', 'so the', 'dang nhap', 'xac minh danh tinh', '.apk', 'cap quyen', 'chia se man hinh'], 35],
  ['sms-transfer', 'sms', 'Dụ chuyển/nạp tiền hoặc trả phí trước', ['chuyen tien', 'nap tien', 'tai khoan an toan', 'tai khoan tam giu', 'phi rut tien', 'phi nhan thuong', 'nop thue qua link'], 35],
  ['sms-prize', 'sms', 'Trúng thưởng, quà tặng hoặc hoàn tiền bất ngờ', ['chuc mung', 'trung thuong', 'trung xe', 'may man trung', 'nhan qua', 'qua tang', 'hoan tien', 'boi thuong'], 30],
  ['sms-prize-value', 'sms', 'Giá trị thưởng lớn hoặc lợi nhuận bất thường', ['tri gia', 'gia tri giai thuong', 'phan thuong', 'loi nhuan cao', 'lai cao', 'cam ket loi nhuan'], 10],
  ['sms-action-link', 'sms', 'Kêu gọi bấm link để nhận quà/xác minh', ['nhan vao', 'bam vao', 'click vao', 'hoan tat thu tuc', 'xac nhan nhan qua', 'dang ky nhan'], 15],
  ['sms-scarcity', 'sms', 'Tạo khan hiếm hoặc chọn ngẫu nhiên người nhận', ['1 trong', 'mot trong', 'khach hang may man', 'so luong co han'], 10],
  ['sms-link', 'sms', 'Tin nhắn có đường dẫn', ['http://', 'https://', 'www.'], 10],
  ['sms-task-job', 'sms', 'Việc nhẹ lương cao/cộng tác viên làm nhiệm vụ', ['viec nhe luong cao', 'cong tac vien', 'lam nhiem vu', 'tang tuong tac', 'hoa hong cao'], 20],
  ['sms-investment', 'sms', 'Đầu tư/lợi nhuận được cam kết', ['dau tu', 'loi nhuan', 'lai suat', 'cam ket lai', 'bao dam loi nhuan'], 20],
];
const putRule = db.prepare('INSERT OR IGNORE INTO scam_rules (id,type,title,terms,weight,enabled,updated_at) VALUES (?,?,?,?,?,1,?)');
for (const [id, type, title, terms, weight] of seedRules) putRule.run(id, type, title, JSON.stringify(terms), weight, stamp);

const seedIntel = [
  { id: 'official-voice-impersonation-2023', title: 'Cuộc gọi mạo danh cơ quan nhà nước, ngân hàng, nhà mạng', category: 'Mạo danh cơ quan/tổ chức', summary: 'Cảnh báo về đối tượng dùng số thuê bao giả mạo cơ quan nhà nước, công an, viện kiểm sát, ngân hàng hoặc nhà mạng để thu thập thông tin, đe dọa và chiếm đoạt tài sản. Bản ghi lưu thủ đoạn chung, không liệt kê số điện thoại cụ thể.', sourceName: 'Cổng thông tin Bộ Thông tin và Truyền thông', sourceUrl: 'https://cspl.mic.gov.vn/Pages/TinTuc/138687/CAC-SO-dIEN-THOAI-GOI-TU-CAC-dON-VI-THUOC-BO-THONG-TIN-VA-TRUYEN-THONG-GOI-dEN-NGUOI-DAN-SE-DUOC-HIEN-THI-TEN-DINH-DANH.html', sourceDate: '2023-10-29', terms: ['gia mao', 'cong an', 'vien kiem sat', 'ngan hang', 'nha mang', 'thu thap thong tin', 'de doa'], indicators: [] },
  { id: 'official-fake-electricity-tax-2025', title: 'Mạo danh thuế/điện lực để lấy dữ liệu hoặc tiền', category: 'Mạo danh cơ quan/dịch vụ', summary: 'Cảnh báo ghi nhận giả danh công chức thuế yêu cầu thông tin/giấy phép qua Zalo và giả danh điện lực đe dọa cắt điện, yêu cầu nộp tiền hoặc cài ứng dụng/website giả. Chỉ dùng cụm thủ đoạn chung để đối chiếu.', sourceName: 'Nền tảng ONETOUCH thuộc Bộ TT&TT', sourceUrl: 'https://onetouch.mic.gov.vn/chi-tiet-tin-tuc/lua-dao-truc-tuyen-van-nan-nhung-ngay-dau-nam-2025', sourceDate: '2025-01-15', terms: ['gia mao', 'cong chuc thue', 'giay phep kinh doanh', 'dien luc', 'cat dien', 'cai ung dung', 'website gia mao'], indicators: [] },
  { id: 'official-cheap-travel-task-scam-2025', title: 'Vé giá rẻ giả mạo và việc nhẹ lương cao', category: 'Khuyến mãi giả/việc làm nhiệm vụ', summary: 'Cảnh báo về khuyến mãi/vé xe, vé máy bay giá rẻ giả mạo, cam kết chiết khấu cao và tuyển cộng tác viên làm nhiệm vụ để chiếm đoạt tiền.', sourceName: 'Nền tảng ONETOUCH thuộc Bộ TT&TT', sourceUrl: 'https://onetouch.mic.gov.vn/chi-tiet-tin-tuc/lua-dao-truc-tuyen-van-nan-nhung-ngay-dau-nam-2025', sourceDate: '2025-01-15', terms: ['ve xe gia re', 've may bay gia re', 'chiet khau cao', 'cong tac vien', 'lam nhiem vu', 'tang tuong tac'], indicators: [] },
  { id: 'official-fake-misa-investment-2023', title: 'Website/app giả mạo MISA dụ chuyển tiền, hứa hoa hồng/lợi nhuận', category: 'Website giả mạo/đầu tư', summary: 'Cảnh báo của MISA về website/app mạo danh, dụ chuyển tiền giao dịch mua hàng để nhận hoa hồng và gói đầu tư lợi nhuận cao. Tên miền trong bài cảnh báo cũ không được đưa thành chỉ dấu đang hoạt động.', sourceName: 'Trung tâm Chứng thực điện tử quốc gia (NEAC), dẫn cảnh báo MISA', sourceUrl: 'https://neac.mic.gov.vn/vi/tin-tuc-su-kien/detail/canh-bao-trang-web-gia-mao-dich-vu-misa-chiem-doat-tai-san-375.htm', sourceDate: '2023-07-05', terms: ['gia mao misa', 'chuyen tien', 'nhan hoa hong', 'loi nhuan cao', 'goi du lieu', 'mua hang truc tuyen'], indicators: [] },
  { id: 'official-fake-digital-signature-2024', title: 'Email giả mạo nhà cung cấp chữ ký số đòi gia hạn gấp', category: 'Giả mạo dịch vụ/chữ ký số', summary: 'Cảnh báo VNCERT/CC về email giả danh nhà cung cấp chứng thư số, báo hết hạn và yêu cầu gia hạn để chiếm đoạt tài sản. Không dùng domain/email cụ thể vì có thể thay đổi hoặc bị tái sử dụng hợp pháp.', sourceName: 'NEAC, dẫn cảnh báo VNCERT/CC', sourceUrl: 'https://neac.mic.gov.vn/vi/tin-tuc-su-kien/detail/xuat-hien-hinh-thuc-lua-dao-moi-nham-vao-nguoi-dung-chu-ky-so-525.htm', sourceDate: '2024-05-20', terms: ['chu ky so', 'token het han', 'gia han ngay', 'gia mao nha cung cap', 'chiem doat tai san'], indicators: [] },
];
const putIntel = db.prepare('INSERT OR IGNORE INTO threat_intel (id,title,category,summary,source_name,source_url,source_date,terms,indicators,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for (const item of seedIntel) putIntel.run(item.id, item.title, item.category, item.summary, item.sourceName, item.sourceUrl, item.sourceDate, JSON.stringify(item.terms), JSON.stringify(item.indicators), 'reviewed', stamp);

export function normalizedText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

export function evaluateStoredRules(type: string, text: string) {
  const plain = normalizedText(text);
  const rules = db.prepare('SELECT id,type,title,terms,weight,enabled,updated_at AS updatedAt FROM scam_rules WHERE type IN (?,?) AND enabled = 1 ORDER BY id').all(type, 'all') as unknown as ScamRule[];
  let score = 0;
  const flags: string[] = [];
  const matches: string[] = [];
  for (const rule of rules) {
    const terms = JSON.parse(rule.terms) as string[];
    if (terms.some(term => plain.includes(normalizedText(term)))) {
      score += Number(rule.weight);
      flags.push(rule.title);
      matches.push(rule.id);
    }
  }
  return { score: Math.min(score, 90), flags, matches, rulesVersion: rules.map(rule => rule.updatedAt).sort().at(-1) || null };
}

export function matchReviewedIntel(type: string, query: string) {
  const plain = normalizedText(query);
  const rows = db.prepare("SELECT id,title,category,summary,source_name AS sourceName,source_url AS sourceUrl,source_date AS sourceDate,terms,indicators FROM threat_intel WHERE status='reviewed'").all() as Array<Record<string, string>>;
  const matches: Array<Record<string, string | boolean>> = [];
  for (const row of rows) {
    const terms = JSON.parse(row.terms) as string[];
    const indicators = JSON.parse(row.indicators) as Array<{ type: string; value: string }>;
    const normalizedIndicator = (value: string) => {
      if (type === 'phone') {
        let phone = value.replace(/\D/g, '');
        if (phone.startsWith('0084')) phone = `84${phone.slice(4)}`;
        if (phone.startsWith('0') && phone.length === 10) phone = `84${phone.slice(1)}`;
        return phone;
      }
      if (type === 'bank') return value.replace(/\D/g, '');
      if (type === 'url') return value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/$/, '');
      return normalizedText(value);
    };
    const indicatorMatched = indicators.some(item => item.type === type && normalizedIndicator(item.value) !== '' && normalizedIndicator(item.value) === normalizedIndicator(query));
    const textMatched = type === 'sms' && terms.length > 0 && terms.some(term => plain.includes(normalizedText(term)));
    if (indicatorMatched || textMatched) matches.push({ ...row, indicatorMatched });
  }
  return matches;
}
