import { db } from './auth';
import { courses, quizzes, scenarios } from './content/catalog';
import { COURSES } from './content/catalog-base';

// Các bảng nghiệp vụ: kết quả quét, báo cáo/kiểm duyệt, giáo trình và tiến độ học.
db.exec(`
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS scans (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, user_id TEXT REFERENCES users(id), result TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS scans_user ON scans(user_id, seq);
  CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, target TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, is_hidden INTEGER NOT NULL DEFAULT 0);
  CREATE INDEX IF NOT EXISTS reports_status ON reports(status, created_at);
  CREATE TABLE IF NOT EXISTS votes (report_id TEXT REFERENCES reports(id), user_id TEXT REFERENCES users(id), PRIMARY KEY(report_id,user_id));
  CREATE TABLE IF NOT EXISTS moderation_log (id INTEGER PRIMARY KEY, report_id TEXT REFERENCES reports(id), admin_id TEXT REFERENCES users(id), status TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS catalog (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));
  CREATE TABLE IF NOT EXISTS catalog_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS lesson_progress (user_id TEXT REFERENCES users(id), course_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(user_id,course_id,lesson_id));
  CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), quiz_id TEXT NOT NULL, course_id TEXT NOT NULL, score INTEGER NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS submissions_user ON submissions(user_id,course_id);
  CREATE TABLE IF NOT EXISTS lesson_answers (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, course_id TEXT NOT NULL, lesson_id TEXT NOT NULL, question_id TEXT NOT NULL, selected_index INTEGER NOT NULL, answered_at TEXT NOT NULL, PRIMARY KEY(user_id,course_id,lesson_id,question_id));
`);

// Bổ sung cột cho cơ sở dữ liệu cũ trước khi tạo chỉ mục theo trạng thái hiển thị.
if (!db.prepare('PRAGMA table_info(reports)').all().some(column => column.name === 'is_hidden')) {
  db.exec('ALTER TABLE reports ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0');
}
db.exec('CREATE INDEX IF NOT EXISTS reports_visibility_status ON reports(is_hidden, status, created_at)');

// Nạp giáo trình mẫu trong giao dịch; báo cáo thật của người dùng vẫn cần kiểm duyệt.
const insert = db.prepare('INSERT OR IGNORE INTO catalog (kind,id,data) VALUES (?,?,?)');
db.exec('BEGIN');
try {
  for (const [kind, items] of Object.entries({ scenario: scenarios, course: courses, quiz: quizzes })) for (const item of items) insert.run(kind, item.id, JSON.stringify(item));

  // Bổ sung câu hỏi mới mà không thay câu hỏi quản trị viên đã chỉnh sửa.
  for (const seeded of quizzes) {
    const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get(seeded.id);
    if (!row) continue;
    const current = JSON.parse(String(row.data));
    const existingIds = new Set(current.questions.map((question: { id: string }) => question.id));
    const additions = seeded.questions.filter(question => !existingIds.has(question.id));
    if (additions.length) {
      current.questions.push(...additions);
      db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
  }

  // Các migration có tên chỉ chạy một lần để cập nhật bộ câu hỏi đã phát hành.
  const migrationName = 'everyday-situations-q6-q10-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(migrationName)) {
    for (const seeded of quizzes) {
      const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get(seeded.id);
      if (!row) continue;
      const current = JSON.parse(String(row.data));
      const replacements = new Map(seeded.questions.slice(5, 10).map(question => [question.id, question]));
      current.questions = current.questions.map((question: { id: string }) => replacements.get(question.id) || question);
      db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(migrationName, new Date().toISOString());
  }
  const previousGuidanceTitles: Record<string, string> = {
    'course-deepfake': 'Lỡ chuyển tiền sau cuộc gọi giả người thân?',
    'course-banking': 'Lỡ cung cấp OTP hoặc thông tin ngân hàng?',
    'course-parents': 'Lỡ làm theo cuộc gọi mạo danh?',
    'course-crisis': 'Lỡ mở liên kết hoặc cài ứng dụng lạ?',
  };
  for (const seeded of courses) {
    const row = db.prepare("SELECT data FROM catalog WHERE kind = 'course' AND id = ?").get(seeded.id);
    if (!row) continue;
    const current = JSON.parse(String(row.data));
    let changed = false;
    if (current.incidentGuidance === undefined && seeded.incidentGuidance) {
      current.incidentGuidance = seeded.incidentGuidance;
      changed = true;
    }
    if (current.incidentGuidance?.title === previousGuidanceTitles[seeded.id] && seeded.incidentGuidance) {
      current.incidentGuidance.title = seeded.incidentGuidance.title;
      changed = true;
    }
    const module = current.modules.find((item: { id: string }) => item.id === `${seeded.id}-quiz`);
    const updated = seeded.modules.find(item => item.id === `${seeded.id}-quiz`);
    if (module && updated && module.duration === '3 phút' && module.content === 'Đạt ít nhất 80% để hoàn thành khóa học.') {
      module.duration = updated.duration;
      module.content = updated.content;
      changed = true;
    }
    if (changed) db.prepare("UPDATE catalog SET data = ? WHERE kind = 'course' AND id = ?").run(JSON.stringify(current), seeded.id);
  }

  // Chỉ cập nhật nội dung còn giống bản gốc; giữ lại chỉnh sửa của quản trị viên.
  const curriculumMigration = 'curriculum-clarity-and-new-courses-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(curriculumMigration)) {
    for (const original of COURSES) {
      const seeded = courses.find(course => course.id === original.id);
      const row = db.prepare("SELECT data FROM catalog WHERE kind = 'course' AND id = ?").get(original.id);
      if (!seeded || !row) continue;
      const current = JSON.parse(String(row.data));
      if (current.description === original.description) current.description = seeded.description;
      for (const module of current.modules || []) {
        const oldModule = original.modules.find(item => item.id === module.id);
        const revisedModule = seeded.modules.find(item => item.id === module.id);
        if (oldModule && revisedModule && module.title === oldModule.title) module.title = revisedModule.title;
      }
      db.prepare("UPDATE catalog SET data = ? WHERE kind = 'course' AND id = ?").run(JSON.stringify(current), original.id);
    }
    const questionUpdates: Record<string, string> = {
      'course-banking-q1': 'Có nên đọc OTP cho người tự xưng nhân viên hỗ trợ?',
      'course-parents-q1': 'Cuộc gọi yêu cầu chuyển tiền để chứng minh vô tội?',
    };
    for (const seeded of quizzes) {
      const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get(seeded.id);
      if (!row) continue;
      const current = JSON.parse(String(row.data));
      let changed = false;
      current.questions = current.questions.map((question: { id: string; question: string; options: string[] }) => {
        const revised = seeded.questions.find(item => item.id === question.id);
        if (revised && question.question === questionUpdates[question.id] &&
            JSON.stringify(question.options) === JSON.stringify(revised.options)) {
          changed = true;
          return { ...question, question: revised.question, explanation: revised.explanation };
        }
        return question;
      });
      if (changed) db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(curriculumMigration, new Date().toISOString());
  }
  const quizCorrection = 'first-four-quiz-corrections-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(quizCorrection)) {
    const previousQuestions: Record<string, string> = {
      'course-banking-q1': 'Người gọi tự xưng nhân viên ngân hàng yêu cầu đọc OTP để hủy giao dịch lạ. Bạn nên làm gì?',
      'course-banking-q3': 'Tên bank.example.attacker.invalid thuộc tên miền nào?',
      'course-banking-q5': 'Nhận yêu cầu xác nhận giao dịch không do mình tạo?',
      'course-parents-q3': 'Trúng quà nhưng phải trả phí trước cho người lạ?',
      'course-crisis-q1': 'Đã nhập mật khẩu vào trang giả, bước phù hợp là gì?',
      'course-crisis-q2': 'Ai bảo đảm lấy lại tiền với phí trước có đáng tin ngay không?',
    };
    const duplicateChoices: Record<string, [string, string]> = {
      'course-deepfake-q2': ['Chỉ đúng nếu gọi trên ứng dụng quen thuộc', 'Sai: không thể kết luận bằng vẻ ngoài video.'],
      'course-deepfake-q3': ['Chỉ đủ nếu biết địa chỉ nhà', 'Sai: kiến thức cá nhân không thay được xác minh.'],
      'course-deepfake-q5': ['Gọi ngay số trong tin nhắn vừa nhận', 'Sai: cần chủ động dùng kênh đã biết.'],
      'course-banking-q1': ['Có nếu họ nói đang khóa giao dịch', 'Sai: hãy tự gọi ngân hàng qua kênh đã lưu.'],
      'course-banking-q2': ['Tên miền thuộc ngân hàng', 'Sai: một trang giả cũng có thể dùng HTTPS.'],
      'course-banking-q4': ['Chỉ kiểm tra số lượng mã QR', 'Sai: hãy kiểm tra màn hình xác nhận cuối.'],
      'course-banking-q5': ['Gửi OTP cho người gọi để hỏi', 'Sai: phải kiểm tra trước khi làm bất cứ xác nhận nào.'],
      'course-parents-q1': ['Đọc OTP để chứng minh danh tính', 'Sai: nên hỏi người thân hoặc kênh chính thức.'],
      'course-parents-q2': ['Chỉ có nếu số bắt đầu bằng 09', 'Sai: cần kiểm tra yêu cầu bằng kênh khác.'],
      'course-parents-q3': ['Gửi ảnh căn cước để giữ quà', 'Sai: quà thật không cần làm theo lời người lạ.'],
      'course-parents-q4': ['Chuyển tiền rồi mới báo gia đình', 'Sai: nên tạm dừng ngay.'],
      'course-parents-q5': ['Lưu số do người gọi lạ cung cấp', 'Sai: chuẩn bị trước khi có tình huống khẩn cấp.'],
      'course-crisis-q1': ['Đăng nhập lại cùng trang để kiểm tra', 'Sai: hãy dùng kênh chính thức.'],
      'course-crisis-q2': ['Chỉ tin nếu họ nhắn trên mạng xã hội', 'Sai: nên làm việc trực tiếp với ngân hàng và nơi tiếp nhận.'],
      'course-crisis-q3': ['Chỉ giữ số tài khoản, xóa nội dung', 'Sai: lưu bản sao an toàn trước khi xử lý thiết bị.'],
      'course-crisis-q4': ['Trên thiết bị người lạ hướng dẫn', 'Sai: cần đổi trên kênh chính thức.'],
      'course-crisis-q5': ['Chỉ có nếu trình duyệt hiện cảnh báo', 'Sai: đánh giá dựa trên thao tác thực tế.'],
    };
    for (const seeded of quizzes.filter(quiz => quiz.courseId in previousGuidanceTitles)) {
      const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get(seeded.id);
      if (!row) continue;
      const current = JSON.parse(String(row.data));
      let changed = false;
      current.questions = current.questions.map((question: any) => {
        const revised = seeded.questions.find(item => item.id === question.id);
        if (!revised || question.question !== previousQuestions[question.id]) return question;
        if (question.id === 'course-banking-q3') {
          const oldOptions = ['bank.example', 'attacker.invalid', 'example.attacker.invalid', 'example.attacker.invalid'];
          if (JSON.stringify(question.options) !== JSON.stringify(oldOptions)) return question;
          changed = true;
          return { ...question, question: revised.question, options: revised.options,
            explanation: question.explanation === 'Phải đọc đầy đủ tên miền, không chỉ phần đầu.' ? revised.explanation : question.explanation,
            optionExplanations: JSON.stringify(question.optionExplanations) === JSON.stringify([
              'Sai: bank.example chỉ là phần đầu của tên miền.', 'Đúng: tên miền thuộc attacker.invalid.',
              'Sai: example.attacker.invalid vẫn là tên miền con của attacker.invalid.', 'Sai: cần đọc hết tên miền trước dấu gạch chéo.',
            ]) ? revised.optionExplanations : question.optionExplanations };
        }
        if (JSON.stringify(question.options.slice(0, 3)) !== JSON.stringify(revised.options.slice(0, 3)) ||
            ![revised.options[3], duplicateChoices[question.id]?.[0]].includes(question.options[3])) return question;
        changed = true;
        const oldExplanation: Record<string, string> = {
          'course-crisis-q1': 'Cần xử lý quyền truy cập bị lộ sớm.',
          'course-crisis-q2': 'Lời hứa bảo đảm có thể là một vòng lừa đảo khác.',
        };
        return { ...question, question: revised.question,
          explanation: question.explanation === oldExplanation[question.id] ? revised.explanation : question.explanation };
      });
      current.questions = current.questions.map((question: any) => {
        const revised = seeded.questions.find(item => item.id === question.id);
        const old = duplicateChoices[question.id];
        if (!revised || !old || question.options?.[3] !== old[0] ||
            JSON.stringify(question.options.slice(0, 3)) !== JSON.stringify(revised.options.slice(0, 3)) ||
            question.optionExplanations?.[3] !== old[1]) return question;
        changed = true;
        return { ...question,
          options: [...question.options.slice(0, 3), revised.options[3]],
          optionExplanations: [...question.optionExplanations.slice(0, 3), revised.optionExplanations[3]] };
      });
      if (changed) db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(quizCorrection, new Date().toISOString());
  }
  const practicalBankingQuiz = 'practical-banking-quiz-q2-q3-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(practicalBankingQuiz)) {
    const seeded = quizzes.find(quiz => quiz.courseId === 'course-banking');
    const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get('course-banking-quiz');
    if (seeded && row) {
      const current = JSON.parse(String(row.data));
      let changed = false;
      const oldQuestions: Record<string, string[]> = {
        'course-banking-q2': ['HTTPS bảo đảm điều gì?'],
        'course-banking-q3': [
          'Tên bank.example.attacker.invalid thuộc tên miền nào?',
          'Tên miền gốc của bank.example.attacker.invalid là gì?',
        ],
      };
      current.questions = current.questions.map((question: any) => {
        const revised = seeded.questions.find(item => item.id === question.id);
        if (!revised || !oldQuestions[question.id]?.includes(question.question)) return question;
        const options = question.options;
        const isOldSecond = question.id === 'course-banking-q2' &&
          options?.[0] === 'Website luôn uy tín' && options?.[1] === 'Kết nối được mã hóa' &&
          options?.[2] === 'Chứng minh tên miền thuộc ngân hàng' &&
          ['Tên miền thuộc ngân hàng', 'Dữ liệu trên trang luôn chính xác', 'Gửi mã OTP theo hướng dẫn trong tin nhắn'].includes(options?.[3]);
        const isOldThird = question.id === 'course-banking-q3' &&
          options?.[0] === 'bank.example' && options?.[1] === 'attacker.invalid' &&
          ['example.attacker.invalid', 'example.invalid'].includes(options?.[2]) &&
          options?.[3] === 'example.attacker.invalid';
        if (!isOldSecond && !isOldThird) return question;
        changed = true;
        return { ...question, ...revised };
      });
      if (changed) db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(practicalBankingQuiz, new Date().toISOString());
  }

  // Gỡ các báo cáo minh họa chưa xác minh khỏi dữ liệu đang hiển thị.
  const removeSamples = 'remove-five-unverified-demo-reports-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(removeSamples)) {
    const sampleIds = ['delivery', 'relative', 'deposit', 'prize', 'travel'].map(name => `sample-unverified-${name}`);
    const placeholders = sampleIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM votes WHERE report_id IN (${placeholders})`).run(...sampleIds);
    db.prepare(`DELETE FROM moderation_log WHERE report_id IN (${placeholders})`).run(...sampleIds);
    db.prepare(`DELETE FROM reports WHERE id IN (${placeholders})`).run(...sampleIds);
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(removeSamples, new Date().toISOString());
  }
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; }

// Các hàm đọc catalog dùng chung cho API học tập và truy xuất kiến thức chatbot.
export function catalogItems(kind: string): any[] { return db.prepare('SELECT data FROM catalog WHERE kind = ? ORDER BY rowid').all(kind).map(row => JSON.parse(String(row.data))); }
export function catalogItem(kind: string, id: string): any | undefined {
  const row = db.prepare('SELECT data FROM catalog WHERE kind = ? AND id = ?').get(kind, id);
  return row ? JSON.parse(String(row.data)) : undefined;
}
export { db };
