import { db } from '../auth';
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) throw new Error('Cách dùng: npm run admin -- email-da-dang-ky@example.com');
const result = db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
if (!result.changes) throw new Error('Không tìm thấy tài khoản đã đăng ký.');
console.log('Đã cấp quyền quản trị cho tài khoản được chỉ định.');
db.close();
