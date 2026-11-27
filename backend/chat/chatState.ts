import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { db } from '../database';
import { currentUser, chatDigest } from '../auth';
import { ApiError } from '../http';

// Hạn mức theo ngày của khách và thành viên; quản trị viên có thể ghi đè trong chat_settings.
export const defaults = {
  enabled: true,
  imagesEnabled: true,
  guestTurns: 10,
  memberTurns: 40,
  guestTokens: 40000,
  memberTokens: 160000,
  guestImages: 3,
  memberImages: 10,
};

// Tạo bảng cấu hình, hội thoại, tin nhắn, mức sử dụng và ngữ cảnh tệp đã gửi.
db.exec(`
CREATE TABLE IF NOT EXISTS chat_settings(id INTEGER PRIMARY KEY, config TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat_conversations(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS chat_owner ON chat_conversations(user_id,updated_at,id);
CREATE TABLE IF NOT EXISTS chat_messages(seq INTEGER PRIMARY KEY,id TEXT UNIQUE NOT NULL,conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,sources TEXT NOT NULL,created_at TEXT NOT NULL,attachment TEXT);
CREATE INDEX IF NOT EXISTS chat_history ON chat_messages(conversation_id,seq);
CREATE TABLE IF NOT EXISTS chat_usage(actor TEXT NOT NULL,request_id TEXT NOT NULL,day TEXT NOT NULL,tokens INTEGER NOT NULL,image INTEGER NOT NULL,started INTEGER NOT NULL,pending INTEGER NOT NULL,PRIMARY KEY(actor,request_id));
CREATE INDEX IF NOT EXISTS chat_daily ON chat_usage(actor,day);
CREATE TABLE IF NOT EXISTS chat_attachment_context(attachment_id TEXT PRIMARY KEY,actor TEXT NOT NULL,session_id TEXT NOT NULL,conversation_id TEXT REFERENCES chat_conversations(id) ON DELETE CASCADE,name TEXT NOT NULL,mime_type TEXT NOT NULL,extracted_text TEXT NOT NULL,inline_mime_type TEXT,inline_data BLOB,created_at TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS chat_attachment_context_lookup ON chat_attachment_context(actor,session_id,created_at DESC);
`);

// Bổ sung cột cho cơ sở dữ liệu cũ mà không làm mất lịch sử chat đã có.
if (!(db.prepare('PRAGMA table_info(chat_messages)').all() as Array<{ name: string }>).some(column => column.name === 'attachment')) {
  db.exec('ALTER TABLE chat_messages ADD COLUMN attachment TEXT');
}
if (!(db.prepare('PRAGMA table_info(chat_attachment_context)').all() as Array<{ name: string }>).some(column => column.name === 'conversation_id')) {
  db.exec('ALTER TABLE chat_attachment_context ADD COLUMN conversation_id TEXT REFERENCES chat_conversations(id) ON DELETE CASCADE');
  db.exec("UPDATE chat_attachment_context SET conversation_id=session_id WHERE actor LIKE 'u:%' AND EXISTS (SELECT 1 FROM chat_conversations WHERE id=session_id)");
}
db.exec('CREATE INDEX IF NOT EXISTS chat_attachment_context_conversation ON chat_attachment_context(conversation_id)');

// Dọn lịch sử cũ, bản ghi hạn mức quá hạn và ngữ cảnh tệp hết hạn lúc khởi động và mỗi giờ.
function clean() {
  const cutoff=new Date(Date.now()-30*86400000).toISOString();
  db.prepare('DELETE FROM chat_messages WHERE created_at < ?').run(cutoff);
  db.prepare('DELETE FROM chat_conversations WHERE updated_at < ?').run(cutoff);
  db.prepare('DELETE FROM chat_usage WHERE started < ?').run(Date.now()-2*86400000);
  db.prepare('DELETE FROM chat_attachment_context WHERE expires_at <= ?').run(Date.now());
}
clean();
setInterval(clean,3600000).unref();
export const model=()=>process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-3.1-flash-lite';

// Cấu hình hiệu lực = mặc định + phần đã lưu; API quản trị còn trả tình trạng khóa API và thống kê.
export function settings():typeof defaults {
  const row=db.prepare('SELECT config FROM chat_settings WHERE id=1').get();
  return {...defaults,...JSON.parse(String(row?.config || '{}'))};
}
export function adminChatSettings() {
  const usage=db.prepare('SELECT COUNT(*) AS turns,COALESCE(SUM(tokens),0) AS tokens FROM chat_usage WHERE day=?').get(day());
  return {...settings(),configured:!!process.env.GEMINI_API_KEY?.trim(),model:model(),usage};
}
// Chỉ nhận các khóa cấu hình đã khai báo, kiểm tra kiểu/giới hạn rồi lưu một bản cấu hình hợp lệ.
export function updateChatSettings(input:Record<string,unknown>) {
  if(!input || !Object.keys(input).length) throw new ApiError(400,'Cần nhập cấu hình.');
  for(const [key,v] of Object.entries(input)){
    if(!Object.hasOwn(defaults,key)) throw new ApiError(400,'Trường cấu hình không hợp lệ.');
    if(['enabled','imagesEnabled'].includes(key)){
      if(typeof v!=='boolean') throw new ApiError(400,'Giá trị bật/tắt không hợp lệ.');
    } else if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1||v>(key.endsWith('Tokens')?1000000:200)) throw new ApiError(400,'Hạn mức không hợp lệ.');
  }
  if(input.enabled && !process.env.GEMINI_API_KEY?.trim()) throw new ApiError(409,'Cần cấu hình khóa Gemini.');
  db.prepare('INSERT OR REPLACE INTO chat_settings VALUES(1,?)').run(JSON.stringify({...settings(),...input}));
  return adminChatSettings();
}
const day=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
export const MAX_CONTEXT_INLINE_BYTES=2*1024*1024;
export const MAX_CONTEXTS_PER_SESSION=3;
export const MAX_CONTEXTS_PER_ACTOR=6;
export const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

// Tách người đăng nhập và khách; khách được nhận cookie ký để áp dụng hạn mức qua nhiều yêu cầu.
export function identity(req:Request,res:Response){
  const user=currentUser(req);
  if(user) return {actor:'u:'+user.id,userId:user.id};
  if(req.headers.authorization || req.headers.cookie?.includes('cyberaware_session=')) throw new ApiError(401,'Phiên đăng nhập đã hết hạn.');
  const value=req.headers.cookie?.match(/(?:^|;\s*)chat_guest=([^;]+)/)?.[1] || '';
  let [id,sig]=value.split('.');
  if(!uuid.test(id)||sig!==chatDigest(id)){
    id=randomUUID();
    res.cookie('chat_guest',id+'.'+chatDigest(id),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/api/chat',maxAge:86400000});
  }
  return {actor:'g:'+chatDigest(id),userId:null};
}
export function member(req: Request) {
  const user = currentUser(req);
  if (!user) throw new ApiError(401, 'Vui lòng đăng nhập.');
  return user.id;
}
export function owned(id:string,owner:string){
  const c=db.prepare('SELECT id,title,updated_at AS updatedAt FROM chat_conversations WHERE id=? AND user_id=?').get(id,owner);
  if(!c) throw new ApiError(404,'Không tìm thấy hội thoại.');
  return c;
}

// Tính số lượt, token và ảnh còn lại theo ngày Việt Nam từ các yêu cầu đã ghi nhận.
export function allowance(actor:string,config=settings()){
  const isMember = actor.startsWith('u:');
  const row = db.prepare('SELECT COUNT(*) AS n,COALESCE(SUM(tokens),0) AS t,COALESCE(SUM(image),0) AS i FROM chat_usage WHERE actor=? AND day=?').get(actor, day())!;
  const turnLimit = isMember ? config.memberTurns : config.guestTurns;
  const tokenLimit = isMember ? config.memberTokens : config.guestTokens;
  const imageLimit = isMember ? config.memberImages : config.guestImages;
  return {
    turnsRemainingToday: Math.max(0, turnLimit - Number(row.n)),
    tokensRemainingToday: Math.max(0, tokenLimit - Number(row.t)),
    imagesRemainingToday: Math.max(0, imageLimit - Number(row.i)),
    resetAt: new Date(Date.parse(day() + 'T17:00:00Z')).toISOString(),
  };
}
export function transaction<T>(fn: () => T) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Giữ chỗ hạn mức theo actor trong giao dịch để chặn gửi trùng, vượt quota hoặc gửi đồng thời.
export function reserve(actor: string, id: string, image: boolean, tokens: number, res: Response) {
  transaction(() => {
    if (db.prepare('SELECT 1 FROM chat_usage WHERE actor=? AND request_id=?').get(actor, id)) {
      throw new ApiError(409, 'Yêu cầu đã được tiếp nhận.');
    }
    const recent = db.prepare('SELECT COUNT(*) AS n,MAX(pending) AS busy FROM chat_usage WHERE actor=? AND started>?').get(actor, Date.now() - 60000)!;
    const remaining = allowance(actor);
    if (!remaining.turnsRemainingToday || remaining.tokensRemainingToday < tokens || (image && !remaining.imagesRemainingToday)) {
      res.set('Retry-After', String(Math.ceil((Date.parse(remaining.resetAt) - Date.now()) / 1000)));
      throw new ApiError(429, 'Đã hết hạn mức chat hôm nay.');
    }
    if (recent.busy || Number(recent.n) >= (actor.startsWith('g:') ? 3 : 6)) {
      res.set('Retry-After', '60');
      throw new ApiError(429, 'Hãy đợi trước khi gửi tiếp.');
    }
    db.prepare('INSERT INTO chat_usage VALUES(?,?,?,?,?,?,1)').run(actor, id, day(), tokens, Number(image), Date.now());
  });
}
