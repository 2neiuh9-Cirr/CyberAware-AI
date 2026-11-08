import React, { useState, useMemo, useEffect, useRef } from 'react';
import { api, json } from '../../api';
import { notify } from '../../components/common/toast';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface QuestionBankItem {
  id: string;
  difficulty: 'Cơ bản' | 'Tình huống khẩn cấp' | 'Nâng cao';
  title: string;
  scenario: string;
  course: string;
  type: string;
  accuracyRate: number | null;
  accuracyLabel: string;
  status: 'active' | 'review' | 'archived';
  statusLabel: string;
  courseId?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  optionExplanations?: string[];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('Tệp CSV có dấu nháy chưa đóng.');
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export const AdminQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [summary, setSummary] = useState<{ total: number; urgent: number; review: number; averageAccuracy: number|null; attempts: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fileRows, setFileRows] = useState<unknown[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Question Editor state
  const [editorId, setEditorId] = useState('Câu mới');
  const [editorCourse, setEditorCourse] = useState('');
  const [editorDifficulty, setEditorDifficulty] = useState('Cơ bản');
  const [editorFormat, setEditorFormat] = useState('Trắc nghiệm 1 đáp án duy nhất (Radio)');
  const [editorScenario, setEditorScenario] = useState('');

  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [optionExplanations, setOptionExplanations] = useState(['','','','']);
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [editorExplanation, setEditorExplanation] = useState('');

  // Preview modal state
  const [previewQuestion, setPreviewQuestion] = useState<QuestionBankItem | null>(null);
  const showToast = (msg: string) => notify(msg, msg.startsWith('Đang') ? 'info' : 'success');
  const load = async () => {
    try {
      const [first, stats, courseList] = await Promise.all([
        api<{ items: Array<{ id: string; courseId: string; question: string; options: string[]; correctIndex: number; explanation: string; optionExplanations: string[]; difficulty: QuestionBankItem['difficulty']; status: QuestionBankItem['status']; accuracyRate: number|null; attempts: number }>; total: number }>('/admin/questions?pageSize=100'),
        api<NonNullable<typeof summary>>('/admin/questions/summary'),
        api<{ items: Array<{ id: string; title: string }>; total: number }>('/admin/courses?pageSize=100'),
      ]);
      const all = [...first.items];
      for (let nextPage = 2; all.length < first.total; nextPage++) { const next = await api<typeof first>(`/admin/questions?pageSize=100&page=${nextPage}`); all.push(...next.items); }
      const allCourses = [...courseList.items];
      for (let nextPage = 2; allCourses.length < courseList.total; nextPage++) { const next = await api<typeof courseList>(`/admin/courses?pageSize=100&page=${nextPage}`); allCourses.push(...next.items); }
      setCourses(allCourses); if (!editorCourse && allCourses.length) setEditorCourse(allCourses[0].id);
      setQuestions(all.map(item => ({ id: item.id, title: item.question, scenario: item.explanation, courseId: item.courseId, course: allCourses.find(c => c.id === item.courseId)?.title || item.courseId, difficulty: item.difficulty, type: 'Trắc nghiệm 1 đáp án', accuracyRate: item.accuracyRate, accuracyLabel: item.accuracyRate === null ? 'Chưa có lượt làm' : `${item.attempts} lượt làm`, status: item.status, statusLabel: item.status === 'active' ? 'Đang dùng' : item.status === 'review' ? 'Chờ duyệt' : 'Lưu trữ', options: item.options, correctIndex: item.correctIndex, explanation: item.explanation, optionExplanations: item.optionExplanations })));
      setSummary(stats); setError('');
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  const mutate = async (task: () => Promise<unknown>, message: string) => {
    setBusy(true); setError('');
    try { await task(); await load(); showToast(message); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  const readCsv = async (file?: File) => {
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Hãy xuất bảng tính thành tệp CSV trước khi nhập.');
      const [headers, ...rows] = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
      const required = ['courseId','question','A','B','C','D','correct','explanation','explanationA','explanationB','explanationC','explanationD'];
      if (!headers || required.some(key => !headers.includes(key))) throw new Error(`CSV cần các cột: ${required.join(', ')}`);
      const payload = rows.map(row => { const data = Object.fromEntries(headers.map((key, index) => [key, row[index] || ''])); return { courseId: data.courseId, question: data.question, options: [data.A,data.B,data.C,data.D], correctIndex: 'ABCD'.indexOf(data.correct.toUpperCase()), explanation: data.explanation, optionExplanations: [data.explanationA,data.explanationB,data.explanationC,data.explanationD], difficulty: data.difficulty || 'Cơ bản' }; });
      await api('/admin/questions/import/preview', json('POST', { rows: payload }));
      setFileRows(payload); setError('');
    } catch (cause) { setError((cause as Error).message); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  };
  const commitCsv = async () => {
    if (!fileRows) return;
    await mutate(async () => { await api('/admin/questions/import/commit', json('POST', { rows: fileRows })); setFileRows(null); }, `Đã nhập ${fileRows.length} câu hỏi ở trạng thái chờ duyệt.`);
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.scenario.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCourse = !courseFilter || q.courseId === courseFilter;
      const matchDiff = !difficultyFilter || q.difficulty === difficultyFilter;
      const matchStatus = !statusFilter || q.status === statusFilter;

      return matchSearch && matchCourse && matchDiff && matchStatus;
    });
  }, [questions, searchQuery, courseFilter, difficultyFilter, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const visibleQuestions = filteredQuestions.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [searchQuery, courseFilter, difficultyFilter, statusFilter, pageSize]);

  const handleSaveQuestion = () => {
    const existing = questions.some(question => question.id === editorId);
    void mutate(async () => {
      const saved = await api<{ id: string }>(existing ? `/admin/questions/${editorId}` : '/admin/questions', json(existing ? 'PATCH' : 'POST', { courseId: editorCourse, question: editorScenario, options: [optA,optB,optC,optD], correctIndex: 'ABCD'.indexOf(correctOption), explanation: editorExplanation, optionExplanations, difficulty: editorDifficulty }));
      setEditorId(saved.id);
    }, existing ? 'Đã cập nhật câu hỏi.' : 'Đã tạo câu hỏi ở trạng thái chờ duyệt.');
  };

  const handleEditRow = async (q: QuestionBankItem) => {
    try {
    const detail = await api<QuestionBankItem & { question: string }>(`/admin/questions/${q.id}`);
    setEditorId(q.id);
    setEditorDifficulty(detail.difficulty);
    setEditorCourse(detail.courseId || q.courseId || '');
    setEditorScenario(detail.question);
    setOptA(detail.options?.[0] || ''); setOptB(detail.options?.[1] || ''); setOptC(detail.options?.[2] || ''); setOptD(detail.options?.[3] || '');
    setCorrectOption('ABCD'[detail.correctIndex || 0] as 'A'|'B'|'C'|'D');
    setEditorExplanation(detail.explanation || ''); setOptionExplanations(detail.optionExplanations || ['','','','']);
    document.getElementById('editorPanel')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`Đang mở câu hỏi ${q.id} trong trình biên tập.`);
    } catch (cause) { setError((cause as Error).message); }
  };

  const handleDuplicateRow = (q: QuestionBankItem) => { void mutate(() => api(`/admin/questions/${q.id}/duplicate`, json('POST')), 'Đã nhân bản câu hỏi ở trạng thái chờ duyệt.'); };

  const handleDeleteRow = (id: string) => {
    void mutate(() => api(`/admin/questions/${id}`, { method: 'DELETE' }), `Đã lưu trữ câu hỏi ${id}.`);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full space-y-6">
          {error && <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}
          
          {/* Header Section with Meta & Actions */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-100 text-[#004AC6] uppercase tracking-wider font-semibold">
                  Security Assessment Core
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-500">
                  Hệ thống đo lường phản xạ an ninh không gian mạng v3.4
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Ngân hàng câu hỏi kiểm tra kỹ năng phản xạ
                </h1>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#004AC6] text-xs font-semibold border border-blue-100">
                  {summary?.total ?? '—'} câu hỏi thực hành tình huống
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a href="/api/admin/questions/import/template" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-800 text-sm font-semibold border border-slate-200 shadow-xs">Tải mẫu CSV</a>
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={e => void readCsv(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] text-[#004AC6]">upload_file</span>
                <span>Nhập từ file CSV</span>
              </button>
              <button
                type="button"
                onClick={() => { setEditorId('Câu mới'); setEditorScenario(''); setOptA(''); setOptB(''); setOptC(''); setOptD(''); setOptionExplanations(['','','','']); setEditorExplanation(''); document.getElementById('editorPanel')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>Thêm câu hỏi mới</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Bento Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tỷ lệ phản xạ đúng TB</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{summary?.averageAccuracy === null ? '—' : summary?.averageAccuracy === undefined ? '—' : `${summary.averageAccuracy}%`}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Dựa trên {summary?.attempts ?? 0} lượt trả lời</p>
            </div>

            {/* Stat 2 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tình huống khẩn cấp</span>
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined text-[22px]">crisis_alert</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{summary?.urgent ?? '—'}</span>
                <span className="text-xs text-slate-500">/ {summary?.total ?? '—'} câu</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Các câu hỏi được phân loại khẩn cấp</p>
            </div>

            {/* Stat 3 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chờ biên tập &amp; duyệt</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{summary?.review ?? '—'}</span>
                <span className="text-xs text-amber-600 font-semibold">Cần rà soát</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Câu hỏi mới cần được quản trị viên duyệt</p>
            </div>

            {/* Stat 4 */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Khóa học áp dụng</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[#004AC6]">
                  <span className="material-symbols-outlined text-[22px]">school</span>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{courses.length}</span>
                <span className="text-xs text-slate-500">Chuyên đề</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Danh sách khóa học trong hệ thống</p>
            </div>
          </div>

          {/* Smart Filter & Search Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search box */}
              <div className="md:col-span-5 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  search
                </span>
                <input
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 border border-slate-200 outline-none transition-all focus:border-[#004AC6]"
                  placeholder="Tìm theo mã QB-xxx, nội dung mô phỏng, từ khóa kịch bản lừa đảo..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Course */}
              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-slate-50 text-slate-800 text-xs border border-slate-200 appearance-none outline-none cursor-pointer pr-8 font-medium"
                  >
                    <option value="">Tất cả Khóa học áp dụng ({courses.length})</option>
                    {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>

              {/* Filter Difficulty */}
              <div className="md:col-span-2">
                <div className="relative">
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-slate-50 text-slate-800 text-xs border border-slate-200 appearance-none outline-none cursor-pointer pr-8 font-medium"
                  >
                    <option value="">Mọi độ khó</option>
                    <option value="Cơ bản">Cơ bản</option>
                    <option value="Tình huống khẩn cấp">Tình huống khẩn cấp</option>
                    <option value="Nâng cao">Nâng cao &amp; Chuyên sâu</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>

              {/* Filter Status */}
              <div className="md:col-span-2">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-slate-50 text-slate-800 text-xs border border-slate-200 appearance-none outline-none cursor-pointer pr-8 font-medium"
                  >
                    <option value="">Mọi trạng thái</option>
                    <option value="active">Đang sử dụng (Active)</option>
                    <option value="review">Chờ duyệt (Review)</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Bank Table */}
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredQuestions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredQuestions.map((q) => q.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded text-[#004AC6] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Mã ID</th>
                    <th className="py-3.5 px-4">Kịch bản tình huống mô phỏng &amp; Độ khó</th>
                    <th className="py-3.5 px-4">Khóa học áp dụng</th>
                    <th className="py-3.5 px-4">Định dạng</th>
                    <th className="py-3.5 px-4">Tỷ lệ trả lời đúng</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {visibleQuestions.map((q) => {
                    const isChecked = selectedIds.includes(q.id);

                    return (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                              )
                            }
                            className="w-4 h-4 rounded text-[#004AC6] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-[#004AC6]">{q.id}</td>
                        <td className="py-4 px-4 max-w-md">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`inline-flex mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                                q.difficulty === 'Tình huống khẩn cấp'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : q.difficulty === 'Nâng cao'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 line-clamp-1">{q.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{q.scenario}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-medium">
                            {q.course}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#004AC6]">
                              radio_button_checked
                            </span>
                            <span>{q.type}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-600 font-bold">{q.accuracyRate === null ? '—' : `${q.accuracyRate}%`}</span>
                              <span className="text-slate-400 text-[11px]">{q.accuracyLabel}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${q.accuracyRate || 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {q.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Đang dùng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              {q.status === 'review' ? 'Chờ duyệt' : 'Lưu trữ'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1 text-slate-500">
                            <button
                              type="button"
                              onClick={() => setPreviewQuestion(q)}
                              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#004AC6] transition-colors"
                              title="Xem trước"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditRow(q)}
                              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#004AC6] transition-colors"
                              title="Sửa"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit_note</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(q)}
                              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#004AC6] transition-colors"
                              title="Nhân bản"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            <button type="button" onClick={() => void mutate(() => api(`/admin/questions/${q.id}/status`, json('PATCH', { status: q.status === 'active' ? 'review' : 'active' })), 'Đã cập nhật trạng thái câu hỏi.')} className="p-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors" title={q.status === 'active' ? 'Ngừng dùng' : 'Duyệt câu hỏi'}><span className="material-symbols-outlined text-[18px]">{q.status === 'active' ? 'pause_circle' : 'verified'}</span></button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(q.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Lưu trữ"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-6 py-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Hàng trên mỗi trang:</span>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 px-2 rounded bg-slate-50 border border-slate-200 text-slate-800 font-semibold outline-none cursor-pointer">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span className="ml-2">{filteredQuestions.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredQuestions.length)} trong {filteredQuestions.length} mục</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(page - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40" disabled={page <= 1}>
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#004AC6] text-white font-semibold">{page}</button>
                <span className="px-1 text-slate-400">/ {pageCount}</span>
                <button disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Panel Chi tiết Tạo / Chỉnh sửa Câu hỏi */}
          <div className="bg-white rounded-xl p-6 lg:p-8 border border-slate-200/80 shadow-xs space-y-6" id="editorPanel">
            {error && <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004AC6] animate-pulse" />
                  <h2 className="text-lg font-bold text-slate-900">Trình biên tập câu hỏi tình huống thực tế</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Mã định danh câu hỏi đang tạo:{' '}
                  <span className="font-mono font-semibold text-[#004AC6]">{editorId}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                  Trạng thái: {questions.find(question => question.id === editorId)?.statusLabel || 'Chưa lưu'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewQuestion({
                      id: editorId,
                      difficulty: editorDifficulty as any,
                      title: editorScenario,
                      scenario: editorScenario,
                      course: editorCourse,
                      type: 'Trắc nghiệm 1 đáp án',
                      accuracyRate: null,
                      accuracyLabel: 'Mô phỏng',
                      status: 'review',
                      statusLabel: 'Xem trước',
                      courseId: editorCourse,
                      options: [optA,optB,optC,optD],
                      correctIndex: 'ABCD'.indexOf(correctOption),
                      explanation: editorExplanation,
                      optionExplanations,
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">preview</span>
                  <span>Xem trước đề thi</span>
                </button>
              </div>
            </div>

            {/* Config Meta Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-900 mb-1.5">
                  Khóa học áp dụng mục tiêu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={editorCourse}
                    onChange={(e) => setEditorCourse(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 appearance-none outline-none focus:bg-white focus:border-[#004AC6] transition-colors pr-8 cursor-pointer"
                  >
                    {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1.5">Mức độ cảnh báo tình huống</label>
                <div className="relative">
                  <select
                    value={editorDifficulty}
                    onChange={(e) => setEditorDifficulty(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 appearance-none outline-none focus:bg-white focus:border-[#004AC6] transition-colors pr-8 cursor-pointer"
                  >
                    <option value="Cơ bản">Cơ bản (Nhận biết dấu hiệu bề mặt)</option>
                    <option value="Tình huống khẩn cấp">Tình huống khẩn cấp (Hối thúc thời gian, tâm lý sợ hãi)</option>
                    <option value="Nâng cao">Nâng cao (Giả lập chứng chỉ số, tráo mã độc)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1.5">Định dạng chấm điểm</label>
                <div className="relative">
                  <select
                    value={editorFormat}
                    onChange={(e) => setEditorFormat(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 appearance-none outline-none focus:bg-white focus:border-[#004AC6] transition-colors pr-8 cursor-pointer"
                  >
                    <option value="Trắc nghiệm 1 đáp án duy nhất (Radio)">Trắc nghiệm 1 đáp án duy nhất (Radio)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    keyboard_arrow_down
                  </span>
                </div>
              </div>
            </div>

            {/* Field: Tình huống thực tế mô phỏng */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                  <span className="material-symbols-outlined text-[20px] text-[#004AC6]">chat</span>
                  Nội dung tình huống thực tế mô phỏng tin nhắn / cuộc gọi <span className="text-red-500">*</span>
                </label>
                <span className="text-slate-400">Hỗ trợ chèn link giả lập an toàn</span>
              </div>
              <textarea
                className="w-full p-4 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 border border-slate-200 outline-none transition-all shadow-inner focus:border-[#004AC6] focus:ring-2 focus:ring-blue-100"
                placeholder="Nhập kịch bản chi tiết mà đối tượng lừa đảo sử dụng để tiếp cận nạn nhân..."
                rows={4}
                value={editorScenario}
                onChange={(e) => setEditorScenario(e.target.value)}
              />
            </div>

            {/* 4 Options A, B, C, D with Radio selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                  <span className="material-symbols-outlined text-[20px] text-[#004AC6]">tune</span>
                  Các phương án phản xạ (Chọn Radio phương án là Đáp án đúng chuẩn xác) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Phương án {correctOption} đang được chọn làm đáp án đúng
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Option A */}
                <div
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                    correctOption === 'A'
                      ? 'bg-blue-50/70 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctOption === 'A'}
                    onChange={() => setCorrectOption('A')}
                    className="w-5 h-5 accent-[#004AC6] cursor-pointer shrink-0"
                  />
                  <span className={`text-sm font-bold w-6 shrink-0 ${correctOption === 'A' ? 'text-[#004AC6]' : 'text-slate-700'}`}>
                    A.
                  </span>
                  <input
                    type="text"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
                  />
                  {correctOption === 'A' ? (
                    <span className="px-3 py-1 rounded text-[11px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span> Đáp án đúng
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-red-100 text-red-700 shrink-0">
                      Đáp án sai
                    </span>
                  )}
                </div>

                {/* Option B */}
                <div
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                    correctOption === 'B'
                      ? 'bg-blue-50/70 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctOption === 'B'}
                    onChange={() => setCorrectOption('B')}
                    className="w-5 h-5 accent-[#004AC6] cursor-pointer shrink-0"
                  />
                  <span className={`text-sm font-bold w-6 shrink-0 ${correctOption === 'B' ? 'text-[#004AC6]' : 'text-slate-700'}`}>
                    B.
                  </span>
                  <input
                    type="text"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
                  />
                  {correctOption === 'B' ? (
                    <span className="px-3 py-1 rounded text-[11px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span> Đáp án đúng
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-slate-200 text-slate-600 shrink-0">
                      Đáp án sai
                    </span>
                  )}
                </div>

                {/* Option C */}
                <div
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                    correctOption === 'C'
                      ? 'bg-blue-50/70 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctOption === 'C'}
                    onChange={() => setCorrectOption('C')}
                    className="w-5 h-5 accent-[#004AC6] cursor-pointer shrink-0"
                  />
                  <span className={`text-sm font-bold w-6 shrink-0 ${correctOption === 'C' ? 'text-[#004AC6]' : 'text-slate-700'}`}>
                    C.
                  </span>
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-900 font-medium outline-none"
                  />
                  {correctOption === 'C' ? (
                    <span className="px-3 py-1 rounded text-[11px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span> Đáp án đúng
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-slate-200 text-slate-600 shrink-0">
                      Đáp án sai
                    </span>
                  )}
                </div>

                {/* Option D */}
                <div
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                    correctOption === 'D'
                      ? 'bg-blue-50/70 border-[#004AC6]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctOption === 'D'}
                    onChange={() => setCorrectOption('D')}
                    className="w-5 h-5 accent-[#004AC6] cursor-pointer shrink-0"
                  />
                  <span className={`text-sm font-bold w-6 shrink-0 ${correctOption === 'D' ? 'text-[#004AC6]' : 'text-slate-700'}`}>
                    D.
                  </span>
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
                  />
                  {correctOption === 'D' ? (
                    <span className="px-3 py-1 rounded text-[11px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span> Đáp án đúng
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-slate-200 text-slate-600 shrink-0">
                      Đáp án sai
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {optionExplanations.map((value, index) => <label key={index} className="text-xs font-semibold text-slate-700">Giải thích đáp án {'ABCD'[index]}<textarea rows={2} value={value} onChange={e => setOptionExplanations(previous => previous.map((item, i) => i === index ? e.target.value : item))} placeholder="Vì sao đáp án này đúng hoặc sai?" className="mt-1 w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-normal outline-none focus:border-[#004AC6]" /></label>)}
              </div>
            </div>

            {/* Field: Giải thích vì sao đúng & Khuyến nghị chuyên gia */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">psychology_alt</span>
                Giải thích vì sao đúng &amp; Khuyến nghị chuyên gia (Hiện cho học viên sau khi nộp bài) <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full p-3.5 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 border border-slate-200 outline-none transition-all shadow-inner focus:border-[#004AC6]"
                rows={3}
                value={editorExplanation}
                onChange={(e) => setEditorExplanation(e.target.value)}
              />
            </div>

            {/* Action Footer */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">cloud_done</span>
                <span>Thay đổi được lưu khi bạn chọn “Lưu câu hỏi”</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => { setEditorId('Câu mới'); setEditorScenario(''); setOptA(''); setOptB(''); setOptC(''); setOptD(''); setOptionExplanations(['','','','']); setEditorExplanation(''); showToast('Đã hủy các thay đổi chưa lưu.'); }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy thay đổi
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  disabled={busy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  <span>Lưu câu hỏi vào ngân hàng</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#004AC6] bg-blue-50 px-2 py-0.5 rounded">
                  {previewQuestion.id}
                </span>
                <span className="text-xs font-semibold text-slate-500">Mô phỏng giao diện học viên</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {previewQuestion.title}
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <p className="font-semibold text-slate-900">Hãy chọn hành vi xử lý an toàn nhất:</p>
                {previewQuestion.options?.map((option, index) => <div key={index} className={`p-3 rounded-lg border flex items-start gap-3 ${index === previewQuestion.correctIndex ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index === previewQuestion.correctIndex ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}>{'ABCD'[index]}</span><div><p>{option}</p><p className="mt-1 text-xs text-slate-600">{previewQuestion.optionExplanations?.[index]}</p></div></div>)}
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-slate-800 space-y-1">
                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Giải thích của chuyên gia:
                </p>
                <p className="text-slate-700 leading-relaxed">{previewQuestion.explanation}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="px-5 py-2 rounded-lg bg-[#004AC6] text-white text-xs font-semibold"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}

      {fileRows && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"><div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4"><h3 className="text-base font-bold">Xác nhận nhập CSV</h3><p className="text-sm text-slate-600">Đã kiểm tra {fileRows.length} câu hỏi. Các câu mới sẽ chờ duyệt trước khi học viên thấy.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button onClick={() => setFileRows(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm">Hủy</button><button disabled={busy} onClick={() => void commitCsv()} className="px-4 py-2 rounded-lg bg-[#004AC6] text-white text-sm disabled:opacity-50">Nhập câu hỏi</button></div></div></div>}

    </AdminLayout>
  );
};
