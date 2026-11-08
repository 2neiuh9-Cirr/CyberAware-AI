import React, { useEffect, useState } from 'react';
import { AlertOctagon, Award, CheckCircle2, ChevronLeft, ChevronRight, Clock, GraduationCap, HelpCircle, LockKeyhole, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { api, json } from '../../api';
import { notify } from '../../components/common/toast';
import type { Course } from '../../types';

type QuizQuestion = { id: string; question: string; options: string[] };
type Lesson = { id: string; title: string; content: string; type: string; passed?: boolean; quiz?: { id: string; questions: QuizQuestion[] } };
type AnswerReview = { questionId: string; correct: boolean; selectedIndex: number; correctIndex: number; explanation: string; optionExplanations: string[] };
type QuizResult = { score: number; correctCount: number; total: number; passed: boolean; explanations: AnswerReview[] };
const letter = (index: number) => 'ABCD'[index];

export const LearningPage: React.FC = () => {
  const { courses, currentUser, completedCourseIds, lessonProgress, completeLesson, personalStats } = useAppStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [lessonReviews, setLessonReviews] = useState<Record<number, AnswerReview>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => { if (!courseId && courses.length) setCourseId(courses[0].id); }, [courses, courseId]);
  useEffect(() => {
    if (!courseId) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setNotice(''); setCourse(null); setLesson(null); setResult(null);
    api<Course>(`/courses/${courseId}`, { signal: controller.signal })
      .then(data => { setCourse(data); setLessonId(data.modules[0]?.id || ''); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [courseId]);
  useEffect(() => {
    if (!course || !lessonId || !course.modules.some(m => m.id === lessonId)) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setNotice(''); setLesson(null); setResult(null); setLessonReviews({}); setAnswers([]); setQuestionIndex(0);
    api<Lesson>(`/courses/${course.id}/lessons/${lessonId}`, { signal: controller.signal })
      .then(data => { setLesson(data); setAnswers(data.quiz?.questions.map(() => -1) || []); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [course, lessonId, currentUser?.id]);
  useEffect(() => { setResult(null); }, [currentUser?.id]);

  const submit = async () => {
    if (!lesson?.quiz || lesson.type !== 'quiz') return;
    setBusy(true); setError(''); setNotice('');
    try {
      setResult(await api<QuizResult>(`/quizzes/${lesson.quiz.id}/submissions`, json('POST', { answers })));
      setQuestionIndex(0);
      await useAppStore.getState().refreshPersonal();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const answerLesson = async (index: number) => {
    if (!course || !lesson || lesson.type === 'quiz' || !currentQuestion || lessonReviews[questionIndex]) return;
    setBusy(true); setError('');
    try {
      const response = await api<AnswerReview & { answeredAll: boolean }>(`/courses/${course.id}/lessons/${lesson.id}/questions/${currentQuestion.id}/answer`, json('POST', { selectedIndex: index }));
      setAnswers(old => old.map((answer, i) => i === questionIndex ? index : answer));
      setLessonReviews(old => ({ ...old, [questionIndex]: response }));
      if (response.answeredAll) setNotice('Bạn đã trả lời hết câu hỏi phản xạ. Nhấn “Tôi đã đọc bài này” để lưu tiến độ.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const markRead = async () => {
    if (!course || !lesson) return;
    setBusy(true); setError(''); setNotice('');
    const saved = await completeLesson(course.id, lesson.id);
    if (saved.ok) {
      const message = lesson.type === 'quiz' ? 'Đã hoàn thành khóa học.' : 'Đã lưu tiến độ bài học.';
      setNotice(message);
      notify(message, 'success');
    } else setError(saved.error || 'Không lưu được tiến độ.');
    setBusy(false);
  };
  const isComplete = !!course && !!lesson && lessonProgress.some(p => p.courseId === course.id && p.lessonId === lesson.id);
  const questions = lesson?.quiz?.questions || [];
  const currentQuestion = questions[questionIndex];
  const review = lesson?.type === 'quiz' ? result?.explanations[questionIndex] : lessonReviews[questionIndex];
  const answeredCount = answers.filter(answer => answer >= 0).length;
  const pendingLessonCount = course?.modules.filter(mod => mod.type !== 'quiz' && !lessonProgress.some(p => p.courseId === course.id && p.lessonId === mod.id)).length || 0;

  return <div className="w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-12">
    <header className="max-w-2xl mx-auto text-center mb-10">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><GraduationCap className="w-4 h-4" /> CYBERAWARE ACADEMY</span>
      <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Học viện Tự vệ số & Phòng chống lừa đảo</h1>
      <p className="mt-3 text-sm md:text-base text-slate-600">Bài học ngắn, tình huống thực tế và câu hỏi giúp bạn áp dụng cách tự bảo vệ ngoài đời.</p>
    </header>
    {!currentUser && <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><LockKeyhole className="inline-block w-4 h-4 mr-2" />Bạn có thể đọc bài học. <Link className="font-bold underline" to="/dang-nhap">Đăng nhập</Link> để nộp bài và lưu tiến độ.</div>}
    {personalStats && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><Award className="inline-block w-4 h-4 mr-2" />Đã hoàn thành {completedCourseIds.length}/{courses.length} khóa học · {personalStats.scanCount} lần quét cá nhân{personalStats.weakTopics?.length > 0 && <p className="mt-1">Nên ôn thêm: {personalStats.weakTopics.map((topic: { title: string }) => topic.title).join('; ')}</p>}</div>}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <main className="lg:col-span-2 flex flex-col gap-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {course ? <>
            <div className="relative aspect-video max-h-[380px] w-full bg-slate-950">
              <img src={course.thumbnail} alt="" className="h-full w-full object-cover opacity-75" />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-6 md:p-8">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">{course.category} · {course.duration}</span>
                <h2 className="mt-2 text-xl md:text-2xl font-bold leading-tight text-white">{course.title}</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4"><h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Nội dung bài học ({course.modules.length} phần)</h3>{course.rating > 0 && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {course.rating}</span>}</div>
              <p className="my-4 text-sm leading-relaxed text-slate-600">{course.description}</p>
              <div className="flex flex-col gap-2.5">{course.modules.map((mod, index) => {
                const done = lessonProgress.some(p => p.courseId === course.id && p.lessonId === mod.id);
                return <button key={mod.id} type="button" onClick={() => setLessonId(mod.id)} aria-current={lessonId === mod.id ? 'step' : undefined} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${lessonId === mod.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-blue-50/50'}`}>
                  <span className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-[#004AC6]">{String(index + 1).padStart(2, '0')}</span><span><span className="block text-xs md:text-sm font-semibold text-slate-900">{mod.title}</span><span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500"><Clock className="h-3 w-3" /> {mod.duration}</span></span></span>
                  <span className="shrink-0 text-xs font-semibold text-slate-600">{done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Đã hoàn thành" /> : mod.type === 'quiz' ? 'Bài kiểm tra' : 'Bài học'}</span>
                </button>;
              })}</div>
            </div>
          </> : <div className="p-8 text-sm text-slate-500">{busy ? 'Đang tải khóa học…' : 'Chưa có khóa học để hiển thị.'}</div>}
        </section>

        {lesson && <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xl">
          <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><HelpCircle className="h-5 w-5" /></span><div><h3 className="text-lg font-bold text-slate-900">{lesson.title}</h3><p className="text-xs text-slate-500">{questions.length ? `Câu hỏi ${questionIndex + 1}/${questions.length} · Đã chọn ${answeredCount}/${questions.length}` : lesson.type === 'quiz' ? 'Chưa có câu hỏi kiểm tra' : 'Đọc nội dung bài học'}</p></div></div>
          {lesson.type !== 'quiz' && <div className="space-y-4">{lesson.content.split(/\n\n/).map((paragraph, index) => <p key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">{paragraph}</p>)}</div>}
          {lesson.quiz && !questions.length && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Phần kiểm tra này chưa có câu hỏi đang dùng. Vui lòng liên hệ quản trị viên.</p>}
          {lesson.quiz && currentQuestion && <div className={lesson.type === 'quiz' ? '' : 'mt-6 border-t border-slate-200 pt-6'}>
            {lesson.type === 'quiz' && result && <div role="status" className={`mb-5 rounded-xl border p-4 text-sm ${result.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><strong>Kết quả: {result.correctCount}/{result.total} câu đúng · {result.score}/100 điểm</strong><p className="mt-1">{result.passed ? 'Đạt yêu cầu. Hãy xem lời giải từng câu.' : 'Chưa đạt 80%. Hãy xem lại lời giải và ôn tập trước khi làm lại.'}</p></div>}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:text-base font-semibold leading-relaxed text-slate-900">Câu {questionIndex + 1}. {currentQuestion.question}</div>
            <div className="mt-4 flex flex-col gap-2.5">{currentQuestion.options.map((option, index) => <button key={index} type="button" disabled={busy || !!review || !!result} onClick={() => { if (lesson.type === 'quiz') setAnswers(old => old.map((answer, i) => i === questionIndex ? index : answer)); else void answerLesson(index); }} aria-pressed={answers[questionIndex] === index} className={`w-full rounded-xl border p-3.5 text-left text-sm transition-colors disabled:cursor-default ${review?.correctIndex === index ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : review?.selectedIndex === index ? 'border-red-400 bg-red-50 text-red-950' : answers[questionIndex] === index ? 'border-blue-500 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}><span className="mr-2 font-bold">{letter(index)}.</span>{option}{review?.correctIndex === index ? ' ✓' : ''}{review && <span className="mt-2 block text-xs leading-relaxed">{review.optionExplanations[index]}</span>}</button>)}</div>
            {review && <div className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed ${review.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><strong>{review.correct ? 'Chính xác.' : review.selectedIndex < 0 ? `Bạn chưa trả lời; đáp án đúng là ${letter(review.correctIndex)}.` : `Bạn chọn ${letter(review.selectedIndex)}; đáp án đúng là ${letter(review.correctIndex)}.`}</strong> {review.explanation}</div>}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(i => i - 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Câu trước</button>
              <div className="flex flex-wrap gap-1.5" aria-label="Chọn câu hỏi">{questions.map((q, index) => <button key={q.id} type="button" onClick={() => setQuestionIndex(index)} aria-label={`Câu ${index + 1}${answers[index] >= 0 ? ', đã chọn đáp án' : ''}`} className={`h-8 min-w-8 rounded-lg text-xs font-bold ${index === questionIndex ? 'bg-[#004AC6] text-white' : answers[index] >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</button>)}</div>
              <button type="button" disabled={questionIndex >= questions.length - 1} onClick={() => setQuestionIndex(i => i + 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[#004AC6] hover:bg-blue-50 disabled:opacity-40">Câu tiếp <ChevronRight className="h-4 w-4" /></button>
            </div>
            {lesson.type === 'quiz' && <div className="mt-5 border-t border-slate-100 pt-5">{!result ? <><button type="button" disabled={busy || !currentUser} onClick={submit} className="rounded-xl bg-[#004AC6] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40">Nộp bài kiểm tra ({answeredCount}/{questions.length})</button><p className="mt-2 text-xs text-slate-600">Bạn có thể nộp khi chưa trả lời hết. Câu bỏ trống được tính 0 điểm.</p></> : <button type="button" onClick={() => { setResult(null); setAnswers(questions.map(() => -1)); setQuestionIndex(0); setNotice(''); }} className="rounded-xl border border-blue-200 px-5 py-3 text-sm font-bold text-[#004AC6] hover:bg-blue-50">Làm lại bài kiểm tra</button>}</div>}
          </div>}
          {lesson.type !== 'quiz' ? <button type="button" disabled={busy || !currentUser || isComplete} onClick={markRead} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-default disabled:opacity-60"><CheckCircle2 className="h-4 w-4" />{isComplete ? 'Đã đọc bài này' : 'Tôi đã đọc bài này'}</button> : isComplete ? <p className="mt-5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-1 inline-block h-4 w-4" />Khóa học đã hoàn thành.</p> : result?.passed || lesson.passed ? <><button type="button" disabled={busy || !currentUser || pendingLessonCount > 0} onClick={markRead} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40">Hoàn thành khóa học</button>{pendingLessonCount > 0 && <p className="mt-2 text-sm text-amber-800">Còn {pendingLessonCount} bài học chưa đánh dấu đã đọc. Hãy mở từng bài và bấm “Tôi đã đọc bài này” trước khi hoàn thành khóa.</p>}</> : null}
          {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </section>}
        {!lesson && error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      </main>

      <aside className="flex flex-col gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"><h3 className="mb-4 text-base font-bold text-slate-900">Danh mục Khóa học</h3><div className="flex flex-col gap-3">{courses.length ? courses.map(item => <button key={item.id} type="button" onClick={() => setCourseId(item.id)} className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors ${courseId === item.id ? 'border-[#004AC6] bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}><span className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase text-[#004AC6]">{item.tag || item.category}</span>{completedCourseIds.includes(item.id) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Đã xong</span>}</span><span className="text-sm font-bold leading-snug text-slate-900">{item.title}</span><span className="mt-1 text-xs text-slate-500">{item.duration}</span></button>) : <p className="text-sm text-slate-500">Chưa có khóa học để hiển thị.</p>}</div></section>
        {course?.incidentGuidance && <section aria-label="Hướng xử lý khi đã gặp tình huống lừa đảo" className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50/40 p-6 shadow-sm">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-[#004AC6]"><AlertOctagon className="h-5 w-5" /></span><div><span className="text-[11px] font-bold uppercase tracking-wide text-[#004AC6]">Các bước cần làm</span><h3 className="mt-1 text-base font-bold leading-snug text-slate-900">{course.incidentGuidance.title}</h3></div></div>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">{course.incidentGuidance.intro}</p>
          <ol className="mt-4 space-y-2.5">{course.incidentGuidance.steps.map((step, index) => <li key={index} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 text-sm leading-relaxed text-slate-700"><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AC6] text-xs font-bold text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
        </section>}
      </aside>
    </div>
  </div>;
};
