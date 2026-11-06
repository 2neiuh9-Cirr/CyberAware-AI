import React, { useState, useMemo, useEffect, useRef } from 'react';
import { api, json } from '../../api';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface CourseAdminItem {
  id: string;
  code: string;
  title: string;
  description: string;
  incidentGuidance?: { title: string; intro: string; steps: string[] } | null;
  topic: string;
  topicKey: string;
  microLessonsCount: number;
  quizCount: number;
  status: 'published' | 'draft' | 'archived';
  statusLabel: string;
  updatedAt: string;
}

interface MicroLessonItem {
  id: string;
  type: 'interactive' | 'video' | 'quiz';
  order: number;
  title: string;
  duration: string;
  status: string;
  quizCount: number;
  content?: string;
  questionIds?: string[];
}

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseAdminItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseAdminItem>({ id: '', code: '', title: '', description: '', topic: '', topicKey: '', microLessonsCount: 0, quizCount: 0, status: 'draft', statusLabel: '', updatedAt: '' });
  const [lessonsMap, setLessonsMap] = useState<Record<string, MicroLessonItem[]>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingLesson, setEditingLesson] = useState<MicroLessonItem | null>(null);
  const [assigningLesson, setAssigningLesson] = useState<MicroLessonItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MicroLessonItem | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Array<{ id: string; question: string; status: string }>>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [lessonContent, setLessonContent] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Modal create/edit course
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState('CH-007');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formGuidanceTitle, setFormGuidanceTitle] = useState('');
  const [formGuidanceIntro, setFormGuidanceIntro] = useState('');
  const [formGuidanceSteps, setFormGuidanceSteps] = useState('');
  const [formTopic, setFormTopic] = useState('Email & Phishing');
  const [formTopicKey, setFormTopicKey] = useState('phishing');
  const [formStatus, setFormStatus] = useState<'published' | 'draft' | 'archived'>('draft');

  // Modal create lesson
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('Kiểm tra cuối khóa');
  const [newExamDuration, setNewExamDuration] = useState('8 phút');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('3 phút');
  const [newLessonContent, setNewLessonContent] = useState('');
  const draggingLessonId = useRef<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const displayLessons = (items: MicroLessonItem[], courseQuizCount: number) => items.map((lesson, index) => ({ ...lesson, order: index + 1, status: lesson.content?.trim() ? 'Hoàn tất nội dung' : 'Chưa có nội dung', quizCount: lesson.type === 'quiz' && !items.some(item => Array.isArray(item.questionIds)) ? courseQuizCount : lesson.questionIds?.length || 0 }));
  const load = async (preferredId?: string) => {
    try {
      const first = await api<{ items: CourseAdminItem[]; total: number }>('/admin/courses?pageSize=100');
      const all = [...first.items];
      for (let nextPage = 2; all.length < first.total; nextPage++) {
        const next = await api<typeof first>(`/admin/courses?pageSize=100&page=${nextPage}`); all.push(...next.items);
      }
      const mapped = all.map(course => ({ ...course, statusLabel: course.status === 'published' ? 'Đang phát hành' : course.status === 'draft' ? 'Bản nháp' : 'Lưu trữ', updatedAt: course.updatedAt ? new Date(course.updatedAt).toLocaleString('vi-VN') : 'Chưa có' }));
      setCourses(mapped);
      setSelectedCourse(previous => mapped.find(item => item.id === (preferredId || previous.id)) || mapped[0] || previous);
      setError('');
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!selectedCourse.id) return;
    void api<{ lessons: MicroLessonItem[]; quizCount: number }>(`/admin/courses/${selectedCourse.id}`)
      .then(detail => setLessonsMap(previous => ({ ...previous, [selectedCourse.id]: displayLessons(detail.lessons, detail.quizCount) })))
      .catch(cause => setError((cause as Error).message));
  }, [selectedCourse.id, selectedCourse.microLessonsCount]);
  const mutate = async (task: () => Promise<unknown>, message: string, preferredId?: string) => {
    setBusy(true); setError('');
    try {
      await task(); await load(preferredId);
      const courseId = preferredId || selectedCourse.id;
      if (courseId) {
        const detail = await api<{ lessons: MicroLessonItem[]; quizCount: number }>(`/admin/courses/${courseId}`);
        setLessonsMap(previous => ({ ...previous, [courseId]: displayLessons(detail.lessons, detail.quizCount) }));
      }
      showToast(message);
      return true;
    }
    catch (cause) { setError((cause as Error).message); return false; }
    finally { setBusy(false); }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchTopic = !topicFilter || c.topicKey === topicFilter;

      return matchSearch && matchStatus && matchTopic;
    });
  }, [courses, searchQuery, statusFilter, topicFilter]);

  const currentLessons = lessonsMap[selectedCourse.id] || [];
  const visibleCourses = filteredCourses.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  useEffect(() => setPage(1), [searchQuery, statusFilter, topicFilter, pageSize]);

  const handleOpenCreateModal = () => {
    setEditingCourseId(null);
    setFormCode(`CH-00${courses.length + 1}`);
    setFormTitle('');
    setFormDesc('');
    setFormGuidanceTitle('');
    setFormGuidanceIntro('');
    setFormGuidanceSteps('');
    setFormTopic('Email & Phishing');
    setFormTopicKey('phishing');
    setFormStatus('draft');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: CourseAdminItem) => {
    setEditingCourseId(c.id);
    setFormCode(c.code);
    setFormTitle(c.title);
    setFormDesc(c.description);
    setFormGuidanceTitle(c.incidentGuidance?.title || '');
    setFormGuidanceIntro(c.incidentGuidance?.intro || '');
    setFormGuidanceSteps(c.incidentGuidance?.steps.join('\n') || '');
    setFormTopic(c.topic);
    setFormTopicKey(c.topicKey);
    setFormStatus(c.status);
    setIsModalOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;
    void mutate(async () => {
      const steps = formGuidanceSteps.split(/\r?\n/).map(step => step.trim()).filter(Boolean);
      const incidentGuidance = formGuidanceTitle.trim() || formGuidanceIntro.trim() || steps.length ? { title: formGuidanceTitle, intro: formGuidanceIntro, steps } : null;
      const body = { code: formCode, title: formTitle, description: formDesc, topic: formTopic, topicKey: formTopicKey, incidentGuidance };
      const saved = await api<CourseAdminItem>(editingCourseId ? `/admin/courses/${editingCourseId}` : '/admin/courses', json(editingCourseId ? 'PATCH' : 'POST', body));
      if (editingCourseId && saved.status !== formStatus) await api(`/admin/courses/${editingCourseId}/status`, json('PATCH', { status: formStatus }));
      setIsModalOpen(false);
      setSelectedCourse({ ...saved, statusLabel: '', updatedAt: saved.updatedAt || '' });
    }, `Đã lưu khóa học ${formCode}. Khóa mới bắt đầu ở trạng thái nháp.`, editingCourseId || undefined);
  };

  const handleAddLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle) return;

    void mutate(async () => {
      await api(`/admin/courses/${selectedCourse.id}/lessons`, json('POST', { title: newLessonTitle, duration: newLessonDuration, content: newLessonContent }));
      setIsAddLessonOpen(false); setNewLessonTitle(''); setNewLessonContent('');
    }, `Đã thêm bài học vào ${selectedCourse.title}.`, selectedCourse.id);
  };

  const handleDeleteLesson = (item: MicroLessonItem) => {
    setError('');
    setPendingDelete(item);
  };
  const openQuestionAssignment = async (lesson: MicroLessonItem) => {
    setAssigningLesson(lesson);
    setAvailableQuestions([]);
    setAssignedIds(lesson.questionIds || []);
    setAssignmentLoading(true);
    setError('');
    try {
      const courseId = selectedCourse.id;
      const first = await api<{ items: Array<{ id: string; question: string; status: string }>; total: number }>(`/admin/questions?courseId=${courseId}&pageSize=100`);
      const all = [...first.items];
      for (let page = 2; all.length < first.total; page++) {
        const next = await api<typeof first>(`/admin/questions?courseId=${courseId}&pageSize=100&page=${page}`);
        all.push(...next.items);
      }
      setAvailableQuestions(all);
      if (lesson.type === 'quiz' && !currentLessons.some(item => Array.isArray(item.questionIds))) setAssignedIds(all.filter(item => item.status === 'active').map(item => item.id));
      else setAssignedIds((lesson.questionIds || []).filter(id => all.some(question => question.id === id)));
    } catch (cause) { setError((cause as Error).message); }
    finally { setAssignmentLoading(false); }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    const success = await mutate(() => api(`/admin/courses/${selectedCourse.id}/lessons/${item.id}`, { method: 'DELETE' }), item.type === 'quiz' ? 'Đã xóa bài kiểm tra. Khóa học được chuyển về bản nháp nếu đang phát hành.' : 'Đã xóa bài học.', selectedCourse.id);
    if (success) setPendingDelete(null);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col w-full">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto w-full space-y-6">
          {error && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</p>}
          
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#004AC6] text-xs font-semibold border border-blue-100">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>CYBERSECURITY AWARENESS HUB • Đào tạo vi mô &amp; Phản xạ tình huống an ninh</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Quản lý khóa học
              </h1>
              <p className="text-sm text-slate-600 max-w-3xl">
                Quản lý nội dung đào tạo nhận diện lừa đảo, bài học vi mô và trạng thái phát hành trên hệ thống CyberAware AI.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
              <button
                type="button"
                onClick={() => { window.location.href = '/api/admin/courses/export'; }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-500">download</span>
                <span>Xuất danh mục (CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Tạo khóa học mới</span>
              </button>
            </div>
          </div>

          {/* 4 Compact Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng khóa học</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{courses.length}</span>
                  <span className="text-xs text-slate-500">khóa vi mô</span>
                </div>
                <p className="text-xs text-slate-500">Toàn bộ chuyên đề cảnh giác</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#004AC6] shrink-0">
                <span className="material-symbols-outlined text-[28px]">school</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đang phát hành</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-600">
                    {courses.filter((c) => c.status === 'published').length}
                  </span>
                  <span className="text-xs text-slate-500">khóa mở</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium">Trực tuyến cho học viên</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <span className="material-symbols-outlined text-[28px]">sensors</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bản nháp</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-600">
                    {courses.filter((c) => c.status === 'draft').length}
                  </span>
                  <span className="text-xs text-slate-500">khóa soạn thảo</span>
                </div>
                <p className="text-xs text-amber-600 font-medium">Đang kiểm định bảo mật</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <span className="material-symbols-outlined text-[28px]">edit_note</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng bài học vi mô</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#004AC6]">{courses.reduce((sum, item) => sum + item.microLessonsCount, 0)}</span>
                  <span className="text-xs text-slate-500">bài tình huống</span>
                </div>
                <p className="text-xs text-slate-500">Thời lượng 3 - 5 phút/bài</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#004AC6] shrink-0">
                <span className="material-symbols-outlined text-[28px]">format_list_bulleted</span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar Section */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="md:col-span-5 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  search
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#004AC6] transition-all"
                  placeholder="Tìm theo tên khóa học, mã CH-xxx..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Trạng thái */}
              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-200 focus:outline-none cursor-pointer pr-10 font-medium"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="published">Đang phát hành</option>
                    <option value="draft">Bản nháp</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Filter Chủ đề */}
              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-200 focus:outline-none cursor-pointer pr-10 font-medium"
                  >
                    <option value="">Tất cả chủ đề nghiệp vụ</option>
                    {Array.from(new Map(courses.map(item => [item.topicKey, item.topic])).entries()).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Reset Button */}
              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                    setTopicFilter('');
                  }}
                  className="w-full md:w-auto p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đặt lại bộ lọc"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Hiển thị <span className="font-semibold text-slate-900">{filteredCourses.length ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, filteredCourses.length)}</span> trên tổng số{' '}
                <span className="font-semibold text-slate-900">{filteredCourses.length}</span> khóa học
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Sắp xếp:</span>
                <span className="text-[#004AC6] font-semibold cursor-pointer flex items-center gap-1">
                  Mới cập nhật gần nhất <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </span>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.length > 0 && selectedCourseIds.length === filteredCourses.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCourseIds(filteredCourses.map((c) => c.id));
                          } else {
                            setSelectedCourseIds([]);
                          }
                        }}
                        className="w-4 h-4 rounded text-[#004AC6] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Khóa học</th>
                    <th className="py-3.5 px-4">Chủ đề</th>
                    <th className="py-3.5 px-4 text-center">Số bài vi mô</th>
                    <th className="py-3.5 px-4 text-center">Trắc nghiệm phản xạ</th>
                    <th className="py-3.5 px-4">Trạng thái phát hành</th>
                    <th className="py-3.5 px-4">Cập nhật</th>
                    <th className="py-3.5 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {visibleCourses.map((course) => {
                    const isCurrentSelected = selectedCourse.id === course.id;
                    const isChecked = selectedCourseIds.includes(course.id);

                    return (
                      <tr
                        key={course.id}
                        onClick={() => setSelectedCourse(course)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isCurrentSelected ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedCourseIds((prev) =>
                                prev.includes(course.id)
                                  ? prev.filter((id) => id !== course.id)
                                  : [...prev, course.id]
                              )
                            }
                            className="w-4 h-4 rounded text-[#004AC6] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4 max-w-md">
                          <div className="flex items-start gap-2.5">
                            <span className="font-mono text-[11px] font-bold text-[#004AC6] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                              {course.code}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 leading-tight">
                                {course.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {course.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                            {course.topic}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-semibold text-slate-800">
                          {course.microLessonsCount} bài
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-[#004AC6] font-semibold">{course.quizCount} câu</span>
                        </td>
                        <td className="py-4 px-4">
                          {course.status === 'published' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Đang phát hành
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              Bản nháp
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-500">{course.updatedAt}</td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1 text-slate-500">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCourse(course);
                                document.getElementById('drawer-lessons')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="p-1.5 hover:text-[#004AC6] hover:bg-slate-100 rounded-lg transition-colors"
                              title="Xem danh sách bài học"
                            >
                              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(course)}
                              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Chỉnh sửa khóa học"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (course.status === 'published') window.open('/hoc-tap', '_blank'); else { setSelectedCourse(course); document.getElementById('drawer-lessons')?.scrollIntoView({ behavior: 'smooth' }); } }}
                              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Xem trước người dùng"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void mutate(() => api(`/admin/courses/${course.id}/status`, json('PATCH', { status: 'archived' })), `Đã lưu trữ khóa học ${course.code}.`, course.id)}
                              className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Lưu trữ khóa học"
                            >
                              <span className="material-symbols-outlined text-[18px]">archive</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Hiển thị mỗi trang:</span>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 font-semibold focus:outline-none">
                  <option value="10">10 khóa học</option>
                  <option value="20">20 khóa học</option>
                  <option value="50">50 khóa học</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(page - 1)} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-700 disabled:opacity-40" disabled={page <= 1}>
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button className="w-8 h-8 rounded-lg bg-[#004AC6] text-white font-semibold flex items-center justify-center">{page}</button>
                <span className="px-1">/ {pageCount}</span>
                <button disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-40">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Micro-learning Lesson Manager Panel (For Selected Course) */}
          <div className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-6" id="drawer-lessons">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004AC6] animate-pulse" />
                  <span className="text-xs uppercase tracking-wider text-[#004AC6] font-semibold">
                    Chuyên đề đang chọn ({selectedCourse.code})
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Quản lý bài học vi mô: {selectedCourse.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Cấu trúc bài học siêu ngắn (3 - 5 phút) tích hợp câu hỏi kiểm tra phản xạ lừa đảo trực tiếp sau mỗi bài học.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-[#004AC6] text-xs font-semibold border border-blue-100">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{currentLessons.filter(item => item.type !== 'quiz').length} bài học</span>
                </div>
                <button type="button" disabled={!selectedCourse.id || currentLessons.some(item => item.type === 'quiz')} onClick={() => setIsAddExamOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-[#004AC6] text-xs font-semibold hover:bg-blue-100 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">quiz</span>+ Thêm bài kiểm tra</button>
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  <span>+ Thêm bài học vi mô</span>
                </button>
              </div>
            </div>

            {/* Lessons Timeline / Cards */}
            <div className="space-y-3">
              {currentLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  draggable={lesson.type !== 'quiz'}
                  onDragStart={() => { draggingLessonId.current = lesson.id; }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    const sourceId = draggingLessonId.current;
                    draggingLessonId.current = null;
                    if (!sourceId || sourceId === lesson.id || lesson.type === 'quiz') return;
                    const ids = currentLessons.filter(item => item.type !== 'quiz').map(item => item.id);
                    ids.splice(ids.indexOf(sourceId), 1);
                    ids.splice(ids.indexOf(lesson.id), 0, sourceId);
                    void mutate(() => api(`/admin/courses/${selectedCourse.id}/lessons/order`, json('PUT', { lessonIds: ids })), 'Đã cập nhật thứ tự bài học.', selectedCourse.id);
                  }}
                  className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:bg-slate-100/70 transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="cursor-grab text-slate-400 group-hover:text-[#004AC6] flex items-center">
                      {lesson.type !== 'quiz' && <span className="material-symbols-outlined text-[20px]">drag_indicator</span>}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#004AC6] text-xs font-bold flex items-center justify-center shrink-0">
                      {lesson.order}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{lesson.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">schedule</span> {lesson.duration}
                        </span>
                        <span>•</span>
                        {lesson.type !== 'quiz' && <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <span className="material-symbols-outlined text-[15px]">task_alt</span> {lesson.status}
                        </span>}
                        {lesson.type !== 'quiz' && <span>•</span>}
                        <span className="text-slate-600">{lesson.quizCount} câu hỏi {lesson.type === 'quiz' ? 'cuối khóa' : 'tương tác'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500">
                    <button
                      type="button"
                      onClick={() => { setEditingLesson(lesson); setLessonContent(lesson.content || ''); }}
                      className="p-2 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                      title={lesson.type === 'quiz' ? 'Chỉnh sửa bài kiểm tra' : 'Chỉnh sửa bài học'}
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void openQuestionAssignment(lesson)}
                      className="p-2 hover:text-[#004AC6] hover:bg-white rounded-lg transition-colors"
                      title="Gán câu hỏi phản xạ"
                    >
                      <span className="material-symbols-outlined text-[18px]">quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson)}
                      className="p-2 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      title={lesson.type === 'quiz' ? 'Xóa bài kiểm tra' : 'Xóa bài học'}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modal: Tạo / Chỉnh sửa khóa học */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004AC6] flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">school</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCourseId ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
                  </h3>
                  <p className="text-xs text-slate-500">Cấu hình thông tin cơ bản và trạng thái phát hành</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              {error && <p role="alert" className="text-red-700">{error}</p>}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Mã khóa học *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Chủ đề nghiệp vụ</label>
                  <select
                    value={formTopic}
                    onChange={(e) => {
                      setFormTopic(e.target.value);
                      setFormTopicKey(e.target.value === 'Email & Phishing' ? 'phishing' : 'smishing');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="Email & Phishing">Nhận diện phishing và email giả mạo</option>
                    <option value="SMS & Mạng xã hội">Lừa đảo qua tin nhắn, mạng xã hội</option>
                    <option value="Web & Liên kết">Website giả mạo và liên kết độc hại</option>
                    <option value="Lừa đảo tài chính">Lừa đảo tài chính và đầu tư</option>
                    <option value="Mạo danh cơ quan">Mạo danh tổ chức, cơ quan và thương hiệu</option>
                    <option value="Bảo vệ tài khoản">Bảo vệ tài khoản và dữ liệu cá nhân</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên khóa học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng ngừa lừa đảo Deepfake trong 5 phút"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả tóm tắt nội dung</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả mục tiêu và nội dung học viên sẽ đạt được..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="font-bold text-[#004AC6]">Hướng xử lý khi người học đã lỡ gặp tình huống</p>
                <p className="text-slate-600">Nội dung này xuất hiện bên phải khóa học. Mỗi dòng trong ô cuối là một bước xử lý.</p>
                <label className="block font-semibold text-slate-700">Tiêu đề tình huống<input value={formGuidanceTitle} onChange={e => setFormGuidanceTitle(e.target.value)} maxLength={150} placeholder="Ví dụ: Lỡ chuyển tiền cho người mạo danh?" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#004AC6]" /></label>
                <label className="block font-semibold text-slate-700">Mô tả trường hợp<textarea value={formGuidanceIntro} onChange={e => setFormGuidanceIntro(e.target.value)} maxLength={500} rows={2} placeholder="Nếu đã lỡ..." className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#004AC6]" /></label>
                <label className="block font-semibold text-slate-700">Các bước xử lý<textarea value={formGuidanceSteps} onChange={e => setFormGuidanceSteps(e.target.value)} rows={5} placeholder={'Dừng liên lạc với đối tượng.\nLiên hệ đơn vị liên quan qua kênh chính thức.'} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#004AC6]" /></label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái phát hành</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="courseStatus"
                      checked={formStatus === 'published'}
                      disabled={!editingCourseId}
                      onChange={() => setFormStatus('published')}
                      className="text-[#004AC6]"
                    />
                    <span className="text-slate-800">Đang phát hành (Public)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="courseStatus"
                      checked={formStatus === 'draft'}
                      onChange={() => setFormStatus('draft')}
                      className="text-[#004AC6]"
                    />
                    <span className="text-slate-800">Bản nháp (Draft)</span>
                  </label>
                  {editingCourseId && <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="courseStatus" checked={formStatus === 'archived'} onChange={() => setFormStatus('archived')} className="text-[#004AC6]" /><span className="text-slate-800">Lưu trữ</span></label>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Lưu khóa học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm bài học vi mô */}
      {isAddLessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">+ Thêm bài học vi mô</h3>
              <button
                type="button"
                onClick={() => setIsAddLessonOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddLessonSubmit} className="space-y-4 text-xs">
              {error && <p role="alert" className="text-red-700">{error}</p>}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề bài học vi mô *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy tắc 3 giây kiểm tra tên miền người gửi"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thời lượng ước tính</label>
                <select
                  value={newLessonDuration}
                  onChange={(e) => setNewLessonDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                >
                  <option value="3 phút">3 phút đọc</option>
                  <option value="4 phút">4 phút thực hành</option>
                  <option value="5 phút">5 phút đọc &amp; soi mẫu</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung bài học</label>
                <textarea rows={5} value={newLessonContent} onChange={e => setNewLessonContent(e.target.value)} placeholder="Viết nội dung để học viên đọc và thực hành..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white font-semibold"
                >
                  Thêm bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLesson && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"><div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4"><h3 className="text-base font-bold">Chỉnh sửa bài học</h3><input value={editingLesson.title} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm" /><input value={editingLesson.duration} onChange={e => setEditingLesson({ ...editingLesson, duration: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm" /><textarea rows={8} value={lessonContent} onChange={e => setLessonContent(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm" placeholder="Nội dung bài học" /><div className="flex justify-end gap-3"><button onClick={() => setEditingLesson(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm">Hủy</button><button disabled={busy} onClick={() => { const lesson = editingLesson; void mutate(async () => { await api(`/admin/courses/${selectedCourse.id}/lessons/${lesson.id}`, json('PATCH', { title: lesson.title, duration: lesson.duration, content: lessonContent })); setEditingLesson(null); }, 'Đã lưu bài học.', selectedCourse.id); }} className="px-4 py-2 rounded-lg bg-[#004AC6] text-white text-sm disabled:opacity-50">Lưu bài học</button></div></div></div>}
      {assigningLesson && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <div role="dialog" aria-modal="true" aria-labelledby="assignment-heading" className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
          <h3 id="assignment-heading" className="text-base font-bold">Gán câu hỏi cho bài: {assigningLesson.title}</h3>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-[#004AC6] cursor-pointer">
            <span className="flex items-center gap-3"><input type="checkbox" disabled={assignmentLoading || !availableQuestions.length} checked={availableQuestions.length > 0 && availableQuestions.every(question => assignedIds.includes(question.id))} onChange={event => setAssignedIds(event.target.checked ? availableQuestions.map(question => question.id) : [])} className="accent-[#004AC6]" />Chọn tất cả câu hỏi</span>
            <span className="text-xs font-medium">{assignmentLoading ? 'Đang tải…' : `${assignedIds.length}/${availableQuestions.length} đã chọn`}</span>
          </label>
          <div className="max-h-72 overflow-y-auto space-y-2">{availableQuestions.map(question => <label key={question.id} className="flex gap-3 items-start p-3 rounded-lg bg-slate-50 border text-sm"><input type="checkbox" checked={assignedIds.includes(question.id)} onChange={event => setAssignedIds(current => event.target.checked ? [...current, question.id] : current.filter(id => id !== question.id))} className="accent-[#004AC6]" /><span>{question.question}</span></label>)}{assignmentLoading ? <p className="text-sm text-slate-500">Đang tải câu hỏi…</p> : !availableQuestions.length && <p className="text-sm text-slate-500">Chưa có câu hỏi trong khóa học này.</p>}</div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAssigningLesson(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm">Hủy</button><button type="button" disabled={busy || assignmentLoading} onClick={() => { const lesson = assigningLesson; void mutate(async () => { await api(`/admin/courses/${selectedCourse.id}/lessons/${lesson.id}/questions`, json('PUT', { questionIds: assignedIds })); setAssigningLesson(null); }, 'Đã gán câu hỏi cho bài học.', selectedCourse.id); }} className="px-4 py-2 rounded-lg bg-[#004AC6] text-white text-sm disabled:opacity-50">Lưu câu hỏi</button></div>
        </div>
      </div>}

      {isAddExamOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"><form onSubmit={event => { event.preventDefault(); void mutate(async () => { await api(`/admin/courses/${selectedCourse.id}/exams`, json('POST', { title: newExamTitle, duration: newExamDuration })); setIsAddExamOpen(false); }, 'Đã thêm bài kiểm tra cuối khóa.', selectedCourse.id); }} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4"><h3 className="text-base font-bold">+ Thêm bài kiểm tra</h3><label className="block text-sm font-semibold">Tiêu đề<input required minLength={3} value={newExamTitle} onChange={event => setNewExamTitle(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm" /></label><label className="block text-sm font-semibold">Thời lượng<input required value={newExamDuration} onChange={event => setNewExamDuration(event.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm" /></label><div className="flex justify-end gap-3"><button type="button" onClick={() => setIsAddExamOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm">Hủy</button><button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-[#004AC6] text-white text-sm disabled:opacity-50">Thêm bài kiểm tra</button></div></form></div>}

      {pendingDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-heading" aria-describedby="delete-description" onKeyDown={event => { if (event.key === 'Escape' && !busy) setPendingDelete(null); }} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><span className="material-symbols-outlined text-[24px]">delete</span></span><div><h3 id="delete-heading" className="text-lg font-bold text-slate-900">Xóa {pendingDelete.type === 'quiz' ? 'bài kiểm tra' : 'bài học'}?</h3><p id="delete-description" className="mt-1 text-sm leading-6 text-slate-600">Bạn sắp xóa “{pendingDelete.title}” khỏi khóa học.{pendingDelete.type === 'quiz' && selectedCourse.status === 'published' ? ' Khóa học sẽ chuyển về bản nháp và tạm ẩn với học viên cho đến khi có bài kiểm tra hợp lệ và được phát hành lại.' : ''}</p></div></div>{error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" autoFocus disabled={busy} onClick={() => { setPendingDelete(null); setError(''); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy</button><button type="button" disabled={busy} onClick={() => void confirmDelete()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy ? 'Đang xóa…' : 'Xóa mục này'}</button></div></div></div>}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs border border-slate-700">
          <span className="material-symbols-outlined text-emerald-400 text-base">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </AdminLayout>
  );
};
