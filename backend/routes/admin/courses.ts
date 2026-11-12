import type { Router, Request } from 'express';
import { randomUUID } from 'node:crypto';
import { catalogItem, catalogItems } from '../../database';
import { ApiError, textField } from '../../http';
import { stamp, n, audit, pick, json, course, quiz, courseView, allQuestions, csv } from './shared';

export function registerAdminCourseRoutes(router: Router) {
  function filteredCourses(req: Request) {
    const q = String(req.query.q || '').trim().toLowerCase();
    const status = String(req.query.status || '');
    const topic = String(req.query.topic || '');
    return catalogItems('course').map(courseView).filter(c => (!q || [c.code,c.title,c.description].some(value => value.toLowerCase().includes(q))) && (!status || c.status === status) && (!topic || c.topicKey === topic)).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }
  router.get('/courses/summary', (_req, res) => {
    const list = catalogItems('course').map(courseView);
    res.json({ total: list.length, published: list.filter(c => c.status === 'published').length, draft: list.filter(c => c.status === 'draft').length, archived: list.filter(c => c.status === 'archived').length, lessons: list.reduce((sum,c) => sum + c.microLessonsCount, 0) });
  });
  router.get('/courses/export', (req, res) => res.type('text/csv; charset=utf-8').attachment('cyberaware-courses.csv').send(csv(filteredCourses(req), ['code','title','description','topic','status','microLessonsCount','quizCount','updatedAt'])));
  router.get('/courses', (req, res) => res.json(pick(filteredCourses(req), req)));
  router.get('/courses/:id', (req, res) => {
    const c = course(req.params.id);
    res.json({ ...courseView(c), lessons: c.modules });
  });
  function courseBody(req: Request, old?: any) {
    const title = textField(req.body?.title ?? old?.title, 'Tên khóa học', 200, 3);
    const description = textField(req.body?.description ?? old?.description ?? '', 'Mô tả', 3000, 0);
    const topic = textField(req.body?.topic ?? old?.topic ?? 'Khác', 'Chủ đề', 100, 2);
    const topicKey = textField(req.body?.topicKey ?? old?.topicKey ?? 'other', 'Mã chủ đề', 60, 2);
    const code = textField(req.body?.code ?? old?.code ?? '', 'Mã khóa học', 40, 2);
    if (catalogItems('course').some(c => c.code === code && c.id !== old?.id)) throw new ApiError(409, 'Mã khóa học đã tồn tại.');
    let incidentGuidance = old?.incidentGuidance || null;
    if (req.body?.incidentGuidance !== undefined) {
      const guidance = req.body.incidentGuidance;
      if (guidance === null) incidentGuidance = null;
      else {
        if (!guidance || typeof guidance !== 'object' || Array.isArray(guidance) || !Array.isArray(guidance.steps) || guidance.steps.length < 2 || guidance.steps.length > 6) throw new ApiError(400, 'Hướng xử lý cần từ 2 đến 6 bước.');
        incidentGuidance = {
          title: textField(guidance.title, 'Tiêu đề hướng xử lý', 150, 5),
          intro: textField(guidance.intro, 'Tình huống cần xử lý', 500, 15),
          steps: guidance.steps.map((step: unknown) => textField(step, 'Bước xử lý', 500, 15)),
        };
      }
    }
    return { title, description, topic, topicKey, code, incidentGuidance };
  }
  router.post('/courses', (req, res) => {
    const id = randomUUID();
    const body = courseBody(req);
    const c = { id, ...body, category: body.topic, tag: body.topic, duration: '0 phút', lessonsCount: 0, rating: 0, learnersCount: 0, thumbnail: '', modules: [], status: 'draft', updatedAt: stamp() };
    json('course', id, c); audit(req, 'course.create', 'course', id);
    res.status(201).json(courseView(c));
  });
  router.patch('/courses/:id', (req, res) => {
    const c = course(req.params.id); const body = courseBody(req, c);
    Object.assign(c, body, { category: body.topic, updatedAt: stamp() });
    json('course', c.id, c); audit(req, 'course.update', 'course', c.id);
    res.json(courseView(c));
  });
  router.patch('/courses/:id/status', (req, res) => {
    const c = course(req.params.id); const status = req.body?.status;
    if (!['draft','published','archived'].includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
    if (status === 'published') {
      const lessons = c.modules.filter((m: any) => m.type !== 'quiz');
      const exam = c.modules.find((m: any) => m.type === 'quiz');
      const active = (exam ? catalogItem('quiz', exam.quizId)?.questions || [] : []).filter((q: any) => q.status !== 'review' && q.status !== 'archived');
      const legacyFinal = !c.modules.some((module: any) => Array.isArray(module.questionIds));
      if (!lessons.length || !lessons.every((m: any) => typeof m.content === 'string' && m.content.trim().length >= 20) || !exam || !active.some((q: any) => legacyFinal || exam.questionIds?.includes(q.id))) throw new ApiError(409, 'Cần ít nhất một bài học có nội dung và một câu hỏi đang dùng được gán vào kiểm tra cuối khóa trước khi phát hành.');
    }
    c.status = status; c.updatedAt = stamp();
    json('course', c.id, c); audit(req, 'course.status', 'course', c.id, status);
    res.json(courseView(c));
  });
  router.post('/courses/:id/lessons', (req, res) => {
    const c = course(req.params.id);
    const title = textField(req.body?.title, 'Tiêu đề bài học', 200, 3);
    const duration = textField(req.body?.duration || '3 phút', 'Thời lượng', 60, 2);
    const content = textField(req.body?.content || '', 'Nội dung', 15000, 0);
    const lesson = { id: randomUUID(), title, duration, content, type: 'interactive', order: c.modules.filter((m: any) => m.type !== 'quiz').length + 1 };
    c.modules.splice(c.modules.findIndex((m: any) => m.type === 'quiz') < 0 ? c.modules.length : c.modules.findIndex((m: any) => m.type === 'quiz'), 0, lesson);
    c.lessonsCount = c.modules.length; c.updatedAt = stamp();
    json('course', c.id, c); audit(req, 'lesson.create', 'lesson', lesson.id, c.id);
    res.status(201).json(lesson);
  });
  router.post('/courses/:id/exams', (req, res) => {
    const c = course(req.params.id);
    if (c.modules.some((module: any) => module.type === 'quiz')) throw new ApiError(409, 'Khóa học đã có bài kiểm tra cuối khóa.');
    const quizId = `${c.id}-quiz`;
    const exam = { id: randomUUID(), title: textField(req.body?.title || 'Kiểm tra cuối khóa', 'Tiêu đề', 200, 3), duration: textField(req.body?.duration || '8 phút', 'Thời lượng', 60, 2), content: textField(req.body?.content || 'Đạt ít nhất 80% để hoàn thành khóa học.', 'Nội dung', 15000, 0), type: 'quiz', quizId, questionIds: [] as string[], createdAt: stamp() };
    if (!catalogItem('quiz', quizId)) json('quiz', quizId, { id: quizId, courseId: c.id, questions: [] });
    c.modules.push(exam); c.lessonsCount = c.modules.length; c.updatedAt = stamp();
    json('course', c.id, c); audit(req, 'exam.create', 'course', c.id);
    res.status(201).json(exam);
  });
  function lesson(courseId: string, lessonId: string) {
    const c = course(courseId);
    const index = c.modules.findIndex((m: any) => m.id === lessonId);
    if (index < 0) throw new ApiError(404, 'Không tìm thấy bài học.');
    return { c, index, value: c.modules[index] };
  }
  router.get('/courses/:id/lessons/:lessonId', (req, res) => res.json(lesson(req.params.id, req.params.lessonId).value));
  router.patch('/courses/:id/lessons/:lessonId', (req, res) => {
    const found = lesson(req.params.id, req.params.lessonId);
    const value = { ...found.value, title: textField(req.body?.title ?? found.value.title, 'Tiêu đề', 200, 3), duration: textField(req.body?.duration ?? found.value.duration, 'Thời lượng', 60, 2), content: textField(req.body?.content ?? found.value.content, 'Nội dung', 15000, 0) };
    found.c.modules[found.index] = value; found.c.updatedAt = stamp();
    json('course', found.c.id, found.c); audit(req, 'lesson.update', 'lesson', value.id);
    res.json(value);
  });
  router.delete('/courses/:id/lessons/:lessonId', (req, res) => {
    const found = lesson(req.params.id, req.params.lessonId);
    if (found.value.type !== 'quiz' && (found.c.status || 'published') === 'published' && found.c.modules.filter((m: any) => m.type !== 'quiz').length <= 1) throw new ApiError(409, 'Khóa học đang phát hành cần ít nhất một bài học; hãy lưu trữ khóa trước.');
    if (found.value.type !== 'quiz' && n('SELECT COUNT(*) AS n FROM lesson_progress WHERE course_id = ? AND lesson_id = ?', found.c.id, found.value.id)) throw new ApiError(409, 'Bài học đã có tiến độ học viên; hãy lưu trữ khóa hoặc sửa nội dung.');
    if (found.value.type === 'quiz' && (found.c.status || 'published') === 'published') found.c.status = 'draft';
    found.c.modules.splice(found.index, 1); found.c.lessonsCount = found.c.modules.length; found.c.updatedAt = stamp();
    json('course', found.c.id, found.c); audit(req, 'lesson.delete', 'lesson', found.value.id);
    res.json({ success: true, courseStatus: found.c.status });
  });
  router.put('/courses/:id/lessons/order', (req, res) => {
    const c = course(req.params.id);
    const ids = req.body?.lessonIds;
    const lessons = c.modules.filter((m: any) => m.type !== 'quiz');
    if (!Array.isArray(ids) || ids.length !== lessons.length || new Set(ids).size !== lessons.length || ids.some(id => !lessons.some((m: any) => m.id === id))) throw new ApiError(400, 'Danh sách thứ tự bài học không hợp lệ.');
    c.modules = [...ids.map((id: string, i: number) => ({ ...lessons.find((m: any) => m.id === id), order: i + 1 })), ...c.modules.filter((m: any) => m.type === 'quiz')];
    c.updatedAt = stamp(); json('course', c.id, c); audit(req, 'lesson.reorder', 'course', c.id);
    res.json({ lessons: c.modules.filter((m: any) => m.type !== 'quiz') });
  });
  router.put('/courses/:id/lessons/:lessonId/questions', (req, res) => {
    const c = course(req.params.id);
    const index = c.modules.findIndex((module: any) => module.id === req.params.lessonId);
    if (index < 0) throw new ApiError(404, 'Không tìm thấy phần học.');
    const ids = req.body?.questionIds;
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !allQuestions().some(q => q.id === id && q.courseId === c.id))) throw new ApiError(400, 'Danh sách câu hỏi không hợp lệ.');
    c.modules[index].questionIds = ids; c.updatedAt = stamp();
    json('course', c.id, c); audit(req, 'lesson.questions', 'lesson', req.params.lessonId, ids.join(','));
    res.json({ questionIds: ids });
  });

}
